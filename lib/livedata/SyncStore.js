/*
 * @file livedata/SyncStore.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 24.06.2015
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require('q');
var _ = require('lodash');
var diag = require('../core/diag');
var objectid = require('../core/objectid');
var security = require('../security');
var web = require('../web');
var offline_1 = require('../web/offline');
var GetQuery_1 = require('../query/GetQuery');
var Store_1 = require('./Store');
var WebSqlStore_1 = require('./WebSqlStore');
var SyncContext_1 = require('./SyncContext');
var SyncEndpoint_1 = require('./SyncEndpoint');
var LiveDataMessage_1 = require('./LiveDataMessage');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
/**
 * io of browser via script tag or via require socket.io-client, entirely optional.
 *
 * Notice, this module is entirely optional as the store may operate without it if socket
 * notifications are not used.
 *
 * @internal Not public API, exported for testing purposes only!
 */
exports.io = global['io'] ||
    typeof require === 'function' &&
        ((function requireSocketIo() {
            // here we are in an immediately invoked function requiring socket.io-client, if available
            try {
                return (global['io'] = require('socket.io-client'));
            }
            catch (error) {
                diag.debug.warn('optional socket.io-client module is not available: ' + error && error.message);
            }
        })());
/**
 * connects a Model/Collection to a Relution server.
 *
 * This will give you an online and offline store with live data updates.
 *
 * @example
 *
 * // The default configuration will save the complete model data as a json,
 * // and the offline change log to a local WebSql database, synchronize it
 * // trough REST calls with the server and receive live updates via a socket.io connection.
 * class MyCollection extends Relution.livedata.Collection {};
 * MyCollection.prototype.model = MyModel;
 * MyCollection.prototype.url = 'http://myServer.io/myOrga/myApplication/myCollection';
 * MyCollection.prototype.store = new Relution.livedata.SyncStore({
 *   useLocalStore: true,     // (default) store the data for offline use
 *   useSocketNotify: true,   // (default) register at the server for live updates
 *   useOfflineChanges: true  // (default) allow changes to the offline data
 * });
 */
