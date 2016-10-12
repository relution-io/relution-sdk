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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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SyxHQTJwQ25DO0FBM3BDWSxpQkFBUyxZQTJwQ3JCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVDLEtBQUssRUFBRSw2QkFBNkI7SUFFcEMsVUFBVSxFQUFFLHlCQUFXO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyNC4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIEJhY2tib25lIGZyb20gJ2JhY2tib25lJztcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIG9iamVjdGlkIGZyb20gJy4uL2NvcmUvb2JqZWN0aWQnO1xuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xuaW1wb3J0ICogYXMgd2ViIGZyb20gJy4uL3dlYic7XG5cbmltcG9ydCB7bG9jYWxTdG9yYWdlfSBmcm9tICcuLi93ZWIvb2ZmbGluZSc7XG5pbXBvcnQge0dldFF1ZXJ5fSBmcm9tICcuLi9xdWVyeS9HZXRRdWVyeSc7XG5pbXBvcnQge1N0b3JlLCBTdG9yZUN0b3J9IGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XG5pbXBvcnQge1N5bmNDb250ZXh0fSBmcm9tICcuL1N5bmNDb250ZXh0JztcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZSwgTGl2ZURhdGFNZXNzYWdlTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3RvciwgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb24sIGlzQ29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcblxuLyoqXG4gKiBpbyBvZiBicm93c2VyIHZpYSBzY3JpcHQgdGFnIG9yIHZpYSByZXF1aXJlIHNvY2tldC5pby1jbGllbnQsIGVudGlyZWx5IG9wdGlvbmFsLlxuICpcbiAqIE5vdGljZSwgdGhpcyBtb2R1bGUgaXMgZW50aXJlbHkgb3B0aW9uYWwgYXMgdGhlIHN0b3JlIG1heSBvcGVyYXRlIHdpdGhvdXQgaXQgaWYgc29ja2V0XG4gKiBub3RpZmljYXRpb25zIGFyZSBub3QgdXNlZC5cbiAqXG4gKiBAaW50ZXJuYWwgTm90IHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXG4gKi9cbmV4cG9ydCBjb25zdCBpbzogU29ja2V0SU9DbGllbnRTdGF0aWMgPSBnbG9iYWxbJ2lvJ10gfHwgLy8gbmF0aXZlIGltcGxlbWVudGF0aW9uXG4gIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nICYmICAgICAgICAgICAgICAgICAgICAgIC8vIG9yIHdoZW4gcmVxdWlyZSBpcyBhdmFpbGFibGVcbiAgKChmdW5jdGlvbiByZXF1aXJlU29ja2V0SW8oKSB7ICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVxdWlyZWQgdmVyc2lvblxuICAgIC8vIGhlcmUgd2UgYXJlIGluIGFuIGltbWVkaWF0ZWx5IGludm9rZWQgZnVuY3Rpb24gcmVxdWlyaW5nIHNvY2tldC5pby1jbGllbnQsIGlmIGF2YWlsYWJsZVxuICAgIHRyeSB7XG4gICAgICByZXR1cm4gKGdsb2JhbFsnaW8nXSA9IHJlcXVpcmUoJ3NvY2tldC5pby1jbGllbnQnKSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGRpYWcuZGVidWcud2Fybignb3B0aW9uYWwgc29ja2V0LmlvLWNsaWVudCBtb2R1bGUgaXMgbm90IGF2YWlsYWJsZTogJyArIGVycm9yICYmIGVycm9yLm1lc3NhZ2UpO1xuICAgIH1cbiAgfSkoKSk7XG5cbi8qKlxuICogY29ubmVjdHMgYSBNb2RlbC9Db2xsZWN0aW9uIHRvIGEgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIFRoaXMgd2lsbCBnaXZlIHlvdSBhbiBvbmxpbmUgYW5kIG9mZmxpbmUgc3RvcmUgd2l0aCBsaXZlIGRhdGEgdXBkYXRlcy5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGEganNvbixcbiAqIC8vIGFuZCB0aGUgb2ZmbGluZSBjaGFuZ2UgbG9nIHRvIGEgbG9jYWwgV2ViU3FsIGRhdGFiYXNlLCBzeW5jaHJvbml6ZSBpdFxuICogLy8gdHJvdWdoIFJFU1QgY2FsbHMgd2l0aCB0aGUgc2VydmVyIGFuZCByZWNlaXZlIGxpdmUgdXBkYXRlcyB2aWEgYSBzb2NrZXQuaW8gY29ubmVjdGlvbi5cbiAqIGNsYXNzIE15Q29sbGVjdGlvbiBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24ge307XG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLm1vZGVsID0gTXlNb2RlbDtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUudXJsID0gJ2h0dHA6Ly9teVNlcnZlci5pby9teU9yZ2EvbXlBcHBsaWNhdGlvbi9teUNvbGxlY3Rpb24nO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IG5ldyBSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUoe1xuICogICB1c2VMb2NhbFN0b3JlOiB0cnVlLCAgICAgLy8gKGRlZmF1bHQpIHN0b3JlIHRoZSBkYXRhIGZvciBvZmZsaW5lIHVzZVxuICogICB1c2VTb2NrZXROb3RpZnk6IHRydWUsICAgLy8gKGRlZmF1bHQpIHJlZ2lzdGVyIGF0IHRoZSBzZXJ2ZXIgZm9yIGxpdmUgdXBkYXRlc1xuICogICB1c2VPZmZsaW5lQ2hhbmdlczogdHJ1ZSAgLy8gKGRlZmF1bHQpIGFsbG93IGNoYW5nZXMgdG8gdGhlIG9mZmxpbmUgZGF0YVxuICogfSk7XG4gKi9cbmV4cG9ydCBjbGFzcyBTeW5jU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XG5cbiAgLy8gZm9sbG93aW5nIGFyZSBzdG9yZS1zcGVjaWZpYyBvcHRpb25zLCBkZWZhdWx0cyBzdG9yZWQgaW4gcHJvdG90eXBlIGF0IGVuZCBvZiB0aGlzIGZpbGVcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmU6IFN0b3JlQ3RvcjtcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmVPcHRpb25zOiBhbnk7XG4gIHByb3RlY3RlZCB1c2VMb2NhbFN0b3JlOiBib29sZWFuO1xuICBwcm90ZWN0ZWQgdXNlU29ja2V0Tm90aWZ5OiBib29sZWFuO1xuICBwcm90ZWN0ZWQgdXNlT2ZmbGluZUNoYW5nZXM6IGJvb2xlYW47XG4gIHByb3RlY3RlZCBzb2NrZXRQYXRoOiBzdHJpbmc7XG4gIHByb3RlY3RlZCBzb2NrZXRRdWVyeTogc3RyaW5nO1xuICBwcm90ZWN0ZWQgY3JlZGVudGlhbHM6IGFueTtcbiAgcHJvdGVjdGVkIG9yZGVyT2ZmbGluZUNoYW5nZXM6IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBzZXJ2ZXIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RvcmUuXG4gICAqXG4gICAqIFRoZSBzeW5jIG1ldGhvZCB3aWxsIGZhaWwgZWFybHkgd2hlbiBiZWluZyBhcHBsaWVkIHRvIGRhdGEgb2Ygc29tZSBvdGhlciBzZXJ2ZXIuXG4gICAqL1xuICBwcm90ZWN0ZWQgc2VydmVyVXJsOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBhcHBsaWNhdGlvbiBwYXJ0IHVzZWQgdG8gcmVzb2x2ZSBVUkxzIG1heSBvcHRpb25hbGx5IGJlIHNldCB1c2luZyBjb25zdHJ1Y3RvciBvcHRpb25zLlxuICAgKi9cbiAgcHJvdGVjdGVkIGFwcGxpY2F0aW9uOiBzdHJpbmc7XG4gIC8qKlxuICAgKiBpZGVudGl0eSBvciB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxuICAgKlxuICAgKiBUaGUgYWpheCBtZXRob2Qgd2lsbCBzaW11bGF0ZSBhbiBvZmZsaW5lIHRpbWVvdXQgd2hlbiB0aGUgdXNlciBpZGVudGl0eSBpcyBjaGFuZ2VkLiBUaGlzIGlzXG4gICAqIGJlY2F1c2UganVzdCBvbmUgc2Vzc2lvbiBjYW4gYmUgbWFpbnRhaW5lZCBwZXIgc2VydmVyIGFuZCBsb2dpbi9sb2dvdXQgc2VtYW50aWNzIG11c3QgYmUgd2VsbFxuICAgKiBiZWhhdmVkLlxuICAgKi9cbiAgcHJvdGVjdGVkIHVzZXJVdWlkOiBzdHJpbmc7XG5cbiAgcHVibGljIGVuZHBvaW50czoge1xuICAgIC8vIG1hcCBvZiBlbnRpdHkgdG8gU3luY0VuZHBvaW50XG4gICAgW2VudGl0eTogc3RyaW5nXTogU3luY0VuZHBvaW50O1xuICB9ID0ge307XG5cbiAgcHJpdmF0ZSBsYXN0TWVzZ1RpbWU6IGFueTtcblxuICAvKipcbiAgICogd2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBlbnRpdHkgY2F1c2VkIGEgZGlzY29ubmVjdGlvbi5cbiAgICpcbiAgICogPHA+XG4gICAqIFRoaXMgaXMgc2V0IHRvIGFuIGVudGl0eSBuYW1lIHRvIGxpbWl0IHdoaWNoIGVudGl0eSBtYXkgY2F1c2UgYSBjaGFuZ2UgdG8gb25saW5lIHN0YXRlIGFnYWluLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBwcml2YXRlIGRpc2Nvbm5lY3RlZEVudGl0eTogc3RyaW5nID0gJ2FsbCc7XG5cbiAgcHVibGljIG1lc3NhZ2VzOiBDb2xsZWN0aW9uO1xuICBwdWJsaWMgbWVzc2FnZXNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IGFueSkge1xuICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgIGlmICh0aGlzLmNyZWRlbnRpYWxzKSB7XG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gXy5jbG9uZSh0aGlzLmNyZWRlbnRpYWxzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKSB7XG4gICAgICB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgPSBfLmNsb25lKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIHR5cGVvZiBpbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybmluZygnU29ja2V0LklPIG5vdCBwcmVzZW50ICEhJyk7XG4gICAgICB0aGlzLnVzZVNvY2tldE5vdGlmeSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBvdmVyd3JpdHRlbiB0byByZXNvbHZlIHJlbGF0aXZlIFVSTHMgYWdhaW5zdCB0aGUgU3luY1N0b3JlI3NlcnZlclVybC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVXJsKHVybDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHdlYi5yZXNvbHZlVXJsKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybCxcbiAgICAgIGFwcGxpY2F0aW9uOiB0aGlzLmFwcGxpY2F0aW9uXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogYmluZHMgdGhlIHN0b3JlIHRvIGEgdGFyZ2V0IHNlcnZlciB3aGVuIHRoZSBmaXJzdCBlbmRwb2ludCBpcyBjcmVhdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsUm9vdCB1c2VkIHRvIHJlc29sdmUgdGhlIHNlcnZlciB0byBvcGVyYXRlLlxuICAgICAqL1xuICBwcml2YXRlIGluaXRTZXJ2ZXIodXJsUm9vdDogc3RyaW5nKSB7XG4gICAgbGV0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKHVybFJvb3QsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuc2VydmVyVXJsKSB7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgICAgIHRoaXMuc2VydmVyVXJsID0gc2VydmVyVXJsO1xuICAgICAgdGhpcy51c2VyVXVpZCA9IHNlcnZlci5hdXRob3JpemF0aW9uLm5hbWU7XG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiAhdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscykge1xuICAgICAgICAvLyBjYXB0dXJlIGNyZWRlbnRpYWxzIGZvciB1c2UgYnkgY3J5cHRvIHN0b3Jlc1xuICAgICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzID0gXy5kZWZhdWx0cyh7XG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcbiAgICAgICAgfSwgc2VydmVyLmNyZWRlbnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RvcmUgaXMgYm91bmQgdG8gc2VydmVyICcgKyB0aGlzLnNlcnZlclVybCArICcgYWxyZWFkeScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTZXJ2ZXIodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8c3RyaW5nPiB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gd2ViLnJlc29sdmVTZXJ2ZXIodXJsLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcbiAgICBpZiAoc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHRoaXMuc2VydmVyVXJsKS5hdXRob3JpemF0aW9uLm5hbWUgIT09IHRoaXMudXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIG9wdGlvbnMgJiYgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgUS5yZWplY3Q8c3RyaW5nPihlcnJvcik7XG4gICAgfVxuICAgIHJldHVybiBRLnJlc29sdmUodXJsKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpbml0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbiwgbW9kZWxUeXBlOiBNb2RlbEN0b3IpOiBTeW5jRW5kcG9pbnQge1xuICAgIHZhciB1cmxSb290ID0gbW9kZWxPckNvbGxlY3Rpb24uZ2V0VXJsUm9vdCgpO1xuICAgIHZhciBlbnRpdHkgPSBtb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHk7XG4gICAgaWYgKHVybFJvb3QgJiYgZW50aXR5KSB7XG4gICAgICAvLyBnZXQgb3IgY3JlYXRlIGVuZHBvaW50IGZvciB0aGlzIHVybFxuICAgICAgdGhpcy5pbml0U2VydmVyKHVybFJvb3QpO1xuICAgICAgdmFyIGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuaW5pdEVuZHBvaW50OiAnICsgZW50aXR5KTtcbiAgICAgICAgZW5kcG9pbnQgPSBuZXcgU3luY0VuZHBvaW50KHtcbiAgICAgICAgICBlbnRpdHk6IGVudGl0eSxcbiAgICAgICAgICBtb2RlbFR5cGU6IG1vZGVsVHlwZSxcbiAgICAgICAgICB1cmxSb290OiB1cmxSb290LFxuICAgICAgICAgIHNvY2tldFBhdGg6IHRoaXMuc29ja2V0UGF0aCxcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5lbmRwb2ludHNbZW50aXR5XSA9IGVuZHBvaW50O1xuXG4gICAgICAgIGVuZHBvaW50LmxvY2FsU3RvcmUgPSB0aGlzLmNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQpO1xuICAgICAgICBlbmRwb2ludC5wcmlvcml0eSA9IHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyAmJiAoXy5sYXN0SW5kZXhPZih0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMsIGVuZHBvaW50LmVudGl0eSkgKyAxKTtcbiAgICAgICAgdGhpcy5jcmVhdGVNc2dDb2xsZWN0aW9uKCk7XG4gICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBlbnRpdHkpO1xuICAgICAgICBlbmRwb2ludC5pbmZvID0gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uZmlndXJhdGlvbiBjYW4gbm90IGNoYW5nZSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkLi4uXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVybFJvb3QgPT09IHVybFJvb3QsICdjYW4gbm90IGNoYW5nZSB1cmxSb290LCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQhJyk7XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVzZXJVdWlkID09PSB0aGlzLnVzZXJVdWlkLCAnY2FuIG5vdCBjaGFuZ2UgdXNlciBpZGVudGl0eSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKiBcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBNb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIGluaXRNb2RlbChtb2RlbDogTW9kZWwpOiB2b2lkIHtcbiAgICBtb2RlbC5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KG1vZGVsLCA8TW9kZWxDdG9yPm1vZGVsLmNvbnN0cnVjdG9yKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKiBcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IHZvaWQge1xuICAgIGNvbGxlY3Rpb24uZW5kcG9pbnQgPSB0aGlzLmluaXRFbmRwb2ludChjb2xsZWN0aW9uLCBjb2xsZWN0aW9uLm1vZGVsKTtcbiAgfVxuXG4gIGdldEVuZHBvaW50KG1vZGVsT3JDb2xsZWN0aW9uOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBTeW5jRW5kcG9pbnQge1xuICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW21vZGVsT3JDb2xsZWN0aW9uLmVudGl0eV07XG4gICAgaWYgKGVuZHBvaW50KSB7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB7XG4gICAgICAgIC8vIGNoZWNrcyB0aGF0IG1vZGVsT3JDb2xsZWN0aW9uIHVzZXMgYSBtb2RlbCBpbmhlcml0aW5nIGZyb20gdGhlIG9uZSBvZiB0aGUgZW5kcG9pbnRcbiAgICAgICAgbGV0IG1vZGVsVHlwZSA9IGlzQ29sbGVjdGlvbihtb2RlbE9yQ29sbGVjdGlvbikgPyBtb2RlbE9yQ29sbGVjdGlvbi5tb2RlbCA6IG1vZGVsT3JDb2xsZWN0aW9uLmNvbnN0cnVjdG9yO1xuICAgICAgICByZXR1cm4gbW9kZWxUeXBlID09PSBlbmRwb2ludC5tb2RlbFR5cGUgfHwgbW9kZWxUeXBlLnByb3RvdHlwZSBpbnN0YW5jZW9mIGVuZHBvaW50Lm1vZGVsVHlwZTtcbiAgICAgIH0sICd3cm9uZyB0eXBlIG9mIG1vZGVsIScpO1xuICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFN0b3JlIHtcbiAgICBpZiAodGhpcy51c2VMb2NhbFN0b3JlKSB7XG4gICAgICB2YXIgZW50aXRpZXMgPSB7fTtcbiAgICAgIGVudGl0aWVzW2VuZHBvaW50LmVudGl0eV0gPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgdmFyIHN0b3JlT3B0aW9uID0ge1xuICAgICAgICBlbnRpdGllczogZW50aXRpZXNcbiAgICAgIH07XG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgc3RvcmVPcHRpb24gPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgICAgICBzdG9yZU9wdGlvbi5lbnRpdGllcyA9IGVudGl0aWVzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmxvY2FsU3RvcmUoc3RvcmVPcHRpb24pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gSGVyZSB3ZSBzYXZlIHRoZSBjaGFuZ2VzIGluIGEgTWVzc2FnZSBsb2NhbCB3ZWJzcWxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBjcmVhdGVNc2dDb2xsZWN0aW9uKCk6IENvbGxlY3Rpb24ge1xuICAgIGlmICh0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzICYmICF0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XG4gICAgICAgIG1vZGVsOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCxcbiAgICAgICAgc3RvcmU6IG5ldyB0aGlzLmxvY2FsU3RvcmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucylcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgfVxuXG4gIGNyZWF0ZVNvY2tldChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkgJiYgZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0UGF0aCkge1xuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmNyZWF0ZVNvY2tldDogJyArIG5hbWUpO1xuXG4gICAgICAvLyByZXNvdXJjZVxuICAgICAgbGV0IGNvbm5lY3RWbzogYW55ID0ge1xuICAgICAgfTtcbiAgICAgIGxldCByZXNvdXJjZSA9IGVuZHBvaW50LnNvY2tldFBhdGg7IC8vIHJlbW92ZSBsZWFkaW5nIC9cbiAgICAgIGNvbm5lY3RWby5yZXNvdXJjZSA9IChyZXNvdXJjZSAmJiByZXNvdXJjZS5pbmRleE9mKCcvJykgPT09IDApID8gcmVzb3VyY2Uuc3Vic3RyKDEpIDogcmVzb3VyY2U7XG4gICAgICBpZiAodGhpcy5zb2NrZXRRdWVyeSkge1xuICAgICAgICBjb25uZWN0Vm8ucXVlcnkgPSB0aGlzLnNvY2tldFF1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBzb2NrZXRcbiAgICAgIGVuZHBvaW50LnNvY2tldCA9IGlvLmNvbm5lY3QoZW5kcG9pbnQuaG9zdCwgY29ubmVjdFZvKTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgdGhpcy5fYmluZENoYW5uZWwoZW5kcG9pbnQsIG5hbWUpO1xuICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpLmRvbmUoKTtcbiAgICAgIH0pO1xuICAgICAgZW5kcG9pbnQuc29ja2V0Lm9uKCdkaXNjb25uZWN0JywgKCkgPT4ge1xuICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NvY2tldC5pbzogZGlzY29ubmVjdCcpO1xuICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLmRvbmUoKTtcbiAgICAgIH0pO1xuICAgICAgZW5kcG9pbnQuc29ja2V0Lm9uKGVuZHBvaW50LmNoYW5uZWwsIChtc2c6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gZW5kcG9pbnQuc29ja2V0O1xuICAgIH1cbiAgfVxuXG4gIF9iaW5kQ2hhbm5lbChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lPzogc3RyaW5nKSB7XG4gICAgaWYgKGVuZHBvaW50ICYmIGVuZHBvaW50LnNvY2tldCkge1xuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLl9iaW5kQ2hhbm5lbDogJyArIG5hbWUpO1xuXG4gICAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgICB2YXIgc29ja2V0ID0gZW5kcG9pbnQuc29ja2V0O1xuICAgICAgdmFyIHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICAgIHNvY2tldC5lbWl0KCdiaW5kJywge1xuICAgICAgICBlbnRpdHk6IG5hbWUsXG4gICAgICAgIGNoYW5uZWw6IGNoYW5uZWwsXG4gICAgICAgIHRpbWU6IHRpbWVcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIGdldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICghdGhpcy5sYXN0TWVzZ1RpbWUpIHtcbiAgICAgIHRoaXMubGFzdE1lc2dUaW1lID0ge307XG4gICAgfSBlbHNlIGlmICh0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF07XG4gICAgfVxuICAgIC8vIHRoZSB8IDAgYmVsb3cgdHVybnMgc3RyaW5ncyBpbnRvIG51bWJlcnNcbiAgICB2YXIgdGltZSA9IGxvY2FsU3RvcmFnZSgpLmdldEl0ZW0oJ19fJyArIGNoYW5uZWwgKyAnbGFzdE1lc2dUaW1lJykgfHwgMDtcbiAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XG4gICAgcmV0dXJuIHRpbWU7XG4gIH1cblxuICBzZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiB2b2lkIHtcbiAgICBpZiAoIXRpbWUgfHwgdGltZSA+IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UoKS5zZXRJdGVtKCdfXycgKyBjaGFubmVsICsgJ2xhc3RNZXNnVGltZScsIHRpbWUpO1xuICAgICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgIH1cbiAgfVxuXG4gIG9uQ29ubmVjdChlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAvLyB3aGVuIG9mZmxpbmUgdHJhbnNtaXNzaW9uIGlzIHBlbmRpbmcsIG5lZWQgdG8gd2FpdCBmb3IgaXQgdG8gY29tcGxldGVcbiAgICAgIGxldCBxID0gUS5yZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UgJiYgdGhpcy5tZXNzYWdlc1Byb21pc2UuaXNQZW5kaW5nKCkpIHtcbiAgICAgICAgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlLmNhdGNoKChlcnJvcikgPT4gUS5yZXNvbHZlKHVuZGVmaW5lZCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jIHNlcnZlci9jbGllbnQgY2hhbmdlc1xuICAgICAgZW5kcG9pbnQuaXNDb25uZWN0ZWQgPSBxLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBuZXh0IHdlJ2xsIGZldGNoIHNlcnZlci1zaWRlIGNoYW5nZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAvLyB0aGVuIHNlbmQgY2xpZW50LXNpZGUgY2hhbmdlc1xuICAgICAgICAgIGlmICh0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9PT0gJ2FsbCcgfHwgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSkge1xuICAgICAgICAgICAgLy8gcmVzdGFydCByZXBsYXlpbmcgb2Ygb2ZmbGluZSBtZXNzYWdlc1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fc2VuZE1lc3NhZ2VzKCk7XG4gICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIC8vIGNhdGNoIHdpdGhvdXQgZXJyb3IgaW5kaWNhdGVzIGRpc2Nvbm5lY3Rpb24gd2hpbGUgZ29pbmcgb25saW5lXG4gICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgLy8gZGlzY29ubmVjdGVkIHdoaWxlIHNlbmRpbmcgb2ZmbGluZSBjaGFuZ2VzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAvLyBpbiB0aGUgZW5kLCB3aGVuIGNvbm5lY3RlZCBzdGlsbCwgZmlyZSBhbiBldmVudCBpbmZvcm1pbmcgY2xpZW50IGNvZGVcbiAgICAgICAgaWYgKGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdjb25uZWN0OicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBlbmRwb2ludC5pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIG9uRGlzY29ubmVjdChlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gbnVsbDtcbiAgICBpZiAoIXRoaXMuZGlzY29ubmVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9ICdhbGwnO1xuICAgIH1cblxuICAgIHJldHVybiBRLmZjYWxsKCgpID0+IHtcbiAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgJiYgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQpIHtcbiAgICAgICAgLy8gY29uc2lkZXIgY2FsbGluZyBlbmRwb2ludC5zb2NrZXQuZGlzY29ubmVjdCgpIGluc3RlYWRcbiAgICAgICAgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQub25EaXNjb25uZWN0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Rpc2Nvbm5lY3Q6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgX2ZpeE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBMaXZlRGF0YU1lc3NhZ2Uge1xuICAgIGxldCBpZEF0dHJpYnV0ZSA9IGVuZHBvaW50Lm1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGU7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFpZEF0dHJpYnV0ZSwgJ25vIGlkQXR0cmlidXRlIScpO1xuXG4gICAgaWYgKG1zZy5kYXRhICYmICFtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gJiYgbXNnLmRhdGEuX2lkKSB7XG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2cuZGF0YS5faWQ7IC8vIHNlcnZlciBidWchXG4gICAgfSBlbHNlIGlmICghbXNnLmRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScgJiYgbXNnW2lkQXR0cmlidXRlXSkge1xuICAgICAgbXNnLmRhdGEgPSB7fTtcbiAgICAgIG1zZy5kYXRhW2lkQXR0cmlidXRlXSA9IG1zZ1tpZEF0dHJpYnV0ZV07IC8vIHNlcnZlciBidWchXG4gICAgfVxuICAgIHJldHVybiBtc2c7XG4gIH1cblxuICBvbk1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPiB7XG4gICAgLy8gdGhpcyBpcyBjYWxsZWQgYnkgdGhlIHN0b3JlIGl0c2VsZiBmb3IgYSBwYXJ0aWN1bGFyIGVuZHBvaW50IVxuICAgIGlmICghbXNnIHx8ICFtc2cubWV0aG9kKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3Q8TGl2ZURhdGFNZXNzYWdlPihuZXcgRXJyb3IoJ25vIG1lc3NhZ2Ugb3IgbWV0aG9kIGdpdmVuJykpO1xuICAgIH1cblxuICAgIHZhciBxOiBRLlByb21pc2U8YW55PjtcbiAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgaWYgKGVuZHBvaW50LmxvY2FsU3RvcmUpIHtcbiAgICAgIC8vIGZpcnN0IHVwZGF0ZSB0aGUgbG9jYWwgc3RvcmUgYnkgZm9ybWluZyBhIG1vZGVsIGFuZCBpbnZva2luZyBzeW5jXG4gICAgICB2YXIgb3B0aW9ucyA9IF8uZGVmYXVsdHMoe1xuICAgICAgICBzdG9yZTogZW5kcG9pbnQubG9jYWxTdG9yZVxuICAgICAgfSwgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyk7XG4gICAgICB2YXIgbW9kZWwgPSBuZXcgZW5kcG9pbnQubW9kZWxUeXBlKG1zZy5kYXRhLCBfLmV4dGVuZCh7XG4gICAgICAgIHBhcnNlOiB0cnVlXG4gICAgICB9LCBvcHRpb25zKSk7XG4gICAgICBpZiAoIW1vZGVsLmlkKSB7XG4gICAgICAgIC8vIGNvZGUgYmVsb3cgd2lsbCBwZXJzaXN0IHdpdGggYXV0by1hc3NpZ25lZCBpZCBidXQgdGhpcyBuZXZlcnRoZWxlc3MgaXMgYSBicm9rZW4gcmVjb3JkXG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgcmVjZWl2ZWQgZGF0YSB3aXRoIG5vIHZhbGlkIGlkIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QgKyAnIScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QpO1xuICAgICAgfVxuICAgICAgcSA9IGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtc2cubWV0aG9kLCBtb2RlbCwgXy5leHRlbmQob3B0aW9ucywge1xuICAgICAgICBtZXJnZTogbXNnLm1ldGhvZCA9PT0gJ3BhdGNoJ1xuICAgICAgfSkpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoIW1zZy5pZCB8fCBtc2cuaWQgPT09IG1vZGVsLmlkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlkIHZhbHVlIHdhcyByZWFzc2lnbmVkLCBkZWxldGUgcmVjb3JkIG9mIG9sZCBpZFxuICAgICAgICB2YXIgb2xkRGF0YSA9IHt9O1xuICAgICAgICBvbGREYXRhW21vZGVsLmlkQXR0cmlidXRlXSA9IG1zZy5pZDtcbiAgICAgICAgdmFyIG9sZE1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShvbGREYXRhLCBvcHRpb25zKTtcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHJlYXNzaWduZWQgZnJvbSBvbGQgcmVjb3JkICcgKyBvbGRNb2RlbC5pZCk7XG4gICAgICAgIHJldHVybiBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMoJ2RlbGV0ZScsIG9sZE1vZGVsLCBvcHRpb25zKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBqdXN0IHVwZGF0ZSBhbGwgY29sbGVjdGlvbnMgbGlzdGVuaW5nXG4gICAgICBxID0gUS5yZXNvbHZlKG1zZyk7XG4gICAgfVxuXG4gICAgLy8gZmluYWxseSBzZXQgdGhlIG1lc3NhZ2UgdGltZVxuICAgIHJldHVybiBxLnRoZW4oKCkgPT4ge1xuICAgICAgaWYgKG1zZy50aW1lKSB7XG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIG1zZy50aW1lKTtcbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIGFsbCBjb2xsZWN0aW9ucyBsaXN0ZW5pbmdcbiAgICAgIHRoaXMudHJpZ2dlcignc3luYzonICsgY2hhbm5lbCwgbXNnKTsgLy8gU3luY0NvbnRleHQub25NZXNzYWdlXG4gICAgICByZXR1cm4gbXNnO1xuICAgIH0sIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIC8vIG5vdCBzZXR0aW5nIG1lc3NhZ2UgdGltZSBpbiBlcnJvciBjYXNlXG5cbiAgICAgIC8vIHJlcG9ydCBlcnJvciBhcyBldmVudCBvbiBzdG9yZVxuICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTtcbiAgICAgIHJldHVybiBtc2c7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pOiBRLlByb21pc2U8YW55PiB7XG4gICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnN5bmMnKTtcbiAgICB0cnkge1xuICAgICAgdmFyIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQgPSBtb2RlbC5lbmRwb2ludCB8fCB0aGlzLmdldEVuZHBvaW50KG1vZGVsKTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBlbmRwb2ludCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBjb2xsZWN0aW9ucyBjYW4gYmUgZmlsdGVyZWQsIGV0Yy5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ3JlYWQnICYmICFvcHRpb25zLmJhcmVib25lKSB7XG4gICAgICAgICAgdmFyIHN5bmNDb250ZXh0OiBTeW5jQ29udGV4dCA9IG9wdGlvbnMuc3luY0NvbnRleHQ7IC8vIHN5bmMgY2FuIGJlIGNhbGxlZCBieSBTeW5jQ29udGV4dCBpdHNlbGYgd2hlbiBwYWdpbmcgcmVzdWx0c1xuICAgICAgICAgIGlmICghc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIGNhcHR1cmUgR2V0UXVlcnkgb3B0aW9uc1xuICAgICAgICAgICAgc3luY0NvbnRleHQgPSBuZXcgU3luY0NvbnRleHQoXG4gICAgICAgICAgICAgIG9wdGlvbnMsICAgICAgICAvLyBkeW5hbWljIG9wdGlvbnMgcGFzc2VkIHRvIGZldGNoKCkgaW1wbGVtZW50IFVJIGZpbHRlcnMsIGV0Yy5cbiAgICAgICAgICAgICAgbW9kZWwub3B0aW9ucywgIC8vIHN0YXRpYyBvcHRpb25zIG9uIGNvbGxlY3Rpb24gaW1wbGVtZW50IHNjcmVlbi1zcGVjaWZpYyBzdHVmZlxuICAgICAgICAgICAgICB0aGlzICAgICAgICAgICAgLy8gc3RhdGljIG9wdGlvbnMgb2YgdGhpcyBzdG9yZSByZWFsaXplIGZpbHRlcmluZyBjbGllbnQvc2VydmVyXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgb3B0aW9ucy5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQgIT09IHN5bmNDb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBhc3NpZ24gYSBkaWZmZXJlbnQgaW5zdGFuY2VcbiAgICAgICAgICAgIGlmIChtb2RlbC5zeW5jQ29udGV4dCkge1xuICAgICAgICAgICAgICBtb2RlbC5zdG9wTGlzdGVuaW5nKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vZGVsLmxpc3RlblRvKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsLCBfLmJpbmQoc3luY0NvbnRleHQub25NZXNzYWdlLCBzeW5jQ29udGV4dCwgdGhpcywgbW9kZWwpKTtcbiAgICAgICAgICAgIG1vZGVsLnN5bmNDb250ZXh0ID0gc3luY0NvbnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTW9kZWwobW9kZWwpKSB7XG4gICAgICAgIC8vIG9mZmxpbmUgY2FwYWJpbGl0eSByZXF1aXJlcyBJRHMgZm9yIGRhdGFcbiAgICAgICAgaWYgKCFtb2RlbC5pZCkge1xuICAgICAgICAgIGlmIChtZXRob2QgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQobW9kZWwuaWRBdHRyaWJ1dGUsIG9iamVjdGlkLm1ha2VPYmplY3RJRCgpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKCdubyAodmFsaWQpIGlkOiAnICsgbW9kZWwuaWQpO1xuICAgICAgICAgICAgcmV0dXJuIFEucmVqZWN0KHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNvbWV0aGluZyBpcyByZWFsbHkgYXQgb2RkcyBoZXJlLi4uXG4gICAgICAgIGxldCBlcnJvciA9IG5ldyBFcnJvcigndGFyZ2V0IG9mIHN5bmMgaXMgbmVpdGhlciBhIG1vZGVsIG5vciBhIGNvbGxlY3Rpb24hPyEnKTtcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0KHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gYXQgdGhpcyBwb2ludCB0aGUgdGFyZ2V0IHNlcnZlciBpcyBrbm93biwgY2hlY2sgbWFraW5nIHN1cmUgdGhlIGNvcnJlY3Qgc2VydmVyIGlzIGJlaW5nIGhpdFxuICAgICAgY29uc3Qgc2VydmVyVXJsID0gd2ViLnJlc29sdmVTZXJ2ZXIobW9kZWwuZ2V0VXJsUm9vdCgpLCB7XG4gICAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICAgIH0pO1xuICAgICAgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdG9yZSBpcyBib3VuZCB0byBzZXJ2ZXIgJyArIHRoaXMuc2VydmVyVXJsKTtcbiAgICAgIH1cblxuICAgICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgdmFyIHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcbiAgICAgIC8vIG9ubHkgc2VuZCByZWFkIG1lc3NhZ2VzIGlmIG5vIG90aGVyIHN0b3JlIGNhbiBkbyB0aGlzIG9yIGZvciBpbml0aWFsIGxvYWRcbiAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiBlbmRwb2ludC5sb2NhbFN0b3JlICYmIHRpbWUgJiYgIW9wdGlvbnMucmVzZXQpIHtcbiAgICAgICAgLy8gcmVhZCBkYXRhIGZyb20gbG9jYWxTdG9yZSBhbmQgZmV0Y2ggY2hhbmdlcyByZW1vdGVcbiAgICAgICAgdmFyIG9wdHMgPSBfLmNsb25lKG9wdGlvbnMpO1xuICAgICAgICBvcHRzLnN0b3JlID0gZW5kcG9pbnQubG9jYWxTdG9yZTtcbiAgICAgICAgb3B0cy5lbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XG4gICAgICAgIGRlbGV0ZSBvcHRzLnN1Y2Nlc3M7XG4gICAgICAgIGRlbGV0ZSBvcHRzLmVycm9yO1xuICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKG1ldGhvZCwgbW9kZWwsIG9wdHMpLnRoZW4oKHJlc3ApID0+IHtcbiAgICAgICAgICAvLyBiYWNrYm9uZSBzdWNjZXNzIGNhbGxiYWNrIGFsdGVycyB0aGUgY29sbGVjdGlvbiBub3dcbiAgICAgICAgICByZXNwID0gdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3ApIHx8IHJlc3A7XG4gICAgICAgICAgaWYgKGVuZHBvaW50LnNvY2tldCB8fCBvcHRpb25zLmZldGNoTW9kZSA9PT0gJ2xvY2FsJykge1xuICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmZXRjaCBjaGFuZ2VzIGFzIHdlIGdvdCBhIHdlYnNvY2tldCwgdGhhdCBpcyBlaXRoZXIgY29ubmVjdGVkIG9yIGF0dGVtcHRzIHJlY29ubmVjdGlvblxuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gd2hlbiB3ZSBhcmUgZGlzY29ubmVjdGVkLCB0cnkgdG8gY29ubmVjdCBub3dcbiAgICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpLnRoZW4oKGluZm8pOiBhbnkgPT4ge1xuICAgICAgICAgICAgICAvLyB0cmlnZ2VyIHJlY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBRLlByb21pc2U8dm9pZD47XG4gICAgICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uQ29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBpbmZvO1xuICAgICAgICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAvLyB0cmlnZ2VyIGRpc2Nvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xuICAgICAgICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgcmVzcDtcbiAgICAgICAgICAgIH0pLnRoZW5SZXNvbHZlKHJlc3ApO1xuICAgICAgICAgIH0gLy8gZWxzZS4uLlxuXG4gICAgICAgICAgLy8gbG9hZCBjaGFuZ2VzIG9ubHkgKHdpbGwgaGFwcGVuIEFGVEVSIHN1Y2Nlc3MgY2FsbGJhY2sgaXMgaW52b2tlZCxcbiAgICAgICAgICAvLyBidXQgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIHJlc29sdmUgb25seSBhZnRlciBjaGFuZ2VzIHdlcmUgcHJvY2Vzc2VkLlxuICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCkuY2F0Y2goKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpIHx8IHJlc3A7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgeGhyLCBtb2RlbCk7XG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcbiAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTsgLy8gY2FsbGVyIGV4cGVjdHMgb3JpZ2luYWwgWEhSIHJlc3BvbnNlIGFzIGNoYW5nZXMgYm9keSBkYXRhIGlzIE5PVCBjb21wYXRpYmxlXG4gICAgICAgIH0sICgpID0+IHtcbiAgICAgICAgICAvLyBmYWxsLWJhY2sgdG8gbG9hZGluZyBmdWxsIGRhdGEgc2V0XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gZG8gYmFja2JvbmUgcmVzdFxuICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2FkZE1lc3NhZ2UobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPGFueT4ge1xuICAgIHZhciBjaGFuZ2VzID0gKDxNb2RlbD5tb2RlbCkuY2hhbmdlZFNpbmNlU3luYztcbiAgICB2YXIgZGF0YTogYW55ID0gbnVsbDtcbiAgICB2YXIgc3RvcmVNc2cgPSB0cnVlO1xuICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgZGF0YSA9IG9wdGlvbnMuYXR0cnMgfHwgbW9kZWwudG9KU09OKCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdwYXRjaCc6XG4gICAgICAgIGlmIChfLmlzRW1wdHkoY2hhbmdlcykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGF0YSA9IG1vZGVsLnRvSlNPTih7XG4gICAgICAgICAgYXR0cnM6IGNoYW5nZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQgKCgpID0+IG1ldGhvZCA9PT0gJ3JlYWQnLCAndW5rbm93biBtZXRob2Q6ICcgKyBtZXRob2QpO1xuICAgICAgICBzdG9yZU1zZyA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgbGV0IGVudGl0eSA9IG1vZGVsLmVudGl0eSB8fCBlbmRwb2ludC5lbnRpdHk7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwuZW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpO1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVudGl0eS5pbmRleE9mKCd+JykgPCAwLCAnZW50aXR5IG5hbWUgbXVzdCBub3QgY29udGFpbiBhIH4gY2hhcmFjdGVyIScpO1xuICAgIHZhciBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IHtcbiAgICAgIF9pZDogZW50aXR5ICsgJ34nICsgKDxNb2RlbD5tb2RlbCkuaWQsXG4gICAgICBpZDogKDxNb2RlbD5tb2RlbCkuaWQsXG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAvLyBjaGFubmVsOiBlbmRwb2ludC5jaGFubmVsLCAvLyBjaGFubmVsIGlzIGhhY2tlZCBpbiBieSBzdG9yZU1lc3NhZ2UoKSwgd2UgZG9uJ3Qgd2FudCB0byB1c2UgdGhpcyBhbnltb3JlXG4gICAgICBwcmlvcml0eTogZW5kcG9pbnQucHJpb3JpdHksXG4gICAgICB0aW1lOiBEYXRlLm5vdygpXG4gICAgfTtcblxuICAgIHZhciBxID0gUS5yZXNvbHZlKG1zZyk7XG4gICAgdmFyIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+O1xuICAgIGlmIChzdG9yZU1zZykge1xuICAgICAgLy8gc3RvcmUgYW5kIHBvdGVudGlhbGx5IG1lcmdlIG1lc3NhZ2VcbiAgICAgIHFNZXNzYWdlID0gdGhpcy5zdG9yZU1lc3NhZ2UoZW5kcG9pbnQsIHEpO1xuICAgICAgcSA9IHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XG4gICAgICAgIC8vIGluIGNhc2Ugb2YgbWVyZ2luZywgdGhpcyByZXN1bHQgY291bGQgYmUgZGlmZmVyZW50XG4gICAgICAgIHJldHVybiBtZXNzYWdlLmF0dHJpYnV0ZXM7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHEudGhlbigobXNnMjogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICAvLyBwYXNzIGluIHFNZXNzYWdlIHNvIHRoYXQgZGVsZXRpb24gb2Ygc3RvcmVkIG1lc3NhZ2UgY2FuIGJlIHNjaGVkdWxlZFxuICAgICAgcmV0dXJuIHRoaXMuX2VtaXRNZXNzYWdlKGVuZHBvaW50LCBtc2cyLCBvcHRpb25zLCBtb2RlbCwgcU1lc3NhZ2UpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOlxuICBRLlByb21pc2U8YW55PiB7XG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIHZhciBxQWpheCA9IHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcbiAgICB2YXIgcSA9IHFBamF4O1xuXG4gICAgaWYgKHFNZXNzYWdlKSB7XG4gICAgICAvLyBmb2xsb3dpbmcgdGFrZXMgY2FyZSBvZiBvZmZsaW5lIGNoYW5nZSBzdG9yZVxuICAgICAgcSA9IHEudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAvLyBzdWNjZXNzLCByZW1vdmUgbWVzc2FnZSBzdG9yZWQsIGlmIGFueVxuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpOyAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSkudGhlblJlc29sdmUoZGF0YSk7IC8vIHJlc29sdmUgYWdhaW4geWllbGRpbmcgZGF0YVxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAvLyBmYWlsdXJlIGV2ZW50dWFsbHkgY2F1Z2h0IGJ5IG9mZmxpbmUgY2hhbmdlc1xuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIHRoaXMudXNlT2ZmbGluZUNoYW5nZXMpIHtcbiAgICAgICAgICAvLyB0aGlzIHNlYW1zIHRvIGJlIG9ubHkgYSBjb25uZWN0aW9uIHByb2JsZW0sIHNvIHdlIGtlZXAgdGhlIG1lc3NhZ2UgYW5kIGNhbGwgc3VjY2Vzc1xuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHJlbW92ZSBtZXNzYWdlIHN0b3JlZCBhbmQga2VlcCByZWplY3Rpb24gYXMgaXNcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7IC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxuICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICB9KS50aGVuUmVqZWN0KHhocik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHEgPSB0aGlzLl9hcHBseVJlc3BvbnNlKHEsIGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcblxuICAgIHJldHVybiBxLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgLy8gZG8gc29tZSBjb25uZWN0aW9uIGhhbmRsaW5nXG4gICAgICByZXR1cm4gcUFqYXgudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICB9XG4gICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9hamF4TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgb3B0aW9uczogYW55LFxuICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPGFueT4ge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGRlbGV0ZSBvcHRpb25zLnhocjsgLy8gbWFrZSBzdXJlIG5vdCB0byB1c2Ugb2xkIHZhbHVlXG5cbiAgICB2YXIgdXJsID0gb3B0aW9ucy51cmw7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XG4gICAgICBpZiAobXNnLmlkICYmIG1zZy5tZXRob2QgIT09ICdjcmVhdGUnKSB7XG4gICAgICAgIC8vIGFkZCBJRCBvZiBtb2RlbFxuICAgICAgICB1cmwgKz0gKHVybC5jaGFyQXQodXJsLmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbXNnLmlkO1xuICAgICAgfVxuICAgICAgaWYgKG1zZy5tZXRob2QgPT09ICdyZWFkJyAmJiBpc0NvbGxlY3Rpb24obW9kZWwpKSB7XG4gICAgICAgIC8vIGFkZCBxdWVyeSBvZiBjb2xsZWN0aW9uXG4gICAgICAgIHZhciBjb2xsZWN0aW9uVXJsID0gXy5pc0Z1bmN0aW9uKG1vZGVsLnVybCkgPyBtb2RlbC51cmwoKSA6IG1vZGVsLnVybDtcbiAgICAgICAgdmFyIHF1ZXJ5SW5kZXggPSBjb2xsZWN0aW9uVXJsLmxhc3RJbmRleE9mKCc/Jyk7XG4gICAgICAgIHZhciBnZXRRdWVyeSA9IG5ldyBHZXRRdWVyeSgpLmZyb21KU09OKG9wdGlvbnMpO1xuICAgICAgICAvLyBjdXJyZW50bHkgb25seSBzb3J0T3JkZXIgY2FuIGJlIHN1cHBvcnRlZCBhcyB3ZSByZXF1aXJlIHRoZSBpbml0aWFsIGRhdGEgbG9hZCB0byB5aWVsZCBmdWxsIGRhdGFzZXRcbiAgICAgICAgZ2V0UXVlcnkubGltaXQgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5vZmZzZXQgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5maWx0ZXIgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5maWVsZHMgPSBudWxsO1xuICAgICAgICB2YXIgZ2V0UGFyYW1zID0gZ2V0UXVlcnkudG9RdWVyeVBhcmFtcygpO1xuICAgICAgICBpZiAocXVlcnlJbmRleCA+PSAwKSB7XG4gICAgICAgICAgdXJsICs9IGNvbGxlY3Rpb25Vcmwuc3Vic3RyKHF1ZXJ5SW5kZXgpO1xuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBnZXRQYXJhbXM7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcbiAgICAgICAgICAgIHVybCArPSAnPycgKyBnZXRQYXJhbXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZWFybGllc3QgcG9pbnQgd2hlcmUgdGFyZ2V0IFVSTCBpcyBrbm93blxuICAgIGRpYWcuZGVidWcuZGVidWcoJ2FqYXhNZXNzYWdlICcgKyBtc2cubWV0aG9kICsgJyAnICsgdXJsKTtcbiAgICB2YXIgb3B0czogYW55ID0ge1xuICAgICAgLy8gbXVzdCBub3QgdGFrZSBhcmJpdHJhcnkgb3B0aW9ucyBhcyB0aGVzZSB3b24ndCBiZSByZXBsYXllZCBvbiByZWNvbm5lY3RcbiAgICAgIHVybDogdXJsLFxuICAgICAgYXR0cnM6IG1zZy5kYXRhLFxuICAgICAgc3RvcmU6IHt9LCAvLyBlbnN1cmVzIG5ldHdvcmsgaXMgdXNlZFxuICAgICAgY3JlZGVudGlhbHM6IG9wdGlvbnMuY3JlZGVudGlhbHMsXG4gICAgICAvLyBlcnJvciBwcm9wYWdhdGlvblxuICAgICAgZXJyb3I6IG9wdGlvbnMuZXJyb3JcbiAgICB9O1xuXG4gICAgLy8gcHJvdGVjdCBhZ2FpbnN0IHdyb25nIHNlcnZlciBhbmQgdXNlciBpZGVudGl0eVxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHdlYi5yZXNvbHZlU2VydmVyKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxuICAgIH0pID09PSB0aGlzLnNlcnZlclVybCk7XG4gICAgaWYgKHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZSh0aGlzLnNlcnZlclVybCkuYXV0aG9yaXphdGlvbi5uYW1lICE9PSB0aGlzLnVzZXJVdWlkKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XG4gICAgICBjb25zdCBlcnJvcjogd2ViLkh0dHBFcnJvciA9IG5ldyBFcnJvcigpO1xuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdHMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gYWN0dWFsIGFqYXggcmVxdWVzdCB2aWEgYmFja2JvbmUuanNcbiAgICByZXR1cm4gdGhpcy5jaGVja1NlcnZlcih1cmwsIG9wdHMpLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIG1vZGVsLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIG9wdHMpLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAvLyB0YWtlIG92ZXIgeGhyIHJlc29sdmluZyB0aGUgb3B0aW9ucyBjb3B5XG4gICAgICAgIG9wdGlvbnMueGhyID0gb3B0cy54aHIueGhyIHx8IG9wdHMueGhyO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9hcHBseVJlc3BvbnNlPFQ+KHFYSFI6IFEuUHJvbWlzZTxUPiwgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogYW55LCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPFQ+IHtcbiAgICAvLyB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgdmFyIGNsaWVudFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICByZXR1cm4gcVhIUi50aGVuKChkYXRhOiBUIHwgYW55KSA9PiB7XG4gICAgICAvLyBkZWxldGUgb24gc2VydmVyIGRvZXMgbm90IHJlc3BvbmQgYSBib2R5XG4gICAgICBpZiAoIWRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScpIHtcbiAgICAgICAgZGF0YSA9IG1zZy5kYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgbG9jYWwgc3RvcmUgc3RhdGVcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIC8vIG5vIGRhdGEgaWYgc2VydmVyIGFza3Mgbm90IHRvIGFsdGVyIHN0YXRlXG4gICAgICAgIC8vIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIG1zZy50aW1lKTtcbiAgICAgICAgdmFyIHByb21pc2VzOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPltdID0gW107XG4gICAgICAgIHZhciBkYXRhSWRzOiBhbnk7IC8vIG1vZGVsIGlkIC0+IGF0dHJpYnV0ZXMgZGF0YVxuICAgICAgICBpZiAobXNnLm1ldGhvZCAhPT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgZGF0YSA9PT0gbXNnLmRhdGEgPyBtc2cgOiA8TGl2ZURhdGFNZXNzYWdlPl8uZGVmYXVsdHMoe1xuICAgICAgICAgICAgZGF0YTogZGF0YSAvLyBqdXN0IGFjY2VwdHMgbmV3IGRhdGFcbiAgICAgICAgICB9LCBtc2cpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBjb2xsZWN0aW9uIGNvbnRlbnRzIHdpdGggdGhlIGRhdGEgcmVhZFxuICAgICAgICAgIHZhciBzeW5jSWRzID0ge307XG4gICAgICAgICAgbW9kZWwubW9kZWxzLmZvckVhY2goKG0pID0+IHtcbiAgICAgICAgICAgIHN5bmNJZHNbbS5pZF0gPSBtO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGRhdGFJZHMgPSB7fTtcbiAgICAgICAgICBkYXRhLmZvckVhY2goKGQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gZFtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkLl9pZDtcbiAgICAgICAgICAgICAgZGF0YUlkc1tpZF0gPSBkO1xuICAgICAgICAgICAgICB2YXIgbSA9IHN5bmNJZHNbaWRdO1xuICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgaXRlbVxuICAgICAgICAgICAgICAgIGRlbGV0ZSBzeW5jSWRzW2lkXTsgLy8gc28gdGhhdCBpdCBpcyBkZWxldGVkIGJlbG93XG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzRXF1YWwoXy5waWNrLmNhbGwobSwgbS5hdHRyaWJ1dGVzLCBPYmplY3Qua2V5cyhkKSksIGQpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBhYm92ZSBjaGVja2VkIHRoYXQgYWxsIGF0dHJpYnV0ZXMgaW4gZCBhcmUgaW4gbSB3aXRoIGVxdWFsIHZhbHVlcyBhbmQgZm91bmQgc29tZSBtaXNtYXRjaFxuICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkXG4gICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgdGhlIGl0ZW1cbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgICBtZXRob2Q6ICdjcmVhdGUnLFxuICAgICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgICAgICBkYXRhOiBkXG4gICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIE9iamVjdC5rZXlzKHN5bmNJZHMpLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAvLyBkZWxldGUgdGhlIGl0ZW1cbiAgICAgICAgICAgIHZhciBtID0gc3luY0lkc1tpZF07XG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgIGRhdGE6IG0uYXR0cmlidXRlc1xuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0cmlnZ2VyIGFuIHVwZGF0ZSB0byBsb2FkIHRoZSBkYXRhIHJlYWRcbiAgICAgICAgICB2YXIgYXJyYXkgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IFtkYXRhXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkYXRhID0gYXJyYXlbaV07XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgICAgaWQ6IGRhdGFbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZGF0YS5faWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndXBkYXRlJyxcbiAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBRLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB7XG4gICAgICAgICAgLy8gZGVsYXllZCB0aWxsIG9wZXJhdGlvbnMgY29tcGxldGVcbiAgICAgICAgICBpZiAoIWRhdGFJZHMpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc0NvbGxlY3Rpb24obW9kZWwpKTtcblxuICAgICAgICAgIC8vIHdoZW4gY29sbGVjdGlvbiB3YXMgdXBkYXRlZCBvbmx5IHBhc3MgZGF0YSBvZiBtb2RlbHMgdGhhdCB3ZXJlIHN5bmNlZCBvbiB0byB0aGUgc3VjY2VzcyBjYWxsYmFjayxcbiAgICAgICAgICAvLyBhcyB0aGUgY2FsbGJhY2sgd2lsbCBzZXQgdGhlIG1vZGVscyBhZ2FpbiBjYXVzaW5nIG91ciBzb3J0aW5nIGFuZCBmaWx0ZXJpbmcgdG8gYmUgd2l0aG91dCBlZmZlY3QuXG4gICAgICAgICAgdmFyIHJlc3BvbnNlOiBhbnlbXSA9IFtdO1xuICAgICAgICAgIGxldCBtb2RlbHMgPSBpc0NvbGxlY3Rpb24obW9kZWwpID8gbW9kZWwubW9kZWxzIDogW21vZGVsXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gbW9kZWxzLmxlbmd0aDsgaS0tID4gMDsgKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vZGVsc1tpXTtcbiAgICAgICAgICAgIGlmIChkYXRhSWRzW20uaWRdKSB7XG4gICAgICAgICAgICAgIHJlc3BvbnNlLnB1c2gobS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgZGVsZXRlIGRhdGFJZHNbbS5pZF07XG4gICAgICAgICAgICAgIGlmIChkYXRhSWRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJldmVyc2UoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBUT0RPOiBleHRyYWN0IERhdGUgaGVhZGVyIGZyb20gb3B0aW9ucy54aHIgaW5zdGVhZCBvZiB1c2luZyBjbGllbnRUaW1lXG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsIGNsaWVudFRpbWUpO1xuICAgICAgfVxuICAgICAgLy8gaW52b2tlIHN1Y2Nlc3MgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXNwb25zZSkgfHwgcmVzcG9uc2U7XG4gICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgZmV0Y2hDaGFuZ2VzKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIGZvcmNlID0gZmFsc2UpOiBRLlByb21pc2U8Q29sbGVjdGlvbj4ge1xuICAgIGxldCBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICBpZiAoIWVuZHBvaW50LnVybFJvb3QgfHwgIWNoYW5uZWwpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmU8Q29sbGVjdGlvbj4odW5kZWZpbmVkKTtcbiAgICB9XG5cbiAgICBsZXQgbm93ID0gRGF0ZS5ub3coKTtcbiAgICBsZXQgcHJvbWlzZSA9IGVuZHBvaW50LnByb21pc2VGZXRjaGluZ0NoYW5nZXM7XG4gICAgaWYgKHByb21pc2UgJiYgIWZvcmNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPCAxMDAwKSB7XG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGNoYW5uZWwgKyAnIHNraXBwaW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsZXQgdGltZSA9IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpO1xuICAgIGlmICghdGltZSkge1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihjaGFubmVsICsgJyBjYW4gbm90IGZldGNoIGNoYW5nZXMgYXQgdGhpcyB0aW1lIScpO1xuICAgICAgcmV0dXJuIHByb21pc2UgfHwgUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gaW5pdGlhdGUgYSBuZXcgcmVxdWVzdCBmb3IgY2hhbmdlc1xuICAgIGRpYWcuZGVidWcuaW5mbyhjaGFubmVsICsgJyBpbml0aWF0aW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xuICAgIGxldCBjaGFuZ2VzOiBDb2xsZWN0aW9uID0gbmV3ICg8YW55PnRoaXMubWVzc2FnZXMpLmNvbnN0cnVjdG9yKCk7XG4gICAgcHJvbWlzZSA9IHRoaXMuY2hlY2tTZXJ2ZXIoZW5kcG9pbnQudXJsUm9vdCArICdjaGFuZ2VzLycgKyB0aW1lKS50aGVuKCh1cmwpID0+IHtcbiAgICAgIHJldHVybiBRKGNoYW5nZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xuICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgc3RvcmU6IHt9LCAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxuXG4gICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICBpZiAoY2hhbmdlcy5tb2RlbHMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY2hhbmdlcy5lYWNoKChjaGFuZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XG4gICAgICAgICAgICAgIGxldCBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IGNoYW5nZS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgICB0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgbXNnKSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZm9sbG93aW5nIHNob3VsZCB1c2Ugc2VydmVyIHRpbWUhXG4gICAgICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCBub3cpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XG4gICAgICAgIH1cbiAgICAgIH0pKS50aGVuUmVzb2x2ZShjaGFuZ2VzKTtcbiAgICB9KTtcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzID0gcHJvbWlzZTtcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPSBub3c7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICBwcml2YXRlIGZldGNoU2VydmVySW5mbyhlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPE1vZGVsPiB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvO1xuICAgIGlmIChwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPCAxMDAwKSB7XG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGVuZHBvaW50LmNoYW5uZWwgKyAnIHNraXBwaW5nIGluZm8gcmVxdWVzdC4uLicpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5mbyA9IG5ldyBNb2RlbCgpO1xuICAgIHZhciB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgdmFyIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XG4gICAgaWYgKHVybC5jaGFyQXQoKHVybC5sZW5ndGggLSAxKSkgIT09ICcvJykge1xuICAgICAgdXJsICs9ICcvJztcbiAgICB9XG4gICAgcHJvbWlzZSA9IHRoaXMuY2hlY2tTZXJ2ZXIodXJsICsgJ2luZm8nKS50aGVuKCh1cmwpID0+IHtcbiAgICAgIHJldHVybiBRKGluZm8uZmV0Y2goPEJhY2tib25lLk1vZGVsRmV0Y2hPcHRpb25zPih7XG4gICAgICAgIHVybDogdXJsLFxuICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgLy8gQHRvZG8gd2h5IHdlIHNldCBhIHNlcnZlciB0aW1lIGhlcmUgP1xuICAgICAgICAgIGlmICghdGltZSAmJiBpbmZvLmdldCgndGltZScpKSB7XG4gICAgICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShlbmRwb2ludC5jaGFubmVsLCBpbmZvLmdldCgndGltZScpKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5zb2NrZXRQYXRoICYmIGluZm8uZ2V0KCdzb2NrZXRQYXRoJykpIHtcbiAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldFBhdGggPSBpbmZvLmdldCgnc29ja2V0UGF0aCcpO1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBpbmZvLmdldCgnZW50aXR5JykgfHwgZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5KSB7XG4gICAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG9wdGlvbnMueGhyO1xuICAgICAgICB9XG4gICAgICB9KSkpLnRoZW5SZXNvbHZlKGluZm8pO1xuICAgIH0pO1xuICAgIGVuZHBvaW50LnByb21pc2VGZXRjaGluZ1NlcnZlckluZm8gPSBwcm9taXNlO1xuICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA9IG5vdztcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjYWxsZWQgd2hlbiBhbiBvZmZsaW5lIGNoYW5nZSB3YXMgc2VudCB0byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICpcbiAgICogPHA+XG4gICAqIE1heSBiZSBvdmVyd3JpdHRlbiB0byBhbHRlciBjaGFuZ2UgbWVzc2FnZSBlcnJvciBoYW5kbGluZyBiZWhhdmlvci4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gd2lsbCBhdHRlbXB0XG4gICAqIHJlbG9hZGluZyB0aGUgc2VydmVyIGRhdGEgZm9yIHJlc3RvcmluZyB0aGUgY2xpZW50IHN0YXRlIHN1Y2ggdGhhdCBpdCByZWZsZWN0cyB0aGUgc2VydmVyIHN0YXRlLiBXaGVuIHRoaXNcbiAgICogc3VjY2VlZGVkLCB0aGUgb2ZmbGluZSBjaGFuZ2UgaXMgZWZmZWN0aXZlbHkgcmV2ZXJ0ZWQgYW5kIHRoZSBjaGFuZ2UgbWVzc2FnZSBpcyBkcm9wcGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBBbiBvdmVyd3JpdHRlbiBpbXBsZW1lbnRhdGlvbiBtYXkgZGVjaWRlZCB3aGV0aGVyIHRvIHJldmVydCBmYWlsZWQgY2hhbmdlcyBiYXNlZCBvbiB0aGUgZXJyb3IgcmVwb3J0ZWQuXG4gICAqIDwvcD5cbiAgICogPHA+XG4gICAqIE5vdGljZSwgdGhlIG1ldGhvZCBpcyBub3QgY2FsbGVkIHdoZW4gdGhlIG9mZmxpbmUgY2hhbmdlIGZhaWxlZCBkdWUgdG8gYSBjb25uZWN0aXZpdHkgaXNzdWUuXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHBhcmFtIGVycm9yIHJlcG9ydGVkIGJ5IHJlbW90ZSBzZXJ2ZXIuXG4gICAqIEBwYXJhbSBtZXNzYWdlIGNoYW5nZSByZXBvcnRlZCwgYXR0cmlidXRlcyBvZiB0eXBlIExpdmVEYXRhTWVzc2FnZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgY29udGV4dCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byBhY2Nlc3MgdGhlIGRhdGEgbG9jYWxseSBhcyB3ZWxsIGFzIHJlbW90ZWx5LlxuICAgKiBAcmV0dXJuIHthbnl9IFByb21pc2UgaW5kaWNhdGluZyBzdWNjZXNzIHRvIGRyb3AgdGhlIGNoYW5nZSBtZXNzYWdlIGFuZCBwcm9jZWVkIHdpdGggdGhlIG5leHQgY2hhbmdlLCBvclxuICAgKiAgICByZWplY3Rpb24gaW5kaWNhdGluZyB0aGUgY2hhbmdlIG1lc3NhZ2UgaXMga2VwdCBhbmQgcmV0cmllZCBsYXRlciBvbi5cbiAgICovXG4gIHByb3RlY3RlZCBwcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3I6IEVycm9yLCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCwgb3B0aW9uczoge1xuICAgIGVudGl0eTogc3RyaW5nLFxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxuICAgIHVybFJvb3Q6IHN0cmluZyxcbiAgICBsb2NhbFN0b3JlOiBTdG9yZSxcbiAgICBzaWxlbnQ/OiBib29sZWFuXG4gIH0pOiBQcm9taXNlTGlrZTx2b2lkIHwgYW55PiB7XG4gICAgaWYgKCFlcnJvcikge1xuICAgICAgLy8gbWVzc2FnZSB3YXMgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseVxuICAgICAgaWYgKCF0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xuICAgICAgICAvLyB3aGVuIG5vdCB1c2luZyBzb2NrZXRzLCBmZXRjaCBjaGFuZ2VzIG5vd1xuICAgICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tvcHRpb25zLmVudGl0eV07XG4gICAgICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgICAgIC8vIHdpbGwgcHVsbCB0aGUgY2hhbmdlIGNhdXNlZCBieSB0aGUgb2ZmbGluZSBtZXNzYWdlIGFuZCB1cGRhdGUgdGhlIG1lc3NhZ2UgdGltZSxcbiAgICAgICAgICAvLyBzbyB0aGF0IHdlIGF2b2lkIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlIGNoYW5nZSBjYXVzZWQgYnkgcmVwbGF5aW5nIHRoZSBvZmZsaW5lXG4gICAgICAgICAgLy8gY2hhbmdlIHJlc3VsdHMgaW4gYSBjb25mbGljdCBsYXRlciBvbi4uLlxuICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBRLnJlc29sdmUobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgLy8gZmFpbGVkLCBldmVudHVhbGx5IHVuZG8gdGhlIG1vZGlmaWNhdGlvbnMgc3RvcmVkXG4gICAgaWYgKCFvcHRpb25zLmxvY2FsU3RvcmUpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gcmV2ZXJ0IG1vZGlmaWNhdGlvbiBieSByZWxvYWRpbmcgZGF0YVxuICAgIGxldCBtb2RlbFR5cGUgPSBvcHRpb25zLm1vZGVsVHlwZSB8fCBNb2RlbDtcbiAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1lc3NhZ2UuZ2V0KCdkYXRhJyksIHtcbiAgICAgIGVudGl0eTogb3B0aW9ucy5lbnRpdHlcbiAgICB9KTtcbiAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XG4gICAgbGV0IHRyaWdnZXJFcnJvciA9ICgpID0+IHtcbiAgICAgIC8vIGluZm9ybSBjbGllbnQgYXBwbGljYXRpb24gb2YgdGhlIG9mZmxpbmUgY2hhbmdlcyBlcnJvclxuICAgICAgbGV0IGNoYW5uZWwgPSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpO1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdDogdHJpZ2dlcmluZyBlcnJvciBmb3IgY2hhbm5lbCAnICsgY2hhbm5lbCArICcgb24gc3RvcmUnLCBlcnJvcik7XG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBsZXQgbG9jYWxPcHRpb25zID0ge1xuICAgICAgLy8ganVzdCBhZmZlY3QgbG9jYWwgc3RvcmVcbiAgICAgIHN0b3JlOiBvcHRpb25zLmxvY2FsU3RvcmVcbiAgICB9O1xuICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICB1cmxSb290OiBvcHRpb25zLnVybFJvb3QsXG4gICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICB9O1xuICAgIGlmIChtb2RlbC5pZCkge1xuICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcbiAgICAgIC8vIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLnVybCgpID09PSByZW1vdGVPcHRpb25zLnVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNyZWF0aW9uIGZhaWxlZCwganVzdCBkZWxldGUgbG9jYWxseVxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbWVzc2FnZS5nZXQoJ21ldGhvZCcpID09PSAnY3JlYXRlJyk7XG4gICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICB9XG4gICAgcmV0dXJuICg8US5Qcm9taXNlPGFueT4+PGFueT5tb2RlbC5mZXRjaChyZW1vdGVPcHRpb25zKSkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHJlbG9hZGVkIHRoZSBkYXRhIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucywgd2hpY2ggc3VjY2VlZGVkLi4uXG4gICAgICByZXR1cm4gbW9kZWwuc2F2ZShkYXRhLCBsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICB9LCAoZmV0Y2hSZXNwOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAvLyBvcmlnaW5hbCByZXF1ZXN0IGZhaWxlZCBhbmQgdGhlIGNvZGUgYWJvdmUgdHJpZWQgdG8gcmV2ZXJ0IHRoZSBsb2NhbCBtb2RpZmljYXRpb25zIGJ5IHJlbG9hZGluZyB0aGUgZGF0YSwgd2hpY2ggZmFpbGVkIGFzIHdlbGwuLi5cbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBmZXRjaFJlc3AgJiYgZmV0Y2hSZXNwLnN0YXR1c0NvZGU7XG4gICAgICBzd2l0Y2ggKHN0YXR1c0NvZGUpIHtcbiAgICAgICAgY2FzZSA0MDQ6IC8vIE5PVCBGT1VORFxuICAgICAgICBjYXNlIDQwMTogLy8gVU5BVVRIT1JJWkVEXG4gICAgICAgIGNhc2UgNDEwOiAvLyBHT05FKlxuICAgICAgICAgIC8vIC4uLmJlY2F1c2UgdGhlIGl0ZW0gaXMgZ29uZSBieSBub3csIG1heWJlIHNvbWVvbmUgZWxzZSBjaGFuZ2VkIGl0IHRvIGJlIGRlbGV0ZWRcbiAgICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpOyAvLyBzaWxlbnQgcmVnYXJkaW5nIHRyaWdnZXJFcnJvclxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChmZXRjaFJlc3ApLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmZWVkcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzIHRvIHRoZSByZW1vdGUgc2VydmVyLlxuICAgKlxuICAgKiA8cD5cbiAgICogRHVlIHRvIGNsaWVudCBjb2RlIHNldHRpbmcgdXAgbW9kZWxzIG9uZSBhdCBhIHRpbWUsIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBkdXJpbmcgaW5pdGlhbCBzZXR1cCBvZlxuICAgKiAjZW5kcG9pbnRzLiBUaGUgZmlyc3QgY2FsbCBmZXRjaGVzIHBlbmRpbmcgb2ZmbGluZSAjbWVzc2FnZXMsIG9yZGVyZWQgYnkgcHJpb3JpdHkgYW5kIHRpbWUuIFRoZW4gdGhlICNtZXNzYWdlc1xuICAgKiBhcmUgc2VuZCB0byB0aGUgcmVtb3RlIHNlcnZlciB1bnRpbCBkZXBsZXRlZCwgYW4gZXJyb3Igb2NjdXJzLCBvciBzb21lIG1pc3NpbmcgZW5kcG9pbnQgaXMgZW5jb3VudGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBUaGUgbWV0aG9kIGlzIHRyaWdnZXJlZCBlYWNoIHRpbWUgYW4gZW5kcG9pbnQgaXMgcmVnaXN0ZXJlZCwgb3Igc3RhdGUgY2hhbmdlcyB0byBvbmxpbmUgZm9yIGFueSBlbmRwb2ludC4gV2hlblxuICAgKiBzdGF0ZSBjaGFuZ2VzIGZyb20gb2ZmbGluZSB0byBvbmxpbmUgKGRpc3JlZ2FyZGluZyBlbmRwb2ludCkgbWVzc2FnZSBzdWJtaXNzaW9uIGlzIHJlc3RhcnRlZCBieSByZXNldHRpbmcgdGhlXG4gICAqICNtZXNzYWdlc1Byb21pc2UuIE90aGVyd2lzZSwgc3Vic2VxdWVudCBjYWxscyBjaGFpbiB0byB0aGUgZW5kIG9mICNtZXNzYWdlc1Byb21pc2UuXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gb2YgI21lc3NhZ2VzIENvbGxlY3Rpb24sIG9yIGxhc3QgcmVjZW50IG9mZmxpbmUgcmVqZWN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcml2YXRlIF9zZW5kTWVzc2FnZXMoKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcbiAgICAvLyBub3QgcmVhZHkgeWV0XG4gICAgaWYgKCF0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2Vzc2VzIG1lc3NhZ2VzIHVudGlsIG5vbmUgbGVmdCwgaGl0dGluZyBhIG1lc3NhZ2Ugb2YgYSBub3QgeWV0IHJlZ2lzdGVyZWQgZW5kcG9pbnQsIG9yIGVudGVyaW5nXG4gICAgLy8gYSBub24tcmVjb3ZlcmFibGUgZXJyb3IuIFRoZSBwcm9taXNlIHJldHVybmVkIHJlc29sdmVzIHRvIHRoaXMubWVzc2FnZXMgd2hlbiBkb25lLlxuICAgIGxldCBuZXh0TWVzc2FnZSA9ICgpOiBhbnkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgICAgIH1cblxuICAgICAgbGV0IG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gdGhpcy5tZXNzYWdlcy5tb2RlbHNbMF07XG4gICAgICBsZXQgZW50aXR5ID0gbWVzc2FnZS5pZC5zdWJzdHIoMCwgbWVzc2FnZS5pZC5pbmRleE9mKCd+JykpO1xuICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignc2VuZE1lc3NhZ2UgJyArIG1lc3NhZ2UuaWQgKyAnIHdpdGggbm8gZW50aXR5IScpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCkudGhlbihuZXh0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xuICAgICAgaWYgKCFlbmRwb2ludCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgICAgIH1cbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LmNoYW5uZWwgPT09IG1lc3NhZ2UuZ2V0KCdjaGFubmVsJyksICdjaGFubmVsIG9mIGVuZHBvaW50ICcgKyBlbmRwb2ludC5jaGFubmVsICsgJyBkb2VzIG5vdCBtYXRjaCBjaGFubmVsIG9mIG1lc3NhZ2UgJyArIG1lc3NhZ2UuZ2V0KCdjaGFubmVsJykpO1xuICAgICAgbGV0IG1zZyA9IHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1lc3NhZ2UuYXR0cmlidXRlcyk7XG5cbiAgICAgIGxldCBtb2RlbFR5cGUgPSBlbmRwb2ludC5tb2RlbFR5cGUgfHwgTW9kZWw7XG4gICAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1zZy5kYXRhLCB7XG4gICAgICAgIGVudGl0eTogZW5kcG9pbnQuZW50aXR5XG4gICAgICB9KTtcbiAgICAgIG1vZGVsLmlkID0gbWVzc2FnZS5nZXQoJ21ldGhvZCcpICE9PSAnY3JlYXRlJyAmJiBtZXNzYWdlLmdldCgnaWQnKTtcbiAgICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICAgIHVybFJvb3Q6IGVuZHBvaW50LnVybFJvb3QsXG4gICAgICAgIHN0b3JlOiB7fSAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxuICAgICAgfTtcbiAgICAgIGlmIChtb2RlbC5pZCkge1xuICAgICAgICByZW1vdGVPcHRpb25zLnVybCA9IHJlbW90ZU9wdGlvbnMudXJsUm9vdCArIChyZW1vdGVPcHRpb25zLnVybFJvb3QuY2hhckF0KHJlbW90ZU9wdGlvbnMudXJsUm9vdC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1vZGVsLmlkO1xuICAgICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xuICAgICAgfVxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZW5kTWVzc2FnZSAnICsgbW9kZWwuaWQpO1xuICAgICAgbGV0IG9mZmxpbmVPcHRpb25zID0ge1xuICAgICAgICBlbnRpdHk6IGVuZHBvaW50LmVudGl0eSxcbiAgICAgICAgbW9kZWxUeXBlOiBlbmRwb2ludC5tb2RlbFR5cGUsXG4gICAgICAgIHVybFJvb3Q6IGVuZHBvaW50LnVybFJvb3QsXG4gICAgICAgIGxvY2FsU3RvcmU6IGVuZHBvaW50LmxvY2FsU3RvcmVcbiAgICAgIH07XG4gICAgICByZXR1cm4gdGhpcy5fYXBwbHlSZXNwb25zZSh0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCksIGVuZHBvaW50LCBtc2csIHJlbW90ZU9wdGlvbnMsIG1vZGVsKS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gc3VjY2VlZGVkXG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChudWxsLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucyk7XG4gICAgICB9LCAoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGVycm9yLnN0YXR1c0NvZGUpIHtcbiAgICAgICAgICAvLyByZW1vdGUgZmFpbGVkXG4gICAgICAgICAgcmV0dXJuIFEodGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3IsIG1lc3NhZ2UsIG9mZmxpbmVPcHRpb25zKSkuY2F0Y2goKGVycm9yMikgPT4ge1xuICAgICAgICAgICAgLy8gZXhwbGljaXRseSBkaXNjb25uZWN0IGR1ZSB0byBlcnJvciBpbiBlbmRwb2ludFxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLnRoZW5SZWplY3QoZXJyb3IyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjb25uZWN0aXZpdHkgaXNzdWUsIGtlZXAgcmVqZWN0aW9uXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIGFwcGx5aW5nIGNoYW5nZSBzdWNjZWVkZWQgb3Igc3VjY2Vzc2Z1bGx5IHJlY292ZXJlZCBjaGFuZ2VcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpO1xuICAgICAgfSkudGhlbihuZXh0TWVzc2FnZSk7XG4gICAgfTtcblxuICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLl9zZW5kTWVzc2FnZXMnKTtcbiAgICBsZXQgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlO1xuICAgIGlmICghcSkge1xuICAgICAgLy8gaW5pdGlhbGx5IGZldGNoIGFsbCBtZXNzYWdlc1xuICAgICAgcSA9IFEodGhpcy5tZXNzYWdlcy5mZXRjaCg8QmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucz57XG4gICAgICAgIHNvcnRPcmRlcjogW1xuICAgICAgICAgICcrcHJpb3JpdHknLFxuICAgICAgICAgICcrdGltZScsXG4gICAgICAgICAgJytpZCdcbiAgICAgICAgXVxuICAgICAgfSkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UuaXNSZWplY3RlZCgpKSB7XG4gICAgICAvLyBlYXJseSByZWplY3Rpb25cbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgLy8gbm8gbW9yZSBtZXNzYWdlc1xuICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXNQcm9taXNlO1xuICAgIH1cblxuICAgIC8vIGtpY2sgdG8gcHJvY2VzcyBwZW5kaW5nIG1lc3NhZ2VzXG4gICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBxLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RvcmVNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIHFNc2c6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+KTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPiB7XG4gICAgcmV0dXJuIHFNc2cudGhlbigobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcbiAgICAgIGxldCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zO1xuICAgICAgbGV0IGlkID0gdGhpcy5tZXNzYWdlcy5tb2RlbElkKG1zZyk7XG4gICAgICBkaWFnLmRlYnVnLmluZm8oJ3N0b3JlTWVzc2FnZSAnICsgaWQpO1xuICAgICAgdmFyIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gaWQgJiYgPExpdmVEYXRhTWVzc2FnZU1vZGVsPnRoaXMubWVzc2FnZXMuZ2V0KGlkKTtcbiAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgIC8vIHVzZSBleGlzdGluZyBpbnN0YW5jZSwgc2hvdWxkIG5vdCBiZSB0aGUgY2FzZSB1c3VhbGx5XG4gICAgICAgIG9wdGlvbnMgPSA8QmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucz57XG4gICAgICAgICAgbWVyZ2U6IHRydWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGluc3RhbnRpYXRlIG5ldyBtb2RlbCwgaW50ZW50aW9uYWxseSBub3QgYWRkZWQgdG8gY29sbGVjdGlvblxuICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwobXNnLCB7XG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcbiAgICAgICAgICBzdG9yZTogdGhpcy5tZXNzYWdlcy5zdG9yZVxuICAgICAgICB9KTtcbiAgICAgICAgbWVzc2FnZS5zZXQoJ2NoYW5uZWwnLCBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBRKG1lc3NhZ2Uuc2F2ZShtc2csIG9wdGlvbnMpKS50aGVuUmVzb2x2ZShtZXNzYWdlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOiBRLlByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xuICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgLy8gbXNnIGlzIG5vdCBwZXJzaXN0ZW50XG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWVzc2FnZSA9IDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBuZXcgdGhpcy5tZXNzYWdlcy5tb2RlbCh7XG4gICAgICAgICAgICBfaWQ6IG1zZy5faWRcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLm1lc3NhZ2VzLFxuICAgICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdyZW1vdmVNZXNzYWdlICcgKyBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBjbGVhcihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKSB7XG4gICAgaWYgKGNvbGxlY3Rpb24pIHtcbiAgICAgIHZhciBlbmRwb2ludDogU3luY0VuZHBvaW50ID0gdGhpcy5nZXRFbmRwb2ludChjb2xsZWN0aW9uKTtcbiAgICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgICBpZiAodGhpcy5tZXNzYWdlcykge1xuICAgICAgICAgIHRoaXMubWVzc2FnZXMuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbGxlY3Rpb24ucmVzZXQoKTtcbiAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZSB0aGUgc29ja2V0IGV4cGxpY2l0XG4gICAqL1xuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMubWVzc2FnZXMuc3RvcmUpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMuc3RvcmUuY2xvc2UoKTtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBudWxsO1xuICAgIH1cblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5lbmRwb2ludHMpO1xuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHRoaXMuZW5kcG9pbnRzW2tleXNbaV1dLmNsb3NlKCk7XG4gICAgfVxuICB9XG59XG5cbi8vIG1peGluc1xubGV0IHN5bmNTdG9yZSA9IF8uZXh0ZW5kKFN5bmNTdG9yZS5wcm90b3R5cGUsIHtcbiAgX3R5cGU6ICdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUnLFxuXG4gIGxvY2FsU3RvcmU6IFdlYlNxbFN0b3JlLFxuICB1c2VMb2NhbFN0b3JlOiB0cnVlLFxuICB1c2VTb2NrZXROb3RpZnk6IHRydWUsXG4gIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlLFxuICBzb2NrZXRQYXRoOiAnJ1xufSk7XG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBTeW5jU3RvcmUucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShzeW5jU3RvcmUpKSk7XG4iXX0=