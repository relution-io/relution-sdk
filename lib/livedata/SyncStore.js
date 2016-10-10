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
            var endpoint = this.endpoints[entity];
            if (!endpoint) {
                diag.debug.info('Relution.livedata.SyncStore.initEndpoint: ' + entity);
                endpoint = new SyncEndpoint_1.SyncEndpoint({
                    entity: entity,
                    modelType: modelType,
                    urlRoot: urlRoot,
                    socketPath: this.socketPath,
                    userUuid: this.userUuid
                });
                this.endpoints[entity] = endpoint;
                endpoint.localStore = this.createLocalStore(endpoint);
                endpoint.priority = this.orderOfflineChanges && (_.lastIndexOf(this.orderOfflineChanges, endpoint.entity) + 1);
                this.createMsgCollection();
                endpoint.socket = this.createSocket(endpoint, entity);
                endpoint.info = this.fetchServerInfo(endpoint);
            }
            else {
                // configuration can not change, must recreate store instead...
                diag.debug.assert(function () { return endpoint.urlRoot === urlRoot; }, 'can not change urlRoot, must recreate store instead!');
                diag.debug.assert(function () { return endpoint.userUuid === _this.userUuid; }, 'can not change user identity, must recreate store instead!');
            }
            return endpoint;
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
            var connectVo = {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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SyxHQTJwQ25DO0FBM3BDWSxpQkFBUyxZQTJwQ3JCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVDLEtBQUssRUFBRSw2QkFBNkI7SUFFcEMsVUFBVSxFQUFFLHlCQUFXO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIEJhY2tib25lIGZyb20gJ2JhY2tib25lJztcclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5pbXBvcnQgKiBhcyBvYmplY3RpZCBmcm9tICcuLi9jb3JlL29iamVjdGlkJztcclxuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xyXG5pbXBvcnQgKiBhcyB3ZWIgZnJvbSAnLi4vd2ViJztcclxuXHJcbmltcG9ydCB7bG9jYWxTdG9yYWdlfSBmcm9tICcuLi93ZWIvb2ZmbGluZSc7XHJcbmltcG9ydCB7R2V0UXVlcnl9IGZyb20gJy4uL3F1ZXJ5L0dldFF1ZXJ5JztcclxuaW1wb3J0IHtTdG9yZSwgU3RvcmVDdG9yfSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XHJcbmltcG9ydCB7U3luY0NvbnRleHR9IGZyb20gJy4vU3luY0NvbnRleHQnO1xyXG5pbXBvcnQge1N5bmNFbmRwb2ludH0gZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xyXG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZSwgTGl2ZURhdGFNZXNzYWdlTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcclxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtDb2xsZWN0aW9uLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcblxyXG4vKipcclxuICogaW8gb2YgYnJvd3NlciB2aWEgc2NyaXB0IHRhZyBvciB2aWEgcmVxdWlyZSBzb2NrZXQuaW8tY2xpZW50LCBlbnRpcmVseSBvcHRpb25hbC5cclxuICpcclxuICogTm90aWNlLCB0aGlzIG1vZHVsZSBpcyBlbnRpcmVseSBvcHRpb25hbCBhcyB0aGUgc3RvcmUgbWF5IG9wZXJhdGUgd2l0aG91dCBpdCBpZiBzb2NrZXRcclxuICogbm90aWZpY2F0aW9ucyBhcmUgbm90IHVzZWQuXHJcbiAqXHJcbiAqIEBpbnRlcm5hbCBOb3QgcHVibGljIEFQSSwgZXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcclxuICovXHJcbmV4cG9ydCBjb25zdCBpbzogU29ja2V0SU9DbGllbnRTdGF0aWMgPSBnbG9iYWxbJ2lvJ10gfHwgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uXHJcbiAgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicgJiYgICAgICAgICAgICAgICAgICAgICAgLy8gb3Igd2hlbiByZXF1aXJlIGlzIGF2YWlsYWJsZVxyXG4gICgoZnVuY3Rpb24gcmVxdWlyZVNvY2tldElvKCkgeyAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlcXVpcmVkIHZlcnNpb25cclxuICAgIC8vIGhlcmUgd2UgYXJlIGluIGFuIGltbWVkaWF0ZWx5IGludm9rZWQgZnVuY3Rpb24gcmVxdWlyaW5nIHNvY2tldC5pby1jbGllbnQsIGlmIGF2YWlsYWJsZVxyXG4gICAgdHJ5IHtcclxuICAgICAgcmV0dXJuIChnbG9iYWxbJ2lvJ10gPSByZXF1aXJlKCdzb2NrZXQuaW8tY2xpZW50JykpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdvcHRpb25hbCBzb2NrZXQuaW8tY2xpZW50IG1vZHVsZSBpcyBub3QgYXZhaWxhYmxlOiAnICsgZXJyb3IgJiYgZXJyb3IubWVzc2FnZSk7XHJcbiAgICB9XHJcbiAgfSkoKSk7XHJcblxyXG4vKipcclxuICogY29ubmVjdHMgYSBNb2RlbC9Db2xsZWN0aW9uIHRvIGEgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBUaGlzIHdpbGwgZ2l2ZSB5b3UgYW4gb25saW5lIGFuZCBvZmZsaW5lIHN0b3JlIHdpdGggbGl2ZSBkYXRhIHVwZGF0ZXMuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqXHJcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGEganNvbixcclxuICogLy8gYW5kIHRoZSBvZmZsaW5lIGNoYW5nZSBsb2cgdG8gYSBsb2NhbCBXZWJTcWwgZGF0YWJhc2UsIHN5bmNocm9uaXplIGl0XHJcbiAqIC8vIHRyb3VnaCBSRVNUIGNhbGxzIHdpdGggdGhlIHNlcnZlciBhbmQgcmVjZWl2ZSBsaXZlIHVwZGF0ZXMgdmlhIGEgc29ja2V0LmlvIGNvbm5lY3Rpb24uXHJcbiAqIGNsYXNzIE15Q29sbGVjdGlvbiBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24ge307XHJcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xyXG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLnVybCA9ICdodHRwOi8vbXlTZXJ2ZXIuaW8vbXlPcmdhL215QXBwbGljYXRpb24vbXlDb2xsZWN0aW9uJztcclxuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IG5ldyBSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUoe1xyXG4gKiAgIHVzZUxvY2FsU3RvcmU6IHRydWUsICAgICAvLyAoZGVmYXVsdCkgc3RvcmUgdGhlIGRhdGEgZm9yIG9mZmxpbmUgdXNlXHJcbiAqICAgdXNlU29ja2V0Tm90aWZ5OiB0cnVlLCAgIC8vIChkZWZhdWx0KSByZWdpc3RlciBhdCB0aGUgc2VydmVyIGZvciBsaXZlIHVwZGF0ZXNcclxuICogICB1c2VPZmZsaW5lQ2hhbmdlczogdHJ1ZSAgLy8gKGRlZmF1bHQpIGFsbG93IGNoYW5nZXMgdG8gdGhlIG9mZmxpbmUgZGF0YVxyXG4gKiB9KTtcclxuICovXHJcbmV4cG9ydCBjbGFzcyBTeW5jU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XHJcblxyXG4gIC8vIGZvbGxvd2luZyBhcmUgc3RvcmUtc3BlY2lmaWMgb3B0aW9ucywgZGVmYXVsdHMgc3RvcmVkIGluIHByb3RvdHlwZSBhdCBlbmQgb2YgdGhpcyBmaWxlXHJcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmU6IFN0b3JlQ3RvcjtcclxuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZU9wdGlvbnM6IGFueTtcclxuICBwcm90ZWN0ZWQgdXNlTG9jYWxTdG9yZTogYm9vbGVhbjtcclxuICBwcm90ZWN0ZWQgdXNlU29ja2V0Tm90aWZ5OiBib29sZWFuO1xyXG4gIHByb3RlY3RlZCB1c2VPZmZsaW5lQ2hhbmdlczogYm9vbGVhbjtcclxuICBwcm90ZWN0ZWQgc29ja2V0UGF0aDogc3RyaW5nO1xyXG4gIHByb3RlY3RlZCBzb2NrZXRRdWVyeTogc3RyaW5nO1xyXG4gIHByb3RlY3RlZCBjcmVkZW50aWFsczogYW55O1xyXG4gIHByb3RlY3RlZCBvcmRlck9mZmxpbmVDaGFuZ2VzOiBzdHJpbmdbXTtcclxuXHJcbiAgLyoqXHJcbiAgICogc2VydmVyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxyXG4gICAqXHJcbiAgICogVGhlIHN5bmMgbWV0aG9kIHdpbGwgZmFpbCBlYXJseSB3aGVuIGJlaW5nIGFwcGxpZWQgdG8gZGF0YSBvZiBzb21lIG90aGVyIHNlcnZlci5cclxuICAgKi9cclxuICBwcm90ZWN0ZWQgc2VydmVyVXJsOiBzdHJpbmc7XHJcbiAgLyoqXHJcbiAgICogYXBwbGljYXRpb24gcGFydCB1c2VkIHRvIHJlc29sdmUgVVJMcyBtYXkgb3B0aW9uYWxseSBiZSBzZXQgdXNpbmcgY29uc3RydWN0b3Igb3B0aW9ucy5cclxuICAgKi9cclxuICBwcm90ZWN0ZWQgYXBwbGljYXRpb246IHN0cmluZztcclxuICAvKipcclxuICAgKiBpZGVudGl0eSBvciB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxyXG4gICAqXHJcbiAgICogVGhlIGFqYXggbWV0aG9kIHdpbGwgc2ltdWxhdGUgYW4gb2ZmbGluZSB0aW1lb3V0IHdoZW4gdGhlIHVzZXIgaWRlbnRpdHkgaXMgY2hhbmdlZC4gVGhpcyBpc1xyXG4gICAqIGJlY2F1c2UganVzdCBvbmUgc2Vzc2lvbiBjYW4gYmUgbWFpbnRhaW5lZCBwZXIgc2VydmVyIGFuZCBsb2dpbi9sb2dvdXQgc2VtYW50aWNzIG11c3QgYmUgd2VsbFxyXG4gICAqIGJlaGF2ZWQuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHVzZXJVdWlkOiBzdHJpbmc7XHJcblxyXG4gIHB1YmxpYyBlbmRwb2ludHM6IHtcclxuICAgIC8vIG1hcCBvZiBlbnRpdHkgdG8gU3luY0VuZHBvaW50XHJcbiAgICBbZW50aXR5OiBzdHJpbmddOiBTeW5jRW5kcG9pbnQ7XHJcbiAgfSA9IHt9O1xyXG5cclxuICBwcml2YXRlIGxhc3RNZXNnVGltZTogYW55O1xyXG5cclxuICAvKipcclxuICAgKiB3aGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIGVudGl0eSBjYXVzZWQgYSBkaXNjb25uZWN0aW9uLlxyXG4gICAqXHJcbiAgICogPHA+XHJcbiAgICogVGhpcyBpcyBzZXQgdG8gYW4gZW50aXR5IG5hbWUgdG8gbGltaXQgd2hpY2ggZW50aXR5IG1heSBjYXVzZSBhIGNoYW5nZSB0byBvbmxpbmUgc3RhdGUgYWdhaW4uXHJcbiAgICogPC9wPlxyXG4gICAqXHJcbiAgICogQHR5cGUge3N0cmluZ31cclxuICAgKi9cclxuICBwcml2YXRlIGRpc2Nvbm5lY3RlZEVudGl0eTogc3RyaW5nID0gJ2FsbCc7XHJcblxyXG4gIHB1YmxpYyBtZXNzYWdlczogQ29sbGVjdGlvbjtcclxuICBwdWJsaWMgbWVzc2FnZXNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XHJcblxyXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBhbnkpIHtcclxuICAgIHN1cGVyKG9wdGlvbnMpO1xyXG4gICAgaWYgKHRoaXMuY3JlZGVudGlhbHMpIHtcclxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IF8uY2xvbmUodGhpcy5jcmVkZW50aWFscyk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucykge1xyXG4gICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpIHtcclxuICAgICAgdGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzID0gXy5jbG9uZSh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSAmJiB0eXBlb2YgaW8gIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2FybmluZygnU29ja2V0LklPIG5vdCBwcmVzZW50ICEhJyk7XHJcbiAgICAgIHRoaXMudXNlU29ja2V0Tm90aWZ5ID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBvdmVyd3JpdHRlbiB0byByZXNvbHZlIHJlbGF0aXZlIFVSTHMgYWdhaW5zdCB0aGUgU3luY1N0b3JlI3NlcnZlclVybC5cclxuICAgKi9cclxuICBwcm90ZWN0ZWQgcmVzb2x2ZVVybCh1cmw6IHN0cmluZykge1xyXG4gICAgcmV0dXJuIHdlYi5yZXNvbHZlVXJsKHVybCwge1xyXG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsLFxyXG4gICAgICBhcHBsaWNhdGlvbjogdGhpcy5hcHBsaWNhdGlvblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBiaW5kcyB0aGUgc3RvcmUgdG8gYSB0YXJnZXQgc2VydmVyIHdoZW4gdGhlIGZpcnN0IGVuZHBvaW50IGlzIGNyZWF0ZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gdXJsUm9vdCB1c2VkIHRvIHJlc29sdmUgdGhlIHNlcnZlciB0byBvcGVyYXRlLlxyXG4gICAgICovXHJcbiAgcHJpdmF0ZSBpbml0U2VydmVyKHVybFJvb3Q6IHN0cmluZykge1xyXG4gICAgbGV0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKHVybFJvb3QsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSk7XHJcbiAgICBpZiAoIXRoaXMuc2VydmVyVXJsKSB7XHJcbiAgICAgIGNvbnN0IHNlcnZlciA9IHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xyXG4gICAgICB0aGlzLnNlcnZlclVybCA9IHNlcnZlclVybDtcclxuICAgICAgdGhpcy51c2VyVXVpZCA9IHNlcnZlci5hdXRob3JpemF0aW9uLm5hbWU7XHJcbiAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zICYmICF0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgLy8gY2FwdHVyZSBjcmVkZW50aWFscyBmb3IgdXNlIGJ5IGNyeXB0byBzdG9yZXNcclxuICAgICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzID0gXy5kZWZhdWx0cyh7XHJcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxyXG4gICAgICAgIH0sIHNlcnZlci5jcmVkZW50aWFscyk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoc2VydmVyVXJsICE9PSB0aGlzLnNlcnZlclVybCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwgKyAnIGFscmVhZHknKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2hlY2tTZXJ2ZXIodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcclxuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XHJcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XHJcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XHJcbiAgICAgIHJldHVybiBvcHRpb25zICYmIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0PHN0cmluZz4oZXJyb3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFEucmVzb2x2ZSh1cmwpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGluaXRFbmRwb2ludChtb2RlbE9yQ29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uLCBtb2RlbFR5cGU6IE1vZGVsQ3Rvcik6IFN5bmNFbmRwb2ludCB7XHJcbiAgICB2YXIgdXJsUm9vdCA9IG1vZGVsT3JDb2xsZWN0aW9uLmdldFVybFJvb3QoKTtcclxuICAgIHZhciBlbnRpdHkgPSBtb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHk7XHJcbiAgICBpZiAodXJsUm9vdCAmJiBlbnRpdHkpIHtcclxuICAgICAgLy8gZ2V0IG9yIGNyZWF0ZSBlbmRwb2ludCBmb3IgdGhpcyB1cmxcclxuICAgICAgdGhpcy5pbml0U2VydmVyKHVybFJvb3QpO1xyXG4gICAgICB2YXIgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xyXG4gICAgICBpZiAoIWVuZHBvaW50KSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuaW5pdEVuZHBvaW50OiAnICsgZW50aXR5KTtcclxuICAgICAgICBlbmRwb2ludCA9IG5ldyBTeW5jRW5kcG9pbnQoe1xyXG4gICAgICAgICAgZW50aXR5OiBlbnRpdHksXHJcbiAgICAgICAgICBtb2RlbFR5cGU6IG1vZGVsVHlwZSxcclxuICAgICAgICAgIHVybFJvb3Q6IHVybFJvb3QsXHJcbiAgICAgICAgICBzb2NrZXRQYXRoOiB0aGlzLnNvY2tldFBhdGgsXHJcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZW5kcG9pbnRzW2VudGl0eV0gPSBlbmRwb2ludDtcclxuXHJcbiAgICAgICAgZW5kcG9pbnQubG9jYWxTdG9yZSA9IHRoaXMuY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludCk7XHJcbiAgICAgICAgZW5kcG9pbnQucHJpb3JpdHkgPSB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgJiYgKF8ubGFzdEluZGV4T2YodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzLCBlbmRwb2ludC5lbnRpdHkpICsgMSk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVNc2dDb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgZW5kcG9pbnQuc29ja2V0ID0gdGhpcy5jcmVhdGVTb2NrZXQoZW5kcG9pbnQsIGVudGl0eSk7XHJcbiAgICAgICAgZW5kcG9pbnQuaW5mbyA9IHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBjb25maWd1cmF0aW9uIGNhbiBub3QgY2hhbmdlLCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQuLi5cclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC51cmxSb290ID09PSB1cmxSb290LCAnY2FuIG5vdCBjaGFuZ2UgdXJsUm9vdCwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xyXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVzZXJVdWlkID09PSB0aGlzLnVzZXJVdWlkLCAnY2FuIG5vdCBjaGFuZ2UgdXNlciBpZGVudGl0eSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBlbmRwb2ludDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBpbmhlcml0ZG9jXHJcbiAgICogXHJcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBNb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgKi9cclxuICBpbml0TW9kZWwobW9kZWw6IE1vZGVsKTogdm9pZCB7XHJcbiAgICBtb2RlbC5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KG1vZGVsLCA8TW9kZWxDdG9yPm1vZGVsLmNvbnN0cnVjdG9yKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBpbmhlcml0ZG9jXHJcbiAgICogXHJcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yLlxyXG4gICAqL1xyXG4gIGluaXRDb2xsZWN0aW9uKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pOiB2b2lkIHtcclxuICAgIGNvbGxlY3Rpb24uZW5kcG9pbnQgPSB0aGlzLmluaXRFbmRwb2ludChjb2xsZWN0aW9uLCBjb2xsZWN0aW9uLm1vZGVsKTtcclxuICB9XHJcblxyXG4gIGdldEVuZHBvaW50KG1vZGVsT3JDb2xsZWN0aW9uOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBTeW5jRW5kcG9pbnQge1xyXG4gICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbbW9kZWxPckNvbGxlY3Rpb24uZW50aXR5XTtcclxuICAgIGlmIChlbmRwb2ludCkge1xyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB7XHJcbiAgICAgICAgLy8gY2hlY2tzIHRoYXQgbW9kZWxPckNvbGxlY3Rpb24gdXNlcyBhIG1vZGVsIGluaGVyaXRpbmcgZnJvbSB0aGUgb25lIG9mIHRoZSBlbmRwb2ludFxyXG4gICAgICAgIGxldCBtb2RlbFR5cGUgPSBpc0NvbGxlY3Rpb24obW9kZWxPckNvbGxlY3Rpb24pID8gbW9kZWxPckNvbGxlY3Rpb24ubW9kZWwgOiBtb2RlbE9yQ29sbGVjdGlvbi5jb25zdHJ1Y3RvcjtcclxuICAgICAgICByZXR1cm4gbW9kZWxUeXBlID09PSBlbmRwb2ludC5tb2RlbFR5cGUgfHwgbW9kZWxUeXBlLnByb3RvdHlwZSBpbnN0YW5jZW9mIGVuZHBvaW50Lm1vZGVsVHlwZTtcclxuICAgICAgfSwgJ3dyb25nIHR5cGUgb2YgbW9kZWwhJyk7XHJcbiAgICAgIHJldHVybiBlbmRwb2ludDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFN0b3JlIHtcclxuICAgIGlmICh0aGlzLnVzZUxvY2FsU3RvcmUpIHtcclxuICAgICAgdmFyIGVudGl0aWVzID0ge307XHJcbiAgICAgIGVudGl0aWVzW2VuZHBvaW50LmVudGl0eV0gPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgICB2YXIgc3RvcmVPcHRpb24gPSB7XHJcbiAgICAgICAgZW50aXRpZXM6IGVudGl0aWVzXHJcbiAgICAgIH07XHJcbiAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zICYmIHR5cGVvZiB0aGlzLmxvY2FsU3RvcmVPcHRpb25zID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHN0b3JlT3B0aW9uID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcclxuICAgICAgICBzdG9yZU9wdGlvbi5lbnRpdGllcyA9IGVudGl0aWVzO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBuZXcgdGhpcy5sb2NhbFN0b3JlKHN0b3JlT3B0aW9uKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBkZXNjcmlwdGlvbiBIZXJlIHdlIHNhdmUgdGhlIGNoYW5nZXMgaW4gYSBNZXNzYWdlIGxvY2FsIHdlYnNxbFxyXG4gICAqIEByZXR1cm5zIHsqfVxyXG4gICAqL1xyXG4gIGNyZWF0ZU1zZ0NvbGxlY3Rpb24oKTogQ29sbGVjdGlvbiB7XHJcbiAgICBpZiAodGhpcy51c2VPZmZsaW5lQ2hhbmdlcyAmJiAhdGhpcy5tZXNzYWdlcykge1xyXG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XHJcbiAgICAgICAgbW9kZWw6IExpdmVEYXRhTWVzc2FnZU1vZGVsLFxyXG4gICAgICAgIHN0b3JlOiBuZXcgdGhpcy5sb2NhbFN0b3JlKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XHJcbiAgfVxyXG5cclxuICBjcmVhdGVTb2NrZXQoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZTogc3RyaW5nKSB7XHJcbiAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkgJiYgZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0UGF0aCkge1xyXG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuY3JlYXRlU29ja2V0OiAnICsgbmFtZSk7XHJcblxyXG4gICAgICAvLyByZXNvdXJjZVxyXG4gICAgICBsZXQgY29ubmVjdFZvOiBhbnkgPSB7XHJcbiAgICAgIH07XHJcbiAgICAgIGxldCByZXNvdXJjZSA9IGVuZHBvaW50LnNvY2tldFBhdGg7IC8vIHJlbW92ZSBsZWFkaW5nIC9cclxuICAgICAgY29ubmVjdFZvLnJlc291cmNlID0gKHJlc291cmNlICYmIHJlc291cmNlLmluZGV4T2YoJy8nKSA9PT0gMCkgPyByZXNvdXJjZS5zdWJzdHIoMSkgOiByZXNvdXJjZTtcclxuICAgICAgaWYgKHRoaXMuc29ja2V0UXVlcnkpIHtcclxuICAgICAgICBjb25uZWN0Vm8ucXVlcnkgPSB0aGlzLnNvY2tldFF1ZXJ5O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzb2NrZXRcclxuICAgICAgZW5kcG9pbnQuc29ja2V0ID0gaW8uY29ubmVjdChlbmRwb2ludC5ob3N0LCBjb25uZWN0Vm8pO1xyXG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Nvbm5lY3QnLCAoKSA9PiB7XHJcbiAgICAgICAgdGhpcy5fYmluZENoYW5uZWwoZW5kcG9pbnQsIG5hbWUpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm9uQ29ubmVjdChlbmRwb2ludCkuZG9uZSgpO1xyXG4gICAgICB9KTtcclxuICAgICAgZW5kcG9pbnQuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKCkgPT4ge1xyXG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnc29ja2V0LmlvOiBkaXNjb25uZWN0Jyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS5kb25lKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oZW5kcG9pbnQuY2hhbm5lbCwgKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtc2cpKTtcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBlbmRwb2ludC5zb2NrZXQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBfYmluZENoYW5uZWwoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZT86IHN0cmluZykge1xyXG4gICAgaWYgKGVuZHBvaW50ICYmIGVuZHBvaW50LnNvY2tldCkge1xyXG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuX2JpbmRDaGFubmVsOiAnICsgbmFtZSk7XHJcblxyXG4gICAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICAgIHZhciBzb2NrZXQgPSBlbmRwb2ludC5zb2NrZXQ7XHJcbiAgICAgIHZhciB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XHJcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVuZHBvaW50LmVudGl0eTtcclxuICAgICAgc29ja2V0LmVtaXQoJ2JpbmQnLCB7XHJcbiAgICAgICAgZW50aXR5OiBuYW1lLFxyXG4gICAgICAgIGNoYW5uZWw6IGNoYW5uZWwsXHJcbiAgICAgICAgdGltZTogdGltZVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGdldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgaWYgKCF0aGlzLmxhc3RNZXNnVGltZSkge1xyXG4gICAgICB0aGlzLmxhc3RNZXNnVGltZSA9IHt9O1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXTtcclxuICAgIH1cclxuICAgIC8vIHRoZSB8IDAgYmVsb3cgdHVybnMgc3RyaW5ncyBpbnRvIG51bWJlcnNcclxuICAgIHZhciB0aW1lID0gbG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSgnX18nICsgY2hhbm5lbCArICdsYXN0TWVzZ1RpbWUnKSB8fCAwO1xyXG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xyXG4gICAgcmV0dXJuIHRpbWU7XHJcbiAgfVxyXG5cclxuICBzZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiB2b2lkIHtcclxuICAgIGlmICghdGltZSB8fCB0aW1lID4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkpIHtcclxuICAgICAgbG9jYWxTdG9yYWdlKCkuc2V0SXRlbSgnX18nICsgY2hhbm5lbCArICdsYXN0TWVzZ1RpbWUnLCB0aW1lKTtcclxuICAgICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb25Db25uZWN0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAvLyB3aGVuIG9mZmxpbmUgdHJhbnNtaXNzaW9uIGlzIHBlbmRpbmcsIG5lZWQgdG8gd2FpdCBmb3IgaXQgdG8gY29tcGxldGVcclxuICAgICAgbGV0IHEgPSBRLnJlc29sdmUodW5kZWZpbmVkKTtcclxuICAgICAgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlICYmIHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUGVuZGluZygpKSB7XHJcbiAgICAgICAgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlLmNhdGNoKChlcnJvcikgPT4gUS5yZXNvbHZlKHVuZGVmaW5lZCkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzeW5jIHNlcnZlci9jbGllbnQgY2hhbmdlc1xyXG4gICAgICBlbmRwb2ludC5pc0Nvbm5lY3RlZCA9IHEudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gbmV4dCB3ZSdsbCBmZXRjaCBzZXJ2ZXItc2lkZSBjaGFuZ2VzXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS50aGVuKCgpID0+IHtcclxuICAgICAgICAgIC8vIHRoZW4gc2VuZCBjbGllbnQtc2lkZSBjaGFuZ2VzXHJcbiAgICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09ICdhbGwnIHx8IHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpIHtcclxuICAgICAgICAgICAgLy8gcmVzdGFydCByZXBsYXlpbmcgb2Ygb2ZmbGluZSBtZXNzYWdlc1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VzUHJvbWlzZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gbnVsbDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiB0aGlzLl9zZW5kTWVzc2FnZXMoKTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICAgIC8vIGNhdGNoIHdpdGhvdXQgZXJyb3IgaW5kaWNhdGVzIGRpc2Nvbm5lY3Rpb24gd2hpbGUgZ29pbmcgb25saW5lXHJcbiAgICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vIGRpc2Nvbm5lY3RlZCB3aGlsZSBzZW5kaW5nIG9mZmxpbmUgY2hhbmdlc1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XHJcbiAgICAgICAgLy8gaW4gdGhlIGVuZCwgd2hlbiBjb25uZWN0ZWQgc3RpbGwsIGZpcmUgYW4gZXZlbnQgaW5mb3JtaW5nIGNsaWVudCBjb2RlXHJcbiAgICAgICAgaWYgKGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Nvbm5lY3Q6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZW5kcG9pbnQuaXNDb25uZWN0ZWQ7XHJcbiAgfVxyXG5cclxuICBvbkRpc2Nvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gbnVsbDtcclxuICAgIGlmICghdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkpIHtcclxuICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSAnYWxsJztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gUS5mY2FsbCgoKSA9PiB7XHJcbiAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgJiYgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQpIHtcclxuICAgICAgICAvLyBjb25zaWRlciBjYWxsaW5nIGVuZHBvaW50LnNvY2tldC5kaXNjb25uZWN0KCkgaW5zdGVhZFxyXG4gICAgICAgICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0Lm9uRGlzY29ubmVjdCgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9KS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignZGlzY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgX2ZpeE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBMaXZlRGF0YU1lc3NhZ2Uge1xyXG4gICAgbGV0IGlkQXR0cmlidXRlID0gZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZTtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhaWRBdHRyaWJ1dGUsICdubyBpZEF0dHJpYnV0ZSEnKTtcclxuXHJcbiAgICBpZiAobXNnLmRhdGEgJiYgIW1zZy5kYXRhW2lkQXR0cmlidXRlXSAmJiBtc2cuZGF0YS5faWQpIHtcclxuICAgICAgbXNnLmRhdGFbaWRBdHRyaWJ1dGVdID0gbXNnLmRhdGEuX2lkOyAvLyBzZXJ2ZXIgYnVnIVxyXG4gICAgfSBlbHNlIGlmICghbXNnLmRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScgJiYgbXNnW2lkQXR0cmlidXRlXSkge1xyXG4gICAgICBtc2cuZGF0YSA9IHt9O1xyXG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2dbaWRBdHRyaWJ1dGVdOyAvLyBzZXJ2ZXIgYnVnIVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1zZztcclxuICB9XHJcblxyXG4gIG9uTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSk6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+IHtcclxuICAgIC8vIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBzdG9yZSBpdHNlbGYgZm9yIGEgcGFydGljdWxhciBlbmRwb2ludCFcclxuICAgIGlmICghbXNnIHx8ICFtc2cubWV0aG9kKSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdDxMaXZlRGF0YU1lc3NhZ2U+KG5ldyBFcnJvcignbm8gbWVzc2FnZSBvciBtZXRob2QgZ2l2ZW4nKSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHE6IFEuUHJvbWlzZTxhbnk+O1xyXG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgaWYgKGVuZHBvaW50LmxvY2FsU3RvcmUpIHtcclxuICAgICAgLy8gZmlyc3QgdXBkYXRlIHRoZSBsb2NhbCBzdG9yZSBieSBmb3JtaW5nIGEgbW9kZWwgYW5kIGludm9raW5nIHN5bmNcclxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmRlZmF1bHRzKHtcclxuICAgICAgICBzdG9yZTogZW5kcG9pbnQubG9jYWxTdG9yZVxyXG4gICAgICB9LCB0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcclxuICAgICAgdmFyIG1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShtc2cuZGF0YSwgXy5leHRlbmQoe1xyXG4gICAgICAgIHBhcnNlOiB0cnVlXHJcbiAgICAgIH0sIG9wdGlvbnMpKTtcclxuICAgICAgaWYgKCFtb2RlbC5pZCkge1xyXG4gICAgICAgIC8vIGNvZGUgYmVsb3cgd2lsbCBwZXJzaXN0IHdpdGggYXV0by1hc3NpZ25lZCBpZCBidXQgdGhpcyBuZXZlcnRoZWxlc3MgaXMgYSBicm9rZW4gcmVjb3JkXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyByZWNlaXZlZCBkYXRhIHdpdGggbm8gdmFsaWQgaWQgcGVyZm9ybWluZyAnICsgbXNnLm1ldGhvZCArICchJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QpO1xyXG4gICAgICB9XHJcbiAgICAgIHEgPSBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIF8uZXh0ZW5kKG9wdGlvbnMsIHtcclxuICAgICAgICBtZXJnZTogbXNnLm1ldGhvZCA9PT0gJ3BhdGNoJ1xyXG4gICAgICB9KSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgaWYgKCFtc2cuaWQgfHwgbXNnLmlkID09PSBtb2RlbC5pZCkge1xyXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlkIHZhbHVlIHdhcyByZWFzc2lnbmVkLCBkZWxldGUgcmVjb3JkIG9mIG9sZCBpZFxyXG4gICAgICAgIHZhciBvbGREYXRhID0ge307XHJcbiAgICAgICAgb2xkRGF0YVttb2RlbC5pZEF0dHJpYnV0ZV0gPSBtc2cuaWQ7XHJcbiAgICAgICAgdmFyIG9sZE1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShvbGREYXRhLCBvcHRpb25zKTtcclxuICAgICAgICBkaWFnLmRlYnVnLmRlYnVnKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnICcgKyBtb2RlbC5pZCArICcgcmVhc3NpZ25lZCBmcm9tIG9sZCByZWNvcmQgJyArIG9sZE1vZGVsLmlkKTtcclxuICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKCdkZWxldGUnLCBvbGRNb2RlbCwgb3B0aW9ucyk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8ganVzdCB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xyXG4gICAgICBxID0gUS5yZXNvbHZlKG1zZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmluYWxseSBzZXQgdGhlIG1lc3NhZ2UgdGltZVxyXG4gICAgcmV0dXJuIHEudGhlbigoKSA9PiB7XHJcbiAgICAgIGlmIChtc2cudGltZSkge1xyXG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIG1zZy50aW1lKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gdXBkYXRlIGFsbCBjb2xsZWN0aW9ucyBsaXN0ZW5pbmdcclxuICAgICAgdGhpcy50cmlnZ2VyKCdzeW5jOicgKyBjaGFubmVsLCBtc2cpOyAvLyBTeW5jQ29udGV4dC5vbk1lc3NhZ2VcclxuICAgICAgcmV0dXJuIG1zZztcclxuICAgIH0sIChlcnJvcjogRXJyb3IpID0+IHtcclxuICAgICAgLy8gbm90IHNldHRpbmcgbWVzc2FnZSB0aW1lIGluIGVycm9yIGNhc2VcclxuXHJcbiAgICAgIC8vIHJlcG9ydCBlcnJvciBhcyBldmVudCBvbiBzdG9yZVxyXG4gICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xyXG4gICAgICByZXR1cm4gbXNnO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pOiBRLlByb21pc2U8YW55PiB7XHJcbiAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuc3luYycpO1xyXG4gICAgdHJ5IHtcclxuICAgICAgdmFyIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQgPSBtb2RlbC5lbmRwb2ludCB8fCB0aGlzLmdldEVuZHBvaW50KG1vZGVsKTtcclxuICAgICAgaWYgKCFlbmRwb2ludCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gZW5kcG9pbnQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcclxuICAgICAgICAvLyBjb2xsZWN0aW9ucyBjYW4gYmUgZmlsdGVyZWQsIGV0Yy5cclxuICAgICAgICBpZiAobWV0aG9kID09PSAncmVhZCcgJiYgIW9wdGlvbnMuYmFyZWJvbmUpIHtcclxuICAgICAgICAgIHZhciBzeW5jQ29udGV4dDogU3luY0NvbnRleHQgPSBvcHRpb25zLnN5bmNDb250ZXh0OyAvLyBzeW5jIGNhbiBiZSBjYWxsZWQgYnkgU3luY0NvbnRleHQgaXRzZWxmIHdoZW4gcGFnaW5nIHJlc3VsdHNcclxuICAgICAgICAgIGlmICghc3luY0NvbnRleHQpIHtcclxuICAgICAgICAgICAgLy8gY2FwdHVyZSBHZXRRdWVyeSBvcHRpb25zXHJcbiAgICAgICAgICAgIHN5bmNDb250ZXh0ID0gbmV3IFN5bmNDb250ZXh0KFxyXG4gICAgICAgICAgICAgIG9wdGlvbnMsICAgICAgICAvLyBkeW5hbWljIG9wdGlvbnMgcGFzc2VkIHRvIGZldGNoKCkgaW1wbGVtZW50IFVJIGZpbHRlcnMsIGV0Yy5cclxuICAgICAgICAgICAgICBtb2RlbC5vcHRpb25zLCAgLy8gc3RhdGljIG9wdGlvbnMgb24gY29sbGVjdGlvbiBpbXBsZW1lbnQgc2NyZWVuLXNwZWNpZmljIHN0dWZmXHJcbiAgICAgICAgICAgICAgdGhpcyAgICAgICAgICAgIC8vIHN0YXRpYyBvcHRpb25zIG9mIHRoaXMgc3RvcmUgcmVhbGl6ZSBmaWx0ZXJpbmcgY2xpZW50L3NlcnZlclxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBvcHRpb25zLnN5bmNDb250ZXh0ID0gc3luY0NvbnRleHQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQgIT09IHN5bmNDb250ZXh0KSB7XHJcbiAgICAgICAgICAgIC8vIGFzc2lnbiBhIGRpZmZlcmVudCBpbnN0YW5jZVxyXG4gICAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQpIHtcclxuICAgICAgICAgICAgICBtb2RlbC5zdG9wTGlzdGVuaW5nKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBtb2RlbC5saXN0ZW5Ubyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCwgXy5iaW5kKHN5bmNDb250ZXh0Lm9uTWVzc2FnZSwgc3luY0NvbnRleHQsIHRoaXMsIG1vZGVsKSk7XHJcbiAgICAgICAgICAgIG1vZGVsLnN5bmNDb250ZXh0ID0gc3luY0NvbnRleHQ7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKGlzTW9kZWwobW9kZWwpKSB7XHJcbiAgICAgICAgLy8gb2ZmbGluZSBjYXBhYmlsaXR5IHJlcXVpcmVzIElEcyBmb3IgZGF0YVxyXG4gICAgICAgIGlmICghbW9kZWwuaWQpIHtcclxuICAgICAgICAgIGlmIChtZXRob2QgPT09ICdjcmVhdGUnKSB7XHJcbiAgICAgICAgICAgIG1vZGVsLnNldChtb2RlbC5pZEF0dHJpYnV0ZSwgb2JqZWN0aWQubWFrZU9iamVjdElEKCkpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKCdubyAodmFsaWQpIGlkOiAnICsgbW9kZWwuaWQpO1xyXG4gICAgICAgICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBzb21ldGhpbmcgaXMgcmVhbGx5IGF0IG9kZHMgaGVyZS4uLlxyXG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigndGFyZ2V0IG9mIHN5bmMgaXMgbmVpdGhlciBhIG1vZGVsIG5vciBhIGNvbGxlY3Rpb24hPyEnKTtcclxuICAgICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBhdCB0aGlzIHBvaW50IHRoZSB0YXJnZXQgc2VydmVyIGlzIGtub3duLCBjaGVjayBtYWtpbmcgc3VyZSB0aGUgY29ycmVjdCBzZXJ2ZXIgaXMgYmVpbmcgaGl0XHJcbiAgICAgIGNvbnN0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKG1vZGVsLmdldFVybFJvb3QoKSwge1xyXG4gICAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcclxuICAgICAgfSk7XHJcbiAgICAgIGlmIChzZXJ2ZXJVcmwgIT09IHRoaXMuc2VydmVyVXJsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdG9yZSBpcyBib3VuZCB0byBzZXJ2ZXIgJyArIHRoaXMuc2VydmVyVXJsKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgICB2YXIgdGltZSA9IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpO1xyXG4gICAgICAvLyBvbmx5IHNlbmQgcmVhZCBtZXNzYWdlcyBpZiBubyBvdGhlciBzdG9yZSBjYW4gZG8gdGhpcyBvciBmb3IgaW5pdGlhbCBsb2FkXHJcbiAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiBlbmRwb2ludC5sb2NhbFN0b3JlICYmIHRpbWUgJiYgIW9wdGlvbnMucmVzZXQpIHtcclxuICAgICAgICAvLyByZWFkIGRhdGEgZnJvbSBsb2NhbFN0b3JlIGFuZCBmZXRjaCBjaGFuZ2VzIHJlbW90ZVxyXG4gICAgICAgIHZhciBvcHRzID0gXy5jbG9uZShvcHRpb25zKTtcclxuICAgICAgICBvcHRzLnN0b3JlID0gZW5kcG9pbnQubG9jYWxTdG9yZTtcclxuICAgICAgICBvcHRzLmVudGl0eSA9IGVuZHBvaW50LmVudGl0eTtcclxuICAgICAgICBkZWxldGUgb3B0cy5zdWNjZXNzO1xyXG4gICAgICAgIGRlbGV0ZSBvcHRzLmVycm9yO1xyXG4gICAgICAgIHJldHVybiBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobWV0aG9kLCBtb2RlbCwgb3B0cykudGhlbigocmVzcCkgPT4ge1xyXG4gICAgICAgICAgLy8gYmFja2JvbmUgc3VjY2VzcyBjYWxsYmFjayBhbHRlcnMgdGhlIGNvbGxlY3Rpb24gbm93XHJcbiAgICAgICAgICByZXNwID0gdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3ApIHx8IHJlc3A7XHJcbiAgICAgICAgICBpZiAoZW5kcG9pbnQuc29ja2V0IHx8IG9wdGlvbnMuZmV0Y2hNb2RlID09PSAnbG9jYWwnKSB7XHJcbiAgICAgICAgICAgIC8vIG5vIG5lZWQgdG8gZmV0Y2ggY2hhbmdlcyBhcyB3ZSBnb3QgYSB3ZWJzb2NrZXQsIHRoYXQgaXMgZWl0aGVyIGNvbm5lY3RlZCBvciBhdHRlbXB0cyByZWNvbm5lY3Rpb25cclxuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gd2hlbiB3ZSBhcmUgZGlzY29ubmVjdGVkLCB0cnkgdG8gY29ubmVjdCBub3dcclxuICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KS50aGVuKChpbmZvKTogYW55ID0+IHtcclxuICAgICAgICAgICAgICAvLyB0cmlnZ2VyIHJlY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxyXG4gICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcclxuICAgICAgICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uQ29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgaW5mbztcclxuICAgICAgICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxyXG4gICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcclxuICAgICAgICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgcmVzcDtcclxuICAgICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7XHJcbiAgICAgICAgICB9IC8vIGVsc2UuLi5cclxuXHJcbiAgICAgICAgICAvLyBsb2FkIGNoYW5nZXMgb25seSAod2lsbCBoYXBwZW4gQUZURVIgc3VjY2VzcyBjYWxsYmFjayBpcyBpbnZva2VkLFxyXG4gICAgICAgICAgLy8gYnV0IHJldHVybmVkIHByb21pc2Ugd2lsbCByZXNvbHZlIG9ubHkgYWZ0ZXIgY2hhbmdlcyB3ZXJlIHByb2Nlc3NlZC5cclxuICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCkuY2F0Y2goKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KSB8fCByZXNwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cclxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgeGhyLCBtb2RlbCk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwO1xyXG4gICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7IC8vIGNhbGxlciBleHBlY3RzIG9yaWdpbmFsIFhIUiByZXNwb25zZSBhcyBjaGFuZ2VzIGJvZHkgZGF0YSBpcyBOT1QgY29tcGF0aWJsZVxyXG4gICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgIC8vIGZhbGwtYmFjayB0byBsb2FkaW5nIGZ1bGwgZGF0YSBzZXRcclxuICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gZG8gYmFja2JvbmUgcmVzdFxyXG4gICAgICByZXR1cm4gdGhpcy5fYWRkTWVzc2FnZShtZXRob2QsIG1vZGVsLCBvcHRpb25zLCBlbmRwb2ludCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfYWRkTWVzc2FnZShtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBjaGFuZ2VzID0gKDxNb2RlbD5tb2RlbCkuY2hhbmdlZFNpbmNlU3luYztcclxuICAgIHZhciBkYXRhOiBhbnkgPSBudWxsO1xyXG4gICAgdmFyIHN0b3JlTXNnID0gdHJ1ZTtcclxuICAgIHN3aXRjaCAobWV0aG9kKSB7XHJcbiAgICAgIGNhc2UgJ3VwZGF0ZSc6XHJcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XHJcbiAgICAgICAgZGF0YSA9IG9wdGlvbnMuYXR0cnMgfHwgbW9kZWwudG9KU09OKCk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdwYXRjaCc6XHJcbiAgICAgICAgaWYgKF8uaXNFbXB0eShjaGFuZ2VzKSkge1xyXG4gICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkYXRhID0gbW9kZWwudG9KU09OKHtcclxuICAgICAgICAgIGF0dHJzOiBjaGFuZ2VzXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBjYXNlICdkZWxldGUnOlxyXG4gICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCAoKCkgPT4gbWV0aG9kID09PSAncmVhZCcsICd1bmtub3duIG1ldGhvZDogJyArIG1ldGhvZCk7XHJcbiAgICAgICAgc3RvcmVNc2cgPSBmYWxzZTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICAgIGxldCBlbnRpdHkgPSBtb2RlbC5lbnRpdHkgfHwgZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwuZW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpO1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW50aXR5LmluZGV4T2YoJ34nKSA8IDAsICdlbnRpdHkgbmFtZSBtdXN0IG5vdCBjb250YWluIGEgfiBjaGFyYWN0ZXIhJyk7XHJcbiAgICB2YXIgbXNnOiBMaXZlRGF0YU1lc3NhZ2UgPSB7XHJcbiAgICAgIF9pZDogZW50aXR5ICsgJ34nICsgKDxNb2RlbD5tb2RlbCkuaWQsXHJcbiAgICAgIGlkOiAoPE1vZGVsPm1vZGVsKS5pZCxcclxuICAgICAgbWV0aG9kOiBtZXRob2QsXHJcbiAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgIC8vIGNoYW5uZWw6IGVuZHBvaW50LmNoYW5uZWwsIC8vIGNoYW5uZWwgaXMgaGFja2VkIGluIGJ5IHN0b3JlTWVzc2FnZSgpLCB3ZSBkb24ndCB3YW50IHRvIHVzZSB0aGlzIGFueW1vcmVcclxuICAgICAgcHJpb3JpdHk6IGVuZHBvaW50LnByaW9yaXR5LFxyXG4gICAgICB0aW1lOiBEYXRlLm5vdygpXHJcbiAgICB9O1xyXG5cclxuICAgIHZhciBxID0gUS5yZXNvbHZlKG1zZyk7XHJcbiAgICB2YXIgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD47XHJcbiAgICBpZiAoc3RvcmVNc2cpIHtcclxuICAgICAgLy8gc3RvcmUgYW5kIHBvdGVudGlhbGx5IG1lcmdlIG1lc3NhZ2VcclxuICAgICAgcU1lc3NhZ2UgPSB0aGlzLnN0b3JlTWVzc2FnZShlbmRwb2ludCwgcSk7XHJcbiAgICAgIHEgPSBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xyXG4gICAgICAgIC8vIGluIGNhc2Ugb2YgbWVyZ2luZywgdGhpcyByZXN1bHQgY291bGQgYmUgZGlmZmVyZW50XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuYXR0cmlidXRlcztcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcS50aGVuKChtc2cyOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcclxuICAgICAgLy8gcGFzcyBpbiBxTWVzc2FnZSBzbyB0aGF0IGRlbGV0aW9uIG9mIHN0b3JlZCBtZXNzYWdlIGNhbiBiZSBzY2hlZHVsZWRcclxuICAgICAgcmV0dXJuIHRoaXMuX2VtaXRNZXNzYWdlKGVuZHBvaW50LCBtc2cyLCBvcHRpb25zLCBtb2RlbCwgcU1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9lbWl0TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgb3B0aW9uczogYW55LFxyXG4gICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTpcclxuICBRLlByb21pc2U8YW55PiB7XHJcbiAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICB2YXIgcUFqYXggPSB0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XHJcbiAgICB2YXIgcSA9IHFBamF4O1xyXG5cclxuICAgIGlmIChxTWVzc2FnZSkge1xyXG4gICAgICAvLyBmb2xsb3dpbmcgdGFrZXMgY2FyZSBvZiBvZmZsaW5lIGNoYW5nZSBzdG9yZVxyXG4gICAgICBxID0gcS50aGVuKChkYXRhKSA9PiB7XHJcbiAgICAgICAgLy8gc3VjY2VzcywgcmVtb3ZlIG1lc3NhZ2Ugc3RvcmVkLCBpZiBhbnlcclxuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7IC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxyXG4gICAgICAgICAgcmV0dXJuIGRhdGE7XHJcbiAgICAgICAgfSkudGhlblJlc29sdmUoZGF0YSk7IC8vIHJlc29sdmUgYWdhaW4geWllbGRpbmcgZGF0YVxyXG4gICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgICAgLy8gZmFpbHVyZSBldmVudHVhbGx5IGNhdWdodCBieSBvZmZsaW5lIGNoYW5nZXNcclxuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIHRoaXMudXNlT2ZmbGluZUNoYW5nZXMpIHtcclxuICAgICAgICAgIC8vIHRoaXMgc2VhbXMgdG8gYmUgb25seSBhIGNvbm5lY3Rpb24gcHJvYmxlbSwgc28gd2Uga2VlcCB0aGUgbWVzc2FnZSBhbmQgY2FsbCBzdWNjZXNzXHJcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG1zZy5kYXRhKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgLy8gcmVtb3ZlIG1lc3NhZ2Ugc3RvcmVkIGFuZCBrZWVwIHJlamVjdGlvbiBhcyBpc1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTWVzc2FnZShlbmRwb2ludCwgbXNnLCBxTWVzc2FnZSkuY2F0Y2goKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7IC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxyXG4gICAgICAgICAgICByZXR1cm4geGhyO1xyXG4gICAgICAgICAgfSkudGhlblJlamVjdCh4aHIpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcSA9IHRoaXMuX2FwcGx5UmVzcG9uc2UocSwgZW5kcG9pbnQsIG1zZywgb3B0aW9ucywgbW9kZWwpO1xyXG5cclxuICAgIHJldHVybiBxLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICAvLyBkbyBzb21lIGNvbm5lY3Rpb24gaGFuZGxpbmdcclxuICAgICAgcmV0dXJuIHFBamF4LnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXHJcbiAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAvLyB0cmlnZ2VyIGRpc2Nvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcclxuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2FqYXhNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgZGVsZXRlIG9wdGlvbnMueGhyOyAvLyBtYWtlIHN1cmUgbm90IHRvIHVzZSBvbGQgdmFsdWVcclxuXHJcbiAgICB2YXIgdXJsID0gb3B0aW9ucy51cmw7XHJcbiAgICBpZiAoIXVybCkge1xyXG4gICAgICB1cmwgPSBlbmRwb2ludC51cmxSb290O1xyXG4gICAgICBpZiAobXNnLmlkICYmIG1zZy5tZXRob2QgIT09ICdjcmVhdGUnKSB7XHJcbiAgICAgICAgLy8gYWRkIElEIG9mIG1vZGVsXHJcbiAgICAgICAgdXJsICs9ICh1cmwuY2hhckF0KHVybC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1zZy5pZDtcclxuICAgICAgfVxyXG4gICAgICBpZiAobXNnLm1ldGhvZCA9PT0gJ3JlYWQnICYmIGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcclxuICAgICAgICAvLyBhZGQgcXVlcnkgb2YgY29sbGVjdGlvblxyXG4gICAgICAgIHZhciBjb2xsZWN0aW9uVXJsID0gXy5pc0Z1bmN0aW9uKG1vZGVsLnVybCkgPyBtb2RlbC51cmwoKSA6IG1vZGVsLnVybDtcclxuICAgICAgICB2YXIgcXVlcnlJbmRleCA9IGNvbGxlY3Rpb25VcmwubGFzdEluZGV4T2YoJz8nKTtcclxuICAgICAgICB2YXIgZ2V0UXVlcnkgPSBuZXcgR2V0UXVlcnkoKS5mcm9tSlNPTihvcHRpb25zKTtcclxuICAgICAgICAvLyBjdXJyZW50bHkgb25seSBzb3J0T3JkZXIgY2FuIGJlIHN1cHBvcnRlZCBhcyB3ZSByZXF1aXJlIHRoZSBpbml0aWFsIGRhdGEgbG9hZCB0byB5aWVsZCBmdWxsIGRhdGFzZXRcclxuICAgICAgICBnZXRRdWVyeS5saW1pdCA9IG51bGw7XHJcbiAgICAgICAgZ2V0UXVlcnkub2Zmc2V0ID0gbnVsbDtcclxuICAgICAgICBnZXRRdWVyeS5maWx0ZXIgPSBudWxsO1xyXG4gICAgICAgIGdldFF1ZXJ5LmZpZWxkcyA9IG51bGw7XHJcbiAgICAgICAgdmFyIGdldFBhcmFtcyA9IGdldFF1ZXJ5LnRvUXVlcnlQYXJhbXMoKTtcclxuICAgICAgICBpZiAocXVlcnlJbmRleCA+PSAwKSB7XHJcbiAgICAgICAgICB1cmwgKz0gY29sbGVjdGlvblVybC5zdWJzdHIocXVlcnlJbmRleCk7XHJcbiAgICAgICAgICBpZiAoZ2V0UGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBnZXRQYXJhbXM7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcclxuICAgICAgICAgICAgdXJsICs9ICc/JyArIGdldFBhcmFtcztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBlYXJsaWVzdCBwb2ludCB3aGVyZSB0YXJnZXQgVVJMIGlzIGtub3duXHJcbiAgICBkaWFnLmRlYnVnLmRlYnVnKCdhamF4TWVzc2FnZSAnICsgbXNnLm1ldGhvZCArICcgJyArIHVybCk7XHJcbiAgICB2YXIgb3B0czogYW55ID0ge1xyXG4gICAgICAvLyBtdXN0IG5vdCB0YWtlIGFyYml0cmFyeSBvcHRpb25zIGFzIHRoZXNlIHdvbid0IGJlIHJlcGxheWVkIG9uIHJlY29ubmVjdFxyXG4gICAgICB1cmw6IHVybCxcclxuICAgICAgYXR0cnM6IG1zZy5kYXRhLFxyXG4gICAgICBzdG9yZToge30sIC8vIGVuc3VyZXMgbmV0d29yayBpcyB1c2VkXHJcbiAgICAgIGNyZWRlbnRpYWxzOiBvcHRpb25zLmNyZWRlbnRpYWxzLFxyXG4gICAgICAvLyBlcnJvciBwcm9wYWdhdGlvblxyXG4gICAgICBlcnJvcjogb3B0aW9ucy5lcnJvclxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBwcm90ZWN0IGFnYWluc3Qgd3Jvbmcgc2VydmVyIGFuZCB1c2VyIGlkZW50aXR5XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcclxuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XHJcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XHJcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XHJcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdHMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gYWN0dWFsIGFqYXggcmVxdWVzdCB2aWEgYmFja2JvbmUuanNcclxuICAgIHJldHVybiB0aGlzLmNoZWNrU2VydmVyKHVybCwgb3B0cykudGhlbigoKSA9PiB7XHJcbiAgICAgIHJldHVybiBtb2RlbC5zeW5jKG1zZy5tZXRob2QsIG1vZGVsLCBvcHRzKS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgICAvLyB0YWtlIG92ZXIgeGhyIHJlc29sdmluZyB0aGUgb3B0aW9ucyBjb3B5XHJcbiAgICAgICAgb3B0aW9ucy54aHIgPSBvcHRzLnhoci54aHIgfHwgb3B0cy54aHI7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9hcHBseVJlc3BvbnNlPFQ+KHFYSFI6IFEuUHJvbWlzZTxUPiwgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvcHRpb25zOiBhbnksIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBRLlByb21pc2U8VD4ge1xyXG4gICAgLy8gdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgdmFyIGNsaWVudFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgIHJldHVybiBxWEhSLnRoZW4oKGRhdGE6IFQgfCBhbnkpID0+IHtcclxuICAgICAgLy8gZGVsZXRlIG9uIHNlcnZlciBkb2VzIG5vdCByZXNwb25kIGEgYm9keVxyXG4gICAgICBpZiAoIWRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScpIHtcclxuICAgICAgICBkYXRhID0gbXNnLmRhdGE7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHVwZGF0ZSBsb2NhbCBzdG9yZSBzdGF0ZVxyXG4gICAgICBpZiAoZGF0YSkge1xyXG4gICAgICAgIC8vIG5vIGRhdGEgaWYgc2VydmVyIGFza3Mgbm90IHRvIGFsdGVyIHN0YXRlXHJcbiAgICAgICAgLy8gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgbXNnLnRpbWUpO1xyXG4gICAgICAgIHZhciBwcm9taXNlczogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT5bXSA9IFtdO1xyXG4gICAgICAgIHZhciBkYXRhSWRzOiBhbnk7IC8vIG1vZGVsIGlkIC0+IGF0dHJpYnV0ZXMgZGF0YVxyXG4gICAgICAgIGlmIChtc2cubWV0aG9kICE9PSAncmVhZCcpIHtcclxuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIGRhdGEgPT09IG1zZy5kYXRhID8gbXNnIDogPExpdmVEYXRhTWVzc2FnZT5fLmRlZmF1bHRzKHtcclxuICAgICAgICAgICAgZGF0YTogZGF0YSAvLyBqdXN0IGFjY2VwdHMgbmV3IGRhdGFcclxuICAgICAgICAgIH0sIG1zZykpKSk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbGxlY3Rpb24obW9kZWwpICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcclxuICAgICAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBjb2xsZWN0aW9uIGNvbnRlbnRzIHdpdGggdGhlIGRhdGEgcmVhZFxyXG4gICAgICAgICAgdmFyIHN5bmNJZHMgPSB7fTtcclxuICAgICAgICAgIG1vZGVsLm1vZGVscy5mb3JFYWNoKChtKSA9PiB7XHJcbiAgICAgICAgICAgIHN5bmNJZHNbbS5pZF0gPSBtO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBkYXRhSWRzID0ge307XHJcbiAgICAgICAgICBkYXRhLmZvckVhY2goKGQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZCkge1xyXG4gICAgICAgICAgICAgIHZhciBpZCA9IGRbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZC5faWQ7XHJcbiAgICAgICAgICAgICAgZGF0YUlkc1tpZF0gPSBkO1xyXG4gICAgICAgICAgICAgIHZhciBtID0gc3luY0lkc1tpZF07XHJcbiAgICAgICAgICAgICAgaWYgKG0pIHtcclxuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgaXRlbVxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHN5bmNJZHNbaWRdOyAvLyBzbyB0aGF0IGl0IGlzIGRlbGV0ZWQgYmVsb3dcclxuICAgICAgICAgICAgICAgIGlmICghXy5pc0VxdWFsKF8ucGljay5jYWxsKG0sIG0uYXR0cmlidXRlcywgT2JqZWN0LmtleXMoZCkpLCBkKSkge1xyXG4gICAgICAgICAgICAgICAgICAvLyBhYm92ZSBjaGVja2VkIHRoYXQgYWxsIGF0dHJpYnV0ZXMgaW4gZCBhcmUgaW4gbSB3aXRoIGVxdWFsIHZhbHVlcyBhbmQgZm91bmQgc29tZSBtaXNtYXRjaFxyXG4gICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogZFxyXG4gICAgICAgICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgdGhlIGl0ZW1cclxuICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcclxuICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxyXG4gICAgICAgICAgICAgICAgICBtZXRob2Q6ICdjcmVhdGUnLFxyXG4gICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICAgICAgZGF0YTogZFxyXG4gICAgICAgICAgICAgICAgfSkpKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgT2JqZWN0LmtleXMoc3luY0lkcykuZm9yRWFjaCgoaWQpID0+IHtcclxuICAgICAgICAgICAgLy8gZGVsZXRlIHRoZSBpdGVtXHJcbiAgICAgICAgICAgIHZhciBtID0gc3luY0lkc1tpZF07XHJcbiAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcclxuICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcclxuICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICBkYXRhOiBtLmF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgfSkpKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyB0cmlnZ2VyIGFuIHVwZGF0ZSB0byBsb2FkIHRoZSBkYXRhIHJlYWRcclxuICAgICAgICAgIHZhciBhcnJheSA9IEFycmF5LmlzQXJyYXkoZGF0YSkgPyBkYXRhIDogW2RhdGFdO1xyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBkYXRhID0gYXJyYXlbaV07XHJcbiAgICAgICAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xyXG4gICAgICAgICAgICAgICAgaWQ6IGRhdGFbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZGF0YS5faWQsXHJcbiAgICAgICAgICAgICAgICBtZXRob2Q6ICd1cGRhdGUnLFxyXG4gICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXHJcbiAgICAgICAgICAgICAgfSkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gUS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgLy8gZGVsYXllZCB0aWxsIG9wZXJhdGlvbnMgY29tcGxldGVcclxuICAgICAgICAgIGlmICghZGF0YUlkcykge1xyXG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzQ29sbGVjdGlvbihtb2RlbCkpO1xyXG5cclxuICAgICAgICAgIC8vIHdoZW4gY29sbGVjdGlvbiB3YXMgdXBkYXRlZCBvbmx5IHBhc3MgZGF0YSBvZiBtb2RlbHMgdGhhdCB3ZXJlIHN5bmNlZCBvbiB0byB0aGUgc3VjY2VzcyBjYWxsYmFjayxcclxuICAgICAgICAgIC8vIGFzIHRoZSBjYWxsYmFjayB3aWxsIHNldCB0aGUgbW9kZWxzIGFnYWluIGNhdXNpbmcgb3VyIHNvcnRpbmcgYW5kIGZpbHRlcmluZyB0byBiZSB3aXRob3V0IGVmZmVjdC5cclxuICAgICAgICAgIHZhciByZXNwb25zZTogYW55W10gPSBbXTtcclxuICAgICAgICAgIGxldCBtb2RlbHMgPSBpc0NvbGxlY3Rpb24obW9kZWwpID8gbW9kZWwubW9kZWxzIDogW21vZGVsXTtcclxuICAgICAgICAgIGZvciAobGV0IGkgPSBtb2RlbHMubGVuZ3RoOyBpLS0gPiAwOyApIHtcclxuICAgICAgICAgICAgdmFyIG0gPSBtb2RlbHNbaV07XHJcbiAgICAgICAgICAgIGlmIChkYXRhSWRzW20uaWRdKSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2UucHVzaChtLmF0dHJpYnV0ZXMpO1xyXG4gICAgICAgICAgICAgIGRlbGV0ZSBkYXRhSWRzW20uaWRdO1xyXG4gICAgICAgICAgICAgIGlmIChkYXRhSWRzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXZlcnNlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xyXG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgRGF0ZSBoZWFkZXIgZnJvbSBvcHRpb25zLnhociBpbnN0ZWFkIG9mIHVzaW5nIGNsaWVudFRpbWVcclxuICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsLCBjbGllbnRUaW1lKTtcclxuICAgICAgfVxyXG4gICAgICAvLyBpbnZva2Ugc3VjY2VzcyBjYWxsYmFjaywgaWYgYW55XHJcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xyXG4gICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XHJcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZmV0Y2hDaGFuZ2VzKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIGZvcmNlID0gZmFsc2UpOiBRLlByb21pc2U8Q29sbGVjdGlvbj4ge1xyXG4gICAgbGV0IGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgaWYgKCFlbmRwb2ludC51cmxSb290IHx8ICFjaGFubmVsKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmU8Q29sbGVjdGlvbj4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIGxldCBwcm9taXNlID0gZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nQ2hhbmdlcztcclxuICAgIGlmIChwcm9taXNlICYmICFmb3JjZSkge1xyXG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPCAxMDAwKSB7XHJcbiAgICAgICAgLy8gcmV1c2UgZXhpc3RpbmcgZXZlbnR1YWxseSBjb21wbGV0ZWQgcmVxdWVzdCBmb3IgY2hhbmdlc1xyXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhjaGFubmVsICsgJyBza2lwcGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XHJcbiAgICBpZiAoIXRpbWUpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihjaGFubmVsICsgJyBjYW4gbm90IGZldGNoIGNoYW5nZXMgYXQgdGhpcyB0aW1lIScpO1xyXG4gICAgICByZXR1cm4gcHJvbWlzZSB8fCBRLnJlc29sdmU8Q29sbGVjdGlvbj4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBpbml0aWF0ZSBhIG5ldyByZXF1ZXN0IGZvciBjaGFuZ2VzXHJcbiAgICBkaWFnLmRlYnVnLmluZm8oY2hhbm5lbCArICcgaW5pdGlhdGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcclxuICAgIGxldCBjaGFuZ2VzOiBDb2xsZWN0aW9uID0gbmV3ICg8YW55PnRoaXMubWVzc2FnZXMpLmNvbnN0cnVjdG9yKCk7XHJcbiAgICBwcm9taXNlID0gdGhpcy5jaGVja1NlcnZlcihlbmRwb2ludC51cmxSb290ICsgJ2NoYW5nZXMvJyArIHRpbWUpLnRoZW4oKHVybCkgPT4ge1xyXG4gICAgICByZXR1cm4gUShjaGFuZ2VzLmZldGNoKDxCYWNrYm9uZS5Db2xsZWN0aW9uRmV0Y2hPcHRpb25zPntcclxuICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICBzdG9yZToge30sIC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXHJcblxyXG4gICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcclxuICAgICAgICAgIGlmIChjaGFuZ2VzLm1vZGVscy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNoYW5nZXMuZWFjaCgoY2hhbmdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xyXG4gICAgICAgICAgICAgIGxldCBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IGNoYW5nZS5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgIHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtc2cpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBmb2xsb3dpbmcgc2hvdWxkIHVzZSBzZXJ2ZXIgdGltZSFcclxuICAgICAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgbm93KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBvcHRpb25zLnhocjtcclxuICAgICAgICB9XHJcbiAgICAgIH0pKS50aGVuUmVzb2x2ZShjaGFuZ2VzKTtcclxuICAgIH0pO1xyXG4gICAgZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nQ2hhbmdlcyA9IHByb21pc2U7XHJcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPSBub3c7XHJcbiAgICByZXR1cm4gcHJvbWlzZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8TW9kZWw+IHtcclxuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgdmFyIHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvO1xyXG4gICAgaWYgKHByb21pc2UpIHtcclxuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdTZXJ2ZXJJbmZvIDwgMTAwMCkge1xyXG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcclxuICAgICAgICBkaWFnLmRlYnVnLndhcm5pbmcoZW5kcG9pbnQuY2hhbm5lbCArICcgc2tpcHBpbmcgaW5mbyByZXF1ZXN0Li4uJyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB2YXIgaW5mbyA9IG5ldyBNb2RlbCgpO1xyXG4gICAgdmFyIHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsKTtcclxuICAgIHZhciB1cmwgPSBlbmRwb2ludC51cmxSb290O1xyXG4gICAgaWYgKHVybC5jaGFyQXQoKHVybC5sZW5ndGggLSAxKSkgIT09ICcvJykge1xyXG4gICAgICB1cmwgKz0gJy8nO1xyXG4gICAgfVxyXG4gICAgcHJvbWlzZSA9IHRoaXMuY2hlY2tTZXJ2ZXIodXJsICsgJ2luZm8nKS50aGVuKCh1cmwpID0+IHtcclxuICAgICAgcmV0dXJuIFEoaW5mby5mZXRjaCg8QmFja2JvbmUuTW9kZWxGZXRjaE9wdGlvbnM+KHtcclxuICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICAvLyBAdG9kbyB3aHkgd2Ugc2V0IGEgc2VydmVyIHRpbWUgaGVyZSA/XHJcbiAgICAgICAgICBpZiAoIXRpbWUgJiYgaW5mby5nZXQoJ3RpbWUnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsLCBpbmZvLmdldCgndGltZScpKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmICghZW5kcG9pbnQuc29ja2V0UGF0aCAmJiBpbmZvLmdldCgnc29ja2V0UGF0aCcpKSB7XHJcbiAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldFBhdGggPSBpbmZvLmdldCgnc29ja2V0UGF0aCcpO1xyXG4gICAgICAgICAgICB2YXIgbmFtZSA9IGluZm8uZ2V0KCdlbnRpdHknKSB8fCBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xyXG4gICAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBuYW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG9wdGlvbnMueGhyO1xyXG4gICAgICAgIH1cclxuICAgICAgfSkpKS50aGVuUmVzb2x2ZShpbmZvKTtcclxuICAgIH0pO1xyXG4gICAgZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nU2VydmVySW5mbyA9IHByb21pc2U7XHJcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPSBub3c7XHJcbiAgICByZXR1cm4gcHJvbWlzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGNhbGxlZCB3aGVuIGFuIG9mZmxpbmUgY2hhbmdlIHdhcyBzZW50IHRvIHRoZSByZW1vdGUgc2VydmVyLlxyXG4gICAqXHJcbiAgICogPHA+XHJcbiAgICogTWF5IGJlIG92ZXJ3cml0dGVuIHRvIGFsdGVyIGNoYW5nZSBtZXNzYWdlIGVycm9yIGhhbmRsaW5nIGJlaGF2aW9yLiBUaGUgZGVmYXVsdCBpbXBsZW1lbnRhdGlvbiB3aWxsIGF0dGVtcHRcclxuICAgKiByZWxvYWRpbmcgdGhlIHNlcnZlciBkYXRhIGZvciByZXN0b3JpbmcgdGhlIGNsaWVudCBzdGF0ZSBzdWNoIHRoYXQgaXQgcmVmbGVjdHMgdGhlIHNlcnZlciBzdGF0ZS4gV2hlbiB0aGlzXHJcbiAgICogc3VjY2VlZGVkLCB0aGUgb2ZmbGluZSBjaGFuZ2UgaXMgZWZmZWN0aXZlbHkgcmV2ZXJ0ZWQgYW5kIHRoZSBjaGFuZ2UgbWVzc2FnZSBpcyBkcm9wcGVkLlxyXG4gICAqIDwvcD5cclxuICAgKiA8cD5cclxuICAgKiBBbiBvdmVyd3JpdHRlbiBpbXBsZW1lbnRhdGlvbiBtYXkgZGVjaWRlZCB3aGV0aGVyIHRvIHJldmVydCBmYWlsZWQgY2hhbmdlcyBiYXNlZCBvbiB0aGUgZXJyb3IgcmVwb3J0ZWQuXHJcbiAgICogPC9wPlxyXG4gICAqIDxwPlxyXG4gICAqIE5vdGljZSwgdGhlIG1ldGhvZCBpcyBub3QgY2FsbGVkIHdoZW4gdGhlIG9mZmxpbmUgY2hhbmdlIGZhaWxlZCBkdWUgdG8gYSBjb25uZWN0aXZpdHkgaXNzdWUuXHJcbiAgICogPC9wPlxyXG4gICAqXHJcbiAgICogQHBhcmFtIGVycm9yIHJlcG9ydGVkIGJ5IHJlbW90ZSBzZXJ2ZXIuXHJcbiAgICogQHBhcmFtIG1lc3NhZ2UgY2hhbmdlIHJlcG9ydGVkLCBhdHRyaWJ1dGVzIG9mIHR5cGUgTGl2ZURhdGFNZXNzYWdlLlxyXG4gICAqIEBwYXJhbSBvcHRpb25zIGNvbnRleHQgaW5mb3JtYXRpb24gcmVxdWlyZWQgdG8gYWNjZXNzIHRoZSBkYXRhIGxvY2FsbHkgYXMgd2VsbCBhcyByZW1vdGVseS5cclxuICAgKiBAcmV0dXJuIHthbnl9IFByb21pc2UgaW5kaWNhdGluZyBzdWNjZXNzIHRvIGRyb3AgdGhlIGNoYW5nZSBtZXNzYWdlIGFuZCBwcm9jZWVkIHdpdGggdGhlIG5leHQgY2hhbmdlLCBvclxyXG4gICAqICAgIHJlamVjdGlvbiBpbmRpY2F0aW5nIHRoZSBjaGFuZ2UgbWVzc2FnZSBpcyBrZXB0IGFuZCByZXRyaWVkIGxhdGVyIG9uLlxyXG4gICAqL1xyXG4gIHByb3RlY3RlZCBwcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3I6IEVycm9yLCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCwgb3B0aW9uczoge1xyXG4gICAgZW50aXR5OiBzdHJpbmcsXHJcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcclxuICAgIHVybFJvb3Q6IHN0cmluZyxcclxuICAgIGxvY2FsU3RvcmU6IFN0b3JlLFxyXG4gICAgc2lsZW50PzogYm9vbGVhblxyXG4gIH0pOiBQcm9taXNlTGlrZTx2b2lkIHwgYW55PiB7XHJcbiAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgIC8vIG1lc3NhZ2Ugd2FzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHlcclxuICAgICAgaWYgKCF0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xyXG4gICAgICAgIC8vIHdoZW4gbm90IHVzaW5nIHNvY2tldHMsIGZldGNoIGNoYW5nZXMgbm93XHJcbiAgICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbb3B0aW9ucy5lbnRpdHldO1xyXG4gICAgICAgIGlmIChlbmRwb2ludCkge1xyXG4gICAgICAgICAgLy8gd2lsbCBwdWxsIHRoZSBjaGFuZ2UgY2F1c2VkIGJ5IHRoZSBvZmZsaW5lIG1lc3NhZ2UgYW5kIHVwZGF0ZSB0aGUgbWVzc2FnZSB0aW1lLFxyXG4gICAgICAgICAgLy8gc28gdGhhdCB3ZSBhdm9pZCB0aGUgc2l0dWF0aW9uIHdoZXJlIHRoZSBjaGFuZ2UgY2F1c2VkIGJ5IHJlcGxheWluZyB0aGUgb2ZmbGluZVxyXG4gICAgICAgICAgLy8gY2hhbmdlIHJlc3VsdHMgaW4gYSBjb25mbGljdCBsYXRlciBvbi4uLlxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50LCB0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFEucmVzb2x2ZShtZXNzYWdlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBmYWlsZWQsIGV2ZW50dWFsbHkgdW5kbyB0aGUgbW9kaWZpY2F0aW9ucyBzdG9yZWRcclxuICAgIGlmICghb3B0aW9ucy5sb2NhbFN0b3JlKSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcmV2ZXJ0IG1vZGlmaWNhdGlvbiBieSByZWxvYWRpbmcgZGF0YVxyXG4gICAgbGV0IG1vZGVsVHlwZSA9IG9wdGlvbnMubW9kZWxUeXBlIHx8IE1vZGVsO1xyXG4gICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtZXNzYWdlLmdldCgnZGF0YScpLCB7XHJcbiAgICAgIGVudGl0eTogb3B0aW9ucy5lbnRpdHlcclxuICAgIH0pO1xyXG4gICAgbW9kZWwuaWQgPSBtZXNzYWdlLmdldCgnbWV0aG9kJykgIT09ICdjcmVhdGUnICYmIG1lc3NhZ2UuZ2V0KCdpZCcpO1xyXG4gICAgbGV0IHRyaWdnZXJFcnJvciA9ICgpID0+IHtcclxuICAgICAgLy8gaW5mb3JtIGNsaWVudCBhcHBsaWNhdGlvbiBvZiB0aGUgb2ZmbGluZSBjaGFuZ2VzIGVycm9yXHJcbiAgICAgIGxldCBjaGFubmVsID0gbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKTtcclxuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdDogdHJpZ2dlcmluZyBlcnJvciBmb3IgY2hhbm5lbCAnICsgY2hhbm5lbCArICcgb24gc3RvcmUnLCBlcnJvcik7XHJcbiAgICAgIGlmICghb3B0aW9ucy5zaWxlbnQpIHtcclxuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgbGV0IGxvY2FsT3B0aW9ucyA9IHtcclxuICAgICAgLy8ganVzdCBhZmZlY3QgbG9jYWwgc3RvcmVcclxuICAgICAgc3RvcmU6IG9wdGlvbnMubG9jYWxTdG9yZVxyXG4gICAgfTtcclxuICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgIHVybFJvb3Q6IG9wdGlvbnMudXJsUm9vdCxcclxuICAgICAgc3RvcmU6IHt9IC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXHJcbiAgICB9O1xyXG4gICAgaWYgKG1vZGVsLmlkKSB7XHJcbiAgICAgIHJlbW90ZU9wdGlvbnMudXJsID0gcmVtb3RlT3B0aW9ucy51cmxSb290ICsgKHJlbW90ZU9wdGlvbnMudXJsUm9vdC5jaGFyQXQocmVtb3RlT3B0aW9ucy51cmxSb290Lmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbW9kZWwuaWQ7XHJcbiAgICAgIC8vIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLnVybCgpID09PSByZW1vdGVPcHRpb25zLnVybCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBjcmVhdGlvbiBmYWlsZWQsIGp1c3QgZGVsZXRlIGxvY2FsbHlcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbWVzc2FnZS5nZXQoJ21ldGhvZCcpID09PSAnY3JlYXRlJyk7XHJcbiAgICAgIHJldHVybiBtb2RlbC5kZXN0cm95KGxvY2FsT3B0aW9ucykuZmluYWxseSh0cmlnZ2VyRXJyb3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuICg8US5Qcm9taXNlPGFueT4+PGFueT5tb2RlbC5mZXRjaChyZW1vdGVPcHRpb25zKSkudGhlbigoZGF0YSkgPT4ge1xyXG4gICAgICAvLyBvcmlnaW5hbCByZXF1ZXN0IGZhaWxlZCBhbmQgdGhlIGNvZGUgYWJvdmUgcmVsb2FkZWQgdGhlIGRhdGEgdG8gcmV2ZXJ0IHRoZSBsb2NhbCBtb2RpZmljYXRpb25zLCB3aGljaCBzdWNjZWVkZWQuLi5cclxuICAgICAgcmV0dXJuIG1vZGVsLnNhdmUoZGF0YSwgbG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XHJcbiAgICB9LCAoZmV0Y2hSZXNwOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSB0cmllZCB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMgYnkgcmVsb2FkaW5nIHRoZSBkYXRhLCB3aGljaCBmYWlsZWQgYXMgd2VsbC4uLlxyXG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gZmV0Y2hSZXNwICYmIGZldGNoUmVzcC5zdGF0dXNDb2RlO1xyXG4gICAgICBzd2l0Y2ggKHN0YXR1c0NvZGUpIHtcclxuICAgICAgICBjYXNlIDQwNDogLy8gTk9UIEZPVU5EXHJcbiAgICAgICAgY2FzZSA0MDE6IC8vIFVOQVVUSE9SSVpFRFxyXG4gICAgICAgIGNhc2UgNDEwOiAvLyBHT05FKlxyXG4gICAgICAgICAgLy8gLi4uYmVjYXVzZSB0aGUgaXRlbSBpcyBnb25lIGJ5IG5vdywgbWF5YmUgc29tZW9uZSBlbHNlIGNoYW5nZWQgaXQgdG8gYmUgZGVsZXRlZFxyXG4gICAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKTsgLy8gc2lsZW50IHJlZ2FyZGluZyB0cmlnZ2VyRXJyb3JcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KGZldGNoUmVzcCkuZmluYWxseSh0cmlnZ2VyRXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGZlZWRzIHBlbmRpbmcgb2ZmbGluZSAjbWVzc2FnZXMgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXHJcbiAgICpcclxuICAgKiA8cD5cclxuICAgKiBEdWUgdG8gY2xpZW50IGNvZGUgc2V0dGluZyB1cCBtb2RlbHMgb25lIGF0IGEgdGltZSwgdGhpcyBtZXRob2QgaXMgY2FsbGVkIG11bHRpcGxlIHRpbWVzIGR1cmluZyBpbml0aWFsIHNldHVwIG9mXHJcbiAgICogI2VuZHBvaW50cy4gVGhlIGZpcnN0IGNhbGwgZmV0Y2hlcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzLCBvcmRlcmVkIGJ5IHByaW9yaXR5IGFuZCB0aW1lLiBUaGVuIHRoZSAjbWVzc2FnZXNcclxuICAgKiBhcmUgc2VuZCB0byB0aGUgcmVtb3RlIHNlcnZlciB1bnRpbCBkZXBsZXRlZCwgYW4gZXJyb3Igb2NjdXJzLCBvciBzb21lIG1pc3NpbmcgZW5kcG9pbnQgaXMgZW5jb3VudGVkLlxyXG4gICAqIDwvcD5cclxuICAgKiA8cD5cclxuICAgKiBUaGUgbWV0aG9kIGlzIHRyaWdnZXJlZCBlYWNoIHRpbWUgYW4gZW5kcG9pbnQgaXMgcmVnaXN0ZXJlZCwgb3Igc3RhdGUgY2hhbmdlcyB0byBvbmxpbmUgZm9yIGFueSBlbmRwb2ludC4gV2hlblxyXG4gICAqIHN0YXRlIGNoYW5nZXMgZnJvbSBvZmZsaW5lIHRvIG9ubGluZSAoZGlzcmVnYXJkaW5nIGVuZHBvaW50KSBtZXNzYWdlIHN1Ym1pc3Npb24gaXMgcmVzdGFydGVkIGJ5IHJlc2V0dGluZyB0aGVcclxuICAgKiAjbWVzc2FnZXNQcm9taXNlLiBPdGhlcndpc2UsIHN1YnNlcXVlbnQgY2FsbHMgY2hhaW4gdG8gdGhlIGVuZCBvZiAjbWVzc2FnZXNQcm9taXNlLlxyXG4gICAqIDwvcD5cclxuICAgKlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IG9mICNtZXNzYWdlcyBDb2xsZWN0aW9uLCBvciBsYXN0IHJlY2VudCBvZmZsaW5lIHJlamVjdGlvblxyXG4gICAqIEBwcml2YXRlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBfc2VuZE1lc3NhZ2VzKCk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XHJcbiAgICAvLyBub3QgcmVhZHkgeWV0XHJcbiAgICBpZiAoIXRoaXMubWVzc2FnZXMpIHtcclxuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIHByb2Nlc3NlcyBtZXNzYWdlcyB1bnRpbCBub25lIGxlZnQsIGhpdHRpbmcgYSBtZXNzYWdlIG9mIGEgbm90IHlldCByZWdpc3RlcmVkIGVuZHBvaW50LCBvciBlbnRlcmluZ1xyXG4gICAgLy8gYSBub24tcmVjb3ZlcmFibGUgZXJyb3IuIFRoZSBwcm9taXNlIHJldHVybmVkIHJlc29sdmVzIHRvIHRoaXMubWVzc2FnZXMgd2hlbiBkb25lLlxyXG4gICAgbGV0IG5leHRNZXNzYWdlID0gKCk6IGFueSA9PiB7XHJcbiAgICAgIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gdGhpcy5tZXNzYWdlcy5tb2RlbHNbMF07XHJcbiAgICAgIGxldCBlbnRpdHkgPSBtZXNzYWdlLmlkLnN1YnN0cigwLCBtZXNzYWdlLmlkLmluZGV4T2YoJ34nKSk7XHJcbiAgICAgIGlmICghZW50aXR5KSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignc2VuZE1lc3NhZ2UgJyArIG1lc3NhZ2UuaWQgKyAnIHdpdGggbm8gZW50aXR5IScpO1xyXG4gICAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKS50aGVuKG5leHRNZXNzYWdlKTtcclxuICAgICAgfVxyXG4gICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xyXG4gICAgICBpZiAoIWVuZHBvaW50KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XHJcbiAgICAgIH1cclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW5kcG9pbnQuY2hhbm5lbCA9PT0gbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKSwgJ2NoYW5uZWwgb2YgZW5kcG9pbnQgJyArIGVuZHBvaW50LmNoYW5uZWwgKyAnIGRvZXMgbm90IG1hdGNoIGNoYW5uZWwgb2YgbWVzc2FnZSAnICsgbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKSk7XHJcbiAgICAgIGxldCBtc2cgPSB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtZXNzYWdlLmF0dHJpYnV0ZXMpO1xyXG5cclxuICAgICAgbGV0IG1vZGVsVHlwZSA9IGVuZHBvaW50Lm1vZGVsVHlwZSB8fCBNb2RlbDtcclxuICAgICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtc2cuZGF0YSwge1xyXG4gICAgICAgIGVudGl0eTogZW5kcG9pbnQuZW50aXR5XHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XHJcbiAgICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgdXJsUm9vdDogZW5kcG9pbnQudXJsUm9vdCxcclxuICAgICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcclxuICAgICAgfTtcclxuICAgICAgaWYgKG1vZGVsLmlkKSB7XHJcbiAgICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcclxuICAgICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xyXG4gICAgICB9XHJcbiAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VuZE1lc3NhZ2UgJyArIG1vZGVsLmlkKTtcclxuICAgICAgbGV0IG9mZmxpbmVPcHRpb25zID0ge1xyXG4gICAgICAgIGVudGl0eTogZW5kcG9pbnQuZW50aXR5LFxyXG4gICAgICAgIG1vZGVsVHlwZTogZW5kcG9pbnQubW9kZWxUeXBlLFxyXG4gICAgICAgIHVybFJvb3Q6IGVuZHBvaW50LnVybFJvb3QsXHJcbiAgICAgICAgbG9jYWxTdG9yZTogZW5kcG9pbnQubG9jYWxTdG9yZVxyXG4gICAgICB9O1xyXG4gICAgICByZXR1cm4gdGhpcy5fYXBwbHlSZXNwb25zZSh0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCksIGVuZHBvaW50LCBtc2csIHJlbW90ZU9wdGlvbnMsIG1vZGVsKS50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBzdWNjZWVkZWRcclxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQobnVsbCwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpO1xyXG4gICAgICB9LCAoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICBpZiAoZXJyb3Iuc3RhdHVzQ29kZSkge1xyXG4gICAgICAgICAgLy8gcmVtb3RlIGZhaWxlZFxyXG4gICAgICAgICAgcmV0dXJuIFEodGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3IsIG1lc3NhZ2UsIG9mZmxpbmVPcHRpb25zKSkuY2F0Y2goKGVycm9yMikgPT4ge1xyXG4gICAgICAgICAgICAvLyBleHBsaWNpdGx5IGRpc2Nvbm5lY3QgZHVlIHRvIGVycm9yIGluIGVuZHBvaW50XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLnRoZW5SZWplY3QoZXJyb3IyKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyBjb25uZWN0aXZpdHkgaXNzdWUsIGtlZXAgcmVqZWN0aW9uXHJcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gYXBwbHlpbmcgY2hhbmdlIHN1Y2NlZWRlZCBvciBzdWNjZXNzZnVsbHkgcmVjb3ZlcmVkIGNoYW5nZVxyXG4gICAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcclxuICAgICAgfSkudGhlbihuZXh0TWVzc2FnZSk7XHJcbiAgICB9O1xyXG5cclxuICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLl9zZW5kTWVzc2FnZXMnKTtcclxuICAgIGxldCBxID0gdGhpcy5tZXNzYWdlc1Byb21pc2U7XHJcbiAgICBpZiAoIXEpIHtcclxuICAgICAgLy8gaW5pdGlhbGx5IGZldGNoIGFsbCBtZXNzYWdlc1xyXG4gICAgICBxID0gUSh0aGlzLm1lc3NhZ2VzLmZldGNoKDxCYWNrYm9uZS5Db2xsZWN0aW9uRmV0Y2hPcHRpb25zPntcclxuICAgICAgICBzb3J0T3JkZXI6IFtcclxuICAgICAgICAgICcrcHJpb3JpdHknLFxyXG4gICAgICAgICAgJyt0aW1lJyxcclxuICAgICAgICAgICcraWQnXHJcbiAgICAgICAgXVxyXG4gICAgICB9KSk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUmVqZWN0ZWQoKSkge1xyXG4gICAgICAvLyBlYXJseSByZWplY3Rpb25cclxuICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXNQcm9taXNlO1xyXG4gICAgfSBlbHNlIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcclxuICAgICAgLy8gbm8gbW9yZSBtZXNzYWdlc1xyXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8ga2ljayB0byBwcm9jZXNzIHBlbmRpbmcgbWVzc2FnZXNcclxuICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gcS50aGVuKG5leHRNZXNzYWdlKTtcclxuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc3RvcmVNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIHFNc2c6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+KTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPiB7XHJcbiAgICByZXR1cm4gcU1zZy50aGVuKChtc2c6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xyXG4gICAgICBsZXQgb3B0aW9uczogQmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucztcclxuICAgICAgbGV0IGlkID0gdGhpcy5tZXNzYWdlcy5tb2RlbElkKG1zZyk7XHJcbiAgICAgIGRpYWcuZGVidWcuaW5mbygnc3RvcmVNZXNzYWdlICcgKyBpZCk7XHJcbiAgICAgIHZhciBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IGlkICYmIDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XHJcbiAgICAgIGlmIChtZXNzYWdlKSB7XHJcbiAgICAgICAgLy8gdXNlIGV4aXN0aW5nIGluc3RhbmNlLCBzaG91bGQgbm90IGJlIHRoZSBjYXNlIHVzdWFsbHlcclxuICAgICAgICBvcHRpb25zID0gPEJhY2tib25lLk1vZGVsU2F2ZU9wdGlvbnM+e1xyXG4gICAgICAgICAgbWVyZ2U6IHRydWVcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIGluc3RhbnRpYXRlIG5ldyBtb2RlbCwgaW50ZW50aW9uYWxseSBub3QgYWRkZWQgdG8gY29sbGVjdGlvblxyXG4gICAgICAgIG1lc3NhZ2UgPSBuZXcgdGhpcy5tZXNzYWdlcy5tb2RlbChtc2csIHtcclxuICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMubWVzc2FnZXMsXHJcbiAgICAgICAgICBzdG9yZTogdGhpcy5tZXNzYWdlcy5zdG9yZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG1lc3NhZ2Uuc2V0KCdjaGFubmVsJywgZW5kcG9pbnQuY2hhbm5lbCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIFEobWVzc2FnZS5zYXZlKG1zZywgb3B0aW9ucykpLnRoZW5SZXNvbHZlKG1lc3NhZ2UpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTogUS5Qcm9taXNlPHZvaWQ+IHtcclxuICAgIHJldHVybiBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xyXG4gICAgICBpZiAoIW1lc3NhZ2UpIHtcclxuICAgICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcclxuICAgICAgICBpZiAoIWlkKSB7XHJcbiAgICAgICAgICAvLyBtc2cgaXMgbm90IHBlcnNpc3RlbnRcclxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUodW5kZWZpbmVkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1lc3NhZ2UgPSA8TGl2ZURhdGFNZXNzYWdlTW9kZWw+dGhpcy5tZXNzYWdlcy5nZXQoaWQpO1xyXG4gICAgICAgIGlmICghbWVzc2FnZSkge1xyXG4gICAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKHtcclxuICAgICAgICAgICAgX2lkOiBtc2cuX2lkXHJcbiAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMubWVzc2FnZXMsXHJcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ3JlbW92ZU1lc3NhZ2UgJyArIG1lc3NhZ2UuaWQpO1xyXG4gICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBjbGVhcihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKSB7XHJcbiAgICBpZiAoY29sbGVjdGlvbikge1xyXG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IHRoaXMuZ2V0RW5kcG9pbnQoY29sbGVjdGlvbik7XHJcbiAgICAgIGlmIChlbmRwb2ludCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmRlc3Ryb3koKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29sbGVjdGlvbi5yZXNldCgpO1xyXG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsICcnKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogY2xvc2UgdGhlIHNvY2tldCBleHBsaWNpdFxyXG4gICAqL1xyXG4gIHB1YmxpYyBjbG9zZSgpIHtcclxuICAgIGlmICh0aGlzLm1lc3NhZ2VzLnN0b3JlKSB7XHJcbiAgICAgIHRoaXMubWVzc2FnZXMuc3RvcmUuY2xvc2UoKTtcclxuICAgICAgdGhpcy5tZXNzYWdlcyA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmVuZHBvaW50cyk7XHJcbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGtleXMubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XHJcbiAgICAgIHRoaXMuZW5kcG9pbnRzW2tleXNbaV1dLmNsb3NlKCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBtaXhpbnNcclxubGV0IHN5bmNTdG9yZSA9IF8uZXh0ZW5kKFN5bmNTdG9yZS5wcm90b3R5cGUsIHtcclxuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZScsXHJcblxyXG4gIGxvY2FsU3RvcmU6IFdlYlNxbFN0b3JlLFxyXG4gIHVzZUxvY2FsU3RvcmU6IHRydWUsXHJcbiAgdXNlU29ja2V0Tm90aWZ5OiB0cnVlLFxyXG4gIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlLFxyXG4gIHNvY2tldFBhdGg6ICcnXHJcbn0pO1xyXG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBTeW5jU3RvcmUucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShzeW5jU3RvcmUpKSk7XHJcbiJdfQ==