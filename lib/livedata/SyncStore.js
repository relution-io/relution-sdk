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
                _this._bindChannel(endpoint, name);
                return _this.onConnect(endpoint).done();
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
            var time = this.getLastMessageTime(channel);
            name = name || endpoint.entity;
            socket.emit('bind', {
                entity: name,
                channel: channel,
                time: time
            });
        }
    };
    SyncStore.prototype.getLastMessageTime = function (channel) {
        if (!this.lastMesgTime) {
            this.lastMesgTime = {};
        }
        else if (this.lastMesgTime[channel] !== undefined) {
            return this.lastMesgTime[channel];
        }
        // the | 0 below turns strings into numbers
        var time = offline_1.localStorage().getItem('__' + channel + 'lastMesgTime') || 0;
        this.lastMesgTime[channel] = time;
        return time;
    };
    SyncStore.prototype.setLastMessageTime = function (channel, time) {
        if (!time || time > this.getLastMessageTime(channel)) {
            offline_1.localStorage().setItem('__' + channel + 'lastMesgTime', time);
            this.lastMesgTime[channel] = time;
        }
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
            if (msg.time) {
                _this.setLastMessageTime(channel, msg.time);
            }
            // update all collections listening
            _this.trigger('sync:' + channel, msg); // SyncContext.onMessage
            return msg;
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
                        var error = new Error('no (valid) id: ' + model.id);
                        return Q.reject(this.handleError(options, error) || error);
                    }
                }
            }
            else {
                // something is really at odds here...
                var error = new Error('target of sync is neither a model nor a collection!?!');
                return Q.reject(this.handleError(options, error) || error);
            }
            // at this point the target server is known, check making sure the correct server is being hit
            var serverUrl = web.resolveServer(model.getUrlRoot(), {
                serverUrl: this.serverUrl
            });
            if (serverUrl !== this.serverUrl) {
                throw new Error('store is bound to server ' + this.serverUrl);
            }
            var channel = endpoint.channel;
            var time = this.getLastMessageTime(channel);
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
            return this._addMessage(method, model, options, endpoint);
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
            if (msg.method === 'read' && Collection_1.isCollection(model)) {
                // TODO: extract Date header from options.xhr instead of using clientTime
                _this.setLastMessageTime(endpoint.channel, clientTime);
            }
            // invoke success callback, if any
            return _this.handleSuccess(options, response) || response;
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
        var time = this.getLastMessageTime(channel);
        if (!time) {
            diag.debug.error(channel + ' can not fetch changes at this time!');
            return promise || Q.resolve(undefined);
        }
        // initiate a new request for changes
        diag.debug.info(channel + ' initiating changes request...');
        var changes = new this.messages.constructor();
        promise = this.checkServer(endpoint.urlRoot + 'changes/' + time).then(function (url) {
            return Q(changes.fetch({
                url: url,
                store: {},
                success: function (model, response, options) {
                    if (changes.models.length > 0) {
                        changes.each(function (change) {
                            var msg = change.attributes;
                            _this.onMessage(endpoint, _this._fixMessage(endpoint, msg));
                        });
                    }
                    else {
                        // following should use server time!
                        _this.setLastMessageTime(channel, now);
                    }
                    return response || options.xhr;
                }
            })).thenResolve(changes);
        });
        endpoint.promiseFetchingChanges = promise;
        endpoint.timestampFetchingChanges = now;
        return promise;
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
                    // @todo why we set a server time here ?
                    if (!time && info.get('time')) {
                        _this.setLastMessageTime(endpoint.channel, info.get('time'));
                    }
                    if (!endpoint.socketPath && info.get('socketPath')) {
                        endpoint.socketPath = info.get('socketPath');
                        var name = info.get('entity') || endpoint.entity;
                        if (_this.useSocketNotify) {
                            endpoint.socket = _this.createSocket(endpoint, name);
                        }
                    }
                    return response || options.xhr;
                }
            }))).thenResolve(info);
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
                this.setLastMessageTime(endpoint.channel, '');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxHQUFHLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEcsQ0FBQztRQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVSOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDtJQUErQiw2QkFBSztJQXFEbEMsbUJBQVksT0FBYTtRQUN2QixrQkFBTSxPQUFPLENBQUMsQ0FBQztRQXRCVixjQUFTLEdBR1osRUFBRSxDQUFDO1FBSVA7Ozs7Ozs7O1dBUUc7UUFDSyx1QkFBa0IsR0FBVyxLQUFLLENBQUM7UUFPekMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxPQUFPLFVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNPLDhCQUFVLEdBQXBCLFVBQXFCLEdBQVc7UUFDOUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O1NBSUs7SUFDRyw4QkFBVSxHQUFsQixVQUFtQixPQUFlO1FBQ2hDLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFO1lBQ3pDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUMxQixDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7WUFDMUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLCtDQUErQztnQkFDL0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUM5QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7aUJBQ3hCLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNILENBQUM7SUFFTywrQkFBVyxHQUFuQixVQUFvQixHQUFXLEVBQUUsT0FBYTtRQUE5QyxpQkFXQztRQVZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxTQUFTLEVBQUUsS0FBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxLQUFLLEtBQUksQ0FBQyxTQUFTLEVBRkcsQ0FFSCxDQUFDLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDckYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsNEVBQTRFLENBQUMsQ0FBQztZQUM5RixJQUFNLEtBQUssR0FBa0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QyxnQ0FBZ0M7WUFDaEMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFTLEtBQUssQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRVMsZ0NBQVksR0FBdEIsVUFBdUIsaUJBQXFDLEVBQUUsU0FBb0I7UUFBbEYsaUJBK0JDO1FBOUJDLElBQUksT0FBTyxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzdDLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0QixzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QixPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxJQUFJLFVBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDdkUsVUFBUSxHQUFHLElBQUksMkJBQVksQ0FBQztvQkFDMUIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE9BQU8sRUFBRSxPQUFPO29CQUNoQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtpQkFDeEIsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBUSxDQUFDO2dCQUVsQyxVQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFRLENBQUMsQ0FBQztnQkFDdEQsVUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxVQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9HLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMzQixVQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN0RCxVQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsVUFBUSxDQUFDLENBQUM7WUFDakQsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLCtEQUErRDtnQkFDL0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLFVBQVEsQ0FBQyxPQUFPLEtBQUssT0FBTyxFQUE1QixDQUE0QixFQUFFLHNEQUFzRCxDQUFDLENBQUM7Z0JBQzlHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxVQUFRLENBQUMsUUFBUSxLQUFLLEtBQUksQ0FBQyxRQUFRLEVBQW5DLENBQW1DLEVBQUUsNERBQTRELENBQUMsQ0FBQztZQUM3SCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFVBQVEsQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCw2QkFBUyxHQUFULFVBQVUsS0FBWTtRQUNwQixLQUFLLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFhLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILGtDQUFjLEdBQWQsVUFBZSxVQUFzQjtRQUNuQyxVQUFVLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN4RSxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLGlCQUFxQztRQUMvQyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQztnQkFDaEIscUZBQXFGO2dCQUNyRixJQUFJLFNBQVMsR0FBRyx5QkFBWSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLFdBQVcsQ0FBQztnQkFDMUcsTUFBTSxDQUFDLFNBQVMsS0FBSyxRQUFRLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxTQUFTLFlBQVksUUFBUSxDQUFDLFNBQVMsQ0FBQztZQUMvRixDQUFDLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztZQUMzQixNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xCLENBQUM7SUFDSCxDQUFDO0lBRUQsb0NBQWdCLEdBQWhCLFVBQWlCLFFBQXNCO1FBQ3JDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBQ3ZCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztZQUNsQixRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDN0MsSUFBSSxXQUFXLEdBQUc7Z0JBQ2hCLFFBQVEsRUFBRSxRQUFRO2FBQ25CLENBQUM7WUFDRixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLElBQUksT0FBTyxJQUFJLENBQUMsaUJBQWlCLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDekUsV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7Z0JBQzlDLFdBQVcsQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1lBQ2xDLENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsdUNBQW1CLEdBQW5CO1FBQ0UsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLHVCQUFVLENBQUMsU0FBUyxFQUFFO2dCQUN4QyxLQUFLLEVBQUUsc0NBQW9CO2dCQUMzQixLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUNuRCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7SUFDdkIsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQVk7UUFBakQsaUJBNkJDO1FBNUJDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLFdBQVc7WUFDWCxJQUFJLFNBQVMsR0FBUTtnQkFDbkIsc0JBQXNCLEVBQUUsSUFBSTthQUM3QixDQUFDO1lBQ0YsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLG1CQUFtQjtZQUN2RCxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7WUFDL0YsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNyQyxDQUFDO1lBRUQsU0FBUztZQUNULFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtnQkFDNUIsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ2xDLE1BQU0sQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFO2dCQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBQyxHQUFvQjtnQkFDeEQsTUFBTSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQWE7UUFDaEQsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDL0IsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUMsSUFBSSxHQUFHLElBQUksSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO2dCQUNsQixNQUFNLEVBQUUsSUFBSTtnQkFDWixPQUFPLEVBQUUsT0FBTztnQkFDaEIsSUFBSSxFQUFFLElBQUk7YUFDWCxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELHNDQUFrQixHQUFsQixVQUFtQixPQUFlO1FBQ2hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDcEQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELDJDQUEyQztRQUMzQyxJQUFJLElBQUksR0FBRyxzQkFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsc0NBQWtCLEdBQWxCLFVBQW1CLE9BQWUsRUFBRSxJQUFTO1FBQzNDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JELHNCQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sR0FBRyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDOUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDcEMsQ0FBQztJQUNILENBQUM7SUFFRCw2QkFBUyxHQUFULFVBQVUsUUFBc0I7UUFBaEMsaUJBbUNDO1FBbENDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsd0VBQXdFO1lBQ3hFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBSyxJQUFLLE9BQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7WUFFRCw2QkFBNkI7WUFDN0IsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM1Qix1Q0FBdUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDdEMsZ0NBQWdDO29CQUNoQyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsa0JBQWtCLEtBQUssS0FBSyxJQUFJLEtBQUksQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDckYsd0NBQXdDO3dCQUN4QyxLQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzt3QkFDNUIsS0FBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztvQkFDakMsQ0FBQztvQkFDRCxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM5QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxLQUFLO29CQUNiLGlFQUFpRTtvQkFDakUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUNYLDZDQUE2Qzt3QkFDN0MsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JDLENBQUM7b0JBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQU8sS0FBSyxDQUFDLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNULHdFQUF3RTtnQkFDeEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLEtBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0lBQzlCLENBQUM7SUFFRCxnQ0FBWSxHQUFaLFVBQWEsUUFBc0I7UUFBbkMsaUJBb0JDO1FBbkJDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNiLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQVUsUUFBUSxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCx3REFBd0Q7Z0JBQ2xELFFBQVEsQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQy9DLENBQUM7WUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNULEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEtBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLFFBQXNCLEVBQUUsR0FBb0I7UUFDdEQsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO1FBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsV0FBVyxFQUFiLENBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYztRQUN0RCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQzFELENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELDZCQUFTLEdBQVQsVUFBVSxRQUFzQixFQUFFLEdBQW9CO1FBQXRELGlCQXlEQztRQXhEQyxnRUFBZ0U7UUFDaEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBa0IsSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQWlCLENBQUM7UUFDdEIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMvQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QixvRUFBb0U7WUFDcEUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVO2FBQzNCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDM0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDcEQsS0FBSyxFQUFFLElBQUk7YUFDWixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNkLHlGQUF5RjtnQkFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsNkNBQTZDLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN2SCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRyxDQUFDO1lBQ0QsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNoRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPO2FBQzlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07Z0JBQ2QsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ2hCLENBQUM7Z0JBRUQsbURBQW1EO2dCQUNuRCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsSCxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLHdDQUF3QztZQUN4QyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ1osRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsS0FBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUVELG1DQUFtQztZQUNuQyxLQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyx3QkFBd0I7WUFDOUQsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNiLENBQUMsRUFBRSxVQUFDLEtBQVk7WUFDZCx5Q0FBeUM7WUFFekMsaUNBQWlDO1lBQ2pDLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDL0MsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVNLHdCQUFJLEdBQVgsVUFBWSxNQUFjLEVBQUUsS0FBeUIsRUFBRSxPQUFpQjtRQUF4RSxpQkFpSEM7UUFqSHNELHVCQUFpQixHQUFqQixZQUFpQjtRQUN0RSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQztZQUNILElBQUksUUFBUSxHQUFpQixLQUFLLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDakMsQ0FBQztZQUVELEVBQUUsQ0FBQyxDQUFDLHlCQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixvQ0FBb0M7Z0JBQ3BDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDM0MsSUFBSSxXQUFXLEdBQWdCLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQywrREFBK0Q7b0JBQ25ILEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDakIsMkJBQTJCO3dCQUMzQixXQUFXLEdBQUcsSUFBSSx5QkFBVyxDQUMzQixPQUFPLEVBQVMsK0RBQStEO3dCQUMvRSxLQUFLLENBQUMsT0FBTyxFQUFHLCtEQUErRDt3QkFDL0UsSUFBSSxDQUFZLCtEQUErRDt5QkFDaEYsQ0FBQzt3QkFDRixPQUFPLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztvQkFDcEMsQ0FBQztvQkFDRCxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ3RDLDhCQUE4Qjt3QkFDOUIsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7NEJBQ3RCLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ3hELENBQUM7d0JBQ0QsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQzt3QkFDMUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7b0JBQ2xDLENBQUM7Z0JBQ0gsQ0FBQztZQUNILENBQUM7WUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsZUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDMUIsMkNBQTJDO2dCQUMzQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNkLEVBQUUsQ0FBQyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7b0JBQ3hELENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ04sSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNwRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztvQkFDN0QsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLHNDQUFzQztnQkFDdEMsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztnQkFDL0UsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7WUFDN0QsQ0FBQztZQUVELDhGQUE4RjtZQUM5RixJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDdEQsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzFCLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEUsQ0FBQztZQUVELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLDRFQUE0RTtZQUM1RSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLFFBQVEsQ0FBQyxVQUFVLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3ZFLHFEQUFxRDtnQkFDckQsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7Z0JBQzlCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNsQixNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO29CQUM3RCxzREFBc0Q7b0JBQ3RELElBQUksR0FBRyxLQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUM7b0JBQ2pELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNyRCxvR0FBb0c7d0JBQ3BHLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ2QsQ0FBQztvQkFFRCwrQ0FBK0M7b0JBQy9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQzFCLE1BQU0sQ0FBQyxLQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7NEJBQzlDLHlDQUF5Qzs0QkFDekMsSUFBSSxNQUF1QixDQUFDOzRCQUM1QixFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dDQUMxQixNQUFNLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQzs0QkFDcEMsQ0FBQzs0QkFDRCxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQzt3QkFDeEIsQ0FBQyxFQUFFLFVBQUMsR0FBa0I7NEJBQ3BCLDBDQUEwQzs0QkFDMUMsSUFBSSxNQUF1QixDQUFDOzRCQUM1QixFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0NBQzVDLE1BQU0sR0FBRyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUN2QyxDQUFDOzRCQUNELE1BQU0sQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDO3dCQUN4QixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3ZCLENBQUMsQ0FBQyxVQUFVO29CQUVaLG9FQUFvRTtvQkFDcEUsdUVBQXVFO29CQUN2RSxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxHQUFrQjt3QkFDMUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDOzRCQUM1QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQUM7d0JBQzdDLENBQUM7d0JBRUQsOEJBQThCO3dCQUM5QixLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO3dCQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNkLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLDhFQUE4RTtnQkFDdEcsQ0FBQyxFQUFFO29CQUNELHFDQUFxQztvQkFDckMsTUFBTSxDQUFDLEtBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzVELENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELG1CQUFtQjtZQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM1RCxDQUFFO1FBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO1FBQzdELENBQUM7SUFDSCxDQUFDO0lBRU8sK0JBQVcsR0FBbkIsVUFBb0IsTUFBYyxFQUFFLEtBQXlCLEVBQUUsT0FBWSxFQUN2RCxRQUFzQjtRQUQxQyxpQkF1REM7UUFyREMsSUFBSSxPQUFPLEdBQVcsS0FBTSxDQUFDLGdCQUFnQixDQUFDO1FBQzlDLElBQUksSUFBSSxHQUFRLElBQUksQ0FBQztRQUNyQixJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDcEIsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNmLEtBQUssUUFBUSxDQUFDO1lBQ2QsS0FBSyxRQUFRO2dCQUNYLElBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDdkMsS0FBSyxDQUFDO1lBRVIsS0FBSyxPQUFPO2dCQUNWLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2QixNQUFNLENBQUM7Z0JBQ1QsQ0FBQztnQkFDRCxJQUFJLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztvQkFDbEIsS0FBSyxFQUFFLE9BQU87aUJBQ2YsQ0FBQyxDQUFDO2dCQUNILEtBQUssQ0FBQztZQUVSLEtBQUssUUFBUTtnQkFDWCxLQUFLLENBQUM7WUFFUjtnQkFDRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBRSxjQUFNLE9BQUEsTUFBTSxLQUFLLE1BQU0sRUFBakIsQ0FBaUIsRUFBRSxrQkFBa0IsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDekUsUUFBUSxHQUFHLEtBQUssQ0FBQztnQkFDakIsS0FBSyxDQUFDO1FBQ1YsQ0FBQztRQUNELElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM3QyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsS0FBSyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsTUFBTSxFQUFoQyxDQUFnQyxDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUF2QixDQUF1QixFQUFFLDZDQUE2QyxDQUFDLENBQUM7UUFDaEcsSUFBSSxHQUFHLEdBQW9CO1lBQ3pCLEdBQUcsRUFBRSxNQUFNLEdBQUcsR0FBRyxHQUFXLEtBQU0sQ0FBQyxFQUFFO1lBQ3JDLEVBQUUsRUFBVSxLQUFNLENBQUMsRUFBRTtZQUNyQixNQUFNLEVBQUUsTUFBTTtZQUNkLElBQUksRUFBRSxJQUFJO1lBQ1YsMEdBQTBHO1lBQzFHLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUTtZQUMzQixJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtTQUNqQixDQUFDO1FBRUYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN2QixJQUFJLFFBQXlDLENBQUM7UUFDOUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNiLHNDQUFzQztZQUN0QyxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUE2QjtnQkFDOUMscURBQXFEO2dCQUNyRCxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQXFCO1lBQ2xDLHVFQUF1RTtZQUN2RSxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDckUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZ0NBQVksR0FBcEIsVUFBcUIsUUFBc0IsRUFBRSxHQUFvQixFQUFFLE9BQVksRUFDMUQsS0FBeUIsRUFBRSxRQUF5QztRQUR6RixpQkE4Q0M7UUEzQ0MsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMvQixJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdELElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQztRQUVkLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDYiwrQ0FBK0M7WUFDL0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO2dCQUNkLHlDQUF5QztnQkFDekMsTUFBTSxDQUFDLEtBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxLQUFvQjtvQkFDNUUsS0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtvQkFDOUUsTUFBTSxDQUFDLElBQUksQ0FBQztnQkFDZCxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7WUFDdEQsQ0FBQyxFQUFFLFVBQUMsR0FBa0I7Z0JBQ3BCLCtDQUErQztnQkFDL0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLEtBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7b0JBQzlDLHNGQUFzRjtvQkFDdEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3QixDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLGlEQUFpRDtvQkFDakQsTUFBTSxDQUFDLEtBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxLQUFvQjt3QkFDNUUsS0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLDhCQUE4Qjt3QkFDOUUsTUFBTSxDQUFDLEdBQUcsQ0FBQztvQkFDYixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3JCLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxDQUFDLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7WUFDZiw4QkFBOEI7WUFDOUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7Z0JBQ2hCLHlDQUF5QztnQkFDekMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQkFDMUIsTUFBTSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xDLENBQUM7WUFDSCxDQUFDLEVBQUUsVUFBQyxHQUFrQjtnQkFDcEIsMENBQTBDO2dCQUMxQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQzVDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNyQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxnQ0FBWSxHQUFwQixVQUFxQixRQUFzQixFQUFFLEdBQW9CLEVBQUUsT0FBWSxFQUMxRCxLQUF5QjtRQUQ5QyxpQkFrRUM7UUFoRUMsT0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDeEIsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsaUNBQWlDO1FBRXJELElBQUksR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ1QsR0FBRyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDdkIsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RDLGtCQUFrQjtnQkFDbEIsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuRSxDQUFDO1lBQ0QsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLElBQUkseUJBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELDBCQUEwQjtnQkFDMUIsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUM7Z0JBQ3RFLElBQUksVUFBVSxHQUFHLGFBQWEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2hELElBQUksUUFBUSxHQUFHLElBQUksbUJBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEQsc0dBQXNHO2dCQUN0RyxRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztnQkFDdEIsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3ZCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUN2QixRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDdkIsSUFBSSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUN6QyxFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDcEIsR0FBRyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQ3hDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7d0JBQ2QsR0FBRyxJQUFJLEdBQUcsR0FBRyxTQUFTLENBQUM7b0JBQ3pCLENBQUM7Z0JBQ0gsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO3dCQUNkLEdBQUcsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDO29CQUN6QixDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQztRQUVELDJDQUEyQztRQUMzQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7UUFDMUQsSUFBSSxJQUFJLEdBQVE7WUFDZCwwRUFBMEU7WUFDMUUsR0FBRyxFQUFFLEdBQUc7WUFDUixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZixLQUFLLEVBQUUsRUFBRTtZQUNULFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztZQUNoQyxvQkFBb0I7WUFDcEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO1NBQ3JCLENBQUM7UUFFRixpREFBaUQ7UUFDakQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLEdBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFO1lBQzdDLFNBQVMsRUFBRSxLQUFJLENBQUMsU0FBUztTQUMxQixDQUFDLEtBQUssS0FBSSxDQUFDLFNBQVMsRUFGRyxDQUVILENBQUMsQ0FBQztRQUN2QixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNyRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw0RUFBNEUsQ0FBQyxDQUFDO1lBQzlGLElBQU0sS0FBSyxHQUFrQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3pDLGdDQUFnQztZQUNoQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBRUQsc0NBQXNDO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNqRCwyQ0FBMkM7Z0JBQzNDLE9BQU8sQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQztZQUN6QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtDQUFjLEdBQXRCLFVBQTBCLElBQWtCLEVBQUUsUUFBc0IsRUFBRSxHQUFvQixFQUNoRSxPQUFZLEVBQUUsS0FBeUI7UUFEakUsaUJBbUhDO1FBakhDLGtDQUFrQztRQUNsQyxJQUFJLFVBQVUsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBYTtZQUM3QiwyQ0FBMkM7WUFDM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUNsQixDQUFDO1lBRUQsMkJBQTJCO1lBQzNCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ1QsNENBQTRDO2dCQUM1Qyw4Q0FBOEM7Z0JBQzlDLElBQUksUUFBUSxHQUFpQyxFQUFFLENBQUM7Z0JBQ2hELElBQUksT0FBWSxDQUFDLENBQUMsOEJBQThCO2dCQUNoRCxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzFCLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFvQixDQUFDLENBQUMsUUFBUSxDQUFDO3dCQUN0SCxJQUFJLEVBQUUsSUFBSSxDQUFDLHdCQUF3QjtxQkFDcEMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDYixDQUFDO2dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyx5QkFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN0RCx5REFBeUQ7b0JBQ3pELElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDakIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBQyxDQUFDO3dCQUNyQixPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDcEIsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsT0FBTyxHQUFHLEVBQUUsQ0FBQztvQkFDYixJQUFJLENBQUMsT0FBTyxDQUFDLFVBQUMsQ0FBTTt3QkFDbEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDTixJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQzs0QkFDOUQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDaEIsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNwQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dDQUNOLGtCQUFrQjtnQ0FDbEIsT0FBTyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7Z0NBQ2xELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO29DQUNoRSw0RkFBNEY7b0NBQzVGLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7d0NBQ2hFLEVBQUUsRUFBRSxFQUFFO3dDQUNOLE1BQU0sRUFBRSxRQUFRO3dDQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7d0NBQ2QsSUFBSSxFQUFFLENBQUM7cUNBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDUCxDQUFDOzRCQUNILENBQUM7NEJBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ04sa0JBQWtCO2dDQUNsQixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO29DQUNoRSxFQUFFLEVBQUUsRUFBRTtvQ0FDTixNQUFNLEVBQUUsUUFBUTtvQ0FDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO29DQUNkLElBQUksRUFBRSxDQUFDO2lDQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ1AsQ0FBQzt3QkFDSCxDQUFDO29CQUNILENBQUMsQ0FBQyxDQUFDO29CQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQUMsRUFBRTt3QkFDOUIsa0JBQWtCO3dCQUNsQixJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ3BCLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUU7NEJBQ2hFLEVBQUUsRUFBRSxFQUFFOzRCQUNOLE1BQU0sRUFBRSxRQUFROzRCQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7NEJBQ2QsSUFBSSxFQUFFLENBQUMsQ0FBQyxVQUFVO3lCQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNQLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sMENBQTBDO29CQUMxQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUNoRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzt3QkFDdEMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDaEIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzs0QkFDVCxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO2dDQUNoRSxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHO2dDQUM5RCxNQUFNLEVBQUUsUUFBUTtnQ0FDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO2dDQUNkLElBQUksRUFBRSxJQUFJOzZCQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ1AsQ0FBQztvQkFDSCxDQUFDO2dCQUNILENBQUM7Z0JBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMxQixtQ0FBbUM7b0JBQ25DLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzt3QkFDYixNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNkLENBQUM7b0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLHlCQUFZLENBQUMsS0FBSyxDQUFDLEVBQW5CLENBQW1CLENBQUMsQ0FBQztvQkFFN0Msb0dBQW9HO29CQUNwRyxvR0FBb0c7b0JBQ3BHLElBQUksUUFBUSxHQUFVLEVBQUUsQ0FBQztvQkFDekIsSUFBSSxNQUFNLEdBQUcseUJBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQzFELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFJLENBQUM7d0JBQ3RDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDbEIsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ2xCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDOzRCQUM1QixPQUFPLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ3JCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDeEIsS0FBSyxDQUFDOzRCQUNSLENBQUM7d0JBQ0gsQ0FBQztvQkFDSCxDQUFDO29CQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzVCLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLFFBQVE7WUFDZixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSx5QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQseUVBQXlFO2dCQUN6RSxLQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQztZQUN4RCxDQUFDO1lBQ0Qsa0NBQWtDO1lBQ2xDLE1BQU0sQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUM7UUFDM0QsQ0FBQyxFQUFFLFVBQUMsS0FBb0I7WUFDdEIsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsS0FBYTtRQUExRCxpQkErQ0M7UUEvQzRDLHFCQUFhLEdBQWIsYUFBYTtRQUN4RCxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQWEsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUM7UUFDOUMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxRSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxzQ0FBc0MsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBYSxTQUFTLENBQUMsQ0FBQztRQUNyRCxDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxnQ0FBZ0MsQ0FBQyxDQUFDO1FBQzVELElBQUksT0FBTyxHQUFlLElBQVUsSUFBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNqRSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFHO1lBQ3hFLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBa0M7Z0JBQ3RELEdBQUcsRUFBRSxHQUFHO2dCQUNSLEtBQUssRUFBRSxFQUFFO2dCQUVULE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTztvQkFDaEMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQTRCOzRCQUN4QyxJQUFJLEdBQUcsR0FBb0IsTUFBTSxDQUFDLFVBQVUsQ0FBQzs0QkFDN0MsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDNUQsQ0FBQyxDQUFDLENBQUM7b0JBQ0wsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDTixvQ0FBb0M7d0JBQ3BDLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7b0JBQ3hDLENBQUM7b0JBQ0QsTUFBTSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNqQyxDQUFDO2FBQ0YsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO1FBQ0gsUUFBUSxDQUFDLHNCQUFzQixHQUFHLE9BQU8sQ0FBQztRQUMxQyxRQUFRLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVPLG1DQUFlLEdBQXZCLFVBQXdCLFFBQXNCO1FBQTlDLGlCQXVDQztRQXRDQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsMkJBQTJCLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUNqQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLElBQUksYUFBSyxFQUFFLENBQUM7UUFDdkIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRCxJQUFJLEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQzNCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN6QyxHQUFHLElBQUksR0FBRyxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFHO1lBQ2hELE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBNkIsQ0FBQztnQkFDL0MsR0FBRyxFQUFFLEdBQUc7Z0JBQ1IsT0FBTyxFQUFFLFVBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPO29CQUNoQyx3Q0FBd0M7b0JBQ3hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUM5QixLQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBQzlELENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNuRCxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQzdDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQzt3QkFDakQsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7NEJBQ3pCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQ3RELENBQUM7b0JBQ0gsQ0FBQztvQkFDRCxNQUFNLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUM7Z0JBQ2pDLENBQUM7YUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QixDQUFDLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyx5QkFBeUIsR0FBRyxPQUFPLENBQUM7UUFDN0MsUUFBUSxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztRQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDTywrQ0FBMkIsR0FBckMsVUFBc0MsS0FBWSxFQUFFLE9BQTZCLEVBQUUsT0FNbEY7UUFORCxpQkF5RUM7UUFsRUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1gscUNBQXFDO1lBQ3JDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLDRDQUE0QztnQkFDNUMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2Isa0ZBQWtGO29CQUNsRixrRkFBa0Y7b0JBQ2xGLDJDQUEyQztvQkFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO1lBQ0gsQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksYUFBSyxDQUFDO1FBQzNDLElBQUksS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDN0MsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRSxJQUFJLFlBQVksR0FBRztZQUNqQix5REFBeUQ7WUFDekQsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyx3RkFBd0YsR0FBRyxPQUFPLEdBQUcsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNILENBQUMsQ0FBQztRQUNGLElBQUksWUFBWSxHQUFHO1lBQ2pCLDBCQUEwQjtZQUMxQixLQUFLLEVBQUUsT0FBTyxDQUFDLFVBQVU7U0FDMUIsQ0FBQztRQUNGLElBQUksYUFBYSxHQUFRO1lBQ3ZCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixLQUFLLEVBQUUsRUFBRSxDQUFDLDZCQUE2QjtTQUN4QyxDQUFDO1FBQ0YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixhQUFhLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFFOUksQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsTUFBTSxDQUF1QixLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBRSxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7WUFDakUscUhBQXFIO1lBQ3JILE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUQsQ0FBQyxFQUFFLFVBQUMsU0FBd0I7WUFDMUIsb0lBQW9JO1lBQ3BJLElBQU0sVUFBVSxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLEtBQUssR0FBRyxDQUFDLENBQUMsWUFBWTtnQkFDdEIsS0FBSyxHQUFHLENBQUMsQ0FBQyxlQUFlO2dCQUN6QixLQUFLLEdBQUc7b0JBQ04sa0ZBQWtGO29CQUNsRixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztnQkFDdEU7b0JBQ0UsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3JELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNLLGlDQUFhLEdBQXJCO1FBQUEsaUJBeUZDO1FBeEZDLGdCQUFnQjtRQUNoQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFhLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxzR0FBc0c7UUFDdEcscUZBQXFGO1FBQ3JGLElBQUksV0FBVyxHQUFHO1lBQ2hCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUMsS0FBSSxDQUFDLFFBQVEsQ0FBQztZQUN2QixDQUFDO1lBRUQsSUFBSSxPQUFPLEdBQXlCLEtBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDWixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQ0QsSUFBSSxRQUFRLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUM7WUFDdkIsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxRQUFRLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQTNDLENBQTJDLEVBQUUsc0JBQXNCLEdBQUcsUUFBUSxDQUFDLE9BQU8sR0FBRyxxQ0FBcUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakwsSUFBSSxHQUFHLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXpELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLElBQUksYUFBSyxDQUFDO1lBQzVDLElBQUksS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2xDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTthQUN4QixDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkUsSUFBSSxhQUFhLEdBQVE7Z0JBQ3ZCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsS0FBSyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkI7YUFDeEMsQ0FBQztZQUNGLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNiLGFBQWEsQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLE9BQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFFLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUU5SSxDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxJQUFJLGNBQWMsR0FBRztnQkFDbkIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN2QixTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2FBQ2hDLENBQUM7WUFDRixNQUFNLENBQUMsS0FBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDM0gsWUFBWTtnQkFDWixNQUFNLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekUsQ0FBQyxFQUFFLFVBQUMsS0FBb0I7Z0JBQ3RCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUNyQixnQkFBZ0I7b0JBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxNQUFNO3dCQUN0RixpREFBaUQ7d0JBQ2pELEtBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUMxQyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hELENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04scUNBQXFDO29CQUNyQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDTiw2REFBNkQ7Z0JBQzdELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUM3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDUCwrQkFBK0I7WUFDL0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBa0M7Z0JBQ3pELFNBQVMsRUFBRTtvQkFDVCxXQUFXO29CQUNYLE9BQU87b0JBQ1AsS0FBSztpQkFDTjthQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3QyxrQkFBa0I7WUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNqQyxtQkFBbUI7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsSUFBZ0M7UUFBN0UsaUJBcUJDO1FBcEJDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBb0I7WUFDcEMsSUFBSSxPQUFrQyxDQUFDO1lBQ3ZDLElBQUksRUFBRSxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN0QyxJQUFJLE9BQU8sR0FBeUIsRUFBRSxJQUEwQixLQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0RixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNaLHdEQUF3RDtnQkFDeEQsT0FBTyxHQUE4QjtvQkFDbkMsS0FBSyxFQUFFLElBQUk7aUJBQ1osQ0FBQztZQUNKLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTiwrREFBK0Q7Z0JBQy9ELE9BQU8sR0FBRyxJQUFJLEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtvQkFDckMsVUFBVSxFQUFFLEtBQUksQ0FBQyxRQUFRO29CQUN6QixLQUFLLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO2lCQUMzQixDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGlDQUFhLEdBQXJCLFVBQXNCLFFBQXNCLEVBQUUsR0FBb0IsRUFBRSxRQUF5QztRQUE3RyxpQkF1QkM7UUF0QkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUE2QjtZQUNqRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsSUFBSSxFQUFFLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDUix3QkFBd0I7b0JBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QixDQUFDO2dCQUVELE9BQU8sR0FBeUIsS0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDYixPQUFPLEdBQUcsSUFBSSxLQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDaEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3FCQUNiLEVBQUU7d0JBQ0QsVUFBVSxFQUFFLEtBQUksQ0FBQyxRQUFRO3dCQUN6QixLQUFLLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO3FCQUMzQixDQUFDLENBQUM7Z0JBQ0wsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSx5QkFBSyxHQUFaLFVBQWEsVUFBc0I7UUFDakMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksUUFBUSxHQUFpQixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFCLENBQUM7Z0JBQ0QsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNJLHlCQUFLLEdBQVo7UUFDRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDdkIsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0lBQ0gsQ0FBQztJQUNILGdCQUFDO0FBQUQsQ0FBQyxBQTdwQ0QsQ0FBK0IsYUFBSyxHQTZwQ25DO0FBN3BDWSxpQkFBUyxZQTZwQ3JCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVDLEtBQUssRUFBRSw2QkFBNkI7SUFFcEMsVUFBVSxFQUFFLHlCQUFXO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyNC4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIEJhY2tib25lIGZyb20gJ2JhY2tib25lJztcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIG9iamVjdGlkIGZyb20gJy4uL2NvcmUvb2JqZWN0aWQnO1xuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xuaW1wb3J0ICogYXMgd2ViIGZyb20gJy4uL3dlYic7XG5cbmltcG9ydCB7bG9jYWxTdG9yYWdlfSBmcm9tICcuLi93ZWIvb2ZmbGluZSc7XG5pbXBvcnQge0dldFF1ZXJ5fSBmcm9tICcuLi9xdWVyeS9HZXRRdWVyeSc7XG5pbXBvcnQge1N0b3JlLCBTdG9yZUN0b3J9IGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XG5pbXBvcnQge1N5bmNDb250ZXh0fSBmcm9tICcuL1N5bmNDb250ZXh0JztcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZSwgTGl2ZURhdGFNZXNzYWdlTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3RvciwgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb24sIGlzQ29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcblxuLyoqXG4gKiBpbyBvZiBicm93c2VyIHZpYSBzY3JpcHQgdGFnIG9yIHZpYSByZXF1aXJlIHNvY2tldC5pby1jbGllbnQsIGVudGlyZWx5IG9wdGlvbmFsLlxuICpcbiAqIE5vdGljZSwgdGhpcyBtb2R1bGUgaXMgZW50aXJlbHkgb3B0aW9uYWwgYXMgdGhlIHN0b3JlIG1heSBvcGVyYXRlIHdpdGhvdXQgaXQgaWYgc29ja2V0XG4gKiBub3RpZmljYXRpb25zIGFyZSBub3QgdXNlZC5cbiAqXG4gKiBAaW50ZXJuYWwgTm90IHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXG4gKi9cbmV4cG9ydCBjb25zdCBpbzogU29ja2V0SU9DbGllbnRTdGF0aWMgPSBnbG9iYWxbJ2lvJ10gfHwgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uXG4gIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nICYmICAgICAgICAgICAgICAgICAgICAgIC8vIG9yIHdoZW4gcmVxdWlyZSBpcyBhdmFpbGFibGVcbiAgKChmdW5jdGlvbiByZXF1aXJlU29ja2V0SW8oKSB7ICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVxdWlyZWQgdmVyc2lvblxuICAgIC8vIGhlcmUgd2UgYXJlIGluIGFuIGltbWVkaWF0ZWx5IGludm9rZWQgZnVuY3Rpb24gcmVxdWlyaW5nIHNvY2tldC5pby1jbGllbnQsIGlmIGF2YWlsYWJsZVxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gKGdsb2JhbFsnaW8nXSA9IHJlcXVpcmUoJ3NvY2tldC5pby1jbGllbnQnKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGRpYWcuZGVidWcud2Fybignb3B0aW9uYWwgc29ja2V0LmlvLWNsaWVudCBtb2R1bGUgaXMgbm90IGF2YWlsYWJsZTogJyArIGVycm9yICYmIGVycm9yLm1lc3NhZ2UpO1xuICAgIH1cbiAgfSkoKSk7XG5cbi8qKlxuICogY29ubmVjdHMgYSBNb2RlbC9Db2xsZWN0aW9uIHRvIGEgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIFRoaXMgd2lsbCBnaXZlIHlvdSBhbiBvbmxpbmUgYW5kIG9mZmxpbmUgc3RvcmUgd2l0aCBsaXZlIGRhdGEgdXBkYXRlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGEganNvbixcbiAqIC8vIGFuZCB0aGUgb2ZmbGluZSBjaGFuZ2UgbG9nIHRvIGEgbG9jYWwgV2ViU3FsIGRhdGFiYXNlLCBzeW5jaHJvbml6ZSBpdFxuICogLy8gdHJvdWdoIFJFU1QgY2FsbHMgd2l0aCB0aGUgc2VydmVyIGFuZCByZWNlaXZlIGxpdmUgdXBkYXRlcyB2aWEgYSBzb2NrZXQuaW8gY29ubmVjdGlvbi5cbiAqIGNsYXNzIE15Q29sbGVjdGlvbiBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24ge307XG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLm1vZGVsID0gTXlNb2RlbDtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUudXJsID0gJ2h0dHA6Ly9teVNlcnZlci5pby9teU9yZ2EvbXlBcHBsaWNhdGlvbi9teUNvbGxlY3Rpb24nO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IG5ldyBSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUoe1xuICogICB1c2VMb2NhbFN0b3JlOiB0cnVlLCAgICAgLy8gKGRlZmF1bHQpIHN0b3JlIHRoZSBkYXRhIGZvciBvZmZsaW5lIHVzZVxuICogICB1c2VTb2NrZXROb3RpZnk6IHRydWUsICAgLy8gKGRlZmF1bHQpIHJlZ2lzdGVyIGF0IHRoZSBzZXJ2ZXIgZm9yIGxpdmUgdXBkYXRlc1xuICogICB1c2VPZmZsaW5lQ2hhbmdlczogdHJ1ZSAgLy8gKGRlZmF1bHQpIGFsbG93IGNoYW5nZXMgdG8gdGhlIG9mZmxpbmUgZGF0YVxuICogfSk7XG4gKi9cbmV4cG9ydCBjbGFzcyBTeW5jU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XG5cbiAgLy8gZm9sbG93aW5nIGFyZSBzdG9yZS1zcGVjaWZpYyBvcHRpb25zLCBkZWZhdWx0cyBzdG9yZWQgaW4gcHJvdG90eXBlIGF0IGVuZCBvZiB0aGlzIGZpbGVcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmU6IFN0b3JlQ3RvcjtcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmVPcHRpb25zOiBhbnk7XG4gIHByb3RlY3RlZCB1c2VMb2NhbFN0b3JlOiBib29sZWFuO1xuICBwcm90ZWN0ZWQgdXNlU29ja2V0Tm90aWZ5OiBib29sZWFuO1xuICBwcm90ZWN0ZWQgdXNlT2ZmbGluZUNoYW5nZXM6IGJvb2xlYW47XG4gIHByb3RlY3RlZCBzb2NrZXRQYXRoOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzb2NrZXRRdWVyeTogc3RyaW5nO1xuICBwcm90ZWN0ZWQgY3JlZGVudGlhbHM6IGFueTtcbiAgcHJvdGVjdGVkIG9yZGVyT2ZmbGluZUNoYW5nZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBzZXJ2ZXIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RvcmUuXG4gICAqXG4gICAqIFRoZSBzeW5jIG1ldGhvZCB3aWxsIGZhaWwgZWFybHkgd2hlbiBiZWluZyBhcHBsaWVkIHRvIGRhdGEgb2Ygc29tZSBvdGhlciBzZXJ2ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgc2VydmVyVXJsOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBhcHBsaWNhdGlvbiBwYXJ0IHVzZWQgdG8gcmVzb2x2ZSBVUkxzIG1heSBvcHRpb25hbGx5IGJlIHNldCB1c2luZyBjb25zdHJ1Y3RvciBvcHRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFwcGxpY2F0aW9uOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBpZGVudGl0eSBvciB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxuICAgKlxuICAgKiBUaGUgYWpheCBtZXRob2Qgd2lsbCBzaW11bGF0ZSBhbiBvZmZsaW5lIHRpbWVvdXQgd2hlbiB0aGUgdXNlciBpZGVudGl0eSBpcyBjaGFuZ2VkLiBUaGlzIGlzXG4gICAqIGJlY2F1c2UganVzdCBvbmUgc2Vzc2lvbiBjYW4gYmUgbWFpbnRhaW5lZCBwZXIgc2VydmVyIGFuZCBsb2dpbi9sb2dvdXQgc2VtYW50aWNzIG11c3QgYmUgd2VsbFxuICAgKiBiZWhhdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHVzZXJVdWlkOiBzdHJpbmc7XG5cbiAgcHVibGljIGVuZHBvaW50czoge1xuICAgIC8vIG1hcCBvZiBlbnRpdHkgdG8gU3luY0VuZHBvaW50XG4gICAgW2VudGl0eTogc3RyaW5nXTogU3luY0VuZHBvaW50O1xuICB9ID0ge307XG5cbiAgcHJpdmF0ZSBsYXN0TWVzZ1RpbWU6IGFueTtcblxuICAvKipcbiAgICogd2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBlbnRpdHkgY2F1c2VkIGEgZGlzY29ubmVjdGlvbi5cbiAgICpcbiAgICogPHA+XG4gICAqIFRoaXMgaXMgc2V0IHRvIGFuIGVudGl0eSBuYW1lIHRvIGxpbWl0IHdoaWNoIGVudGl0eSBtYXkgY2F1c2UgYSBjaGFuZ2UgdG8gb25saW5lIHN0YXRlIGFnYWluLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBwcml2YXRlIGRpc2Nvbm5lY3RlZEVudGl0eTogc3RyaW5nID0gJ2FsbCc7XG5cbiAgcHVibGljIG1lc3NhZ2VzOiBDb2xsZWN0aW9uO1xuICBwdWJsaWMgbWVzc2FnZXNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IGFueSkge1xuICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgIGlmICh0aGlzLmNyZWRlbnRpYWxzKSB7XG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gXy5jbG9uZSh0aGlzLmNyZWRlbnRpYWxzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKSB7XG4gICAgICB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgPSBfLmNsb25lKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIHR5cGVvZiBpbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybmluZygnU29ja2V0LklPIG5vdCBwcmVzZW50ICEhJyk7XG4gICAgICB0aGlzLnVzZVNvY2tldE5vdGlmeSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBvdmVyd3JpdHRlbiB0byByZXNvbHZlIHJlbGF0aXZlIFVSTHMgYWdhaW5zdCB0aGUgU3luY1N0b3JlI3NlcnZlclVybC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVXJsKHVybDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHdlYi5yZXNvbHZlVXJsKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybCxcbiAgICAgIGFwcGxpY2F0aW9uOiB0aGlzLmFwcGxpY2F0aW9uXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogYmluZHMgdGhlIHN0b3JlIHRvIGEgdGFyZ2V0IHNlcnZlciB3aGVuIHRoZSBmaXJzdCBlbmRwb2ludCBpcyBjcmVhdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsUm9vdCB1c2VkIHRvIHJlc29sdmUgdGhlIHNlcnZlciB0byBvcGVyYXRlLlxuICAgICAqL1xuICBwcml2YXRlIGluaXRTZXJ2ZXIodXJsUm9vdDogc3RyaW5nKSB7XG4gICAgbGV0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKHVybFJvb3QsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuc2VydmVyVXJsKSB7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgICAgIHRoaXMuc2VydmVyVXJsID0gc2VydmVyVXJsO1xuICAgICAgdGhpcy51c2VyVXVpZCA9IHNlcnZlci5hdXRob3JpemF0aW9uLm5hbWU7XG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiAhdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscykge1xuICAgICAgICAvLyBjYXB0dXJlIGNyZWRlbnRpYWxzIGZvciB1c2UgYnkgY3J5cHRvIHN0b3Jlc1xuICAgICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzID0gXy5kZWZhdWx0cyh7XG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcbiAgICAgICAgfSwgc2VydmVyLmNyZWRlbnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RvcmUgaXMgYm91bmQgdG8gc2VydmVyICcgKyB0aGlzLnNlcnZlclVybCArICcgYWxyZWFkeScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTZXJ2ZXIodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8c3RyaW5nPiB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gd2ViLnJlc29sdmVTZXJ2ZXIodXJsLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcbiAgICBpZiAoc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHRoaXMuc2VydmVyVXJsKS5hdXRob3JpemF0aW9uLm5hbWUgIT09IHRoaXMudXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIG9wdGlvbnMgJiYgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgUS5yZWplY3Q8c3RyaW5nPihlcnJvcik7XG4gICAgfVxuICAgIHJldHVybiBRLnJlc29sdmUodXJsKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpbml0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbiwgbW9kZWxUeXBlOiBNb2RlbEN0b3IpOiBTeW5jRW5kcG9pbnQge1xuICAgIGxldCB1cmxSb290ID0gbW9kZWxPckNvbGxlY3Rpb24uZ2V0VXJsUm9vdCgpO1xuICAgIGxldCBlbnRpdHkgPSBtb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHk7XG4gICAgaWYgKHVybFJvb3QgJiYgZW50aXR5KSB7XG4gICAgICAvLyBnZXQgb3IgY3JlYXRlIGVuZHBvaW50IGZvciB0aGlzIHVybFxuICAgICAgdGhpcy5pbml0U2VydmVyKHVybFJvb3QpO1xuICAgICAgdXJsUm9vdCA9IHRoaXMucmVzb2x2ZVVybCh1cmxSb290KTtcbiAgICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW2VudGl0eV07XG4gICAgICBpZiAoIWVuZHBvaW50KSB7XG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmluaXRFbmRwb2ludDogJyArIGVudGl0eSk7XG4gICAgICAgIGVuZHBvaW50ID0gbmV3IFN5bmNFbmRwb2ludCh7XG4gICAgICAgICAgZW50aXR5OiBlbnRpdHksXG4gICAgICAgICAgbW9kZWxUeXBlOiBtb2RlbFR5cGUsXG4gICAgICAgICAgdXJsUm9vdDogdXJsUm9vdCxcbiAgICAgICAgICBzb2NrZXRQYXRoOiB0aGlzLnNvY2tldFBhdGgsXG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzW2VudGl0eV0gPSBlbmRwb2ludDtcblxuICAgICAgICBlbmRwb2ludC5sb2NhbFN0b3JlID0gdGhpcy5jcmVhdGVMb2NhbFN0b3JlKGVuZHBvaW50KTtcbiAgICAgICAgZW5kcG9pbnQucHJpb3JpdHkgPSB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgJiYgKF8ubGFzdEluZGV4T2YodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzLCBlbmRwb2ludC5lbnRpdHkpICsgMSk7XG4gICAgICAgIHRoaXMuY3JlYXRlTXNnQ29sbGVjdGlvbigpO1xuICAgICAgICBlbmRwb2ludC5zb2NrZXQgPSB0aGlzLmNyZWF0ZVNvY2tldChlbmRwb2ludCwgZW50aXR5KTtcbiAgICAgICAgZW5kcG9pbnQuaW5mbyA9IHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGNvbmZpZ3VyYXRpb24gY2FuIG5vdCBjaGFuZ2UsIG11c3QgcmVjcmVhdGUgc3RvcmUgaW5zdGVhZC4uLlxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC51cmxSb290ID09PSB1cmxSb290LCAnY2FuIG5vdCBjaGFuZ2UgdXJsUm9vdCwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC51c2VyVXVpZCA9PT0gdGhpcy51c2VyVXVpZCwgJ2NhbiBub3QgY2hhbmdlIHVzZXIgaWRlbnRpdHksIG11c3QgcmVjcmVhdGUgc3RvcmUgaW5zdGVhZCEnKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICpcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBNb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIGluaXRNb2RlbChtb2RlbDogTW9kZWwpOiB2b2lkIHtcbiAgICBtb2RlbC5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KG1vZGVsLCA8TW9kZWxDdG9yPm1vZGVsLmNvbnN0cnVjdG9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IENvbGxlY3Rpb24gY29uc3RydWN0b3IuXG4gICAqL1xuICBpbml0Q29sbGVjdGlvbihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKTogdm9pZCB7XG4gICAgY29sbGVjdGlvbi5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KGNvbGxlY3Rpb24sIGNvbGxlY3Rpb24ubW9kZWwpO1xuICB9XG5cbiAgZ2V0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbik6IFN5bmNFbmRwb2ludCB7XG4gICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbbW9kZWxPckNvbGxlY3Rpb24uZW50aXR5XTtcbiAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcbiAgICAgICAgLy8gY2hlY2tzIHRoYXQgbW9kZWxPckNvbGxlY3Rpb24gdXNlcyBhIG1vZGVsIGluaGVyaXRpbmcgZnJvbSB0aGUgb25lIG9mIHRoZSBlbmRwb2ludFxuICAgICAgICBsZXQgbW9kZWxUeXBlID0gaXNDb2xsZWN0aW9uKG1vZGVsT3JDb2xsZWN0aW9uKSA/IG1vZGVsT3JDb2xsZWN0aW9uLm1vZGVsIDogbW9kZWxPckNvbGxlY3Rpb24uY29uc3RydWN0b3I7XG4gICAgICAgIHJldHVybiBtb2RlbFR5cGUgPT09IGVuZHBvaW50Lm1vZGVsVHlwZSB8fCBtb2RlbFR5cGUucHJvdG90eXBlIGluc3RhbmNlb2YgZW5kcG9pbnQubW9kZWxUeXBlO1xuICAgICAgfSwgJ3dyb25nIHR5cGUgb2YgbW9kZWwhJyk7XG4gICAgICByZXR1cm4gZW5kcG9pbnQ7XG4gICAgfVxuICB9XG5cbiAgY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludDogU3luY0VuZHBvaW50KTogU3RvcmUge1xuICAgIGlmICh0aGlzLnVzZUxvY2FsU3RvcmUpIHtcbiAgICAgIHZhciBlbnRpdGllcyA9IHt9O1xuICAgICAgZW50aXRpZXNbZW5kcG9pbnQuZW50aXR5XSA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgICB2YXIgc3RvcmVPcHRpb24gPSB7XG4gICAgICAgIGVudGl0aWVzOiBlbnRpdGllc1xuICAgICAgfTtcbiAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zICYmIHR5cGVvZiB0aGlzLmxvY2FsU3RvcmVPcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgICBzdG9yZU9wdGlvbiA9IF8uY2xvbmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyk7XG4gICAgICAgIHN0b3JlT3B0aW9uLmVudGl0aWVzID0gZW50aXRpZXM7XG4gICAgICB9XG4gICAgICByZXR1cm4gbmV3IHRoaXMubG9jYWxTdG9yZShzdG9yZU9wdGlvbik7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBkZXNjcmlwdGlvbiBIZXJlIHdlIHNhdmUgdGhlIGNoYW5nZXMgaW4gYSBNZXNzYWdlIGxvY2FsIHdlYnNxbFxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIGNyZWF0ZU1zZ0NvbGxlY3Rpb24oKTogQ29sbGVjdGlvbiB7XG4gICAgaWYgKHRoaXMudXNlT2ZmbGluZUNoYW5nZXMgJiYgIXRoaXMubWVzc2FnZXMpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgQ29sbGVjdGlvbih1bmRlZmluZWQsIHtcbiAgICAgICAgbW9kZWw6IExpdmVEYXRhTWVzc2FnZU1vZGVsLFxuICAgICAgICBzdG9yZTogbmV3IHRoaXMubG9jYWxTdG9yZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzO1xuICB9XG5cbiAgY3JlYXRlU29ja2V0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG5hbWU6IHN0cmluZykge1xuICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSAmJiBlbmRwb2ludCAmJiBlbmRwb2ludC5zb2NrZXRQYXRoKSB7XG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuY3JlYXRlU29ja2V0OiAnICsgbmFtZSk7XG5cbiAgICAgIC8vIHJlc291cmNlXG4gICAgICBsZXQgY29ubmVjdFZvOiBhbnkgPSB7XG4gICAgICAgICdmb3JjZSBuZXcgY29ubmVjdGlvbic6IHRydWVcbiAgICAgIH07XG4gICAgICBsZXQgcmVzb3VyY2UgPSBlbmRwb2ludC5zb2NrZXRQYXRoOyAvLyByZW1vdmUgbGVhZGluZyAvXG4gICAgICBjb25uZWN0Vm8ucmVzb3VyY2UgPSAocmVzb3VyY2UgJiYgcmVzb3VyY2UuaW5kZXhPZignLycpID09PSAwKSA/IHJlc291cmNlLnN1YnN0cigxKSA6IHJlc291cmNlO1xuICAgICAgaWYgKHRoaXMuc29ja2V0UXVlcnkpIHtcbiAgICAgICAgY29ubmVjdFZvLnF1ZXJ5ID0gdGhpcy5zb2NrZXRRdWVyeTtcbiAgICAgIH1cblxuICAgICAgLy8gc29ja2V0XG4gICAgICBlbmRwb2ludC5zb2NrZXQgPSBpby5jb25uZWN0KGVuZHBvaW50Lmhvc3QsIGNvbm5lY3RWbyk7XG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIHRoaXMuX2JpbmRDaGFubmVsKGVuZHBvaW50LCBuYW1lKTtcbiAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVuZHBvaW50KS5kb25lKCk7XG4gICAgICB9KTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignZGlzY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzb2NrZXQuaW86IGRpc2Nvbm5lY3QnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS5kb25lKCk7XG4gICAgICB9KTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbihlbmRwb2ludC5jaGFubmVsLCAobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtc2cpKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGVuZHBvaW50LnNvY2tldDtcbiAgICB9XG4gIH1cblxuICBfYmluZENoYW5uZWwoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZT86IHN0cmluZykge1xuICAgIGlmIChlbmRwb2ludCAmJiBlbmRwb2ludC5zb2NrZXQpIHtcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fYmluZENoYW5uZWw6ICcgKyBuYW1lKTtcblxuICAgICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgdmFyIHNvY2tldCA9IGVuZHBvaW50LnNvY2tldDtcbiAgICAgIHZhciB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbmRwb2ludC5lbnRpdHk7XG4gICAgICBzb2NrZXQuZW1pdCgnYmluZCcsIHtcbiAgICAgICAgZW50aXR5OiBuYW1lLFxuICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxuICAgICAgICB0aW1lOiB0aW1lXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nKTogYW55IHtcbiAgICBpZiAoIXRoaXMubGFzdE1lc2dUaW1lKSB7XG4gICAgICB0aGlzLmxhc3RNZXNnVGltZSA9IHt9O1xuICAgIH0gZWxzZSBpZiAodGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdO1xuICAgIH1cbiAgICAvLyB0aGUgfCAwIGJlbG93IHR1cm5zIHN0cmluZ3MgaW50byBudW1iZXJzXG4gICAgdmFyIHRpbWUgPSBsb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCdfXycgKyBjaGFubmVsICsgJ2xhc3RNZXNnVGltZScpIHx8IDA7XG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgIHJldHVybiB0aW1lO1xuICB9XG5cbiAgc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWw6IHN0cmluZywgdGltZTogYW55KTogdm9pZCB7XG4gICAgaWYgKCF0aW1lIHx8IHRpbWUgPiB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKSkge1xuICAgICAgbG9jYWxTdG9yYWdlKCkuc2V0SXRlbSgnX18nICsgY2hhbm5lbCArICdsYXN0TWVzZ1RpbWUnLCB0aW1lKTtcbiAgICAgIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdID0gdGltZTtcbiAgICB9XG4gIH1cblxuICBvbkNvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgLy8gd2hlbiBvZmZsaW5lIHRyYW5zbWlzc2lvbiBpcyBwZW5kaW5nLCBuZWVkIHRvIHdhaXQgZm9yIGl0IHRvIGNvbXBsZXRlXG4gICAgICBsZXQgcSA9IFEucmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlICYmIHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUGVuZGluZygpKSB7XG4gICAgICAgIHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZS5jYXRjaCgoZXJyb3IpID0+IFEucmVzb2x2ZSh1bmRlZmluZWQpKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luYyBzZXJ2ZXIvY2xpZW50IGNoYW5nZXNcbiAgICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gcS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gbmV4dCB3ZSdsbCBmZXRjaCBzZXJ2ZXItc2lkZSBjaGFuZ2VzXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgLy8gdGhlbiBzZW5kIGNsaWVudC1zaWRlIGNoYW5nZXNcbiAgICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09ICdhbGwnIHx8IHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpIHtcbiAgICAgICAgICAgIC8vIHJlc3RhcnQgcmVwbGF5aW5nIG9mIG9mZmxpbmUgbWVzc2FnZXNcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3NlbmRNZXNzYWdlcygpO1xuICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAvLyBjYXRjaCB3aXRob3V0IGVycm9yIGluZGljYXRlcyBkaXNjb25uZWN0aW9uIHdoaWxlIGdvaW5nIG9ubGluZVxuICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIGRpc2Nvbm5lY3RlZCB3aGlsZSBzZW5kaW5nIG9mZmxpbmUgY2hhbmdlc1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gaW4gdGhlIGVuZCwgd2hlbiBjb25uZWN0ZWQgc3RpbGwsIGZpcmUgYW4gZXZlbnQgaW5mb3JtaW5nIGNsaWVudCBjb2RlXG4gICAgICAgIGlmIChlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIHRoaXMudHJpZ2dlcignY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZW5kcG9pbnQuaXNDb25uZWN0ZWQ7XG4gIH1cblxuICBvbkRpc2Nvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBlbmRwb2ludC5pc0Nvbm5lY3RlZCA9IG51bGw7XG4gICAgaWYgKCF0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSAnYWxsJztcbiAgICB9XG5cbiAgICByZXR1cm4gUS5mY2FsbCgoKSA9PiB7XG4gICAgICBpZiAoZW5kcG9pbnQuc29ja2V0ICYmICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0KSB7XG4gICAgICAgIC8vIGNvbnNpZGVyIGNhbGxpbmcgZW5kcG9pbnQuc29ja2V0LmRpc2Nvbm5lY3QoKSBpbnN0ZWFkXG4gICAgICAgICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0Lm9uRGlzY29ubmVjdCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdkaXNjb25uZWN0OicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIF9maXhNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlKTogTGl2ZURhdGFNZXNzYWdlIHtcbiAgICBsZXQgaWRBdHRyaWJ1dGUgPSBlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlO1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhaWRBdHRyaWJ1dGUsICdubyBpZEF0dHJpYnV0ZSEnKTtcblxuICAgIGlmIChtc2cuZGF0YSAmJiAhbXNnLmRhdGFbaWRBdHRyaWJ1dGVdICYmIG1zZy5kYXRhLl9pZCkge1xuICAgICAgbXNnLmRhdGFbaWRBdHRyaWJ1dGVdID0gbXNnLmRhdGEuX2lkOyAvLyBzZXJ2ZXIgYnVnIVxuICAgIH0gZWxzZSBpZiAoIW1zZy5kYXRhICYmIG1zZy5tZXRob2QgPT09ICdkZWxldGUnICYmIG1zZ1tpZEF0dHJpYnV0ZV0pIHtcbiAgICAgIG1zZy5kYXRhID0ge307XG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2dbaWRBdHRyaWJ1dGVdOyAvLyBzZXJ2ZXIgYnVnIVxuICAgIH1cbiAgICByZXR1cm4gbXNnO1xuICB9XG5cbiAgb25NZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlKTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT4ge1xuICAgIC8vIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBzdG9yZSBpdHNlbGYgZm9yIGEgcGFydGljdWxhciBlbmRwb2ludCFcbiAgICBpZiAoIW1zZyB8fCAhbXNnLm1ldGhvZCkge1xuICAgICAgcmV0dXJuIFEucmVqZWN0PExpdmVEYXRhTWVzc2FnZT4obmV3IEVycm9yKCdubyBtZXNzYWdlIG9yIG1ldGhvZCBnaXZlbicpKTtcbiAgICB9XG5cbiAgICB2YXIgcTogUS5Qcm9taXNlPGFueT47XG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIGlmIChlbmRwb2ludC5sb2NhbFN0b3JlKSB7XG4gICAgICAvLyBmaXJzdCB1cGRhdGUgdGhlIGxvY2FsIHN0b3JlIGJ5IGZvcm1pbmcgYSBtb2RlbCBhbmQgaW52b2tpbmcgc3luY1xuICAgICAgdmFyIG9wdGlvbnMgPSBfLmRlZmF1bHRzKHtcbiAgICAgICAgc3RvcmU6IGVuZHBvaW50LmxvY2FsU3RvcmVcbiAgICAgIH0sIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgICAgdmFyIG1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShtc2cuZGF0YSwgXy5leHRlbmQoe1xuICAgICAgICBwYXJzZTogdHJ1ZVxuICAgICAgfSwgb3B0aW9ucykpO1xuICAgICAgaWYgKCFtb2RlbC5pZCkge1xuICAgICAgICAvLyBjb2RlIGJlbG93IHdpbGwgcGVyc2lzdCB3aXRoIGF1dG8tYXNzaWduZWQgaWQgYnV0IHRoaXMgbmV2ZXJ0aGVsZXNzIGlzIGEgYnJva2VuIHJlY29yZFxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnIHJlY2VpdmVkIGRhdGEgd2l0aCBubyB2YWxpZCBpZCBwZXJmb3JtaW5nICcgKyBtc2cubWV0aG9kICsgJyEnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpYWcuZGVidWcuZGVidWcoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgJyArIG1vZGVsLmlkICsgJyBwZXJmb3JtaW5nICcgKyBtc2cubWV0aG9kKTtcbiAgICAgIH1cbiAgICAgIHEgPSBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIF8uZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgbWVyZ2U6IG1zZy5tZXRob2QgPT09ICdwYXRjaCdcbiAgICAgIH0pKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKCFtc2cuaWQgfHwgbXNnLmlkID09PSBtb2RlbC5pZCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZCB2YWx1ZSB3YXMgcmVhc3NpZ25lZCwgZGVsZXRlIHJlY29yZCBvZiBvbGQgaWRcbiAgICAgICAgdmFyIG9sZERhdGEgPSB7fTtcbiAgICAgICAgb2xkRGF0YVttb2RlbC5pZEF0dHJpYnV0ZV0gPSBtc2cuaWQ7XG4gICAgICAgIHZhciBvbGRNb2RlbCA9IG5ldyBlbmRwb2ludC5tb2RlbFR5cGUob2xkRGF0YSwgb3B0aW9ucyk7XG4gICAgICAgIGRpYWcuZGVidWcuZGVidWcoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgJyArIG1vZGVsLmlkICsgJyByZWFzc2lnbmVkIGZyb20gb2xkIHJlY29yZCAnICsgb2xkTW9kZWwuaWQpO1xuICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKCdkZWxldGUnLCBvbGRNb2RlbCwgb3B0aW9ucyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8ganVzdCB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xuICAgICAgcSA9IFEucmVzb2x2ZShtc2cpO1xuICAgIH1cblxuICAgIC8vIGZpbmFsbHkgc2V0IHRoZSBtZXNzYWdlIHRpbWVcbiAgICByZXR1cm4gcS50aGVuKCgpID0+IHtcbiAgICAgIGlmIChtc2cudGltZSkge1xuICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCBtc2cudGltZSk7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBhbGwgY29sbGVjdGlvbnMgbGlzdGVuaW5nXG4gICAgICB0aGlzLnRyaWdnZXIoJ3N5bmM6JyArIGNoYW5uZWwsIG1zZyk7IC8vIFN5bmNDb250ZXh0Lm9uTWVzc2FnZVxuICAgICAgcmV0dXJuIG1zZztcbiAgICB9LCAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAvLyBub3Qgc2V0dGluZyBtZXNzYWdlIHRpbWUgaW4gZXJyb3IgY2FzZVxuXG4gICAgICAvLyByZXBvcnQgZXJyb3IgYXMgZXZlbnQgb24gc3RvcmVcbiAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XG4gICAgICByZXR1cm4gbXNnO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIHN5bmMobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSA9IHt9KTogUS5Qcm9taXNlPGFueT4ge1xuICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5zeW5jJyk7XG4gICAgdHJ5IHtcbiAgICAgIHZhciBlbmRwb2ludDogU3luY0VuZHBvaW50ID0gbW9kZWwuZW5kcG9pbnQgfHwgdGhpcy5nZXRFbmRwb2ludChtb2RlbCk7XG4gICAgICBpZiAoIWVuZHBvaW50KSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gZW5kcG9pbnQnKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcbiAgICAgICAgLy8gY29sbGVjdGlvbnMgY2FuIGJlIGZpbHRlcmVkLCBldGMuXG4gICAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiAhb3B0aW9ucy5iYXJlYm9uZSkge1xuICAgICAgICAgIHZhciBzeW5jQ29udGV4dDogU3luY0NvbnRleHQgPSBvcHRpb25zLnN5bmNDb250ZXh0OyAvLyBzeW5jIGNhbiBiZSBjYWxsZWQgYnkgU3luY0NvbnRleHQgaXRzZWxmIHdoZW4gcGFnaW5nIHJlc3VsdHNcbiAgICAgICAgICBpZiAoIXN5bmNDb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBjYXB0dXJlIEdldFF1ZXJ5IG9wdGlvbnNcbiAgICAgICAgICAgIHN5bmNDb250ZXh0ID0gbmV3IFN5bmNDb250ZXh0KFxuICAgICAgICAgICAgICBvcHRpb25zLCAgICAgICAgLy8gZHluYW1pYyBvcHRpb25zIHBhc3NlZCB0byBmZXRjaCgpIGltcGxlbWVudCBVSSBmaWx0ZXJzLCBldGMuXG4gICAgICAgICAgICAgIG1vZGVsLm9wdGlvbnMsICAvLyBzdGF0aWMgb3B0aW9ucyBvbiBjb2xsZWN0aW9uIGltcGxlbWVudCBzY3JlZW4tc3BlY2lmaWMgc3R1ZmZcbiAgICAgICAgICAgICAgdGhpcyAgICAgICAgICAgIC8vIHN0YXRpYyBvcHRpb25zIG9mIHRoaXMgc3RvcmUgcmVhbGl6ZSBmaWx0ZXJpbmcgY2xpZW50L3NlcnZlclxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIG9wdGlvbnMuc3luY0NvbnRleHQgPSBzeW5jQ29udGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1vZGVsLnN5bmNDb250ZXh0ICE9PSBzeW5jQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gYXNzaWduIGEgZGlmZmVyZW50IGluc3RhbmNlXG4gICAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgICAgbW9kZWwuc3RvcExpc3RlbmluZyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5Ubyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCwgXy5iaW5kKHN5bmNDb250ZXh0Lm9uTWVzc2FnZSwgc3luY0NvbnRleHQsIHRoaXMsIG1vZGVsKSk7XG4gICAgICAgICAgICBtb2RlbC5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChpc01vZGVsKG1vZGVsKSkge1xuICAgICAgICAvLyBvZmZsaW5lIGNhcGFiaWxpdHkgcmVxdWlyZXMgSURzIGZvciBkYXRhXG4gICAgICAgIGlmICghbW9kZWwuaWQpIHtcbiAgICAgICAgICBpZiAobWV0aG9kID09PSAnY3JlYXRlJykge1xuICAgICAgICAgICAgbW9kZWwuc2V0KG1vZGVsLmlkQXR0cmlidXRlLCBvYmplY3RpZC5tYWtlT2JqZWN0SUQoKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcignbm8gKHZhbGlkKSBpZDogJyArIG1vZGVsLmlkKTtcbiAgICAgICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzb21ldGhpbmcgaXMgcmVhbGx5IGF0IG9kZHMgaGVyZS4uLlxuICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoJ3RhcmdldCBvZiBzeW5jIGlzIG5laXRoZXIgYSBtb2RlbCBub3IgYSBjb2xsZWN0aW9uIT8hJyk7XG4gICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIGF0IHRoaXMgcG9pbnQgdGhlIHRhcmdldCBzZXJ2ZXIgaXMga25vd24sIGNoZWNrIG1ha2luZyBzdXJlIHRoZSBjb3JyZWN0IHNlcnZlciBpcyBiZWluZyBoaXRcbiAgICAgIGNvbnN0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKG1vZGVsLmdldFVybFJvb3QoKSwge1xuICAgICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgICB9KTtcbiAgICAgIGlmIChzZXJ2ZXJVcmwgIT09IHRoaXMuc2VydmVyVXJsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc3RvcmUgaXMgYm91bmQgdG8gc2VydmVyICcgKyB0aGlzLnNlcnZlclVybCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHZhciB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XG4gICAgICAvLyBvbmx5IHNlbmQgcmVhZCBtZXNzYWdlcyBpZiBubyBvdGhlciBzdG9yZSBjYW4gZG8gdGhpcyBvciBmb3IgaW5pdGlhbCBsb2FkXG4gICAgICBpZiAobWV0aG9kID09PSAncmVhZCcgJiYgZW5kcG9pbnQubG9jYWxTdG9yZSAmJiB0aW1lICYmICFvcHRpb25zLnJlc2V0KSB7XG4gICAgICAgIC8vIHJlYWQgZGF0YSBmcm9tIGxvY2FsU3RvcmUgYW5kIGZldGNoIGNoYW5nZXMgcmVtb3RlXG4gICAgICAgIHZhciBvcHRzID0gXy5jbG9uZShvcHRpb25zKTtcbiAgICAgICAgb3B0cy5zdG9yZSA9IGVuZHBvaW50LmxvY2FsU3RvcmU7XG4gICAgICAgIG9wdHMuZW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICBkZWxldGUgb3B0cy5zdWNjZXNzO1xuICAgICAgICBkZWxldGUgb3B0cy5lcnJvcjtcbiAgICAgICAgcmV0dXJuIGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtZXRob2QsIG1vZGVsLCBvcHRzKS50aGVuKChyZXNwKSA9PiB7XG4gICAgICAgICAgLy8gYmFja2JvbmUgc3VjY2VzcyBjYWxsYmFjayBhbHRlcnMgdGhlIGNvbGxlY3Rpb24gbm93XG4gICAgICAgICAgcmVzcCA9IHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXNwKSB8fCByZXNwO1xuICAgICAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgfHwgb3B0aW9ucy5mZXRjaE1vZGUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gZmV0Y2ggY2hhbmdlcyBhcyB3ZSBnb3QgYSB3ZWJzb2NrZXQsIHRoYXQgaXMgZWl0aGVyIGNvbm5lY3RlZCBvciBhdHRlbXB0cyByZWNvbm5lY3Rpb25cbiAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIHdoZW4gd2UgYXJlIGRpc2Nvbm5lY3RlZCwgdHJ5IHRvIGNvbm5lY3Qgbm93XG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KS50aGVuKChpbmZvKTogYW55ID0+IHtcbiAgICAgICAgICAgICAgLy8gdHJpZ2dlciByZWNvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xuICAgICAgICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgaW5mbztcbiAgICAgICAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgLy8gdHJpZ2dlciBkaXNjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcbiAgICAgICAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IHJlc3A7XG4gICAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICB9IC8vIGVsc2UuLi5cblxuICAgICAgICAgIC8vIGxvYWQgY2hhbmdlcyBvbmx5ICh3aWxsIGhhcHBlbiBBRlRFUiBzdWNjZXNzIGNhbGxiYWNrIGlzIGludm9rZWQsXG4gICAgICAgICAgLy8gYnV0IHJldHVybmVkIHByb21pc2Ugd2lsbCByZXNvbHZlIG9ubHkgYWZ0ZXIgY2hhbmdlcyB3ZXJlIHByb2Nlc3NlZC5cbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQpLmNhdGNoKCh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KSB8fCByZXNwO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIHhociwgbW9kZWwpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7IC8vIGNhbGxlciBleHBlY3RzIG9yaWdpbmFsIFhIUiByZXNwb25zZSBhcyBjaGFuZ2VzIGJvZHkgZGF0YSBpcyBOT1QgY29tcGF0aWJsZVxuICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgLy8gZmFsbC1iYWNrIHRvIGxvYWRpbmcgZnVsbCBkYXRhIHNldFxuICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIGRvIGJhY2tib25lIHJlc3RcbiAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIFEucmVqZWN0KHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hZGRNZXNzYWdlKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICB2YXIgY2hhbmdlcyA9ICg8TW9kZWw+bW9kZWwpLmNoYW5nZWRTaW5jZVN5bmM7XG4gICAgdmFyIGRhdGE6IGFueSA9IG51bGw7XG4gICAgdmFyIHN0b3JlTXNnID0gdHJ1ZTtcbiAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgIGRhdGEgPSBvcHRpb25zLmF0dHJzIHx8IG1vZGVsLnRvSlNPTigpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncGF0Y2gnOlxuICAgICAgICBpZiAoXy5pc0VtcHR5KGNoYW5nZXMpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEgPSBtb2RlbC50b0pTT04oe1xuICAgICAgICAgIGF0dHJzOiBjaGFuZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0ICgoKSA9PiBtZXRob2QgPT09ICdyZWFkJywgJ3Vua25vd24gbWV0aG9kOiAnICsgbWV0aG9kKTtcbiAgICAgICAgc3RvcmVNc2cgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxldCBlbnRpdHkgPSBtb2RlbC5lbnRpdHkgfHwgZW5kcG9pbnQuZW50aXR5O1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLmVudGl0eSA9PT0gZW5kcG9pbnQuZW50aXR5KTtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbnRpdHkuaW5kZXhPZignficpIDwgMCwgJ2VudGl0eSBuYW1lIG11c3Qgbm90IGNvbnRhaW4gYSB+IGNoYXJhY3RlciEnKTtcbiAgICB2YXIgbXNnOiBMaXZlRGF0YU1lc3NhZ2UgPSB7XG4gICAgICBfaWQ6IGVudGl0eSArICd+JyArICg8TW9kZWw+bW9kZWwpLmlkLFxuICAgICAgaWQ6ICg8TW9kZWw+bW9kZWwpLmlkLFxuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICBkYXRhOiBkYXRhLFxuICAgICAgLy8gY2hhbm5lbDogZW5kcG9pbnQuY2hhbm5lbCwgLy8gY2hhbm5lbCBpcyBoYWNrZWQgaW4gYnkgc3RvcmVNZXNzYWdlKCksIHdlIGRvbid0IHdhbnQgdG8gdXNlIHRoaXMgYW55bW9yZVxuICAgICAgcHJpb3JpdHk6IGVuZHBvaW50LnByaW9yaXR5LFxuICAgICAgdGltZTogRGF0ZS5ub3coKVxuICAgIH07XG5cbiAgICB2YXIgcSA9IFEucmVzb2x2ZShtc2cpO1xuICAgIHZhciBxTWVzc2FnZTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPjtcbiAgICBpZiAoc3RvcmVNc2cpIHtcbiAgICAgIC8vIHN0b3JlIGFuZCBwb3RlbnRpYWxseSBtZXJnZSBtZXNzYWdlXG4gICAgICBxTWVzc2FnZSA9IHRoaXMuc3RvcmVNZXNzYWdlKGVuZHBvaW50LCBxKTtcbiAgICAgIHEgPSBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xuICAgICAgICAvLyBpbiBjYXNlIG9mIG1lcmdpbmcsIHRoaXMgcmVzdWx0IGNvdWxkIGJlIGRpZmZlcmVudFxuICAgICAgICByZXR1cm4gbWVzc2FnZS5hdHRyaWJ1dGVzO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBxLnRoZW4oKG1zZzI6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xuICAgICAgLy8gcGFzcyBpbiBxTWVzc2FnZSBzbyB0aGF0IGRlbGV0aW9uIG9mIHN0b3JlZCBtZXNzYWdlIGNhbiBiZSBzY2hlZHVsZWRcbiAgICAgIHJldHVybiB0aGlzLl9lbWl0TWVzc2FnZShlbmRwb2ludCwgbXNnMiwgb3B0aW9ucywgbW9kZWwsIHFNZXNzYWdlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTpcbiAgUS5Qcm9taXNlPGFueT4ge1xuICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICB2YXIgcUFqYXggPSB0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XG4gICAgdmFyIHEgPSBxQWpheDtcblxuICAgIGlmIChxTWVzc2FnZSkge1xuICAgICAgLy8gZm9sbG93aW5nIHRha2VzIGNhcmUgb2Ygb2ZmbGluZSBjaGFuZ2Ugc3RvcmVcbiAgICAgIHEgPSBxLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgLy8gc3VjY2VzcywgcmVtb3ZlIG1lc3NhZ2Ugc3RvcmVkLCBpZiBhbnlcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTWVzc2FnZShlbmRwb2ludCwgbXNnLCBxTWVzc2FnZSkuY2F0Y2goKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0pLnRoZW5SZXNvbHZlKGRhdGEpOyAvLyByZXNvbHZlIGFnYWluIHlpZWxkaW5nIGRhdGFcbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgLy8gZmFpbHVyZSBldmVudHVhbGx5IGNhdWdodCBieSBvZmZsaW5lIGNoYW5nZXNcbiAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiB0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzKSB7XG4gICAgICAgICAgLy8gdGhpcyBzZWFtcyB0byBiZSBvbmx5IGEgY29ubmVjdGlvbiBwcm9ibGVtLCBzbyB3ZSBrZWVwIHRoZSBtZXNzYWdlIGFuZCBjYWxsIHN1Y2Nlc3NcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyByZW1vdmUgbWVzc2FnZSBzdG9yZWQgYW5kIGtlZXAgcmVqZWN0aW9uIGFzIGlzXG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTWVzc2FnZShlbmRwb2ludCwgbXNnLCBxTWVzc2FnZSkuY2F0Y2goKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpOyAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgfSkudGhlblJlamVjdCh4aHIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBxID0gdGhpcy5fYXBwbHlSZXNwb25zZShxLCBlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XG5cbiAgICByZXR1cm4gcS5maW5hbGx5KCgpID0+IHtcbiAgICAgIC8vIGRvIHNvbWUgY29ubmVjdGlvbiBoYW5kbGluZ1xuICAgICAgcmV0dXJuIHFBamF4LnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyB0cmlnZ2VyIHJlY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAvLyB0cmlnZ2VyIGRpc2Nvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWpheE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBkZWxldGUgb3B0aW9ucy54aHI7IC8vIG1ha2Ugc3VyZSBub3QgdG8gdXNlIG9sZCB2YWx1ZVxuXG4gICAgdmFyIHVybCA9IG9wdGlvbnMudXJsO1xuICAgIGlmICghdXJsKSB7XG4gICAgICB1cmwgPSBlbmRwb2ludC51cmxSb290O1xuICAgICAgaWYgKG1zZy5pZCAmJiBtc2cubWV0aG9kICE9PSAnY3JlYXRlJykge1xuICAgICAgICAvLyBhZGQgSUQgb2YgbW9kZWxcbiAgICAgICAgdXJsICs9ICh1cmwuY2hhckF0KHVybC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1zZy5pZDtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBhZGQgcXVlcnkgb2YgY29sbGVjdGlvblxuICAgICAgICB2YXIgY29sbGVjdGlvblVybCA9IF8uaXNGdW5jdGlvbihtb2RlbC51cmwpID8gbW9kZWwudXJsKCkgOiBtb2RlbC51cmw7XG4gICAgICAgIHZhciBxdWVyeUluZGV4ID0gY29sbGVjdGlvblVybC5sYXN0SW5kZXhPZignPycpO1xuICAgICAgICB2YXIgZ2V0UXVlcnkgPSBuZXcgR2V0UXVlcnkoKS5mcm9tSlNPTihvcHRpb25zKTtcbiAgICAgICAgLy8gY3VycmVudGx5IG9ubHkgc29ydE9yZGVyIGNhbiBiZSBzdXBwb3J0ZWQgYXMgd2UgcmVxdWlyZSB0aGUgaW5pdGlhbCBkYXRhIGxvYWQgdG8geWllbGQgZnVsbCBkYXRhc2V0XG4gICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkub2Zmc2V0ID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkuZmlsdGVyID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkuZmllbGRzID0gbnVsbDtcbiAgICAgICAgdmFyIGdldFBhcmFtcyA9IGdldFF1ZXJ5LnRvUXVlcnlQYXJhbXMoKTtcbiAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPj0gMCkge1xuICAgICAgICAgIHVybCArPSBjb2xsZWN0aW9uVXJsLnN1YnN0cihxdWVyeUluZGV4KTtcbiAgICAgICAgICBpZiAoZ2V0UGFyYW1zKSB7XG4gICAgICAgICAgICB1cmwgKz0gJyYnICsgZ2V0UGFyYW1zO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZ2V0UGFyYW1zKSB7XG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgZ2V0UGFyYW1zO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGVhcmxpZXN0IHBvaW50IHdoZXJlIHRhcmdldCBVUkwgaXMga25vd25cbiAgICBkaWFnLmRlYnVnLmRlYnVnKCdhamF4TWVzc2FnZSAnICsgbXNnLm1ldGhvZCArICcgJyArIHVybCk7XG4gICAgdmFyIG9wdHM6IGFueSA9IHtcbiAgICAgIC8vIG11c3Qgbm90IHRha2UgYXJiaXRyYXJ5IG9wdGlvbnMgYXMgdGhlc2Ugd29uJ3QgYmUgcmVwbGF5ZWQgb24gcmVjb25uZWN0XG4gICAgICB1cmw6IHVybCxcbiAgICAgIGF0dHJzOiBtc2cuZGF0YSxcbiAgICAgIHN0b3JlOiB7fSwgLy8gZW5zdXJlcyBuZXR3b3JrIGlzIHVzZWRcbiAgICAgIGNyZWRlbnRpYWxzOiBvcHRpb25zLmNyZWRlbnRpYWxzLFxuICAgICAgLy8gZXJyb3IgcHJvcGFnYXRpb25cbiAgICAgIGVycm9yOiBvcHRpb25zLmVycm9yXG4gICAgfTtcblxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCB3cm9uZyBzZXJ2ZXIgYW5kIHVzZXIgaWRlbnRpdHlcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KSA9PT0gdGhpcy5zZXJ2ZXJVcmwpO1xuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCd1c2VyIGlkZW50aXR5IHdhcyBjaGFuZ2VkLCB3b3JraW5nIG9mZmxpbmUgdW50aWwgYXV0aG9yaXphdGlvbiBpcyByZXN0b3JlZCcpO1xuICAgICAgY29uc3QgZXJyb3I6IHdlYi5IdHRwRXJyb3IgPSBuZXcgRXJyb3IoKTtcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihvcHRzLCBlcnJvcikgfHwgUS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIGFjdHVhbCBhamF4IHJlcXVlc3QgdmlhIGJhY2tib25lLmpzXG4gICAgcmV0dXJuIHRoaXMuY2hlY2tTZXJ2ZXIodXJsLCBvcHRzKS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiBtb2RlbC5zeW5jKG1zZy5tZXRob2QsIG1vZGVsLCBvcHRzKS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gdGFrZSBvdmVyIHhociByZXNvbHZpbmcgdGhlIG9wdGlvbnMgY29weVxuICAgICAgICBvcHRpb25zLnhociA9IG9wdHMueGhyLnhociB8fCBvcHRzLnhocjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXBwbHlSZXNwb25zZTxUPihxWEhSOiBRLlByb21pc2U8VD4sIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IGFueSwgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxUPiB7XG4gICAgLy8gdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIHZhciBjbGllbnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgcmV0dXJuIHFYSFIudGhlbigoZGF0YTogVCB8IGFueSkgPT4ge1xuICAgICAgLy8gZGVsZXRlIG9uIHNlcnZlciBkb2VzIG5vdCByZXNwb25kIGEgYm9keVxuICAgICAgaWYgKCFkYXRhICYmIG1zZy5tZXRob2QgPT09ICdkZWxldGUnKSB7XG4gICAgICAgIGRhdGEgPSBtc2cuZGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIGxvY2FsIHN0b3JlIHN0YXRlXG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICAvLyBubyBkYXRhIGlmIHNlcnZlciBhc2tzIG5vdCB0byBhbHRlciBzdGF0ZVxuICAgICAgICAvLyB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCBtc2cudGltZSk7XG4gICAgICAgIHZhciBwcm9taXNlczogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT5bXSA9IFtdO1xuICAgICAgICB2YXIgZGF0YUlkczogYW55OyAvLyBtb2RlbCBpZCAtPiBhdHRyaWJ1dGVzIGRhdGFcbiAgICAgICAgaWYgKG1zZy5tZXRob2QgIT09ICdyZWFkJykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIGRhdGEgPT09IG1zZy5kYXRhID8gbXNnIDogPExpdmVEYXRhTWVzc2FnZT5fLmRlZmF1bHRzKHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgLy8ganVzdCBhY2NlcHRzIG5ldyBkYXRhXG4gICAgICAgICAgfSwgbXNnKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbGxlY3Rpb24obW9kZWwpICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAvLyBzeW5jaHJvbml6ZSB0aGUgY29sbGVjdGlvbiBjb250ZW50cyB3aXRoIHRoZSBkYXRhIHJlYWRcbiAgICAgICAgICB2YXIgc3luY0lkcyA9IHt9O1xuICAgICAgICAgIG1vZGVsLm1vZGVscy5mb3JFYWNoKChtKSA9PiB7XG4gICAgICAgICAgICBzeW5jSWRzW20uaWRdID0gbTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBkYXRhSWRzID0ge307XG4gICAgICAgICAgZGF0YS5mb3JFYWNoKChkOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGRbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZC5faWQ7XG4gICAgICAgICAgICAgIGRhdGFJZHNbaWRdID0gZDtcbiAgICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcbiAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGl0ZW1cbiAgICAgICAgICAgICAgICBkZWxldGUgc3luY0lkc1tpZF07IC8vIHNvIHRoYXQgaXQgaXMgZGVsZXRlZCBiZWxvd1xuICAgICAgICAgICAgICAgIGlmICghXy5pc0VxdWFsKF8ucGljay5jYWxsKG0sIG0uYXR0cmlidXRlcywgT2JqZWN0LmtleXMoZCkpLCBkKSkge1xuICAgICAgICAgICAgICAgICAgLy8gYWJvdmUgY2hlY2tlZCB0aGF0IGFsbCBhdHRyaWJ1dGVzIGluIGQgYXJlIGluIG0gd2l0aCBlcXVhbCB2YWx1ZXMgYW5kIGZvdW5kIHNvbWUgbWlzbWF0Y2hcbiAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICd1cGRhdGUnLFxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogZFxuICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIHRoZSBpdGVtXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnY3JlYXRlJyxcbiAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICAgICAgZGF0YTogZFxuICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBPYmplY3Qua2V5cyhzeW5jSWRzKS5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgLy8gZGVsZXRlIHRoZSBpdGVtXG4gICAgICAgICAgICB2YXIgbSA9IHN5bmNJZHNbaWRdO1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG1ldGhvZDogJ2RlbGV0ZScsXG4gICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICBkYXRhOiBtLmF0dHJpYnV0ZXNcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdHJpZ2dlciBhbiB1cGRhdGUgdG8gbG9hZCB0aGUgZGF0YSByZWFkXG4gICAgICAgICAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbZGF0YV07XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZGF0YSA9IGFycmF5W2ldO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgIGlkOiBkYXRhW2VuZHBvaW50Lm1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGVdIHx8IGRhdGEuX2lkLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXG4gICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIC8vIGRlbGF5ZWQgdGlsbCBvcGVyYXRpb25zIGNvbXBsZXRlXG4gICAgICAgICAgaWYgKCFkYXRhSWRzKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKG1vZGVsKSk7XG5cbiAgICAgICAgICAvLyB3aGVuIGNvbGxlY3Rpb24gd2FzIHVwZGF0ZWQgb25seSBwYXNzIGRhdGEgb2YgbW9kZWxzIHRoYXQgd2VyZSBzeW5jZWQgb24gdG8gdGhlIHN1Y2Nlc3MgY2FsbGJhY2ssXG4gICAgICAgICAgLy8gYXMgdGhlIGNhbGxiYWNrIHdpbGwgc2V0IHRoZSBtb2RlbHMgYWdhaW4gY2F1c2luZyBvdXIgc29ydGluZyBhbmQgZmlsdGVyaW5nIHRvIGJlIHdpdGhvdXQgZWZmZWN0LlxuICAgICAgICAgIHZhciByZXNwb25zZTogYW55W10gPSBbXTtcbiAgICAgICAgICBsZXQgbW9kZWxzID0gaXNDb2xsZWN0aW9uKG1vZGVsKSA/IG1vZGVsLm1vZGVscyA6IFttb2RlbF07XG4gICAgICAgICAgZm9yIChsZXQgaSA9IG1vZGVscy5sZW5ndGg7IGktLSA+IDA7ICkge1xuICAgICAgICAgICAgdmFyIG0gPSBtb2RlbHNbaV07XG4gICAgICAgICAgICBpZiAoZGF0YUlkc1ttLmlkXSkge1xuICAgICAgICAgICAgICByZXNwb25zZS5wdXNoKG0uYXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgIGRlbGV0ZSBkYXRhSWRzW20uaWRdO1xuICAgICAgICAgICAgICBpZiAoZGF0YUlkcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXZlcnNlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAobXNnLm1ldGhvZCA9PT0gJ3JlYWQnICYmIGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCBEYXRlIGhlYWRlciBmcm9tIG9wdGlvbnMueGhyIGluc3RlYWQgb2YgdXNpbmcgY2xpZW50VGltZVxuICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsLCBjbGllbnRUaW1lKTtcbiAgICAgIH1cbiAgICAgIC8vIGludm9rZSBzdWNjZXNzIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xuICAgIH0sIChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGZldGNoQ2hhbmdlcyhlbmRwb2ludDogU3luY0VuZHBvaW50LCBmb3JjZSA9IGZhbHNlKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcbiAgICBsZXQgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgaWYgKCFlbmRwb2ludC51cmxSb290IHx8ICFjaGFubmVsKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgbGV0IG5vdyA9IERhdGUubm93KCk7XG4gICAgbGV0IHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzO1xuICAgIGlmIChwcm9taXNlICYmICFmb3JjZSkge1xuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzIDwgMTAwMCkge1xuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhjaGFubmVsICsgJyBza2lwcGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbGV0IHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcbiAgICBpZiAoIXRpbWUpIHtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoY2hhbm5lbCArICcgY2FuIG5vdCBmZXRjaCBjaGFuZ2VzIGF0IHRoaXMgdGltZSEnKTtcbiAgICAgIHJldHVybiBwcm9taXNlIHx8IFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIGluaXRpYXRlIGEgbmV3IHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICBkaWFnLmRlYnVnLmluZm8oY2hhbm5lbCArICcgaW5pdGlhdGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcbiAgICBsZXQgY2hhbmdlczogQ29sbGVjdGlvbiA9IG5ldyAoPGFueT50aGlzLm1lc3NhZ2VzKS5jb25zdHJ1Y3RvcigpO1xuICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKGVuZHBvaW50LnVybFJvb3QgKyAnY2hhbmdlcy8nICsgdGltZSkudGhlbigodXJsKSA9PiB7XG4gICAgICByZXR1cm4gUShjaGFuZ2VzLmZldGNoKDxCYWNrYm9uZS5Db2xsZWN0aW9uRmV0Y2hPcHRpb25zPntcbiAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgIHN0b3JlOiB7fSwgLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcblxuICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgaWYgKGNoYW5nZXMubW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNoYW5nZXMuZWFjaCgoY2hhbmdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xuICAgICAgICAgICAgICBsZXQgbXNnOiBMaXZlRGF0YU1lc3NhZ2UgPSBjaGFuZ2UuYXR0cmlidXRlcztcbiAgICAgICAgICAgICAgdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIGZvbGxvd2luZyBzaG91bGQgdXNlIHNlcnZlciB0aW1lIVxuICAgICAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgbm93KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG9wdGlvbnMueGhyO1xuICAgICAgICB9XG4gICAgICB9KSkudGhlblJlc29sdmUoY2hhbmdlcyk7XG4gICAgfSk7XG4gICAgZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nQ2hhbmdlcyA9IHByb21pc2U7XG4gICAgZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzID0gbm93O1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG5cbiAgcHJpdmF0ZSBmZXRjaFNlcnZlckluZm8oZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxNb2RlbD4ge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBwcm9taXNlID0gZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nU2VydmVySW5mbztcbiAgICBpZiAocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdTZXJ2ZXJJbmZvIDwgMTAwMCkge1xuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhlbmRwb2ludC5jaGFubmVsICsgJyBza2lwcGluZyBpbmZvIHJlcXVlc3QuLi4nKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZm8gPSBuZXcgTW9kZWwoKTtcbiAgICB2YXIgdGltZSA9IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwpO1xuICAgIHZhciB1cmwgPSBlbmRwb2ludC51cmxSb290O1xuICAgIGlmICh1cmwuY2hhckF0KCh1cmwubGVuZ3RoIC0gMSkpICE9PSAnLycpIHtcbiAgICAgIHVybCArPSAnLyc7XG4gICAgfVxuICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKHVybCArICdpbmZvJykudGhlbigodXJsKSA9PiB7XG4gICAgICByZXR1cm4gUShpbmZvLmZldGNoKDxCYWNrYm9uZS5Nb2RlbEZldGNoT3B0aW9ucz4oe1xuICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgc3VjY2VzczogKG1vZGVsLCByZXNwb25zZSwgb3B0aW9ucykgPT4ge1xuICAgICAgICAgIC8vIEB0b2RvIHdoeSB3ZSBzZXQgYSBzZXJ2ZXIgdGltZSBoZXJlID9cbiAgICAgICAgICBpZiAoIXRpbWUgJiYgaW5mby5nZXQoJ3RpbWUnKSkge1xuICAgICAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCwgaW5mby5nZXQoJ3RpbWUnKSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICghZW5kcG9pbnQuc29ja2V0UGF0aCAmJiBpbmZvLmdldCgnc29ja2V0UGF0aCcpKSB7XG4gICAgICAgICAgICBlbmRwb2ludC5zb2NrZXRQYXRoID0gaW5mby5nZXQoJ3NvY2tldFBhdGgnKTtcbiAgICAgICAgICAgIHZhciBuYW1lID0gaW5mby5nZXQoJ2VudGl0eScpIHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xuICAgICAgICAgICAgICBlbmRwb2ludC5zb2NrZXQgPSB0aGlzLmNyZWF0ZVNvY2tldChlbmRwb2ludCwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBvcHRpb25zLnhocjtcbiAgICAgICAgfVxuICAgICAgfSkpKS50aGVuUmVzb2x2ZShpbmZvKTtcbiAgICB9KTtcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvID0gcHJvbWlzZTtcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPSBub3c7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICogY2FsbGVkIHdoZW4gYW4gb2ZmbGluZSBjaGFuZ2Ugd2FzIHNlbnQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXG4gICAqXG4gICAqIDxwPlxuICAgKiBNYXkgYmUgb3ZlcndyaXR0ZW4gdG8gYWx0ZXIgY2hhbmdlIG1lc3NhZ2UgZXJyb3IgaGFuZGxpbmcgYmVoYXZpb3IuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIHdpbGwgYXR0ZW1wdFxuICAgKiByZWxvYWRpbmcgdGhlIHNlcnZlciBkYXRhIGZvciByZXN0b3JpbmcgdGhlIGNsaWVudCBzdGF0ZSBzdWNoIHRoYXQgaXQgcmVmbGVjdHMgdGhlIHNlcnZlciBzdGF0ZS4gV2hlbiB0aGlzXG4gICAqIHN1Y2NlZWRlZCwgdGhlIG9mZmxpbmUgY2hhbmdlIGlzIGVmZmVjdGl2ZWx5IHJldmVydGVkIGFuZCB0aGUgY2hhbmdlIG1lc3NhZ2UgaXMgZHJvcHBlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogQW4gb3ZlcndyaXR0ZW4gaW1wbGVtZW50YXRpb24gbWF5IGRlY2lkZWQgd2hldGhlciB0byByZXZlcnQgZmFpbGVkIGNoYW5nZXMgYmFzZWQgb24gdGhlIGVycm9yIHJlcG9ydGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBOb3RpY2UsIHRoZSBtZXRob2QgaXMgbm90IGNhbGxlZCB3aGVuIHRoZSBvZmZsaW5lIGNoYW5nZSBmYWlsZWQgZHVlIHRvIGEgY29ubmVjdGl2aXR5IGlzc3VlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEBwYXJhbSBlcnJvciByZXBvcnRlZCBieSByZW1vdGUgc2VydmVyLlxuICAgKiBAcGFyYW0gbWVzc2FnZSBjaGFuZ2UgcmVwb3J0ZWQsIGF0dHJpYnV0ZXMgb2YgdHlwZSBMaXZlRGF0YU1lc3NhZ2UuXG4gICAqIEBwYXJhbSBvcHRpb25zIGNvbnRleHQgaW5mb3JtYXRpb24gcmVxdWlyZWQgdG8gYWNjZXNzIHRoZSBkYXRhIGxvY2FsbHkgYXMgd2VsbCBhcyByZW1vdGVseS5cbiAgICogQHJldHVybiB7YW55fSBQcm9taXNlIGluZGljYXRpbmcgc3VjY2VzcyB0byBkcm9wIHRoZSBjaGFuZ2UgbWVzc2FnZSBhbmQgcHJvY2VlZCB3aXRoIHRoZSBuZXh0IGNoYW5nZSwgb3JcbiAgICogICAgcmVqZWN0aW9uIGluZGljYXRpbmcgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGtlcHQgYW5kIHJldHJpZWQgbGF0ZXIgb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yOiBFcnJvciwgbWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwsIG9wdGlvbnM6IHtcbiAgICBlbnRpdHk6IHN0cmluZyxcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcbiAgICB1cmxSb290OiBzdHJpbmcsXG4gICAgbG9jYWxTdG9yZTogU3RvcmUsXG4gICAgc2lsZW50PzogYm9vbGVhblxuICB9KTogUHJvbWlzZUxpa2U8dm9pZCB8IGFueT4ge1xuICAgIGlmICghZXJyb3IpIHtcbiAgICAgIC8vIG1lc3NhZ2Ugd2FzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHlcbiAgICAgIGlmICghdGhpcy51c2VTb2NrZXROb3RpZnkpIHtcbiAgICAgICAgLy8gd2hlbiBub3QgdXNpbmcgc29ja2V0cywgZmV0Y2ggY2hhbmdlcyBub3dcbiAgICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbb3B0aW9ucy5lbnRpdHldO1xuICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAvLyB3aWxsIHB1bGwgdGhlIGNoYW5nZSBjYXVzZWQgYnkgdGhlIG9mZmxpbmUgbWVzc2FnZSBhbmQgdXBkYXRlIHRoZSBtZXNzYWdlIHRpbWUsXG4gICAgICAgICAgLy8gc28gdGhhdCB3ZSBhdm9pZCB0aGUgc2l0dWF0aW9uIHdoZXJlIHRoZSBjaGFuZ2UgY2F1c2VkIGJ5IHJlcGxheWluZyB0aGUgb2ZmbGluZVxuICAgICAgICAgIC8vIGNoYW5nZSByZXN1bHRzIGluIGEgY29uZmxpY3QgbGF0ZXIgb24uLi5cbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8vIGZhaWxlZCwgZXZlbnR1YWxseSB1bmRvIHRoZSBtb2RpZmljYXRpb25zIHN0b3JlZFxuICAgIGlmICghb3B0aW9ucy5sb2NhbFN0b3JlKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHJldmVydCBtb2RpZmljYXRpb24gYnkgcmVsb2FkaW5nIGRhdGFcbiAgICBsZXQgbW9kZWxUeXBlID0gb3B0aW9ucy5tb2RlbFR5cGUgfHwgTW9kZWw7XG4gICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtZXNzYWdlLmdldCgnZGF0YScpLCB7XG4gICAgICBlbnRpdHk6IG9wdGlvbnMuZW50aXR5XG4gICAgfSk7XG4gICAgbW9kZWwuaWQgPSBtZXNzYWdlLmdldCgnbWV0aG9kJykgIT09ICdjcmVhdGUnICYmIG1lc3NhZ2UuZ2V0KCdpZCcpO1xuICAgIGxldCB0cmlnZ2VyRXJyb3IgPSAoKSA9PiB7XG4gICAgICAvLyBpbmZvcm0gY2xpZW50IGFwcGxpY2F0aW9uIG9mIHRoZSBvZmZsaW5lIGNoYW5nZXMgZXJyb3JcbiAgICAgIGxldCBjaGFubmVsID0gbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKTtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQ6IHRyaWdnZXJpbmcgZXJyb3IgZm9yIGNoYW5uZWwgJyArIGNoYW5uZWwgKyAnIG9uIHN0b3JlJywgZXJyb3IpO1xuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbGV0IGxvY2FsT3B0aW9ucyA9IHtcbiAgICAgIC8vIGp1c3QgYWZmZWN0IGxvY2FsIHN0b3JlXG4gICAgICBzdG9yZTogb3B0aW9ucy5sb2NhbFN0b3JlXG4gICAgfTtcbiAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgdXJsUm9vdDogb3B0aW9ucy51cmxSb290LFxuICAgICAgc3RvcmU6IHt9IC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXG4gICAgfTtcbiAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgIHJlbW90ZU9wdGlvbnMudXJsID0gcmVtb3RlT3B0aW9ucy51cmxSb290ICsgKHJlbW90ZU9wdGlvbnMudXJsUm9vdC5jaGFyQXQocmVtb3RlT3B0aW9ucy51cmxSb290Lmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbW9kZWwuaWQ7XG4gICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjcmVhdGlvbiBmYWlsZWQsIGp1c3QgZGVsZXRlIGxvY2FsbHlcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSA9PT0gJ2NyZWF0ZScpO1xuICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfVxuICAgIHJldHVybiAoPFEuUHJvbWlzZTxhbnk+Pjxhbnk+bW9kZWwuZmV0Y2gocmVtb3RlT3B0aW9ucykpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSByZWxvYWRlZCB0aGUgZGF0YSB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMsIHdoaWNoIHN1Y2NlZWRlZC4uLlxuICAgICAgcmV0dXJuIG1vZGVsLnNhdmUoZGF0YSwgbG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfSwgKGZldGNoUmVzcDogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHRyaWVkIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucyBieSByZWxvYWRpbmcgdGhlIGRhdGEsIHdoaWNoIGZhaWxlZCBhcyB3ZWxsLi4uXG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gZmV0Y2hSZXNwICYmIGZldGNoUmVzcC5zdGF0dXNDb2RlO1xuICAgICAgc3dpdGNoIChzdGF0dXNDb2RlKSB7XG4gICAgICAgIGNhc2UgNDA0OiAvLyBOT1QgRk9VTkRcbiAgICAgICAgY2FzZSA0MDE6IC8vIFVOQVVUSE9SSVpFRFxuICAgICAgICBjYXNlIDQxMDogLy8gR09ORSpcbiAgICAgICAgICAvLyAuLi5iZWNhdXNlIHRoZSBpdGVtIGlzIGdvbmUgYnkgbm93LCBtYXliZSBzb21lb25lIGVsc2UgY2hhbmdlZCBpdCB0byBiZSBkZWxldGVkXG4gICAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKTsgLy8gc2lsZW50IHJlZ2FyZGluZyB0cmlnZ2VyRXJyb3JcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZmV0Y2hSZXNwKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogZmVlZHMgcGVuZGluZyBvZmZsaW5lICNtZXNzYWdlcyB0byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICpcbiAgICogPHA+XG4gICAqIER1ZSB0byBjbGllbnQgY29kZSBzZXR0aW5nIHVwIG1vZGVscyBvbmUgYXQgYSB0aW1lLCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGluaXRpYWwgc2V0dXAgb2ZcbiAgICogI2VuZHBvaW50cy4gVGhlIGZpcnN0IGNhbGwgZmV0Y2hlcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzLCBvcmRlcmVkIGJ5IHByaW9yaXR5IGFuZCB0aW1lLiBUaGVuIHRoZSAjbWVzc2FnZXNcbiAgICogYXJlIHNlbmQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIgdW50aWwgZGVwbGV0ZWQsIGFuIGVycm9yIG9jY3Vycywgb3Igc29tZSBtaXNzaW5nIGVuZHBvaW50IGlzIGVuY291bnRlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogVGhlIG1ldGhvZCBpcyB0cmlnZ2VyZWQgZWFjaCB0aW1lIGFuIGVuZHBvaW50IGlzIHJlZ2lzdGVyZWQsIG9yIHN0YXRlIGNoYW5nZXMgdG8gb25saW5lIGZvciBhbnkgZW5kcG9pbnQuIFdoZW5cbiAgICogc3RhdGUgY2hhbmdlcyBmcm9tIG9mZmxpbmUgdG8gb25saW5lIChkaXNyZWdhcmRpbmcgZW5kcG9pbnQpIG1lc3NhZ2Ugc3VibWlzc2lvbiBpcyByZXN0YXJ0ZWQgYnkgcmVzZXR0aW5nIHRoZVxuICAgKiAjbWVzc2FnZXNQcm9taXNlLiBPdGhlcndpc2UsIHN1YnNlcXVlbnQgY2FsbHMgY2hhaW4gdG8gdGhlIGVuZCBvZiAjbWVzc2FnZXNQcm9taXNlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IG9mICNtZXNzYWdlcyBDb2xsZWN0aW9uLCBvciBsYXN0IHJlY2VudCBvZmZsaW5lIHJlamVjdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBfc2VuZE1lc3NhZ2VzKCk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XG4gICAgLy8gbm90IHJlYWR5IHlldFxuICAgIGlmICghdGhpcy5tZXNzYWdlcykge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3NlcyBtZXNzYWdlcyB1bnRpbCBub25lIGxlZnQsIGhpdHRpbmcgYSBtZXNzYWdlIG9mIGEgbm90IHlldCByZWdpc3RlcmVkIGVuZHBvaW50LCBvciBlbnRlcmluZ1xuICAgIC8vIGEgbm9uLXJlY292ZXJhYmxlIGVycm9yLiBUaGUgcHJvbWlzZSByZXR1cm5lZCByZXNvbHZlcyB0byB0aGlzLm1lc3NhZ2VzIHdoZW4gZG9uZS5cbiAgICBsZXQgbmV4dE1lc3NhZ2UgPSAoKTogYW55ID0+IHtcbiAgICAgIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG5cbiAgICAgIGxldCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IHRoaXMubWVzc2FnZXMubW9kZWxzWzBdO1xuICAgICAgbGV0IGVudGl0eSA9IG1lc3NhZ2UuaWQuc3Vic3RyKDAsIG1lc3NhZ2UuaWQuaW5kZXhPZignficpKTtcbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ3NlbmRNZXNzYWdlICcgKyBtZXNzYWdlLmlkICsgJyB3aXRoIG5vIGVudGl0eSEnKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC5jaGFubmVsID09PSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpLCAnY2hhbm5lbCBvZiBlbmRwb2ludCAnICsgZW5kcG9pbnQuY2hhbm5lbCArICcgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCBvZiBtZXNzYWdlICcgKyBtZXNzYWdlLmdldCgnY2hhbm5lbCcpKTtcbiAgICAgIGxldCBtc2cgPSB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtZXNzYWdlLmF0dHJpYnV0ZXMpO1xuXG4gICAgICBsZXQgbW9kZWxUeXBlID0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IE1vZGVsO1xuICAgICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtc2cuZGF0YSwge1xuICAgICAgICBlbnRpdHk6IGVuZHBvaW50LmVudGl0eVxuICAgICAgfSk7XG4gICAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XG4gICAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICAgIH07XG4gICAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcbiAgICAgICAgLy8gZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwudXJsKCkgPT09IHJlbW90ZU9wdGlvbnMudXJsKTtcbiAgICAgIH1cbiAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VuZE1lc3NhZ2UgJyArIG1vZGVsLmlkKTtcbiAgICAgIGxldCBvZmZsaW5lT3B0aW9ucyA9IHtcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHksXG4gICAgICAgIG1vZGVsVHlwZTogZW5kcG9pbnQubW9kZWxUeXBlLFxuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBsb2NhbFN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHRoaXMuX2FwcGx5UmVzcG9uc2UodGhpcy5fYWpheE1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcmVtb3RlT3B0aW9ucywgbW9kZWwpLCBlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHN1Y2NlZWRlZFxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQobnVsbCwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpO1xuICAgICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIGlmIChlcnJvci5zdGF0dXNDb2RlKSB7XG4gICAgICAgICAgLy8gcmVtb3RlIGZhaWxlZFxuICAgICAgICAgIHJldHVybiBRKHRoaXMucHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucykpLmNhdGNoKChlcnJvcjIpID0+IHtcbiAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZGlzY29ubmVjdCBkdWUgdG8gZXJyb3IgaW4gZW5kcG9pbnRcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS50aGVuUmVqZWN0KGVycm9yMik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY29ubmVjdGl2aXR5IGlzc3VlLCBrZWVwIHJlamVjdGlvblxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBhcHBseWluZyBjaGFuZ2Ugc3VjY2VlZGVkIG9yIHN1Y2Nlc3NmdWxseSByZWNvdmVyZWQgY2hhbmdlXG4gICAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcbiAgICAgIH0pLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICBkaWFnLmRlYnVnLmluZm8oJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fc2VuZE1lc3NhZ2VzJyk7XG4gICAgbGV0IHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICBpZiAoIXEpIHtcbiAgICAgIC8vIGluaXRpYWxseSBmZXRjaCBhbGwgbWVzc2FnZXNcbiAgICAgIHEgPSBRKHRoaXMubWVzc2FnZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xuICAgICAgICBzb3J0T3JkZXI6IFtcbiAgICAgICAgICAnK3ByaW9yaXR5JyxcbiAgICAgICAgICAnK3RpbWUnLFxuICAgICAgICAgICcraWQnXG4gICAgICAgIF1cbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgLy8gZWFybHkgcmVqZWN0aW9uXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gICAgfSBlbHNlIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgIC8vIG5vIG1vcmUgbWVzc2FnZXNcbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBraWNrIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlc1xuICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gcS50aGVuKG5leHRNZXNzYWdlKTtcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gIH1cblxuICBwcml2YXRlIHN0b3JlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBxTXNnOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPik6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4ge1xuICAgIHJldHVybiBxTXNnLnRoZW4oKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICBsZXQgb3B0aW9uczogQmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucztcbiAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzdG9yZU1lc3NhZ2UgJyArIGlkKTtcbiAgICAgIHZhciBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IGlkICYmIDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XG4gICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAvLyB1c2UgZXhpc3RpbmcgaW5zdGFuY2UsIHNob3VsZCBub3QgYmUgdGhlIGNhc2UgdXN1YWxseVxuICAgICAgICBvcHRpb25zID0gPEJhY2tib25lLk1vZGVsU2F2ZU9wdGlvbnM+e1xuICAgICAgICAgIG1lcmdlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpbnN0YW50aWF0ZSBuZXcgbW9kZWwsIGludGVudGlvbmFsbHkgbm90IGFkZGVkIHRvIGNvbGxlY3Rpb25cbiAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKG1zZywge1xuICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMubWVzc2FnZXMsXG4gICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcbiAgICAgICAgfSk7XG4gICAgICAgIG1lc3NhZ2Uuc2V0KCdjaGFubmVsJywgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUShtZXNzYWdlLnNhdmUobXNnLCBvcHRpb25zKSkudGhlblJlc29sdmUobWVzc2FnZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gcU1lc3NhZ2UudGhlbigobWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwpID0+IHtcbiAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgIC8vIG1zZyBpcyBub3QgcGVyc2lzdGVudFxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2UgPSA8TGl2ZURhdGFNZXNzYWdlTW9kZWw+dGhpcy5tZXNzYWdlcy5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwoe1xuICAgICAgICAgICAgX2lkOiBtc2cuX2lkXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgncmVtb3ZlTWVzc2FnZSAnICsgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgY2xlYXIoY29sbGVjdGlvbjogQ29sbGVjdGlvbikge1xuICAgIGlmIChjb2xsZWN0aW9uKSB7XG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IHRoaXMuZ2V0RW5kcG9pbnQoY29sbGVjdGlvbik7XG4gICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgaWYgKHRoaXMubWVzc2FnZXMpIHtcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBjb2xsZWN0aW9uLnJlc2V0KCk7XG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsICcnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogY2xvc2UgdGhlIHNvY2tldCBleHBsaWNpdFxuICAgKi9cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIGlmICh0aGlzLm1lc3NhZ2VzLnN0b3JlKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzLnN0b3JlLmNsb3NlKCk7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbnVsbDtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuZW5kcG9pbnRzKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB0aGlzLmVuZHBvaW50c1trZXlzW2ldXS5jbG9zZSgpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBtaXhpbnNcbmxldCBzeW5jU3RvcmUgPSBfLmV4dGVuZChTeW5jU3RvcmUucHJvdG90eXBlLCB7XG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlJyxcblxuICBsb2NhbFN0b3JlOiBXZWJTcWxTdG9yZSxcbiAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcbiAgdXNlU29ja2V0Tm90aWZ5OiB0cnVlLFxuICB1c2VPZmZsaW5lQ2hhbmdlczogdHJ1ZSxcbiAgc29ja2V0UGF0aDogJydcbn0pO1xuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gU3luY1N0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUoc3luY1N0b3JlKSkpO1xuIl19