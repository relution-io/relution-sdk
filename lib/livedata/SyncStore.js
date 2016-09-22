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
    SyncStore.prototype.initModel = function (model) {
        model.endpoint = this.initEndpoint(model, model.constructor);
    };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxD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aUJBQWlCLEVBQUUsSUFBSTtJQUN2QixVQUFVLEVBQUUsRUFBRTtDQUNmLENBQUMsQ0FBQztBQUNILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTNELENBQTJELENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNTdG9yZS50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjQuMDYuMjAxNVxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XHJcbmltcG9ydCAqIGFzIG9iamVjdGlkIGZyb20gJy4uL2NvcmUvb2JqZWN0aWQnO1xyXG5pbXBvcnQgKiBhcyBzZWN1cml0eSBmcm9tICcuLi9zZWN1cml0eSc7XHJcbmltcG9ydCAqIGFzIHdlYiBmcm9tICcuLi93ZWInO1xyXG5cclxuaW1wb3J0IHtsb2NhbFN0b3JhZ2V9IGZyb20gJy4uL3dlYi9vZmZsaW5lJztcclxuaW1wb3J0IHtHZXRRdWVyeX0gZnJvbSAnLi4vcXVlcnkvR2V0UXVlcnknO1xyXG5pbXBvcnQge1N0b3JlLCBTdG9yZUN0b3J9IGZyb20gJy4vU3RvcmUnO1xyXG5pbXBvcnQge1dlYlNxbFN0b3JlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcclxuaW1wb3J0IHtTeW5jQ29udGV4dH0gZnJvbSAnLi9TeW5jQ29udGV4dCc7XHJcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XHJcbmltcG9ydCB7TGl2ZURhdGFNZXNzYWdlLCBMaXZlRGF0YU1lc3NhZ2VNb2RlbH0gZnJvbSAnLi9MaXZlRGF0YU1lc3NhZ2UnO1xyXG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3IsIGlzTW9kZWx9IGZyb20gJy4vTW9kZWwnO1xyXG5pbXBvcnQge0NvbGxlY3Rpb24sIGlzQ29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuXHJcbi8qKlxyXG4gKiBpbyBvZiBicm93c2VyIHZpYSBzY3JpcHQgdGFnIG9yIHZpYSByZXF1aXJlIHNvY2tldC5pby1jbGllbnQsIGVudGlyZWx5IG9wdGlvbmFsLlxyXG4gKlxyXG4gKiBOb3RpY2UsIHRoaXMgbW9kdWxlIGlzIGVudGlyZWx5IG9wdGlvbmFsIGFzIHRoZSBzdG9yZSBtYXkgb3BlcmF0ZSB3aXRob3V0IGl0IGlmIHNvY2tldFxyXG4gKiBub3RpZmljYXRpb25zIGFyZSBub3QgdXNlZC5cclxuICpcclxuICogQGludGVybmFsIE5vdCBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5IVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlvOiBTb2NrZXRJT0NsaWVudFN0YXRpYyA9IGdsb2JhbFsnaW8nXSB8fCAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb25cclxuICB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJyAmJiAgICAgICAgICAgICAgICAgICAgICAvLyBvciB3aGVuIHJlcXVpcmUgaXMgYXZhaWxhYmxlXHJcbiAgKChmdW5jdGlvbiByZXF1aXJlU29ja2V0SW8oKSB7ICAgICAgICAgICAgICAgICAgICAgICAgLy8gcmVxdWlyZWQgdmVyc2lvblxyXG4gICAgLy8gaGVyZSB3ZSBhcmUgaW4gYW4gaW1tZWRpYXRlbHkgaW52b2tlZCBmdW5jdGlvbiByZXF1aXJpbmcgc29ja2V0LmlvLWNsaWVudCwgaWYgYXZhaWxhYmxlXHJcbiAgICB0cnkge1xyXG4gICAgICByZXR1cm4gKGdsb2JhbFsnaW8nXSA9IHJlcXVpcmUoJ3NvY2tldC5pby1jbGllbnQnKSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ29wdGlvbmFsIHNvY2tldC5pby1jbGllbnQgbW9kdWxlIGlzIG5vdCBhdmFpbGFibGU6ICcgKyBlcnJvciAmJiBlcnJvci5tZXNzYWdlKTtcclxuICAgIH1cclxuICB9KSgpKTtcclxuXHJcbi8qKlxyXG4gKiBjb25uZWN0cyBhIE1vZGVsL0NvbGxlY3Rpb24gdG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIFRoaXMgd2lsbCBnaXZlIHlvdSBhbiBvbmxpbmUgYW5kIG9mZmxpbmUgc3RvcmUgd2l0aCBsaXZlIGRhdGEgdXBkYXRlcy5cclxuICpcclxuICogQGV4YW1wbGVcclxuICpcclxuICogLy8gVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB3aWxsIHNhdmUgdGhlIGNvbXBsZXRlIG1vZGVsIGRhdGEgYXMgYSBqc29uLFxyXG4gKiAvLyBhbmQgdGhlIG9mZmxpbmUgY2hhbmdlIGxvZyB0byBhIGxvY2FsIFdlYlNxbCBkYXRhYmFzZSwgc3luY2hyb25pemUgaXRcclxuICogLy8gdHJvdWdoIFJFU1QgY2FsbHMgd2l0aCB0aGUgc2VydmVyIGFuZCByZWNlaXZlIGxpdmUgdXBkYXRlcyB2aWEgYSBzb2NrZXQuaW8gY29ubmVjdGlvbi5cclxuICogY2xhc3MgTXlDb2xsZWN0aW9uIGV4dGVuZHMgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiB7fTtcclxuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCA9IE15TW9kZWw7XHJcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUudXJsID0gJ2h0dHA6Ly9teVNlcnZlci5pby9teU9yZ2EvbXlBcHBsaWNhdGlvbi9teUNvbGxlY3Rpb24nO1xyXG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLnN0b3JlID0gbmV3IFJlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZSh7XHJcbiAqICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSwgICAgIC8vIChkZWZhdWx0KSBzdG9yZSB0aGUgZGF0YSBmb3Igb2ZmbGluZSB1c2VcclxuICogICB1c2VTb2NrZXROb3RpZnk6IHRydWUsICAgLy8gKGRlZmF1bHQpIHJlZ2lzdGVyIGF0IHRoZSBzZXJ2ZXIgZm9yIGxpdmUgdXBkYXRlc1xyXG4gKiAgIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlICAvLyAoZGVmYXVsdCkgYWxsb3cgY2hhbmdlcyB0byB0aGUgb2ZmbGluZSBkYXRhXHJcbiAqIH0pO1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFN5bmNTdG9yZSBleHRlbmRzIFN0b3JlIHtcclxuXHJcbiAgLy8gZm9sbG93aW5nIGFyZSBzdG9yZS1zcGVjaWZpYyBvcHRpb25zLCBkZWZhdWx0cyBzdG9yZWQgaW4gcHJvdG90eXBlIGF0IGVuZCBvZiB0aGlzIGZpbGVcclxuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZTogU3RvcmVDdG9yO1xyXG4gIHByb3RlY3RlZCBsb2NhbFN0b3JlT3B0aW9uczogYW55O1xyXG4gIHByb3RlY3RlZCB1c2VMb2NhbFN0b3JlOiBib29sZWFuO1xyXG4gIHByb3RlY3RlZCB1c2VTb2NrZXROb3RpZnk6IGJvb2xlYW47XHJcbiAgcHJvdGVjdGVkIHVzZU9mZmxpbmVDaGFuZ2VzOiBib29sZWFuO1xyXG4gIHByb3RlY3RlZCBzb2NrZXRQYXRoOiBzdHJpbmc7XHJcbiAgcHJvdGVjdGVkIHNvY2tldFF1ZXJ5OiBzdHJpbmc7XHJcbiAgcHJvdGVjdGVkIGNyZWRlbnRpYWxzOiBhbnk7XHJcbiAgcHJvdGVjdGVkIG9yZGVyT2ZmbGluZUNoYW5nZXM6IHN0cmluZ1tdO1xyXG5cclxuICAvKipcclxuICAgKiBzZXJ2ZXIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RvcmUuXHJcbiAgICpcclxuICAgKiBUaGUgc3luYyBtZXRob2Qgd2lsbCBmYWlsIGVhcmx5IHdoZW4gYmVpbmcgYXBwbGllZCB0byBkYXRhIG9mIHNvbWUgb3RoZXIgc2VydmVyLlxyXG4gICAqL1xyXG4gIHByb3RlY3RlZCBzZXJ2ZXJVcmw6IHN0cmluZztcclxuICAvKipcclxuICAgKiBpZGVudGl0eSBvciB1c2VyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxyXG4gICAqXHJcbiAgICogVGhlIGFqYXggbWV0aG9kIHdpbGwgc2ltdWxhdGUgYW4gb2ZmbGluZSB0aW1lb3V0IHdoZW4gdGhlIHVzZXIgaWRlbnRpdHkgaXMgY2hhbmdlZC4gVGhpcyBpc1xyXG4gICAqIGJlY2F1c2UganVzdCBvbmUgc2Vzc2lvbiBjYW4gYmUgbWFpbnRhaW5lZCBwZXIgc2VydmVyIGFuZCBsb2dpbi9sb2dvdXQgc2VtYW50aWNzIG11c3QgYmUgd2VsbFxyXG4gICAqIGJlaGF2ZWQuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHVzZXJVdWlkOiBzdHJpbmc7XHJcblxyXG4gIHB1YmxpYyBlbmRwb2ludHM6IHtcclxuICAgIC8vIG1hcCBvZiBlbnRpdHkgdG8gU3luY0VuZHBvaW50XHJcbiAgICBbZW50aXR5OiBzdHJpbmddOiBTeW5jRW5kcG9pbnQ7XHJcbiAgfSA9IHt9O1xyXG5cclxuICBwcml2YXRlIGxhc3RNZXNnVGltZTogYW55O1xyXG5cclxuICAvKipcclxuICAgKiB3aGVuIHNldCwgaW5kaWNhdGVzIHdoaWNoIGVudGl0eSBjYXVzZWQgYSBkaXNjb25uZWN0aW9uLlxyXG4gICAqXHJcbiAgICogPHA+XHJcbiAgICogVGhpcyBpcyBzZXQgdG8gYW4gZW50aXR5IG5hbWUgdG8gbGltaXQgd2hpY2ggZW50aXR5IG1heSBjYXVzZSBhIGNoYW5nZSB0byBvbmxpbmUgc3RhdGUgYWdhaW4uXHJcbiAgICogPC9wPlxyXG4gICAqXHJcbiAgICogQHR5cGUge3N0cmluZ31cclxuICAgKi9cclxuICBwcml2YXRlIGRpc2Nvbm5lY3RlZEVudGl0eTogc3RyaW5nID0gJ2FsbCc7XHJcblxyXG4gIHB1YmxpYyBtZXNzYWdlczogQ29sbGVjdGlvbjtcclxuICBwdWJsaWMgbWVzc2FnZXNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XHJcblxyXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBhbnkpIHtcclxuICAgIHN1cGVyKG9wdGlvbnMpO1xyXG4gICAgaWYgKHRoaXMuY3JlZGVudGlhbHMpIHtcclxuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IF8uY2xvbmUodGhpcy5jcmVkZW50aWFscyk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucykge1xyXG4gICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpIHtcclxuICAgICAgdGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzID0gXy5jbG9uZSh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSAmJiB0eXBlb2YgaW8gIT09ICdvYmplY3QnKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2FybmluZygnU29ja2V0LklPIG5vdCBwcmVzZW50ICEhJyk7XHJcbiAgICAgIHRoaXMudXNlU29ja2V0Tm90aWZ5ID0gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBiaW5kcyB0aGUgc3RvcmUgdG8gYSB0YXJnZXQgc2VydmVyIHdoZW4gdGhlIGZpcnN0IGVuZHBvaW50IGlzIGNyZWF0ZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gdXJsUm9vdCB1c2VkIHRvIHJlc29sdmUgdGhlIHNlcnZlciB0byBvcGVyYXRlLlxyXG4gICAgICovXHJcbiAgcHJpdmF0ZSBpbml0U2VydmVyKHVybFJvb3Q6IHN0cmluZykge1xyXG4gICAgbGV0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKHVybFJvb3QsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSk7XHJcbiAgICBpZiAoIXRoaXMuc2VydmVyVXJsKSB7XHJcbiAgICAgIGNvbnN0IHNlcnZlciA9IHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xyXG4gICAgICB0aGlzLnNlcnZlclVybCA9IHNlcnZlclVybDtcclxuICAgICAgdGhpcy51c2VyVXVpZCA9IHNlcnZlci5hdXRob3JpemF0aW9uLm5hbWU7XHJcbiAgICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zICYmICF0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAgICAgLy8gY2FwdHVyZSBjcmVkZW50aWFscyBmb3IgdXNlIGJ5IGNyeXB0byBzdG9yZXNcclxuICAgICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzID0gXy5kZWZhdWx0cyh7XHJcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxyXG4gICAgICAgIH0sIHNlcnZlci5jcmVkZW50aWFscyk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSBpZiAoc2VydmVyVXJsICE9PSB0aGlzLnNlcnZlclVybCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwgKyAnIGFscmVhZHknKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY2hlY2tTZXJ2ZXIodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8c3RyaW5nPiB7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcclxuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XHJcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XHJcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XHJcbiAgICAgIHJldHVybiBvcHRpb25zICYmIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0PHN0cmluZz4oZXJyb3IpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFEucmVzb2x2ZSh1cmwpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGluaXRFbmRwb2ludChtb2RlbE9yQ29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uLCBtb2RlbFR5cGU6IE1vZGVsQ3Rvcik6IFN5bmNFbmRwb2ludCB7XHJcbiAgICB2YXIgdXJsUm9vdCA9IG1vZGVsT3JDb2xsZWN0aW9uLmdldFVybFJvb3QoKTtcclxuICAgIHZhciBlbnRpdHkgPSBtb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHk7XHJcbiAgICBpZiAodXJsUm9vdCAmJiBlbnRpdHkpIHtcclxuICAgICAgLy8gZ2V0IG9yIGNyZWF0ZSBlbmRwb2ludCBmb3IgdGhpcyB1cmxcclxuICAgICAgdGhpcy5pbml0U2VydmVyKHVybFJvb3QpO1xyXG4gICAgICB2YXIgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xyXG4gICAgICBpZiAoIWVuZHBvaW50KSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuaW5pdEVuZHBvaW50OiAnICsgZW50aXR5KTtcclxuICAgICAgICBlbmRwb2ludCA9IG5ldyBTeW5jRW5kcG9pbnQoe1xyXG4gICAgICAgICAgZW50aXR5OiBlbnRpdHksXHJcbiAgICAgICAgICBtb2RlbFR5cGU6IG1vZGVsVHlwZSxcclxuICAgICAgICAgIHVybFJvb3Q6IHVybFJvb3QsXHJcbiAgICAgICAgICBzb2NrZXRQYXRoOiB0aGlzLnNvY2tldFBhdGgsXHJcbiAgICAgICAgICB1c2VyVXVpZDogdGhpcy51c2VyVXVpZFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuZW5kcG9pbnRzW2VudGl0eV0gPSBlbmRwb2ludDtcclxuXHJcbiAgICAgICAgZW5kcG9pbnQubG9jYWxTdG9yZSA9IHRoaXMuY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludCk7XHJcbiAgICAgICAgZW5kcG9pbnQucHJpb3JpdHkgPSB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgJiYgKF8ubGFzdEluZGV4T2YodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzLCBlbmRwb2ludC5lbnRpdHkpICsgMSk7XHJcbiAgICAgICAgdGhpcy5jcmVhdGVNc2dDb2xsZWN0aW9uKCk7XHJcbiAgICAgICAgZW5kcG9pbnQuc29ja2V0ID0gdGhpcy5jcmVhdGVTb2NrZXQoZW5kcG9pbnQsIGVudGl0eSk7XHJcbiAgICAgICAgZW5kcG9pbnQuaW5mbyA9IHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBjb25maWd1cmF0aW9uIGNhbiBub3QgY2hhbmdlLCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQuLi5cclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC51cmxSb290ID09PSB1cmxSb290LCAnY2FuIG5vdCBjaGFuZ2UgdXJsUm9vdCwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xyXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVzZXJVdWlkID09PSB0aGlzLnVzZXJVdWlkLCAnY2FuIG5vdCBjaGFuZ2UgdXNlciBpZGVudGl0eSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBlbmRwb2ludDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGluaXRNb2RlbChtb2RlbDogTW9kZWwpOiB2b2lkIHtcclxuICAgIG1vZGVsLmVuZHBvaW50ID0gdGhpcy5pbml0RW5kcG9pbnQobW9kZWwsIDxNb2RlbEN0b3I+bW9kZWwuY29uc3RydWN0b3IpO1xyXG4gIH1cclxuXHJcbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IHZvaWQge1xyXG4gICAgY29sbGVjdGlvbi5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KGNvbGxlY3Rpb24sIGNvbGxlY3Rpb24ubW9kZWwpO1xyXG4gIH1cclxuXHJcbiAgZ2V0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbik6IFN5bmNFbmRwb2ludCB7XHJcbiAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1ttb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHldO1xyXG4gICAgaWYgKGVuZHBvaW50KSB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcclxuICAgICAgICAvLyBjaGVja3MgdGhhdCBtb2RlbE9yQ29sbGVjdGlvbiB1c2VzIGEgbW9kZWwgaW5oZXJpdGluZyBmcm9tIHRoZSBvbmUgb2YgdGhlIGVuZHBvaW50XHJcbiAgICAgICAgbGV0IG1vZGVsVHlwZSA9IGlzQ29sbGVjdGlvbihtb2RlbE9yQ29sbGVjdGlvbikgPyBtb2RlbE9yQ29sbGVjdGlvbi5tb2RlbCA6IG1vZGVsT3JDb2xsZWN0aW9uLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiBtb2RlbFR5cGUgPT09IGVuZHBvaW50Lm1vZGVsVHlwZSB8fCBtb2RlbFR5cGUucHJvdG90eXBlIGluc3RhbmNlb2YgZW5kcG9pbnQubW9kZWxUeXBlO1xyXG4gICAgICB9LCAnd3JvbmcgdHlwZSBvZiBtb2RlbCEnKTtcclxuICAgICAgcmV0dXJuIGVuZHBvaW50O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludDogU3luY0VuZHBvaW50KTogU3RvcmUge1xyXG4gICAgaWYgKHRoaXMudXNlTG9jYWxTdG9yZSkge1xyXG4gICAgICB2YXIgZW50aXRpZXMgPSB7fTtcclxuICAgICAgZW50aXRpZXNbZW5kcG9pbnQuZW50aXR5XSA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICAgIHZhciBzdG9yZU9wdGlvbiA9IHtcclxuICAgICAgICBlbnRpdGllczogZW50aXRpZXNcclxuICAgICAgfTtcclxuICAgICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgc3RvcmVPcHRpb24gPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xyXG4gICAgICAgIHN0b3JlT3B0aW9uLmVudGl0aWVzID0gZW50aXRpZXM7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmxvY2FsU3RvcmUoc3RvcmVPcHRpb24pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQGRlc2NyaXB0aW9uIEhlcmUgd2Ugc2F2ZSB0aGUgY2hhbmdlcyBpbiBhIE1lc3NhZ2UgbG9jYWwgd2Vic3FsXHJcbiAgICogQHJldHVybnMgeyp9XHJcbiAgICovXHJcbiAgY3JlYXRlTXNnQ29sbGVjdGlvbigpOiBDb2xsZWN0aW9uIHtcclxuICAgIGlmICh0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzICYmICF0aGlzLm1lc3NhZ2VzKSB7XHJcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgQ29sbGVjdGlvbih1bmRlZmluZWQsIHtcclxuICAgICAgICBtb2RlbDogTGl2ZURhdGFNZXNzYWdlTW9kZWwsXHJcbiAgICAgICAgc3RvcmU6IG5ldyB0aGlzLmxvY2FsU3RvcmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucylcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcclxuICB9XHJcblxyXG4gIGNyZWF0ZVNvY2tldChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lOiBzdHJpbmcpIHtcclxuICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSAmJiBlbmRwb2ludCAmJiBlbmRwb2ludC5zb2NrZXRQYXRoKSB7XHJcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5jcmVhdGVTb2NrZXQ6ICcgKyBuYW1lKTtcclxuXHJcbiAgICAgIC8vIHJlc291cmNlXHJcbiAgICAgIGxldCBjb25uZWN0Vm86IGFueSA9IHtcclxuICAgICAgfTtcclxuICAgICAgbGV0IHJlc291cmNlID0gZW5kcG9pbnQuc29ja2V0UGF0aDsgLy8gcmVtb3ZlIGxlYWRpbmcgL1xyXG4gICAgICBjb25uZWN0Vm8ucmVzb3VyY2UgPSAocmVzb3VyY2UgJiYgcmVzb3VyY2UuaW5kZXhPZignLycpID09PSAwKSA/IHJlc291cmNlLnN1YnN0cigxKSA6IHJlc291cmNlO1xyXG4gICAgICBpZiAodGhpcy5zb2NrZXRRdWVyeSkge1xyXG4gICAgICAgIGNvbm5lY3RWby5xdWVyeSA9IHRoaXMuc29ja2V0UXVlcnk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHNvY2tldFxyXG4gICAgICBlbmRwb2ludC5zb2NrZXQgPSBpby5jb25uZWN0KGVuZHBvaW50Lmhvc3QsIGNvbm5lY3RWbyk7XHJcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcclxuICAgICAgICB0aGlzLl9iaW5kQ2hhbm5lbChlbmRwb2ludCwgbmFtZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVuZHBvaW50KS5kb25lKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAoKSA9PiB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzb2NrZXQuaW86IGRpc2Nvbm5lY3QnKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLmRvbmUoKTtcclxuICAgICAgfSk7XHJcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbihlbmRwb2ludC5jaGFubmVsLCAobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVuZHBvaW50LnNvY2tldDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9iaW5kQ2hhbm5lbChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lPzogc3RyaW5nKSB7XHJcbiAgICBpZiAoZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0KSB7XHJcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fYmluZENoYW5uZWw6ICcgKyBuYW1lKTtcclxuXHJcbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcclxuICAgICAgdmFyIHNvY2tldCA9IGVuZHBvaW50LnNvY2tldDtcclxuICAgICAgdmFyIHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcclxuICAgICAgbmFtZSA9IG5hbWUgfHwgZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgICBzb2NrZXQuZW1pdCgnYmluZCcsIHtcclxuICAgICAgICBlbnRpdHk6IG5hbWUsXHJcbiAgICAgICAgY2hhbm5lbDogY2hhbm5lbCxcclxuICAgICAgICB0aW1lOiB0aW1lXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWw6IHN0cmluZyk6IGFueSB7XHJcbiAgICBpZiAoIXRoaXMubGFzdE1lc2dUaW1lKSB7XHJcbiAgICAgIHRoaXMubGFzdE1lc2dUaW1lID0ge307XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdO1xyXG4gICAgfVxyXG4gICAgLy8gdGhlIHwgMCBiZWxvdyB0dXJucyBzdHJpbmdzIGludG8gbnVtYmVyc1xyXG4gICAgdmFyIHRpbWUgPSBsb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCdfXycgKyBjaGFubmVsICsgJ2xhc3RNZXNnVGltZScpIHx8IDA7XHJcbiAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XHJcbiAgICByZXR1cm4gdGltZTtcclxuICB9XHJcblxyXG4gIHNldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcsIHRpbWU6IGFueSk6IHZvaWQge1xyXG4gICAgaWYgKCF0aW1lIHx8IHRpbWUgPiB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKSkge1xyXG4gICAgICBsb2NhbFN0b3JhZ2UoKS5zZXRJdGVtKCdfXycgKyBjaGFubmVsICsgJ2xhc3RNZXNnVGltZScsIHRpbWUpO1xyXG4gICAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbkNvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIC8vIHdoZW4gb2ZmbGluZSB0cmFuc21pc3Npb24gaXMgcGVuZGluZywgbmVlZCB0byB3YWl0IGZvciBpdCB0byBjb21wbGV0ZVxyXG4gICAgICBsZXQgcSA9IFEucmVzb2x2ZSh1bmRlZmluZWQpO1xyXG4gICAgICBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UgJiYgdGhpcy5tZXNzYWdlc1Byb21pc2UuaXNQZW5kaW5nKCkpIHtcclxuICAgICAgICBxID0gdGhpcy5tZXNzYWdlc1Byb21pc2UuY2F0Y2goKGVycm9yKSA9PiBRLnJlc29sdmUodW5kZWZpbmVkKSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHN5bmMgc2VydmVyL2NsaWVudCBjaGFuZ2VzXHJcbiAgICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gcS50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBuZXh0IHdlJ2xsIGZldGNoIHNlcnZlci1zaWRlIGNoYW5nZXNcclxuICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgLy8gdGhlbiBzZW5kIGNsaWVudC1zaWRlIGNoYW5nZXNcclxuICAgICAgICAgIGlmICh0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9PT0gJ2FsbCcgfHwgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSkge1xyXG4gICAgICAgICAgICAvLyByZXN0YXJ0IHJlcGxheWluZyBvZiBvZmZsaW5lIG1lc3NhZ2VzXHJcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBudWxsO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3NlbmRNZXNzYWdlcygpO1xyXG4gICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgLy8gY2F0Y2ggd2l0aG91dCBlcnJvciBpbmRpY2F0ZXMgZGlzY29ubmVjdGlvbiB3aGlsZSBnb2luZyBvbmxpbmVcclxuICAgICAgICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgICAgICAgLy8gZGlzY29ubmVjdGVkIHdoaWxlIHNlbmRpbmcgb2ZmbGluZSBjaGFuZ2VzXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgICAvLyBpbiB0aGUgZW5kLCB3aGVuIGNvbm5lY3RlZCBzdGlsbCwgZmlyZSBhbiBldmVudCBpbmZvcm1pbmcgY2xpZW50IGNvZGVcclxuICAgICAgICBpZiAoZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgIHRoaXMudHJpZ2dlcignY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBlbmRwb2ludC5pc0Nvbm5lY3RlZDtcclxuICB9XHJcblxyXG4gIG9uRGlzY29ubmVjdChlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPHZvaWQ+IHtcclxuICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xyXG4gICAgfVxyXG4gICAgZW5kcG9pbnQuaXNDb25uZWN0ZWQgPSBudWxsO1xyXG4gICAgaWYgKCF0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSkge1xyXG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9ICdhbGwnO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBRLmZjYWxsKCgpID0+IHtcclxuICAgICAgaWYgKGVuZHBvaW50LnNvY2tldCAmJiAoPGFueT5lbmRwb2ludC5zb2NrZXQpLnNvY2tldCkge1xyXG4gICAgICAgIC8vIGNvbnNpZGVyIGNhbGxpbmcgZW5kcG9pbnQuc29ja2V0LmRpc2Nvbm5lY3QoKSBpbnN0ZWFkXHJcbiAgICAgICAgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQub25EaXNjb25uZWN0KCk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdkaXNjb25uZWN0OicgKyBlbmRwb2ludC5jaGFubmVsKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBfZml4TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSk6IExpdmVEYXRhTWVzc2FnZSB7XHJcbiAgICBsZXQgaWRBdHRyaWJ1dGUgPSBlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlO1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFpZEF0dHJpYnV0ZSwgJ25vIGlkQXR0cmlidXRlIScpO1xyXG5cclxuICAgIGlmIChtc2cuZGF0YSAmJiAhbXNnLmRhdGFbaWRBdHRyaWJ1dGVdICYmIG1zZy5kYXRhLl9pZCkge1xyXG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2cuZGF0YS5faWQ7IC8vIHNlcnZlciBidWchXHJcbiAgICB9IGVsc2UgaWYgKCFtc2cuZGF0YSAmJiBtc2cubWV0aG9kID09PSAnZGVsZXRlJyAmJiBtc2dbaWRBdHRyaWJ1dGVdKSB7XHJcbiAgICAgIG1zZy5kYXRhID0ge307XHJcbiAgICAgIG1zZy5kYXRhW2lkQXR0cmlidXRlXSA9IG1zZ1tpZEF0dHJpYnV0ZV07IC8vIHNlcnZlciBidWchXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbXNnO1xyXG4gIH1cclxuXHJcbiAgb25NZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlKTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT4ge1xyXG4gICAgLy8gdGhpcyBpcyBjYWxsZWQgYnkgdGhlIHN0b3JlIGl0c2VsZiBmb3IgYSBwYXJ0aWN1bGFyIGVuZHBvaW50IVxyXG4gICAgaWYgKCFtc2cgfHwgIW1zZy5tZXRob2QpIHtcclxuICAgICAgcmV0dXJuIFEucmVqZWN0PExpdmVEYXRhTWVzc2FnZT4obmV3IEVycm9yKCdubyBtZXNzYWdlIG9yIG1ldGhvZCBnaXZlbicpKTtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgcTogUS5Qcm9taXNlPGFueT47XHJcbiAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICBpZiAoZW5kcG9pbnQubG9jYWxTdG9yZSkge1xyXG4gICAgICAvLyBmaXJzdCB1cGRhdGUgdGhlIGxvY2FsIHN0b3JlIGJ5IGZvcm1pbmcgYSBtb2RlbCBhbmQgaW52b2tpbmcgc3luY1xyXG4gICAgICB2YXIgb3B0aW9ucyA9IF8uZGVmYXVsdHMoe1xyXG4gICAgICAgIHN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXHJcbiAgICAgIH0sIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xyXG4gICAgICB2YXIgbW9kZWwgPSBuZXcgZW5kcG9pbnQubW9kZWxUeXBlKG1zZy5kYXRhLCBfLmV4dGVuZCh7XHJcbiAgICAgICAgcGFyc2U6IHRydWVcclxuICAgICAgfSwgb3B0aW9ucykpO1xyXG4gICAgICBpZiAoIW1vZGVsLmlkKSB7XHJcbiAgICAgICAgLy8gY29kZSBiZWxvdyB3aWxsIHBlcnNpc3Qgd2l0aCBhdXRvLWFzc2lnbmVkIGlkIGJ1dCB0aGlzIG5ldmVydGhlbGVzcyBpcyBhIGJyb2tlbiByZWNvcmRcclxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnIHJlY2VpdmVkIGRhdGEgd2l0aCBubyB2YWxpZCBpZCBwZXJmb3JtaW5nICcgKyBtc2cubWV0aG9kICsgJyEnKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBkaWFnLmRlYnVnLmRlYnVnKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnICcgKyBtb2RlbC5pZCArICcgcGVyZm9ybWluZyAnICsgbXNnLm1ldGhvZCk7XHJcbiAgICAgIH1cclxuICAgICAgcSA9IGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtc2cubWV0aG9kLCBtb2RlbCwgXy5leHRlbmQob3B0aW9ucywge1xyXG4gICAgICAgIG1lcmdlOiBtc2cubWV0aG9kID09PSAncGF0Y2gnXHJcbiAgICAgIH0pKS50aGVuKChyZXN1bHQpID0+IHtcclxuICAgICAgICBpZiAoIW1zZy5pZCB8fCBtc2cuaWQgPT09IG1vZGVsLmlkKSB7XHJcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gaWQgdmFsdWUgd2FzIHJlYXNzaWduZWQsIGRlbGV0ZSByZWNvcmQgb2Ygb2xkIGlkXHJcbiAgICAgICAgdmFyIG9sZERhdGEgPSB7fTtcclxuICAgICAgICBvbGREYXRhW21vZGVsLmlkQXR0cmlidXRlXSA9IG1zZy5pZDtcclxuICAgICAgICB2YXIgb2xkTW9kZWwgPSBuZXcgZW5kcG9pbnQubW9kZWxUeXBlKG9sZERhdGEsIG9wdGlvbnMpO1xyXG4gICAgICAgIGRpYWcuZGVidWcuZGVidWcoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgJyArIG1vZGVsLmlkICsgJyByZWFzc2lnbmVkIGZyb20gb2xkIHJlY29yZCAnICsgb2xkTW9kZWwuaWQpO1xyXG4gICAgICAgIHJldHVybiBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMoJ2RlbGV0ZScsIG9sZE1vZGVsLCBvcHRpb25zKTtcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBqdXN0IHVwZGF0ZSBhbGwgY29sbGVjdGlvbnMgbGlzdGVuaW5nXHJcbiAgICAgIHEgPSBRLnJlc29sdmUobXNnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBmaW5hbGx5IHNldCB0aGUgbWVzc2FnZSB0aW1lXHJcbiAgICByZXR1cm4gcS50aGVuKCgpID0+IHtcclxuICAgICAgaWYgKG1zZy50aW1lKSB7XHJcbiAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgbXNnLnRpbWUpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xyXG4gICAgICB0aGlzLnRyaWdnZXIoJ3N5bmM6JyArIGNoYW5uZWwsIG1zZyk7IC8vIFN5bmNDb250ZXh0Lm9uTWVzc2FnZVxyXG4gICAgICByZXR1cm4gbXNnO1xyXG4gICAgfSwgKGVycm9yOiBFcnJvcikgPT4ge1xyXG4gICAgICAvLyBub3Qgc2V0dGluZyBtZXNzYWdlIHRpbWUgaW4gZXJyb3IgY2FzZVxyXG5cclxuICAgICAgLy8gcmVwb3J0IGVycm9yIGFzIGV2ZW50IG9uIHN0b3JlXHJcbiAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XHJcbiAgICAgIHJldHVybiBtc2c7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkgPSB7fSk6IFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5zeW5jJyk7XHJcbiAgICB0cnkge1xyXG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IG1vZGVsLmVuZHBvaW50IHx8IHRoaXMuZ2V0RW5kcG9pbnQobW9kZWwpO1xyXG4gICAgICBpZiAoIWVuZHBvaW50KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBlbmRwb2ludCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xyXG4gICAgICAgIC8vIGNvbGxlY3Rpb25zIGNhbiBiZSBmaWx0ZXJlZCwgZXRjLlxyXG4gICAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiAhb3B0aW9ucy5iYXJlYm9uZSkge1xyXG4gICAgICAgICAgdmFyIHN5bmNDb250ZXh0OiBTeW5jQ29udGV4dCA9IG9wdGlvbnMuc3luY0NvbnRleHQ7IC8vIHN5bmMgY2FuIGJlIGNhbGxlZCBieSBTeW5jQ29udGV4dCBpdHNlbGYgd2hlbiBwYWdpbmcgcmVzdWx0c1xyXG4gICAgICAgICAgaWYgKCFzeW5jQ29udGV4dCkge1xyXG4gICAgICAgICAgICAvLyBjYXB0dXJlIEdldFF1ZXJ5IG9wdGlvbnNcclxuICAgICAgICAgICAgc3luY0NvbnRleHQgPSBuZXcgU3luY0NvbnRleHQoXHJcbiAgICAgICAgICAgICAgb3B0aW9ucywgICAgICAgIC8vIGR5bmFtaWMgb3B0aW9ucyBwYXNzZWQgdG8gZmV0Y2goKSBpbXBsZW1lbnQgVUkgZmlsdGVycywgZXRjLlxyXG4gICAgICAgICAgICAgIG1vZGVsLm9wdGlvbnMsICAvLyBzdGF0aWMgb3B0aW9ucyBvbiBjb2xsZWN0aW9uIGltcGxlbWVudCBzY3JlZW4tc3BlY2lmaWMgc3R1ZmZcclxuICAgICAgICAgICAgICB0aGlzICAgICAgICAgICAgLy8gc3RhdGljIG9wdGlvbnMgb2YgdGhpcyBzdG9yZSByZWFsaXplIGZpbHRlcmluZyBjbGllbnQvc2VydmVyXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuc3luY0NvbnRleHQgPSBzeW5jQ29udGV4dDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChtb2RlbC5zeW5jQ29udGV4dCAhPT0gc3luY0NvbnRleHQpIHtcclxuICAgICAgICAgICAgLy8gYXNzaWduIGEgZGlmZmVyZW50IGluc3RhbmNlXHJcbiAgICAgICAgICAgIGlmIChtb2RlbC5zeW5jQ29udGV4dCkge1xyXG4gICAgICAgICAgICAgIG1vZGVsLnN0b3BMaXN0ZW5pbmcodGhpcywgJ3N5bmM6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG1vZGVsLmxpc3RlblRvKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsLCBfLmJpbmQoc3luY0NvbnRleHQub25NZXNzYWdlLCBzeW5jQ29udGV4dCwgdGhpcywgbW9kZWwpKTtcclxuICAgICAgICAgICAgbW9kZWwuc3luY0NvbnRleHQgPSBzeW5jQ29udGV4dDtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSBpZiAoaXNNb2RlbChtb2RlbCkpIHtcclxuICAgICAgICAvLyBvZmZsaW5lIGNhcGFiaWxpdHkgcmVxdWlyZXMgSURzIGZvciBkYXRhXHJcbiAgICAgICAgaWYgKCFtb2RlbC5pZCkge1xyXG4gICAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ2NyZWF0ZScpIHtcclxuICAgICAgICAgICAgbW9kZWwuc2V0KG1vZGVsLmlkQXR0cmlidXRlLCBvYmplY3RpZC5tYWtlT2JqZWN0SUQoKSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsZXQgZXJyb3IgPSBuZXcgRXJyb3IoJ25vICh2YWxpZCkgaWQ6ICcgKyBtb2RlbC5pZCk7XHJcbiAgICAgICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNvbWV0aGluZyBpcyByZWFsbHkgYXQgb2RkcyBoZXJlLi4uXHJcbiAgICAgICAgbGV0IGVycm9yID0gbmV3IEVycm9yKCd0YXJnZXQgb2Ygc3luYyBpcyBuZWl0aGVyIGEgbW9kZWwgbm9yIGEgY29sbGVjdGlvbiE/IScpO1xyXG4gICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGF0IHRoaXMgcG9pbnQgdGhlIHRhcmdldCBzZXJ2ZXIgaXMga25vd24sIGNoZWNrIG1ha2luZyBzdXJlIHRoZSBjb3JyZWN0IHNlcnZlciBpcyBiZWluZyBoaXRcclxuICAgICAgY29uc3Qgc2VydmVyVXJsID0gd2ViLnJlc29sdmVTZXJ2ZXIobW9kZWwuZ2V0VXJsUm9vdCgpLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgICB9KTtcclxuICAgICAgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICAgIHZhciB0aW1lID0gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XHJcbiAgICAgIC8vIG9ubHkgc2VuZCByZWFkIG1lc3NhZ2VzIGlmIG5vIG90aGVyIHN0b3JlIGNhbiBkbyB0aGlzIG9yIGZvciBpbml0aWFsIGxvYWRcclxuICAgICAgaWYgKG1ldGhvZCA9PT0gJ3JlYWQnICYmIGVuZHBvaW50LmxvY2FsU3RvcmUgJiYgdGltZSAmJiAhb3B0aW9ucy5yZXNldCkge1xyXG4gICAgICAgIC8vIHJlYWQgZGF0YSBmcm9tIGxvY2FsU3RvcmUgYW5kIGZldGNoIGNoYW5nZXMgcmVtb3RlXHJcbiAgICAgICAgdmFyIG9wdHMgPSBfLmNsb25lKG9wdGlvbnMpO1xyXG4gICAgICAgIG9wdHMuc3RvcmUgPSBlbmRwb2ludC5sb2NhbFN0b3JlO1xyXG4gICAgICAgIG9wdHMuZW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgICAgIGRlbGV0ZSBvcHRzLnN1Y2Nlc3M7XHJcbiAgICAgICAgZGVsZXRlIG9wdHMuZXJyb3I7XHJcbiAgICAgICAgcmV0dXJuIGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtZXRob2QsIG1vZGVsLCBvcHRzKS50aGVuKChyZXNwKSA9PiB7XHJcbiAgICAgICAgICAvLyBiYWNrYm9uZSBzdWNjZXNzIGNhbGxiYWNrIGFsdGVycyB0aGUgY29sbGVjdGlvbiBub3dcclxuICAgICAgICAgIHJlc3AgPSB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcCkgfHwgcmVzcDtcclxuICAgICAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgfHwgb3B0aW9ucy5mZXRjaE1vZGUgPT09ICdsb2NhbCcpIHtcclxuICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmZXRjaCBjaGFuZ2VzIGFzIHdlIGdvdCBhIHdlYnNvY2tldCwgdGhhdCBpcyBlaXRoZXIgY29ubmVjdGVkIG9yIGF0dGVtcHRzIHJlY29ubmVjdGlvblxyXG4gICAgICAgICAgICByZXR1cm4gcmVzcDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyB3aGVuIHdlIGFyZSBkaXNjb25uZWN0ZWQsIHRyeSB0byBjb25uZWN0IG5vd1xyXG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpLnRoZW4oKGluZm8pOiBhbnkgPT4ge1xyXG4gICAgICAgICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXHJcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xyXG4gICAgICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBpbmZvO1xyXG4gICAgICAgICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgLy8gdHJpZ2dlciBkaXNjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXHJcbiAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xyXG4gICAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCByZXNwO1xyXG4gICAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTtcclxuICAgICAgICAgIH0gLy8gZWxzZS4uLlxyXG5cclxuICAgICAgICAgIC8vIGxvYWQgY2hhbmdlcyBvbmx5ICh3aWxsIGhhcHBlbiBBRlRFUiBzdWNjZXNzIGNhbGxiYWNrIGlzIGludm9rZWQsXHJcbiAgICAgICAgICAvLyBidXQgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIHJlc29sdmUgb25seSBhZnRlciBjaGFuZ2VzIHdlcmUgcHJvY2Vzc2VkLlxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS5jYXRjaCgoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpIHx8IHJlc3A7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxyXG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCB4aHIsIG1vZGVsKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3A7XHJcbiAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTsgLy8gY2FsbGVyIGV4cGVjdHMgb3JpZ2luYWwgWEhSIHJlc3BvbnNlIGFzIGNoYW5nZXMgYm9keSBkYXRhIGlzIE5PVCBjb21wYXRpYmxlXHJcbiAgICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgICAgLy8gZmFsbC1iYWNrIHRvIGxvYWRpbmcgZnVsbCBkYXRhIHNldFxyXG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBkbyBiYWNrYm9uZSByZXN0XHJcbiAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9hZGRNZXNzYWdlKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIGNoYW5nZXMgPSAoPE1vZGVsPm1vZGVsKS5jaGFuZ2VkU2luY2VTeW5jO1xyXG4gICAgdmFyIGRhdGE6IGFueSA9IG51bGw7XHJcbiAgICB2YXIgc3RvcmVNc2cgPSB0cnVlO1xyXG4gICAgc3dpdGNoIChtZXRob2QpIHtcclxuICAgICAgY2FzZSAndXBkYXRlJzpcclxuICAgICAgY2FzZSAnY3JlYXRlJzpcclxuICAgICAgICBkYXRhID0gb3B0aW9ucy5hdHRycyB8fCBtb2RlbC50b0pTT04oKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3BhdGNoJzpcclxuICAgICAgICBpZiAoXy5pc0VtcHR5KGNoYW5nZXMpKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRhdGEgPSBtb2RlbC50b0pTT04oe1xyXG4gICAgICAgICAgYXR0cnM6IGNoYW5nZXNcclxuICAgICAgICB9KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ2RlbGV0ZSc6XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0ICgoKSA9PiBtZXRob2QgPT09ICdyZWFkJywgJ3Vua25vd24gbWV0aG9kOiAnICsgbWV0aG9kKTtcclxuICAgICAgICBzdG9yZU1zZyA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgbGV0IGVudGl0eSA9IG1vZGVsLmVudGl0eSB8fCBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC5lbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSk7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbnRpdHkuaW5kZXhPZignficpIDwgMCwgJ2VudGl0eSBuYW1lIG11c3Qgbm90IGNvbnRhaW4gYSB+IGNoYXJhY3RlciEnKTtcclxuICAgIHZhciBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IHtcclxuICAgICAgX2lkOiBlbnRpdHkgKyAnficgKyAoPE1vZGVsPm1vZGVsKS5pZCxcclxuICAgICAgaWQ6ICg8TW9kZWw+bW9kZWwpLmlkLFxyXG4gICAgICBtZXRob2Q6IG1ldGhvZCxcclxuICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgLy8gY2hhbm5lbDogZW5kcG9pbnQuY2hhbm5lbCwgLy8gY2hhbm5lbCBpcyBoYWNrZWQgaW4gYnkgc3RvcmVNZXNzYWdlKCksIHdlIGRvbid0IHdhbnQgdG8gdXNlIHRoaXMgYW55bW9yZVxyXG4gICAgICBwcmlvcml0eTogZW5kcG9pbnQucHJpb3JpdHksXHJcbiAgICAgIHRpbWU6IERhdGUubm93KClcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHEgPSBRLnJlc29sdmUobXNnKTtcclxuICAgIHZhciBxTWVzc2FnZTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPjtcclxuICAgIGlmIChzdG9yZU1zZykge1xyXG4gICAgICAvLyBzdG9yZSBhbmQgcG90ZW50aWFsbHkgbWVyZ2UgbWVzc2FnZVxyXG4gICAgICBxTWVzc2FnZSA9IHRoaXMuc3RvcmVNZXNzYWdlKGVuZHBvaW50LCBxKTtcclxuICAgICAgcSA9IHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XHJcbiAgICAgICAgLy8gaW4gY2FzZSBvZiBtZXJnaW5nLCB0aGlzIHJlc3VsdCBjb3VsZCBiZSBkaWZmZXJlbnRcclxuICAgICAgICByZXR1cm4gbWVzc2FnZS5hdHRyaWJ1dGVzO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBxLnRoZW4oKG1zZzI6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xyXG4gICAgICAvLyBwYXNzIGluIHFNZXNzYWdlIHNvIHRoYXQgZGVsZXRpb24gb2Ygc3RvcmVkIG1lc3NhZ2UgY2FuIGJlIHNjaGVkdWxlZFxyXG4gICAgICByZXR1cm4gdGhpcy5fZW1pdE1lc3NhZ2UoZW5kcG9pbnQsIG1zZzIsIG9wdGlvbnMsIG1vZGVsLCBxTWVzc2FnZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2VtaXRNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOlxyXG4gIFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcclxuICAgIHZhciBxQWpheCA9IHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcclxuICAgIHZhciBxID0gcUFqYXg7XHJcblxyXG4gICAgaWYgKHFNZXNzYWdlKSB7XHJcbiAgICAgIC8vIGZvbGxvd2luZyB0YWtlcyBjYXJlIG9mIG9mZmxpbmUgY2hhbmdlIHN0b3JlXHJcbiAgICAgIHEgPSBxLnRoZW4oKGRhdGEpID0+IHtcclxuICAgICAgICAvLyBzdWNjZXNzLCByZW1vdmUgbWVzc2FnZSBzdG9yZWQsIGlmIGFueVxyXG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcU1lc3NhZ2UpLmNhdGNoKChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXHJcbiAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9KS50aGVuUmVzb2x2ZShkYXRhKTsgLy8gcmVzb2x2ZSBhZ2FpbiB5aWVsZGluZyBkYXRhXHJcbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAvLyBmYWlsdXJlIGV2ZW50dWFsbHkgY2F1Z2h0IGJ5IG9mZmxpbmUgY2hhbmdlc1xyXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgdGhpcy51c2VPZmZsaW5lQ2hhbmdlcykge1xyXG4gICAgICAgICAgLy8gdGhpcyBzZWFtcyB0byBiZSBvbmx5IGEgY29ubmVjdGlvbiBwcm9ibGVtLCBzbyB3ZSBrZWVwIHRoZSBtZXNzYWdlIGFuZCBjYWxsIHN1Y2Nlc3NcclxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLmRhdGEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyByZW1vdmUgbWVzc2FnZSBzdG9yZWQgYW5kIGtlZXAgcmVqZWN0aW9uIGFzIGlzXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXHJcbiAgICAgICAgICAgIHJldHVybiB4aHI7XHJcbiAgICAgICAgICB9KS50aGVuUmVqZWN0KHhocik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBxID0gdGhpcy5fYXBwbHlSZXNwb25zZShxLCBlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XHJcblxyXG4gICAgcmV0dXJuIHEuZmluYWxseSgoKSA9PiB7XHJcbiAgICAgIC8vIGRvIHNvbWUgY29ubmVjdGlvbiBoYW5kbGluZ1xyXG4gICAgICByZXR1cm4gcUFqYXgudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZWNvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcclxuICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxyXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfYWpheE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICBkZWxldGUgb3B0aW9ucy54aHI7IC8vIG1ha2Ugc3VyZSBub3QgdG8gdXNlIG9sZCB2YWx1ZVxyXG5cclxuICAgIHZhciB1cmwgPSBvcHRpb25zLnVybDtcclxuICAgIGlmICghdXJsKSB7XHJcbiAgICAgIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XHJcbiAgICAgIGlmIChtc2cuaWQgJiYgbXNnLm1ldGhvZCAhPT0gJ2NyZWF0ZScpIHtcclxuICAgICAgICAvLyBhZGQgSUQgb2YgbW9kZWxcclxuICAgICAgICB1cmwgKz0gKHVybC5jaGFyQXQodXJsLmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbXNnLmlkO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xyXG4gICAgICAgIC8vIGFkZCBxdWVyeSBvZiBjb2xsZWN0aW9uXHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25VcmwgPSBfLmlzRnVuY3Rpb24obW9kZWwudXJsKSA/IG1vZGVsLnVybCgpIDogbW9kZWwudXJsO1xyXG4gICAgICAgIHZhciBxdWVyeUluZGV4ID0gY29sbGVjdGlvblVybC5sYXN0SW5kZXhPZignPycpO1xyXG4gICAgICAgIHZhciBnZXRRdWVyeSA9IG5ldyBHZXRRdWVyeSgpLmZyb21KU09OKG9wdGlvbnMpO1xyXG4gICAgICAgIC8vIGN1cnJlbnRseSBvbmx5IHNvcnRPcmRlciBjYW4gYmUgc3VwcG9ydGVkIGFzIHdlIHJlcXVpcmUgdGhlIGluaXRpYWwgZGF0YSBsb2FkIHRvIHlpZWxkIGZ1bGwgZGF0YXNldFxyXG4gICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gbnVsbDtcclxuICAgICAgICBnZXRRdWVyeS5vZmZzZXQgPSBudWxsO1xyXG4gICAgICAgIGdldFF1ZXJ5LmZpbHRlciA9IG51bGw7XHJcbiAgICAgICAgZ2V0UXVlcnkuZmllbGRzID0gbnVsbDtcclxuICAgICAgICB2YXIgZ2V0UGFyYW1zID0gZ2V0UXVlcnkudG9RdWVyeVBhcmFtcygpO1xyXG4gICAgICAgIGlmIChxdWVyeUluZGV4ID49IDApIHtcclxuICAgICAgICAgIHVybCArPSBjb2xsZWN0aW9uVXJsLnN1YnN0cihxdWVyeUluZGV4KTtcclxuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcclxuICAgICAgICAgICAgdXJsICs9ICcmJyArIGdldFBhcmFtcztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYgKGdldFBhcmFtcykge1xyXG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgZ2V0UGFyYW1zO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGVhcmxpZXN0IHBvaW50IHdoZXJlIHRhcmdldCBVUkwgaXMga25vd25cclxuICAgIGRpYWcuZGVidWcuZGVidWcoJ2FqYXhNZXNzYWdlICcgKyBtc2cubWV0aG9kICsgJyAnICsgdXJsKTtcclxuICAgIHZhciBvcHRzOiBhbnkgPSB7XHJcbiAgICAgIC8vIG11c3Qgbm90IHRha2UgYXJiaXRyYXJ5IG9wdGlvbnMgYXMgdGhlc2Ugd29uJ3QgYmUgcmVwbGF5ZWQgb24gcmVjb25uZWN0XHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICBhdHRyczogbXNnLmRhdGEsXHJcbiAgICAgIHN0b3JlOiB7fSwgLy8gZW5zdXJlcyBuZXR3b3JrIGlzIHVzZWRcclxuICAgICAgY3JlZGVudGlhbHM6IG9wdGlvbnMuY3JlZGVudGlhbHMsXHJcbiAgICAgIC8vIGVycm9yIHByb3BhZ2F0aW9uXHJcbiAgICAgIGVycm9yOiBvcHRpb25zLmVycm9yXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCB3cm9uZyBzZXJ2ZXIgYW5kIHVzZXIgaWRlbnRpdHlcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHdlYi5yZXNvbHZlU2VydmVyKHVybCwge1xyXG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXHJcbiAgICB9KSA9PT0gdGhpcy5zZXJ2ZXJVcmwpO1xyXG4gICAgaWYgKHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZSh0aGlzLnNlcnZlclVybCkuYXV0aG9yaXphdGlvbi5uYW1lICE9PSB0aGlzLnVzZXJVdWlkKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcclxuICAgICAgY29uc3QgZXJyb3I6IHdlYi5IdHRwRXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcclxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0cywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhY3R1YWwgYWpheCByZXF1ZXN0IHZpYSBiYWNrYm9uZS5qc1xyXG4gICAgcmV0dXJuIHRoaXMuY2hlY2tTZXJ2ZXIodXJsLCBvcHRzKS50aGVuKCgpID0+IHtcclxuICAgICAgcmV0dXJuIG1vZGVsLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIG9wdHMpLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICAgIC8vIHRha2Ugb3ZlciB4aHIgcmVzb2x2aW5nIHRoZSBvcHRpb25zIGNvcHlcclxuICAgICAgICBvcHRpb25zLnhociA9IG9wdHMueGhyLnhociB8fCBvcHRzLnhocjtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2FwcGx5UmVzcG9uc2U8VD4ocVhIUjogUS5Qcm9taXNlPFQ+LCBlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IGFueSwgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxUPiB7XHJcbiAgICAvLyB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICB2YXIgY2xpZW50VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgcmV0dXJuIHFYSFIudGhlbigoZGF0YTogVCB8IGFueSkgPT4ge1xyXG4gICAgICAvLyBkZWxldGUgb24gc2VydmVyIGRvZXMgbm90IHJlc3BvbmQgYSBib2R5XHJcbiAgICAgIGlmICghZGF0YSAmJiBtc2cubWV0aG9kID09PSAnZGVsZXRlJykge1xyXG4gICAgICAgIGRhdGEgPSBtc2cuZGF0YTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gdXBkYXRlIGxvY2FsIHN0b3JlIHN0YXRlXHJcbiAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgLy8gbm8gZGF0YSBpZiBzZXJ2ZXIgYXNrcyBub3QgdG8gYWx0ZXIgc3RhdGVcclxuICAgICAgICAvLyB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCBtc2cudGltZSk7XHJcbiAgICAgICAgdmFyIHByb21pc2VzOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPltdID0gW107XHJcbiAgICAgICAgdmFyIGRhdGFJZHM6IGFueTsgLy8gbW9kZWwgaWQgLT4gYXR0cmlidXRlcyBkYXRhXHJcbiAgICAgICAgaWYgKG1zZy5tZXRob2QgIT09ICdyZWFkJykge1xyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgZGF0YSA9PT0gbXNnLmRhdGEgPyBtc2cgOiA8TGl2ZURhdGFNZXNzYWdlPl8uZGVmYXVsdHMoe1xyXG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIGp1c3QgYWNjZXB0cyBuZXcgZGF0YVxyXG4gICAgICAgICAgfSwgbXNnKSkpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgLy8gc3luY2hyb25pemUgdGhlIGNvbGxlY3Rpb24gY29udGVudHMgd2l0aCB0aGUgZGF0YSByZWFkXHJcbiAgICAgICAgICB2YXIgc3luY0lkcyA9IHt9O1xyXG4gICAgICAgICAgbW9kZWwubW9kZWxzLmZvckVhY2goKG0pID0+IHtcclxuICAgICAgICAgICAgc3luY0lkc1ttLmlkXSA9IG07XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGRhdGFJZHMgPSB7fTtcclxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChkKSB7XHJcbiAgICAgICAgICAgICAgdmFyIGlkID0gZFtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkLl9pZDtcclxuICAgICAgICAgICAgICBkYXRhSWRzW2lkXSA9IGQ7XHJcbiAgICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcclxuICAgICAgICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBpdGVtXHJcbiAgICAgICAgICAgICAgICBkZWxldGUgc3luY0lkc1tpZF07IC8vIHNvIHRoYXQgaXQgaXMgZGVsZXRlZCBiZWxvd1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzRXF1YWwoXy5waWNrLmNhbGwobSwgbS5hdHRyaWJ1dGVzLCBPYmplY3Qua2V5cyhkKSksIGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGFib3ZlIGNoZWNrZWQgdGhhdCBhbGwgYXR0cmlidXRlcyBpbiBkIGFyZSBpbiBtIHdpdGggZXF1YWwgdmFsdWVzIGFuZCBmb3VuZCBzb21lIG1pc21hdGNoXHJcbiAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAndXBkYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkXHJcbiAgICAgICAgICAgICAgICAgIH0pKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgaXRlbVxyXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xyXG4gICAgICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxyXG4gICAgICAgICAgICAgICAgICBkYXRhOiBkXHJcbiAgICAgICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBPYmplY3Qua2V5cyhzeW5jSWRzKS5mb3JFYWNoKChpZCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBkZWxldGUgdGhlIGl0ZW1cclxuICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcclxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xyXG4gICAgICAgICAgICAgIGlkOiBpZCxcclxuICAgICAgICAgICAgICBtZXRob2Q6ICdkZWxldGUnLFxyXG4gICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxyXG4gICAgICAgICAgICAgIGRhdGE6IG0uYXR0cmlidXRlc1xyXG4gICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIHRyaWdnZXIgYW4gdXBkYXRlIHRvIGxvYWQgdGhlIGRhdGEgcmVhZFxyXG4gICAgICAgICAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbZGF0YV07XHJcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSBhcnJheVtpXTtcclxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XHJcbiAgICAgICAgICAgICAgICBpZDogZGF0YVtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkYXRhLl9pZCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXHJcbiAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBRLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAvLyBkZWxheWVkIHRpbGwgb3BlcmF0aW9ucyBjb21wbGV0ZVxyXG4gICAgICAgICAgaWYgKCFkYXRhSWRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKG1vZGVsKSk7XHJcblxyXG4gICAgICAgICAgLy8gd2hlbiBjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIG9ubHkgcGFzcyBkYXRhIG9mIG1vZGVscyB0aGF0IHdlcmUgc3luY2VkIG9uIHRvIHRoZSBzdWNjZXNzIGNhbGxiYWNrLFxyXG4gICAgICAgICAgLy8gYXMgdGhlIGNhbGxiYWNrIHdpbGwgc2V0IHRoZSBtb2RlbHMgYWdhaW4gY2F1c2luZyBvdXIgc29ydGluZyBhbmQgZmlsdGVyaW5nIHRvIGJlIHdpdGhvdXQgZWZmZWN0LlxyXG4gICAgICAgICAgdmFyIHJlc3BvbnNlOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgbGV0IG1vZGVscyA9IGlzQ29sbGVjdGlvbihtb2RlbCkgPyBtb2RlbC5tb2RlbHMgOiBbbW9kZWxdO1xyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IG1vZGVscy5sZW5ndGg7IGktLSA+IDA7ICkge1xyXG4gICAgICAgICAgICB2YXIgbSA9IG1vZGVsc1tpXTtcclxuICAgICAgICAgICAgaWYgKGRhdGFJZHNbbS5pZF0pIHtcclxuICAgICAgICAgICAgICByZXNwb25zZS5wdXNoKG0uYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIGRhdGFJZHNbbS5pZF07XHJcbiAgICAgICAgICAgICAgaWYgKGRhdGFJZHMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJldmVyc2UoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgaWYgKG1zZy5tZXRob2QgPT09ICdyZWFkJyAmJiBpc0NvbGxlY3Rpb24obW9kZWwpKSB7XHJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCBEYXRlIGhlYWRlciBmcm9tIG9wdGlvbnMueGhyIGluc3RlYWQgb2YgdXNpbmcgY2xpZW50VGltZVxyXG4gICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsIGNsaWVudFRpbWUpO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIGludm9rZSBzdWNjZXNzIGNhbGxiYWNrLCBpZiBhbnlcclxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXNwb25zZSkgfHwgcmVzcG9uc2U7XHJcbiAgICB9LCAoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcclxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBmZXRjaENoYW5nZXMoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgZm9yY2UgPSBmYWxzZSk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XHJcbiAgICBsZXQgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICBpZiAoIWVuZHBvaW50LnVybFJvb3QgfHwgIWNoYW5uZWwpIHtcclxuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgbGV0IHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzO1xyXG4gICAgaWYgKHByb21pc2UgJiYgIWZvcmNlKSB7XHJcbiAgICAgIGlmIChwcm9taXNlLmlzUGVuZGluZygpIHx8IG5vdyAtIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlcyA8IDEwMDApIHtcclxuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGNoYW5uZWwgKyAnIHNraXBwaW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHRpbWUgPSB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcclxuICAgIGlmICghdGltZSkge1xyXG4gICAgICBkaWFnLmRlYnVnLmVycm9yKGNoYW5uZWwgKyAnIGNhbiBub3QgZmV0Y2ggY2hhbmdlcyBhdCB0aGlzIHRpbWUhJyk7XHJcbiAgICAgIHJldHVybiBwcm9taXNlIHx8IFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGluaXRpYXRlIGEgbmV3IHJlcXVlc3QgZm9yIGNoYW5nZXNcclxuICAgIGRpYWcuZGVidWcuaW5mbyhjaGFubmVsICsgJyBpbml0aWF0aW5nIGNoYW5nZXMgcmVxdWVzdC4uLicpO1xyXG4gICAgbGV0IGNoYW5nZXM6IENvbGxlY3Rpb24gPSBuZXcgKDxhbnk+dGhpcy5tZXNzYWdlcykuY29uc3RydWN0b3IoKTtcclxuICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKGVuZHBvaW50LnVybFJvb3QgKyAnY2hhbmdlcy8nICsgdGltZSkudGhlbigodXJsKSA9PiB7XHJcbiAgICAgIHJldHVybiBRKGNoYW5nZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xyXG4gICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgIHN0b3JlOiB7fSwgLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcclxuXHJcbiAgICAgICAgc3VjY2VzczogKG1vZGVsLCByZXNwb25zZSwgb3B0aW9ucykgPT4ge1xyXG4gICAgICAgICAgaWYgKGNoYW5nZXMubW9kZWxzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY2hhbmdlcy5lYWNoKChjaGFuZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XHJcbiAgICAgICAgICAgICAgbGV0IG1zZzogTGl2ZURhdGFNZXNzYWdlID0gY2hhbmdlLmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGZvbGxvd2luZyBzaG91bGQgdXNlIHNlcnZlciB0aW1lIVxyXG4gICAgICAgICAgICB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCBub3cpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG9wdGlvbnMueGhyO1xyXG4gICAgICAgIH1cclxuICAgICAgfSkpLnRoZW5SZXNvbHZlKGNoYW5nZXMpO1xyXG4gICAgfSk7XHJcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzID0gcHJvbWlzZTtcclxuICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlcyA9IG5vdztcclxuICAgIHJldHVybiBwcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBmZXRjaFNlcnZlckluZm8oZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxNb2RlbD4ge1xyXG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XHJcbiAgICB2YXIgcHJvbWlzZSA9IGVuZHBvaW50LnByb21pc2VGZXRjaGluZ1NlcnZlckluZm87XHJcbiAgICBpZiAocHJvbWlzZSkge1xyXG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPCAxMDAwKSB7XHJcbiAgICAgICAgLy8gcmV1c2UgZXhpc3RpbmcgZXZlbnR1YWxseSBjb21wbGV0ZWQgcmVxdWVzdCBmb3IgY2hhbmdlc1xyXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhlbmRwb2ludC5jaGFubmVsICsgJyBza2lwcGluZyBpbmZvIHJlcXVlc3QuLi4nKTtcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHZhciBpbmZvID0gbmV3IE1vZGVsKCk7XHJcbiAgICB2YXIgdGltZSA9IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwpO1xyXG4gICAgdmFyIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XHJcbiAgICBpZiAodXJsLmNoYXJBdCgodXJsLmxlbmd0aCAtIDEpKSAhPT0gJy8nKSB7XHJcbiAgICAgIHVybCArPSAnLyc7XHJcbiAgICB9XHJcbiAgICBwcm9taXNlID0gdGhpcy5jaGVja1NlcnZlcih1cmwgKyAnaW5mbycpLnRoZW4oKHVybCkgPT4ge1xyXG4gICAgICByZXR1cm4gUShpbmZvLmZldGNoKDxCYWNrYm9uZS5Nb2RlbEZldGNoT3B0aW9ucz4oe1xyXG4gICAgICAgIHVybDogdXJsLFxyXG4gICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcclxuICAgICAgICAgIC8vIEB0b2RvIHdoeSB3ZSBzZXQgYSBzZXJ2ZXIgdGltZSBoZXJlID9cclxuICAgICAgICAgIGlmICghdGltZSAmJiBpbmZvLmdldCgndGltZScpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGVuZHBvaW50LmNoYW5uZWwsIGluZm8uZ2V0KCd0aW1lJykpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5zb2NrZXRQYXRoICYmIGluZm8uZ2V0KCdzb2NrZXRQYXRoJykpIHtcclxuICAgICAgICAgICAgZW5kcG9pbnQuc29ja2V0UGF0aCA9IGluZm8uZ2V0KCdzb2NrZXRQYXRoJyk7XHJcbiAgICAgICAgICAgIHZhciBuYW1lID0gaW5mby5nZXQoJ2VudGl0eScpIHx8IGVuZHBvaW50LmVudGl0eTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5KSB7XHJcbiAgICAgICAgICAgICAgZW5kcG9pbnQuc29ja2V0ID0gdGhpcy5jcmVhdGVTb2NrZXQoZW5kcG9pbnQsIG5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KSkpLnRoZW5SZXNvbHZlKGluZm8pO1xyXG4gICAgfSk7XHJcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvID0gcHJvbWlzZTtcclxuICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA9IG5vdztcclxuICAgIHJldHVybiBwcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsbGVkIHdoZW4gYW4gb2ZmbGluZSBjaGFuZ2Ugd2FzIHNlbnQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXHJcbiAgICpcclxuICAgKiA8cD5cclxuICAgKiBNYXkgYmUgb3ZlcndyaXR0ZW4gdG8gYWx0ZXIgY2hhbmdlIG1lc3NhZ2UgZXJyb3IgaGFuZGxpbmcgYmVoYXZpb3IuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIHdpbGwgYXR0ZW1wdFxyXG4gICAqIHJlbG9hZGluZyB0aGUgc2VydmVyIGRhdGEgZm9yIHJlc3RvcmluZyB0aGUgY2xpZW50IHN0YXRlIHN1Y2ggdGhhdCBpdCByZWZsZWN0cyB0aGUgc2VydmVyIHN0YXRlLiBXaGVuIHRoaXNcclxuICAgKiBzdWNjZWVkZWQsIHRoZSBvZmZsaW5lIGNoYW5nZSBpcyBlZmZlY3RpdmVseSByZXZlcnRlZCBhbmQgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGRyb3BwZWQuXHJcbiAgICogPC9wPlxyXG4gICAqIDxwPlxyXG4gICAqIEFuIG92ZXJ3cml0dGVuIGltcGxlbWVudGF0aW9uIG1heSBkZWNpZGVkIHdoZXRoZXIgdG8gcmV2ZXJ0IGZhaWxlZCBjaGFuZ2VzIGJhc2VkIG9uIHRoZSBlcnJvciByZXBvcnRlZC5cclxuICAgKiA8L3A+XHJcbiAgICogPHA+XHJcbiAgICogTm90aWNlLCB0aGUgbWV0aG9kIGlzIG5vdCBjYWxsZWQgd2hlbiB0aGUgb2ZmbGluZSBjaGFuZ2UgZmFpbGVkIGR1ZSB0byBhIGNvbm5lY3Rpdml0eSBpc3N1ZS5cclxuICAgKiA8L3A+XHJcbiAgICpcclxuICAgKiBAcGFyYW0gZXJyb3IgcmVwb3J0ZWQgYnkgcmVtb3RlIHNlcnZlci5cclxuICAgKiBAcGFyYW0gbWVzc2FnZSBjaGFuZ2UgcmVwb3J0ZWQsIGF0dHJpYnV0ZXMgb2YgdHlwZSBMaXZlRGF0YU1lc3NhZ2UuXHJcbiAgICogQHBhcmFtIG9wdGlvbnMgY29udGV4dCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byBhY2Nlc3MgdGhlIGRhdGEgbG9jYWxseSBhcyB3ZWxsIGFzIHJlbW90ZWx5LlxyXG4gICAqIEByZXR1cm4ge2FueX0gUHJvbWlzZSBpbmRpY2F0aW5nIHN1Y2Nlc3MgdG8gZHJvcCB0aGUgY2hhbmdlIG1lc3NhZ2UgYW5kIHByb2NlZWQgd2l0aCB0aGUgbmV4dCBjaGFuZ2UsIG9yXHJcbiAgICogICAgcmVqZWN0aW9uIGluZGljYXRpbmcgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGtlcHQgYW5kIHJldHJpZWQgbGF0ZXIgb24uXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChlcnJvcjogRXJyb3IsIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsLCBvcHRpb25zOiB7XHJcbiAgICBlbnRpdHk6IHN0cmluZyxcclxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxyXG4gICAgdXJsUm9vdDogc3RyaW5nLFxyXG4gICAgbG9jYWxTdG9yZTogU3RvcmUsXHJcbiAgICBzaWxlbnQ/OiBib29sZWFuXHJcbiAgfSk6IFByb21pc2VMaWtlPHZvaWQgfCBhbnk+IHtcclxuICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgLy8gbWVzc2FnZSB3YXMgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseVxyXG4gICAgICBpZiAoIXRoaXMudXNlU29ja2V0Tm90aWZ5KSB7XHJcbiAgICAgICAgLy8gd2hlbiBub3QgdXNpbmcgc29ja2V0cywgZmV0Y2ggY2hhbmdlcyBub3dcclxuICAgICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tvcHRpb25zLmVudGl0eV07XHJcbiAgICAgICAgaWYgKGVuZHBvaW50KSB7XHJcbiAgICAgICAgICAvLyB3aWxsIHB1bGwgdGhlIGNoYW5nZSBjYXVzZWQgYnkgdGhlIG9mZmxpbmUgbWVzc2FnZSBhbmQgdXBkYXRlIHRoZSBtZXNzYWdlIHRpbWUsXHJcbiAgICAgICAgICAvLyBzbyB0aGF0IHdlIGF2b2lkIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlIGNoYW5nZSBjYXVzZWQgYnkgcmVwbGF5aW5nIHRoZSBvZmZsaW5lXHJcbiAgICAgICAgICAvLyBjaGFuZ2UgcmVzdWx0cyBpbiBhIGNvbmZsaWN0IGxhdGVyIG9uLi4uXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1lc3NhZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGZhaWxlZCwgZXZlbnR1YWxseSB1bmRvIHRoZSBtb2RpZmljYXRpb25zIHN0b3JlZFxyXG4gICAgaWYgKCFvcHRpb25zLmxvY2FsU3RvcmUpIHtcclxuICAgICAgcmV0dXJuIFEucmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZXZlcnQgbW9kaWZpY2F0aW9uIGJ5IHJlbG9hZGluZyBkYXRhXHJcbiAgICBsZXQgbW9kZWxUeXBlID0gb3B0aW9ucy5tb2RlbFR5cGUgfHwgTW9kZWw7XHJcbiAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1lc3NhZ2UuZ2V0KCdkYXRhJyksIHtcclxuICAgICAgZW50aXR5OiBvcHRpb25zLmVudGl0eVxyXG4gICAgfSk7XHJcbiAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XHJcbiAgICBsZXQgdHJpZ2dlckVycm9yID0gKCkgPT4ge1xyXG4gICAgICAvLyBpbmZvcm0gY2xpZW50IGFwcGxpY2F0aW9uIG9mIHRoZSBvZmZsaW5lIGNoYW5nZXMgZXJyb3JcclxuICAgICAgbGV0IGNoYW5uZWwgPSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpO1xyXG4gICAgICBkaWFnLmRlYnVnLmVycm9yKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUucHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0OiB0cmlnZ2VyaW5nIGVycm9yIGZvciBjaGFubmVsICcgKyBjaGFubmVsICsgJyBvbiBzdG9yZScsIGVycm9yKTtcclxuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBsZXQgbG9jYWxPcHRpb25zID0ge1xyXG4gICAgICAvLyBqdXN0IGFmZmVjdCBsb2NhbCBzdG9yZVxyXG4gICAgICBzdG9yZTogb3B0aW9ucy5sb2NhbFN0b3JlXHJcbiAgICB9O1xyXG4gICAgbGV0IHJlbW90ZU9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgdXJsUm9vdDogb3B0aW9ucy51cmxSb290LFxyXG4gICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcclxuICAgIH07XHJcbiAgICBpZiAobW9kZWwuaWQpIHtcclxuICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcclxuICAgICAgLy8gZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwudXJsKCkgPT09IHJlbW90ZU9wdGlvbnMudXJsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGNyZWF0aW9uIGZhaWxlZCwganVzdCBkZWxldGUgbG9jYWxseVxyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtZXNzYWdlLmdldCgnbWV0aG9kJykgPT09ICdjcmVhdGUnKTtcclxuICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gKDxRLlByb21pc2U8YW55Pj48YW55Pm1vZGVsLmZldGNoKHJlbW90ZU9wdGlvbnMpKS50aGVuKChkYXRhKSA9PiB7XHJcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSByZWxvYWRlZCB0aGUgZGF0YSB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMsIHdoaWNoIHN1Y2NlZWRlZC4uLlxyXG4gICAgICByZXR1cm4gbW9kZWwuc2F2ZShkYXRhLCBsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcclxuICAgIH0sIChmZXRjaFJlc3A6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHRyaWVkIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucyBieSByZWxvYWRpbmcgdGhlIGRhdGEsIHdoaWNoIGZhaWxlZCBhcyB3ZWxsLi4uXHJcbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBmZXRjaFJlc3AgJiYgZmV0Y2hSZXNwLnN0YXR1c0NvZGU7XHJcbiAgICAgIHN3aXRjaCAoc3RhdHVzQ29kZSkge1xyXG4gICAgICAgIGNhc2UgNDA0OiAvLyBOT1QgRk9VTkRcclxuICAgICAgICBjYXNlIDQwMTogLy8gVU5BVVRIT1JJWkVEXHJcbiAgICAgICAgY2FzZSA0MTA6IC8vIEdPTkUqXHJcbiAgICAgICAgICAvLyAuLi5iZWNhdXNlIHRoZSBpdGVtIGlzIGdvbmUgYnkgbm93LCBtYXliZSBzb21lb25lIGVsc2UgY2hhbmdlZCBpdCB0byBiZSBkZWxldGVkXHJcbiAgICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpOyAvLyBzaWxlbnQgcmVnYXJkaW5nIHRyaWdnZXJFcnJvclxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZmV0Y2hSZXNwKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogZmVlZHMgcGVuZGluZyBvZmZsaW5lICNtZXNzYWdlcyB0byB0aGUgcmVtb3RlIHNlcnZlci5cclxuICAgKlxyXG4gICAqIDxwPlxyXG4gICAqIER1ZSB0byBjbGllbnQgY29kZSBzZXR0aW5nIHVwIG1vZGVscyBvbmUgYXQgYSB0aW1lLCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGluaXRpYWwgc2V0dXAgb2ZcclxuICAgKiAjZW5kcG9pbnRzLiBUaGUgZmlyc3QgY2FsbCBmZXRjaGVzIHBlbmRpbmcgb2ZmbGluZSAjbWVzc2FnZXMsIG9yZGVyZWQgYnkgcHJpb3JpdHkgYW5kIHRpbWUuIFRoZW4gdGhlICNtZXNzYWdlc1xyXG4gICAqIGFyZSBzZW5kIHRvIHRoZSByZW1vdGUgc2VydmVyIHVudGlsIGRlcGxldGVkLCBhbiBlcnJvciBvY2N1cnMsIG9yIHNvbWUgbWlzc2luZyBlbmRwb2ludCBpcyBlbmNvdW50ZWQuXHJcbiAgICogPC9wPlxyXG4gICAqIDxwPlxyXG4gICAqIFRoZSBtZXRob2QgaXMgdHJpZ2dlcmVkIGVhY2ggdGltZSBhbiBlbmRwb2ludCBpcyByZWdpc3RlcmVkLCBvciBzdGF0ZSBjaGFuZ2VzIHRvIG9ubGluZSBmb3IgYW55IGVuZHBvaW50LiBXaGVuXHJcbiAgICogc3RhdGUgY2hhbmdlcyBmcm9tIG9mZmxpbmUgdG8gb25saW5lIChkaXNyZWdhcmRpbmcgZW5kcG9pbnQpIG1lc3NhZ2Ugc3VibWlzc2lvbiBpcyByZXN0YXJ0ZWQgYnkgcmVzZXR0aW5nIHRoZVxyXG4gICAqICNtZXNzYWdlc1Byb21pc2UuIE90aGVyd2lzZSwgc3Vic2VxdWVudCBjYWxscyBjaGFpbiB0byB0aGUgZW5kIG9mICNtZXNzYWdlc1Byb21pc2UuXHJcbiAgICogPC9wPlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZX0gb2YgI21lc3NhZ2VzIENvbGxlY3Rpb24sIG9yIGxhc3QgcmVjZW50IG9mZmxpbmUgcmVqZWN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBwcml2YXRlIF9zZW5kTWVzc2FnZXMoKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcclxuICAgIC8vIG5vdCByZWFkeSB5ZXRcclxuICAgIGlmICghdGhpcy5tZXNzYWdlcykge1xyXG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJvY2Vzc2VzIG1lc3NhZ2VzIHVudGlsIG5vbmUgbGVmdCwgaGl0dGluZyBhIG1lc3NhZ2Ugb2YgYSBub3QgeWV0IHJlZ2lzdGVyZWQgZW5kcG9pbnQsIG9yIGVudGVyaW5nXHJcbiAgICAvLyBhIG5vbi1yZWNvdmVyYWJsZSBlcnJvci4gVGhlIHByb21pc2UgcmV0dXJuZWQgcmVzb2x2ZXMgdG8gdGhpcy5tZXNzYWdlcyB3aGVuIGRvbmUuXHJcbiAgICBsZXQgbmV4dE1lc3NhZ2UgPSAoKTogYW55ID0+IHtcclxuICAgICAgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgbWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsc1swXTtcclxuICAgICAgbGV0IGVudGl0eSA9IG1lc3NhZ2UuaWQuc3Vic3RyKDAsIG1lc3NhZ2UuaWQuaW5kZXhPZignficpKTtcclxuICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdzZW5kTWVzc2FnZSAnICsgbWVzc2FnZS5pZCArICcgd2l0aCBubyBlbnRpdHkhJyk7XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpLnRoZW4obmV4dE1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW2VudGl0eV07XHJcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcclxuICAgICAgfVxyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC5jaGFubmVsID09PSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpLCAnY2hhbm5lbCBvZiBlbmRwb2ludCAnICsgZW5kcG9pbnQuY2hhbm5lbCArICcgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCBvZiBtZXNzYWdlICcgKyBtZXNzYWdlLmdldCgnY2hhbm5lbCcpKTtcclxuICAgICAgbGV0IG1zZyA9IHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1lc3NhZ2UuYXR0cmlidXRlcyk7XHJcblxyXG4gICAgICBsZXQgbW9kZWxUeXBlID0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IE1vZGVsO1xyXG4gICAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1zZy5kYXRhLCB7XHJcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHlcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGVsLmlkID0gbWVzc2FnZS5nZXQoJ21ldGhvZCcpICE9PSAnY3JlYXRlJyAmJiBtZXNzYWdlLmdldCgnaWQnKTtcclxuICAgICAgbGV0IHJlbW90ZU9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxyXG4gICAgICAgIHN0b3JlOiB7fSAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxyXG4gICAgICB9O1xyXG4gICAgICBpZiAobW9kZWwuaWQpIHtcclxuICAgICAgICByZW1vdGVPcHRpb25zLnVybCA9IHJlbW90ZU9wdGlvbnMudXJsUm9vdCArIChyZW1vdGVPcHRpb25zLnVybFJvb3QuY2hhckF0KHJlbW90ZU9wdGlvbnMudXJsUm9vdC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1vZGVsLmlkO1xyXG4gICAgICAgIC8vIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLnVybCgpID09PSByZW1vdGVPcHRpb25zLnVybCk7XHJcbiAgICAgIH1cclxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZW5kTWVzc2FnZSAnICsgbW9kZWwuaWQpO1xyXG4gICAgICBsZXQgb2ZmbGluZU9wdGlvbnMgPSB7XHJcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHksXHJcbiAgICAgICAgbW9kZWxUeXBlOiBlbmRwb2ludC5tb2RlbFR5cGUsXHJcbiAgICAgICAgdXJsUm9vdDogZW5kcG9pbnQudXJsUm9vdCxcclxuICAgICAgICBsb2NhbFN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiB0aGlzLl9hcHBseVJlc3BvbnNlKHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIHJlbW90ZU9wdGlvbnMsIG1vZGVsKSwgZW5kcG9pbnQsIG1zZywgcmVtb3RlT3B0aW9ucywgbW9kZWwpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIC8vIHN1Y2NlZWRlZFxyXG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChudWxsLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucyk7XHJcbiAgICAgIH0sIChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvci5zdGF0dXNDb2RlKSB7XHJcbiAgICAgICAgICAvLyByZW1vdGUgZmFpbGVkXHJcbiAgICAgICAgICByZXR1cm4gUSh0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChlcnJvciwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpKS5jYXRjaCgoZXJyb3IyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZGlzY29ubmVjdCBkdWUgdG8gZXJyb3IgaW4gZW5kcG9pbnRcclxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCkudGhlblJlamVjdChlcnJvcjIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGNvbm5lY3Rpdml0eSBpc3N1ZSwga2VlcCByZWplY3Rpb25cclxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBhcHBseWluZyBjaGFuZ2Ugc3VjY2VlZGVkIG9yIHN1Y2Nlc3NmdWxseSByZWNvdmVyZWQgY2hhbmdlXHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpO1xyXG4gICAgICB9KS50aGVuKG5leHRNZXNzYWdlKTtcclxuICAgIH07XHJcblxyXG4gICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuX3NlbmRNZXNzYWdlcycpO1xyXG4gICAgbGV0IHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcclxuICAgIGlmICghcSkge1xyXG4gICAgICAvLyBpbml0aWFsbHkgZmV0Y2ggYWxsIG1lc3NhZ2VzXHJcbiAgICAgIHEgPSBRKHRoaXMubWVzc2FnZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xyXG4gICAgICAgIHNvcnRPcmRlcjogW1xyXG4gICAgICAgICAgJytwcmlvcml0eScsXHJcbiAgICAgICAgICAnK3RpbWUnLFxyXG4gICAgICAgICAgJytpZCdcclxuICAgICAgICBdXHJcbiAgICAgIH0pKTtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UuaXNSZWplY3RlZCgpKSB7XHJcbiAgICAgIC8vIGVhcmx5IHJlamVjdGlvblxyXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XHJcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xyXG4gICAgICAvLyBubyBtb3JlIG1lc3NhZ2VzXHJcbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBraWNrIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlc1xyXG4gICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBxLnRoZW4obmV4dE1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXNQcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdG9yZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgcU1zZzogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT4pOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+IHtcclxuICAgIHJldHVybiBxTXNnLnRoZW4oKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XHJcbiAgICAgIGxldCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zO1xyXG4gICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcclxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzdG9yZU1lc3NhZ2UgJyArIGlkKTtcclxuICAgICAgdmFyIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gaWQgJiYgPExpdmVEYXRhTWVzc2FnZU1vZGVsPnRoaXMubWVzc2FnZXMuZ2V0KGlkKTtcclxuICAgICAgaWYgKG1lc3NhZ2UpIHtcclxuICAgICAgICAvLyB1c2UgZXhpc3RpbmcgaW5zdGFuY2UsIHNob3VsZCBub3QgYmUgdGhlIGNhc2UgdXN1YWxseVxyXG4gICAgICAgIG9wdGlvbnMgPSA8QmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucz57XHJcbiAgICAgICAgICBtZXJnZTogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gaW5zdGFudGlhdGUgbmV3IG1vZGVsLCBpbnRlbnRpb25hbGx5IG5vdCBhZGRlZCB0byBjb2xsZWN0aW9uXHJcbiAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKG1zZywge1xyXG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcclxuICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbWVzc2FnZS5zZXQoJ2NoYW5uZWwnLCBlbmRwb2ludC5jaGFubmVsKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gUShtZXNzYWdlLnNhdmUobXNnLCBvcHRpb25zKSkudGhlblJlc29sdmUobWVzc2FnZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVtb3ZlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOiBRLlByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XHJcbiAgICAgIGlmICghbWVzc2FnZSkge1xyXG4gICAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xyXG4gICAgICAgIGlmICghaWQpIHtcclxuICAgICAgICAgIC8vIG1zZyBpcyBub3QgcGVyc2lzdGVudFxyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSh1bmRlZmluZWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWVzc2FnZSA9IDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XHJcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XHJcbiAgICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwoe1xyXG4gICAgICAgICAgICBfaWQ6IG1zZy5faWRcclxuICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcclxuICAgICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgncmVtb3ZlTWVzc2FnZSAnICsgbWVzc2FnZS5pZCk7XHJcbiAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGNsZWFyKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pIHtcclxuICAgIGlmIChjb2xsZWN0aW9uKSB7XHJcbiAgICAgIHZhciBlbmRwb2ludDogU3luY0VuZHBvaW50ID0gdGhpcy5nZXRFbmRwb2ludChjb2xsZWN0aW9uKTtcclxuICAgICAgaWYgKGVuZHBvaW50KSB7XHJcbiAgICAgICAgaWYgKHRoaXMubWVzc2FnZXMpIHtcclxuICAgICAgICAgIHRoaXMubWVzc2FnZXMuZGVzdHJveSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjb2xsZWN0aW9uLnJlc2V0KCk7XHJcbiAgICAgICAgdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoZW5kcG9pbnQuY2hhbm5lbCwgJycpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBjbG9zZSB0aGUgc29ja2V0IGV4cGxpY2l0XHJcbiAgICovXHJcbiAgcHVibGljIGNsb3NlKCkge1xyXG4gICAgaWYgKHRoaXMubWVzc2FnZXMuc3RvcmUpIHtcclxuICAgICAgdGhpcy5tZXNzYWdlcy5zdG9yZS5jbG9zZSgpO1xyXG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMuZW5kcG9pbnRzKTtcclxuICAgIGZvciAodmFyIGkgPSAwLCBsID0ga2V5cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcclxuICAgICAgdGhpcy5lbmRwb2ludHNba2V5c1tpXV0uY2xvc2UoKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIG1peGluc1xyXG5sZXQgc3luY1N0b3JlID0gXy5leHRlbmQoU3luY1N0b3JlLnByb3RvdHlwZSwge1xyXG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlJyxcclxuXHJcbiAgbG9jYWxTdG9yZTogV2ViU3FsU3RvcmUsXHJcbiAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcclxuICB1c2VTb2NrZXROb3RpZnk6IHRydWUsXHJcbiAgdXNlT2ZmbGluZUNoYW5nZXM6IHRydWUsXHJcbiAgc29ja2V0UGF0aDogJydcclxufSk7XHJcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFN5bmNTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKHN5bmNTdG9yZSkpKTtcclxuIl19