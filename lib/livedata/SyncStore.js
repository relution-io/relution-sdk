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
var LiveDataTimestamp_1 = require('./LiveDataTimestamp');
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
                this.createTimestampCollection();
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
    SyncStore.prototype.createTimestampCollection = function () {
        if (this.useLocalStore && !this.timestamps) {
            this.timestamps = new Collection_1.Collection(undefined, {
                model: LiveDataTimestamp_1.LiveDataTimestampModel,
                store: new this.localStore(this.localStoreOptions)
            });
        }
        return this.timestamps;
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
            return this.getTimestamp(channel).then(function (time) {
                socket.emit('bind', {
                    entity: name,
                    channel: channel,
                    time: time
                });
                return Q.resolve(endpoint);
            });
        }
    };
    SyncStore.prototype.keyLastMessage = function (channel) {
        return '__' + channel + 'lastMesgTime';
    };
    // deprecated: use getTimestamp instead!
    SyncStore.prototype.getLastMessageTime = function (channel) {
        if (!this.lastMesgTime) {
            this.lastMesgTime = {};
        }
        else if (this.lastMesgTime[channel] !== undefined) {
            return this.lastMesgTime[channel];
        }
        // the | 0 below turns strings into numbers
        var time = offline_1.localStorage().getItem(this.keyLastMessage(channel)) || 0;
        this.lastMesgTime[channel] = time;
        return time;
    };
    // deprecated: use setTimestamp instead!
    SyncStore.prototype.setLastMessageTime = function (channel, time) {
        if (!time) {
            offline_1.localStorage().removeItem(this.keyLastMessage(channel));
        }
        else if (time > this.getLastMessageTime(channel)) {
            offline_1.localStorage().setItem(this.keyLastMessage(channel), time);
        }
        else {
            return this.lastMesgTime[channel];
        }
        this.lastMesgTime[channel] = time;
        return time;
    };
    SyncStore.prototype.getTimestampModel = function (channel) {
        var _this = this;
        if (this.timestamps) {
            if (!this.timestampsPromise) {
                // initially fetch all messages
                this.timestampsPromise = Q(this.timestamps.fetch());
            }
            return this.timestampsPromise.then(function () {
                return _this.timestamps.get(channel) || _this.timestamps.add(new _this.timestamps.model({
                    channel: channel,
                    timestamp: _this.getLastMessageTime(channel)
                }, {
                    store: _this.timestamps.store
                }));
            });
        }
    };
    SyncStore.prototype.getTimestamp = function (channel) {
        var _this = this;
        var q = this.getTimestampModel(channel);
        if (!q) {
            return Q.resolve(this.getLastMessageTime(channel));
        }
        this.timestampsPromise = q.then(function (model) {
            return model.attributes.timestamp;
        }).catch(function (err) {
            diag.debug.error('Relution.livedata.SyncStore.getTimestamp: ' + channel, err);
            return _this.getLastMessageTime(channel);
        });
        return this.timestampsPromise;
    };
    SyncStore.prototype.setTimestamp = function (channel, time) {
        var _this = this;
        var q = this.getTimestampModel(channel);
        if (!q) {
            return this.setLastMessageTime(channel, time);
        }
        this.timestampsPromise = q.then(function (model) {
            if (!time || time > model.attributes.timestamp) {
                return model.save({
                    timestamp: time
                }).thenResolve(time);
            }
            return model.attributes.timestamp;
        }).catch(function (err) {
            diag.debug.error('Relution.livedata.SyncStore.setTimestamp: ' + channel, err);
            return time;
        }).finally(function () {
            return _this.setLastMessageTime(channel, time);
        });
        return this.timestampsPromise;
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
            return Q.resolve(msg.time && _this.setTimestamp(channel, msg.time)).then(function () {
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
            return this.getTimestamp(channel).then(function (time) {
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
                // this.setTimestamp(channel, msg.time);
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
                qTime = _this.setTimestamp(endpoint.channel, clientTime);
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
        return this.getTimestamp(channel).then(function (time) {
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
                        return _this.setTimestamp(channel, now);
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
                return _this.getTimestamp(endpoint.channel).then(function (time) {
                    if (!time && info.get('time')) {
                        return _this.setTimestamp(endpoint.channel, info.get('time'));
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
                return this.setTimestamp(endpoint.channel, '');
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
        if (this.timestamps && this.timestamps.store) {
            this.timestamps.store.close();
            this.timestamps = null;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxrQ0FBd0QscUJBQXFCLENBQUMsQ0FBQTtBQUM5RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxL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LENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0lBQ0gsQ0FBQztJQUNILGdCQUFDO0FBQUQsQ0FBQyxBQWp3Q0QsQ0FBK0IsYUFBSyxHQWl3Q25DO0FBandDWSxpQkFBUyxZQWl3Q3JCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVDLEtBQUssRUFBRSw2QkFBNkI7SUFFcEMsVUFBVSxFQUFFLHlCQUFXO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIEJhY2tib25lIGZyb20gJ2JhY2tib25lJztcclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5pbXBvcnQgKiBhcyBvYmplY3RpZCBmcm9tICcuLi9jb3JlL29iamVjdGlkJztcclxuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xyXG5pbXBvcnQgKiBhcyB3ZWIgZnJvbSAnLi4vd2ViJztcclxuXHJcbmltcG9ydCB7bG9jYWxTdG9yYWdlfSBmcm9tICcuLi93ZWIvb2ZmbGluZSc7XHJcbmltcG9ydCB7R2V0UXVlcnl9IGZyb20gJy4uL3F1ZXJ5L0dldFF1ZXJ5JztcclxuaW1wb3J0IHtTdG9yZSwgU3RvcmVDdG9yfSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XHJcbmltcG9ydCB7U3luY0NvbnRleHR9IGZyb20gJy4vU3luY0NvbnRleHQnO1xyXG5pbXBvcnQge1N5bmNFbmRwb2ludH0gZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xyXG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZSwgTGl2ZURhdGFNZXNzYWdlTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcclxuaW1wb3J0IHtMaXZlRGF0YVRpbWVzdGFtcCwgTGl2ZURhdGFUaW1lc3RhbXBNb2RlbH0gZnJvbSAnLi9MaXZlRGF0YVRpbWVzdGFtcCc7XHJcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3RvciwgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5cclxuLyoqXHJcbiAqIGlvIG9mIGJyb3dzZXIgdmlhIHNjcmlwdCB0YWcgb3IgdmlhIHJlcXVpcmUgc29ja2V0LmlvLWNsaWVudCwgZW50aXJlbHkgb3B0aW9uYWwuXHJcbiAqXHJcbiAqIE5vdGljZSwgdGhpcyBtb2R1bGUgaXMgZW50aXJlbHkgb3B0aW9uYWwgYXMgdGhlIHN0b3JlIG1heSBvcGVyYXRlIHdpdGhvdXQgaXQgaWYgc29ja2V0XHJcbiAqIG5vdGlmaWNhdGlvbnMgYXJlIG5vdCB1c2VkLlxyXG4gKlxyXG4gKiBAaW50ZXJuYWwgTm90IHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaW86IFNvY2tldElPQ2xpZW50U3RhdGljID0gZ2xvYmFsWydpbyddIHx8IC8vIG5hdGl2ZSBpbXBsZW1lbnRhdGlvblxyXG4gIHR5cGVvZiByZXF1aXJlID09PSAnZnVuY3Rpb24nICYmICAgICAgICAgICAgICAgICAgICAgIC8vIG9yIHdoZW4gcmVxdWlyZSBpcyBhdmFpbGFibGVcclxuICAoKGZ1bmN0aW9uIHJlcXVpcmVTb2NrZXRJbygpIHsgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXF1aXJlZCB2ZXJzaW9uXHJcbiAgICAvLyBoZXJlIHdlIGFyZSBpbiBhbiBpbW1lZGlhdGVseSBpbnZva2VkIGZ1bmN0aW9uIHJlcXVpcmluZyBzb2NrZXQuaW8tY2xpZW50LCBpZiBhdmFpbGFibGVcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiAoZ2xvYmFsWydpbyddID0gcmVxdWlyZSgnc29ja2V0LmlvLWNsaWVudCcpKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2Fybignb3B0aW9uYWwgc29ja2V0LmlvLWNsaWVudCBtb2R1bGUgaXMgbm90IGF2YWlsYWJsZTogJyArIGVycm9yICYmIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgfVxyXG4gIH0pKCkpO1xyXG5cclxuLyoqXHJcbiAqIGNvbm5lY3RzIGEgTW9kZWwvQ29sbGVjdGlvbiB0byBhIFJlbHV0aW9uIHNlcnZlci5cclxuICpcclxuICogVGhpcyB3aWxsIGdpdmUgeW91IGFuIG9ubGluZSBhbmQgb2ZmbGluZSBzdG9yZSB3aXRoIGxpdmUgZGF0YSB1cGRhdGVzLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKlxyXG4gKiAvLyBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIHdpbGwgc2F2ZSB0aGUgY29tcGxldGUgbW9kZWwgZGF0YSBhcyBhIGpzb24sXHJcbiAqIC8vIGFuZCB0aGUgb2ZmbGluZSBjaGFuZ2UgbG9nIHRvIGEgbG9jYWwgV2ViU3FsIGRhdGFiYXNlLCBzeW5jaHJvbml6ZSBpdFxyXG4gKiAvLyB0cm91Z2ggUkVTVCBjYWxscyB3aXRoIHRoZSBzZXJ2ZXIgYW5kIHJlY2VpdmUgbGl2ZSB1cGRhdGVzIHZpYSBhIHNvY2tldC5pbyBjb25uZWN0aW9uLlxyXG4gKiBjbGFzcyBNeUNvbGxlY3Rpb24gZXh0ZW5kcyBSZWx1dGlvbi5saXZlZGF0YS5Db2xsZWN0aW9uIHt9O1xyXG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLm1vZGVsID0gTXlNb2RlbDtcclxuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSAnaHR0cDovL215U2VydmVyLmlvL215T3JnYS9teUFwcGxpY2F0aW9uL215Q29sbGVjdGlvbic7XHJcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlKHtcclxuICogICB1c2VMb2NhbFN0b3JlOiB0cnVlLCAgICAgLy8gKGRlZmF1bHQpIHN0b3JlIHRoZSBkYXRhIGZvciBvZmZsaW5lIHVzZVxyXG4gKiAgIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSwgICAvLyAoZGVmYXVsdCkgcmVnaXN0ZXIgYXQgdGhlIHNlcnZlciBmb3IgbGl2ZSB1cGRhdGVzXHJcbiAqICAgdXNlT2ZmbGluZUNoYW5nZXM6IHRydWUgIC8vIChkZWZhdWx0KSBhbGxvdyBjaGFuZ2VzIHRvIHRoZSBvZmZsaW5lIGRhdGFcclxuICogfSk7XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgU3luY1N0b3JlIGV4dGVuZHMgU3RvcmUge1xyXG5cclxuICAvLyBmb2xsb3dpbmcgYXJlIHN0b3JlLXNwZWNpZmljIG9wdGlvbnMsIGRlZmF1bHRzIHN0b3JlZCBpbiBwcm90b3R5cGUgYXQgZW5kIG9mIHRoaXMgZmlsZVxyXG4gIHByb3RlY3RlZCBsb2NhbFN0b3JlOiBTdG9yZUN0b3I7XHJcbiAgcHJvdGVjdGVkIGxvY2FsU3RvcmVPcHRpb25zOiBhbnk7XHJcbiAgcHJvdGVjdGVkIHVzZUxvY2FsU3RvcmU6IGJvb2xlYW47XHJcbiAgcHJvdGVjdGVkIHVzZVNvY2tldE5vdGlmeTogYm9vbGVhbjtcclxuICBwcm90ZWN0ZWQgdXNlT2ZmbGluZUNoYW5nZXM6IGJvb2xlYW47XHJcbiAgcHJvdGVjdGVkIHNvY2tldFBhdGg6IHN0cmluZztcclxuICBwcm90ZWN0ZWQgc29ja2V0UXVlcnk6IHN0cmluZztcclxuICBwcm90ZWN0ZWQgY3JlZGVudGlhbHM6IGFueTtcclxuICBwcm90ZWN0ZWQgb3JkZXJPZmZsaW5lQ2hhbmdlczogc3RyaW5nW107XHJcblxyXG4gIC8qKlxyXG4gICAqIHNlcnZlciBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdG9yZS5cclxuICAgKlxyXG4gICAqIFRoZSBzeW5jIG1ldGhvZCB3aWxsIGZhaWwgZWFybHkgd2hlbiBiZWluZyBhcHBsaWVkIHRvIGRhdGEgb2Ygc29tZSBvdGhlciBzZXJ2ZXIuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHNlcnZlclVybDogc3RyaW5nO1xyXG4gIC8qKlxyXG4gICAqIGFwcGxpY2F0aW9uIHBhcnQgdXNlZCB0byByZXNvbHZlIFVSTHMgbWF5IG9wdGlvbmFsbHkgYmUgc2V0IHVzaW5nIGNvbnN0cnVjdG9yIG9wdGlvbnMuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIGFwcGxpY2F0aW9uOiBzdHJpbmc7XHJcbiAgLyoqXHJcbiAgICogaWRlbnRpdHkgb3IgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdG9yZS5cclxuICAgKlxyXG4gICAqIFRoZSBhamF4IG1ldGhvZCB3aWxsIHNpbXVsYXRlIGFuIG9mZmxpbmUgdGltZW91dCB3aGVuIHRoZSB1c2VyIGlkZW50aXR5IGlzIGNoYW5nZWQuIFRoaXMgaXNcclxuICAgKiBiZWNhdXNlIGp1c3Qgb25lIHNlc3Npb24gY2FuIGJlIG1haW50YWluZWQgcGVyIHNlcnZlciBhbmQgbG9naW4vbG9nb3V0IHNlbWFudGljcyBtdXN0IGJlIHdlbGxcclxuICAgKiBiZWhhdmVkLlxyXG4gICAqL1xyXG4gIHByb3RlY3RlZCB1c2VyVXVpZDogc3RyaW5nO1xyXG5cclxuICBwdWJsaWMgZW5kcG9pbnRzOiB7XHJcbiAgICAvLyBtYXAgb2YgZW50aXR5IHRvIFN5bmNFbmRwb2ludFxyXG4gICAgW2VudGl0eTogc3RyaW5nXTogU3luY0VuZHBvaW50O1xyXG4gIH0gPSB7fTtcclxuXHJcbiAgcHJpdmF0ZSBsYXN0TWVzZ1RpbWU6IGFueTsgLy8gZGVwcmVjYXRlZDoga2VwdCBmb3IgbWlncmF0aW9uIGFuZCBhcyBhIGZhaWxzYWZlXHJcbiAgcHJpdmF0ZSB0aW1lc3RhbXBzOiBDb2xsZWN0aW9uO1xyXG4gIHByaXZhdGUgdGltZXN0YW1wc1Byb21pc2U6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPjtcclxuXHJcbiAgLyoqXHJcbiAgICogd2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBlbnRpdHkgY2F1c2VkIGEgZGlzY29ubmVjdGlvbi5cclxuICAgKlxyXG4gICAqIDxwPlxyXG4gICAqIFRoaXMgaXMgc2V0IHRvIGFuIGVudGl0eSBuYW1lIHRvIGxpbWl0IHdoaWNoIGVudGl0eSBtYXkgY2F1c2UgYSBjaGFuZ2UgdG8gb25saW5lIHN0YXRlIGFnYWluLlxyXG4gICAqIDwvcD5cclxuICAgKlxyXG4gICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBkaXNjb25uZWN0ZWRFbnRpdHk6IHN0cmluZyA9ICdhbGwnO1xyXG5cclxuICBwdWJsaWMgbWVzc2FnZXM6IENvbGxlY3Rpb247XHJcbiAgcHVibGljIG1lc3NhZ2VzUHJvbWlzZTogUS5Qcm9taXNlPENvbGxlY3Rpb24+O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XHJcbiAgICBzdXBlcihvcHRpb25zKTtcclxuICAgIGlmICh0aGlzLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAgIHRoaXMuY3JlZGVudGlhbHMgPSBfLmNsb25lKHRoaXMuY3JlZGVudGlhbHMpO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpIHtcclxuICAgICAgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyA9IF8uY2xvbmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyk7XHJcbiAgICB9XHJcbiAgICBpZiAodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKSB7XHJcbiAgICAgIHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyA9IF8uY2xvbmUodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkgJiYgdHlwZW9mIGlvICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm5pbmcoJ1NvY2tldC5JTyBub3QgcHJlc2VudCAhIScpO1xyXG4gICAgICB0aGlzLnVzZVNvY2tldE5vdGlmeSA9IGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogb3ZlcndyaXR0ZW4gdG8gcmVzb2x2ZSByZWxhdGl2ZSBVUkxzIGFnYWluc3QgdGhlIFN5bmNTdG9yZSNzZXJ2ZXJVcmwuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpIHtcclxuICAgIHJldHVybiB3ZWIucmVzb2x2ZVVybCh1cmwsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybCxcclxuICAgICAgYXBwbGljYXRpb246IHRoaXMuYXBwbGljYXRpb25cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogYmluZHMgdGhlIHN0b3JlIHRvIGEgdGFyZ2V0IHNlcnZlciB3aGVuIHRoZSBmaXJzdCBlbmRwb2ludCBpcyBjcmVhdGVkLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHVybFJvb3QgdXNlZCB0byByZXNvbHZlIHRoZSBzZXJ2ZXIgdG8gb3BlcmF0ZS5cclxuICAgICAqL1xyXG4gIHByaXZhdGUgaW5pdFNlcnZlcih1cmxSb290OiBzdHJpbmcpIHtcclxuICAgIGxldCBzZXJ2ZXJVcmwgPSB3ZWIucmVzb2x2ZVNlcnZlcih1cmxSb290LCB7XHJcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcclxuICAgIH0pO1xyXG4gICAgaWYgKCF0aGlzLnNlcnZlclVybCkge1xyXG4gICAgICBjb25zdCBzZXJ2ZXIgPSBzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcclxuICAgICAgdGhpcy5zZXJ2ZXJVcmwgPSBzZXJ2ZXJVcmw7XHJcbiAgICAgIHRoaXMudXNlclV1aWQgPSBzZXJ2ZXIuYXV0aG9yaXphdGlvbi5uYW1lO1xyXG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiAhdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscykge1xyXG4gICAgICAgIC8vIGNhcHR1cmUgY3JlZGVudGlhbHMgZm9yIHVzZSBieSBjcnlwdG8gc3RvcmVzXHJcbiAgICAgICAgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscyA9IF8uZGVmYXVsdHMoe1xyXG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcclxuICAgICAgICB9LCBzZXJ2ZXIuY3JlZGVudGlhbHMpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdzdG9yZSBpcyBib3VuZCB0byBzZXJ2ZXIgJyArIHRoaXMuc2VydmVyVXJsICsgJyBhbHJlYWR5Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNoZWNrU2VydmVyKHVybDogc3RyaW5nLCBvcHRpb25zPzogYW55KTogUS5Qcm9taXNlPHN0cmluZz4ge1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gd2ViLnJlc29sdmVTZXJ2ZXIodXJsLCB7XHJcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcclxuICAgIH0pID09PSB0aGlzLnNlcnZlclVybCk7XHJcbiAgICBpZiAoc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHRoaXMuc2VydmVyVXJsKS5hdXRob3JpemF0aW9uLm5hbWUgIT09IHRoaXMudXNlclV1aWQpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCd1c2VyIGlkZW50aXR5IHdhcyBjaGFuZ2VkLCB3b3JraW5nIG9mZmxpbmUgdW50aWwgYXV0aG9yaXphdGlvbiBpcyByZXN0b3JlZCcpO1xyXG4gICAgICBjb25zdCBlcnJvcjogd2ViLkh0dHBFcnJvciA9IG5ldyBFcnJvcigpO1xyXG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxyXG4gICAgICByZXR1cm4gb3B0aW9ucyAmJiB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBRLnJlamVjdDxzdHJpbmc+KGVycm9yKTtcclxuICAgIH1cclxuICAgIHJldHVybiBRLnJlc29sdmUodXJsKTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBpbml0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbiwgbW9kZWxUeXBlOiBNb2RlbEN0b3IpOiBTeW5jRW5kcG9pbnQge1xyXG4gICAgbGV0IHVybFJvb3QgPSBtb2RlbE9yQ29sbGVjdGlvbi5nZXRVcmxSb290KCk7XHJcbiAgICBsZXQgZW50aXR5ID0gbW9kZWxPckNvbGxlY3Rpb24uZW50aXR5O1xyXG4gICAgaWYgKHVybFJvb3QgJiYgZW50aXR5KSB7XHJcbiAgICAgIC8vIGdldCBvciBjcmVhdGUgZW5kcG9pbnQgZm9yIHRoaXMgdXJsXHJcbiAgICAgIHRoaXMuaW5pdFNlcnZlcih1cmxSb290KTtcclxuICAgICAgdXJsUm9vdCA9IHRoaXMucmVzb2x2ZVVybCh1cmxSb290KTtcclxuICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcclxuICAgICAgaWYgKCFlbmRwb2ludCkge1xyXG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmluaXRFbmRwb2ludDogJyArIGVudGl0eSk7XHJcbiAgICAgICAgZW5kcG9pbnQgPSBuZXcgU3luY0VuZHBvaW50KHtcclxuICAgICAgICAgIGVudGl0eTogZW50aXR5LFxyXG4gICAgICAgICAgbW9kZWxUeXBlOiBtb2RlbFR5cGUsXHJcbiAgICAgICAgICB1cmxSb290OiB1cmxSb290LFxyXG4gICAgICAgICAgc29ja2V0UGF0aDogdGhpcy5zb2NrZXRQYXRoLFxyXG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmVuZHBvaW50c1tlbnRpdHldID0gZW5kcG9pbnQ7XHJcblxyXG4gICAgICAgIGVuZHBvaW50LmxvY2FsU3RvcmUgPSB0aGlzLmNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQpO1xyXG4gICAgICAgIGVuZHBvaW50LnByaW9yaXR5ID0gdGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzICYmIChfLmxhc3RJbmRleE9mKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcywgZW5kcG9pbnQuZW50aXR5KSArIDEpO1xyXG4gICAgICAgIHRoaXMuY3JlYXRlTXNnQ29sbGVjdGlvbigpO1xyXG4gICAgICAgIHRoaXMuY3JlYXRlVGltZXN0YW1wQ29sbGVjdGlvbigpO1xyXG4gICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBlbnRpdHkpO1xyXG4gICAgICAgIGVuZHBvaW50LmluZm8gPSB0aGlzLmZldGNoU2VydmVySW5mbyhlbmRwb2ludCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gY29uZmlndXJhdGlvbiBjYW4gbm90IGNoYW5nZSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkLi4uXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW5kcG9pbnQudXJsUm9vdCA9PT0gdXJsUm9vdCwgJ2NhbiBub3QgY2hhbmdlIHVybFJvb3QsIG11c3QgcmVjcmVhdGUgc3RvcmUgaW5zdGVhZCEnKTtcclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC51c2VyVXVpZCA9PT0gdGhpcy51c2VyVXVpZCwgJ2NhbiBub3QgY2hhbmdlIHVzZXIgaWRlbnRpdHksIG11c3QgcmVjcmVhdGUgc3RvcmUgaW5zdGVhZCEnKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gZW5kcG9pbnQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBAaW5oZXJpdGRvY1xyXG4gICAqXHJcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBNb2RlbCBjb25zdHJ1Y3Rvci5cclxuICAgKi9cclxuICBpbml0TW9kZWwobW9kZWw6IE1vZGVsKTogdm9pZCB7XHJcbiAgICBtb2RlbC5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KG1vZGVsLCA8TW9kZWxDdG9yPm1vZGVsLmNvbnN0cnVjdG9yKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEBpbmhlcml0ZG9jXHJcbiAgICpcclxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IENvbGxlY3Rpb24gY29uc3RydWN0b3IuXHJcbiAgICovXHJcbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IHZvaWQge1xyXG4gICAgY29sbGVjdGlvbi5lbmRwb2ludCA9IHRoaXMuaW5pdEVuZHBvaW50KGNvbGxlY3Rpb24sIGNvbGxlY3Rpb24ubW9kZWwpO1xyXG4gIH1cclxuXHJcbiAgZ2V0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbik6IFN5bmNFbmRwb2ludCB7XHJcbiAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1ttb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHldO1xyXG4gICAgaWYgKGVuZHBvaW50KSB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcclxuICAgICAgICAvLyBjaGVja3MgdGhhdCBtb2RlbE9yQ29sbGVjdGlvbiB1c2VzIGEgbW9kZWwgaW5oZXJpdGluZyBmcm9tIHRoZSBvbmUgb2YgdGhlIGVuZHBvaW50XHJcbiAgICAgICAgbGV0IG1vZGVsVHlwZSA9IGlzQ29sbGVjdGlvbihtb2RlbE9yQ29sbGVjdGlvbikgPyBtb2RlbE9yQ29sbGVjdGlvbi5tb2RlbCA6IG1vZGVsT3JDb2xsZWN0aW9uLmNvbnN0cnVjdG9yO1xyXG4gICAgICAgIHJldHVybiBtb2RlbFR5cGUgPT09IGVuZHBvaW50Lm1vZGVsVHlwZSB8fCBtb2RlbFR5cGUucHJvdG90eXBlIGluc3RhbmNlb2YgZW5kcG9pbnQubW9kZWxUeXBlO1xyXG4gICAgICB9LCAnd3JvbmcgdHlwZSBvZiBtb2RlbCEnKTtcclxuICAgICAgcmV0dXJuIGVuZHBvaW50O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludDogU3luY0VuZHBvaW50KTogU3RvcmUge1xyXG4gICAgaWYgKHRoaXMudXNlTG9jYWxTdG9yZSkge1xyXG4gICAgICB2YXIgZW50aXRpZXMgPSB7fTtcclxuICAgICAgZW50aXRpZXNbZW5kcG9pbnQuZW50aXR5XSA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICAgIHZhciBzdG9yZU9wdGlvbiA9IHtcclxuICAgICAgICBlbnRpdGllczogZW50aXRpZXNcclxuICAgICAgfTtcclxuICAgICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgc3RvcmVPcHRpb24gPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xyXG4gICAgICAgIHN0b3JlT3B0aW9uLmVudGl0aWVzID0gZW50aXRpZXM7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmxvY2FsU3RvcmUoc3RvcmVPcHRpb24pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQGRlc2NyaXB0aW9uIEhlcmUgd2Ugc2F2ZSB0aGUgY2hhbmdlcyBpbiBhIE1lc3NhZ2UgbG9jYWwgd2Vic3FsXHJcbiAgICogQHJldHVybnMgeyp9XHJcbiAgICovXHJcbiAgY3JlYXRlTXNnQ29sbGVjdGlvbigpOiBDb2xsZWN0aW9uIHtcclxuICAgIGlmICh0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzICYmICF0aGlzLm1lc3NhZ2VzKSB7XHJcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBuZXcgQ29sbGVjdGlvbih1bmRlZmluZWQsIHtcclxuICAgICAgICBtb2RlbDogTGl2ZURhdGFNZXNzYWdlTW9kZWwsXHJcbiAgICAgICAgc3RvcmU6IG5ldyB0aGlzLmxvY2FsU3RvcmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucylcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcclxuICB9XHJcblxyXG4gIGNyZWF0ZVRpbWVzdGFtcENvbGxlY3Rpb24oKTogQ29sbGVjdGlvbiB7XHJcbiAgICBpZiAodGhpcy51c2VMb2NhbFN0b3JlICYmICF0aGlzLnRpbWVzdGFtcHMpIHtcclxuICAgICAgdGhpcy50aW1lc3RhbXBzID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XHJcbiAgICAgICAgbW9kZWw6IExpdmVEYXRhVGltZXN0YW1wTW9kZWwsXHJcbiAgICAgICAgc3RvcmU6IG5ldyB0aGlzLmxvY2FsU3RvcmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucylcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy50aW1lc3RhbXBzO1xyXG4gIH1cclxuXHJcbiAgY3JlYXRlU29ja2V0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG5hbWU6IHN0cmluZykge1xyXG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIGVuZHBvaW50ICYmIGVuZHBvaW50LnNvY2tldFBhdGgpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmNyZWF0ZVNvY2tldDogJyArIG5hbWUpO1xyXG5cclxuICAgICAgLy8gcmVzb3VyY2VcclxuICAgICAgbGV0IGNvbm5lY3RWbzogYW55ID0ge1xyXG4gICAgICAgICdmb3JjZSBuZXcgY29ubmVjdGlvbic6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgbGV0IHJlc291cmNlID0gZW5kcG9pbnQuc29ja2V0UGF0aDsgLy8gcmVtb3ZlIGxlYWRpbmcgL1xyXG4gICAgICBjb25uZWN0Vm8ucmVzb3VyY2UgPSAocmVzb3VyY2UgJiYgcmVzb3VyY2UuaW5kZXhPZignLycpID09PSAwKSA/IHJlc291cmNlLnN1YnN0cigxKSA6IHJlc291cmNlO1xyXG4gICAgICBpZiAodGhpcy5zb2NrZXRRdWVyeSkge1xyXG4gICAgICAgIGNvbm5lY3RWby5xdWVyeSA9IHRoaXMuc29ja2V0UXVlcnk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHNvY2tldFxyXG4gICAgICBlbmRwb2ludC5zb2NrZXQgPSBpby5jb25uZWN0KGVuZHBvaW50Lmhvc3QsIGNvbm5lY3RWbyk7XHJcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcclxuICAgICAgICAodGhpcy5fYmluZENoYW5uZWwoZW5kcG9pbnQsIG5hbWUpIHx8IFEucmVzb2x2ZShlbmRwb2ludCkpLnRoZW4oKGVwKSA9PiB7XHJcbiAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlcCA9PT0gZW5kcG9pbnQpO1xyXG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVwKTtcclxuICAgICAgICB9KS5kb25lKCk7XHJcbiAgICAgIH0pO1xyXG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAoKSA9PiB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzb2NrZXQuaW86IGRpc2Nvbm5lY3QnKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLmRvbmUoKTtcclxuICAgICAgfSk7XHJcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbihlbmRwb2ludC5jaGFubmVsLCAobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVuZHBvaW50LnNvY2tldDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIF9iaW5kQ2hhbm5lbChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lPzogc3RyaW5nKSB7XHJcbiAgICBpZiAoZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0KSB7XHJcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fYmluZENoYW5uZWw6ICcgKyBuYW1lKTtcclxuXHJcbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcclxuICAgICAgdmFyIHNvY2tldCA9IGVuZHBvaW50LnNvY2tldDtcclxuICAgICAgbmFtZSA9IG5hbWUgfHwgZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXRUaW1lc3RhbXAoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xyXG4gICAgICAgIHNvY2tldC5lbWl0KCdiaW5kJywge1xyXG4gICAgICAgICAgZW50aXR5OiBuYW1lLFxyXG4gICAgICAgICAgY2hhbm5lbDogY2hhbm5lbCxcclxuICAgICAgICAgIHRpbWU6IHRpbWVcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gUS5yZXNvbHZlKGVuZHBvaW50KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGtleUxhc3RNZXNzYWdlKGNoYW5uZWw6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gJ19fJyArIGNoYW5uZWwgKyAnbGFzdE1lc2dUaW1lJztcclxuICB9XHJcblxyXG4gIC8vIGRlcHJlY2F0ZWQ6IHVzZSBnZXRUaW1lc3RhbXAgaW5zdGVhZCFcclxuICBwcml2YXRlIGdldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcpOiBhbnkge1xyXG4gICAgaWYgKCF0aGlzLmxhc3RNZXNnVGltZSkge1xyXG4gICAgICB0aGlzLmxhc3RNZXNnVGltZSA9IHt9O1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXTtcclxuICAgIH1cclxuICAgIC8vIHRoZSB8IDAgYmVsb3cgdHVybnMgc3RyaW5ncyBpbnRvIG51bWJlcnNcclxuICAgIHZhciB0aW1lID0gbG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSh0aGlzLmtleUxhc3RNZXNzYWdlKGNoYW5uZWwpKSB8fCAwO1xyXG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xyXG4gICAgcmV0dXJuIHRpbWU7XHJcbiAgfVxyXG5cclxuICAvLyBkZXByZWNhdGVkOiB1c2Ugc2V0VGltZXN0YW1wIGluc3RlYWQhXHJcbiAgcHJpdmF0ZSBzZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiBhbnkge1xyXG4gICAgaWYgKCF0aW1lKSB7XHJcbiAgICAgIGxvY2FsU3RvcmFnZSgpLnJlbW92ZUl0ZW0odGhpcy5rZXlMYXN0TWVzc2FnZShjaGFubmVsKSk7XHJcbiAgICB9IGVsc2UgaWYodGltZSA+IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpKSB7XHJcbiAgICAgIGxvY2FsU3RvcmFnZSgpLnNldEl0ZW0odGhpcy5rZXlMYXN0TWVzc2FnZShjaGFubmVsKSwgdGltZSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF07XHJcbiAgICB9XHJcbiAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XHJcbiAgICByZXR1cm4gdGltZTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0VGltZXN0YW1wTW9kZWwoY2hhbm5lbDogc3RyaW5nKTogUS5Qcm9taXNlPExpdmVEYXRhVGltZXN0YW1wTW9kZWw+IHtcclxuICAgIGlmICh0aGlzLnRpbWVzdGFtcHMpIHtcclxuICAgICAgaWYgKCF0aGlzLnRpbWVzdGFtcHNQcm9taXNlKSB7XHJcbiAgICAgICAgLy8gaW5pdGlhbGx5IGZldGNoIGFsbCBtZXNzYWdlc1xyXG4gICAgICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBRKHRoaXMudGltZXN0YW1wcy5mZXRjaCgpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdGhpcy50aW1lc3RhbXBzUHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICByZXR1cm4gdGhpcy50aW1lc3RhbXBzLmdldChjaGFubmVsKSB8fCB0aGlzLnRpbWVzdGFtcHMuYWRkKG5ldyB0aGlzLnRpbWVzdGFtcHMubW9kZWwoe1xyXG4gICAgICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpXHJcbiAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLnRpbWVzdGFtcHMuc3RvcmVcclxuICAgICAgICAgIH0pKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBnZXRUaW1lc3RhbXAoY2hhbm5lbDogc3RyaW5nKTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgbGV0IHEgPSB0aGlzLmdldFRpbWVzdGFtcE1vZGVsKGNoYW5uZWwpO1xyXG4gICAgaWYgKCFxKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmUodGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBxLnRoZW4oKG1vZGVsKSA9PiB7XHJcbiAgICAgIHJldHVybiBtb2RlbC5hdHRyaWJ1dGVzLnRpbWVzdGFtcDtcclxuICAgIH0pLmNhdGNoKChlcnIpID0+IHtcclxuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmdldFRpbWVzdGFtcDogJyArIGNoYW5uZWwsIGVycik7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKTtcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIHRoaXMudGltZXN0YW1wc1Byb21pc2U7XHJcbiAgfVxyXG5cclxuICBzZXRUaW1lc3RhbXAoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiBRLlByb21pc2U8YW55PiB7XHJcbiAgICBsZXQgcSA9IHRoaXMuZ2V0VGltZXN0YW1wTW9kZWwoY2hhbm5lbCk7XHJcbiAgICBpZiAoIXEpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIHRpbWUpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBxLnRoZW4oKG1vZGVsKSA9PiB7XHJcbiAgICAgIGlmICghdGltZSB8fCB0aW1lID4gbW9kZWwuYXR0cmlidXRlcy50aW1lc3RhbXApIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuc2F2ZSh7XHJcbiAgICAgICAgICB0aW1lc3RhbXA6IHRpbWVcclxuICAgICAgICB9KS50aGVuUmVzb2x2ZSh0aW1lKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gbW9kZWwuYXR0cmlidXRlcy50aW1lc3RhbXA7XHJcbiAgICB9KS5jYXRjaCgoZXJyKSA9PiB7XHJcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5zZXRUaW1lc3RhbXA6ICcgKyBjaGFubmVsLCBlcnIpO1xyXG4gICAgICByZXR1cm4gdGltZTtcclxuICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICByZXR1cm4gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgdGltZSk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB0aGlzLnRpbWVzdGFtcHNQcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgb25Db25uZWN0KGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBRLlByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAvLyB3aGVuIG9mZmxpbmUgdHJhbnNtaXNzaW9uIGlzIHBlbmRpbmcsIG5lZWQgdG8gd2FpdCBmb3IgaXQgdG8gY29tcGxldGVcclxuICAgICAgbGV0IHEgPSBRLnJlc29sdmUodW5kZWZpbmVkKTtcclxuICAgICAgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlICYmIHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUGVuZGluZygpKSB7XHJcbiAgICAgICAgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlLmNhdGNoKChlcnJvcikgPT4gUS5yZXNvbHZlKHVuZGVmaW5lZCkpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzeW5jIHNlcnZlci9jbGllbnQgY2hhbmdlc1xyXG4gICAgICBlbmRwb2ludC5pc0Nvbm5lY3RlZCA9IHEudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gbmV4dCB3ZSdsbCBmZXRjaCBzZXJ2ZXItc2lkZSBjaGFuZ2VzXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS50aGVuKCgpID0+IHtcclxuICAgICAgICAgIC8vIHRoZW4gc2VuZCBjbGllbnQtc2lkZSBjaGFuZ2VzXHJcbiAgICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09ICdhbGwnIHx8IHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpIHtcclxuICAgICAgICAgICAgLy8gcmVzdGFydCByZXBsYXlpbmcgb2Ygb2ZmbGluZSBtZXNzYWdlc1xyXG4gICAgICAgICAgICB0aGlzLm1lc3NhZ2VzUHJvbWlzZSA9IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gbnVsbDtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiB0aGlzLl9zZW5kTWVzc2FnZXMoKTtcclxuICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcclxuICAgICAgICAgIC8vIGNhdGNoIHdpdGhvdXQgZXJyb3IgaW5kaWNhdGVzIGRpc2Nvbm5lY3Rpb24gd2hpbGUgZ29pbmcgb25saW5lXHJcbiAgICAgICAgICBpZiAoIWVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vIGRpc2Nvbm5lY3RlZCB3aGlsZSBzZW5kaW5nIG9mZmxpbmUgY2hhbmdlc1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XHJcbiAgICAgICAgLy8gaW4gdGhlIGVuZCwgd2hlbiBjb25uZWN0ZWQgc3RpbGwsIGZpcmUgYW4gZXZlbnQgaW5mb3JtaW5nIGNsaWVudCBjb2RlXHJcbiAgICAgICAgaWYgKGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Nvbm5lY3Q6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZW5kcG9pbnQuaXNDb25uZWN0ZWQ7XHJcbiAgfVxyXG5cclxuICBvbkRpc2Nvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gbnVsbDtcclxuICAgIGlmICghdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkpIHtcclxuICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSAnYWxsJztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gUS5mY2FsbCgoKSA9PiB7XHJcbiAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgJiYgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQpIHtcclxuICAgICAgICAvLyBjb25zaWRlciBjYWxsaW5nIGVuZHBvaW50LnNvY2tldC5kaXNjb25uZWN0KCkgaW5zdGVhZFxyXG4gICAgICAgICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0Lm9uRGlzY29ubmVjdCgpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9KS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignZGlzY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgX2ZpeE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBMaXZlRGF0YU1lc3NhZ2Uge1xyXG4gICAgbGV0IGlkQXR0cmlidXRlID0gZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZTtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhaWRBdHRyaWJ1dGUsICdubyBpZEF0dHJpYnV0ZSEnKTtcclxuXHJcbiAgICBpZiAobXNnLmRhdGEgJiYgIW1zZy5kYXRhW2lkQXR0cmlidXRlXSAmJiBtc2cuZGF0YS5faWQpIHtcclxuICAgICAgbXNnLmRhdGFbaWRBdHRyaWJ1dGVdID0gbXNnLmRhdGEuX2lkOyAvLyBzZXJ2ZXIgYnVnIVxyXG4gICAgfSBlbHNlIGlmICghbXNnLmRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScgJiYgbXNnW2lkQXR0cmlidXRlXSkge1xyXG4gICAgICBtc2cuZGF0YSA9IHt9O1xyXG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2dbaWRBdHRyaWJ1dGVdOyAvLyBzZXJ2ZXIgYnVnIVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1zZztcclxuICB9XHJcblxyXG4gIG9uTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSk6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+IHtcclxuICAgIC8vIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBzdG9yZSBpdHNlbGYgZm9yIGEgcGFydGljdWxhciBlbmRwb2ludCFcclxuICAgIGlmICghbXNnIHx8ICFtc2cubWV0aG9kKSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdDxMaXZlRGF0YU1lc3NhZ2U+KG5ldyBFcnJvcignbm8gbWVzc2FnZSBvciBtZXRob2QgZ2l2ZW4nKSk7XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHE6IFEuUHJvbWlzZTxhbnk+O1xyXG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xyXG4gICAgaWYgKGVuZHBvaW50LmxvY2FsU3RvcmUpIHtcclxuICAgICAgLy8gZmlyc3QgdXBkYXRlIHRoZSBsb2NhbCBzdG9yZSBieSBmb3JtaW5nIGEgbW9kZWwgYW5kIGludm9raW5nIHN5bmNcclxuICAgICAgdmFyIG9wdGlvbnMgPSBfLmRlZmF1bHRzKHtcclxuICAgICAgICBzdG9yZTogZW5kcG9pbnQubG9jYWxTdG9yZVxyXG4gICAgICB9LCB0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcclxuICAgICAgdmFyIG1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShtc2cuZGF0YSwgXy5leHRlbmQoe1xyXG4gICAgICAgIHBhcnNlOiB0cnVlXHJcbiAgICAgIH0sIG9wdGlvbnMpKTtcclxuICAgICAgaWYgKCFtb2RlbC5pZCkge1xyXG4gICAgICAgIC8vIGNvZGUgYmVsb3cgd2lsbCBwZXJzaXN0IHdpdGggYXV0by1hc3NpZ25lZCBpZCBidXQgdGhpcyBuZXZlcnRoZWxlc3MgaXMgYSBicm9rZW4gcmVjb3JkXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyByZWNlaXZlZCBkYXRhIHdpdGggbm8gdmFsaWQgaWQgcGVyZm9ybWluZyAnICsgbXNnLm1ldGhvZCArICchJyk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QpO1xyXG4gICAgICB9XHJcbiAgICAgIHEgPSBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIF8uZXh0ZW5kKG9wdGlvbnMsIHtcclxuICAgICAgICBtZXJnZTogbXNnLm1ldGhvZCA9PT0gJ3BhdGNoJ1xyXG4gICAgICB9KSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgaWYgKCFtc2cuaWQgfHwgbXNnLmlkID09PSBtb2RlbC5pZCkge1xyXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGlkIHZhbHVlIHdhcyByZWFzc2lnbmVkLCBkZWxldGUgcmVjb3JkIG9mIG9sZCBpZFxyXG4gICAgICAgIHZhciBvbGREYXRhID0ge307XHJcbiAgICAgICAgb2xkRGF0YVttb2RlbC5pZEF0dHJpYnV0ZV0gPSBtc2cuaWQ7XHJcbiAgICAgICAgdmFyIG9sZE1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShvbGREYXRhLCBvcHRpb25zKTtcclxuICAgICAgICBkaWFnLmRlYnVnLmRlYnVnKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnICcgKyBtb2RlbC5pZCArICcgcmVhc3NpZ25lZCBmcm9tIG9sZCByZWNvcmQgJyArIG9sZE1vZGVsLmlkKTtcclxuICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKCdkZWxldGUnLCBvbGRNb2RlbCwgb3B0aW9ucyk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8ganVzdCB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xyXG4gICAgICBxID0gUS5yZXNvbHZlKG1zZyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZmluYWxseSBzZXQgdGhlIG1lc3NhZ2UgdGltZVxyXG4gICAgcmV0dXJuIHEudGhlbigoKSA9PiB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLnRpbWUgJiYgdGhpcy5zZXRUaW1lc3RhbXAoY2hhbm5lbCwgbXNnLnRpbWUpKS50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignc3luYzonICsgY2hhbm5lbCwgbXNnKTsgLy8gU3luY0NvbnRleHQub25NZXNzYWdlXHJcbiAgICAgICAgcmV0dXJuIG1zZztcclxuICAgICAgfSk7XHJcbiAgICB9LCAoZXJyb3I6IEVycm9yKSA9PiB7XHJcbiAgICAgIC8vIG5vdCBzZXR0aW5nIG1lc3NhZ2UgdGltZSBpbiBlcnJvciBjYXNlXHJcblxyXG4gICAgICAvLyByZXBvcnQgZXJyb3IgYXMgZXZlbnQgb24gc3RvcmVcclxuICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTtcclxuICAgICAgcmV0dXJuIG1zZztcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIHN5bmMobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSA9IHt9KTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnN5bmMnKTtcclxuICAgIHRyeSB7XHJcbiAgICAgIHZhciBlbmRwb2ludDogU3luY0VuZHBvaW50ID0gbW9kZWwuZW5kcG9pbnQgfHwgdGhpcy5nZXRFbmRwb2ludChtb2RlbCk7XHJcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGVuZHBvaW50Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpc0NvbGxlY3Rpb24obW9kZWwpKSB7XHJcbiAgICAgICAgLy8gY29sbGVjdGlvbnMgY2FuIGJlIGZpbHRlcmVkLCBldGMuXHJcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ3JlYWQnICYmICFvcHRpb25zLmJhcmVib25lKSB7XHJcbiAgICAgICAgICB2YXIgc3luY0NvbnRleHQ6IFN5bmNDb250ZXh0ID0gb3B0aW9ucy5zeW5jQ29udGV4dDsgLy8gc3luYyBjYW4gYmUgY2FsbGVkIGJ5IFN5bmNDb250ZXh0IGl0c2VsZiB3aGVuIHBhZ2luZyByZXN1bHRzXHJcbiAgICAgICAgICBpZiAoIXN5bmNDb250ZXh0KSB7XHJcbiAgICAgICAgICAgIC8vIGNhcHR1cmUgR2V0UXVlcnkgb3B0aW9uc1xyXG4gICAgICAgICAgICBzeW5jQ29udGV4dCA9IG5ldyBTeW5jQ29udGV4dChcclxuICAgICAgICAgICAgICBvcHRpb25zLCAgICAgICAgLy8gZHluYW1pYyBvcHRpb25zIHBhc3NlZCB0byBmZXRjaCgpIGltcGxlbWVudCBVSSBmaWx0ZXJzLCBldGMuXHJcbiAgICAgICAgICAgICAgbW9kZWwub3B0aW9ucywgIC8vIHN0YXRpYyBvcHRpb25zIG9uIGNvbGxlY3Rpb24gaW1wbGVtZW50IHNjcmVlbi1zcGVjaWZpYyBzdHVmZlxyXG4gICAgICAgICAgICAgIHRoaXMgICAgICAgICAgICAvLyBzdGF0aWMgb3B0aW9ucyBvZiB0aGlzIHN0b3JlIHJlYWxpemUgZmlsdGVyaW5nIGNsaWVudC9zZXJ2ZXJcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgb3B0aW9ucy5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgaWYgKG1vZGVsLnN5bmNDb250ZXh0ICE9PSBzeW5jQ29udGV4dCkge1xyXG4gICAgICAgICAgICAvLyBhc3NpZ24gYSBkaWZmZXJlbnQgaW5zdGFuY2VcclxuICAgICAgICAgICAgaWYgKG1vZGVsLnN5bmNDb250ZXh0KSB7XHJcbiAgICAgICAgICAgICAgbW9kZWwuc3RvcExpc3RlbmluZyh0aGlzLCAnc3luYzonICsgZW5kcG9pbnQuY2hhbm5lbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbW9kZWwubGlzdGVuVG8odGhpcywgJ3N5bmM6JyArIGVuZHBvaW50LmNoYW5uZWwsIF8uYmluZChzeW5jQ29udGV4dC5vbk1lc3NhZ2UsIHN5bmNDb250ZXh0LCB0aGlzLCBtb2RlbCkpO1xyXG4gICAgICAgICAgICBtb2RlbC5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChpc01vZGVsKG1vZGVsKSkge1xyXG4gICAgICAgIC8vIG9mZmxpbmUgY2FwYWJpbGl0eSByZXF1aXJlcyBJRHMgZm9yIGRhdGFcclxuICAgICAgICBpZiAoIW1vZGVsLmlkKSB7XHJcbiAgICAgICAgICBpZiAobWV0aG9kID09PSAnY3JlYXRlJykge1xyXG4gICAgICAgICAgICBtb2RlbC5zZXQobW9kZWwuaWRBdHRyaWJ1dGUsIG9iamVjdGlkLm1ha2VPYmplY3RJRCgpKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignbm8gKHZhbGlkKSBpZDogJyArIG1vZGVsLmlkKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gc29tZXRoaW5nIGlzIHJlYWxseSBhdCBvZGRzIGhlcmUuLi5cclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBvZiBzeW5jIGlzIG5laXRoZXIgYSBtb2RlbCBub3IgYSBjb2xsZWN0aW9uIT8hJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGF0IHRoaXMgcG9pbnQgdGhlIHRhcmdldCBzZXJ2ZXIgaXMga25vd24sIGNoZWNrIG1ha2luZyBzdXJlIHRoZSBjb3JyZWN0IHNlcnZlciBpcyBiZWluZyBoaXRcclxuICAgICAgY29uc3Qgc2VydmVyVXJsID0gd2ViLnJlc29sdmVTZXJ2ZXIobW9kZWwuZ2V0VXJsUm9vdCgpLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgICB9KTtcclxuICAgICAgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChjaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIC8vIG9ubHkgc2VuZCByZWFkIG1lc3NhZ2VzIGlmIG5vIG90aGVyIHN0b3JlIGNhbiBkbyB0aGlzIG9yIGZvciBpbml0aWFsIGxvYWRcclxuICAgICAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiBlbmRwb2ludC5sb2NhbFN0b3JlICYmIHRpbWUgJiYgIW9wdGlvbnMucmVzZXQpIHtcclxuICAgICAgICAgICAgLy8gcmVhZCBkYXRhIGZyb20gbG9jYWxTdG9yZSBhbmQgZmV0Y2ggY2hhbmdlcyByZW1vdGVcclxuICAgICAgICAgICAgdmFyIG9wdHMgPSBfLmNsb25lKG9wdGlvbnMpO1xyXG4gICAgICAgICAgICBvcHRzLnN0b3JlID0gZW5kcG9pbnQubG9jYWxTdG9yZTtcclxuICAgICAgICAgICAgb3B0cy5lbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRzLnN1Y2Nlc3M7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRzLmVycm9yO1xyXG4gICAgICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKG1ldGhvZCwgbW9kZWwsIG9wdHMpLnRoZW4oKHJlc3ApID0+IHtcclxuICAgICAgICAgICAgICAvLyBiYWNrYm9uZSBzdWNjZXNzIGNhbGxiYWNrIGFsdGVycyB0aGUgY29sbGVjdGlvbiBub3dcclxuICAgICAgICAgICAgICByZXNwID0gdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3ApIHx8IHJlc3A7XHJcbiAgICAgICAgICAgICAgaWYgKGVuZHBvaW50LnNvY2tldCB8fCBvcHRpb25zLmZldGNoTW9kZSA9PT0gJ2xvY2FsJykge1xyXG4gICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmZXRjaCBjaGFuZ2VzIGFzIHdlIGdvdCBhIHdlYnNvY2tldCwgdGhhdCBpcyBlaXRoZXIgY29ubmVjdGVkIG9yIGF0dGVtcHRzIHJlY29ubmVjdGlvblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyB3aGVuIHdlIGFyZSBkaXNjb25uZWN0ZWQsIHRyeSB0byBjb25uZWN0IG5vd1xyXG4gICAgICAgICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoU2VydmVySW5mbyhlbmRwb2ludCkudGhlbigoaW5mbyk6IGFueSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXHJcbiAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcclxuICAgICAgICAgICAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IGluZm87XHJcbiAgICAgICAgICAgICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxyXG4gICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBRLlByb21pc2U8dm9pZD47XHJcbiAgICAgICAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCByZXNwO1xyXG4gICAgICAgICAgICAgICAgfSkudGhlblJlc29sdmUocmVzcCk7XHJcbiAgICAgICAgICAgICAgfSAvLyBlbHNlLi4uXHJcblxyXG4gICAgICAgICAgICAgIC8vIGxvYWQgY2hhbmdlcyBvbmx5ICh3aWxsIGhhcHBlbiBBRlRFUiBzdWNjZXNzIGNhbGxiYWNrIGlzIGludm9rZWQsXHJcbiAgICAgICAgICAgICAgLy8gYnV0IHJldHVybmVkIHByb21pc2Ugd2lsbCByZXNvbHZlIG9ubHkgYWZ0ZXIgY2hhbmdlcyB3ZXJlIHByb2Nlc3NlZC5cclxuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQpLmNhdGNoKCh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KSB8fCByZXNwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxyXG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgeGhyLCBtb2RlbCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzcDtcclxuICAgICAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTsgLy8gY2FsbGVyIGV4cGVjdHMgb3JpZ2luYWwgWEhSIHJlc3BvbnNlIGFzIGNoYW5nZXMgYm9keSBkYXRhIGlzIE5PVCBjb21wYXRpYmxlXHJcbiAgICAgICAgICAgIH0sICgpID0+IHtcclxuICAgICAgICAgICAgICAvLyBmYWxsLWJhY2sgdG8gbG9hZGluZyBmdWxsIGRhdGEgc2V0XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBkbyBiYWNrYm9uZSByZXN0XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5fYWRkTWVzc2FnZShtZXRob2QsIG1vZGVsLCBvcHRpb25zLCBlbmRwb2ludCk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIF9hZGRNZXNzYWdlKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgdmFyIGNoYW5nZXMgPSAoPE1vZGVsPm1vZGVsKS5jaGFuZ2VkU2luY2VTeW5jO1xyXG4gICAgdmFyIGRhdGE6IGFueSA9IG51bGw7XHJcbiAgICB2YXIgc3RvcmVNc2cgPSB0cnVlO1xyXG4gICAgc3dpdGNoIChtZXRob2QpIHtcclxuICAgICAgY2FzZSAndXBkYXRlJzpcclxuICAgICAgY2FzZSAnY3JlYXRlJzpcclxuICAgICAgICBkYXRhID0gb3B0aW9ucy5hdHRycyB8fCBtb2RlbC50b0pTT04oKTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ3BhdGNoJzpcclxuICAgICAgICBpZiAoXy5pc0VtcHR5KGNoYW5nZXMpKSB7XHJcbiAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRhdGEgPSBtb2RlbC50b0pTT04oe1xyXG4gICAgICAgICAgYXR0cnM6IGNoYW5nZXNcclxuICAgICAgICB9KTtcclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ2RlbGV0ZSc6XHJcbiAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICBkZWZhdWx0OlxyXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0ICgoKSA9PiBtZXRob2QgPT09ICdyZWFkJywgJ3Vua25vd24gbWV0aG9kOiAnICsgbWV0aG9kKTtcclxuICAgICAgICBzdG9yZU1zZyA9IGZhbHNlO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gICAgbGV0IGVudGl0eSA9IG1vZGVsLmVudGl0eSB8fCBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC5lbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSk7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbnRpdHkuaW5kZXhPZignficpIDwgMCwgJ2VudGl0eSBuYW1lIG11c3Qgbm90IGNvbnRhaW4gYSB+IGNoYXJhY3RlciEnKTtcclxuICAgIHZhciBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IHtcclxuICAgICAgX2lkOiBlbnRpdHkgKyAnficgKyAoPE1vZGVsPm1vZGVsKS5pZCxcclxuICAgICAgaWQ6ICg8TW9kZWw+bW9kZWwpLmlkLFxyXG4gICAgICBtZXRob2Q6IG1ldGhvZCxcclxuICAgICAgZGF0YTogZGF0YSxcclxuICAgICAgLy8gY2hhbm5lbDogZW5kcG9pbnQuY2hhbm5lbCwgLy8gY2hhbm5lbCBpcyBoYWNrZWQgaW4gYnkgc3RvcmVNZXNzYWdlKCksIHdlIGRvbid0IHdhbnQgdG8gdXNlIHRoaXMgYW55bW9yZVxyXG4gICAgICBwcmlvcml0eTogZW5kcG9pbnQucHJpb3JpdHksXHJcbiAgICAgIHRpbWU6IERhdGUubm93KClcclxuICAgIH07XHJcblxyXG4gICAgdmFyIHEgPSBRLnJlc29sdmUobXNnKTtcclxuICAgIHZhciBxTWVzc2FnZTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPjtcclxuICAgIGlmIChzdG9yZU1zZykge1xyXG4gICAgICAvLyBzdG9yZSBhbmQgcG90ZW50aWFsbHkgbWVyZ2UgbWVzc2FnZVxyXG4gICAgICBxTWVzc2FnZSA9IHRoaXMuc3RvcmVNZXNzYWdlKGVuZHBvaW50LCBxKTtcclxuICAgICAgcSA9IHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XHJcbiAgICAgICAgLy8gaW4gY2FzZSBvZiBtZXJnaW5nLCB0aGlzIHJlc3VsdCBjb3VsZCBiZSBkaWZmZXJlbnRcclxuICAgICAgICByZXR1cm4gbWVzc2FnZS5hdHRyaWJ1dGVzO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBxLnRoZW4oKG1zZzI6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xyXG4gICAgICAvLyBwYXNzIGluIHFNZXNzYWdlIHNvIHRoYXQgZGVsZXRpb24gb2Ygc3RvcmVkIG1lc3NhZ2UgY2FuIGJlIHNjaGVkdWxlZFxyXG4gICAgICByZXR1cm4gdGhpcy5fZW1pdE1lc3NhZ2UoZW5kcG9pbnQsIG1zZzIsIG9wdGlvbnMsIG1vZGVsLCBxTWVzc2FnZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2VtaXRNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOlxyXG4gIFEuUHJvbWlzZTxhbnk+IHtcclxuICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcclxuICAgIHZhciBxQWpheCA9IHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcclxuICAgIHZhciBxID0gcUFqYXg7XHJcblxyXG4gICAgaWYgKHFNZXNzYWdlKSB7XHJcbiAgICAgIC8vIGZvbGxvd2luZyB0YWtlcyBjYXJlIG9mIG9mZmxpbmUgY2hhbmdlIHN0b3JlXHJcbiAgICAgIHEgPSBxLnRoZW4oKGRhdGEpID0+IHtcclxuICAgICAgICAvLyBzdWNjZXNzLCByZW1vdmUgbWVzc2FnZSBzdG9yZWQsIGlmIGFueVxyXG4gICAgICAgIHJldHVybiB0aGlzLnJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcU1lc3NhZ2UpLmNhdGNoKChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXHJcbiAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICB9KS50aGVuUmVzb2x2ZShkYXRhKTsgLy8gcmVzb2x2ZSBhZ2FpbiB5aWVsZGluZyBkYXRhXHJcbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAvLyBmYWlsdXJlIGV2ZW50dWFsbHkgY2F1Z2h0IGJ5IG9mZmxpbmUgY2hhbmdlc1xyXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgdGhpcy51c2VPZmZsaW5lQ2hhbmdlcykge1xyXG4gICAgICAgICAgLy8gdGhpcyBzZWFtcyB0byBiZSBvbmx5IGEgY29ubmVjdGlvbiBwcm9ibGVtLCBzbyB3ZSBrZWVwIHRoZSBtZXNzYWdlIGFuZCBjYWxsIHN1Y2Nlc3NcclxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLmRhdGEpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAvLyByZW1vdmUgbWVzc2FnZSBzdG9yZWQgYW5kIGtlZXAgcmVqZWN0aW9uIGFzIGlzXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXHJcbiAgICAgICAgICAgIHJldHVybiB4aHI7XHJcbiAgICAgICAgICB9KS50aGVuUmVqZWN0KHhocik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBxID0gdGhpcy5fYXBwbHlSZXNwb25zZShxLCBlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XHJcblxyXG4gICAgcmV0dXJuIHEuZmluYWxseSgoKSA9PiB7XHJcbiAgICAgIC8vIGRvIHNvbWUgY29ubmVjdGlvbiBoYW5kbGluZ1xyXG4gICAgICByZXR1cm4gcUFqYXgudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gdHJpZ2dlciByZWNvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcclxuICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxyXG4gICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfYWpheE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcclxuICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPGFueT4ge1xyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcbiAgICBkZWxldGUgb3B0aW9ucy54aHI7IC8vIG1ha2Ugc3VyZSBub3QgdG8gdXNlIG9sZCB2YWx1ZVxyXG5cclxuICAgIHZhciB1cmwgPSBvcHRpb25zLnVybDtcclxuICAgIGlmICghdXJsKSB7XHJcbiAgICAgIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XHJcbiAgICAgIGlmIChtc2cuaWQgJiYgbXNnLm1ldGhvZCAhPT0gJ2NyZWF0ZScpIHtcclxuICAgICAgICAvLyBhZGQgSUQgb2YgbW9kZWxcclxuICAgICAgICB1cmwgKz0gKHVybC5jaGFyQXQodXJsLmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbXNnLmlkO1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xyXG4gICAgICAgIC8vIGFkZCBxdWVyeSBvZiBjb2xsZWN0aW9uXHJcbiAgICAgICAgdmFyIGNvbGxlY3Rpb25VcmwgPSBfLmlzRnVuY3Rpb24obW9kZWwudXJsKSA/IG1vZGVsLnVybCgpIDogbW9kZWwudXJsO1xyXG4gICAgICAgIHZhciBxdWVyeUluZGV4ID0gY29sbGVjdGlvblVybC5sYXN0SW5kZXhPZignPycpO1xyXG4gICAgICAgIHZhciBnZXRRdWVyeSA9IG5ldyBHZXRRdWVyeSgpLmZyb21KU09OKG9wdGlvbnMpO1xyXG4gICAgICAgIC8vIGN1cnJlbnRseSBvbmx5IHNvcnRPcmRlciBjYW4gYmUgc3VwcG9ydGVkIGFzIHdlIHJlcXVpcmUgdGhlIGluaXRpYWwgZGF0YSBsb2FkIHRvIHlpZWxkIGZ1bGwgZGF0YXNldFxyXG4gICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gbnVsbDtcclxuICAgICAgICBnZXRRdWVyeS5vZmZzZXQgPSBudWxsO1xyXG4gICAgICAgIGdldFF1ZXJ5LmZpbHRlciA9IG51bGw7XHJcbiAgICAgICAgZ2V0UXVlcnkuZmllbGRzID0gbnVsbDtcclxuICAgICAgICB2YXIgZ2V0UGFyYW1zID0gZ2V0UXVlcnkudG9RdWVyeVBhcmFtcygpO1xyXG4gICAgICAgIGlmIChxdWVyeUluZGV4ID49IDApIHtcclxuICAgICAgICAgIHVybCArPSBjb2xsZWN0aW9uVXJsLnN1YnN0cihxdWVyeUluZGV4KTtcclxuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcclxuICAgICAgICAgICAgdXJsICs9ICcmJyArIGdldFBhcmFtcztcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgaWYgKGdldFBhcmFtcykge1xyXG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgZ2V0UGFyYW1zO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIGVhcmxpZXN0IHBvaW50IHdoZXJlIHRhcmdldCBVUkwgaXMga25vd25cclxuICAgIGRpYWcuZGVidWcuZGVidWcoJ2FqYXhNZXNzYWdlICcgKyBtc2cubWV0aG9kICsgJyAnICsgdXJsKTtcclxuICAgIHZhciBvcHRzOiBhbnkgPSB7XHJcbiAgICAgIC8vIG11c3Qgbm90IHRha2UgYXJiaXRyYXJ5IG9wdGlvbnMgYXMgdGhlc2Ugd29uJ3QgYmUgcmVwbGF5ZWQgb24gcmVjb25uZWN0XHJcbiAgICAgIHVybDogdXJsLFxyXG4gICAgICBhdHRyczogbXNnLmRhdGEsXHJcbiAgICAgIHN0b3JlOiB7fSwgLy8gZW5zdXJlcyBuZXR3b3JrIGlzIHVzZWRcclxuICAgICAgY3JlZGVudGlhbHM6IG9wdGlvbnMuY3JlZGVudGlhbHMsXHJcbiAgICAgIC8vIGVycm9yIHByb3BhZ2F0aW9uXHJcbiAgICAgIGVycm9yOiBvcHRpb25zLmVycm9yXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCB3cm9uZyBzZXJ2ZXIgYW5kIHVzZXIgaWRlbnRpdHlcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHdlYi5yZXNvbHZlU2VydmVyKHVybCwge1xyXG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXHJcbiAgICB9KSA9PT0gdGhpcy5zZXJ2ZXJVcmwpO1xyXG4gICAgaWYgKHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZSh0aGlzLnNlcnZlclVybCkuYXV0aG9yaXphdGlvbi5uYW1lICE9PSB0aGlzLnVzZXJVdWlkKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcclxuICAgICAgY29uc3QgZXJyb3I6IHdlYi5IdHRwRXJyb3IgPSBuZXcgRXJyb3IoKTtcclxuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcclxuICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0cywgZXJyb3IpIHx8IFEucmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBhY3R1YWwgYWpheCByZXF1ZXN0IHZpYSBiYWNrYm9uZS5qc1xyXG4gICAgcmV0dXJuIHRoaXMuY2hlY2tTZXJ2ZXIodXJsLCBvcHRzKS50aGVuKCgpID0+IHtcclxuICAgICAgcmV0dXJuIG1vZGVsLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIG9wdHMpLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICAgIC8vIHRha2Ugb3ZlciB4aHIgcmVzb2x2aW5nIHRoZSBvcHRpb25zIGNvcHlcclxuICAgICAgICBvcHRpb25zLnhociA9IG9wdHMueGhyLnhociB8fCBvcHRzLnhocjtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgX2FwcGx5UmVzcG9uc2U8VD4ocVhIUjogUS5Qcm9taXNlPFQ+LCBlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IGFueSwgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxUPiB7XHJcbiAgICAvLyB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XHJcbiAgICB2YXIgY2xpZW50VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG4gICAgcmV0dXJuIHFYSFIudGhlbigoZGF0YTogVCB8IGFueSkgPT4ge1xyXG4gICAgICAvLyBkZWxldGUgb24gc2VydmVyIGRvZXMgbm90IHJlc3BvbmQgYSBib2R5XHJcbiAgICAgIGlmICghZGF0YSAmJiBtc2cubWV0aG9kID09PSAnZGVsZXRlJykge1xyXG4gICAgICAgIGRhdGEgPSBtc2cuZGF0YTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gdXBkYXRlIGxvY2FsIHN0b3JlIHN0YXRlXHJcbiAgICAgIGlmIChkYXRhKSB7XHJcbiAgICAgICAgLy8gbm8gZGF0YSBpZiBzZXJ2ZXIgYXNrcyBub3QgdG8gYWx0ZXIgc3RhdGVcclxuICAgICAgICAvLyB0aGlzLnNldFRpbWVzdGFtcChjaGFubmVsLCBtc2cudGltZSk7XHJcbiAgICAgICAgdmFyIHByb21pc2VzOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPltdID0gW107XHJcbiAgICAgICAgdmFyIGRhdGFJZHM6IGFueTsgLy8gbW9kZWwgaWQgLT4gYXR0cmlidXRlcyBkYXRhXHJcbiAgICAgICAgaWYgKG1zZy5tZXRob2QgIT09ICdyZWFkJykge1xyXG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgZGF0YSA9PT0gbXNnLmRhdGEgPyBtc2cgOiA8TGl2ZURhdGFNZXNzYWdlPl8uZGVmYXVsdHMoe1xyXG4gICAgICAgICAgICBkYXRhOiBkYXRhIC8vIGp1c3QgYWNjZXB0cyBuZXcgZGF0YVxyXG4gICAgICAgICAgfSwgbXNnKSkpKTtcclxuICAgICAgICB9IGVsc2UgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xyXG4gICAgICAgICAgLy8gc3luY2hyb25pemUgdGhlIGNvbGxlY3Rpb24gY29udGVudHMgd2l0aCB0aGUgZGF0YSByZWFkXHJcbiAgICAgICAgICB2YXIgc3luY0lkcyA9IHt9O1xyXG4gICAgICAgICAgbW9kZWwubW9kZWxzLmZvckVhY2goKG0pID0+IHtcclxuICAgICAgICAgICAgc3luY0lkc1ttLmlkXSA9IG07XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIGRhdGFJZHMgPSB7fTtcclxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZDogYW55KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChkKSB7XHJcbiAgICAgICAgICAgICAgdmFyIGlkID0gZFtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkLl9pZDtcclxuICAgICAgICAgICAgICBkYXRhSWRzW2lkXSA9IGQ7XHJcbiAgICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcclxuICAgICAgICAgICAgICBpZiAobSkge1xyXG4gICAgICAgICAgICAgICAgLy8gdXBkYXRlIHRoZSBpdGVtXHJcbiAgICAgICAgICAgICAgICBkZWxldGUgc3luY0lkc1tpZF07IC8vIHNvIHRoYXQgaXQgaXMgZGVsZXRlZCBiZWxvd1xyXG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzRXF1YWwoXy5waWNrLmNhbGwobSwgbS5hdHRyaWJ1dGVzLCBPYmplY3Qua2V5cyhkKSksIGQpKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIGFib3ZlIGNoZWNrZWQgdGhhdCBhbGwgYXR0cmlidXRlcyBpbiBkIGFyZSBpbiBtIHdpdGggZXF1YWwgdmFsdWVzIGFuZCBmb3VuZCBzb21lIG1pc21hdGNoXHJcbiAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0aG9kOiAndXBkYXRlJyxcclxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkXHJcbiAgICAgICAgICAgICAgICAgIH0pKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSB0aGUgaXRlbVxyXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xyXG4gICAgICAgICAgICAgICAgICBpZDogaWQsXHJcbiAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ2NyZWF0ZScsXHJcbiAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxyXG4gICAgICAgICAgICAgICAgICBkYXRhOiBkXHJcbiAgICAgICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICBPYmplY3Qua2V5cyhzeW5jSWRzKS5mb3JFYWNoKChpZCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBkZWxldGUgdGhlIGl0ZW1cclxuICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcclxuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xyXG4gICAgICAgICAgICAgIGlkOiBpZCxcclxuICAgICAgICAgICAgICBtZXRob2Q6ICdkZWxldGUnLFxyXG4gICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxyXG4gICAgICAgICAgICAgIGRhdGE6IG0uYXR0cmlidXRlc1xyXG4gICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIHRyaWdnZXIgYW4gdXBkYXRlIHRvIGxvYWQgdGhlIGRhdGEgcmVhZFxyXG4gICAgICAgICAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbZGF0YV07XHJcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGRhdGEgPSBhcnJheVtpXTtcclxuICAgICAgICAgICAgaWYgKGRhdGEpIHtcclxuICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XHJcbiAgICAgICAgICAgICAgICBpZDogZGF0YVtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkYXRhLl9pZCxcclxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXHJcbiAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcclxuICAgICAgICAgICAgICAgIGRhdGE6IGRhdGFcclxuICAgICAgICAgICAgICB9KSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBRLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAvLyBkZWxheWVkIHRpbGwgb3BlcmF0aW9ucyBjb21wbGV0ZVxyXG4gICAgICAgICAgaWYgKCFkYXRhSWRzKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKG1vZGVsKSk7XHJcblxyXG4gICAgICAgICAgLy8gd2hlbiBjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIG9ubHkgcGFzcyBkYXRhIG9mIG1vZGVscyB0aGF0IHdlcmUgc3luY2VkIG9uIHRvIHRoZSBzdWNjZXNzIGNhbGxiYWNrLFxyXG4gICAgICAgICAgLy8gYXMgdGhlIGNhbGxiYWNrIHdpbGwgc2V0IHRoZSBtb2RlbHMgYWdhaW4gY2F1c2luZyBvdXIgc29ydGluZyBhbmQgZmlsdGVyaW5nIHRvIGJlIHdpdGhvdXQgZWZmZWN0LlxyXG4gICAgICAgICAgdmFyIHJlc3BvbnNlOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgbGV0IG1vZGVscyA9IGlzQ29sbGVjdGlvbihtb2RlbCkgPyBtb2RlbC5tb2RlbHMgOiBbbW9kZWxdO1xyXG4gICAgICAgICAgZm9yIChsZXQgaSA9IG1vZGVscy5sZW5ndGg7IGktLSA+IDA7ICkge1xyXG4gICAgICAgICAgICB2YXIgbSA9IG1vZGVsc1tpXTtcclxuICAgICAgICAgICAgaWYgKGRhdGFJZHNbbS5pZF0pIHtcclxuICAgICAgICAgICAgICByZXNwb25zZS5wdXNoKG0uYXR0cmlidXRlcyk7XHJcbiAgICAgICAgICAgICAgZGVsZXRlIGRhdGFJZHNbbS5pZF07XHJcbiAgICAgICAgICAgICAgaWYgKGRhdGFJZHMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJldmVyc2UoKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgICAgbGV0IHFUaW1lOiBRLlByb21pc2U8YW55PjtcclxuICAgICAgaWYgKG1zZy5tZXRob2QgPT09ICdyZWFkJyAmJiBpc0NvbGxlY3Rpb24obW9kZWwpKSB7XHJcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCBEYXRlIGhlYWRlciBmcm9tIG9wdGlvbnMueGhyIGluc3RlYWQgb2YgdXNpbmcgY2xpZW50VGltZVxyXG4gICAgICAgIHFUaW1lID0gdGhpcy5zZXRUaW1lc3RhbXAoZW5kcG9pbnQuY2hhbm5lbCwgY2xpZW50VGltZSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcVRpbWUgPSBRLnJlc29sdmUodW5kZWZpbmVkKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcVRpbWUudGhlbigoKSA9PiB7XHJcbiAgICAgICAgLy8gaW52b2tlIHN1Y2Nlc3MgY2FsbGJhY2ssIGlmIGFueVxyXG4gICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xyXG4gICAgICB9KTtcclxuICAgIH0sIChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxyXG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgUS5yZWplY3QoZXJyb3IpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZldGNoQ2hhbmdlcyhlbmRwb2ludDogU3luY0VuZHBvaW50LCBmb3JjZSA9IGZhbHNlKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcclxuICAgIGxldCBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcclxuICAgIGlmICghZW5kcG9pbnQudXJsUm9vdCB8fCAhY2hhbm5lbCkge1xyXG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBsZXQgcHJvbWlzZSA9IGVuZHBvaW50LnByb21pc2VGZXRjaGluZ0NoYW5nZXM7XHJcbiAgICBpZiAocHJvbWlzZSAmJiAhZm9yY2UpIHtcclxuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzIDwgMTAwMCkge1xyXG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcclxuICAgICAgICBkaWFnLmRlYnVnLndhcm5pbmcoY2hhbm5lbCArICcgc2tpcHBpbmcgY2hhbmdlcyByZXF1ZXN0Li4uJyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5nZXRUaW1lc3RhbXAoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xyXG4gICAgICBpZiAoIXRpbWUpIHtcclxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKGNoYW5uZWwgKyAnIGNhbiBub3QgZmV0Y2ggY2hhbmdlcyBhdCB0aGlzIHRpbWUhJyk7XHJcbiAgICAgICAgcmV0dXJuIHByb21pc2UgfHwgUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIGluaXRpYXRlIGEgbmV3IHJlcXVlc3QgZm9yIGNoYW5nZXNcclxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKGNoYW5uZWwgKyAnIGluaXRpYXRpbmcgY2hhbmdlcyByZXF1ZXN0Li4uJyk7XHJcbiAgICAgIGxldCBjaGFuZ2VzOiBDb2xsZWN0aW9uID0gbmV3ICg8YW55PnRoaXMubWVzc2FnZXMpLmNvbnN0cnVjdG9yKCk7XHJcbiAgICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKGVuZHBvaW50LnVybFJvb3QgKyAnY2hhbmdlcy8nICsgdGltZSkudGhlbigodXJsKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIFEoY2hhbmdlcy5mZXRjaCg8QmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucz57XHJcbiAgICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICAgIHN0b3JlOiB7fSwgLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcclxuXHJcbiAgICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBvcHRpb25zLnhocjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoY2hhbmdlcy5tb2RlbHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICByZXR1cm4gUS5hbGwoY2hhbmdlcy5tYXAoKGNoYW5nZSkgPT4ge1xyXG4gICAgICAgICAgICAgIGxldCBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IGNoYW5nZS5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgIHJldHVybiB0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgbXNnKSk7XHJcbiAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGZvbGxvd2luZyBzaG91bGQgdXNlIHNlcnZlciB0aW1lIVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRUaW1lc3RhbXAoY2hhbm5lbCwgbm93KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KS50aGVuUmVzb2x2ZShjaGFuZ2VzKTtcclxuICAgICAgfSk7XHJcbiAgICAgIGVuZHBvaW50LnByb21pc2VGZXRjaGluZ0NoYW5nZXMgPSBwcm9taXNlO1xyXG4gICAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ0NoYW5nZXMgPSBub3c7XHJcbiAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZldGNoU2VydmVySW5mbyhlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPE1vZGVsPiB7XHJcbiAgICB2YXIgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIHZhciBwcm9taXNlID0gZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nU2VydmVySW5mbztcclxuICAgIGlmIChwcm9taXNlKSB7XHJcbiAgICAgIGlmIChwcm9taXNlLmlzUGVuZGluZygpIHx8IG5vdyAtIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA8IDEwMDApIHtcclxuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGVuZHBvaW50LmNoYW5uZWwgKyAnIHNraXBwaW5nIGluZm8gcmVxdWVzdC4uLicpO1xyXG4gICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIGluZm8gPSBuZXcgTW9kZWwoKTtcclxuICAgIHZhciB1cmwgPSBlbmRwb2ludC51cmxSb290O1xyXG4gICAgaWYgKHVybC5jaGFyQXQoKHVybC5sZW5ndGggLSAxKSkgIT09ICcvJykge1xyXG4gICAgICB1cmwgKz0gJy8nO1xyXG4gICAgfVxyXG4gICAgcHJvbWlzZSA9IHRoaXMuY2hlY2tTZXJ2ZXIodXJsICsgJ2luZm8nKS50aGVuKCh1cmwpID0+IHtcclxuICAgICAgcmV0dXJuIFEoaW5mby5mZXRjaCg8QmFja2JvbmUuTW9kZWxGZXRjaE9wdGlvbnM+KHtcclxuICAgICAgICB1cmw6IHVybCxcclxuICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIH0pKSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAvL0B0b2RvIHdoeSB3ZSBzZXQgYSBzZXJ2ZXIgdGltZSBoZXJlID9cclxuICAgICAgICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChlbmRwb2ludC5jaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghdGltZSAmJiBpbmZvLmdldCgndGltZScpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0VGltZXN0YW1wKGVuZHBvaW50LmNoYW5uZWwsIGluZm8uZ2V0KCd0aW1lJykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aW1lO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICBpZiAoIWVuZHBvaW50LnNvY2tldFBhdGggJiYgaW5mby5nZXQoJ3NvY2tldFBhdGgnKSkge1xyXG4gICAgICAgICAgICBlbmRwb2ludC5zb2NrZXRQYXRoID0gaW5mby5nZXQoJ3NvY2tldFBhdGgnKTtcclxuICAgICAgICAgICAgdmFyIG5hbWUgPSBpbmZvLmdldCgnZW50aXR5JykgfHwgZW5kcG9pbnQuZW50aXR5O1xyXG4gICAgICAgICAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkpIHtcclxuICAgICAgICAgICAgICBlbmRwb2ludC5zb2NrZXQgPSB0aGlzLmNyZWF0ZVNvY2tldChlbmRwb2ludCwgbmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiBpbmZvO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvID0gcHJvbWlzZTtcclxuICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA9IG5vdztcclxuICAgIHJldHVybiBwcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogY2FsbGVkIHdoZW4gYW4gb2ZmbGluZSBjaGFuZ2Ugd2FzIHNlbnQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXHJcbiAgICpcclxuICAgKiA8cD5cclxuICAgKiBNYXkgYmUgb3ZlcndyaXR0ZW4gdG8gYWx0ZXIgY2hhbmdlIG1lc3NhZ2UgZXJyb3IgaGFuZGxpbmcgYmVoYXZpb3IuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIHdpbGwgYXR0ZW1wdFxyXG4gICAqIHJlbG9hZGluZyB0aGUgc2VydmVyIGRhdGEgZm9yIHJlc3RvcmluZyB0aGUgY2xpZW50IHN0YXRlIHN1Y2ggdGhhdCBpdCByZWZsZWN0cyB0aGUgc2VydmVyIHN0YXRlLiBXaGVuIHRoaXNcclxuICAgKiBzdWNjZWVkZWQsIHRoZSBvZmZsaW5lIGNoYW5nZSBpcyBlZmZlY3RpdmVseSByZXZlcnRlZCBhbmQgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGRyb3BwZWQuXHJcbiAgICogPC9wPlxyXG4gICAqIDxwPlxyXG4gICAqIEFuIG92ZXJ3cml0dGVuIGltcGxlbWVudGF0aW9uIG1heSBkZWNpZGVkIHdoZXRoZXIgdG8gcmV2ZXJ0IGZhaWxlZCBjaGFuZ2VzIGJhc2VkIG9uIHRoZSBlcnJvciByZXBvcnRlZC5cclxuICAgKiA8L3A+XHJcbiAgICogPHA+XHJcbiAgICogTm90aWNlLCB0aGUgbWV0aG9kIGlzIG5vdCBjYWxsZWQgd2hlbiB0aGUgb2ZmbGluZSBjaGFuZ2UgZmFpbGVkIGR1ZSB0byBhIGNvbm5lY3Rpdml0eSBpc3N1ZS5cclxuICAgKiA8L3A+XHJcbiAgICpcclxuICAgKiBAcGFyYW0gZXJyb3IgcmVwb3J0ZWQgYnkgcmVtb3RlIHNlcnZlci5cclxuICAgKiBAcGFyYW0gbWVzc2FnZSBjaGFuZ2UgcmVwb3J0ZWQsIGF0dHJpYnV0ZXMgb2YgdHlwZSBMaXZlRGF0YU1lc3NhZ2UuXHJcbiAgICogQHBhcmFtIG9wdGlvbnMgY29udGV4dCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byBhY2Nlc3MgdGhlIGRhdGEgbG9jYWxseSBhcyB3ZWxsIGFzIHJlbW90ZWx5LlxyXG4gICAqIEByZXR1cm4ge2FueX0gUHJvbWlzZSBpbmRpY2F0aW5nIHN1Y2Nlc3MgdG8gZHJvcCB0aGUgY2hhbmdlIG1lc3NhZ2UgYW5kIHByb2NlZWQgd2l0aCB0aGUgbmV4dCBjaGFuZ2UsIG9yXHJcbiAgICogICAgcmVqZWN0aW9uIGluZGljYXRpbmcgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGtlcHQgYW5kIHJldHJpZWQgbGF0ZXIgb24uXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChlcnJvcjogRXJyb3IsIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsLCBvcHRpb25zOiB7XHJcbiAgICBlbnRpdHk6IHN0cmluZyxcclxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxyXG4gICAgdXJsUm9vdDogc3RyaW5nLFxyXG4gICAgbG9jYWxTdG9yZTogU3RvcmUsXHJcbiAgICBzaWxlbnQ/OiBib29sZWFuXHJcbiAgfSk6IFByb21pc2VMaWtlPHZvaWQgfCBhbnk+IHtcclxuICAgIGlmICghZXJyb3IpIHtcclxuICAgICAgLy8gbWVzc2FnZSB3YXMgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseVxyXG4gICAgICBpZiAoIXRoaXMudXNlU29ja2V0Tm90aWZ5KSB7XHJcbiAgICAgICAgLy8gd2hlbiBub3QgdXNpbmcgc29ja2V0cywgZmV0Y2ggY2hhbmdlcyBub3dcclxuICAgICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tvcHRpb25zLmVudGl0eV07XHJcbiAgICAgICAgaWYgKGVuZHBvaW50KSB7XHJcbiAgICAgICAgICAvLyB3aWxsIHB1bGwgdGhlIGNoYW5nZSBjYXVzZWQgYnkgdGhlIG9mZmxpbmUgbWVzc2FnZSBhbmQgdXBkYXRlIHRoZSBtZXNzYWdlIHRpbWUsXHJcbiAgICAgICAgICAvLyBzbyB0aGF0IHdlIGF2b2lkIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlIGNoYW5nZSBjYXVzZWQgYnkgcmVwbGF5aW5nIHRoZSBvZmZsaW5lXHJcbiAgICAgICAgICAvLyBjaGFuZ2UgcmVzdWx0cyBpbiBhIGNvbmZsaWN0IGxhdGVyIG9uLi4uXHJcbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1lc3NhZ2UpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGZhaWxlZCwgZXZlbnR1YWxseSB1bmRvIHRoZSBtb2RpZmljYXRpb25zIHN0b3JlZFxyXG4gICAgaWYgKCFvcHRpb25zLmxvY2FsU3RvcmUpIHtcclxuICAgICAgcmV0dXJuIFEucmVqZWN0KGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyByZXZlcnQgbW9kaWZpY2F0aW9uIGJ5IHJlbG9hZGluZyBkYXRhXHJcbiAgICBsZXQgbW9kZWxUeXBlID0gb3B0aW9ucy5tb2RlbFR5cGUgfHwgTW9kZWw7XHJcbiAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1lc3NhZ2UuZ2V0KCdkYXRhJyksIHtcclxuICAgICAgZW50aXR5OiBvcHRpb25zLmVudGl0eVxyXG4gICAgfSk7XHJcbiAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XHJcbiAgICBsZXQgdHJpZ2dlckVycm9yID0gKCkgPT4ge1xyXG4gICAgICAvLyBpbmZvcm0gY2xpZW50IGFwcGxpY2F0aW9uIG9mIHRoZSBvZmZsaW5lIGNoYW5nZXMgZXJyb3JcclxuICAgICAgbGV0IGNoYW5uZWwgPSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpO1xyXG4gICAgICBkaWFnLmRlYnVnLmVycm9yKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUucHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0OiB0cmlnZ2VyaW5nIGVycm9yIGZvciBjaGFubmVsICcgKyBjaGFubmVsICsgJyBvbiBzdG9yZScsIGVycm9yKTtcclxuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xyXG4gICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBsZXQgbG9jYWxPcHRpb25zID0ge1xyXG4gICAgICAvLyBqdXN0IGFmZmVjdCBsb2NhbCBzdG9yZVxyXG4gICAgICBzdG9yZTogb3B0aW9ucy5sb2NhbFN0b3JlXHJcbiAgICB9O1xyXG4gICAgbGV0IHJlbW90ZU9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgdXJsUm9vdDogb3B0aW9ucy51cmxSb290LFxyXG4gICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcclxuICAgIH07XHJcbiAgICBpZiAobW9kZWwuaWQpIHtcclxuICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcclxuICAgICAgLy8gZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwudXJsKCkgPT09IHJlbW90ZU9wdGlvbnMudXJsKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGNyZWF0aW9uIGZhaWxlZCwganVzdCBkZWxldGUgbG9jYWxseVxyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtZXNzYWdlLmdldCgnbWV0aG9kJykgPT09ICdjcmVhdGUnKTtcclxuICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gKDxRLlByb21pc2U8YW55Pj48YW55Pm1vZGVsLmZldGNoKHJlbW90ZU9wdGlvbnMpKS50aGVuKChkYXRhKSA9PiB7XHJcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSByZWxvYWRlZCB0aGUgZGF0YSB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMsIHdoaWNoIHN1Y2NlZWRlZC4uLlxyXG4gICAgICByZXR1cm4gbW9kZWwuc2F2ZShkYXRhLCBsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcclxuICAgIH0sIChmZXRjaFJlc3A6IHdlYi5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHRyaWVkIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucyBieSByZWxvYWRpbmcgdGhlIGRhdGEsIHdoaWNoIGZhaWxlZCBhcyB3ZWxsLi4uXHJcbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBmZXRjaFJlc3AgJiYgZmV0Y2hSZXNwLnN0YXR1c0NvZGU7XHJcbiAgICAgIHN3aXRjaCAoc3RhdHVzQ29kZSkge1xyXG4gICAgICAgIGNhc2UgNDA0OiAvLyBOT1QgRk9VTkRcclxuICAgICAgICBjYXNlIDQwMTogLy8gVU5BVVRIT1JJWkVEXHJcbiAgICAgICAgY2FzZSA0MTA6IC8vIEdPTkUqXHJcbiAgICAgICAgICAvLyAuLi5iZWNhdXNlIHRoZSBpdGVtIGlzIGdvbmUgYnkgbm93LCBtYXliZSBzb21lb25lIGVsc2UgY2hhbmdlZCBpdCB0byBiZSBkZWxldGVkXHJcbiAgICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpOyAvLyBzaWxlbnQgcmVnYXJkaW5nIHRyaWdnZXJFcnJvclxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZmV0Y2hSZXNwKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogZmVlZHMgcGVuZGluZyBvZmZsaW5lICNtZXNzYWdlcyB0byB0aGUgcmVtb3RlIHNlcnZlci5cclxuICAgKlxyXG4gICAqIDxwPlxyXG4gICAqIER1ZSB0byBjbGllbnQgY29kZSBzZXR0aW5nIHVwIG1vZGVscyBvbmUgYXQgYSB0aW1lLCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGluaXRpYWwgc2V0dXAgb2ZcclxuICAgKiAjZW5kcG9pbnRzLiBUaGUgZmlyc3QgY2FsbCBmZXRjaGVzIHBlbmRpbmcgb2ZmbGluZSAjbWVzc2FnZXMsIG9yZGVyZWQgYnkgcHJpb3JpdHkgYW5kIHRpbWUuIFRoZW4gdGhlICNtZXNzYWdlc1xyXG4gICAqIGFyZSBzZW5kIHRvIHRoZSByZW1vdGUgc2VydmVyIHVudGlsIGRlcGxldGVkLCBhbiBlcnJvciBvY2N1cnMsIG9yIHNvbWUgbWlzc2luZyBlbmRwb2ludCBpcyBlbmNvdW50ZWQuXHJcbiAgICogPC9wPlxyXG4gICAqIDxwPlxyXG4gICAqIFRoZSBtZXRob2QgaXMgdHJpZ2dlcmVkIGVhY2ggdGltZSBhbiBlbmRwb2ludCBpcyByZWdpc3RlcmVkLCBvciBzdGF0ZSBjaGFuZ2VzIHRvIG9ubGluZSBmb3IgYW55IGVuZHBvaW50LiBXaGVuXHJcbiAgICogc3RhdGUgY2hhbmdlcyBmcm9tIG9mZmxpbmUgdG8gb25saW5lIChkaXNyZWdhcmRpbmcgZW5kcG9pbnQpIG1lc3NhZ2Ugc3VibWlzc2lvbiBpcyByZXN0YXJ0ZWQgYnkgcmVzZXR0aW5nIHRoZVxyXG4gICAqICNtZXNzYWdlc1Byb21pc2UuIE90aGVyd2lzZSwgc3Vic2VxdWVudCBjYWxscyBjaGFpbiB0byB0aGUgZW5kIG9mICNtZXNzYWdlc1Byb21pc2UuXHJcbiAgICogPC9wPlxyXG4gICAqXHJcbiAgICogQHJldHVybiB7UHJvbWlzZX0gb2YgI21lc3NhZ2VzIENvbGxlY3Rpb24sIG9yIGxhc3QgcmVjZW50IG9mZmxpbmUgcmVqZWN0aW9uXHJcbiAgICogQHByaXZhdGVcclxuICAgKi9cclxuICBwcml2YXRlIF9zZW5kTWVzc2FnZXMoKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcclxuICAgIC8vIG5vdCByZWFkeSB5ZXRcclxuICAgIGlmICghdGhpcy5tZXNzYWdlcykge1xyXG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gcHJvY2Vzc2VzIG1lc3NhZ2VzIHVudGlsIG5vbmUgbGVmdCwgaGl0dGluZyBhIG1lc3NhZ2Ugb2YgYSBub3QgeWV0IHJlZ2lzdGVyZWQgZW5kcG9pbnQsIG9yIGVudGVyaW5nXHJcbiAgICAvLyBhIG5vbi1yZWNvdmVyYWJsZSBlcnJvci4gVGhlIHByb21pc2UgcmV0dXJuZWQgcmVzb2x2ZXMgdG8gdGhpcy5tZXNzYWdlcyB3aGVuIGRvbmUuXHJcbiAgICBsZXQgbmV4dE1lc3NhZ2UgPSAoKTogYW55ID0+IHtcclxuICAgICAgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBsZXQgbWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsc1swXTtcclxuICAgICAgbGV0IGVudGl0eSA9IG1lc3NhZ2UuaWQuc3Vic3RyKDAsIG1lc3NhZ2UuaWQuaW5kZXhPZignficpKTtcclxuICAgICAgaWYgKCFlbnRpdHkpIHtcclxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdzZW5kTWVzc2FnZSAnICsgbWVzc2FnZS5pZCArICcgd2l0aCBubyBlbnRpdHkhJyk7XHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpLnRoZW4obmV4dE1lc3NhZ2UpO1xyXG4gICAgICB9XHJcbiAgICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW2VudGl0eV07XHJcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcclxuICAgICAgfVxyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC5jaGFubmVsID09PSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpLCAnY2hhbm5lbCBvZiBlbmRwb2ludCAnICsgZW5kcG9pbnQuY2hhbm5lbCArICcgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCBvZiBtZXNzYWdlICcgKyBtZXNzYWdlLmdldCgnY2hhbm5lbCcpKTtcclxuICAgICAgbGV0IG1zZyA9IHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1lc3NhZ2UuYXR0cmlidXRlcyk7XHJcblxyXG4gICAgICBsZXQgbW9kZWxUeXBlID0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IE1vZGVsO1xyXG4gICAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1zZy5kYXRhLCB7XHJcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHlcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGVsLmlkID0gbWVzc2FnZS5nZXQoJ21ldGhvZCcpICE9PSAnY3JlYXRlJyAmJiBtZXNzYWdlLmdldCgnaWQnKTtcclxuICAgICAgbGV0IHJlbW90ZU9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxyXG4gICAgICAgIHN0b3JlOiB7fSAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxyXG4gICAgICB9O1xyXG4gICAgICBpZiAobW9kZWwuaWQpIHtcclxuICAgICAgICByZW1vdGVPcHRpb25zLnVybCA9IHJlbW90ZU9wdGlvbnMudXJsUm9vdCArIChyZW1vdGVPcHRpb25zLnVybFJvb3QuY2hhckF0KHJlbW90ZU9wdGlvbnMudXJsUm9vdC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1vZGVsLmlkO1xyXG4gICAgICAgIC8vIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLnVybCgpID09PSByZW1vdGVPcHRpb25zLnVybCk7XHJcbiAgICAgIH1cclxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZW5kTWVzc2FnZSAnICsgbW9kZWwuaWQpO1xyXG4gICAgICBsZXQgb2ZmbGluZU9wdGlvbnMgPSB7XHJcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHksXHJcbiAgICAgICAgbW9kZWxUeXBlOiBlbmRwb2ludC5tb2RlbFR5cGUsXHJcbiAgICAgICAgdXJsUm9vdDogZW5kcG9pbnQudXJsUm9vdCxcclxuICAgICAgICBsb2NhbFN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiB0aGlzLl9hcHBseVJlc3BvbnNlKHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIHJlbW90ZU9wdGlvbnMsIG1vZGVsKSwgZW5kcG9pbnQsIG1zZywgcmVtb3RlT3B0aW9ucywgbW9kZWwpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIC8vIHN1Y2NlZWRlZFxyXG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChudWxsLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucyk7XHJcbiAgICAgIH0sIChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIGlmIChlcnJvci5zdGF0dXNDb2RlKSB7XHJcbiAgICAgICAgICAvLyByZW1vdGUgZmFpbGVkXHJcbiAgICAgICAgICByZXR1cm4gUSh0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChlcnJvciwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpKS5jYXRjaCgoZXJyb3IyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZGlzY29ubmVjdCBkdWUgdG8gZXJyb3IgaW4gZW5kcG9pbnRcclxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCkudGhlblJlamVjdChlcnJvcjIpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIGNvbm5lY3Rpdml0eSBpc3N1ZSwga2VlcCByZWplY3Rpb25cclxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBhcHBseWluZyBjaGFuZ2Ugc3VjY2VlZGVkIG9yIHN1Y2Nlc3NmdWxseSByZWNvdmVyZWQgY2hhbmdlXHJcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpO1xyXG4gICAgICB9KS50aGVuKG5leHRNZXNzYWdlKTtcclxuICAgIH07XHJcblxyXG4gICAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuX3NlbmRNZXNzYWdlcycpO1xyXG4gICAgbGV0IHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcclxuICAgIGlmICghcSkge1xyXG4gICAgICAvLyBpbml0aWFsbHkgZmV0Y2ggYWxsIG1lc3NhZ2VzXHJcbiAgICAgIHEgPSBRKHRoaXMubWVzc2FnZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xyXG4gICAgICAgIHNvcnRPcmRlcjogW1xyXG4gICAgICAgICAgJytwcmlvcml0eScsXHJcbiAgICAgICAgICAnK3RpbWUnLFxyXG4gICAgICAgICAgJytpZCdcclxuICAgICAgICBdXHJcbiAgICAgIH0pKTtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UuaXNSZWplY3RlZCgpKSB7XHJcbiAgICAgIC8vIGVhcmx5IHJlamVjdGlvblxyXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XHJcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xyXG4gICAgICAvLyBubyBtb3JlIG1lc3NhZ2VzXHJcbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBraWNrIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlc1xyXG4gICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBxLnRoZW4obmV4dE1lc3NhZ2UpO1xyXG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXNQcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzdG9yZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgcU1zZzogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT4pOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+IHtcclxuICAgIHJldHVybiBxTXNnLnRoZW4oKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XHJcbiAgICAgIGxldCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zO1xyXG4gICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcclxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzdG9yZU1lc3NhZ2UgJyArIGlkKTtcclxuICAgICAgdmFyIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gaWQgJiYgPExpdmVEYXRhTWVzc2FnZU1vZGVsPnRoaXMubWVzc2FnZXMuZ2V0KGlkKTtcclxuICAgICAgaWYgKG1lc3NhZ2UpIHtcclxuICAgICAgICAvLyB1c2UgZXhpc3RpbmcgaW5zdGFuY2UsIHNob3VsZCBub3QgYmUgdGhlIGNhc2UgdXN1YWxseVxyXG4gICAgICAgIG9wdGlvbnMgPSA8QmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucz57XHJcbiAgICAgICAgICBtZXJnZTogdHJ1ZVxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gaW5zdGFudGlhdGUgbmV3IG1vZGVsLCBpbnRlbnRpb25hbGx5IG5vdCBhZGRlZCB0byBjb2xsZWN0aW9uXHJcbiAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKG1zZywge1xyXG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcclxuICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbWVzc2FnZS5zZXQoJ2NoYW5uZWwnLCBlbmRwb2ludC5jaGFubmVsKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gUShtZXNzYWdlLnNhdmUobXNnLCBvcHRpb25zKSkudGhlblJlc29sdmUobWVzc2FnZSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgcmVtb3ZlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOiBRLlByb21pc2U8dm9pZD4ge1xyXG4gICAgcmV0dXJuIHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XHJcbiAgICAgIGlmICghbWVzc2FnZSkge1xyXG4gICAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xyXG4gICAgICAgIGlmICghaWQpIHtcclxuICAgICAgICAgIC8vIG1zZyBpcyBub3QgcGVyc2lzdGVudFxyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSh1bmRlZmluZWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWVzc2FnZSA9IDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XHJcbiAgICAgICAgaWYgKCFtZXNzYWdlKSB7XHJcbiAgICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwoe1xyXG4gICAgICAgICAgICBfaWQ6IG1zZy5faWRcclxuICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcclxuICAgICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgncmVtb3ZlTWVzc2FnZSAnICsgbWVzc2FnZS5pZCk7XHJcbiAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGNsZWFyKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pOiBRLlByb21pc2U8YW55PiB7XHJcbiAgICBpZiAoY29sbGVjdGlvbikge1xyXG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IHRoaXMuZ2V0RW5kcG9pbnQoY29sbGVjdGlvbik7XHJcbiAgICAgIGlmIChlbmRwb2ludCkge1xyXG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2VzKSB7XHJcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmRlc3Ryb3koKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY29sbGVjdGlvbi5yZXNldCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLnNldFRpbWVzdGFtcChlbmRwb2ludC5jaGFubmVsLCAnJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGNsb3NlIHRoZSBzb2NrZXQgZXhwbGljaXRcclxuICAgKi9cclxuICBwdWJsaWMgY2xvc2UoKSB7XHJcbiAgICBpZiAodGhpcy5tZXNzYWdlcy5zdG9yZSkge1xyXG4gICAgICB0aGlzLm1lc3NhZ2VzLnN0b3JlLmNsb3NlKCk7XHJcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLnRpbWVzdGFtcHMgJiYgdGhpcy50aW1lc3RhbXBzLnN0b3JlKSB7XHJcbiAgICAgIHRoaXMudGltZXN0YW1wcy5zdG9yZS5jbG9zZSgpO1xyXG4gICAgICB0aGlzLnRpbWVzdGFtcHMgPSBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcy5lbmRwb2ludHMpO1xyXG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xyXG4gICAgICB0aGlzLmVuZHBvaW50c1trZXlzW2ldXS5jbG9zZSgpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gbWl4aW5zXHJcbmxldCBzeW5jU3RvcmUgPSBfLmV4dGVuZChTeW5jU3RvcmUucHJvdG90eXBlLCB7XHJcbiAgX3R5cGU6ICdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUnLFxyXG5cclxuICBsb2NhbFN0b3JlOiBXZWJTcWxTdG9yZSxcclxuICB1c2VMb2NhbFN0b3JlOiB0cnVlLFxyXG4gIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSxcclxuICB1c2VPZmZsaW5lQ2hhbmdlczogdHJ1ZSxcclxuICBzb2NrZXRQYXRoOiAnJ1xyXG59KTtcclxuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gU3luY1N0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUoc3luY1N0b3JlKSkpO1xyXG4iXX0=