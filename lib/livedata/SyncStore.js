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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxrQ0FBd0QscUJBQXFCLENBQUMsQ0FBQTtBQUM5RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxL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QyxTQUFTLEVBQUU7SUFDNUMsS0FBSyxFQUFFLDZCQUE2QjtJQUVwQyxVQUFVLEVBQUUseUJBQVc7SUFDdkIsYUFBYSxFQUFFLElBQUk7SUFDbkIsZUFBZSxFQUFFLElBQUk7SUFDckIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixVQUFVLEVBQUUsRUFBRTtDQUNmLENBQUMsQ0FBQztBQUNILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQTNELENBQTJELENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xuaW1wb3J0ICogYXMgb2JqZWN0aWQgZnJvbSAnLi4vY29yZS9vYmplY3RpZCc7XG5pbXBvcnQgKiBhcyBzZWN1cml0eSBmcm9tICcuLi9zZWN1cml0eSc7XG5pbXBvcnQgKiBhcyB3ZWIgZnJvbSAnLi4vd2ViJztcblxuaW1wb3J0IHtsb2NhbFN0b3JhZ2V9IGZyb20gJy4uL3dlYi9vZmZsaW5lJztcbmltcG9ydCB7R2V0UXVlcnl9IGZyb20gJy4uL3F1ZXJ5L0dldFF1ZXJ5JztcbmltcG9ydCB7U3RvcmUsIFN0b3JlQ3Rvcn0gZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQge1dlYlNxbFN0b3JlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcbmltcG9ydCB7U3luY0NvbnRleHR9IGZyb20gJy4vU3luY0NvbnRleHQnO1xuaW1wb3J0IHtTeW5jRW5kcG9pbnR9IGZyb20gJy4vU3luY0VuZHBvaW50JztcbmltcG9ydCB7TGl2ZURhdGFNZXNzYWdlLCBMaXZlRGF0YU1lc3NhZ2VNb2RlbH0gZnJvbSAnLi9MaXZlRGF0YU1lc3NhZ2UnO1xuaW1wb3J0IHtMaXZlRGF0YVRpbWVzdGFtcCwgTGl2ZURhdGFUaW1lc3RhbXBNb2RlbH0gZnJvbSAnLi9MaXZlRGF0YVRpbWVzdGFtcCc7XG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3IsIGlzTW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtDb2xsZWN0aW9uLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5cbi8qKlxuICogaW8gb2YgYnJvd3NlciB2aWEgc2NyaXB0IHRhZyBvciB2aWEgcmVxdWlyZSBzb2NrZXQuaW8tY2xpZW50LCBlbnRpcmVseSBvcHRpb25hbC5cbiAqXG4gKiBOb3RpY2UsIHRoaXMgbW9kdWxlIGlzIGVudGlyZWx5IG9wdGlvbmFsIGFzIHRoZSBzdG9yZSBtYXkgb3BlcmF0ZSB3aXRob3V0IGl0IGlmIHNvY2tldFxuICogbm90aWZpY2F0aW9ucyBhcmUgbm90IHVzZWQuXG4gKlxuICogQGludGVybmFsIE5vdCBwdWJsaWMgQVBJLCBleHBvcnRlZCBmb3IgdGVzdGluZyBwdXJwb3NlcyBvbmx5IVxuICovXG5leHBvcnQgY29uc3QgaW86IFNvY2tldElPQ2xpZW50U3RhdGljID0gZ2xvYmFsWydpbyddIHx8IC8vIG5hdGl2ZSBpbXBsZW1lbnRhdGlvblxuICB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJyAmJiAgICAgICAgICAgICAgICAgICAgICAvLyBvciB3aGVuIHJlcXVpcmUgaXMgYXZhaWxhYmxlXG4gICgoZnVuY3Rpb24gcmVxdWlyZVNvY2tldElvKCkgeyAgICAgICAgICAgICAgICAgICAgICAgIC8vIHJlcXVpcmVkIHZlcnNpb25cbiAgICAvLyBoZXJlIHdlIGFyZSBpbiBhbiBpbW1lZGlhdGVseSBpbnZva2VkIGZ1bmN0aW9uIHJlcXVpcmluZyBzb2NrZXQuaW8tY2xpZW50LCBpZiBhdmFpbGFibGVcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIChnbG9iYWxbJ2lvJ10gPSByZXF1aXJlKCdzb2NrZXQuaW8tY2xpZW50JykpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ29wdGlvbmFsIHNvY2tldC5pby1jbGllbnQgbW9kdWxlIGlzIG5vdCBhdmFpbGFibGU6ICcgKyBlcnJvciAmJiBlcnJvci5tZXNzYWdlKTtcbiAgICB9XG4gIH0pKCkpO1xuXG4vKipcbiAqIGNvbm5lY3RzIGEgTW9kZWwvQ29sbGVjdGlvbiB0byBhIFJlbHV0aW9uIHNlcnZlci5cbiAqXG4gKiBUaGlzIHdpbGwgZ2l2ZSB5b3UgYW4gb25saW5lIGFuZCBvZmZsaW5lIHN0b3JlIHdpdGggbGl2ZSBkYXRhIHVwZGF0ZXMuXG4gKlxuICogQGV4YW1wbGVcbiAqXG4gKiAvLyBUaGUgZGVmYXVsdCBjb25maWd1cmF0aW9uIHdpbGwgc2F2ZSB0aGUgY29tcGxldGUgbW9kZWwgZGF0YSBhcyBhIGpzb24sXG4gKiAvLyBhbmQgdGhlIG9mZmxpbmUgY2hhbmdlIGxvZyB0byBhIGxvY2FsIFdlYlNxbCBkYXRhYmFzZSwgc3luY2hyb25pemUgaXRcbiAqIC8vIHRyb3VnaCBSRVNUIGNhbGxzIHdpdGggdGhlIHNlcnZlciBhbmQgcmVjZWl2ZSBsaXZlIHVwZGF0ZXMgdmlhIGEgc29ja2V0LmlvIGNvbm5lY3Rpb24uXG4gKiBjbGFzcyBNeUNvbGxlY3Rpb24gZXh0ZW5kcyBSZWx1dGlvbi5saXZlZGF0YS5Db2xsZWN0aW9uIHt9O1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCA9IE15TW9kZWw7XG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLnVybCA9ICdodHRwOi8vbXlTZXJ2ZXIuaW8vbXlPcmdhL215QXBwbGljYXRpb24vbXlDb2xsZWN0aW9uJztcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlKHtcbiAqICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSwgICAgIC8vIChkZWZhdWx0KSBzdG9yZSB0aGUgZGF0YSBmb3Igb2ZmbGluZSB1c2VcbiAqICAgdXNlU29ja2V0Tm90aWZ5OiB0cnVlLCAgIC8vIChkZWZhdWx0KSByZWdpc3RlciBhdCB0aGUgc2VydmVyIGZvciBsaXZlIHVwZGF0ZXNcbiAqICAgdXNlT2ZmbGluZUNoYW5nZXM6IHRydWUgIC8vIChkZWZhdWx0KSBhbGxvdyBjaGFuZ2VzIHRvIHRoZSBvZmZsaW5lIGRhdGFcbiAqIH0pO1xuICovXG5leHBvcnQgY2xhc3MgU3luY1N0b3JlIGV4dGVuZHMgU3RvcmUge1xuXG4gIC8vIGZvbGxvd2luZyBhcmUgc3RvcmUtc3BlY2lmaWMgb3B0aW9ucywgZGVmYXVsdHMgc3RvcmVkIGluIHByb3RvdHlwZSBhdCBlbmQgb2YgdGhpcyBmaWxlXG4gIHByb3RlY3RlZCBsb2NhbFN0b3JlOiBTdG9yZUN0b3I7XG4gIHByb3RlY3RlZCBsb2NhbFN0b3JlT3B0aW9uczogYW55O1xuICBwcm90ZWN0ZWQgdXNlTG9jYWxTdG9yZTogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHVzZVNvY2tldE5vdGlmeTogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHVzZU9mZmxpbmVDaGFuZ2VzOiBib29sZWFuO1xuICBwcm90ZWN0ZWQgc29ja2V0UGF0aDogc3RyaW5nO1xuICBwcm90ZWN0ZWQgc29ja2V0UXVlcnk6IHN0cmluZztcbiAgcHJvdGVjdGVkIGNyZWRlbnRpYWxzOiBhbnk7XG4gIHByb3RlY3RlZCBvcmRlck9mZmxpbmVDaGFuZ2VzOiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogc2VydmVyIGFzc29jaWF0ZWQgd2l0aCB0aGlzIHN0b3JlLlxuICAgKlxuICAgKiBUaGUgc3luYyBtZXRob2Qgd2lsbCBmYWlsIGVhcmx5IHdoZW4gYmVpbmcgYXBwbGllZCB0byBkYXRhIG9mIHNvbWUgb3RoZXIgc2VydmVyLlxuICAgKi9cbiAgcHJvdGVjdGVkIHNlcnZlclVybDogc3RyaW5nO1xuICAvKipcbiAgICogYXBwbGljYXRpb24gcGFydCB1c2VkIHRvIHJlc29sdmUgVVJMcyBtYXkgb3B0aW9uYWxseSBiZSBzZXQgdXNpbmcgY29uc3RydWN0b3Igb3B0aW9ucy5cbiAgICovXG4gIHByb3RlY3RlZCBhcHBsaWNhdGlvbjogc3RyaW5nO1xuICAvKipcbiAgICogaWRlbnRpdHkgb3IgdXNlciBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdG9yZS5cbiAgICpcbiAgICogVGhlIGFqYXggbWV0aG9kIHdpbGwgc2ltdWxhdGUgYW4gb2ZmbGluZSB0aW1lb3V0IHdoZW4gdGhlIHVzZXIgaWRlbnRpdHkgaXMgY2hhbmdlZC4gVGhpcyBpc1xuICAgKiBiZWNhdXNlIGp1c3Qgb25lIHNlc3Npb24gY2FuIGJlIG1haW50YWluZWQgcGVyIHNlcnZlciBhbmQgbG9naW4vbG9nb3V0IHNlbWFudGljcyBtdXN0IGJlIHdlbGxcbiAgICogYmVoYXZlZC5cbiAgICovXG4gIHByb3RlY3RlZCB1c2VyVXVpZDogc3RyaW5nO1xuXG4gIHB1YmxpYyBlbmRwb2ludHM6IHtcbiAgICAvLyBtYXAgb2YgZW50aXR5IHRvIFN5bmNFbmRwb2ludFxuICAgIFtlbnRpdHk6IHN0cmluZ106IFN5bmNFbmRwb2ludDtcbiAgfSA9IHt9O1xuXG4gIHByaXZhdGUgbGFzdE1lc2dUaW1lOiBhbnk7IC8vIGRlcHJlY2F0ZWQ6IGtlcHQgZm9yIG1pZ3JhdGlvbiBhbmQgYXMgYSBmYWlsc2FmZVxuICBwcml2YXRlIHRpbWVzdGFtcHM6IENvbGxlY3Rpb247XG4gIHByaXZhdGUgdGltZXN0YW1wc1Byb21pc2U6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPjtcblxuICAvKipcbiAgICogd2hlbiBzZXQsIGluZGljYXRlcyB3aGljaCBlbnRpdHkgY2F1c2VkIGEgZGlzY29ubmVjdGlvbi5cbiAgICpcbiAgICogPHA+XG4gICAqIFRoaXMgaXMgc2V0IHRvIGFuIGVudGl0eSBuYW1lIHRvIGxpbWl0IHdoaWNoIGVudGl0eSBtYXkgY2F1c2UgYSBjaGFuZ2UgdG8gb25saW5lIHN0YXRlIGFnYWluLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEB0eXBlIHtzdHJpbmd9XG4gICAqL1xuICBwcml2YXRlIGRpc2Nvbm5lY3RlZEVudGl0eTogc3RyaW5nID0gJ2FsbCc7XG5cbiAgcHVibGljIG1lc3NhZ2VzOiBDb2xsZWN0aW9uO1xuICBwdWJsaWMgbWVzc2FnZXNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XG5cbiAgY29uc3RydWN0b3Iob3B0aW9ucz86IGFueSkge1xuICAgIHN1cGVyKG9wdGlvbnMpO1xuICAgIGlmICh0aGlzLmNyZWRlbnRpYWxzKSB7XG4gICAgICB0aGlzLmNyZWRlbnRpYWxzID0gXy5jbG9uZSh0aGlzLmNyZWRlbnRpYWxzKTtcbiAgICB9XG4gICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpIHtcbiAgICAgIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgIH1cbiAgICBpZiAodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzKSB7XG4gICAgICB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgPSBfLmNsb25lKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcyk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIHR5cGVvZiBpbyAhPT0gJ29iamVjdCcpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybmluZygnU29ja2V0LklPIG5vdCBwcmVzZW50ICEhJyk7XG4gICAgICB0aGlzLnVzZVNvY2tldE5vdGlmeSA9IGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBvdmVyd3JpdHRlbiB0byByZXNvbHZlIHJlbGF0aXZlIFVSTHMgYWdhaW5zdCB0aGUgU3luY1N0b3JlI3NlcnZlclVybC5cbiAgICovXG4gIHByb3RlY3RlZCByZXNvbHZlVXJsKHVybDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHdlYi5yZXNvbHZlVXJsKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybCxcbiAgICAgIGFwcGxpY2F0aW9uOiB0aGlzLmFwcGxpY2F0aW9uXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogYmluZHMgdGhlIHN0b3JlIHRvIGEgdGFyZ2V0IHNlcnZlciB3aGVuIHRoZSBmaXJzdCBlbmRwb2ludCBpcyBjcmVhdGVkLlxuICAgKlxuICAgKiBAcGFyYW0gdXJsUm9vdCB1c2VkIHRvIHJlc29sdmUgdGhlIHNlcnZlciB0byBvcGVyYXRlLlxuICAgICAqL1xuICBwcml2YXRlIGluaXRTZXJ2ZXIodXJsUm9vdDogc3RyaW5nKSB7XG4gICAgbGV0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKHVybFJvb3QsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KTtcbiAgICBpZiAoIXRoaXMuc2VydmVyVXJsKSB7XG4gICAgICBjb25zdCBzZXJ2ZXIgPSBzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgICAgIHRoaXMuc2VydmVyVXJsID0gc2VydmVyVXJsO1xuICAgICAgdGhpcy51c2VyVXVpZCA9IHNlcnZlci5hdXRob3JpemF0aW9uLm5hbWU7XG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiAhdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscykge1xuICAgICAgICAvLyBjYXB0dXJlIGNyZWRlbnRpYWxzIGZvciB1c2UgYnkgY3J5cHRvIHN0b3Jlc1xuICAgICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zLmNyZWRlbnRpYWxzID0gXy5kZWZhdWx0cyh7XG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcbiAgICAgICAgfSwgc2VydmVyLmNyZWRlbnRpYWxzKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHNlcnZlclVybCAhPT0gdGhpcy5zZXJ2ZXJVcmwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignc3RvcmUgaXMgYm91bmQgdG8gc2VydmVyICcgKyB0aGlzLnNlcnZlclVybCArICcgYWxyZWFkeScpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgY2hlY2tTZXJ2ZXIodXJsOiBzdHJpbmcsIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8c3RyaW5nPiB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gd2ViLnJlc29sdmVTZXJ2ZXIodXJsLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkgPT09IHRoaXMuc2VydmVyVXJsKTtcbiAgICBpZiAoc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHRoaXMuc2VydmVyVXJsKS5hdXRob3JpemF0aW9uLm5hbWUgIT09IHRoaXMudXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybigndXNlciBpZGVudGl0eSB3YXMgY2hhbmdlZCwgd29ya2luZyBvZmZsaW5lIHVudGlsIGF1dGhvcml6YXRpb24gaXMgcmVzdG9yZWQnKTtcbiAgICAgIGNvbnN0IGVycm9yOiB3ZWIuSHR0cEVycm9yID0gbmV3IEVycm9yKCk7XG4gICAgICAvLyBpbnZva2UgZXJyb3IgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgcmV0dXJuIG9wdGlvbnMgJiYgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgUS5yZWplY3Q8c3RyaW5nPihlcnJvcik7XG4gICAgfVxuICAgIHJldHVybiBRLnJlc29sdmUodXJsKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpbml0RW5kcG9pbnQobW9kZWxPckNvbGxlY3Rpb246IE1vZGVsIHwgQ29sbGVjdGlvbiwgbW9kZWxUeXBlOiBNb2RlbEN0b3IpOiBTeW5jRW5kcG9pbnQge1xuICAgIGxldCB1cmxSb290ID0gbW9kZWxPckNvbGxlY3Rpb24uZ2V0VXJsUm9vdCgpO1xuICAgIGxldCBlbnRpdHkgPSBtb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHk7XG4gICAgaWYgKHVybFJvb3QgJiYgZW50aXR5KSB7XG4gICAgICAvLyBnZXQgb3IgY3JlYXRlIGVuZHBvaW50IGZvciB0aGlzIHVybFxuICAgICAgdGhpcy5pbml0U2VydmVyKHVybFJvb3QpO1xuICAgICAgdXJsUm9vdCA9IHRoaXMucmVzb2x2ZVVybCh1cmxSb290KTtcbiAgICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW2VudGl0eV07XG4gICAgICBpZiAoIWVuZHBvaW50KSB7XG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmluaXRFbmRwb2ludDogJyArIGVudGl0eSk7XG4gICAgICAgIGVuZHBvaW50ID0gbmV3IFN5bmNFbmRwb2ludCh7XG4gICAgICAgICAgZW50aXR5OiBlbnRpdHksXG4gICAgICAgICAgbW9kZWxUeXBlOiBtb2RlbFR5cGUsXG4gICAgICAgICAgdXJsUm9vdDogdXJsUm9vdCxcbiAgICAgICAgICBzb2NrZXRQYXRoOiB0aGlzLnNvY2tldFBhdGgsXG4gICAgICAgICAgdXNlclV1aWQ6IHRoaXMudXNlclV1aWRcbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuZW5kcG9pbnRzW2VudGl0eV0gPSBlbmRwb2ludDtcblxuICAgICAgICBlbmRwb2ludC5sb2NhbFN0b3JlID0gdGhpcy5jcmVhdGVMb2NhbFN0b3JlKGVuZHBvaW50KTtcbiAgICAgICAgZW5kcG9pbnQucHJpb3JpdHkgPSB0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMgJiYgKF8ubGFzdEluZGV4T2YodGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzLCBlbmRwb2ludC5lbnRpdHkpICsgMSk7XG4gICAgICAgIHRoaXMuY3JlYXRlTXNnQ29sbGVjdGlvbigpO1xuICAgICAgICB0aGlzLmNyZWF0ZVRpbWVzdGFtcENvbGxlY3Rpb24oKTtcbiAgICAgICAgZW5kcG9pbnQuc29ja2V0ID0gdGhpcy5jcmVhdGVTb2NrZXQoZW5kcG9pbnQsIGVudGl0eSk7XG4gICAgICAgIGVuZHBvaW50LmluZm8gPSB0aGlzLmZldGNoU2VydmVySW5mbyhlbmRwb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjb25maWd1cmF0aW9uIGNhbiBub3QgY2hhbmdlLCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQuLi5cbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW5kcG9pbnQudXJsUm9vdCA9PT0gdXJsUm9vdCwgJ2NhbiBub3QgY2hhbmdlIHVybFJvb3QsIG11c3QgcmVjcmVhdGUgc3RvcmUgaW5zdGVhZCEnKTtcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZW5kcG9pbnQudXNlclV1aWQgPT09IHRoaXMudXNlclV1aWQsICdjYW4gbm90IGNoYW5nZSB1c2VyIGlkZW50aXR5LCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQhJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZW5kcG9pbnQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqXG4gICAqIEBpbnRlcm5hbCBBUEkgb25seSB0byBiZSBjYWxsZWQgYnkgTW9kZWwgY29uc3RydWN0b3IuXG4gICAqL1xuICBpbml0TW9kZWwobW9kZWw6IE1vZGVsKTogdm9pZCB7XG4gICAgbW9kZWwuZW5kcG9pbnQgPSB0aGlzLmluaXRFbmRwb2ludChtb2RlbCwgPE1vZGVsQ3Rvcj5tb2RlbC5jb25zdHJ1Y3Rvcik7XG4gIH1cblxuICAvKipcbiAgICogQGluaGVyaXRkb2NcbiAgICpcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IHZvaWQge1xuICAgIGNvbGxlY3Rpb24uZW5kcG9pbnQgPSB0aGlzLmluaXRFbmRwb2ludChjb2xsZWN0aW9uLCBjb2xsZWN0aW9uLm1vZGVsKTtcbiAgfVxuXG4gIGdldEVuZHBvaW50KG1vZGVsT3JDb2xsZWN0aW9uOiBNb2RlbCB8IENvbGxlY3Rpb24pOiBTeW5jRW5kcG9pbnQge1xuICAgIGxldCBlbmRwb2ludCA9IHRoaXMuZW5kcG9pbnRzW21vZGVsT3JDb2xsZWN0aW9uLmVudGl0eV07XG4gICAgaWYgKGVuZHBvaW50KSB7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB7XG4gICAgICAgIC8vIGNoZWNrcyB0aGF0IG1vZGVsT3JDb2xsZWN0aW9uIHVzZXMgYSBtb2RlbCBpbmhlcml0aW5nIGZyb20gdGhlIG9uZSBvZiB0aGUgZW5kcG9pbnRcbiAgICAgICAgbGV0IG1vZGVsVHlwZSA9IGlzQ29sbGVjdGlvbihtb2RlbE9yQ29sbGVjdGlvbikgPyBtb2RlbE9yQ29sbGVjdGlvbi5tb2RlbCA6IG1vZGVsT3JDb2xsZWN0aW9uLmNvbnN0cnVjdG9yO1xuICAgICAgICByZXR1cm4gbW9kZWxUeXBlID09PSBlbmRwb2ludC5tb2RlbFR5cGUgfHwgbW9kZWxUeXBlLnByb3RvdHlwZSBpbnN0YW5jZW9mIGVuZHBvaW50Lm1vZGVsVHlwZTtcbiAgICAgIH0sICd3cm9uZyB0eXBlIG9mIG1vZGVsIScpO1xuICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZUxvY2FsU3RvcmUoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFN0b3JlIHtcbiAgICBpZiAodGhpcy51c2VMb2NhbFN0b3JlKSB7XG4gICAgICB2YXIgZW50aXRpZXMgPSB7fTtcbiAgICAgIGVudGl0aWVzW2VuZHBvaW50LmVudGl0eV0gPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgdmFyIHN0b3JlT3B0aW9uID0ge1xuICAgICAgICBlbnRpdGllczogZW50aXRpZXNcbiAgICAgIH07XG4gICAgICBpZiAodGhpcy5sb2NhbFN0b3JlT3B0aW9ucyAmJiB0eXBlb2YgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgc3RvcmVPcHRpb24gPSBfLmNsb25lKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgICAgICBzdG9yZU9wdGlvbi5lbnRpdGllcyA9IGVudGl0aWVzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG5ldyB0aGlzLmxvY2FsU3RvcmUoc3RvcmVPcHRpb24pO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAZGVzY3JpcHRpb24gSGVyZSB3ZSBzYXZlIHRoZSBjaGFuZ2VzIGluIGEgTWVzc2FnZSBsb2NhbCB3ZWJzcWxcbiAgICogQHJldHVybnMgeyp9XG4gICAqL1xuICBjcmVhdGVNc2dDb2xsZWN0aW9uKCk6IENvbGxlY3Rpb24ge1xuICAgIGlmICh0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzICYmICF0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICB0aGlzLm1lc3NhZ2VzID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XG4gICAgICAgIG1vZGVsOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCxcbiAgICAgICAgc3RvcmU6IG5ldyB0aGlzLmxvY2FsU3RvcmUodGhpcy5sb2NhbFN0b3JlT3B0aW9ucylcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgfVxuXG4gIGNyZWF0ZVRpbWVzdGFtcENvbGxlY3Rpb24oKTogQ29sbGVjdGlvbiB7XG4gICAgaWYgKHRoaXMudXNlTG9jYWxTdG9yZSAmJiAhdGhpcy50aW1lc3RhbXBzKSB7XG4gICAgICB0aGlzLnRpbWVzdGFtcHMgPSBuZXcgQ29sbGVjdGlvbih1bmRlZmluZWQsIHtcbiAgICAgICAgbW9kZWw6IExpdmVEYXRhVGltZXN0YW1wTW9kZWwsXG4gICAgICAgIHN0b3JlOiBuZXcgdGhpcy5sb2NhbFN0b3JlKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMudGltZXN0YW1wcztcbiAgfVxuXG4gIGNyZWF0ZVNvY2tldChlbmRwb2ludDogU3luY0VuZHBvaW50LCBuYW1lOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy51c2VTb2NrZXROb3RpZnkgJiYgZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0UGF0aCkge1xuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmNyZWF0ZVNvY2tldDogJyArIG5hbWUpO1xuXG4gICAgICAvLyByZXNvdXJjZVxuICAgICAgbGV0IGNvbm5lY3RWbzogYW55ID0ge1xuICAgICAgICAnZm9yY2UgbmV3IGNvbm5lY3Rpb24nOiB0cnVlXG4gICAgICB9O1xuICAgICAgbGV0IHJlc291cmNlID0gZW5kcG9pbnQuc29ja2V0UGF0aDsgLy8gcmVtb3ZlIGxlYWRpbmcgL1xuICAgICAgY29ubmVjdFZvLnJlc291cmNlID0gKHJlc291cmNlICYmIHJlc291cmNlLmluZGV4T2YoJy8nKSA9PT0gMCkgPyByZXNvdXJjZS5zdWJzdHIoMSkgOiByZXNvdXJjZTtcbiAgICAgIGlmICh0aGlzLnNvY2tldFF1ZXJ5KSB7XG4gICAgICAgIGNvbm5lY3RWby5xdWVyeSA9IHRoaXMuc29ja2V0UXVlcnk7XG4gICAgICB9XG5cbiAgICAgIC8vIHNvY2tldFxuICAgICAgZW5kcG9pbnQuc29ja2V0ID0gaW8uY29ubmVjdChlbmRwb2ludC5ob3N0LCBjb25uZWN0Vm8pO1xuICAgICAgZW5kcG9pbnQuc29ja2V0Lm9uKCdjb25uZWN0JywgKCkgPT4ge1xuICAgICAgICAodGhpcy5fYmluZENoYW5uZWwoZW5kcG9pbnQsIG5hbWUpIHx8IFEucmVzb2x2ZShlbmRwb2ludCkpLnRoZW4oKGVwKSA9PiB7XG4gICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZXAgPT09IGVuZHBvaW50KTtcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZXApO1xuICAgICAgICB9KS5kb25lKCk7XG4gICAgICB9KTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignZGlzY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzb2NrZXQuaW86IGRpc2Nvbm5lY3QnKTtcbiAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS5kb25lKCk7XG4gICAgICB9KTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbihlbmRwb2ludC5jaGFubmVsLCAobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcbiAgICAgICAgcmV0dXJuIHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtc2cpKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIGVuZHBvaW50LnNvY2tldDtcbiAgICB9XG4gIH1cblxuICBfYmluZENoYW5uZWwoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZT86IHN0cmluZykge1xuICAgIGlmIChlbmRwb2ludCAmJiBlbmRwb2ludC5zb2NrZXQpIHtcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fYmluZENoYW5uZWw6ICcgKyBuYW1lKTtcblxuICAgICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgICAgdmFyIHNvY2tldCA9IGVuZHBvaW50LnNvY2tldDtcbiAgICAgIG5hbWUgPSBuYW1lIHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChjaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XG4gICAgICAgIHNvY2tldC5lbWl0KCdiaW5kJywge1xuICAgICAgICAgIGVudGl0eTogbmFtZSxcbiAgICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxuICAgICAgICAgIHRpbWU6IHRpbWVcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBRLnJlc29sdmUoZW5kcG9pbnQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBrZXlMYXN0TWVzc2FnZShjaGFubmVsOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiAnX18nICsgY2hhbm5lbCArICdsYXN0TWVzZ1RpbWUnO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZDogdXNlIGdldFRpbWVzdGFtcCBpbnN0ZWFkIVxuICBwcml2YXRlIGdldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcpOiBhbnkge1xuICAgIGlmICghdGhpcy5sYXN0TWVzZ1RpbWUpIHtcbiAgICAgIHRoaXMubGFzdE1lc2dUaW1lID0ge307XG4gICAgfSBlbHNlIGlmICh0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF07XG4gICAgfVxuICAgIC8vIHRoZSB8IDAgYmVsb3cgdHVybnMgc3RyaW5ncyBpbnRvIG51bWJlcnNcbiAgICB2YXIgdGltZSA9IGxvY2FsU3RvcmFnZSgpLmdldEl0ZW0odGhpcy5rZXlMYXN0TWVzc2FnZShjaGFubmVsKSkgfHwgMDtcbiAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XG4gICAgcmV0dXJuIHRpbWU7XG4gIH1cblxuICAvLyBkZXByZWNhdGVkOiB1c2Ugc2V0VGltZXN0YW1wIGluc3RlYWQhXG4gIHByaXZhdGUgc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWw6IHN0cmluZywgdGltZTogYW55KTogYW55IHtcbiAgICBpZiAoIXRpbWUpIHtcbiAgICAgIGxvY2FsU3RvcmFnZSgpLnJlbW92ZUl0ZW0odGhpcy5rZXlMYXN0TWVzc2FnZShjaGFubmVsKSk7XG4gICAgfSBlbHNlIGlmKHRpbWUgPiB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKSkge1xuICAgICAgbG9jYWxTdG9yYWdlKCkuc2V0SXRlbSh0aGlzLmtleUxhc3RNZXNzYWdlKGNoYW5uZWwpLCB0aW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdO1xuICAgIH1cbiAgICB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXSA9IHRpbWU7XG4gICAgcmV0dXJuIHRpbWU7XG4gIH1cblxuICBwcml2YXRlIGdldFRpbWVzdGFtcE1vZGVsKGNoYW5uZWw6IHN0cmluZyk6IFEuUHJvbWlzZTxMaXZlRGF0YVRpbWVzdGFtcE1vZGVsPiB7XG4gICAgaWYgKHRoaXMudGltZXN0YW1wcykge1xuICAgICAgaWYgKCF0aGlzLnRpbWVzdGFtcHNQcm9taXNlKSB7XG4gICAgICAgIC8vIGluaXRpYWxseSBmZXRjaCBhbGwgbWVzc2FnZXNcbiAgICAgICAgdGhpcy50aW1lc3RhbXBzUHJvbWlzZSA9IFEodGhpcy50aW1lc3RhbXBzLmZldGNoKCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMudGltZXN0YW1wc1Byb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLnRpbWVzdGFtcHMuZ2V0KGNoYW5uZWwpIHx8IHRoaXMudGltZXN0YW1wcy5hZGQobmV3IHRoaXMudGltZXN0YW1wcy5tb2RlbCh7XG4gICAgICAgICAgICBjaGFubmVsOiBjaGFubmVsLFxuICAgICAgICAgICAgdGltZXN0YW1wOiB0aGlzLmdldExhc3RNZXNzYWdlVGltZShjaGFubmVsKVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLnRpbWVzdGFtcHMuc3RvcmVcbiAgICAgICAgICB9KSk7XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBnZXRUaW1lc3RhbXAoY2hhbm5lbDogc3RyaW5nKTogUS5Qcm9taXNlPGFueT4ge1xuICAgIGxldCBxID0gdGhpcy5nZXRUaW1lc3RhbXBNb2RlbChjaGFubmVsKTtcbiAgICBpZiAoIXEpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmUodGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkpO1xuICAgIH1cblxuICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBxLnRoZW4oKG1vZGVsKSA9PiB7XG4gICAgICByZXR1cm4gbW9kZWwuYXR0cmlidXRlcy50aW1lc3RhbXA7XG4gICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLmdldFRpbWVzdGFtcDogJyArIGNoYW5uZWwsIGVycik7XG4gICAgICByZXR1cm4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudGltZXN0YW1wc1Byb21pc2U7XG4gIH1cblxuICBzZXRUaW1lc3RhbXAoY2hhbm5lbDogc3RyaW5nLCB0aW1lOiBhbnkpOiBRLlByb21pc2U8YW55PiB7XG4gICAgbGV0IHEgPSB0aGlzLmdldFRpbWVzdGFtcE1vZGVsKGNoYW5uZWwpO1xuICAgIGlmICghcSkge1xuICAgICAgcmV0dXJuIHRoaXMuc2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwsIHRpbWUpO1xuICAgIH1cblxuICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBxLnRoZW4oKG1vZGVsKSA9PiB7XG4gICAgICBpZiAoIXRpbWUgfHwgdGltZSA+IG1vZGVsLmF0dHJpYnV0ZXMudGltZXN0YW1wKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC5zYXZlKHtcbiAgICAgICAgICB0aW1lc3RhbXA6IHRpbWVcbiAgICAgICAgfSkudGhlblJlc29sdmUodGltZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gbW9kZWwuYXR0cmlidXRlcy50aW1lc3RhbXA7XG4gICAgfSkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnNldFRpbWVzdGFtcDogJyArIGNoYW5uZWwsIGVycik7XG4gICAgICByZXR1cm4gdGltZTtcbiAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHJldHVybiB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCB0aW1lKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy50aW1lc3RhbXBzUHJvbWlzZTtcbiAgfVxuXG4gIG9uQ29ubmVjdChlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAvLyB3aGVuIG9mZmxpbmUgdHJhbnNtaXNzaW9uIGlzIHBlbmRpbmcsIG5lZWQgdG8gd2FpdCBmb3IgaXQgdG8gY29tcGxldGVcbiAgICAgIGxldCBxID0gUS5yZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UgJiYgdGhpcy5tZXNzYWdlc1Byb21pc2UuaXNQZW5kaW5nKCkpIHtcbiAgICAgICAgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlLmNhdGNoKChlcnJvcikgPT4gUS5yZXNvbHZlKHVuZGVmaW5lZCkpO1xuICAgICAgfVxuXG4gICAgICAvLyBzeW5jIHNlcnZlci9jbGllbnQgY2hhbmdlc1xuICAgICAgZW5kcG9pbnQuaXNDb25uZWN0ZWQgPSBxLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBuZXh0IHdlJ2xsIGZldGNoIHNlcnZlci1zaWRlIGNoYW5nZXNcbiAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAvLyB0aGVuIHNlbmQgY2xpZW50LXNpZGUgY2hhbmdlc1xuICAgICAgICAgIGlmICh0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9PT0gJ2FsbCcgfHwgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09IGVuZHBvaW50LmVudGl0eSkge1xuICAgICAgICAgICAgLy8gcmVzdGFydCByZXBsYXlpbmcgb2Ygb2ZmbGluZSBtZXNzYWdlc1xuICAgICAgICAgICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBudWxsO1xuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBudWxsO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gdGhpcy5fc2VuZE1lc3NhZ2VzKCk7XG4gICAgICAgIH0pLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgICAgIC8vIGNhdGNoIHdpdGhvdXQgZXJyb3IgaW5kaWNhdGVzIGRpc2Nvbm5lY3Rpb24gd2hpbGUgZ29pbmcgb25saW5lXG4gICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgLy8gZGlzY29ubmVjdGVkIHdoaWxlIHNlbmRpbmcgb2ZmbGluZSBjaGFuZ2VzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xuICAgICAgICB9KTtcbiAgICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAvLyBpbiB0aGUgZW5kLCB3aGVuIGNvbm5lY3RlZCBzdGlsbCwgZmlyZSBhbiBldmVudCBpbmZvcm1pbmcgY2xpZW50IGNvZGVcbiAgICAgICAgaWYgKGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdjb25uZWN0OicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBlbmRwb2ludC5pc0Nvbm5lY3RlZDtcbiAgfVxuXG4gIG9uRGlzY29ubmVjdChlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gbnVsbDtcbiAgICBpZiAoIXRoaXMuZGlzY29ubmVjdGVkRW50aXR5KSB7XG4gICAgICB0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSA9ICdhbGwnO1xuICAgIH1cblxuICAgIHJldHVybiBRLmZjYWxsKCgpID0+IHtcbiAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgJiYgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQpIHtcbiAgICAgICAgLy8gY29uc2lkZXIgY2FsbGluZyBlbmRwb2ludC5zb2NrZXQuZGlzY29ubmVjdCgpIGluc3RlYWRcbiAgICAgICAgKDxhbnk+ZW5kcG9pbnQuc29ja2V0KS5zb2NrZXQub25EaXNjb25uZWN0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Rpc2Nvbm5lY3Q6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgX2ZpeE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBMaXZlRGF0YU1lc3NhZ2Uge1xuICAgIGxldCBpZEF0dHJpYnV0ZSA9IGVuZHBvaW50Lm1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGU7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFpZEF0dHJpYnV0ZSwgJ25vIGlkQXR0cmlidXRlIScpO1xuXG4gICAgaWYgKG1zZy5kYXRhICYmICFtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gJiYgbXNnLmRhdGEuX2lkKSB7XG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2cuZGF0YS5faWQ7IC8vIHNlcnZlciBidWchXG4gICAgfSBlbHNlIGlmICghbXNnLmRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScgJiYgbXNnW2lkQXR0cmlidXRlXSkge1xuICAgICAgbXNnLmRhdGEgPSB7fTtcbiAgICAgIG1zZy5kYXRhW2lkQXR0cmlidXRlXSA9IG1zZ1tpZEF0dHJpYnV0ZV07IC8vIHNlcnZlciBidWchXG4gICAgfVxuICAgIHJldHVybiBtc2c7XG4gIH1cblxuICBvbk1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UpOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPiB7XG4gICAgLy8gdGhpcyBpcyBjYWxsZWQgYnkgdGhlIHN0b3JlIGl0c2VsZiBmb3IgYSBwYXJ0aWN1bGFyIGVuZHBvaW50IVxuICAgIGlmICghbXNnIHx8ICFtc2cubWV0aG9kKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3Q8TGl2ZURhdGFNZXNzYWdlPihuZXcgRXJyb3IoJ25vIG1lc3NhZ2Ugb3IgbWV0aG9kIGdpdmVuJykpO1xuICAgIH1cblxuICAgIHZhciBxOiBRLlByb21pc2U8YW55PjtcbiAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgaWYgKGVuZHBvaW50LmxvY2FsU3RvcmUpIHtcbiAgICAgIC8vIGZpcnN0IHVwZGF0ZSB0aGUgbG9jYWwgc3RvcmUgYnkgZm9ybWluZyBhIG1vZGVsIGFuZCBpbnZva2luZyBzeW5jXG4gICAgICB2YXIgb3B0aW9ucyA9IF8uZGVmYXVsdHMoe1xuICAgICAgICBzdG9yZTogZW5kcG9pbnQubG9jYWxTdG9yZVxuICAgICAgfSwgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucyk7XG4gICAgICB2YXIgbW9kZWwgPSBuZXcgZW5kcG9pbnQubW9kZWxUeXBlKG1zZy5kYXRhLCBfLmV4dGVuZCh7XG4gICAgICAgIHBhcnNlOiB0cnVlXG4gICAgICB9LCBvcHRpb25zKSk7XG4gICAgICBpZiAoIW1vZGVsLmlkKSB7XG4gICAgICAgIC8vIGNvZGUgYmVsb3cgd2lsbCBwZXJzaXN0IHdpdGggYXV0by1hc3NpZ25lZCBpZCBidXQgdGhpcyBuZXZlcnRoZWxlc3MgaXMgYSBicm9rZW4gcmVjb3JkXG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgcmVjZWl2ZWQgZGF0YSB3aXRoIG5vIHZhbGlkIGlkIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QgKyAnIScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHBlcmZvcm1pbmcgJyArIG1zZy5tZXRob2QpO1xuICAgICAgfVxuICAgICAgcSA9IGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtc2cubWV0aG9kLCBtb2RlbCwgXy5leHRlbmQob3B0aW9ucywge1xuICAgICAgICBtZXJnZTogbXNnLm1ldGhvZCA9PT0gJ3BhdGNoJ1xuICAgICAgfSkpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBpZiAoIW1zZy5pZCB8fCBtc2cuaWQgPT09IG1vZGVsLmlkKSB7XG4gICAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIGlkIHZhbHVlIHdhcyByZWFzc2lnbmVkLCBkZWxldGUgcmVjb3JkIG9mIG9sZCBpZFxuICAgICAgICB2YXIgb2xkRGF0YSA9IHt9O1xuICAgICAgICBvbGREYXRhW21vZGVsLmlkQXR0cmlidXRlXSA9IG1zZy5pZDtcbiAgICAgICAgdmFyIG9sZE1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShvbGREYXRhLCBvcHRpb25zKTtcbiAgICAgICAgZGlhZy5kZWJ1Zy5kZWJ1Zygnb25NZXNzYWdlOiAnICsgZW5kcG9pbnQuZW50aXR5ICsgJyAnICsgbW9kZWwuaWQgKyAnIHJlYXNzaWduZWQgZnJvbSBvbGQgcmVjb3JkICcgKyBvbGRNb2RlbC5pZCk7XG4gICAgICAgIHJldHVybiBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMoJ2RlbGV0ZScsIG9sZE1vZGVsLCBvcHRpb25zKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBqdXN0IHVwZGF0ZSBhbGwgY29sbGVjdGlvbnMgbGlzdGVuaW5nXG4gICAgICBxID0gUS5yZXNvbHZlKG1zZyk7XG4gICAgfVxuXG4gICAgLy8gZmluYWxseSBzZXQgdGhlIG1lc3NhZ2UgdGltZVxuICAgIHJldHVybiBxLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZShtc2cudGltZSAmJiB0aGlzLnNldFRpbWVzdGFtcChjaGFubmVsLCBtc2cudGltZSkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ3N5bmM6JyArIGNoYW5uZWwsIG1zZyk7IC8vIFN5bmNDb250ZXh0Lm9uTWVzc2FnZVxuICAgICAgICByZXR1cm4gbXNnO1xuICAgICAgfSk7XG4gICAgfSwgKGVycm9yOiBFcnJvcikgPT4ge1xuICAgICAgLy8gbm90IHNldHRpbmcgbWVzc2FnZSB0aW1lIGluIGVycm9yIGNhc2VcblxuICAgICAgLy8gcmVwb3J0IGVycm9yIGFzIGV2ZW50IG9uIHN0b3JlXG4gICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xuICAgICAgcmV0dXJuIG1zZztcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkgPSB7fSk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuc3luYycpO1xuICAgIHRyeSB7XG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IG1vZGVsLmVuZHBvaW50IHx8IHRoaXMuZ2V0RW5kcG9pbnQobW9kZWwpO1xuICAgICAgaWYgKCFlbmRwb2ludCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vIGVuZHBvaW50Jyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0NvbGxlY3Rpb24obW9kZWwpKSB7XG4gICAgICAgIC8vIGNvbGxlY3Rpb25zIGNhbiBiZSBmaWx0ZXJlZCwgZXRjLlxuICAgICAgICBpZiAobWV0aG9kID09PSAncmVhZCcgJiYgIW9wdGlvbnMuYmFyZWJvbmUpIHtcbiAgICAgICAgICB2YXIgc3luY0NvbnRleHQ6IFN5bmNDb250ZXh0ID0gb3B0aW9ucy5zeW5jQ29udGV4dDsgLy8gc3luYyBjYW4gYmUgY2FsbGVkIGJ5IFN5bmNDb250ZXh0IGl0c2VsZiB3aGVuIHBhZ2luZyByZXN1bHRzXG4gICAgICAgICAgaWYgKCFzeW5jQ29udGV4dCkge1xuICAgICAgICAgICAgLy8gY2FwdHVyZSBHZXRRdWVyeSBvcHRpb25zXG4gICAgICAgICAgICBzeW5jQ29udGV4dCA9IG5ldyBTeW5jQ29udGV4dChcbiAgICAgICAgICAgICAgb3B0aW9ucywgICAgICAgIC8vIGR5bmFtaWMgb3B0aW9ucyBwYXNzZWQgdG8gZmV0Y2goKSBpbXBsZW1lbnQgVUkgZmlsdGVycywgZXRjLlxuICAgICAgICAgICAgICBtb2RlbC5vcHRpb25zLCAgLy8gc3RhdGljIG9wdGlvbnMgb24gY29sbGVjdGlvbiBpbXBsZW1lbnQgc2NyZWVuLXNwZWNpZmljIHN0dWZmXG4gICAgICAgICAgICAgIHRoaXMgICAgICAgICAgICAvLyBzdGF0aWMgb3B0aW9ucyBvZiB0aGlzIHN0b3JlIHJlYWxpemUgZmlsdGVyaW5nIGNsaWVudC9zZXJ2ZXJcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBvcHRpb25zLnN5bmNDb250ZXh0ID0gc3luY0NvbnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChtb2RlbC5zeW5jQ29udGV4dCAhPT0gc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIGFzc2lnbiBhIGRpZmZlcmVudCBpbnN0YW5jZVxuICAgICAgICAgICAgaWYgKG1vZGVsLnN5bmNDb250ZXh0KSB7XG4gICAgICAgICAgICAgIG1vZGVsLnN0b3BMaXN0ZW5pbmcodGhpcywgJ3N5bmM6JyArIGVuZHBvaW50LmNoYW5uZWwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgbW9kZWwubGlzdGVuVG8odGhpcywgJ3N5bmM6JyArIGVuZHBvaW50LmNoYW5uZWwsIF8uYmluZChzeW5jQ29udGV4dC5vbk1lc3NhZ2UsIHN5bmNDb250ZXh0LCB0aGlzLCBtb2RlbCkpO1xuICAgICAgICAgICAgbW9kZWwuc3luY0NvbnRleHQgPSBzeW5jQ29udGV4dDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoaXNNb2RlbChtb2RlbCkpIHtcbiAgICAgICAgLy8gb2ZmbGluZSBjYXBhYmlsaXR5IHJlcXVpcmVzIElEcyBmb3IgZGF0YVxuICAgICAgICBpZiAoIW1vZGVsLmlkKSB7XG4gICAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ2NyZWF0ZScpIHtcbiAgICAgICAgICAgIG1vZGVsLnNldChtb2RlbC5pZEF0dHJpYnV0ZSwgb2JqZWN0aWQubWFrZU9iamVjdElEKCkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25vICh2YWxpZCkgaWQ6ICcgKyBtb2RlbC5pZCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzb21ldGhpbmcgaXMgcmVhbGx5IGF0IG9kZHMgaGVyZS4uLlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RhcmdldCBvZiBzeW5jIGlzIG5laXRoZXIgYSBtb2RlbCBub3IgYSBjb2xsZWN0aW9uIT8hJyk7XG4gICAgICB9XG5cbiAgICAgIC8vIGF0IHRoaXMgcG9pbnQgdGhlIHRhcmdldCBzZXJ2ZXIgaXMga25vd24sIGNoZWNrIG1ha2luZyBzdXJlIHRoZSBjb3JyZWN0IHNlcnZlciBpcyBiZWluZyBoaXRcbiAgICAgIGNvbnN0IHNlcnZlclVybCA9IHdlYi5yZXNvbHZlU2VydmVyKG1vZGVsLmdldFVybFJvb3QoKSwge1xuICAgICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgICB9KTtcbiAgICAgIGlmIChzZXJ2ZXJVcmwgIT09IHRoaXMuc2VydmVyVXJsKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignc3RvcmUgaXMgYm91bmQgdG8gc2VydmVyICcgKyB0aGlzLnNlcnZlclVybCk7XG4gICAgICB9XG5cbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChjaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gb25seSBzZW5kIHJlYWQgbWVzc2FnZXMgaWYgbm8gb3RoZXIgc3RvcmUgY2FuIGRvIHRoaXMgb3IgZm9yIGluaXRpYWwgbG9hZFxuICAgICAgICAgIGlmIChtZXRob2QgPT09ICdyZWFkJyAmJiBlbmRwb2ludC5sb2NhbFN0b3JlICYmIHRpbWUgJiYgIW9wdGlvbnMucmVzZXQpIHtcbiAgICAgICAgICAgIC8vIHJlYWQgZGF0YSBmcm9tIGxvY2FsU3RvcmUgYW5kIGZldGNoIGNoYW5nZXMgcmVtb3RlXG4gICAgICAgICAgICB2YXIgb3B0cyA9IF8uY2xvbmUob3B0aW9ucyk7XG4gICAgICAgICAgICBvcHRzLnN0b3JlID0gZW5kcG9pbnQubG9jYWxTdG9yZTtcbiAgICAgICAgICAgIG9wdHMuZW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgZGVsZXRlIG9wdHMuc3VjY2VzcztcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRzLmVycm9yO1xuICAgICAgICAgICAgcmV0dXJuIGVuZHBvaW50LmxvY2FsU3RvcmUuc3luYyhtZXRob2QsIG1vZGVsLCBvcHRzKS50aGVuKChyZXNwKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGJhY2tib25lIHN1Y2Nlc3MgY2FsbGJhY2sgYWx0ZXJzIHRoZSBjb2xsZWN0aW9uIG5vd1xuICAgICAgICAgICAgICByZXNwID0gdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3ApIHx8IHJlc3A7XG4gICAgICAgICAgICAgIGlmIChlbmRwb2ludC5zb2NrZXQgfHwgb3B0aW9ucy5mZXRjaE1vZGUgPT09ICdsb2NhbCcpIHtcbiAgICAgICAgICAgICAgICAvLyBubyBuZWVkIHRvIGZldGNoIGNoYW5nZXMgYXMgd2UgZ290IGEgd2Vic29ja2V0LCB0aGF0IGlzIGVpdGhlciBjb25uZWN0ZWQgb3IgYXR0ZW1wdHMgcmVjb25uZWN0aW9uXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyB3aGVuIHdlIGFyZSBkaXNjb25uZWN0ZWQsIHRyeSB0byBjb25uZWN0IG5vd1xuICAgICAgICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hTZXJ2ZXJJbmZvKGVuZHBvaW50KS50aGVuKChpbmZvKTogYW55ID0+IHtcbiAgICAgICAgICAgICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBRLlByb21pc2U8dm9pZD47XG4gICAgICAgICAgICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgaW5mbztcbiAgICAgICAgICAgICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIGRpc2Nvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgICAgICAgICAgIHZhciByZXN1bHQ6IFEuUHJvbWlzZTx2b2lkPjtcbiAgICAgICAgICAgICAgICAgIGlmICgheGhyLnN0YXR1c0NvZGUgJiYgZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0ID0gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCByZXNwO1xuICAgICAgICAgICAgICAgIH0pLnRoZW5SZXNvbHZlKHJlc3ApO1xuICAgICAgICAgICAgICB9IC8vIGVsc2UuLi5cblxuICAgICAgICAgICAgICAvLyBsb2FkIGNoYW5nZXMgb25seSAod2lsbCBoYXBwZW4gQUZURVIgc3VjY2VzcyBjYWxsYmFjayBpcyBpbnZva2VkLFxuICAgICAgICAgICAgICAvLyBidXQgcmV0dXJuZWQgcHJvbWlzZSB3aWxsIHJlc29sdmUgb25seSBhZnRlciBjaGFuZ2VzIHdlcmUgcHJvY2Vzc2VkLlxuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQpLmNhdGNoKCh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpIHx8IHJlc3A7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXG4gICAgICAgICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgeGhyLCBtb2RlbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3A7XG4gICAgICAgICAgICAgIH0pLnRoZW5SZXNvbHZlKHJlc3ApOyAvLyBjYWxsZXIgZXhwZWN0cyBvcmlnaW5hbCBYSFIgcmVzcG9uc2UgYXMgY2hhbmdlcyBib2R5IGRhdGEgaXMgTk9UIGNvbXBhdGlibGVcbiAgICAgICAgICAgIH0sICgpID0+IHtcbiAgICAgICAgICAgICAgLy8gZmFsbC1iYWNrIHRvIGxvYWRpbmcgZnVsbCBkYXRhIHNldFxuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5fYWRkTWVzc2FnZShtZXRob2QsIG1vZGVsLCBvcHRpb25zLCBlbmRwb2ludCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBkbyBiYWNrYm9uZSByZXN0XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJldHVybiBRLnJlamVjdCh0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX2FkZE1lc3NhZ2UobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICBlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPGFueT4ge1xuICAgIHZhciBjaGFuZ2VzID0gKDxNb2RlbD5tb2RlbCkuY2hhbmdlZFNpbmNlU3luYztcbiAgICB2YXIgZGF0YTogYW55ID0gbnVsbDtcbiAgICB2YXIgc3RvcmVNc2cgPSB0cnVlO1xuICAgIHN3aXRjaCAobWV0aG9kKSB7XG4gICAgICBjYXNlICd1cGRhdGUnOlxuICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgICAgZGF0YSA9IG9wdGlvbnMuYXR0cnMgfHwgbW9kZWwudG9KU09OKCk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdwYXRjaCc6XG4gICAgICAgIGlmIChfLmlzRW1wdHkoY2hhbmdlcykpIHtcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgZGF0YSA9IG1vZGVsLnRvSlNPTih7XG4gICAgICAgICAgYXR0cnM6IGNoYW5nZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICBicmVhaztcblxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQgKCgpID0+IG1ldGhvZCA9PT0gJ3JlYWQnLCAndW5rbm93biBtZXRob2Q6ICcgKyBtZXRob2QpO1xuICAgICAgICBzdG9yZU1zZyA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgbGV0IGVudGl0eSA9IG1vZGVsLmVudGl0eSB8fCBlbmRwb2ludC5lbnRpdHk7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwuZW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpO1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVudGl0eS5pbmRleE9mKCd+JykgPCAwLCAnZW50aXR5IG5hbWUgbXVzdCBub3QgY29udGFpbiBhIH4gY2hhcmFjdGVyIScpO1xuICAgIHZhciBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IHtcbiAgICAgIF9pZDogZW50aXR5ICsgJ34nICsgKDxNb2RlbD5tb2RlbCkuaWQsXG4gICAgICBpZDogKDxNb2RlbD5tb2RlbCkuaWQsXG4gICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgIGRhdGE6IGRhdGEsXG4gICAgICAvLyBjaGFubmVsOiBlbmRwb2ludC5jaGFubmVsLCAvLyBjaGFubmVsIGlzIGhhY2tlZCBpbiBieSBzdG9yZU1lc3NhZ2UoKSwgd2UgZG9uJ3Qgd2FudCB0byB1c2UgdGhpcyBhbnltb3JlXG4gICAgICBwcmlvcml0eTogZW5kcG9pbnQucHJpb3JpdHksXG4gICAgICB0aW1lOiBEYXRlLm5vdygpXG4gICAgfTtcblxuICAgIHZhciBxID0gUS5yZXNvbHZlKG1zZyk7XG4gICAgdmFyIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+O1xuICAgIGlmIChzdG9yZU1zZykge1xuICAgICAgLy8gc3RvcmUgYW5kIHBvdGVudGlhbGx5IG1lcmdlIG1lc3NhZ2VcbiAgICAgIHFNZXNzYWdlID0gdGhpcy5zdG9yZU1lc3NhZ2UoZW5kcG9pbnQsIHEpO1xuICAgICAgcSA9IHFNZXNzYWdlLnRoZW4oKG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsKSA9PiB7XG4gICAgICAgIC8vIGluIGNhc2Ugb2YgbWVyZ2luZywgdGhpcyByZXN1bHQgY291bGQgYmUgZGlmZmVyZW50XG4gICAgICAgIHJldHVybiBtZXNzYWdlLmF0dHJpYnV0ZXM7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHEudGhlbigobXNnMjogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICAvLyBwYXNzIGluIHFNZXNzYWdlIHNvIHRoYXQgZGVsZXRpb24gb2Ygc3RvcmVkIG1lc3NhZ2UgY2FuIGJlIHNjaGVkdWxlZFxuICAgICAgcmV0dXJuIHRoaXMuX2VtaXRNZXNzYWdlKGVuZHBvaW50LCBtc2cyLCBvcHRpb25zLCBtb2RlbCwgcU1lc3NhZ2UpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfZW1pdE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOlxuICBRLlByb21pc2U8YW55PiB7XG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIHZhciBxQWpheCA9IHRoaXMuX2FqYXhNZXNzYWdlKGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcbiAgICB2YXIgcSA9IHFBamF4O1xuXG4gICAgaWYgKHFNZXNzYWdlKSB7XG4gICAgICAvLyBmb2xsb3dpbmcgdGFrZXMgY2FyZSBvZiBvZmZsaW5lIGNoYW5nZSBzdG9yZVxuICAgICAgcSA9IHEudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICAvLyBzdWNjZXNzLCByZW1vdmUgbWVzc2FnZSBzdG9yZWQsIGlmIGFueVxuICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpOyAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgfSkudGhlblJlc29sdmUoZGF0YSk7IC8vIHJlc29sdmUgYWdhaW4geWllbGRpbmcgZGF0YVxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAvLyBmYWlsdXJlIGV2ZW50dWFsbHkgY2F1Z2h0IGJ5IG9mZmxpbmUgY2hhbmdlc1xuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIHRoaXMudXNlT2ZmbGluZUNoYW5nZXMpIHtcbiAgICAgICAgICAvLyB0aGlzIHNlYW1zIHRvIGJlIG9ubHkgYSBjb25uZWN0aW9uIHByb2JsZW0sIHNvIHdlIGtlZXAgdGhlIG1lc3NhZ2UgYW5kIGNhbGwgc3VjY2Vzc1xuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLmRhdGEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIHJlbW92ZSBtZXNzYWdlIHN0b3JlZCBhbmQga2VlcCByZWplY3Rpb24gYXMgaXNcbiAgICAgICAgICByZXR1cm4gdGhpcy5yZW1vdmVNZXNzYWdlKGVuZHBvaW50LCBtc2csIHFNZXNzYWdlKS5jYXRjaCgoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7IC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxuICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICB9KS50aGVuUmVqZWN0KHhocik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHEgPSB0aGlzLl9hcHBseVJlc3BvbnNlKHEsIGVuZHBvaW50LCBtc2csIG9wdGlvbnMsIG1vZGVsKTtcblxuICAgIHJldHVybiBxLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgLy8gZG8gc29tZSBjb25uZWN0aW9uIGhhbmRsaW5nXG4gICAgICByZXR1cm4gcUFqYXgudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHRyaWdnZXIgcmVjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgICByZXR1cm4gdGhpcy5vbkNvbm5lY3QoZW5kcG9pbnQpO1xuICAgICAgICB9XG4gICAgICB9LCAoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIC8vIHRyaWdnZXIgZGlzY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9hamF4TWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgb3B0aW9uczogYW55LFxuICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPGFueT4ge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIGRlbGV0ZSBvcHRpb25zLnhocjsgLy8gbWFrZSBzdXJlIG5vdCB0byB1c2Ugb2xkIHZhbHVlXG5cbiAgICB2YXIgdXJsID0gb3B0aW9ucy51cmw7XG4gICAgaWYgKCF1cmwpIHtcbiAgICAgIHVybCA9IGVuZHBvaW50LnVybFJvb3Q7XG4gICAgICBpZiAobXNnLmlkICYmIG1zZy5tZXRob2QgIT09ICdjcmVhdGUnKSB7XG4gICAgICAgIC8vIGFkZCBJRCBvZiBtb2RlbFxuICAgICAgICB1cmwgKz0gKHVybC5jaGFyQXQodXJsLmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbXNnLmlkO1xuICAgICAgfVxuICAgICAgaWYgKG1zZy5tZXRob2QgPT09ICdyZWFkJyAmJiBpc0NvbGxlY3Rpb24obW9kZWwpKSB7XG4gICAgICAgIC8vIGFkZCBxdWVyeSBvZiBjb2xsZWN0aW9uXG4gICAgICAgIHZhciBjb2xsZWN0aW9uVXJsID0gXy5pc0Z1bmN0aW9uKG1vZGVsLnVybCkgPyBtb2RlbC51cmwoKSA6IG1vZGVsLnVybDtcbiAgICAgICAgdmFyIHF1ZXJ5SW5kZXggPSBjb2xsZWN0aW9uVXJsLmxhc3RJbmRleE9mKCc/Jyk7XG4gICAgICAgIHZhciBnZXRRdWVyeSA9IG5ldyBHZXRRdWVyeSgpLmZyb21KU09OKG9wdGlvbnMpO1xuICAgICAgICAvLyBjdXJyZW50bHkgb25seSBzb3J0T3JkZXIgY2FuIGJlIHN1cHBvcnRlZCBhcyB3ZSByZXF1aXJlIHRoZSBpbml0aWFsIGRhdGEgbG9hZCB0byB5aWVsZCBmdWxsIGRhdGFzZXRcbiAgICAgICAgZ2V0UXVlcnkubGltaXQgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5vZmZzZXQgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5maWx0ZXIgPSBudWxsO1xuICAgICAgICBnZXRRdWVyeS5maWVsZHMgPSBudWxsO1xuICAgICAgICB2YXIgZ2V0UGFyYW1zID0gZ2V0UXVlcnkudG9RdWVyeVBhcmFtcygpO1xuICAgICAgICBpZiAocXVlcnlJbmRleCA+PSAwKSB7XG4gICAgICAgICAgdXJsICs9IGNvbGxlY3Rpb25Vcmwuc3Vic3RyKHF1ZXJ5SW5kZXgpO1xuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcbiAgICAgICAgICAgIHVybCArPSAnJicgKyBnZXRQYXJhbXM7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChnZXRQYXJhbXMpIHtcbiAgICAgICAgICAgIHVybCArPSAnPycgKyBnZXRQYXJhbXM7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gZWFybGllc3QgcG9pbnQgd2hlcmUgdGFyZ2V0IFVSTCBpcyBrbm93blxuICAgIGRpYWcuZGVidWcuZGVidWcoJ2FqYXhNZXNzYWdlICcgKyBtc2cubWV0aG9kICsgJyAnICsgdXJsKTtcbiAgICB2YXIgb3B0czogYW55ID0ge1xuICAgICAgLy8gbXVzdCBub3QgdGFrZSBhcmJpdHJhcnkgb3B0aW9ucyBhcyB0aGVzZSB3b24ndCBiZSByZXBsYXllZCBvbiByZWNvbm5lY3RcbiAgICAgIHVybDogdXJsLFxuICAgICAgYXR0cnM6IG1zZy5kYXRhLFxuICAgICAgc3RvcmU6IHt9LCAvLyBlbnN1cmVzIG5ldHdvcmsgaXMgdXNlZFxuICAgICAgY3JlZGVudGlhbHM6IG9wdGlvbnMuY3JlZGVudGlhbHMsXG4gICAgICAvLyBlcnJvciBwcm9wYWdhdGlvblxuICAgICAgZXJyb3I6IG9wdGlvbnMuZXJyb3JcbiAgICB9O1xuXG4gICAgLy8gcHJvdGVjdCBhZ2FpbnN0IHdyb25nIHNlcnZlciBhbmQgdXNlciBpZGVudGl0eVxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHdlYi5yZXNvbHZlU2VydmVyKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxuICAgIH0pID09PSB0aGlzLnNlcnZlclVybCk7XG4gICAgaWYgKHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZSh0aGlzLnNlcnZlclVybCkuYXV0aG9yaXphdGlvbi5uYW1lICE9PSB0aGlzLnVzZXJVdWlkKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XG4gICAgICBjb25zdCBlcnJvcjogd2ViLkh0dHBFcnJvciA9IG5ldyBFcnJvcigpO1xuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdHMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gYWN0dWFsIGFqYXggcmVxdWVzdCB2aWEgYmFja2JvbmUuanNcbiAgICByZXR1cm4gdGhpcy5jaGVja1NlcnZlcih1cmwsIG9wdHMpLnRoZW4oKCkgPT4ge1xuICAgICAgcmV0dXJuIG1vZGVsLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIG9wdHMpLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAvLyB0YWtlIG92ZXIgeGhyIHJlc29sdmluZyB0aGUgb3B0aW9ucyBjb3B5XG4gICAgICAgIG9wdGlvbnMueGhyID0gb3B0cy54aHIueGhyIHx8IG9wdHMueGhyO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9hcHBseVJlc3BvbnNlPFQ+KHFYSFI6IFEuUHJvbWlzZTxUPiwgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0aW9uczogYW55LCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPFQ+IHtcbiAgICAvLyB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgdmFyIGNsaWVudFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICByZXR1cm4gcVhIUi50aGVuKChkYXRhOiBUIHwgYW55KSA9PiB7XG4gICAgICAvLyBkZWxldGUgb24gc2VydmVyIGRvZXMgbm90IHJlc3BvbmQgYSBib2R5XG4gICAgICBpZiAoIWRhdGEgJiYgbXNnLm1ldGhvZCA9PT0gJ2RlbGV0ZScpIHtcbiAgICAgICAgZGF0YSA9IG1zZy5kYXRhO1xuICAgICAgfVxuXG4gICAgICAvLyB1cGRhdGUgbG9jYWwgc3RvcmUgc3RhdGVcbiAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgIC8vIG5vIGRhdGEgaWYgc2VydmVyIGFza3Mgbm90IHRvIGFsdGVyIHN0YXRlXG4gICAgICAgIC8vIHRoaXMuc2V0VGltZXN0YW1wKGNoYW5uZWwsIG1zZy50aW1lKTtcbiAgICAgICAgdmFyIHByb21pc2VzOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPltdID0gW107XG4gICAgICAgIHZhciBkYXRhSWRzOiBhbnk7IC8vIG1vZGVsIGlkIC0+IGF0dHJpYnV0ZXMgZGF0YVxuICAgICAgICBpZiAobXNnLm1ldGhvZCAhPT0gJ3JlYWQnKSB7XG4gICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgZGF0YSA9PT0gbXNnLmRhdGEgPyBtc2cgOiA8TGl2ZURhdGFNZXNzYWdlPl8uZGVmYXVsdHMoe1xuICAgICAgICAgICAgZGF0YTogZGF0YSAvLyBqdXN0IGFjY2VwdHMgbmV3IGRhdGFcbiAgICAgICAgICB9LCBtc2cpKSkpO1xuICAgICAgICB9IGVsc2UgaWYgKGlzQ29sbGVjdGlvbihtb2RlbCkgJiYgQXJyYXkuaXNBcnJheShkYXRhKSkge1xuICAgICAgICAgIC8vIHN5bmNocm9uaXplIHRoZSBjb2xsZWN0aW9uIGNvbnRlbnRzIHdpdGggdGhlIGRhdGEgcmVhZFxuICAgICAgICAgIHZhciBzeW5jSWRzID0ge307XG4gICAgICAgICAgbW9kZWwubW9kZWxzLmZvckVhY2goKG0pID0+IHtcbiAgICAgICAgICAgIHN5bmNJZHNbbS5pZF0gPSBtO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIGRhdGFJZHMgPSB7fTtcbiAgICAgICAgICBkYXRhLmZvckVhY2goKGQ6IGFueSkgPT4ge1xuICAgICAgICAgICAgaWYgKGQpIHtcbiAgICAgICAgICAgICAgdmFyIGlkID0gZFtlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlXSB8fCBkLl9pZDtcbiAgICAgICAgICAgICAgZGF0YUlkc1tpZF0gPSBkO1xuICAgICAgICAgICAgICB2YXIgbSA9IHN5bmNJZHNbaWRdO1xuICAgICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICAgIC8vIHVwZGF0ZSB0aGUgaXRlbVxuICAgICAgICAgICAgICAgIGRlbGV0ZSBzeW5jSWRzW2lkXTsgLy8gc28gdGhhdCBpdCBpcyBkZWxldGVkIGJlbG93XG4gICAgICAgICAgICAgICAgaWYgKCFfLmlzRXF1YWwoXy5waWNrLmNhbGwobSwgbS5hdHRyaWJ1dGVzLCBPYmplY3Qua2V5cyhkKSksIGQpKSB7XG4gICAgICAgICAgICAgICAgICAvLyBhYm92ZSBjaGVja2VkIHRoYXQgYWxsIGF0dHJpYnV0ZXMgaW4gZCBhcmUgaW4gbSB3aXRoIGVxdWFsIHZhbHVlcyBhbmQgZm91bmQgc29tZSBtaXNtYXRjaFxuICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXG4gICAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICAgICAgICBkYXRhOiBkXG4gICAgICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBjcmVhdGUgdGhlIGl0ZW1cbiAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgICAgICBtZXRob2Q6ICdjcmVhdGUnLFxuICAgICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgICAgICBkYXRhOiBkXG4gICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIE9iamVjdC5rZXlzKHN5bmNJZHMpLmZvckVhY2goKGlkKSA9PiB7XG4gICAgICAgICAgICAvLyBkZWxldGUgdGhlIGl0ZW1cbiAgICAgICAgICAgIHZhciBtID0gc3luY0lkc1tpZF07XG4gICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgIGlkOiBpZCxcbiAgICAgICAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgIGRhdGE6IG0uYXR0cmlidXRlc1xuICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyB0cmlnZ2VyIGFuIHVwZGF0ZSB0byBsb2FkIHRoZSBkYXRhIHJlYWRcbiAgICAgICAgICB2YXIgYXJyYXkgPSBBcnJheS5pc0FycmF5KGRhdGEpID8gZGF0YSA6IFtkYXRhXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBkYXRhID0gYXJyYXlbaV07XG4gICAgICAgICAgICBpZiAoZGF0YSkge1xuICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCB7XG4gICAgICAgICAgICAgICAgaWQ6IGRhdGFbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZGF0YS5faWQsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAndXBkYXRlJyxcbiAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgICBkYXRhOiBkYXRhXG4gICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBRLmFsbChwcm9taXNlcykudGhlbigoKSA9PiB7XG4gICAgICAgICAgLy8gZGVsYXllZCB0aWxsIG9wZXJhdGlvbnMgY29tcGxldGVcbiAgICAgICAgICBpZiAoIWRhdGFJZHMpIHtcbiAgICAgICAgICAgIHJldHVybiBkYXRhO1xuICAgICAgICAgIH1cbiAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc0NvbGxlY3Rpb24obW9kZWwpKTtcblxuICAgICAgICAgIC8vIHdoZW4gY29sbGVjdGlvbiB3YXMgdXBkYXRlZCBvbmx5IHBhc3MgZGF0YSBvZiBtb2RlbHMgdGhhdCB3ZXJlIHN5bmNlZCBvbiB0byB0aGUgc3VjY2VzcyBjYWxsYmFjayxcbiAgICAgICAgICAvLyBhcyB0aGUgY2FsbGJhY2sgd2lsbCBzZXQgdGhlIG1vZGVscyBhZ2FpbiBjYXVzaW5nIG91ciBzb3J0aW5nIGFuZCBmaWx0ZXJpbmcgdG8gYmUgd2l0aG91dCBlZmZlY3QuXG4gICAgICAgICAgdmFyIHJlc3BvbnNlOiBhbnlbXSA9IFtdO1xuICAgICAgICAgIGxldCBtb2RlbHMgPSBpc0NvbGxlY3Rpb24obW9kZWwpID8gbW9kZWwubW9kZWxzIDogW21vZGVsXTtcbiAgICAgICAgICBmb3IgKGxldCBpID0gbW9kZWxzLmxlbmd0aDsgaS0tID4gMDsgKSB7XG4gICAgICAgICAgICB2YXIgbSA9IG1vZGVsc1tpXTtcbiAgICAgICAgICAgIGlmIChkYXRhSWRzW20uaWRdKSB7XG4gICAgICAgICAgICAgIHJlc3BvbnNlLnB1c2gobS5hdHRyaWJ1dGVzKTtcbiAgICAgICAgICAgICAgZGVsZXRlIGRhdGFJZHNbbS5pZF07XG4gICAgICAgICAgICAgIGlmIChkYXRhSWRzLmxlbmd0aCA8PSAwKSB7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLnJldmVyc2UoKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAgIGxldCBxVGltZTogUS5Qcm9taXNlPGFueT47XG4gICAgICBpZiAobXNnLm1ldGhvZCA9PT0gJ3JlYWQnICYmIGlzQ29sbGVjdGlvbihtb2RlbCkpIHtcbiAgICAgICAgLy8gVE9ETzogZXh0cmFjdCBEYXRlIGhlYWRlciBmcm9tIG9wdGlvbnMueGhyIGluc3RlYWQgb2YgdXNpbmcgY2xpZW50VGltZVxuICAgICAgICBxVGltZSA9IHRoaXMuc2V0VGltZXN0YW1wKGVuZHBvaW50LmNoYW5uZWwsIGNsaWVudFRpbWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcVRpbWUgPSBRLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBxVGltZS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gaW52b2tlIHN1Y2Nlc3MgY2FsbGJhY2ssIGlmIGFueVxuICAgICAgICByZXR1cm4gdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3BvbnNlKSB8fCByZXNwb25zZTtcbiAgICAgIH0pO1xuICAgIH0sIChlcnJvcjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiB0aGlzLmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKSB8fCBRLnJlamVjdChlcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGZldGNoQ2hhbmdlcyhlbmRwb2ludDogU3luY0VuZHBvaW50LCBmb3JjZSA9IGZhbHNlKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcbiAgICBsZXQgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgaWYgKCFlbmRwb2ludC51cmxSb290IHx8ICFjaGFubmVsKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgbGV0IG5vdyA9IERhdGUubm93KCk7XG4gICAgbGV0IHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzO1xuICAgIGlmIChwcm9taXNlICYmICFmb3JjZSkge1xuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzIDwgMTAwMCkge1xuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhjaGFubmVsICsgJyBza2lwcGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuZ2V0VGltZXN0YW1wKGNoYW5uZWwpLnRoZW4oKHRpbWUpID0+IHtcbiAgICAgIGlmICghdGltZSkge1xuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKGNoYW5uZWwgKyAnIGNhbiBub3QgZmV0Y2ggY2hhbmdlcyBhdCB0aGlzIHRpbWUhJyk7XG4gICAgICAgIHJldHVybiBwcm9taXNlIHx8IFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgICAgfVxuXG4gICAgICAvLyBpbml0aWF0ZSBhIG5ldyByZXF1ZXN0IGZvciBjaGFuZ2VzXG4gICAgICBkaWFnLmRlYnVnLmluZm8oY2hhbm5lbCArICcgaW5pdGlhdGluZyBjaGFuZ2VzIHJlcXVlc3QuLi4nKTtcbiAgICAgIGxldCBjaGFuZ2VzOiBDb2xsZWN0aW9uID0gbmV3ICg8YW55PnRoaXMubWVzc2FnZXMpLmNvbnN0cnVjdG9yKCk7XG4gICAgICBwcm9taXNlID0gdGhpcy5jaGVja1NlcnZlcihlbmRwb2ludC51cmxSb290ICsgJ2NoYW5nZXMvJyArIHRpbWUpLnRoZW4oKHVybCkgPT4ge1xuICAgICAgICByZXR1cm4gUShjaGFuZ2VzLmZldGNoKDxCYWNrYm9uZS5Db2xsZWN0aW9uRmV0Y2hPcHRpb25zPntcbiAgICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgICBzdG9yZToge30sIC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXG5cbiAgICAgICAgICBzdWNjZXNzOiAobW9kZWwsIHJlc3BvbnNlLCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XG4gICAgICAgICAgfVxuICAgICAgICB9KSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKGNoYW5nZXMubW9kZWxzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHJldHVybiBRLmFsbChjaGFuZ2VzLm1hcCgoY2hhbmdlKSA9PiB7XG4gICAgICAgICAgICAgIGxldCBtc2c6IExpdmVEYXRhTWVzc2FnZSA9IGNoYW5nZS5hdHRyaWJ1dGVzO1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1zZykpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBmb2xsb3dpbmcgc2hvdWxkIHVzZSBzZXJ2ZXIgdGltZSFcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldFRpbWVzdGFtcChjaGFubmVsLCBub3cpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkudGhlblJlc29sdmUoY2hhbmdlcyk7XG4gICAgICB9KTtcbiAgICAgIGVuZHBvaW50LnByb21pc2VGZXRjaGluZ0NoYW5nZXMgPSBwcm9taXNlO1xuICAgICAgZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdDaGFuZ2VzID0gbm93O1xuICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIGZldGNoU2VydmVySW5mbyhlbmRwb2ludDogU3luY0VuZHBvaW50KTogUS5Qcm9taXNlPE1vZGVsPiB7XG4gICAgdmFyIG5vdyA9IERhdGUubm93KCk7XG4gICAgdmFyIHByb21pc2UgPSBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvO1xuICAgIGlmIChwcm9taXNlKSB7XG4gICAgICBpZiAocHJvbWlzZS5pc1BlbmRpbmcoKSB8fCBub3cgLSBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPCAxMDAwKSB7XG4gICAgICAgIC8vIHJldXNlIGV4aXN0aW5nIGV2ZW50dWFsbHkgY29tcGxldGVkIHJlcXVlc3QgZm9yIGNoYW5nZXNcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuaW5nKGVuZHBvaW50LmNoYW5uZWwgKyAnIHNraXBwaW5nIGluZm8gcmVxdWVzdC4uLicpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB2YXIgaW5mbyA9IG5ldyBNb2RlbCgpO1xuICAgIHZhciB1cmwgPSBlbmRwb2ludC51cmxSb290O1xuICAgIGlmICh1cmwuY2hhckF0KCh1cmwubGVuZ3RoIC0gMSkpICE9PSAnLycpIHtcbiAgICAgIHVybCArPSAnLyc7XG4gICAgfVxuICAgIHByb21pc2UgPSB0aGlzLmNoZWNrU2VydmVyKHVybCArICdpbmZvJykudGhlbigodXJsKSA9PiB7XG4gICAgICByZXR1cm4gUShpbmZvLmZldGNoKDxCYWNrYm9uZS5Nb2RlbEZldGNoT3B0aW9ucz4oe1xuICAgICAgICB1cmw6IHVybCxcbiAgICAgICAgc3VjY2VzczogKG1vZGVsLCByZXNwb25zZSwgb3B0aW9ucykgPT4ge1xuICAgICAgICAgIHJldHVybiByZXNwb25zZSB8fCBvcHRpb25zLnhocjtcbiAgICAgICAgfVxuICAgICAgICB9KSkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIC8vQHRvZG8gd2h5IHdlIHNldCBhIHNlcnZlciB0aW1lIGhlcmUgP1xuICAgICAgICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChlbmRwb2ludC5jaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXRpbWUgJiYgaW5mby5nZXQoJ3RpbWUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRUaW1lc3RhbXAoZW5kcG9pbnQuY2hhbm5lbCwgaW5mby5nZXQoJ3RpbWUnKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGltZTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgaWYgKCFlbmRwb2ludC5zb2NrZXRQYXRoICYmIGluZm8uZ2V0KCdzb2NrZXRQYXRoJykpIHtcbiAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldFBhdGggPSBpbmZvLmdldCgnc29ja2V0UGF0aCcpO1xuICAgICAgICAgICAgdmFyIG5hbWUgPSBpbmZvLmdldCgnZW50aXR5JykgfHwgZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5KSB7XG4gICAgICAgICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBuYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGluZm87XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICAgIGVuZHBvaW50LnByb21pc2VGZXRjaGluZ1NlcnZlckluZm8gPSBwcm9taXNlO1xuICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nU2VydmVySW5mbyA9IG5vdztcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjYWxsZWQgd2hlbiBhbiBvZmZsaW5lIGNoYW5nZSB3YXMgc2VudCB0byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICpcbiAgICogPHA+XG4gICAqIE1heSBiZSBvdmVyd3JpdHRlbiB0byBhbHRlciBjaGFuZ2UgbWVzc2FnZSBlcnJvciBoYW5kbGluZyBiZWhhdmlvci4gVGhlIGRlZmF1bHQgaW1wbGVtZW50YXRpb24gd2lsbCBhdHRlbXB0XG4gICAqIHJlbG9hZGluZyB0aGUgc2VydmVyIGRhdGEgZm9yIHJlc3RvcmluZyB0aGUgY2xpZW50IHN0YXRlIHN1Y2ggdGhhdCBpdCByZWZsZWN0cyB0aGUgc2VydmVyIHN0YXRlLiBXaGVuIHRoaXNcbiAgICogc3VjY2VlZGVkLCB0aGUgb2ZmbGluZSBjaGFuZ2UgaXMgZWZmZWN0aXZlbHkgcmV2ZXJ0ZWQgYW5kIHRoZSBjaGFuZ2UgbWVzc2FnZSBpcyBkcm9wcGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBBbiBvdmVyd3JpdHRlbiBpbXBsZW1lbnRhdGlvbiBtYXkgZGVjaWRlZCB3aGV0aGVyIHRvIHJldmVydCBmYWlsZWQgY2hhbmdlcyBiYXNlZCBvbiB0aGUgZXJyb3IgcmVwb3J0ZWQuXG4gICAqIDwvcD5cbiAgICogPHA+XG4gICAqIE5vdGljZSwgdGhlIG1ldGhvZCBpcyBub3QgY2FsbGVkIHdoZW4gdGhlIG9mZmxpbmUgY2hhbmdlIGZhaWxlZCBkdWUgdG8gYSBjb25uZWN0aXZpdHkgaXNzdWUuXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHBhcmFtIGVycm9yIHJlcG9ydGVkIGJ5IHJlbW90ZSBzZXJ2ZXIuXG4gICAqIEBwYXJhbSBtZXNzYWdlIGNoYW5nZSByZXBvcnRlZCwgYXR0cmlidXRlcyBvZiB0eXBlIExpdmVEYXRhTWVzc2FnZS5cbiAgICogQHBhcmFtIG9wdGlvbnMgY29udGV4dCBpbmZvcm1hdGlvbiByZXF1aXJlZCB0byBhY2Nlc3MgdGhlIGRhdGEgbG9jYWxseSBhcyB3ZWxsIGFzIHJlbW90ZWx5LlxuICAgKiBAcmV0dXJuIHthbnl9IFByb21pc2UgaW5kaWNhdGluZyBzdWNjZXNzIHRvIGRyb3AgdGhlIGNoYW5nZSBtZXNzYWdlIGFuZCBwcm9jZWVkIHdpdGggdGhlIG5leHQgY2hhbmdlLCBvclxuICAgKiAgICByZWplY3Rpb24gaW5kaWNhdGluZyB0aGUgY2hhbmdlIG1lc3NhZ2UgaXMga2VwdCBhbmQgcmV0cmllZCBsYXRlciBvbi5cbiAgICovXG4gIHByb3RlY3RlZCBwcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3I6IEVycm9yLCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCwgb3B0aW9uczoge1xuICAgIGVudGl0eTogc3RyaW5nLFxuICAgIG1vZGVsVHlwZTogTW9kZWxDdG9yLFxuICAgIHVybFJvb3Q6IHN0cmluZyxcbiAgICBsb2NhbFN0b3JlOiBTdG9yZSxcbiAgICBzaWxlbnQ/OiBib29sZWFuXG4gIH0pOiBQcm9taXNlTGlrZTx2b2lkIHwgYW55PiB7XG4gICAgaWYgKCFlcnJvcikge1xuICAgICAgLy8gbWVzc2FnZSB3YXMgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseVxuICAgICAgaWYgKCF0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xuICAgICAgICAvLyB3aGVuIG5vdCB1c2luZyBzb2NrZXRzLCBmZXRjaCBjaGFuZ2VzIG5vd1xuICAgICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tvcHRpb25zLmVudGl0eV07XG4gICAgICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgICAgIC8vIHdpbGwgcHVsbCB0aGUgY2hhbmdlIGNhdXNlZCBieSB0aGUgb2ZmbGluZSBtZXNzYWdlIGFuZCB1cGRhdGUgdGhlIG1lc3NhZ2UgdGltZSxcbiAgICAgICAgICAvLyBzbyB0aGF0IHdlIGF2b2lkIHRoZSBzaXR1YXRpb24gd2hlcmUgdGhlIGNoYW5nZSBjYXVzZWQgYnkgcmVwbGF5aW5nIHRoZSBvZmZsaW5lXG4gICAgICAgICAgLy8gY2hhbmdlIHJlc3VsdHMgaW4gYSBjb25mbGljdCBsYXRlciBvbi4uLlxuICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBRLnJlc29sdmUobWVzc2FnZSk7XG4gICAgfVxuXG4gICAgLy8gZmFpbGVkLCBldmVudHVhbGx5IHVuZG8gdGhlIG1vZGlmaWNhdGlvbnMgc3RvcmVkXG4gICAgaWYgKCFvcHRpb25zLmxvY2FsU3RvcmUpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XG4gICAgfVxuXG4gICAgLy8gcmV2ZXJ0IG1vZGlmaWNhdGlvbiBieSByZWxvYWRpbmcgZGF0YVxuICAgIGxldCBtb2RlbFR5cGUgPSBvcHRpb25zLm1vZGVsVHlwZSB8fCBNb2RlbDtcbiAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1lc3NhZ2UuZ2V0KCdkYXRhJyksIHtcbiAgICAgIGVudGl0eTogb3B0aW9ucy5lbnRpdHlcbiAgICB9KTtcbiAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XG4gICAgbGV0IHRyaWdnZXJFcnJvciA9ICgpID0+IHtcbiAgICAgIC8vIGluZm9ybSBjbGllbnQgYXBwbGljYXRpb24gb2YgdGhlIG9mZmxpbmUgY2hhbmdlcyBlcnJvclxuICAgICAgbGV0IGNoYW5uZWwgPSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpO1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdDogdHJpZ2dlcmluZyBlcnJvciBmb3IgY2hhbm5lbCAnICsgY2hhbm5lbCArICcgb24gc3RvcmUnLCBlcnJvcik7XG4gICAgICBpZiAoIW9wdGlvbnMuc2lsZW50KSB7XG4gICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIGVycm9yLCBtb2RlbCk7XG4gICAgICB9XG4gICAgfTtcbiAgICBsZXQgbG9jYWxPcHRpb25zID0ge1xuICAgICAgLy8ganVzdCBhZmZlY3QgbG9jYWwgc3RvcmVcbiAgICAgIHN0b3JlOiBvcHRpb25zLmxvY2FsU3RvcmVcbiAgICB9O1xuICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICB1cmxSb290OiBvcHRpb25zLnVybFJvb3QsXG4gICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICB9O1xuICAgIGlmIChtb2RlbC5pZCkge1xuICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcbiAgICAgIC8vIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLnVybCgpID09PSByZW1vdGVPcHRpb25zLnVybCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGNyZWF0aW9uIGZhaWxlZCwganVzdCBkZWxldGUgbG9jYWxseVxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbWVzc2FnZS5nZXQoJ21ldGhvZCcpID09PSAnY3JlYXRlJyk7XG4gICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICB9XG4gICAgcmV0dXJuICg8US5Qcm9taXNlPGFueT4+PGFueT5tb2RlbC5mZXRjaChyZW1vdGVPcHRpb25zKSkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHJlbG9hZGVkIHRoZSBkYXRhIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucywgd2hpY2ggc3VjY2VlZGVkLi4uXG4gICAgICByZXR1cm4gbW9kZWwuc2F2ZShkYXRhLCBsb2NhbE9wdGlvbnMpLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICB9LCAoZmV0Y2hSZXNwOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAvLyBvcmlnaW5hbCByZXF1ZXN0IGZhaWxlZCBhbmQgdGhlIGNvZGUgYWJvdmUgdHJpZWQgdG8gcmV2ZXJ0IHRoZSBsb2NhbCBtb2RpZmljYXRpb25zIGJ5IHJlbG9hZGluZyB0aGUgZGF0YSwgd2hpY2ggZmFpbGVkIGFzIHdlbGwuLi5cbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBmZXRjaFJlc3AgJiYgZmV0Y2hSZXNwLnN0YXR1c0NvZGU7XG4gICAgICBzd2l0Y2ggKHN0YXR1c0NvZGUpIHtcbiAgICAgICAgY2FzZSA0MDQ6IC8vIE5PVCBGT1VORFxuICAgICAgICBjYXNlIDQwMTogLy8gVU5BVVRIT1JJWkVEXG4gICAgICAgIGNhc2UgNDEwOiAvLyBHT05FKlxuICAgICAgICAgIC8vIC4uLmJlY2F1c2UgdGhlIGl0ZW0gaXMgZ29uZSBieSBub3csIG1heWJlIHNvbWVvbmUgZWxzZSBjaGFuZ2VkIGl0IHRvIGJlIGRlbGV0ZWRcbiAgICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveShsb2NhbE9wdGlvbnMpOyAvLyBzaWxlbnQgcmVnYXJkaW5nIHRyaWdnZXJFcnJvclxuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChmZXRjaFJlc3ApLmZpbmFsbHkodHJpZ2dlckVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBmZWVkcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzIHRvIHRoZSByZW1vdGUgc2VydmVyLlxuICAgKlxuICAgKiA8cD5cbiAgICogRHVlIHRvIGNsaWVudCBjb2RlIHNldHRpbmcgdXAgbW9kZWxzIG9uZSBhdCBhIHRpbWUsIHRoaXMgbWV0aG9kIGlzIGNhbGxlZCBtdWx0aXBsZSB0aW1lcyBkdXJpbmcgaW5pdGlhbCBzZXR1cCBvZlxuICAgKiAjZW5kcG9pbnRzLiBUaGUgZmlyc3QgY2FsbCBmZXRjaGVzIHBlbmRpbmcgb2ZmbGluZSAjbWVzc2FnZXMsIG9yZGVyZWQgYnkgcHJpb3JpdHkgYW5kIHRpbWUuIFRoZW4gdGhlICNtZXNzYWdlc1xuICAgKiBhcmUgc2VuZCB0byB0aGUgcmVtb3RlIHNlcnZlciB1bnRpbCBkZXBsZXRlZCwgYW4gZXJyb3Igb2NjdXJzLCBvciBzb21lIG1pc3NpbmcgZW5kcG9pbnQgaXMgZW5jb3VudGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBUaGUgbWV0aG9kIGlzIHRyaWdnZXJlZCBlYWNoIHRpbWUgYW4gZW5kcG9pbnQgaXMgcmVnaXN0ZXJlZCwgb3Igc3RhdGUgY2hhbmdlcyB0byBvbmxpbmUgZm9yIGFueSBlbmRwb2ludC4gV2hlblxuICAgKiBzdGF0ZSBjaGFuZ2VzIGZyb20gb2ZmbGluZSB0byBvbmxpbmUgKGRpc3JlZ2FyZGluZyBlbmRwb2ludCkgbWVzc2FnZSBzdWJtaXNzaW9uIGlzIHJlc3RhcnRlZCBieSByZXNldHRpbmcgdGhlXG4gICAqICNtZXNzYWdlc1Byb21pc2UuIE90aGVyd2lzZSwgc3Vic2VxdWVudCBjYWxscyBjaGFpbiB0byB0aGUgZW5kIG9mICNtZXNzYWdlc1Byb21pc2UuXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHJldHVybiB7UHJvbWlzZX0gb2YgI21lc3NhZ2VzIENvbGxlY3Rpb24sIG9yIGxhc3QgcmVjZW50IG9mZmxpbmUgcmVqZWN0aW9uXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBwcml2YXRlIF9zZW5kTWVzc2FnZXMoKTogUS5Qcm9taXNlPENvbGxlY3Rpb24+IHtcbiAgICAvLyBub3QgcmVhZHkgeWV0XG4gICAgaWYgKCF0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPENvbGxlY3Rpb24+KHVuZGVmaW5lZCk7XG4gICAgfVxuXG4gICAgLy8gcHJvY2Vzc2VzIG1lc3NhZ2VzIHVudGlsIG5vbmUgbGVmdCwgaGl0dGluZyBhIG1lc3NhZ2Ugb2YgYSBub3QgeWV0IHJlZ2lzdGVyZWQgZW5kcG9pbnQsIG9yIGVudGVyaW5nXG4gICAgLy8gYSBub24tcmVjb3ZlcmFibGUgZXJyb3IuIFRoZSBwcm9taXNlIHJldHVybmVkIHJlc29sdmVzIHRvIHRoaXMubWVzc2FnZXMgd2hlbiBkb25lLlxuICAgIGxldCBuZXh0TWVzc2FnZSA9ICgpOiBhbnkgPT4ge1xuICAgICAgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgICAgIH1cblxuICAgICAgbGV0IG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gdGhpcy5tZXNzYWdlcy5tb2RlbHNbMF07XG4gICAgICBsZXQgZW50aXR5ID0gbWVzc2FnZS5pZC5zdWJzdHIoMCwgbWVzc2FnZS5pZC5pbmRleE9mKCd+JykpO1xuICAgICAgaWYgKCFlbnRpdHkpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignc2VuZE1lc3NhZ2UgJyArIG1lc3NhZ2UuaWQgKyAnIHdpdGggbm8gZW50aXR5IScpO1xuICAgICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCkudGhlbihuZXh0TWVzc2FnZSk7XG4gICAgICB9XG4gICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xuICAgICAgaWYgKCFlbmRwb2ludCkge1xuICAgICAgICByZXR1cm4gdGhpcy5tZXNzYWdlcztcbiAgICAgIH1cbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LmNoYW5uZWwgPT09IG1lc3NhZ2UuZ2V0KCdjaGFubmVsJyksICdjaGFubmVsIG9mIGVuZHBvaW50ICcgKyBlbmRwb2ludC5jaGFubmVsICsgJyBkb2VzIG5vdCBtYXRjaCBjaGFubmVsIG9mIG1lc3NhZ2UgJyArIG1lc3NhZ2UuZ2V0KCdjaGFubmVsJykpO1xuICAgICAgbGV0IG1zZyA9IHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIG1lc3NhZ2UuYXR0cmlidXRlcyk7XG5cbiAgICAgIGxldCBtb2RlbFR5cGUgPSBlbmRwb2ludC5tb2RlbFR5cGUgfHwgTW9kZWw7XG4gICAgICBsZXQgbW9kZWwgPSBuZXcgbW9kZWxUeXBlKG1zZy5kYXRhLCB7XG4gICAgICAgIGVudGl0eTogZW5kcG9pbnQuZW50aXR5XG4gICAgICB9KTtcbiAgICAgIG1vZGVsLmlkID0gbWVzc2FnZS5nZXQoJ21ldGhvZCcpICE9PSAnY3JlYXRlJyAmJiBtZXNzYWdlLmdldCgnaWQnKTtcbiAgICAgIGxldCByZW1vdGVPcHRpb25zOiBhbnkgPSB7XG4gICAgICAgIHVybFJvb3Q6IGVuZHBvaW50LnVybFJvb3QsXG4gICAgICAgIHN0b3JlOiB7fSAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxuICAgICAgfTtcbiAgICAgIGlmIChtb2RlbC5pZCkge1xuICAgICAgICByZW1vdGVPcHRpb25zLnVybCA9IHJlbW90ZU9wdGlvbnMudXJsUm9vdCArIChyZW1vdGVPcHRpb25zLnVybFJvb3QuY2hhckF0KHJlbW90ZU9wdGlvbnMudXJsUm9vdC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1vZGVsLmlkO1xuICAgICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xuICAgICAgfVxuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZW5kTWVzc2FnZSAnICsgbW9kZWwuaWQpO1xuICAgICAgbGV0IG9mZmxpbmVPcHRpb25zID0ge1xuICAgICAgICBlbnRpdHk6IGVuZHBvaW50LmVudGl0eSxcbiAgICAgICAgbW9kZWxUeXBlOiBlbmRwb2ludC5tb2RlbFR5cGUsXG4gICAgICAgIHVybFJvb3Q6IGVuZHBvaW50LnVybFJvb3QsXG4gICAgICAgIGxvY2FsU3RvcmU6IGVuZHBvaW50LmxvY2FsU3RvcmVcbiAgICAgIH07XG4gICAgICByZXR1cm4gdGhpcy5fYXBwbHlSZXNwb25zZSh0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCksIGVuZHBvaW50LCBtc2csIHJlbW90ZU9wdGlvbnMsIG1vZGVsKS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gc3VjY2VlZGVkXG4gICAgICAgIHJldHVybiB0aGlzLnByb2Nlc3NPZmZsaW5lTWVzc2FnZVJlc3VsdChudWxsLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucyk7XG4gICAgICB9LCAoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgaWYgKGVycm9yLnN0YXR1c0NvZGUpIHtcbiAgICAgICAgICAvLyByZW1vdGUgZmFpbGVkXG4gICAgICAgICAgcmV0dXJuIFEodGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQoZXJyb3IsIG1lc3NhZ2UsIG9mZmxpbmVPcHRpb25zKSkuY2F0Y2goKGVycm9yMikgPT4ge1xuICAgICAgICAgICAgLy8gZXhwbGljaXRseSBkaXNjb25uZWN0IGR1ZSB0byBlcnJvciBpbiBlbmRwb2ludFxuICAgICAgICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSBlbmRwb2ludC5lbnRpdHk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5vbkRpc2Nvbm5lY3QoZW5kcG9pbnQpLnRoZW5SZWplY3QoZXJyb3IyKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBjb25uZWN0aXZpdHkgaXNzdWUsIGtlZXAgcmVqZWN0aW9uXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIGFwcGx5aW5nIGNoYW5nZSBzdWNjZWVkZWQgb3Igc3VjY2Vzc2Z1bGx5IHJlY292ZXJlZCBjaGFuZ2VcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpO1xuICAgICAgfSkudGhlbihuZXh0TWVzc2FnZSk7XG4gICAgfTtcblxuICAgIGRpYWcuZGVidWcuaW5mbygnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLl9zZW5kTWVzc2FnZXMnKTtcbiAgICBsZXQgcSA9IHRoaXMubWVzc2FnZXNQcm9taXNlO1xuICAgIGlmICghcSkge1xuICAgICAgLy8gaW5pdGlhbGx5IGZldGNoIGFsbCBtZXNzYWdlc1xuICAgICAgcSA9IFEodGhpcy5tZXNzYWdlcy5mZXRjaCg8QmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucz57XG4gICAgICAgIHNvcnRPcmRlcjogW1xuICAgICAgICAgICcrcHJpb3JpdHknLFxuICAgICAgICAgICcrdGltZScsXG4gICAgICAgICAgJytpZCdcbiAgICAgICAgXVxuICAgICAgfSkpO1xuICAgIH0gZWxzZSBpZiAodGhpcy5tZXNzYWdlc1Byb21pc2UuaXNSZWplY3RlZCgpKSB7XG4gICAgICAvLyBlYXJseSByZWplY3Rpb25cbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICB9IGVsc2UgaWYgKCF0aGlzLm1lc3NhZ2VzLmxlbmd0aCkge1xuICAgICAgLy8gbm8gbW9yZSBtZXNzYWdlc1xuICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXNQcm9taXNlO1xuICAgIH1cblxuICAgIC8vIGtpY2sgdG8gcHJvY2VzcyBwZW5kaW5nIG1lc3NhZ2VzXG4gICAgdGhpcy5tZXNzYWdlc1Byb21pc2UgPSBxLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgfVxuXG4gIHByaXZhdGUgc3RvcmVNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIHFNc2c6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2U+KTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPiB7XG4gICAgcmV0dXJuIHFNc2cudGhlbigobXNnOiBMaXZlRGF0YU1lc3NhZ2UpID0+IHtcbiAgICAgIGxldCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zO1xuICAgICAgbGV0IGlkID0gdGhpcy5tZXNzYWdlcy5tb2RlbElkKG1zZyk7XG4gICAgICBkaWFnLmRlYnVnLmluZm8oJ3N0b3JlTWVzc2FnZSAnICsgaWQpO1xuICAgICAgdmFyIG1lc3NhZ2U6IExpdmVEYXRhTWVzc2FnZU1vZGVsID0gaWQgJiYgPExpdmVEYXRhTWVzc2FnZU1vZGVsPnRoaXMubWVzc2FnZXMuZ2V0KGlkKTtcbiAgICAgIGlmIChtZXNzYWdlKSB7XG4gICAgICAgIC8vIHVzZSBleGlzdGluZyBpbnN0YW5jZSwgc2hvdWxkIG5vdCBiZSB0aGUgY2FzZSB1c3VhbGx5XG4gICAgICAgIG9wdGlvbnMgPSA8QmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucz57XG4gICAgICAgICAgbWVyZ2U6IHRydWVcbiAgICAgICAgfTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIGluc3RhbnRpYXRlIG5ldyBtb2RlbCwgaW50ZW50aW9uYWxseSBub3QgYWRkZWQgdG8gY29sbGVjdGlvblxuICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwobXNnLCB7XG4gICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcbiAgICAgICAgICBzdG9yZTogdGhpcy5tZXNzYWdlcy5zdG9yZVxuICAgICAgICB9KTtcbiAgICAgICAgbWVzc2FnZS5zZXQoJ2NoYW5uZWwnLCBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBRKG1lc3NhZ2Uuc2F2ZShtc2csIG9wdGlvbnMpKS50aGVuUmVzb2x2ZShtZXNzYWdlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBtc2c6IExpdmVEYXRhTWVzc2FnZSwgcU1lc3NhZ2U6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4pOiBRLlByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xuICAgICAgaWYgKCFtZXNzYWdlKSB7XG4gICAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xuICAgICAgICBpZiAoIWlkKSB7XG4gICAgICAgICAgLy8gbXNnIGlzIG5vdCBwZXJzaXN0ZW50XG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgbWVzc2FnZSA9IDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XG4gICAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICAgIG1lc3NhZ2UgPSBuZXcgdGhpcy5tZXNzYWdlcy5tb2RlbCh7XG4gICAgICAgICAgICBfaWQ6IG1zZy5faWRcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiB0aGlzLm1lc3NhZ2VzLFxuICAgICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdyZW1vdmVNZXNzYWdlICcgKyBtZXNzYWdlLmlkKTtcbiAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBjbGVhcihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKTogUS5Qcm9taXNlPGFueT4ge1xuICAgIGlmIChjb2xsZWN0aW9uKSB7XG4gICAgICB2YXIgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCA9IHRoaXMuZ2V0RW5kcG9pbnQoY29sbGVjdGlvbik7XG4gICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgaWYgKHRoaXMubWVzc2FnZXMpIHtcbiAgICAgICAgICB0aGlzLm1lc3NhZ2VzLmRlc3Ryb3koKTtcbiAgICAgICAgfVxuICAgICAgICBjb2xsZWN0aW9uLnJlc2V0KCk7XG4gICAgICAgIHJldHVybiB0aGlzLnNldFRpbWVzdGFtcChlbmRwb2ludC5jaGFubmVsLCAnJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIGNsb3NlIHRoZSBzb2NrZXQgZXhwbGljaXRcbiAgICovXG4gIHB1YmxpYyBjbG9zZSgpIHtcbiAgICBpZiAodGhpcy5tZXNzYWdlcy5zdG9yZSkge1xuICAgICAgdGhpcy5tZXNzYWdlcy5zdG9yZS5jbG9zZSgpO1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmVuZHBvaW50cyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5lbmRwb2ludHNba2V5c1tpXV0uY2xvc2UoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gbWl4aW5zXG5sZXQgc3luY1N0b3JlID0gXy5leHRlbmQoU3luY1N0b3JlLnByb3RvdHlwZSwge1xuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZScsXG5cbiAgbG9jYWxTdG9yZTogV2ViU3FsU3RvcmUsXG4gIHVzZUxvY2FsU3RvcmU6IHRydWUsXG4gIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSxcbiAgdXNlT2ZmbGluZUNoYW5nZXM6IHRydWUsXG4gIHNvY2tldFBhdGg6ICcnXG59KTtcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFN5bmNTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKHN5bmNTdG9yZSkpKTtcbiJdfQ==