var SyncStore = (function (_super) {
    __extends(SyncStore, _super);
    function SyncStore(options) {
        _super.call(this, options);
        this.endpoints = {};
        /**
         * when set, indicates which entity caused a disconnection.
         *
         * <p>
         * This is set to an entity name to limit which entity may cause a change to online state again.
         * </p>
         *
         * @type {string}
         */
        this.disconnectedEntity = 'all';
        if (this.credentials) {
            this.credentials = _.clone(this.credentials);
        }
        if (this.localStoreOptions) {
            this.localStoreOptions = _.clone(this.localStoreOptions);
        }
        if (this.orderOfflineChanges) {
            this.orderOfflineChanges = _.clone(this.orderOfflineChanges);
        }
        if (this.useSocketNotify && typeof exports.io !== 'object') {
            diag.debug.warning('Socket.IO not present !!');
            this.useSocketNotify = false;
        }
    }
    /**
     * overwritten to resolve relative URLs against the SyncStore#serverUrl.
     */
    SyncStore.prototype.resolveUrl = function (url) {
        return web.resolveUrl(url, {
            serverUrl: this.serverUrl,
            application: this.application
        });
    };
    /**
     * binds the store to a target server when the first endpoint is created.
     *
     * @param urlRoot used to resolve the server to operate.
       */
    SyncStore.prototype.initServer = function (urlRoot) {
        var serverUrl = web.resolveServer(urlRoot, {
            serverUrl: this.serverUrl
        });
        if (!this.serverUrl) {
            var server = security.Server.getInstance(serverUrl);
            this.serverUrl = serverUrl;
            this.userUuid = server.authorization.name;
            if (this.localStoreOptions && !this.localStoreOptions.credentials) {
                // capture credentials for use by crypto stores
                this.localStoreOptions.credentials = _.defaults({
                    userUuid: this.userUuid
                }, server.credentials);
            }
        }
        else if (serverUrl !== this.serverUrl) {
            throw new Error('store is bound to server ' + this.serverUrl + ' already');
        }
    };
    SyncStore.prototype.checkServer = function (url, options) {
        var _this = this;
        diag.debug.assert(function () { return web.resolveServer(url, {
            serverUrl: _this.serverUrl
        }) === _this.serverUrl; });
        if (security.Server.getInstance(this.serverUrl).authorization.name !== this.userUuid) {
            diag.debug.warn('user identity was changed, working offline until authorization is restored');
            var error = new Error();
            // invoke error callback, if any
            return options && this.handleError(options, error) || Q.reject(error);
        }
        return Q.resolve(url);
    };
    SyncStore.prototype.initEndpoint = function (modelOrCollection, modelType) {
        var _this = this;
        var urlRoot = modelOrCollection.getUrlRoot();
        var entity = modelOrCollection.entity;
        if (urlRoot && entity) {
            // get or create endpoint for this url
            this.initServer(urlRoot);
            urlRoot = this.resolveUrl(urlRoot);
            var endpoint_1 = this.endpoints[entity];
            if (!endpoint_1) {
                diag.debug.info('Relution.livedata.SyncStore.initEndpoint: ' + entity);
                endpoint_1 = new SyncEndpoint_1.SyncEndpoint({
                    entity: entity,
                    modelType: modelType,
                    urlRoot: urlRoot,
                    socketPath: this.socketPath,
                    userUuid: this.userUuid
                });
                this.endpoints[entity] = endpoint_1;
                endpoint_1.localStore = this.createLocalStore(endpoint_1);
                endpoint_1.priority = this.orderOfflineChanges && (_.lastIndexOf(this.orderOfflineChanges, endpoint_1.entity) + 1);
                this.createMsgCollection();
                endpoint_1.socket = this.createSocket(endpoint_1, entity);
                endpoint_1.info = this.fetchServerInfo(endpoint_1);
            }
            else {
                // configuration can not change, must recreate store instead...
                diag.debug.assert(function () { return endpoint_1.urlRoot === urlRoot; }, 'can not change urlRoot, must recreate store instead!');
                diag.debug.assert(function () { return endpoint_1.userUuid === _this.userUuid; }, 'can not change user identity, must recreate store instead!');
            }
            return endpoint_1;
        }
    };
    /**
     * @inheritdoc
     *
     * @internal API only to be called by Model constructor.
     */
    SyncStore.prototype.initModel = function (model) {
        model.endpoint = this.initEndpoint(model, model.constructor);
    };
    /**
     * @inheritdoc
     *
     * @internal API only to be called by Collection constructor.
     */
    SyncStore.prototype.initCollection = function (collection) {
        collection.endpoint = this.initEndpoint(collection, collection.model);
    };
    SyncStore.prototype.getEndpoint = function (modelOrCollection) {
        var endpoint = this.endpoints[modelOrCollection.entity];
        if (endpoint) {
            diag.debug.assert(function () {
                // checks that modelOrCollection uses a model inheriting from the one of the endpoint
                var modelType = Collection_1.isCollection(modelOrCollection) ? modelOrCollection.model : modelOrCollection.constructor;
                return modelType === endpoint.modelType || modelType.prototype instanceof endpoint.modelType;
            }, 'wrong type of model!');
            return endpoint;
        }
    };
    SyncStore.prototype.createLocalStore = function (endpoint) {
        if (this.useLocalStore) {
            var entities = {};
            entities[endpoint.entity] = endpoint.channel;
            var storeOption = {
                entities: entities
            };
            if (this.localStoreOptions && typeof this.localStoreOptions === 'object') {
                storeOption = _.clone(this.localStoreOptions);
                storeOption.entities = entities;
            }
            return new this.localStore(storeOption);
        }
    };
    /**
     * @description Here we save the changes in a Message local websql
     * @returns {*}
     */
    SyncStore.prototype.createMsgCollection = function () {
        if (this.useOfflineChanges && !this.messages) {
            this.messages = new Collection_1.Collection(undefined, {
                model: LiveDataMessage_1.LiveDataMessageModel,
                store: new this.localStore(this.localStoreOptions)
            });
        }
        return this.messages;
    };
    SyncStore.prototype.createSocket = function (endpoint, name) {
        var _this = this;
        if (this.useSocketNotify && endpoint && endpoint.socketPath) {
            diag.debug.trace('Relution.livedata.SyncStore.createSocket: ' + name);
            // resource
            var connectVo = {
                'force new connection': true
            };
            var resource = endpoint.socketPath; // remove leading /
            connectVo.resource = (resource && resource.indexOf('/') === 0) ? resource.substr(1) : resource;
            if (this.socketQuery) {
                connectVo.query = this.socketQuery;
            }
            // socket
            endpoint.socket = exports.io.connect(endpoint.host, connectVo);
            endpoint.socket.on('connect', function () {
                (_this._bindChannel(endpoint, name) || Q.resolve(endpoint)).then(function (ep) {
                    diag.debug.assert(function () { return ep === endpoint; });
                    return _this.onConnect(ep);
                }).done();
            });
            endpoint.socket.on('disconnect', function () {
                diag.debug.info('socket.io: disconnect');
                return _this.onDisconnect(endpoint).done();
            });
            endpoint.socket.on(endpoint.channel, function (msg) {
                return _this.onMessage(endpoint, _this._fixMessage(endpoint, msg));
            });
            return endpoint.socket;
        }
    };
    SyncStore.prototype._bindChannel = function (endpoint, name) {
        if (endpoint && endpoint.socket) {
            diag.debug.trace('Relution.livedata.SyncStore._bindChannel: ' + name);
            var channel = endpoint.channel;
            var socket = endpoint.socket;
            name = name || endpoint.entity;
            return this.getLastMessageTime(channel).then(function (time) {
                socket.emit('bind', {
                    entity: name,
                    channel: channel,
                    time: time
                });
                return Q.resolve(endpoint);
            });
        }
    };
    SyncStore.prototype.getLastMessageTime = function (channel) {
        if (!this.lastMesgTime) {
            this.lastMesgTime = {};
        }
        else if (this.lastMesgTime[channel] !== undefined) {
            return Q.resolve(this.lastMesgTime[channel]);
        }
        // the | 0 below turns strings into numbers
        var time = offline_1.localStorage().getItem('__' + channel + 'lastMesgTime') || 0;
        this.lastMesgTime[channel] = time;
        return Q.resolve(time);
    };
    SyncStore.prototype.setLastMessageTime = function (channel, time) {
        var _this = this;
        return Q.resolve(!time || this.getLastMessageTime(channel).then(function (lastMesgTime) {
            return time > lastMesgTime;
        })).then(function (update) {
            if (update) {
                offline_1.localStorage().setItem('__' + channel + 'lastMesgTime', time);
                _this.lastMesgTime[channel] = time;
            }
            return _this.lastMesgTime[channel];
        });
    };
    SyncStore.prototype.onConnect = function (endpoint) {
        var _this = this;
        if (!endpoint.isConnected) {
            // when offline transmission is pending, need to wait for it to complete
            var q = Q.resolve(undefined);
            if (this.messagesPromise && this.messagesPromise.isPending()) {
                q = this.messagesPromise.catch(function (error) { return Q.resolve(undefined); });
            }
            // sync server/client changes
            endpoint.isConnected = q.then(function () {
                // next we'll fetch server-side changes
                return _this.fetchChanges(endpoint).then(function () {
                    // then send client-side changes
                    if (_this.disconnectedEntity === 'all' || _this.disconnectedEntity === endpoint.entity) {
                        // restart replaying of offline messages
                        _this.messagesPromise = null;
                        _this.disconnectedEntity = null;
                    }
                    return _this._sendMessages();
                }).catch(function (error) {
                    // catch without error indicates disconnection while going online
                    if (!error) {
                        // disconnected while sending offline changes
                        return _this.onDisconnect(endpoint);
                    }
                    return Q.reject(error);
                });
            }).finally(function () {
                // in the end, when connected still, fire an event informing client code
                if (endpoint.isConnected) {
                    _this.trigger('connect:' + endpoint.channel);
                }
            });
        }
        return endpoint.isConnected;
    };
    SyncStore.prototype.onDisconnect = function (endpoint) {
        var _this = this;
        if (!endpoint.isConnected) {
            return Q.resolve(undefined);
        }
        endpoint.isConnected = null;
        if (!this.disconnectedEntity) {
            this.disconnectedEntity = 'all';
        }
        return Q.fcall(function () {
            if (endpoint.socket && endpoint.socket.socket) {
                // consider calling endpoint.socket.disconnect() instead
                endpoint.socket.socket.onDisconnect();
            }
            return undefined;
        }).finally(function () {
            if (!endpoint.isConnected) {
                _this.trigger('disconnect:' + endpoint.channel);
            }
        });
    };
    SyncStore.prototype._fixMessage = function (endpoint, msg) {
        var idAttribute = endpoint.modelType.prototype.idAttribute;
        diag.debug.assert(function () { return !!idAttribute; }, 'no idAttribute!');
        if (msg.data && !msg.data[idAttribute] && msg.data._id) {
            msg.data[idAttribute] = msg.data._id; // server bug!
        }
        else if (!msg.data && msg.method === 'delete' && msg[idAttribute]) {
            msg.data = {};
            msg.data[idAttribute] = msg[idAttribute]; // server bug!
        }
        return msg;
    };
    SyncStore.prototype.onMessage = function (endpoint, msg) {
        var _this = this;
        // this is called by the store itself for a particular endpoint!
        if (!msg || !msg.method) {
            return Q.reject(new Error('no message or method given'));
        }
        var q;
        var channel = endpoint.channel;
        if (endpoint.localStore) {
            // first update the local store by forming a model and invoking sync
            var options = _.defaults({
                store: endpoint.localStore
            }, this.localStoreOptions);
            var model = new endpoint.modelType(msg.data, _.extend({
                parse: true
            }, options));
            if (!model.id) {
                // code below will persist with auto-assigned id but this nevertheless is a broken record
                diag.debug.error('onMessage: ' + endpoint.entity + ' received data with no valid id performing ' + msg.method + '!');
            }
            else {
                diag.debug.debug('onMessage: ' + endpoint.entity + ' ' + model.id + ' performing ' + msg.method);
            }
            q = endpoint.localStore.sync(msg.method, model, _.extend(options, {
                merge: msg.method === 'patch'
            })).then(function (result) {
                if (!msg.id || msg.id === model.id) {
                    return result;
                }
                // id value was reassigned, delete record of old id
                var oldData = {};
                oldData[model.idAttribute] = msg.id;
                var oldModel = new endpoint.modelType(oldData, options);
                diag.debug.debug('onMessage: ' + endpoint.entity + ' ' + model.id + ' reassigned from old record ' + oldModel.id);
                return endpoint.localStore.sync('delete', oldModel, options);
            });
        }
        else {
            // just update all collections listening
            q = Q.resolve(msg);
        }
        // finally set the message time
        return q.then(function () {
            return Q.resolve(msg.time && _this.setLastMessageTime(channel, msg.time)).then(function () {
                // update all collections listening
                _this.trigger('sync:' + channel, msg); // SyncContext.onMessage
                return msg;
            });
        }, function (error) {
            // not setting message time in error case
            // report error as event on store
            _this.trigger('error:' + channel, error, model);
            return msg;
        });
    };
    SyncStore.prototype.sync = function (method, model, options) {
        var _this = this;
        if (options === void 0) { options = {}; }
        diag.debug.trace('Relution.livedata.SyncStore.sync');
        try {
            var endpoint = model.endpoint || this.getEndpoint(model);
            if (!endpoint) {
                throw new Error('no endpoint');
            }
            if (Collection_1.isCollection(model)) {
                // collections can be filtered, etc.
                if (method === 'read' && !options.barebone) {
                    var syncContext = options.syncContext; // sync can be called by SyncContext itself when paging results
                    if (!syncContext) {
                        // capture GetQuery options
                        syncContext = new SyncContext_1.SyncContext(options, // dynamic options passed to fetch() implement UI filters, etc.
                        model.options, // static options on collection implement screen-specific stuff
                        this // static options of this store realize filtering client/server
                        );
                        options.syncContext = syncContext;
                    }
                    if (model.syncContext !== syncContext) {
                        // assign a different instance
                        if (model.syncContext) {
                            model.stopListening(this, 'sync:' + endpoint.channel);
                        }
                        model.listenTo(this, 'sync:' + endpoint.channel, _.bind(syncContext.onMessage, syncContext, this, model));
                        model.syncContext = syncContext;
                    }
                }
            }
            else if (Model_1.isModel(model)) {
                // offline capability requires IDs for data
                if (!model.id) {
                    if (method === 'create') {
                        model.set(model.idAttribute, objectid.makeObjectID());
                    }
                    else {
                        throw new Error('no (valid) id: ' + model.id);
                    }
                }
            }
            else {
                // something is really at odds here...
                throw new Error('target of sync is neither a model nor a collection!?!');
            }
            // at this point the target server is known, check making sure the correct server is being hit
            var serverUrl = web.resolveServer(model.getUrlRoot(), {
                serverUrl: this.serverUrl
            });
            if (serverUrl !== this.serverUrl) {
                throw new Error('store is bound to server ' + this.serverUrl);
            }
            var channel = endpoint.channel;
            return this.getLastMessageTime(channel).then(function (time) {
                try {
                    // only send read messages if no other store can do this or for initial load
                    if (method === 'read' && endpoint.localStore && time && !options.reset) {
                        // read data from localStore and fetch changes remote
                        var opts = _.clone(options);
                        opts.store = endpoint.localStore;
                        opts.entity = endpoint.entity;
                        delete opts.success;
                        delete opts.error;
                        return endpoint.localStore.sync(method, model, opts).then(function (resp) {
                            // backbone success callback alters the collection now
                            resp = _this.handleSuccess(options, resp) || resp;
                            if (endpoint.socket || options.fetchMode === 'local') {
                                // no need to fetch changes as we got a websocket, that is either connected or attempts reconnection
                                return resp;
                            }
                            // when we are disconnected, try to connect now
                            if (!endpoint.isConnected) {
                                return _this.fetchServerInfo(endpoint).then(function (info) {
                                    // trigger reconnection when disconnected
                                    var result;
                                    if (!endpoint.isConnected) {
                                        result = _this.onConnect(endpoint);
                                    }
                                    return result || info;
                                }, function (xhr) {
                                    // trigger disconnection when disconnected
                                    var result;
                                    if (!xhr.statusCode && endpoint.isConnected) {
                                        result = _this.onDisconnect(endpoint);
                                    }
                                    return result || resp;
                                }).thenResolve(resp);
                            } // else...
                            // load changes only (will happen AFTER success callback is invoked,
                            // but returned promise will resolve only after changes were processed.
                            return _this.fetchChanges(endpoint).catch(function (xhr) {
                                if (!xhr.statusCode && endpoint.isConnected) {
                                    return _this.onDisconnect(endpoint) || resp;
                                }
                                // can not do much about it...
                                _this.trigger('error:' + channel, xhr, model);
                                return resp;
                            }).thenResolve(resp); // caller expects original XHR response as changes body data is NOT compatible
                        }, function () {
                            // fall-back to loading full data set
                            return _this._addMessage(method, model, options, endpoint);
                        });
                    }
                    // do backbone rest
                    return _this._addMessage(method, model, options, endpoint);
                }
                catch (error) {
                    return Q.reject(_this.handleError(options, error) || error);
                }
            });
        }
        catch (error) {
            return Q.reject(this.handleError(options, error) || error);
        }
    };
    SyncStore.prototype._addMessage = function (method, model, options, endpoint) {
        var _this = this;
        var changes = model.changedSinceSync;
        var data = null;
        var storeMsg = true;
        switch (method) {
            case 'update':
            case 'create':
                data = options.attrs || model.toJSON();
                break;
            case 'patch':
                if (_.isEmpty(changes)) {
                    return;
                }
                data = model.toJSON({
                    attrs: changes
                });
                break;
            case 'delete':
                break;
            default:
                diag.debug.assert(function () { return method === 'read'; }, 'unknown method: ' + method);
                storeMsg = false;
                break;
        }
        var entity = model.entity || endpoint.entity;
        diag.debug.assert(function () { return model.entity === endpoint.entity; });
        diag.debug.assert(function () { return entity.indexOf('~') < 0; }, 'entity name must not contain a ~ character!');
        var msg = {
            _id: entity + '~' + model.id,
            id: model.id,
            method: method,
            data: data,
            // channel: endpoint.channel, // channel is hacked in by storeMessage(), we don't want to use this anymore
            priority: endpoint.priority,
            time: Date.now()
        };
        var q = Q.resolve(msg);
        var qMessage;
        if (storeMsg) {
            // store and potentially merge message
            qMessage = this.storeMessage(endpoint, q);
            q = qMessage.then(function (message) {
                // in case of merging, this result could be different
                return message.attributes;
            });
        }
        return q.then(function (msg2) {
            // pass in qMessage so that deletion of stored message can be scheduled
            return _this._emitMessage(endpoint, msg2, options, model, qMessage);
        });
    };
    SyncStore.prototype._emitMessage = function (endpoint, msg, options, model, qMessage) {
        var _this = this;
        var channel = endpoint.channel;
        var qAjax = this._ajaxMessage(endpoint, msg, options, model);
        var q = qAjax;
        if (qMessage) {
            // following takes care of offline change store
            q = q.then(function (data) {
                // success, remove message stored, if any
                return _this.removeMessage(endpoint, msg, qMessage).catch(function (error) {
                    _this.trigger('error:' + channel, error, model); // can not do much about it...
                    return data;
                }).thenResolve(data); // resolve again yielding data
            }, function (xhr) {
                // failure eventually caught by offline changes
                if (!xhr.statusCode && _this.useOfflineChanges) {
                    // this seams to be only a connection problem, so we keep the message and call success
                    return Q.resolve(msg.data);
                }
                else {
                    // remove message stored and keep rejection as is
                    return _this.removeMessage(endpoint, msg, qMessage).catch(function (error) {
                        _this.trigger('error:' + channel, error, model); // can not do much about it...
                        return xhr;
                    }).thenReject(xhr);
                }
            });
        }
        q = this._applyResponse(q, endpoint, msg, options, model);
        return q.finally(function () {
            // do some connection handling
            return qAjax.then(function () {
                // trigger reconnection when disconnected
                if (!endpoint.isConnected) {
                    return _this.onConnect(endpoint);
                }
            }, function (xhr) {
                // trigger disconnection when disconnected
                if (!xhr.statusCode && endpoint.isConnected) {
                    return _this.onDisconnect(endpoint);
                }
            });
        });
    };
    SyncStore.prototype._ajaxMessage = function (endpoint, msg, options, model) {
        var _this = this;
        options = options || {};
        delete options.xhr; // make sure not to use old value
        var url = options.url;
        if (!url) {
            url = endpoint.urlRoot;
            if (msg.id && msg.method !== 'create') {
                // add ID of model
                url += (url.charAt(url.length - 1) === '/' ? '' : '/') + msg.id;
            }
            if (msg.method === 'read' && Collection_1.isCollection(model)) {
                // add query of collection
                var collectionUrl = _.isFunction(model.url) ? model.url() : model.url;
                var queryIndex = collectionUrl.lastIndexOf('?');
                var getQuery = new GetQuery_1.GetQuery().fromJSON(options);
                // currently only sortOrder can be supported as we require the initial data load to yield full dataset
                getQuery.limit = null;
                getQuery.offset = null;
                getQuery.filter = null;
                getQuery.fields = null;
                var getParams = getQuery.toQueryParams();
                if (queryIndex >= 0) {
                    url += collectionUrl.substr(queryIndex);
                    if (getParams) {
                        url += '&' + getParams;
                    }
                }
                else {
                    if (getParams) {
                        url += '?' + getParams;
                    }
                }
            }
        }
        // earliest point where target URL is known
        diag.debug.debug('ajaxMessage ' + msg.method + ' ' + url);
        var opts = {
            // must not take arbitrary options as these won't be replayed on reconnect
            url: url,
            attrs: msg.data,
            store: {},
            credentials: options.credentials,
            // error propagation
            error: options.error
        };
        // protect against wrong server and user identity
        diag.debug.assert(function () { return web.resolveServer(url, {
            serverUrl: _this.serverUrl
        }) === _this.serverUrl; });
        if (security.Server.getInstance(this.serverUrl).authorization.name !== this.userUuid) {
            diag.debug.warn('user identity was changed, working offline until authorization is restored');
            var error = new Error();
            // invoke error callback, if any
            return this.handleError(opts, error) || Q.reject(error);
        }
        // actual ajax request via backbone.js
        return this.checkServer(url, opts).then(function () {
            return model.sync(msg.method, model, opts).finally(function () {
                // take over xhr resolving the options copy
                options.xhr = opts.xhr.xhr || opts.xhr;
            });
        });
    };
    SyncStore.prototype._applyResponse = function (qXHR, endpoint, msg, options, model) {
        var _this = this;
        // var channel = endpoint.channel;
        var clientTime = new Date().getTime();
        return qXHR.then(function (data) {
            // delete on server does not respond a body
            if (!data && msg.method === 'delete') {
                data = msg.data;
            }
            // update local store state
            if (data) {
                // no data if server asks not to alter state
                // this.setLastMessageTime(channel, msg.time);
                var promises = [];
                var dataIds; // model id -> attributes data
                if (msg.method !== 'read') {
                    promises.push(_this.onMessage(endpoint, _this._fixMessage(endpoint, data === msg.data ? msg : _.defaults({
                        data: data // just accepts new data
                    }, msg))));
                }
                else if (Collection_1.isCollection(model) && Array.isArray(data)) {
                    // synchronize the collection contents with the data read
                    var syncIds = {};
                    model.models.forEach(function (m) {
                        syncIds[m.id] = m;
                    });
                    dataIds = {};
                    data.forEach(function (d) {
                        if (d) {
                            var id = d[endpoint.modelType.prototype.idAttribute] || d._id;
                            dataIds[id] = d;
                            var m = syncIds[id];
                            if (m) {
                                // update the item
                                delete syncIds[id]; // so that it is deleted below
                                if (!_.isEqual(_.pick.call(m, m.attributes, Object.keys(d)), d)) {
                                    // above checked that all attributes in d are in m with equal values and found some mismatch
                                    promises.push(_this.onMessage(endpoint, _this._fixMessage(endpoint, {
                                        id: id,
                                        method: 'update',
                                        time: msg.time,
                                        data: d
                                    })));
                                }
                            }
                            else {
                                // create the item
                                promises.push(_this.onMessage(endpoint, _this._fixMessage(endpoint, {
                                    id: id,
                                    method: 'create',
                                    time: msg.time,
                                    data: d
                                })));
                            }
                        }
                    });
                    Object.keys(syncIds).forEach(function (id) {
                        // delete the item
                        var m = syncIds[id];
                        promises.push(_this.onMessage(endpoint, _this._fixMessage(endpoint, {
                            id: id,
                            method: 'delete',
                            time: msg.time,
                            data: m.attributes
                        })));
                    });
                }
                else {
                    // trigger an update to load the data read
                    var array = Array.isArray(data) ? data : [data];
                    for (var i = 0; i < array.length; i++) {
                        data = array[i];
                        if (data) {
                            promises.push(_this.onMessage(endpoint, _this._fixMessage(endpoint, {
                                id: data[endpoint.modelType.prototype.idAttribute] || data._id,
                                method: 'update',
                                time: msg.time,
                                data: data
                            })));
                        }
                    }
                }
                return Q.all(promises).then(function () {
                    // delayed till operations complete
                    if (!dataIds) {
                        return data;
                    }
                    diag.debug.assert(function () { return Collection_1.isCollection(model); });
                    // when collection was updated only pass data of models that were synced on to the success callback,
                    // as the callback will set the models again causing our sorting and filtering to be without effect.
                    var response = [];
                    var models = Collection_1.isCollection(model) ? model.models : [model];
                    for (var i = models.length; i-- > 0;) {
                        var m = models[i];
                        if (dataIds[m.id]) {
                            response.push(m.attributes);
                            delete dataIds[m.id];
                            if (dataIds.length <= 0) {
                                break;
                            }
                        }
                    }
                    return response.reverse();
                });
            }
        }).then(function (response) {
            var qTime;
            if (msg.method === 'read' && Collection_1.isCollection(model)) {
                // TODO: extract Date header from options.xhr instead of using clientTime
                qTime = _this.setLastMessageTime(endpoint.channel, clientTime);
            }
            else {
                qTime = Q.resolve(undefined);
            }
            return qTime.then(function () {
                // invoke success callback, if any
                return _this.handleSuccess(options, response) || response;
            });
        }, function (error) {
            // invoke error callback, if any
            return _this.handleError(options, error) || Q.reject(error);
        });
    };
    SyncStore.prototype.fetchChanges = function (endpoint, force) {
        var _this = this;
        if (force === void 0) { force = false; }
        var channel = endpoint.channel;
        if (!endpoint.urlRoot || !channel) {
            return Q.resolve(undefined);
        }
        var now = Date.now();
        var promise = endpoint.promiseFetchingChanges;
        if (promise && !force) {
            if (promise.isPending() || now - endpoint.timestampFetchingChanges < 1000) {
                // reuse existing eventually completed request for changes
                diag.debug.warning(channel + ' skipping changes request...');
                return promise;
            }
        }
        return this.getLastMessageTime(channel).then(function (time) {
            if (!time) {
                diag.debug.error(channel + ' can not fetch changes at this time!');
                return promise || Q.resolve(undefined);
            }
            // initiate a new request for changes
            diag.debug.info(channel + ' initiating changes request...');
            var changes = new _this.messages.constructor();
            promise = _this.checkServer(endpoint.urlRoot + 'changes/' + time).then(function (url) {
                return Q(changes.fetch({
                    url: url,
                    store: {},
                    success: function (model, response, options) {
                        return response || options.xhr;
                    }
                })).then(function () {
                    if (changes.models.length > 0) {
                        return Q.all(changes.map(function (change) {
                            var msg = change.attributes;
                            return _this.onMessage(endpoint, _this._fixMessage(endpoint, msg));
                        }));
                    }
                    else {
                        // following should use server time!
                        return _this.setLastMessageTime(channel, now);
                    }
                }).thenResolve(changes);
            });
            endpoint.promiseFetchingChanges = promise;
            endpoint.timestampFetchingChanges = now;
            return promise;
        });
    };
    SyncStore.prototype.fetchServerInfo = function (endpoint) {
        var _this = this;
        var now = Date.now();
        var promise = endpoint.promiseFetchingServerInfo;
        if (promise) {
            if (promise.isPending() || now - endpoint.timestampFetchingServerInfo < 1000) {
                // reuse existing eventually completed request for changes
                diag.debug.warning(endpoint.channel + ' skipping info request...');
                return promise;
            }
        }
        var info = new Model_1.Model();
        var time = this.getLastMessageTime(endpoint.channel);
        var url = endpoint.urlRoot;
        if (url.charAt((url.length - 1)) !== '/') {
            url += '/';
        }
        promise = this.checkServer(url + 'info').then(function (url) {
            return Q(info.fetch(({
                url: url,
                success: function (model, response, options) {
                    return response || options.xhr;
                }
            }))).then(function () {
                //@todo why we set a server time here ?
                return _this.getLastMessageTime(endpoint.channel).then(function (time) {
                    if (!time && info.get('time')) {
                        return _this.setLastMessageTime(endpoint.channel, info.get('time'));
                    }
                    return time;
                });
            }).then(function () {
                if (!endpoint.socketPath && info.get('socketPath')) {
                    endpoint.socketPath = info.get('socketPath');
                    var name = info.get('entity') || endpoint.entity;
                    if (_this.useSocketNotify) {
                        endpoint.socket = _this.createSocket(endpoint, name);
                    }
                }
                return info;
            });
        });
        endpoint.promiseFetchingServerInfo = promise;
        endpoint.timestampFetchingServerInfo = now;
        return promise;
    };
    /**
     * called when an offline change was sent to the remote server.
     *
     * <p>
     * May be overwritten to alter change message error handling behavior. The default implementation will attempt
     * reloading the server data for restoring the client state such that it reflects the server state. When this
     * succeeded, the offline change is effectively reverted and the change message is dropped.
     * </p>
     * <p>
     * An overwritten implementation may decided whether to revert failed changes based on the error reported.
     * </p>
     * <p>
     * Notice, the method is not called when the offline change failed due to a connectivity issue.
     * </p>
     *
     * @param error reported by remote server.
     * @param message change reported, attributes of type LiveDataMessage.
     * @param options context information required to access the data locally as well as remotely.
     * @return {any} Promise indicating success to drop the change message and proceed with the next change, or
     *    rejection indicating the change message is kept and retried later on.
     */
    SyncStore.prototype.processOfflineMessageResult = function (error, message, options) {
        var _this = this;
        if (!error) {
            // message was processed successfully
            if (!this.useSocketNotify) {
                // when not using sockets, fetch changes now
                var endpoint = this.endpoints[options.entity];
                if (endpoint) {
                    // will pull the change caused by the offline message and update the message time,
                    // so that we avoid the situation where the change caused by replaying the offline
                    // change results in a conflict later on...
                    return this.fetchChanges(endpoint, true);
                }
            }
            return Q.resolve(message);
        }
        // failed, eventually undo the modifications stored
        if (!options.localStore) {
            return Q.reject(error);
        }
        // revert modification by reloading data
        var modelType = options.modelType || Model_1.Model;
        var model = new modelType(message.get('data'), {
            entity: options.entity
        });
        model.id = message.get('method') !== 'create' && message.get('id');
        var triggerError = function () {
            // inform client application of the offline changes error
            var channel = message.get('channel');
            diag.debug.error('Relution.livedata.SyncStore.processOfflineMessageResult: triggering error for channel ' + channel + ' on store', error);
            if (!options.silent) {
                _this.trigger('error:' + channel, error, model);
            }
        };
        var localOptions = {
            // just affect local store
            store: options.localStore
        };
        var remoteOptions = {
            urlRoot: options.urlRoot,
            store: {} // really go to remote server
        };
        if (model.id) {
            remoteOptions.url = remoteOptions.urlRoot + (remoteOptions.urlRoot.charAt(remoteOptions.urlRoot.length - 1) === '/' ? '' : '/') + model.id;
        }
        else {
            // creation failed, just delete locally
            diag.debug.assert(function () { return message.get('method') === 'create'; });
            return model.destroy(localOptions).finally(triggerError);
        }
        return model.fetch(remoteOptions).then(function (data) {
            // original request failed and the code above reloaded the data to revert the local modifications, which succeeded...
            return model.save(data, localOptions).finally(triggerError);
        }, function (fetchResp) {
            // original request failed and the code above tried to revert the local modifications by reloading the data, which failed as well...
            var statusCode = fetchResp && fetchResp.statusCode;
            switch (statusCode) {
                case 404: // NOT FOUND
                case 401: // UNAUTHORIZED
                case 410:
                    // ...because the item is gone by now, maybe someone else changed it to be deleted
                    return model.destroy(localOptions); // silent regarding triggerError
                default:
                    return Q.reject(fetchResp).finally(triggerError);
            }
        });
    };
    /**
     * feeds pending offline #messages to the remote server.
     *
     * <p>
     * Due to client code setting up models one at a time, this method is called multiple times during initial setup of
     * #endpoints. The first call fetches pending offline #messages, ordered by priority and time. Then the #messages
     * are send to the remote server until depleted, an error occurs, or some missing endpoint is encounted.
     * </p>
     * <p>
     * The method is triggered each time an endpoint is registered, or state changes to online for any endpoint. When
     * state changes from offline to online (disregarding endpoint) message submission is restarted by resetting the
     * #messagesPromise. Otherwise, subsequent calls chain to the end of #messagesPromise.
     * </p>
     *
     * @return {Promise} of #messages Collection, or last recent offline rejection
     * @private
     */
    SyncStore.prototype._sendMessages = function () {
        var _this = this;
        // not ready yet
        if (!this.messages) {
            return Q.resolve(undefined);
        }
        // processes messages until none left, hitting a message of a not yet registered endpoint, or entering
        // a non-recoverable error. The promise returned resolves to this.messages when done.
        var nextMessage = function () {
            if (!_this.messages.length) {
                return _this.messages;
            }
            var message = _this.messages.models[0];
            var entity = message.id.substr(0, message.id.indexOf('~'));
            if (!entity) {
                diag.debug.error('sendMessage ' + message.id + ' with no entity!');
                return message.destroy().then(nextMessage);
            }
            var endpoint = _this.endpoints[entity];
            if (!endpoint) {
                return _this.messages;
            }
            diag.debug.assert(function () { return endpoint.channel === message.get('channel'); }, 'channel of endpoint ' + endpoint.channel + ' does not match channel of message ' + message.get('channel'));
            var msg = _this._fixMessage(endpoint, message.attributes);
            var modelType = endpoint.modelType || Model_1.Model;
            var model = new modelType(msg.data, {
                entity: endpoint.entity
            });
            model.id = message.get('method') !== 'create' && message.get('id');
            var remoteOptions = {
                urlRoot: endpoint.urlRoot,
                store: {} // really go to remote server
            };
            if (model.id) {
                remoteOptions.url = remoteOptions.urlRoot + (remoteOptions.urlRoot.charAt(remoteOptions.urlRoot.length - 1) === '/' ? '' : '/') + model.id;
            }
            diag.debug.info('sendMessage ' + model.id);
            var offlineOptions = {
                entity: endpoint.entity,
                modelType: endpoint.modelType,
                urlRoot: endpoint.urlRoot,
                localStore: endpoint.localStore
            };
            return _this._applyResponse(_this._ajaxMessage(endpoint, msg, remoteOptions, model), endpoint, msg, remoteOptions, model).then(function () {
                // succeeded
                return _this.processOfflineMessageResult(null, message, offlineOptions);
            }, function (error) {
                if (error.statusCode) {
                    // remote failed
                    return Q(_this.processOfflineMessageResult(error, message, offlineOptions)).catch(function (error2) {
                        // explicitly disconnect due to error in endpoint
                        _this.disconnectedEntity = endpoint.entity;
                        return _this.onDisconnect(endpoint).thenReject(error2);
                    });
                }
                else {
                    // connectivity issue, keep rejection
                    return Q.reject(error);
                }
            }).then(function () {
                // applying change succeeded or successfully recovered change
                return message.destroy();
            }).then(nextMessage);
        };
        diag.debug.info('Relution.livedata.SyncStore._sendMessages');
        var q = this.messagesPromise;
        if (!q) {
            // initially fetch all messages
            q = Q(this.messages.fetch({
                sortOrder: [
                    '+priority',
                    '+time',
                    '+id'
                ]
            }));
        }
        else if (this.messagesPromise.isRejected()) {
            // early rejection
            return this.messagesPromise;
        }
        else if (!this.messages.length) {
            // no more messages
            return this.messagesPromise;
        }
        // kick to process pending messages
        this.messagesPromise = q.then(nextMessage);
        return this.messagesPromise;
    };
    SyncStore.prototype.storeMessage = function (endpoint, qMsg) {
        var _this = this;
        return qMsg.then(function (msg) {
            var options;
            var id = _this.messages.modelId(msg);
            diag.debug.info('storeMessage ' + id);
            var message = id && _this.messages.get(id);
            if (message) {
                // use existing instance, should not be the case usually
                options = {
                    merge: true
                };
            }
            else {
                // instantiate new model, intentionally not added to collection
                message = new _this.messages.model(msg, {
                    collection: _this.messages,
                    store: _this.messages.store
                });
                message.set('channel', endpoint.channel);
            }
            return Q(message.save(msg, options)).thenResolve(message);
        });
    };
    SyncStore.prototype.removeMessage = function (endpoint, msg, qMessage) {
        var _this = this;
        return qMessage.then(function (message) {
            if (!message) {
                var id = _this.messages.modelId(msg);
                if (!id) {
                    // msg is not persistent
                    return Q.resolve(undefined);
                }
                message = _this.messages.get(id);
                if (!message) {
                    message = new _this.messages.model({
                        _id: msg._id
                    }, {
                        collection: _this.messages,
                        store: _this.messages.store
                    });
                }
            }
            diag.debug.trace('removeMessage ' + message.id);
            return message.destroy();
        });
    };
    SyncStore.prototype.clear = function (collection) {
        if (collection) {
            var endpoint = this.getEndpoint(collection);
            if (endpoint) {
                if (this.messages) {
                    this.messages.destroy();
                }
                collection.reset();
                return this.setLastMessageTime(endpoint.channel, '');
            }
        }
    };
    /**
     * close the socket explicit
     */
    SyncStore.prototype.close = function () {
        if (this.messages.store) {
            this.messages.store.close();
            this.messages = null;
        }
        var keys = Object.keys(this.endpoints);
        for (var i = 0, l = keys.length; i < l; i++) {
            this.endpoints[keys[i]].close();
        }
    };
    return SyncStore;
}(Store_1.Store));
exports.SyncStore = SyncStore;
// mixins
var syncStore = _.extend(SyncStore.prototype, {
    _type: 'Relution.livedata.SyncStore',
    localStore: WebSqlStore_1.WebSqlStore,
    useLocalStore: true,
    useSocketNotify: true,
    useOfflineChanges: true,
    socketPath: ''
});
diag.debug.assert(function () { return SyncStore.prototype.isPrototypeOf(Object.create(syncStore)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxHQUFHLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEcsQ0FBQztRQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVSOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDtJQUErQiw2QkFBSztJQXFEbEMsbUJBQVksT0FBYTtRQUN2QixrQkFBTSxPQUFPLENBQUMsQ0FBQztRQXRCVixjQUFTLEdBR1osRUFBRSxDQUFDO1FBSVA7Ozs7Ozs7O1dBUUc7UUFDSyx1QkFBa0IsR0FBVyxLQUFLLENBQUM7UUFPekMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxPQUFPLFVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNPLDhCQUFVLEdBQXBCLFVBQXFCLEdBQVc7UUFDOUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O1NBSUs7SUFDRyw4QkFBVSxHQUFsQixVQUFtQixPQUFlO1FBQ2hDLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFO1lBQ3pDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUMxQixDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7WUFDMUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLCtDQUErQztnQkFDL0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUM5QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7aUJBQ3hCLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNILENBQUM7SUFFTywrQkFBVyxHQUFuQixVQUFvQixHQUFXLEVBQUUsT0FBYTtRQUE5QyxpQkFXQztRQVZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxTQUFTLEVBQUUsS0FBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxLQUFLLEtBQUksQ0FBQyxTQUFTLEVBRkcsQ0FFSCxDQUFDLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDckYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsNEVBQTRFLENBQUMsQ0FBQztZQUM5RixJQUFNLEtBQUssR0FBa0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QyxnQ0FBZ0M7WUFDaEMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFTLEtBQUssQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRVMsZ0NBQVksR0FBdEIsVUFBdUIsaUJBQXFDLEVBQUUsU0FBb0I7UUFBbEYsaUJBK0JDO1FBOUJDLElBQUksT0FBTyxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzdDLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0QixzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QixPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxJQUFJLFVBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDdkUsVUFBUSxHQUFHLElBQUksMkJBQVksQ0FBQztvQkFDMUIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE9BQU8sRUFBRSxPQUFPO29CQUNoQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtpQkFDeEIsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBUSxDQUFDO2dCQUVsQyxVQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFRLENBQUMsQ0FBQztnQkFDdEQsVUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxVQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9HLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMzQixVQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxVQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBUSxDQUFDLENBQUM7WUFDakQsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLCtEQUErRDtnQkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLFVBQVEsQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUE1QixDQUE0QixFQUFFLHNEQUFzRCxDQUFDLENBQUM7Z0JBQzlHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxVQUFRLENBQUMsUUFBUSxLQUFLLEtBQUksQ0FBQyxRQUFRLEVBQW5DLENBQW1DLEVBQUUsNERBQTRELENBQUMsQ0FBQztZQUM3SCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFVBQVEsQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCw2QkFBUyxHQUFULFVBQVUsS0FBWTtRQUNwQixLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFhLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGtDQUFjLEdBQWQsVUFBZSxVQUFzQjtRQUNuQyxVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLGlCQUFxQztRQUMvQyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDaEIscUZBQXFGO2dCQUNyRixJQUFJLFNBQVMsR0FBRyx5QkFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQztnQkFDMUcsTUFBTSxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLFlBQVksUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUMvRixDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xCLENBQUM7SUFDSCxDQUFDO0lBRUQsb0NBQWdCLEdBQWhCLFVBQWlCLFFBQXNCO1FBQ3JDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNsQixRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDN0MsSUFBSSxXQUFXLEdBQUc7Z0JBQ2hCLFFBQVEsRUFBRSxRQUFRO2FBQ25CLENBQUM7WUFDRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksT0FBTyxJQUFJLENBQUMsaUJBQWlCLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDekUsV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQzlDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ2xDLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsdUNBQW1CLEdBQW5CO1FBQ0UsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHVCQUFVLENBQUMsU0FBUyxFQUFFO2dCQUN4QyxLQUFLLEVBQUUsc0NBQW9CO2dCQUMzQixLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUNuRCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQVk7UUFBakQsaUJBK0JDO1FBOUJDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLFdBQVc7WUFDWCxJQUFJLFNBQVMsR0FBUTtnQkFDbkIsc0JBQXNCLEVBQUUsSUFBSTthQUM3QixDQUFDO1lBQ0YsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLG1CQUFtQjtZQUN2RCxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7WUFDL0YsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNyQyxDQUFDO1lBRUQsU0FBUztZQUNULFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtnQkFDNUIsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsRUFBRTtvQkFDakUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLEVBQUUsS0FBSyxRQUFRLEVBQWYsQ0FBZSxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFO2dCQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBQyxHQUFvQjtnQkFDeEQsTUFBTSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQWE7UUFDaEQsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDL0IsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLEdBQUcsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO2dCQUNoRCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtvQkFDbEIsTUFBTSxFQUFFLElBQUk7b0JBQ1osT0FBTyxFQUFFLE9BQU87b0JBQ2hCLElBQUksRUFBRSxJQUFJO2lCQUNYLENBQUMsQ0FBQztnQkFDSCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7SUFDSCxDQUFDO0lBRUQsc0NBQWtCLEdBQWxCLFVBQW1CLE9BQWU7UUFDaEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUNELDJDQUEyQztRQUMzQyxJQUFJLElBQUksR0FBRyxzQkFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRCxzQ0FBa0IsR0FBbEIsVUFBbUIsT0FBZSxFQUFFLElBQVM7UUFBN0MsaUJBVUM7UUFUQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsWUFBWTtZQUMzRSxNQUFNLENBQUMsSUFBSSxHQUFHLFlBQVksQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07WUFDZCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNYLHNCQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sR0FBRyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzlELEtBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQ3BDLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCw2QkFBUyxHQUFULFVBQVUsUUFBc0I7UUFBaEMsaUJBbUNDO1FBbENDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsd0VBQXdFO1lBQ3hFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBSyxJQUFLLE9BQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7WUFFRCw2QkFBNkI7WUFDN0IsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM1Qix1Q0FBdUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDdEMsZ0NBQWdDO29CQUNoQyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsa0JBQWtCLEtBQUssS0FBSyxJQUFJLEtBQUksQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDckYsd0NBQXdDO3dCQUN4QyxLQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzt3QkFDNUIsS0FBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztvQkFDakMsQ0FBQztvQkFDRCxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM5QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxLQUFLO29CQUNiLGlFQUFpRTtvQkFDakUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUNYLDZDQUE2Qzt3QkFDN0MsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JDLENBQUM7b0JBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQU8sS0FBSyxDQUFDLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNULHdFQUF3RTtnQkFDeEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLEtBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0lBQzlCLENBQUM7SUFFRCxnQ0FBWSxHQUFaLFVBQWEsUUFBc0I7UUFBbkMsaUJBb0JDO1FBbkJDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNiLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQVUsUUFBUSxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCx3REFBd0Q7Z0JBQ2xELFFBQVEsQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQy9DLENBQUM7WUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNULEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEtBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLFFBQXNCLEVBQUUsR0FBb0I7UUFDdEQsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO1FBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsV0FBVyxFQUFiLENBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYztRQUN0RCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQzFELENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELDZCQUFTLEdBQVQsVUFBVSxRQUFzQixFQUFFLEdBQW9CO1FBQXRELGlCQXVEQztRQXREQyxnRUFBZ0U7UUFDaEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBa0IsSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQWlCLENBQUM7UUFDdEIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMvQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QixvRUFBb0U7WUFDcEUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVO2FBQzNCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDM0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDcEQsS0FBSyxFQUFFLElBQUk7YUFDWixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNkLHlGQUF5RjtnQkFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsNkNBQTZDLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN2SCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRyxDQUFDO1lBQ0QsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNoRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPO2FBQzlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07Z0JBQ2QsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ2hCLENBQUM7Z0JBRUQsbURBQW1EO2dCQUNuRCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsSCxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLHdDQUF3QztZQUN4QyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ1osTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxLQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDNUUsbUNBQW1DO2dCQUNuQyxLQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7Z0JBQzlELE1BQU0sQ0FBQyxHQUFHLENBQUM7WUFDYixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsRUFBRSxVQUFDLEtBQVk7WUFDZCx5Q0FBeUM7WUFFekMsaUNBQWlDO1lBQ2pDLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLHdCQUFJLEdBQVgsVUFBWSxNQUFjLEVBQUUsS0FBeUIsRUFBRSxPQUFpQjtRQUF4RSxpQkFvSEM7UUFwSHNELHVCQUFpQixHQUFqQixZQUFpQjtRQUN0RSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQztZQUNILElBQUksUUFBUSxHQUFpQixLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUVELEVBQUUsQ0FBQyxDQUFDLHlCQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixvQ0FBb0M7Z0JBQ3BDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDM0MsSUFBSSxXQUFXLEdBQWdCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQywrREFBK0Q7b0JBQ25ILEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsMkJBQTJCO3dCQUMzQixXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUMzQixPQUFPLEVBQVMsK0RBQStEO3dCQUMvRSxLQUFLLENBQUMsT0FBTyxFQUFHLCtEQUErRDt3QkFDL0UsSUFBSSxDQUFZLCtEQUErRDt5QkFDaEYsQ0FBQzt3QkFDRixPQUFPLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztvQkFDcEMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLDhCQUE4Qjt3QkFDOUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7NEJBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3hELENBQUM7d0JBQ0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDMUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7b0JBQ2xDLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsMkNBQTJDO2dCQUMzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNkLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7b0JBQ3hELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ04sTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ2hELENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTixzQ0FBc0M7Z0JBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztZQUMzRSxDQUFDO1lBRUQsOEZBQThGO1lBQzlGLElBQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFO2dCQUN0RCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7YUFDMUIsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLENBQUMsU0FBUyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBRUQsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7Z0JBQ2hELElBQUksQ0FBQztvQkFDSCw0RUFBNEU7b0JBQzVFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLFVBQVUsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDdkUscURBQXFEO3dCQUNyRCxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUM1QixJQUFJLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQzt3QkFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO3dCQUNwQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7d0JBQ2xCLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7NEJBQzdELHNEQUFzRDs0QkFDdEQsSUFBSSxHQUFHLEtBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQzs0QkFDakQsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0NBQ3JELG9HQUFvRztnQ0FDcEcsTUFBTSxDQUFDLElBQUksQ0FBQzs0QkFDZCxDQUFDOzRCQUVELCtDQUErQzs0QkFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztnQ0FDMUIsTUFBTSxDQUFDLEtBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtvQ0FDOUMseUNBQXlDO29DQUN6QyxJQUFJLE1BQXVCLENBQUM7b0NBQzVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0NBQzFCLE1BQU0sR0FBRyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29DQUNwQyxDQUFDO29DQUNELE1BQU0sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDO2dDQUN4QixDQUFDLEVBQUUsVUFBQyxHQUFrQjtvQ0FDcEIsMENBQTBDO29DQUMxQyxJQUFJLE1BQXVCLENBQUM7b0NBQzVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3Q0FDNUMsTUFBTSxHQUFHLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0NBQ3ZDLENBQUM7b0NBQ0QsTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7Z0NBQ3hCLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDdkIsQ0FBQyxDQUFDLFVBQVU7NEJBRVosb0VBQW9FOzRCQUNwRSx1RUFBdUU7NEJBQ3ZFLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQWtCO2dDQUMxRCxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0NBQzVDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQztnQ0FDN0MsQ0FBQztnQ0FFRCw4QkFBOEI7Z0NBQzlCLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0NBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUM7NEJBQ2QsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsOEVBQThFO3dCQUN0RyxDQUFDLEVBQUU7NEJBQ0QscUNBQXFDOzRCQUNyQyxNQUFNLENBQUMsS0FBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQzt3QkFDNUQsQ0FBQyxDQUFDLENBQUM7b0JBQ0wsQ0FBQztvQkFFRCxtQkFBbUI7b0JBQ25CLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM1RCxDQUFFO2dCQUFBLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7b0JBQ2YsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7Z0JBQzdELENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUU7UUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ2YsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7UUFDN0QsQ0FBQztJQUNILENBQUM7SUFFTywrQkFBVyxHQUFuQixVQUFvQixNQUFjLEVBQUUsS0FBeUIsRUFBRSxPQUFZLEVBQ3ZELFFBQXNCO1FBRDFDLGlCQXVEQztRQXJEQyxJQUFJLE9BQU8sR0FBVyxLQUFNLENBQUMsZ0JBQWdCLENBQUM7UUFDOUMsSUFBSSxJQUFJLEdBQVEsSUFBSSxDQUFDO1FBQ3JCLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQztRQUNwQixNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2YsS0FBSyxRQUFRLENBQUM7WUFDZCxLQUFLLFFBQVE7Z0JBQ1gsSUFBSSxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN2QyxLQUFLLENBQUM7WUFFUixLQUFLLE9BQU87Z0JBQ1YsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZCLE1BQU0sQ0FBQztnQkFDVCxDQUFDO2dCQUNELElBQUksR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO29CQUNsQixLQUFLLEVBQUUsT0FBTztpQkFDZixDQUFDLENBQUM7Z0JBQ0gsS0FBSyxDQUFDO1lBRVIsS0FBSyxRQUFRO2dCQUNYLEtBQUssQ0FBQztZQUVSO2dCQUNFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFFLGNBQU0sT0FBQSxNQUFNLEtBQUssTUFBTSxFQUFqQixDQUFpQixFQUFFLGtCQUFrQixHQUFHLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RSxRQUFRLEdBQUcsS0FBSyxDQUFDO2dCQUNqQixLQUFLLENBQUM7UUFDVixDQUFDO1FBQ0QsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDO1FBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEVBQWhDLENBQWdDLENBQUMsQ0FBQztRQUMxRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQXZCLENBQXVCLEVBQUUsNkNBQTZDLENBQUMsQ0FBQztRQUNoRyxJQUFJLEdBQUcsR0FBb0I7WUFDekIsR0FBRyxFQUFFLE1BQU0sR0FBRyxHQUFHLEdBQVcsS0FBTSxDQUFDLEVBQUU7WUFDckMsRUFBRSxFQUFVLEtBQU0sQ0FBQyxFQUFFO1lBQ3JCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSSxFQUFFLElBQUk7WUFDViwwR0FBMEc7WUFDMUcsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQzNCLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1NBQ2pCLENBQUM7UUFFRixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksUUFBeUMsQ0FBQztRQUM5QyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2Isc0NBQXNDO1lBQ3RDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxDQUFDLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxVQUFDLE9BQTZCO2dCQUM5QyxxREFBcUQ7Z0JBQ3JELE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1lBQzVCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBcUI7WUFDbEMsdUVBQXVFO1lBQ3ZFLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNyRSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxnQ0FBWSxHQUFwQixVQUFxQixRQUFzQixFQUFFLEdBQW9CLEVBQUUsT0FBWSxFQUMxRCxLQUF5QixFQUFFLFFBQXlDO1FBRHpGLGlCQThDQztRQTNDQyxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQy9CLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBRWQsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNiLCtDQUErQztZQUMvQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7Z0JBQ2QseUNBQXlDO2dCQUN6QyxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEtBQW9CO29CQUM1RSxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsOEJBQThCO29CQUM5RSxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNkLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtZQUN0RCxDQUFDLEVBQUUsVUFBQyxHQUFrQjtnQkFDcEIsK0NBQStDO2dCQUMvQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksS0FBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztvQkFDOUMsc0ZBQXNGO29CQUN0RixNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04saURBQWlEO29CQUNqRCxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEtBQW9CO3dCQUM1RSxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsOEJBQThCO3dCQUM5RSxNQUFNLENBQUMsR0FBRyxDQUFDO29CQUNiLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDckIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELENBQUMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNmLDhCQUE4QjtZQUM5QixNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDaEIseUNBQXlDO2dCQUN6QyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUMxQixNQUFNLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztZQUNILENBQUMsRUFBRSxVQUFDLEdBQWtCO2dCQUNwQiwwQ0FBMEM7Z0JBQzFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsR0FBb0IsRUFBRSxPQUFZLEVBQzFELEtBQXlCO1FBRDlDLGlCQWtFQztRQWhFQyxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUN4QixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxpQ0FBaUM7UUFFckQsSUFBSSxHQUFHLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztRQUN0QixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDVCxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztZQUN2QixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDdEMsa0JBQWtCO2dCQUNsQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ25FLENBQUM7WUFDRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSx5QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQsMEJBQTBCO2dCQUMxQixJQUFJLGFBQWEsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQztnQkFDdEUsSUFBSSxVQUFVLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxRQUFRLEdBQUcsSUFBSSxtQkFBUSxFQUFFLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoRCxzR0FBc0c7Z0JBQ3RHLFFBQVEsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO2dCQUN0QixRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDdkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3ZCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUN2QixJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsYUFBYSxFQUFFLENBQUM7Z0JBQ3pDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNwQixHQUFHLElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDeEMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDZCxHQUFHLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQztvQkFDekIsQ0FBQztnQkFDSCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7d0JBQ2QsR0FBRyxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUM7b0JBQ3pCLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsMkNBQTJDO1FBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUMxRCxJQUFJLElBQUksR0FBUTtZQUNkLDBFQUEwRTtZQUMxRSxHQUFHLEVBQUUsR0FBRztZQUNSLEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNmLEtBQUssRUFBRSxFQUFFO1lBQ1QsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQ2hDLG9CQUFvQjtZQUNwQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7U0FDckIsQ0FBQztRQUVGLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsR0FBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUU7WUFDN0MsU0FBUyxFQUFFLEtBQUksQ0FBQyxTQUFTO1NBQzFCLENBQUMsS0FBSyxLQUFJLENBQUMsU0FBUyxFQUZHLENBRUgsQ0FBQyxDQUFDO1FBQ3ZCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3JGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDRFQUE0RSxDQUFDLENBQUM7WUFDOUYsSUFBTSxLQUFLLEdBQWtCLElBQUksS0FBSyxFQUFFLENBQUM7WUFDekMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0QyxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ2pELDJDQUEyQztnQkFDM0MsT0FBTyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sa0NBQWMsR0FBdEIsVUFBMEIsSUFBa0IsRUFBRSxRQUFzQixFQUFFLEdBQW9CLEVBQ2hFLE9BQVksRUFBRSxLQUF5QjtRQURqRSxpQkF3SEM7UUF0SEMsa0NBQWtDO1FBQ2xDLElBQUksVUFBVSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFhO1lBQzdCLDJDQUEyQztZQUMzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2xCLENBQUM7WUFFRCwyQkFBMkI7WUFDM0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDVCw0Q0FBNEM7Z0JBQzVDLDhDQUE4QztnQkFDOUMsSUFBSSxRQUFRLEdBQWlDLEVBQUUsQ0FBQztnQkFDaEQsSUFBSSxPQUFZLENBQUMsQ0FBQyw4QkFBOEI7Z0JBQ2hELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksR0FBRyxHQUFHLEdBQW9CLENBQUMsQ0FBQyxRQUFRLENBQUM7d0JBQ3RILElBQUksRUFBRSxJQUFJLENBQUMsd0JBQXdCO3FCQUNwQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNiLENBQUM7Z0JBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLHlCQUFZLENBQUMsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3RELHlEQUF5RDtvQkFDekQsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNqQixLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFDLENBQUM7d0JBQ3JCLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUNwQixDQUFDLENBQUMsQ0FBQztvQkFDSCxPQUFPLEdBQUcsRUFBRSxDQUFDO29CQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBQyxDQUFNO3dCQUNsQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNOLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDOzRCQUM5RCxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUNoQixJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ3BCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ04sa0JBQWtCO2dDQUNsQixPQUFPLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtnQ0FDbEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7b0NBQ2hFLDRGQUE0RjtvQ0FDNUYsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTt3Q0FDaEUsRUFBRSxFQUFFLEVBQUU7d0NBQ04sTUFBTSxFQUFFLFFBQVE7d0NBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTt3Q0FDZCxJQUFJLEVBQUUsQ0FBQztxQ0FDUixDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNQLENBQUM7NEJBQ0gsQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDTixrQkFBa0I7Z0NBQ2xCLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7b0NBQ2hFLEVBQUUsRUFBRSxFQUFFO29DQUNOLE1BQU0sRUFBRSxRQUFRO29DQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7b0NBQ2QsSUFBSSxFQUFFLENBQUM7aUNBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDUCxDQUFDO3dCQUNILENBQUM7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxFQUFFO3dCQUM5QixrQkFBa0I7d0JBQ2xCLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDcEIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTs0QkFDaEUsRUFBRSxFQUFFLEVBQUU7NEJBQ04sTUFBTSxFQUFFLFFBQVE7NEJBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTs0QkFDZCxJQUFJLEVBQUUsQ0FBQyxDQUFDLFVBQVU7eUJBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ1AsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTiwwQ0FBMEM7b0JBQzFDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUN0QyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNoQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDOzRCQUNULFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7Z0NBQ2hFLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUc7Z0NBQzlELE1BQU0sRUFBRSxRQUFRO2dDQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7Z0NBQ2QsSUFBSSxFQUFFLElBQUk7NkJBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDUCxDQUFDO29CQUNILENBQUM7Z0JBQ0gsQ0FBQztnQkFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLG1DQUFtQztvQkFDbkMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNiLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2QsQ0FBQztvQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEseUJBQVksQ0FBQyxLQUFLLENBQUMsRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDO29CQUU3QyxvR0FBb0c7b0JBQ3BHLG9HQUFvRztvQkFDcEcsSUFBSSxRQUFRLEdBQVUsRUFBRSxDQUFDO29CQUN6QixJQUFJLE1BQU0sR0FBRyx5QkFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDMUQsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUksQ0FBQzt3QkFDdEMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNsQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDbEIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7NEJBQzVCLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDckIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUN4QixLQUFLLENBQUM7NEJBQ1IsQ0FBQzt3QkFDSCxDQUFDO29CQUNILENBQUM7b0JBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsUUFBUTtZQUNmLElBQUksS0FBcUIsQ0FBQztZQUMxQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSx5QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQseUVBQXlFO2dCQUN6RSxLQUFLLEdBQUcsS0FBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDaEUsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDaEIsa0NBQWtDO2dCQUNsQyxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFFLFVBQUMsS0FBb0I7WUFDdEIsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsS0FBYTtRQUExRCxpQkFpREM7UUFqRDRDLHFCQUFhLEdBQWIsYUFBYTtRQUN4RCxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQWEsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUM7UUFDOUMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxRSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO1lBQ2hELEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDVixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsc0NBQXNDLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFhLFNBQVMsQ0FBQyxDQUFDO1lBQ3JELENBQUM7WUFFRCxxQ0FBcUM7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLGdDQUFnQyxDQUFDLENBQUM7WUFDNUQsSUFBSSxPQUFPLEdBQWUsSUFBVSxLQUFJLENBQUMsUUFBUyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pFLE9BQU8sR0FBRyxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQUc7Z0JBQ3hFLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBa0M7b0JBQ3RELEdBQUcsRUFBRSxHQUFHO29CQUNSLEtBQUssRUFBRSxFQUFFO29CQUVULE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTzt3QkFDaEMsTUFBTSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDO29CQUNqQyxDQUFDO2lCQUNGLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDUCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM5QixNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQUMsTUFBTTs0QkFDOUIsSUFBSSxHQUFHLEdBQW9CLE1BQU0sQ0FBQyxVQUFVLENBQUM7NEJBQzdDLE1BQU0sQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNOLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ04sb0NBQW9DO3dCQUNwQyxNQUFNLENBQUMsS0FBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztvQkFDL0MsQ0FBQztnQkFDSCxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsQ0FBQyxDQUFDLENBQUM7WUFDSCxRQUFRLENBQUMsc0JBQXNCLEdBQUcsT0FBTyxDQUFDO1lBQzFDLFFBQVEsQ0FBQyx3QkFBd0IsR0FBRyxHQUFHLENBQUM7WUFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUNqQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxtQ0FBZSxHQUF2QixVQUF3QixRQUFzQjtRQUE5QyxpQkE2Q0M7UUE1Q0MsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3JCLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQztRQUNqRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ1osRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDN0UsMERBQTBEO2dCQUMxRCxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLDJCQUEyQixDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxPQUFPLENBQUM7WUFDakIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLElBQUksR0FBRyxJQUFJLGFBQUssRUFBRSxDQUFDO1FBQ3ZCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckQsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekMsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBRztZQUNoRCxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQTZCLENBQUM7Z0JBQy9DLEdBQUcsRUFBRSxHQUFHO2dCQUNSLE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTztvQkFDaEMsTUFBTSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNqQyxDQUFDO2FBQ0EsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsdUNBQXVDO2dCQUN2QyxNQUFNLENBQUMsS0FBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO29CQUN6RCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsTUFBTSxDQUFDLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztvQkFDckUsQ0FBQztvQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNkLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDbkQsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDO29CQUM3QyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ2pELEVBQUUsQ0FBQyxDQUFDLEtBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO3dCQUN6QixRQUFRLENBQUMsTUFBTSxHQUFHLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO29CQUN0RCxDQUFDO2dCQUNILENBQUM7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQztZQUNkLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDSCxRQUFRLENBQUMseUJBQXlCLEdBQUcsT0FBTyxDQUFDO1FBQzdDLFFBQVEsQ0FBQywyQkFBMkIsR0FBRyxHQUFHLENBQUM7UUFDM0MsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUNqQixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O09Bb0JHO0lBQ08sK0NBQTJCLEdBQXJDLFVBQXNDLEtBQVksRUFBRSxPQUE2QixFQUFFLE9BTWxGO1FBTkQsaUJBeUVDO1FBbEVDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNYLHFDQUFxQztZQUNyQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2dCQUMxQiw0Q0FBNEM7Z0JBQzVDLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUNiLGtGQUFrRjtvQkFDbEYsa0ZBQWtGO29CQUNsRiwyQ0FBMkM7b0JBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDM0MsQ0FBQztZQUNILENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBRUQsbURBQW1EO1FBQ25ELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDeEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUVELHdDQUF3QztRQUN4QyxJQUFJLFNBQVMsR0FBRyxPQUFPLENBQUMsU0FBUyxJQUFJLGFBQUssQ0FBQztRQUMzQyxJQUFJLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQzdDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtTQUN2QixDQUFDLENBQUM7UUFDSCxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkUsSUFBSSxZQUFZLEdBQUc7WUFDakIseURBQXlEO1lBQ3pELElBQUksT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDckMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsd0ZBQXdGLEdBQUcsT0FBTyxHQUFHLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxSSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNwQixLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDSCxDQUFDLENBQUM7UUFDRixJQUFJLFlBQVksR0FBRztZQUNqQiwwQkFBMEI7WUFDMUIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxVQUFVO1NBQzFCLENBQUM7UUFDRixJQUFJLGFBQWEsR0FBUTtZQUN2QixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsS0FBSyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkI7U0FDeEMsQ0FBQztRQUNGLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2IsYUFBYSxDQUFDLEdBQUcsR0FBRyxhQUFhLENBQUMsT0FBTyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUUsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBRTlJLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLHVDQUF1QztZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLEVBQWxDLENBQWtDLENBQUMsQ0FBQztZQUM1RCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELE1BQU0sQ0FBdUIsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO1lBQ2pFLHFIQUFxSDtZQUNySCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlELENBQUMsRUFBRSxVQUFDLFNBQXdCO1lBQzFCLG9JQUFvSTtZQUNwSSxJQUFNLFVBQVUsR0FBRyxTQUFTLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQztZQUNyRCxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO2dCQUNuQixLQUFLLEdBQUcsQ0FBQyxDQUFDLFlBQVk7Z0JBQ3RCLEtBQUssR0FBRyxDQUFDLENBQUMsZUFBZTtnQkFDekIsS0FBSyxHQUFHO29CQUNOLGtGQUFrRjtvQkFDbEYsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxnQ0FBZ0M7Z0JBQ3RFO29CQUNFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNyRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7T0FnQkc7SUFDSyxpQ0FBYSxHQUFyQjtRQUFBLGlCQXlGQztRQXhGQyxnQkFBZ0I7UUFDaEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNuQixNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBYSxTQUFTLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQsc0dBQXNHO1FBQ3RHLHFGQUFxRjtRQUNyRixJQUFJLFdBQVcsR0FBRztZQUNoQixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDMUIsTUFBTSxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUM7WUFDdkIsQ0FBQztZQUVELElBQUksT0FBTyxHQUF5QixLQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMzRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ1osSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQyxFQUFFLEdBQUcsa0JBQWtCLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUNELElBQUksUUFBUSxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDdEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxLQUFJLENBQUMsUUFBUSxDQUFDO1lBQ3ZCLENBQUM7WUFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsUUFBUSxDQUFDLE9BQU8sS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUEzQyxDQUEyQyxFQUFFLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxPQUFPLEdBQUcscUNBQXFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ2pMLElBQUksR0FBRyxHQUFHLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUV6RCxJQUFJLFNBQVMsR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLGFBQUssQ0FBQztZQUM1QyxJQUFJLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFO2dCQUNsQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07YUFDeEIsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxDQUFDLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ25FLElBQUksYUFBYSxHQUFRO2dCQUN2QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLEtBQUssRUFBRSxFQUFFLENBQUMsNkJBQTZCO2FBQ3hDLENBQUM7WUFDRixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDYixhQUFhLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFFOUksQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0MsSUFBSSxjQUFjLEdBQUc7Z0JBQ25CLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTtnQkFDdkIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO2dCQUM3QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87Z0JBQ3pCLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTthQUNoQyxDQUFDO1lBQ0YsTUFBTSxDQUFDLEtBQUksQ0FBQyxjQUFjLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzNILFlBQVk7Z0JBQ1osTUFBTSxDQUFDLEtBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3pFLENBQUMsRUFBRSxVQUFDLEtBQW9CO2dCQUN0QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDckIsZ0JBQWdCO29CQUNoQixNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUksQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsTUFBTTt3QkFDdEYsaURBQWlEO3dCQUNqRCxLQUFJLENBQUMsa0JBQWtCLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQzt3QkFDMUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN4RCxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLHFDQUFxQztvQkFDckMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ3pCLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ04sNkRBQTZEO2dCQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUM7UUFFRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDN0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ1AsK0JBQStCO1lBQy9CLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQWtDO2dCQUN6RCxTQUFTLEVBQUU7b0JBQ1QsV0FBVztvQkFDWCxPQUFPO29CQUNQLEtBQUs7aUJBQ047YUFDRixDQUFDLENBQUMsQ0FBQztRQUNOLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0Msa0JBQWtCO1lBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1FBQzlCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDakMsbUJBQW1CO1lBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO1FBQzlCLENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzlCLENBQUM7SUFFTyxnQ0FBWSxHQUFwQixVQUFxQixRQUFzQixFQUFFLElBQWdDO1FBQTdFLGlCQXFCQztRQXBCQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQW9CO1lBQ3BDLElBQUksT0FBa0MsQ0FBQztZQUN2QyxJQUFJLEVBQUUsR0FBRyxLQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDdEMsSUFBSSxPQUFPLEdBQXlCLEVBQUUsSUFBMEIsS0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdEYsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztnQkFDWix3REFBd0Q7Z0JBQ3hELE9BQU8sR0FBOEI7b0JBQ25DLEtBQUssRUFBRSxJQUFJO2lCQUNaLENBQUM7WUFDSixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sK0RBQStEO2dCQUMvRCxPQUFPLEdBQUcsSUFBSSxLQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7b0JBQ3JDLFVBQVUsRUFBRSxLQUFJLENBQUMsUUFBUTtvQkFDekIsS0FBSyxFQUFFLEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztpQkFDM0IsQ0FBQyxDQUFDO2dCQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzQyxDQUFDO1lBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1RCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxpQ0FBYSxHQUFyQixVQUFzQixRQUFzQixFQUFFLEdBQW9CLEVBQUUsUUFBeUM7UUFBN0csaUJBdUJDO1FBdEJDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQUMsT0FBNkI7WUFDakQsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNiLElBQUksRUFBRSxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ1Isd0JBQXdCO29CQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDOUIsQ0FBQztnQkFFRCxPQUFPLEdBQXlCLEtBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ2IsT0FBTyxHQUFHLElBQUksS0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7d0JBQ2hDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRztxQkFDYixFQUFFO3dCQUNELFVBQVUsRUFBRSxLQUFJLENBQUMsUUFBUTt3QkFDekIsS0FBSyxFQUFFLEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSztxQkFDM0IsQ0FBQyxDQUFDO2dCQUNMLENBQUM7WUFDSCxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0seUJBQUssR0FBWixVQUFhLFVBQXNCO1FBQ2pDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDZixJQUFJLFFBQVEsR0FBaUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNiLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO29CQUNsQixJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUMxQixDQUFDO2dCQUNELFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0kseUJBQUssR0FBWjtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN2QixDQUFDO1FBRUQsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xDLENBQUM7SUFDSCxDQUFDO0lBQ0gsZ0JBQUM7QUFBRCxDQUFDLEFBcHJDRCxDQUErQixhQUFLLEdBb3JDbkM7QUFwckNZLGlCQUFTLFlBb3JDckIsQ0FBQTtBQUVELFNBQVM7QUFDVCxJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUU7SUFDNUMsS0FBSyxFQUFFLDZCQUE2QjtJQUVwQyxVQUFVLEVBQUUseUJBQVc7SUFDdkIsYUFBYSxFQUFFLElBQUk7SUFDbkIsZUFBZSxFQUFFLElBQUk7SUFDckIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixVQUFVLEVBQUUsRUFBRTtDQUNmLENBQUMsQ0FBQztBQUNILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTNELENBQTJELENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xuaW1wb3J0ICogYXMgb2JqZWN0aWQgZnJvbSAnLi4vY29yZS9vYmplY3RpZCc7XG5pbXBvcnQgKiBhcyBzZWN1cml0eSBmcm9tICcuLi9zZWN1cml0eSc7XG5pbXBvcnQgKiBhcyB3ZWIgZnJvbSAnLi4vd2ViJztcblxuaW1wb3J0IHtsb2NhbFN0b3JhZ2V9IGZyb20gJy4uL3dlYi9vZmZsaW5lJztcbmltcG9ydCB7R2V0UXVlcnl9IGZyb20gJy4uL3F1ZXJ5L0dldFF1ZXJ5JztcbmltcG9ydCB7U3RvcmUsIFN0b3JlQ3Rvcn0gZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQge1dlYlNxbFN0b3JlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcbmltcG9ydCB7U3luY0NvbnRleHR9IGZyb20gJy4vU3luY0NvbnRleHQnO1xuaW1wb3J0IHtTeW5jRW5kcG9pbnR9IGZyb20gJy4vU3luY0VuZHBvaW50JztcbmltcG9ydCB7TGl2ZURhdGFNZXNzYWdlLCBMaXZlRGF0YU1lc3NhZ2VNb2RlbH0gZnJvbSAnLi9MaXZlRGF0YU1lc3NhZ2UnO1xuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuXG4vKipcbiAqIGlvIG9mIGJyb3dzZXIgdmlhIHNjcmlwdCB0YWcgb3IgdmlhIHJlcXVpcmUgc29ja2V0LmlvLWNsaWVudCwgZW50aXJlbHkgb3B0aW9uYWwuXG4gKlxuICogTm90aWNlLCB0aGlzIG1vZHVsZSBpcyBlbnRpcmVseSBvcHRpb25hbCBhcyB0aGUgc3RvcmUgbWF5IG9wZXJhdGUgd2l0aG91dCBpdCBpZiBzb2NrZXRcbiAqIG5vdGlmaWNhdGlvbnMgYXJlIG5vdCB1c2VkLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcHVibGljIEFQSSwgZXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcbiAqL1xuZXhwb3J0IGNvbnN0IGlvOiBTb2NrZXRJT0NsaWVudFN0YXRpYyA9IGdsb2JhbFsnaW8nXSB8fCAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb25cbiAgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicgJiYgICAgICAgICAgICAgICAgICAgICAgLy8gb3Igd2hlbiByZXF1aXJlIGlzIGF2YWlsYWJsZVxuICAoKGZ1bmN0aW9uIHJlcXVpcmVTb2NrZXRJbygpIHsgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXF1aXJlZCB2ZXJzaW9uXG4gICAgLy8gaGVyZSB3ZSBhcmUgaW4gYW4gaW1tZWRpYXRlbHkgaW52b2tlZCBmdW5jdGlvbiByZXF1aXJpbmcgc29ja2V0LmlvLWNsaWVudCwgaWYgYXZhaWxhYmxlXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiAoZ2xvYmFsWydpbyddID0gcmVxdWlyZSgnc29ja2V0LmlvLWNsaWVudCcpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdvcHRpb25hbCBzb2NrZXQuaW8tY2xpZW50IG1vZHVsZSBpcyBub3QgYXZhaWxhYmxlOiAnICsgZXJyb3IgJiYgZXJyb3IubWVzc2FnZSk7XG4gICAgfVxuICB9KSgpKTtcblxuLyoqXG4gKiBjb25uZWN0cyBhIE1vZGVsL0NvbGxlY3Rpb24gdG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogVGhpcyB3aWxsIGdpdmUgeW91IGFuIG9ubGluZSBhbmQgb2ZmbGluZSBzdG9yZSB3aXRoIGxpdmUgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogLy8gVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB3aWxsIHNhdmUgdGhlIGNvbXBsZXRlIG1vZGVsIGRhdGEgYXMgYSBqc29uLFxuICogLy8gYW5kIHRoZSBvZmZsaW5lIGNoYW5nZSBsb2cgdG8gYSBsb2NhbCBXZWJTcWwgZGF0YWJhc2UsIHN5bmNocm9uaXplIGl0XG4gKiAvLyB0cm91Z2ggUkVTVCBjYWxscyB3aXRoIHRoZSBzZXJ2ZXIgYW5kIHJlY2VpdmUgbGl2ZSB1cGRhdGVzIHZpYSBhIHNvY2tldC5pbyBjb25uZWN0aW9uLlxuICogY2xhc3MgTXlDb2xsZWN0aW9uIGV4dGVuZHMgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiB7fTtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSAnaHR0cDovL215U2VydmVyLmlvL215T3JnYS9teUFwcGxpY2F0aW9uL215Q29sbGVjdGlvbic7XG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLnN0b3JlID0gbmV3IFJlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZSh7XG4gKiAgIHVzZUxvY2FsU3RvcmU6IHRydWUsICAgICAvLyAoZGVmYXVsdCkgc3RvcmUgdGhlIGRhdGEgZm9yIG9mZmxpbmUgdXNlXG4gKiAgIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSwgICAvLyAoZGVmYXVsdCkgcmVnaXN0ZXIgYXQgdGhlIHNlcnZlciBmb3IgbGl2ZSB1cGRhdGVzXG4gKiAgIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlICAvLyAoZGVmYXVsdCkgYWxsb3cgY2hhbmdlcyB0byB0aGUgb2ZmbGluZSBkYXRhXG4gKiB9KTtcbiAqL1xuZXhwb3J0IGNsYXNzIFN5bmNTdG9yZSBleHRlbmRzIFN0b3JlIHtcblxuICAvLyBmb2xsb3dpbmcgYXJlIHN0b3JlLXNwZWNpZmljIG9wdGlvbnMsIGRlZmF1bHRzIHN0b3JlZCBpbiBwcm90b3R5cGUgYXQgZW5kIG9mIHRoaXMgZmlsZVxuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZTogU3RvcmVDdG9yO1xuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZU9wdGlvbnM6IGFueTtcbiAgcHJvdGVjdGVkIHVzZUxvY2FsU3RvcmU6IGJvb2xlYW47XG4gIHByb3RlY3RlZCB1c2VTb2NrZXROb3RpZnk6IGJvb2xlYW47XG4gIHByb3RlY3RlZCB1c2VPZmZsaW5lQ2hhbmdlczogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHNvY2tldFBhdGg6IHN0cmluZztcbiAgcHJvdGVjdGVkIHNvY2tldFF1ZXJ5OiBzdHJpbmc7XG4gIHByb3RlY3RlZCBjcmVkZW50aWFsczogYW55O1xuICBwcm90ZWN0ZWQgb3JkZXJPZmZsaW5lQ2hhbmdlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIHNlcnZlciBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdG9yZS5cbiAgICpcbiAgICogVGhlIHN5bmMgbWV0aG9kIHdpbGwgZmFpbCBlYXJseSB3aGVuIGJlaW5nIGFwcGxpZWQgdG8gZGF0YSBvZiBzb21lIG90aGVyIHNlcnZlci5cbiAgICovXG4gIHByb3RlY3RlZCBzZXJ2ZXJVcmw6IHN0cmluZztcbiAgLyoqXG4gICAqIGFwcGxpY2F0aW9uIHBhcnQgdXNlZCB0byByZXNvbHZlIFVSTHMgbWF5IG9wdGlvbmFsbHkgYmUgc2V0IHVzaW5nIGNvbnN0cnVjdG9yIG9wdGlvbnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgYXBwbGljYXRpb246IHN0cmluZztcbiAgLyoqXG4gICAqIGlkZW50aXR5IG9yIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RvcmUuXG4gICAqXG4gICAqIFRoZSBhamF4IG1ldGhvZCB3aWxsIHNpbXVsYXRlIGFuIG9mZmxpbmUgdGltZW91dCB3aGVuIHRoZSB1c2VyIGlkZW50aXR5IGlzIGNoYW5nZWQuIFRoaXMgaXNcbiAgICogYmVjYXVzZSBqdXN0IG9uZSBzZXNzaW9uIGNhbiBiZSBtYWludGFpbmVkIHBlciBzZXJ2ZXIgYW5kIGxvZ2luL2xvZ291dCBzZW1hbnRpY3MgbXVzdCBiZSB3ZWxsXG4gICAqIGJlaGF2ZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgdXNlclV1aWQ6IHN0cmluZztcblxuICBwdWJsaWMgZW5kcG9pbnRzOiB7XG4gICAgLy8gbWFwIG9mIGVudGl0eSB0byBTeW5jRW5kcG9pbnRcbiAgICBbZW50aXR5OiBzdHJpbmddOiBTeW5jRW5kcG9pbnQ7XG4gIH0gPSB7fTtcblxuICBwcml2YXRlIGxhc3RNZXNnVGltZTogYW55O1xuXG4gIC8qKlxuICAgKiB3aGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIGVudGl0eSBjYXVzZWQgYSBkaXNjb25uZWN0aW9uLlxuICAgKlxuICAgKiA8cD5cbiAgICogVGhpcyBpcyBzZXQgdG8gYW4gZW50aXR5IG5hbWUgdG8gbGltaXQgd2hpY2ggZW50aXR5IG1heSBjYXVzZSBhIGNoYW5nZSB0byBvbmxpbmUgc3RhdGUgYWdhaW4uXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHR5cGUge3N0cmluZ31cbiAgICovXG4gIHByaXZhdGUgZGlzY29ubmVjdGVkRW50aXR5OiBzdHJpbmcgPSAnYWxsJztcblxuICBwdWJsaWMgbWVzc2FnZXM6IENvbGxlY3Rpb247XG4gIHB1YmxpYyBtZXNzYWdlc1Byb21pc2U6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPjtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG4gICAgaWYgKHRoaXMuY3JlZGVudGlhbHMpIHtcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBfLmNsb25lKHRoaXMuY3JlZGVudGlhbHMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucykge1xuICAgICAgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyA9IF8uY2xvbmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyk7XG4gICAgfVxuICAgIGlmICh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpIHtcbiAgICAgIHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyA9IF8uY2xvbmUodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkgJiYgdHlwZW9mIGlvICE9PSAnb2JqZWN0Jykge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKCdTb2NrZXQuSU8gbm90IHByZXNlbnQgISEnKTtcbiAgICAgIHRoaXMudXNlU29ja2V0Tm90aWZ5ID0gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIG92ZXJ3cml0dGVuIHRvIHJlc29sdmUgcmVsYXRpdmUgVVJMcyBhZ2FpbnN0IHRoZSBTeW5jU3RvcmUjc2VydmVyVXJsLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gd2ViLnJlc29sdmVVcmwodXJsLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsLFxuICAgICAgYXBwbGljYXRpb246IHRoaXMuYXBwbGljYXRpb25cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBiaW5kcyB0aGUgc3RvcmUgdG8gYSB0YXJnZXQgc2VydmVyIHdoZW4gdGhlIGZpcnN0IGVuZHBvaW50IGlzIGNyZWF0ZWQuXG4gICAqXG4gICAqIEBwYXJhbSB1cmxSb290IHVzZWQgdG8gcmVzb2x2ZSB0aGUgc2VydmVyIHRvIG9wZXJhdGUuXG4gICAgICovXG4gIHByaXZhdGUgaW5pdFNlcnZlcih1cmxSb290OiBzdHJpbmcpIHtcbiAgICBsZXQgc2VydmVyVXJsID0gd2ViLnJlc29sdmVTZXJ2ZXIodXJsUm9vdCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxuICAgIH0pO1xuICAgIGlmICghdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgIGNvbnN0IHNlcnZlciA9IHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xuICAgICAgdGhpcy5zZXJ2ZXJVcmwgPSBzZXJ2ZXJVcmw7XG4gICAgICB0aGlzLnVzZXJVdWlkID0gc2VydmVyLmF1dGhvcml6YXRpb24ubmFtZTtcbiAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zICYmICF0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzKSB7XG4gICAgICAgIC8vIGNhcHR1cmUgY3JlZGVudGlhbHMgZm9yIHVzZSBieSBjcnlwdG8gc3RvcmVzXG4gICAgICAgIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMuY3JlZGVudGlhbHMgPSBfLmRlZmF1bHRzKHtcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxuICAgICAgICB9LCBzZXJ2ZXIuY3JlZGVudGlhbHMpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc2VydmVyVXJsICE9PSB0aGlzLnNlcnZlclVybCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdG9yZSBpcyBib3VuZCB0byBzZXJ2ZXIgJyArIHRoaXMuc2VydmVyVXJsICsgJyBhbHJlYWR5Jyk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja1NlcnZlcih1cmw6IHN0cmluZywgb3B0aW9ucz86IGFueSk6IFEuUHJvbWlzZTxzdHJpbmc+IHtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KSA9PT0gdGhpcy5zZXJ2ZXJVcmwpO1xuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCd1c2VyIGlkZW50aXR5IHdhcyBjaGFuZ2VkLCB3b3JraW5nIG9mZmxpbmUgdW50aWwgYXV0aG9yaXphdGlvbiBpcyByZXN0b3JlZCcpO1xuICAgICAgY29uc3QgZXJyb3I6IHdlYi5IdHRwRXJyb3IgPSBuZXcgRXJyb3IoKTtcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XG4gICAgICByZXR1cm4gb3B0aW9ucyAmJiB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBRLnJlamVjdDxzdHJpbmc+KGVycm9yKTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVzb2x2ZSh1cmwpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGluaXRFbmRwb2ludChtb2RlbE9yQ29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uLCBtb2RlbFR5cGU6IE1vZGVsQ3Rvcik6IFN5bmNFbmRwb2ludCB7XG4gICAgbGV0IHVybFJvb3QgPSBtb2RlbE9yQ29sbGVjdGlvbi5nZXRVcmxSb290KCk7XG4gICAgbGV0IGVudGl0eSA9IG1vZGVsT3JDb2xsZWN0aW9uLmVudGl0eTtcbiAgICBpZiAodXJsUm9vdCAmJiBlbnRpdHkpIHtcbiAgICAgIC8vIGdldCBvciBjcmVhdGUgZW5kcG9pbnQgZm9yIHRoaXMgdXJsXG4gICAgICB0aGlzLmluaXRTZXJ2ZXIodXJsUm9vdCk7XG4gICAgICB1cmxSb290ID0gdGhpcy5yZXNvbHZlVXJsKHVybFJvb3QpO1xuICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuaW5pdEVuZHBvaW50OiAnICsgZW50aXR5KTtcbiAgICAgICAgZW5kcG9pbnQgPSBuZXcgU3luY0VuZHBvaW50KHtcbiAgICAgICAgICBlbnRpdHk6IGVudGl0eSxcbiAgICAgICAgICBtb2RlbFR5cGU6IG1vZGVsVHlwZSxcbiAgICAgICAgICB1cmxSb290OiB1cmxSb290LFxuICAgICAgICAgIHNvY2tldFBhdGg6IHRoaXMuc29ja2V0UGF0aCxcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbmRwb2ludHNbZW50aXR5XSA9IGVuZHBvaW50O1xuXG4gICAgICAgIGVuZHBvaW50LmxvY2FsU3RvcmUgPSB0aGlzLmNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQpO1xuICAgICAgICBlbmRwb2ludC5wcmlvcml0eSA9IHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyAmJiAoXy5sYXN0SW5kZXhPZih0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMsIGVuZHBvaW50LmVudGl0eSkgKyAxKTtcbiAgICAgICAgdGhpcy5jcmVhdGVNc2dDb2xsZWN0aW9uKCk7XG4gICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBlbnRpdHkpO1xuICAgICAgICBlbmRwb2ludC5pbmZvID0gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uZmlndXJhdGlvbiBjYW4gbm90IGNoYW5nZSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkLi4uXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVybFJvb3QgPT09IHVybFJvb3QsICdjYW4gbm90IGNoYW5nZSB1cmxSb290LCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQhJyk7XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVzZXJVdWlkID09PSB0aGlzLnVzZXJVdWlkLCAnY2FuIG5vdCBjaGFuZ2UgdXNlciBpZGVudGl0eSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IE1vZGVsIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgaW5pdE1vZGVsKG1vZGVsOiBNb2RlbCk6IHZvaWQge1xuICAgIG1vZGVsLmVuZHBvaW50ID0gdGhpcy5pbml0RW5kcG9pbnQobW9kZWwsIDxNb2RlbEN0b3I+bW9kZWwuY29uc3RydWN0b3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqXG4gICAqIEBpbnRlcm5hbCBBUEkgb25seSB0byBiZSBjYWxsZWQgYnkgQ29sbGVjdGlvbiBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIGluaXRDb2xsZWN0aW9uKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pOiB2b2lkIHtcbiAgICBjb2xsZWN0aW9uLmVuZHBvaW50ID0gdGhpcy5pbml0RW5kcG9pbnQoY29sbGVjdGlvbiwgY29sbGVjdGlvbi5tb2RlbCk7XG4gIH1cblxuICBnZXRFbmRwb2ludChtb2RlbE9yQ29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uKTogU3luY0VuZHBvaW50IHtcbiAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1ttb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHldO1xuICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4ge1xuICAgICAgICAvLyBjaGVja3MgdGhhdCBtb2RlbE9yQ29sbGVjdGlvbiB1c2VzIGEgbW9kZWwgaW5oZXJpdGluZyBmcm9tIHRoZSBvbmUgb2YgdGhlIGVuZHBvaW50XG4gICAgICAgIGxldCBtb2RlbFR5cGUgPSBpc0NvbGxlY3Rpb24obW9kZWxPckNvbGxlY3Rpb24pID8gbW9kZWxPckNvbGxlY3Rpb24ubW9kZWwgOiBtb2RlbE9yQ29sbGVjdGlvbi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgcmV0dXJuIG1vZGVsVHlwZSA9PT0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IG1vZGVsVHlwZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBlbmRwb2ludC5tb2RlbFR5cGU7XG4gICAgICB9LCAnd3JvbmcgdHlwZSBvZiBtb2RlbCEnKTtcbiAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVMb2NhbFN0b3JlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBTdG9yZSB7XG4gICAgaWYgKHRoaXMudXNlTG9jYWxTdG9yZSkge1xuICAgICAgdmFyIGVudGl0aWVzID0ge307XG4gICAgICBlbnRpdGllc1tlbmRwb2ludC5lbnRpdHldID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHZhciBzdG9yZU9wdGlvbiA9IHtcbiAgICAgICAgZW50aXRpZXM6IGVudGl0aWVzXG4gICAgICB9O1xuICAgICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHN0b3JlT3B0aW9uID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcbiAgICAgICAgc3RvcmVPcHRpb24uZW50aXRpZXMgPSBlbnRpdGllcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgdGhpcy5sb2NhbFN0b3JlKHN0b3JlT3B0aW9uKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEhlcmUgd2Ugc2F2ZSB0aGUgY2hhbmdlcyBpbiBhIE1lc3NhZ2UgbG9jYWwgd2Vic3FsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgY3JlYXRlTXNnQ29sbGVjdGlvbigpOiBDb2xsZWN0aW9uIHtcbiAgICBpZiAodGhpcy51c2VPZmZsaW5lQ2hhbmdlcyAmJiAhdGhpcy5tZXNzYWdlcykge1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBDb2xsZWN0aW9uKHVuZGVmaW5lZCwge1xuICAgICAgICBtb2RlbDogTGl2ZURhdGFNZXNzYWdlTW9kZWwsXG4gICAgICAgIHN0b3JlOiBuZXcgdGhpcy5sb2NhbFN0b3JlKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gIH1cblxuICBjcmVhdGVTb2NrZXQoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIGVuZHBvaW50ICYmIGVuZHBvaW50LnNvY2tldFBhdGgpIHtcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5jcmVhdGVTb2NrZXQ6ICcgKyBuYW1lKTtcblxuICAgICAgLy8gcmVzb3VyY2VcbiAgICAgIGxldCBjb25uZWN0Vm86IGFueSA9IHtcbiAgICAgICAgJ2ZvcmNlIG5ldyBjb25uZWN0aW9uJzogdHJ1ZVxuICAgICAgfTtcbiAgICAgIGxldCByZXNvdXJjZSA9IGVuZHBvaW50LnNvY2tldFBhdGg7IC8vIHJlbW92ZSBsZWFkaW5nIC9cbiAgICAgIGNvbm5lY3RWby5yZXNvdXJjZSA9IChyZXNvdXJjZSAmJiByZXNvdXJjZS5pbmRleE9mKCcvJykgPT09IDApID8gcmVzb3VyY2Uuc3Vic3RyKDEpIDogcmVzb3VyY2U7XG4gICAgICBpZiAodGhpcy5zb2NrZXRRdWVyeSkge1xuICAgICAgICBjb25uZWN0Vm8ucXVlcnkgPSB0aGlzLnNvY2tldFF1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBzb2NrZXRcbiAgICAgIGVuZHBvaW50LnNvY2tldCA9IGlvLmNvbm5lY3QoZW5kcG9pbnQuaG9zdCwgY29ubmVjdFZvKTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgKHRoaXMuX2JpbmRDaGFubmVsKGVuZHBvaW50LCBuYW1lKSB8fCBRLnJlc29sdmUoZW5kcG9pbnQpKS50aGVuKChlcCkgPT4ge1xuICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVwID09PSBlbmRwb2ludCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVwKTtcbiAgICAgICAgfSkuZG9uZSgpO1xuICAgICAgfSk7XG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnc29ja2V0LmlvOiBkaXNjb25uZWN0Jyk7XG4gICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCkuZG9uZSgpO1xuICAgICAgfSk7XG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oZW5kcG9pbnQuY2hhbm5lbCwgKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgbXNnKSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBlbmRwb2ludC5zb2NrZXQ7XG4gICAgfVxuICB9XG5cbiAgX2JpbmRDaGFubmVsKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBpZiAoZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0KSB7XG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuX2JpbmRDaGFubmVsOiAnICsgbmFtZSk7XG5cbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHZhciBzb2NrZXQgPSBlbmRwb2ludC5zb2NrZXQ7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbmRwb2ludC5lbnRpdHk7XG4gICAgICByZXR1cm4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgICBzb2NrZXQuZW1pdCgnYmluZCcsIHtcbiAgICAgICAgICBlbnRpdHk6IG5hbWUsXG4gICAgICAgICAgY2hhbm5lbDogY2hhbm5lbCxcbiAgICAgICAgICB0aW1lOiB0aW1lXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gUS5yZXNvbHZlKGVuZHBvaW50KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGdldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcpOiBRLlByb21pc2U8YW55PiB7XG4gICAgaWYgKCF0aGlzLmxhc3RNZXNnVGltZSkge1xuICAgICAgdGhpcy5sYXN0TWVzZ1RpbWUgPSB7fTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmUodGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0pO1xuICAgIH1cbiAgICAvLyB0aGUgfCAwIGJlbG93IHR1cm5zIHN0cmluZ3MgaW50byBudW1iZXJzXG4gICAgdmFyIHRpbWUgPSBsb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCdfXycgKyBjaGFubmVsICsgJ2xhc3RNZXNnVGltZScpIHx8IDA7XG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgIHJldHVybiBRLnJlc29sdmUodGltZSk7XG4gIH1cblxuICBzZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiBRLlByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIFEucmVzb2x2ZSghdGltZSB8fCB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKS50aGVuKChsYXN0TWVzZ1RpbWUpID0+IHtcbiAgICAgIHJldHVybiB0aW1lID4gbGFzdE1lc2dUaW1lO1xuICAgIH0pKS50aGVuKCh1cGRhdGUpID0+IHtcbiAgICAgIGlmICh1cGRhdGUpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlKCkuc2V0SXRlbSgnX18nICsgY2hhbm5lbCArICdsYXN0TWVzZ1RpbWUnLCB0aW1lKTtcbiAgICAgICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdO1xuICAgIH0pO1xuICB9XG5cbiAgb25Db25uZWN0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8dm9pZD4ge1xuICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgIC8vIHdoZW4gb2ZmbGluZSB0cmFuc21pc3Npb24gaXMgcGVuZGluZywgbmVlZCB0byB3YWl0IGZvciBpdCB0byBjb21wbGV0ZVxuICAgICAgbGV0IHEgPSBRLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgIGlmICh0aGlzLm1lc3NhZ2VzUHJvbWlzZSAmJiB0aGlzLm1lc3NhZ2VzUHJvbWlzZS5pc1BlbmRpbmcoKSkge1xuICAgICAgICBxID0gdGhpcy5tZXNzYWdlc1Byb21pc2UuY2F0Y2goKGVycm9yKSA9PiBRLnJlc29sdmUodW5kZWZpbmVkKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHN5bmMgc2VydmVyL2NsaWVudCBjaGFuZ2VzXG4gICAgICBlbmRwb2ludC5pc0Nvbm5lY3RlZCA9IHEudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIG5leHQgd2UnbGwgZmV0Y2ggc2VydmVyLXNpZGUgY2hhbmdlc1xuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIC8vIHRoZW4gc2VuZCBjbGllbnQtc2lkZSBjaGFuZ2VzXG4gICAgICAgICAgaWYgKHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID09PSAnYWxsJyB8fCB0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9PT0gZW5kcG9pbnQuZW50aXR5KSB7XG4gICAgICAgICAgICAvLyByZXN0YXJ0IHJlcGxheWluZyBvZiBvZmZsaW5lIG1lc3NhZ2VzXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VzUHJvbWlzZSA9IG51bGw7XG4gICAgICAgICAgICB0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9IG51bGw7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiB0aGlzLl9zZW5kTWVzc2FnZXMoKTtcbiAgICAgICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICAgICAgLy8gY2F0Y2ggd2l0aG91dCBlcnJvciBpbmRpY2F0ZXMgZGlzY29ubmVjdGlvbiB3aGlsZSBnb2luZyBvbmxpbmVcbiAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAvLyBkaXNjb25uZWN0ZWQgd2hpbGUgc2VuZGluZyBvZmZsaW5lIGNoYW5nZXNcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XG4gICAgICAgIH0pO1xuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIC8vIGluIHRoZSBlbmQsIHdoZW4gY29ubmVjdGVkIHN0aWxsLCBmaXJlIGFuIGV2ZW50IGluZm9ybWluZyBjbGllbnQgY29kZVxuICAgICAgICBpZiAoZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Nvbm5lY3Q6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIGVuZHBvaW50LmlzQ29ubmVjdGVkO1xuICB9XG5cbiAgb25EaXNjb25uZWN0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8dm9pZD4ge1xuICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgZW5kcG9pbnQuaXNDb25uZWN0ZWQgPSBudWxsO1xuICAgIGlmICghdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkpIHtcbiAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gJ2FsbCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIFEuZmNhbGwoKCkgPT4ge1xuICAgICAgaWYgKGVuZHBvaW50LnNvY2tldCAmJiAoPGFueT5lbmRwb2ludC5zb2NrZXQpLnNvY2tldCkge1xuICAgICAgICAvLyBjb25zaWRlciBjYWxsaW5nIGVuZHBvaW50LnNvY2tldC5kaXNjb25uZWN0KCkgaW5zdGVhZFxuICAgICAgICAoPGFueT5lbmRwb2ludC5zb2NrZXQpLnNvY2tldC5vbkRpc2Nvbm5lY3QoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignZGlzY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBfZml4TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSk6IExpdmVEYXRhTWVzc2FnZSB7XG4gICAgbGV0IGlkQXR0cmlidXRlID0gZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZTtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhIWlkQXR0cmlidXRlLCAnbm8gaWRBdHRyaWJ1dGUhJyk7XG5cbiAgICBpZiAobXNnLmRhdGEgJiYgIW1zZy5kYXRhW2lkQXR0cmlidXRlXSAmJiBtc2cuZGF0YS5faWQpIHtcbiAgICAgIG1zZy5kYXRhW2lkQXR0cmlidXRlXSA9IG1zZy5kYXRhLl9pZDsgLy8gc2VydmVyIGJ1ZyFcbiAgICB9IGVsc2UgaWYgKCFtc2cuZGF0YSAmJiBtc2cubWV0aG9kID09PSAnZGVsZXRlJyAmJiBtc2dbaWRBdHRyaWJ1dGVdKSB7XG4gICAgICBtc2cuZGF0YSA9IHt9O1xuICAgICAgbXNnLmRhdGFbaWRBdHRyaWJ1dGVdID0gbXNnW2lkQXR0cmlidXRlXTsgLy8gc2VydmVyIGJ1ZyFcbiAgICB9XG4gICAgcmV0dXJuIG1zZztcbiAgfVxuXG4gIG9uTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSk6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+IHtcbiAgICAvLyB0aGlzIGlzIGNhbGxlZCBieSB0aGUgc3RvcmUgaXRzZWxmIGZvciBhIHBhcnRpY3VsYXIgZW5kcG9pbnQhXG4gICAgaWYgKCFtc2cgfHwgIW1zZy5tZXRob2QpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdDxMaXZlRGF0YU1lc3NhZ2U+KG5ldyBFcnJvcignbm8gbWVzc2FnZSBvciBtZXRob2QgZ2l2ZW4nKSk7XG4gICAgfVxuXG4gICAgdmFyIHE6IFEuUHJvbWlzZTxhbnk+O1xuICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICBpZiAoZW5kcG9pbnQubG9jYWxTdG9yZSkge1xuICAgICAgLy8gZmlyc3QgdXBkYXRlIHRoZSBsb2NhbCBzdG9yZSBieSBmb3JtaW5nIGEgbW9kZWwgYW5kIGludm9raW5nIHN5bmNcbiAgICAgIHZhciBvcHRpb25zID0gXy5kZWZhdWx0cyh7XG4gICAgICAgIHN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXG4gICAgICB9LCB0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcbiAgICAgIHZhciBtb2RlbCA9IG5ldyBlbmRwb2ludC5tb2RlbFR5cGUobXNnLmRhdGEsIF8uZXh0ZW5kKHtcbiAgICAgICAgcGFyc2U6IHRydWVcbiAgICAgIH0sIG9wdGlvbnMpKTtcbiAgICAgIGlmICghbW9kZWwuaWQpIHtcbiAgICAgICAgLy8gY29kZSBiZWxvdyB3aWxsIHBlcnNpc3Qgd2l0aCBhdXRvLWFzc2lnbmVkIGlkIGJ1dCB0aGlzIG5ldmVydGhlbGVzcyBpcyBhIGJyb2tlbiByZWNvcmRcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyByZWNlaXZlZCBkYXRhIHdpdGggbm8gdmFsaWQgaWQgcGVyZm9ybWluZyAnICsgbXNnLm1ldGhvZCArICchJyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkaWFnLmRlYnVnLmRlYnVnKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnICcgKyBtb2RlbC5pZCArICcgcGVyZm9ybWluZyAnICsgbXNnLm1ldGhvZCk7XG4gICAgICB9XG4gICAgICBxID0gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKG1zZy5tZXRob2QsIG1vZGVsLCBfLmV4dGVuZChvcHRpb25zLCB7XG4gICAgICAgIG1lcmdlOiBtc2cubWV0aG9kID09PSAncGF0Y2gnXG4gICAgICB9KSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGlmICghbXNnLmlkIHx8IG1zZy5pZCA9PT0gbW9kZWwuaWQpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gaWQgdmFsdWUgd2FzIHJlYXNzaWduZWQsIGRlbGV0ZSByZWNvcmQgb2Ygb2xkIGlkXG4gICAgICAgIHZhciBvbGREYXRhID0ge307XG4gICAgICAgIG9sZERhdGFbbW9kZWwuaWRBdHRyaWJ1dGVdID0gbXNnLmlkO1xuICAgICAgICB2YXIgb2xkTW9kZWwgPSBuZXcgZW5kcG9pbnQubW9kZWxUeXBlKG9sZERhdGEsIG9wdGlvbnMpO1xuICAgICAgICBkaWFnLmRlYnVnLmRlYnVnKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnICcgKyBtb2RlbC5pZCArICcgcmVhc3NpZ25lZCBmcm9tIG9sZCByZWNvcmQgJyArIG9sZE1vZGVsLmlkKTtcbiAgICAgICAgcmV0dXJuIGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYygnZGVsZXRlJywgb2xkTW9kZWwsIG9wdGlvbnMpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGp1c3QgdXBkYXRlIGFsbCBjb2xsZWN0aW9ucyBsaXN0ZW5pbmdcbiAgICAgIHEgPSBRLnJlc29sdmUobXNnKTtcbiAgICB9XG5cbiAgICAvLyBmaW5hbGx5IHNldCB0aGUgbWVzc2FnZSB0aW1lXG4gICAgcmV0dXJuIHEudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1zZy50aW1lICYmIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIG1zZy50aW1lKSkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHVwZGF0ZSBhbGwgY29sbGVjdGlvbnMgbGlzdGVuaW5nXG4gICAgICAgIHRoaXMudHJpZ2dlcignc3luYzonICsgY2hhbm5lbCwgbXNnKTsgLy8gU3luY0NvbnRleHQub25NZXNzYWdlXG4gICAgICAgIHJldHVybiBtc2c7XG4gICAgICB9KTtcbiAgICB9LCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAvLyBub3Qgc2V0dGluZyBtZXNzYWdlIHRpbWUgaW4gZXJyb3IgY2FzZVxuXG4gICAgICAvLyByZXBvcnQgZXJyb3IgYXMgZXZlbnQgb24gc3RvcmVcbiAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XG4gICAgICByZXR1cm4gbXNnO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHN5bmMobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSA9IHt9KTogUS5Qcm9taXNlPGFueT4ge1xuICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5zeW5jJyk7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBlbmRwb2ludDogU3luY0VuZHBvaW50ID0gbW9kZWwuZW5kcG9pbnQgfHwgdGhpcy5nZXRFbmRwb2ludChtb2RlbCk7XG4gICAgICBpZiAoIWVuZHBvaW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gZW5kcG9pbnQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcbiAgICAgICAgLy8gY29sbGVjdGlvbnMgY2FuIGJlIGZpbHRlcmVkLCBldGMuXG4gICAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiAhb3B0aW9ucy5iYXJlYm9uZSkge1xuICAgICAgICAgIHZhciBzeW5jQ29udGV4dDogU3luY0NvbnRleHQgPSBvcHRpb25zLnN5bmNDb250ZXh0OyAvLyBzeW5jIGNhbiBiZSBjYWxsZWQgYnkgU3luY0NvbnRleHQgaXRzZWxmIHdoZW4gcGFnaW5nIHJlc3VsdHNcbiAgICAgICAgICBpZiAoIXN5bmNDb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBjYXB0dXJlIEdldFF1ZXJ5IG9wdGlvbnNcbiAgICAgICAgICAgIHN5bmNDb250ZXh0ID0gbmV3IFN5bmNDb250ZXh0KFxuICAgICAgICAgICAgICBvcHRpb25zLCAgICAgICAgLy8gZHluYW1pYyBvcHRpb25zIHBhc3NlZCB0byBmZXRjaCgpIGltcGxlbWVudCBVSSBmaWx0ZXJzLCBldGMuXG4gICAgICAgICAgICAgIG1vZGVsLm9wdGlvbnMsICAvLyBzdGF0aWMgb3B0aW9ucyBvbiBjb2xsZWN0aW9uIGltcGxlbWVudCBzY3JlZW4tc3BlY2lmaWMgc3R1ZmZcbiAgICAgICAgICAgICAgdGhpcyAgICAgICAgICAgIC8vIHN0YXRpYyBvcHRpb25zIG9mIHRoaXMgc3RvcmUgcmVhbGl6ZSBmaWx0ZXJpbmcgY2xpZW50L3NlcnZlclxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3luY0NvbnRleHQgPSBzeW5jQ29udGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1vZGVsLnN5bmNDb250ZXh0ICE9PSBzeW5jQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gYXNzaWduIGEgZGlmZmVyZW50IGluc3RhbmNlXG4gICAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgICAgbW9kZWwuc3RvcExpc3RlbmluZyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5Ubyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCwgXy5iaW5kKHN5bmNDb250ZXh0Lm9uTWVzc2FnZSwgc3luY0NvbnRleHQsIHRoaXMsIG1vZGVsKSk7XG4gICAgICAgICAgICBtb2RlbC5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc01vZGVsKG1vZGVsKSkge1xuICAgICAgICAvLyBvZmZsaW5lIGNhcGFiaWxpdHkgcmVxdWlyZXMgSURzIGZvciBkYXRhXG4gICAgICAgIGlmICghbW9kZWwuaWQpIHtcbiAgICAgICAgICBpZiAobWV0aG9kID09PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgbW9kZWwuc2V0KG1vZGVsLmlkQXR0cmlidXRlLCBvYmplY3RpZC5tYWtlT2JqZWN0SUQoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gKHZhbGlkKSBpZDogJyArIG1vZGVsLmlkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyBpcyByZWFsbHkgYXQgb2RkcyBoZXJlLi4uXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndGFyZ2V0IG9mIHN5bmMgaXMgbmVpdGhlciBhIG1vZGVsIG5vciBhIGNvbGxlY3Rpb24hPyEnKTtcbiAgICAgIH1cblxuICAgICAgLy8gYXQgdGhpcyBwb2ludCB0aGUgdGFyZ2V0IHNlcnZlciBpcyBrbm93biwgY2hlY2sgbWFraW5nIHN1cmUgdGhlIGNvcnJlY3Qgc2VydmVyIGlzIGJlaW5nIGhpdFxuICAgICAgY29uc3Qgc2VydmVyVXJsID0gd2ViLnJlc29sdmVTZXJ2ZXIobW9kZWwuZ2V0VXJsUm9vdCgpLCB7XG4gICAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICAgIH0pO1xuICAgICAgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdG9yZSBpcyBib3VuZCB0byBzZXJ2ZXIgJyArIHRoaXMuc2VydmVyVXJsKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpLnRoZW4oKHRpbWUpID0+IHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBvbmx5IHNlbmQgcmVhZCBtZXNzYWdlcyBpZiBubyBvdGhlciBzdG9yZSBjYW4gZG8gdGhpcyBvciBmb3IgaW5pdGlhbCBsb2FkXG4gICAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ3JlYWQnICYmIGVuZHBvaW50LmxvY2FsU3RvcmUgJiYgdGltZSAmJiAhb3B0aW9ucy5yZXNldCkge1xuICAgICAgICAgICAgLy8gcmVhZCBkYXRhIGZyb20gbG9jYWxTdG9yZSBhbmQgZmV0Y2ggY2hhbmdlcyByZW1vdGVcbiAgICAgICAgICAgIHZhciBvcHRzID0gXy5jbG9uZShvcHRpb25zKTtcbiAgICAgICAgICAgIG9wdHMuc3RvcmUgPSBlbmRwb2ludC5sb2NhbFN0b3JlO1xuICAgICAgICAgICAgb3B0cy5lbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XG4gICAgICAgICAgICBkZWxldGUgb3B0cy5zdWNjZXNzO1xuICAgICAgICAgICAgZGVsZXRlIG9wdHMuZXJyb3I7XG4gICAgICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKG1ldGhvZCwgbW9kZWwsIG9wdHMpLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgICAgICAgICAgLy8gYmFja2JvbmUgc3VjY2VzcyBjYWxsYmFjayBhbHRlcnMgdGhlIGNvbGxlY3Rpb24gbm93XG4gICAgICAgICAgICAgIHJlc3AgPSB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcCkgfHwgcmVzcDtcbiAgICAgICAgICAgICAgaWYgKGVuZHBvaW50LnNvY2tldCB8fCBvcHRpb25zLmZldGNoTW9kZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gZmV0Y2ggY2hhbmdlcyBhcyB3ZSBnb3QgYSB3ZWJzb2NrZXQsIHRoYXQgaXMgZWl0aGVyIGNvbm5lY3RlZCBvciBhdHRlbXB0cyByZWNvbm5lY3Rpb25cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIHdoZW4gd2UgYXJlIGRpc2Nvbm5lY3RlZCwgdHJ5IHRvIGNvbm5lY3Qgbm93XG4gICAgICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpLnRoZW4oKGluZm8pOiBhbnkgPT4ge1xuICAgICAgICAgICAgICAgICAgLy8gdHJpZ2dlciByZWNvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcbiAgICAgICAgICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBpbmZvO1xuICAgICAgICAgICAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xuICAgICAgICAgICAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHJlc3A7XG4gICAgICAgICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7XG4gICAgICAgICAgICAgIH0gLy8gZWxzZS4uLlxuXG4gICAgICAgICAgICAgIC8vIGxvYWQgY2hhbmdlcyBvbmx5ICh3aWxsIGhhcHBlbiBBRlRFUiBzdWNjZXNzIGNhbGxiYWNrIGlzIGludm9rZWQsXG4gICAgICAgICAgICAgIC8vIGJ1dCByZXR1cm5lZCBwcm9taXNlIHdpbGwgcmVzb2x2ZSBvbmx5IGFmdGVyIGNoYW5nZXMgd2VyZSBwcm9jZXNzZWQuXG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCkuY2F0Y2goKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCkgfHwgcmVzcDtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCB4aHIsIG1vZGVsKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7IC8vIGNhbGxlciBleHBlY3RzIG9yaWdpbmFsIFhIUiByZXNwb25zZSBhcyBjaGFuZ2VzIGJvZHkgZGF0YSBpcyBOT1QgY29tcGF0aWJsZVxuICAgICAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgICAvLyBmYWxsLWJhY2sgdG8gbG9hZGluZyBmdWxsIGRhdGEgc2V0XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGRvIGJhY2tib25lIHJlc3RcbiAgICAgICAgICByZXR1cm4gdGhpcy5fYWRkTWVzc2FnZShtZXRob2QsIG1vZGVsLCBvcHRpb25zLCBlbmRwb2ludCk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfYWRkTWVzc2FnZShtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55LFxuICAgICAgICAgICAgICAgICAgICAgIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8YW55PiB7XG4gICAgdmFyIGNoYW5nZXMgPSAoPE1vZGVsPm1vZGVsKS5jaGFuZ2VkU2luY2VTeW5jO1xuICAgIHZhciBkYXRhOiBhbnkgPSBudWxsO1xuICAgIHZhciBzdG9yZU1zZyA9IHRydWU7XG4gICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICBjYXNlICdjcmVhdGUnOlxuICAgICAgICBkYXRhID0gb3B0aW9ucy5hdHRycyB8fCBtb2RlbC50b0pTT04oKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3BhdGNoJzpcbiAgICAgICAgaWYgKF8uaXNFbXB0eShjaGFuZ2VzKSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBkYXRhID0gbW9kZWwudG9KU09OKHtcbiAgICAgICAgICBhdHRyczogY2hhbmdlc1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCAoKCkgPT4gbWV0aG9kID09PSAncmVhZCcsICd1bmtub3duIG1ldGhvZDogJyArIG1ldGhvZCk7XG4gICAgICAgIHN0b3JlTXNnID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICBsZXQgZW50aXR5ID0gbW9kZWwuZW50aXR5IHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC5lbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSk7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW50aXR5LmluZGV4T2YoJ34nKSA8IDAsICdlbnRpdHkgbmFtZSBtdXN0IG5vdCBjb250YWluIGEgfiBjaGFyYWN0ZXIhJyk7XG4gICAgdmFyIG1zZzogTGl2ZURhdGFNZXNzYWdlID0ge1xuICAgICAgX2lkOiBlbnRpdHkgKyAnficgKyAoPE1vZGVsPm1vZGVsKS5pZCxcbiAgICAgIGlkOiAoPE1vZGVsPm1vZGVsKS5pZCxcbiAgICAgIG1ldGhvZDogbWV0aG9kLFxuICAgICAgZGF0YTogZGF0YSxcbiAgICAgIC8vIGNoYW5uZWw6IGVuZHBvaW50LmNoYW5uZWwsIC8vIGNoYW5uZWwgaXMgaGFja2VkIGluIGJ5IHN0b3JlTWVzc2FnZSgpLCB3ZSBkb24ndCB3YW50IHRvIHVzZSB0aGlzIGFueW1vcmVcbiAgICAgIHByaW9yaXR5OiBlbmRwb2ludC5wcmlvcml0eSxcbiAgICAgIHRpbWU6IERhdGUubm93KClcbiAgICB9O1xuXG4gICAgdmFyIHEgPSBRLnJlc29sdmUobXNnKTtcbiAgICB2YXIgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD47XG4gICAgaWYgKHN0b3JlTXNnKSB7XG4gICAgICAvLyBzdG9yZSBhbmQgcG90ZW50aWFsbHkgbWVyZ2UgbWVzc2FnZVxuICAgICAgcU1lc3NhZ2UgPSB0aGlzLnN0b3JlTWVzc2FnZShlbmRwb2ludCwgcSk7XG4gICAgICBxID0gcU1lc3NhZ2UudGhlbigobWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwpID0+IHtcbiAgICAgICAgLy8gaW4gY2FzZSBvZiBtZXJnaW5nLCB0aGlzIHJlc3VsdCBjb3VsZCBiZSBkaWZmZXJlbnRcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuYXR0cmlidXRlcztcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcS50aGVuKChtc2cyOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcbiAgICAgIC8vIHBhc3MgaW4gcU1lc3NhZ2Ugc28gdGhhdCBkZWxldGlvbiBvZiBzdG9yZWQgbWVzc2FnZSBjYW4gYmUgc2NoZWR1bGVkXG4gICAgICByZXR1cm4gdGhpcy5fZW1pdE1lc3NhZ2UoZW5kcG9pbnQsIG1zZzIsIG9wdGlvbnMsIG1vZGVsLCBxTWVzc2FnZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9lbWl0TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgb3B0aW9uczogYW55LFxuICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBxTWVzc2FnZTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPik6XG4gIFEuUHJvbWlzZTxhbnk+IHtcbiAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgdmFyIHFBamF4ID0gdGhpcy5fYWpheE1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgb3B0aW9ucywgbW9kZWwpO1xuICAgIHZhciBxID0gcUFqYXg7XG5cbiAgICBpZiAocU1lc3NhZ2UpIHtcbiAgICAgIC8vIGZvbGxvd2luZyB0YWtlcyBjYXJlIG9mIG9mZmxpbmUgY2hhbmdlIHN0b3JlXG4gICAgICBxID0gcS50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgIC8vIHN1Y2Nlc3MsIHJlbW92ZSBtZXNzYWdlIHN0b3JlZCwgaWYgYW55XG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcU1lc3NhZ2UpLmNhdGNoKChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7IC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxuICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICB9KS50aGVuUmVzb2x2ZShkYXRhKTsgLy8gcmVzb2x2ZSBhZ2FpbiB5aWVsZGluZyBkYXRhXG4gICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIC8vIGZhaWx1cmUgZXZlbnR1YWxseSBjYXVnaHQgYnkgb2ZmbGluZSBjaGFuZ2VzXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgdGhpcy51c2VPZmZsaW5lQ2hhbmdlcykge1xuICAgICAgICAgIC8vIHRoaXMgc2VhbXMgdG8gYmUgb25seSBhIGNvbm5lY3Rpb24gcHJvYmxlbSwgc28gd2Uga2VlcCB0aGUgbWVzc2FnZSBhbmQgY2FsbCBzdWNjZXNzXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShtc2cuZGF0YSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gcmVtb3ZlIG1lc3NhZ2Ugc3RvcmVkIGFuZCBrZWVwIHJlamVjdGlvbiBhcyBpc1xuICAgICAgICAgIHJldHVybiB0aGlzLnJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcU1lc3NhZ2UpLmNhdGNoKChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXG4gICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgIH0pLnRoZW5SZWplY3QoeGhyKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcSA9IHRoaXMuX2FwcGx5UmVzcG9uc2UocSwgZW5kcG9pbnQsIG1zZywgb3B0aW9ucywgbW9kZWwpO1xuXG4gICAgcmV0dXJuIHEuZmluYWxseSgoKSA9PiB7XG4gICAgICAvLyBkbyBzb21lIGNvbm5lY3Rpb24gaGFuZGxpbmdcbiAgICAgIHJldHVybiBxQWpheC50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gdHJpZ2dlciByZWNvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLm9uQ29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgIH1cbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgLy8gdHJpZ2dlciBkaXNjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2FqYXhNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBRLlByb21pc2U8YW55PiB7XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgZGVsZXRlIG9wdGlvbnMueGhyOyAvLyBtYWtlIHN1cmUgbm90IHRvIHVzZSBvbGQgdmFsdWVcblxuICAgIHZhciB1cmwgPSBvcHRpb25zLnVybDtcbiAgICBpZiAoIXVybCkge1xuICAgICAgdXJsID0gZW5kcG9pbnQudXJsUm9vdDtcbiAgICAgIGlmIChtc2cuaWQgJiYgbXNnLm1ldGhvZCAhPT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgLy8gYWRkIElEIG9mIG1vZGVsXG4gICAgICAgIHVybCArPSAodXJsLmNoYXJBdCh1cmwubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtc2cuaWQ7XG4gICAgICB9XG4gICAgICBpZiAobXNnLm1ldGhvZCA9PT0gJ3JlYWQnICYmIGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcbiAgICAgICAgLy8gYWRkIHF1ZXJ5IG9mIGNvbGxlY3Rpb25cbiAgICAgICAgdmFyIGNvbGxlY3Rpb25VcmwgPSBfLmlzRnVuY3Rpb24obW9kZWwudXJsKSA/IG1vZGVsLnVybCgpIDogbW9kZWwudXJsO1xuICAgICAgICB2YXIgcXVlcnlJbmRleCA9IGNvbGxlY3Rpb25VcmwubGFzdEluZGV4T2YoJz8nKTtcbiAgICAgICAgdmFyIGdldFF1ZXJ5ID0gbmV3IEdldFF1ZXJ5KCkuZnJvbUpTT04ob3B0aW9ucyk7XG4gICAgICAgIC8vIGN1cnJlbnRseSBvbmx5IHNvcnRPcmRlciBjYW4gYmUgc3VwcG9ydGVkIGFzIHdlIHJlcXVpcmUgdGhlIGluaXRpYWwgZGF0YSBsb2FkIHRvIHlpZWxkIGZ1bGwgZGF0YXNldFxuICAgICAgICBnZXRRdWVyeS5saW1pdCA9IG51bGw7XG4gICAgICAgIGdldFF1ZXJ5Lm9mZnNldCA9IG51bGw7XG4gICAgICAgIGdldFF1ZXJ5LmZpbHRlciA9IG51bGw7XG4gICAgICAgIGdldFF1ZXJ5LmZpZWxkcyA9IG51bGw7XG4gICAgICAgIHZhciBnZXRQYXJhbXMgPSBnZXRRdWVyeS50b1F1ZXJ5UGFyYW1zKCk7XG4gICAgICAgIGlmIChxdWVyeUluZGV4ID49IDApIHtcbiAgICAgICAgICB1cmwgKz0gY29sbGVjdGlvblVybC5zdWJzdHIocXVlcnlJbmRleCk7XG4gICAgICAgICAgaWYgKGdldFBhcmFtcykge1xuICAgICAgICAgICAgdXJsICs9ICcmJyArIGdldFBhcmFtcztcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGdldFBhcmFtcykge1xuICAgICAgICAgICAgdXJsICs9ICc/JyArIGdldFBhcmFtcztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBlYXJsaWVzdCBwb2ludCB3aGVyZSB0YXJnZXQgVVJMIGlzIGtub3duXG4gICAgZGlhZy5kZWJ1Zy5kZWJ1ZygnYWpheE1lc3NhZ2UgJyArIG1zZy5tZXRob2QgKyAnICcgKyB1cmwpO1xuICAgIHZhciBvcHRzOiBhbnkgPSB7XG4gICAgICAvLyBtdXN0IG5vdCB0YWtlIGFyYml0cmFyeSBvcHRpb25zIGFzIHRoZXNlIHdvbid0IGJlIHJlcGxheWVkIG9uIHJlY29ubmVjdFxuICAgICAgdXJsOiB1cmwsXG4gICAgICBhdHRyczogbXNnLmRhdGEsXG4gICAgICBzdG9yZToge30sIC8vIGVuc3VyZXMgbmV0d29yayBpcyB1c2VkXG4gICAgICBjcmVkZW50aWFsczogb3B0aW9ucy5jcmVkZW50aWFscyxcbiAgICAgIC8vIGVycm9yIHByb3BhZ2F0aW9uXG4gICAgICBlcnJvcjogb3B0aW9ucy5lcnJvclxuICAgIH07XG5cbiAgICAvLyBwcm90ZWN0IGFnYWluc3Qgd3Jvbmcgc2VydmVyIGFuZCB1c2VyIGlkZW50aXR5XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gd2ViLnJlc29sdmVTZXJ2ZXIodXJsLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcbiAgICBpZiAoc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHRoaXMuc2VydmVyVXJsKS5hdXRob3JpemF0aW9uLm5hbWUgIT09IHRoaXMudXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0cywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcbiAgICB9XG5cbiAgICAvLyBhY3R1YWwgYWpheCByZXF1ZXN0IHZpYSBiYWNrYm9uZS5qc1xuICAgIHJldHVybiB0aGlzLmNoZWNrU2VydmVyKHVybCwgb3B0cykudGhlbigoKSA9PiB7XG4gICAgICByZXR1cm4gbW9kZWwuc3luYyhtc2cubWV0aG9kLCBtb2RlbCwgb3B0cykuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIC8vIHRha2Ugb3ZlciB4aHIgcmVzb2x2aW5nIHRoZSBvcHRpb25zIGNvcHlcbiAgICAgICAgb3B0aW9ucy54aHIgPSBvcHRzLnhoci54aHIgfHwgb3B0cy54aHI7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2FwcGx5UmVzcG9uc2U8VD4ocVhIUjogUS5Qcm9taXNlPFQ+LCBlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBhbnksIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBRLlByb21pc2U8VD4ge1xuICAgIC8vIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICB2YXIgY2xpZW50VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIHJldHVybiBxWEhSLnRoZW4oKGRhdGE6IFQgfCBhbnkpID0+IHtcbiAgICAgIC8vIGRlbGV0ZSBvbiBzZXJ2ZXIgZG9lcyBub3QgcmVzcG9uZCBhIGJvZHlcbiAgICAgIGlmICghZGF0YSAmJiBtc2cubWV0aG9kID09PSAnZGVsZXRlJykge1xuICAgICAgICBkYXRhID0gbXNnLmRhdGE7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBsb2NhbCBzdG9yZSBzdGF0ZVxuICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgLy8gbm8gZGF0YSBpZiBzZXJ2ZXIgYXNrcyBub3QgdG8gYWx0ZXIgc3RhdGVcbiAgICAgICAgLy8gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgbXNnLnRpbWUpO1xuICAgICAgICB2YXIgcHJvbWlzZXM6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+W10gPSBbXTtcbiAgICAgICAgdmFyIGRhdGFJZHM6IGFueTsgLy8gbW9kZWwgaWQgLT4gYXR0cmlidXRlcyBkYXRhXG4gICAgICAgIGlmIChtc2cubWV0aG9kICE9PSAncmVhZCcpIHtcbiAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBkYXRhID09PSBtc2cuZGF0YSA/IG1zZyA6IDxMaXZlRGF0YU1lc3NhZ2U+Xy5kZWZhdWx0cyh7XG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIGp1c3QgYWNjZXB0cyBuZXcgZGF0YVxuICAgICAgICAgIH0sIG1zZykpKSk7XG4gICAgICAgIH0gZWxzZSBpZiAoaXNDb2xsZWN0aW9uKG1vZGVsKSAmJiBBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgICAgLy8gc3luY2hyb25pemUgdGhlIGNvbGxlY3Rpb24gY29udGVudHMgd2l0aCB0aGUgZGF0YSByZWFkXG4gICAgICAgICAgdmFyIHN5bmNJZHMgPSB7fTtcbiAgICAgICAgICBtb2RlbC5tb2RlbHMuZm9yRWFjaCgobSkgPT4ge1xuICAgICAgICAgICAgc3luY0lkc1ttLmlkXSA9IG07XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZGF0YUlkcyA9IHt9O1xuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZDogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAoZCkge1xuICAgICAgICAgICAgICB2YXIgaWQgPSBkW2VuZHBvaW50Lm1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGVdIHx8IGQuX2lkO1xuICAgICAgICAgICAgICBkYXRhSWRzW2lkXSA9IGQ7XG4gICAgICAgICAgICAgIHZhciBtID0gc3luY0lkc1tpZF07XG4gICAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBpdGVtXG4gICAgICAgICAgICAgICAgZGVsZXRlIHN5bmNJZHNbaWRdOyAvLyBzbyB0aGF0IGl0IGlzIGRlbGV0ZWQgYmVsb3dcbiAgICAgICAgICAgICAgICBpZiAoIV8uaXNFcXVhbChfLnBpY2suY2FsbChtLCBtLmF0dHJpYnV0ZXMsIE9iamVjdC5rZXlzKGQpKSwgZCkpIHtcbiAgICAgICAgICAgICAgICAgIC8vIGFib3ZlIGNoZWNrZWQgdGhhdCBhbGwgYXR0cmlidXRlcyBpbiBkIGFyZSBpbiBtIHdpdGggZXF1YWwgdmFsdWVzIGFuZCBmb3VuZCBzb21lIG1pc21hdGNoXG4gICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAndXBkYXRlJyxcbiAgICAgICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IGRcbiAgICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgaXRlbVxuICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NyZWF0ZScsXG4gICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IGRcbiAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgT2JqZWN0LmtleXMoc3luY0lkcykuZm9yRWFjaCgoaWQpID0+IHtcbiAgICAgICAgICAgIC8vIGRlbGV0ZSB0aGUgaXRlbVxuICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICBtZXRob2Q6ICdkZWxldGUnLFxuICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgZGF0YTogbS5hdHRyaWJ1dGVzXG4gICAgICAgICAgICB9KSkpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHRyaWdnZXIgYW4gdXBkYXRlIHRvIGxvYWQgdGhlIGRhdGEgcmVhZFxuICAgICAgICAgIHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogW2RhdGFdO1xuICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGRhdGEgPSBhcnJheVtpXTtcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICBpZDogZGF0YVtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkYXRhLl9pZCxcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICd1cGRhdGUnLFxuICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcbiAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIFEuYWxsKHByb21pc2VzKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAvLyBkZWxheWVkIHRpbGwgb3BlcmF0aW9ucyBjb21wbGV0ZVxuICAgICAgICAgIGlmICghZGF0YUlkcykge1xuICAgICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgICAgfVxuICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzQ29sbGVjdGlvbihtb2RlbCkpO1xuXG4gICAgICAgICAgLy8gd2hlbiBjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIG9ubHkgcGFzcyBkYXRhIG9mIG1vZGVscyB0aGF0IHdlcmUgc3luY2VkIG9uIHRvIHRoZSBzdWNjZXNzIGNhbGxiYWNrLFxuICAgICAgICAgIC8vIGFzIHRoZSBjYWxsYmFjayB3aWxsIHNldCB0aGUgbW9kZWxzIGFnYWluIGNhdXNpbmcgb3VyIHNvcnRpbmcgYW5kIGZpbHRlcmluZyB0byBiZSB3aXRob3V0IGVmZmVjdC5cbiAgICAgICAgICB2YXIgcmVzcG9uc2U6IGFueVtdID0gW107XG4gICAgICAgICAgbGV0IG1vZGVscyA9IGlzQ29sbGVjdGlvbihtb2RlbCkgPyBtb2RlbC5tb2RlbHMgOiBbbW9kZWxdO1xuICAgICAgICAgIGZvciAobGV0IGkgPSBtb2RlbHMubGVuZ3RoOyBpLS0gPiAwOyApIHtcbiAgICAgICAgICAgIHZhciBtID0gbW9kZWxzW2ldO1xuICAgICAgICAgICAgaWYgKGRhdGFJZHNbbS5pZF0pIHtcbiAgICAgICAgICAgICAgcmVzcG9uc2UucHVzaChtLmF0dHJpYnV0ZXMpO1xuICAgICAgICAgICAgICBkZWxldGUgZGF0YUlkc1ttLmlkXTtcbiAgICAgICAgICAgICAgaWYgKGRhdGFJZHMubGVuZ3RoIDw9IDApIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UucmV2ZXJzZSgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgICAgbGV0IHFUaW1lOiBRLlByb21pc2U8YW55PjtcbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IERhdGUgaGVhZGVyIGZyb20gb3B0aW9ucy54aHIgaW5zdGVhZCBvZiB1c2luZyBjbGllbnRUaW1lXG4gICAgICAgIHFUaW1lID0gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCwgY2xpZW50VGltZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxVGltZSA9IFEucmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHFUaW1lLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBpbnZva2Ugc3VjY2VzcyBjYWxsYmFjaywgaWYgYW55XG4gICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xuICAgICAgfSk7XG4gICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZmV0Y2hDaGFuZ2VzKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIGZvcmNlID0gZmFsc2UpOiBRLlByb21pc2U8Q29sbGVjdGlvbj4ge1xuICAgIGxldCBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICBpZiAoIWVuZHBvaW50LnVybFJvb3QgfHwgIWNoYW5uZWwpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmU8Q29sbGVjdGlvbj4odW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBsZXQgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBsZXQgcHJvbWlzZSA9IGVuZHBvaW50LnByb21pc2VGZXRjaGluZ0NoYW5nZXM7XG4gICAgaWYgKHByb21pc2UgJiYgIWZvcmNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPCAxMDAwKSB7XG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGNoYW5uZWwgKyAnIHNraXBwaW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgaWYgKCF0aW1lKSB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoY2hhbm5lbCArICcgY2FuIG5vdCBmZXRjaCBjaGFuZ2VzIGF0IHRoaXMgdGltZSEnKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2UgfHwgUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgICB9XG5cbiAgICAgIC8vIGluaXRpYXRlIGEgbmV3IHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICAgIGRpYWcuZGVidWcuaW5mbyhjaGFubmVsICsgJyBpbml0aWF0aW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xuICAgICAgbGV0IGNoYW5nZXM6IENvbGxlY3Rpb24gPSBuZXcgKDxhbnk+dGhpcy5tZXNzYWdlcykuY29uc3RydWN0b3IoKTtcbiAgICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKGVuZHBvaW50LnVybFJvb3QgKyAnY2hhbmdlcy8nICsgdGltZSkudGhlbigodXJsKSA9PiB7XG4gICAgICAgIHJldHVybiBRKGNoYW5nZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xuICAgICAgICAgIHVybDogdXJsLFxuICAgICAgICAgIHN0b3JlOiB7fSwgLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcblxuICAgICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBvcHRpb25zLnhocjtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKS50aGVuKCgpID0+IHtcbiAgICAgICAgICBpZiAoY2hhbmdlcy5tb2RlbHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFEuYWxsKGNoYW5nZXMubWFwKChjaGFuZ2UpID0+IHtcbiAgICAgICAgICAgICAgbGV0IG1zZzogTGl2ZURhdGFNZXNzYWdlID0gY2hhbmdlLmF0dHJpYnV0ZXM7XG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgbXNnKSk7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZvbGxvd2luZyBzaG91bGQgdXNlIHNlcnZlciB0aW1lIVxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIG5vdyk7XG4gICAgICAgICAgfVxuICAgICAgICB9KS50aGVuUmVzb2x2ZShjaGFuZ2VzKTtcbiAgICAgIH0pO1xuICAgICAgZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nQ2hhbmdlcyA9IHByb21pc2U7XG4gICAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPSBub3c7XG4gICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8TW9kZWw+IHtcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgcHJvbWlzZSA9IGVuZHBvaW50LnByb21pc2VGZXRjaGluZ1NlcnZlckluZm87XG4gICAgaWYgKHByb21pc2UpIHtcbiAgICAgIGlmIChwcm9taXNlLmlzUGVuZGluZygpIHx8IG5vdyAtIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA8IDEwMDApIHtcbiAgICAgICAgLy8gcmV1c2UgZXhpc3RpbmcgZXZlbnR1YWxseSBjb21wbGV0ZWQgcmVxdWVzdCBmb3IgY2hhbmdlc1xuICAgICAgICBkaWFnLmRlYnVnLndhcm5pbmcoZW5kcG9pbnQuY2hhbm5lbCArICcgc2tpcHBpbmcgaW5mbyByZXF1ZXN0Li4uJyk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHZhciBpbmZvID0gbmV3IE1vZGVsKCk7XG4gICAgdmFyIHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsKTtcbiAgICB2YXIgdXJsID0gZW5kcG9pbnQudXJsUm9vdDtcbiAgICBpZiAodXJsLmNoYXJBdCgodXJsLmxlbmd0aCAtIDEpKSAhPT0gJy8nKSB7XG4gICAgICB1cmwgKz0gJy8nO1xuICAgIH1cbiAgICBwcm9taXNlID0gdGhpcy5jaGVja1NlcnZlcih1cmwgKyAnaW5mbycpLnRoZW4oKHVybCkgPT4ge1xuICAgICAgcmV0dXJuIFEoaW5mby5mZXRjaCg8QmFja2JvbmUuTW9kZWxGZXRjaE9wdGlvbnM+KHtcbiAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XG4gICAgICAgIH1cbiAgICAgICAgfSkpKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAvL0B0b2RvIHdoeSB3ZSBzZXQgYSBzZXJ2ZXIgdGltZSBoZXJlID9cbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aW1lICYmIGluZm8uZ2V0KCd0aW1lJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsIGluZm8uZ2V0KCd0aW1lJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRpbWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICghZW5kcG9pbnQuc29ja2V0UGF0aCAmJiBpbmZvLmdldCgnc29ja2V0UGF0aCcpKSB7XG4gICAgICAgICAgICBlbmRwb2ludC5zb2NrZXRQYXRoID0gaW5mby5nZXQoJ3NvY2tldFBhdGgnKTtcbiAgICAgICAgICAgIHZhciBuYW1lID0gaW5mby5nZXQoJ2VudGl0eScpIHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xuICAgICAgICAgICAgICBlbmRwb2ludC5zb2NrZXQgPSB0aGlzLmNyZWF0ZVNvY2tldChlbmRwb2ludCwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvID0gcHJvbWlzZTtcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPSBub3c7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICogY2FsbGVkIHdoZW4gYW4gb2ZmbGluZSBjaGFuZ2Ugd2FzIHNlbnQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXG4gICAqXG4gICAqIDxwPlxuICAgKiBNYXkgYmUgb3ZlcndyaXR0ZW4gdG8gYWx0ZXIgY2hhbmdlIG1lc3NhZ2UgZXJyb3IgaGFuZGxpbmcgYmVoYXZpb3IuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIHdpbGwgYXR0ZW1wdFxuICAgKiByZWxvYWRpbmcgdGhlIHNlcnZlciBkYXRhIGZvciByZXN0b3JpbmcgdGhlIGNsaWVudCBzdGF0ZSBzdWNoIHRoYXQgaXQgcmVmbGVjdHMgdGhlIHNlcnZlciBzdGF0ZS4gV2hlbiB0aGlzXG4gICAqIHN1Y2NlZWRlZCwgdGhlIG9mZmxpbmUgY2hhbmdlIGlzIGVmZmVjdGl2ZWx5IHJldmVydGVkIGFuZCB0aGUgY2hhbmdlIG1lc3NhZ2UgaXMgZHJvcHBlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogQW4gb3ZlcndyaXR0ZW4gaW1wbGVtZW50YXRpb24gbWF5IGRlY2lkZWQgd2hldGhlciB0byByZXZlcnQgZmFpbGVkIGNoYW5nZXMgYmFzZWQgb24gdGhlIGVycm9yIHJlcG9ydGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBOb3RpY2UsIHRoZSBtZXRob2QgaXMgbm90IGNhbGxlZCB3aGVuIHRoZSBvZmZsaW5lIGNoYW5nZSBmYWlsZWQgZHVlIHRvIGEgY29ubmVjdGl2aXR5IGlzc3VlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEBwYXJhbSBlcnJvciByZXBvcnRlZCBieSByZW1vdGUgc2VydmVyLlxuICAgKiBAcGFyYW0gbWVzc2FnZSBjaGFuZ2UgcmVwb3J0ZWQsIGF0dHJpYnV0ZXMgb2YgdHlwZSBMaXZlRGF0YU1lc3NhZ2UuXG4gICAqIEBwYXJhbSBvcHRpb25zIGNvbnRleHQgaW5mb3JtYXRpb24gcmVxdWlyZWQgdG8gYWNjZXNzIHRoZSBkYXRhIGxvY2FsbHkgYXMgd2VsbCBhcyByZW1vdGVseS5cbiAgICogQHJldHVybiB7YW55fSBQcm9taXNlIGluZGljYXRpbmcgc3VjY2VzcyB0byBkcm9wIHRoZSBjaGFuZ2UgbWVzc2FnZSBhbmQgcHJvY2VlZCB3aXRoIHRoZSBuZXh0IGNoYW5nZSwgb3JcbiAgICogICAgcmVqZWN0aW9uIGluZGljYXRpbmcgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGtlcHQgYW5kIHJldHJpZWQgbGF0ZXIgb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yOiBFcnJvciwgbWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwsIG9wdGlvbnM6IHtcbiAgICBlbnRpdHk6IHN0cmluZyxcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcbiAgICB1cmxSb290OiBzdHJpbmcsXG4gICAgbG9jYWxTdG9yZTogU3RvcmUsXG4gICAgc2lsZW50PzogYm9vbGVhblxuICB9KTogUHJvbWlzZUxpa2U8dm9pZCB8IGFueT4ge1xuICAgIGlmICghZXJyb3IpIHtcbiAgICAgIC8vIG1lc3NhZ2Ugd2FzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHlcbiAgICAgIGlmICghdGhpcy51c2VTb2NrZXROb3RpZnkpIHtcbiAgICAgICAgLy8gd2hlbiBub3QgdXNpbmcgc29ja2V0cywgZmV0Y2ggY2hhbmdlcyBub3dcbiAgICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbb3B0aW9ucy5lbnRpdHldO1xuICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAvLyB3aWxsIHB1bGwgdGhlIGNoYW5nZSBjYXVzZWQgYnkgdGhlIG9mZmxpbmUgbWVzc2FnZSBhbmQgdXBkYXRlIHRoZSBtZXNzYWdlIHRpbWUsXG4gICAgICAgICAgLy8gc28gdGhhdCB3ZSBhdm9pZCB0aGUgc2l0dWF0aW9uIHdoZXJlIHRoZSBjaGFuZ2UgY2F1c2VkIGJ5IHJlcGxheWluZyB0aGUgb2ZmbGluZVxuICAgICAgICAgIC8vIGNoYW5nZSByZXN1bHRzIGluIGEgY29uZmxpY3QgbGF0ZXIgb24uLi5cbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8vIGZhaWxlZCwgZXZlbnR1YWxseSB1bmRvIHRoZSBtb2RpZmljYXRpb25zIHN0b3JlZFxuICAgIGlmICghb3B0aW9ucy5sb2NhbFN0b3JlKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHJldmVydCBtb2RpZmljYXRpb24gYnkgcmVsb2FkaW5nIGRhdGFcbiAgICBsZXQgbW9kZWxUeXBlID0gb3B0aW9ucy5tb2RlbFR5cGUgfHwgTW9kZWw7XG4gICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtZXNzYWdlLmdldCgnZGF0YScpLCB7XG4gICAgICBlbnRpdHk6IG9wdGlvbnMuZW50aXR5XG4gICAgfSk7XG4gICAgbW9kZWwuaWQgPSBtZXNzYWdlLmdldCgnbWV0aG9kJykgIT09ICdjcmVhdGUnICYmIG1lc3NhZ2UuZ2V0KCdpZCcpO1xuICAgIGxldCB0cmlnZ2VyRXJyb3IgPSAoKSA9PiB7XG4gICAgICAvLyBpbmZvcm0gY2xpZW50IGFwcGxpY2F0aW9uIG9mIHRoZSBvZmZsaW5lIGNoYW5nZXMgZXJyb3JcbiAgICAgIGxldCBjaGFubmVsID0gbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKTtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQ6IHRyaWdnZXJpbmcgZXJyb3IgZm9yIGNoYW5uZWwgJyArIGNoYW5uZWwgKyAnIG9uIHN0b3JlJywgZXJyb3IpO1xuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbGV0IGxvY2FsT3B0aW9ucyA9IHtcbiAgICAgIC8vIGp1c3QgYWZmZWN0IGxvY2FsIHN0b3JlXG4gICAgICBzdG9yZTogb3B0aW9ucy5sb2NhbFN0b3JlXG4gICAgfTtcbiAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgdXJsUm9vdDogb3B0aW9ucy51cmxSb290LFxuICAgICAgc3RvcmU6IHt9IC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXG4gICAgfTtcbiAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgIHJlbW90ZU9wdGlvbnMudXJsID0gcmVtb3RlT3B0aW9ucy51cmxSb290ICsgKHJlbW90ZU9wdGlvbnMudXJsUm9vdC5jaGFyQXQocmVtb3RlT3B0aW9ucy51cmxSb290Lmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbW9kZWwuaWQ7XG4gICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjcmVhdGlvbiBmYWlsZWQsIGp1c3QgZGVsZXRlIGxvY2FsbHlcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSA9PT0gJ2NyZWF0ZScpO1xuICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfVxuICAgIHJldHVybiAoPFEuUHJvbWlzZTxhbnk+Pjxhbnk+bW9kZWwuZmV0Y2gocmVtb3RlT3B0aW9ucykpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSByZWxvYWRlZCB0aGUgZGF0YSB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMsIHdoaWNoIHN1Y2NlZWRlZC4uLlxuICAgICAgcmV0dXJuIG1vZGVsLnNhdmUoZGF0YSwgbG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfSwgKGZldGNoUmVzcDogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHRyaWVkIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucyBieSByZWxvYWRpbmcgdGhlIGRhdGEsIHdoaWNoIGZhaWxlZCBhcyB3ZWxsLi4uXG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gZmV0Y2hSZXNwICYmIGZldGNoUmVzcC5zdGF0dXNDb2RlO1xuICAgICAgc3dpdGNoIChzdGF0dXNDb2RlKSB7XG4gICAgICAgIGNhc2UgNDA0OiAvLyBOT1QgRk9VTkRcbiAgICAgICAgY2FzZSA0MDE6IC8vIFVOQVVUSE9SSVpFRFxuICAgICAgICBjYXNlIDQxMDogLy8gR09ORSpcbiAgICAgICAgICAvLyAuLi5iZWNhdXNlIHRoZSBpdGVtIGlzIGdvbmUgYnkgbm93LCBtYXliZSBzb21lb25lIGVsc2UgY2hhbmdlZCBpdCB0byBiZSBkZWxldGVkXG4gICAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKTsgLy8gc2lsZW50IHJlZ2FyZGluZyB0cmlnZ2VyRXJyb3JcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZmV0Y2hSZXNwKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogZmVlZHMgcGVuZGluZyBvZmZsaW5lICNtZXNzYWdlcyB0byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICpcbiAgICogPHA+XG4gICAqIER1ZSB0byBjbGllbnQgY29kZSBzZXR0aW5nIHVwIG1vZGVscyBvbmUgYXQgYSB0aW1lLCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGluaXRpYWwgc2V0dXAgb2ZcbiAgICogI2VuZHBvaW50cy4gVGhlIGZpcnN0IGNhbGwgZmV0Y2hlcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzLCBvcmRlcmVkIGJ5IHByaW9yaXR5IGFuZCB0aW1lLiBUaGVuIHRoZSAjbWVzc2FnZXNcbiAgICogYXJlIHNlbmQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIgdW50aWwgZGVwbGV0ZWQsIGFuIGVycm9yIG9jY3Vycywgb3Igc29tZSBtaXNzaW5nIGVuZHBvaW50IGlzIGVuY291bnRlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogVGhlIG1ldGhvZCBpcyB0cmlnZ2VyZWQgZWFjaCB0aW1lIGFuIGVuZHBvaW50IGlzIHJlZ2lzdGVyZWQsIG9yIHN0YXRlIGNoYW5nZXMgdG8gb25saW5lIGZvciBhbnkgZW5kcG9pbnQuIFdoZW5cbiAgICogc3RhdGUgY2hhbmdlcyBmcm9tIG9mZmxpbmUgdG8gb25saW5lIChkaXNyZWdhcmRpbmcgZW5kcG9pbnQpIG1lc3NhZ2Ugc3VibWlzc2lvbiBpcyByZXN0YXJ0ZWQgYnkgcmVzZXR0aW5nIHRoZVxuICAgKiAjbWVzc2FnZXNQcm9taXNlLiBPdGhlcndpc2UsIHN1YnNlcXVlbnQgY2FsbHMgY2hhaW4gdG8gdGhlIGVuZCBvZiAjbWVzc2FnZXNQcm9taXNlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IG9mICNtZXNzYWdlcyBDb2xsZWN0aW9uLCBvciBsYXN0IHJlY2VudCBvZmZsaW5lIHJlamVjdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBfc2VuZE1lc3NhZ2VzKCk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XG4gICAgLy8gbm90IHJlYWR5IHlldFxuICAgIGlmICghdGhpcy5tZXNzYWdlcykge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3NlcyBtZXNzYWdlcyB1bnRpbCBub25lIGxlZnQsIGhpdHRpbmcgYSBtZXNzYWdlIG9mIGEgbm90IHlldCByZWdpc3RlcmVkIGVuZHBvaW50LCBvciBlbnRlcmluZ1xuICAgIC8vIGEgbm9uLXJlY292ZXJhYmxlIGVycm9yLiBUaGUgcHJvbWlzZSByZXR1cm5lZCByZXNvbHZlcyB0byB0aGlzLm1lc3NhZ2VzIHdoZW4gZG9uZS5cbiAgICBsZXQgbmV4dE1lc3NhZ2UgPSAoKTogYW55ID0+IHtcbiAgICAgIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG5cbiAgICAgIGxldCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IHRoaXMubWVzc2FnZXMubW9kZWxzWzBdO1xuICAgICAgbGV0IGVudGl0eSA9IG1lc3NhZ2UuaWQuc3Vic3RyKDAsIG1lc3NhZ2UuaWQuaW5kZXhPZignficpKTtcbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ3NlbmRNZXNzYWdlICcgKyBtZXNzYWdlLmlkICsgJyB3aXRoIG5vIGVudGl0eSEnKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC5jaGFubmVsID09PSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpLCAnY2hhbm5lbCBvZiBlbmRwb2ludCAnICsgZW5kcG9pbnQuY2hhbm5lbCArICcgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCBvZiBtZXNzYWdlICcgKyBtZXNzYWdlLmdldCgnY2hhbm5lbCcpKTtcbiAgICAgIGxldCBtc2cgPSB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtZXNzYWdlLmF0dHJpYnV0ZXMpO1xuXG4gICAgICBsZXQgbW9kZWxUeXBlID0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IE1vZGVsO1xuICAgICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtc2cuZGF0YSwge1xuICAgICAgICBlbnRpdHk6IGVuZHBvaW50LmVudGl0eVxuICAgICAgfSk7XG4gICAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XG4gICAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICAgIH07XG4gICAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcbiAgICAgICAgLy8gZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwudXJsKCkgPT09IHJlbW90ZU9wdGlvbnMudXJsKTtcbiAgICAgIH1cbiAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VuZE1lc3NhZ2UgJyArIG1vZGVsLmlkKTtcbiAgICAgIGxldCBvZmZsaW5lT3B0aW9ucyA9IHtcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHksXG4gICAgICAgIG1vZGVsVHlwZTogZW5kcG9pbnQubW9kZWxUeXBlLFxuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBsb2NhbFN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHRoaXMuX2FwcGx5UmVzcG9uc2UodGhpcy5fYWpheE1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcmVtb3RlT3B0aW9ucywgbW9kZWwpLCBlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHN1Y2NlZWRlZFxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQobnVsbCwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpO1xuICAgICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIGlmIChlcnJvci5zdGF0dXNDb2RlKSB7XG4gICAgICAgICAgLy8gcmVtb3RlIGZhaWxlZFxuICAgICAgICAgIHJldHVybiBRKHRoaXMucHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucykpLmNhdGNoKChlcnJvcjIpID0+IHtcbiAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZGlzY29ubmVjdCBkdWUgdG8gZXJyb3IgaW4gZW5kcG9pbnRcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS50aGVuUmVqZWN0KGVycm9yMik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY29ubmVjdGl2aXR5IGlzc3VlLCBrZWVwIHJlamVjdGlvblxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBhcHBseWluZyBjaGFuZ2Ugc3VjY2VlZGVkIG9yIHN1Y2Nlc3NmdWxseSByZWNvdmVyZWQgY2hhbmdlXG4gICAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcbiAgICAgIH0pLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICBkaWFnLmRlYnVnLmluZm8oJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fc2VuZE1lc3NhZ2VzJyk7XG4gICAgbGV0IHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICBpZiAoIXEpIHtcbiAgICAgIC8vIGluaXRpYWxseSBmZXRjaCBhbGwgbWVzc2FnZXNcbiAgICAgIHEgPSBRKHRoaXMubWVzc2FnZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xuICAgICAgICBzb3J0T3JkZXI6IFtcbiAgICAgICAgICAnK3ByaW9yaXR5JyxcbiAgICAgICAgICAnK3RpbWUnLFxuICAgICAgICAgICcraWQnXG4gICAgICAgIF1cbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgLy8gZWFybHkgcmVqZWN0aW9uXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gICAgfSBlbHNlIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgIC8vIG5vIG1vcmUgbWVzc2FnZXNcbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBraWNrIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlc1xuICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gcS50aGVuKG5leHRNZXNzYWdlKTtcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gIH1cblxuICBwcml2YXRlIHN0b3JlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBxTXNnOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPik6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4ge1xuICAgIHJldHVybiBxTXNnLnRoZW4oKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICBsZXQgb3B0aW9uczogQmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucztcbiAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzdG9yZU1lc3NhZ2UgJyArIGlkKTtcbiAgICAgIHZhciBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IGlkICYmIDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XG4gICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAvLyB1c2UgZXhpc3RpbmcgaW5zdGFuY2UsIHNob3VsZCBub3QgYmUgdGhlIGNhc2UgdXN1YWxseVxuICAgICAgICBvcHRpb25zID0gPEJhY2tib25lLk1vZGVsU2F2ZU9wdGlvbnM+e1xuICAgICAgICAgIG1lcmdlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpbnN0YW50aWF0ZSBuZXcgbW9kZWwsIGludGVudGlvbmFsbHkgbm90IGFkZGVkIHRvIGNvbGxlY3Rpb25cbiAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKG1zZywge1xuICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMubWVzc2FnZXMsXG4gICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcbiAgICAgICAgfSk7XG4gICAgICAgIG1lc3NhZ2Uuc2V0KCdjaGFubmVsJywgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUShtZXNzYWdlLnNhdmUobXNnLCBvcHRpb25zKSkudGhlblJlc29sdmUobWVzc2FnZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gcU1lc3NhZ2UudGhlbigobWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwpID0+IHtcbiAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgIC8vIG1zZyBpcyBub3QgcGVyc2lzdGVudFxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2UgPSA8TGl2ZURhdGFNZXNzYWdlTW9kZWw+dGhpcy5tZXNzYWdlcy5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwoe1xuICAgICAgICAgICAgX2lkOiBtc2cuX2lkXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgncmVtb3ZlTWVzc2FnZSAnICsgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgY2xlYXIoY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAoY29sbGVjdGlvbikge1xuICAgICAgdmFyIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQgPSB0aGlzLmdldEVuZHBvaW50KGNvbGxlY3Rpb24pO1xuICAgICAgaWYgKGVuZHBvaW50KSB7XG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgdGhpcy5tZXNzYWdlcy5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgY29sbGVjdGlvbi5yZXNldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZSB0aGUgc29ja2V0IGV4cGxpY2l0XG4gICAqL1xuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMubWVzc2FnZXMuc3RvcmUpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMuc3RvcmUuY2xvc2UoKTtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5lbmRwb2ludHMpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuZW5kcG9pbnRzW2tleXNbaV1dLmNsb3NlKCk7XG4gICAgfVxuICB9XG59XG5cbi8vIG1peGluc1xubGV0IHN5bmNTdG9yZSA9IF8uZXh0ZW5kKFN5bmNTdG9yZS5wcm90b3R5cGUsIHtcbiAgX3R5cGU6ICdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUnLFxuXG4gIGxvY2FsU3RvcmU6IFdlYlNxbFN0b3JlLFxuICB1c2VMb2NhbFN0b3JlOiB0cnVlLFxuICB1c2VTb2NrZXROb3RpZnk6IHRydWUsXG4gIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlLFxuICBzb2NrZXRQYXRoOiAnJ1xufSk7XG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBTeW5jU3RvcmUucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShzeW5jU3RvcmUpKSk7XG4iXX0=