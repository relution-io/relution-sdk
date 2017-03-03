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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL1N5bmNTdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBR04sSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIsSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxRQUFRLFdBQU0sa0JBQWtCLENBQUMsQ0FBQTtBQUM3QyxJQUFZLFFBQVEsV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUN4QyxJQUFZLEdBQUcsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU5Qix3QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1Qyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsNEJBQTBCLGVBQWUsQ0FBQyxDQUFBO0FBQzFDLDRCQUEwQixlQUFlLENBQUMsQ0FBQTtBQUMxQyw2QkFBMkIsZ0JBQWdCLENBQUMsQ0FBQTtBQUM1QyxnQ0FBb0QsbUJBQW1CLENBQUMsQ0FBQTtBQUN4RSxrQ0FBd0QscUJBQXFCLENBQUMsQ0FBQTtBQUM5RSxzQkFBd0MsU0FBUyxDQUFDLENBQUE7QUFDbEQsMkJBQXVDLGNBQWMsQ0FBQyxDQUFBO0FBRXREOzs7Ozs7O0dBT0c7QUFDVSxVQUFFLEdBQXlCLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDbEQsT0FBTyxPQUFPLEtBQUssVUFBVTtRQUM3QixDQUFDLENBQUM7WUFDQSwwRkFBMEY7WUFDMUYsSUFBSSxDQUFDO2dCQUNILE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1lBQ3RELENBQUU7WUFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHFEQUFxRCxHQUFHLEtBQUssSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDbEcsQ0FBQztRQUNILENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUVSOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDtJQUErQiw2QkFBSztJQXVEbEMsbUJBQVksT0FBYTtRQUN2QixrQkFBTSxPQUFPLENBQUMsQ0FBQztRQXhCVixjQUFTLEdBR1osRUFBRSxDQUFDO1FBTVA7Ozs7Ozs7O1dBUUc7UUFDSyx1QkFBa0IsR0FBVyxLQUFLLENBQUM7UUFPekMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxPQUFPLFVBQUUsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25ELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDL0MsSUFBSSxDQUFDLGVBQWUsR0FBRyxLQUFLLENBQUM7UUFDL0IsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNPLDhCQUFVLEdBQXBCLFVBQXFCLEdBQVc7UUFDOUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7U0FDOUIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7O1NBSUs7SUFDRyw4QkFBVSxHQUFsQixVQUFtQixPQUFlO1FBQ2hDLElBQUksU0FBUyxHQUFHLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFO1lBQ3pDLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztTQUMxQixDQUFDLENBQUM7UUFDSCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLElBQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RELElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUM7WUFDMUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xFLCtDQUErQztnQkFDL0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUM5QyxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7aUJBQ3hCLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN4QyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDN0UsQ0FBQztJQUNILENBQUM7SUFFTywrQkFBVyxHQUFuQixVQUFvQixHQUFXLEVBQUUsT0FBYTtRQUE5QyxpQkFXQztRQVZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxTQUFTLEVBQUUsS0FBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxLQUFLLEtBQUksQ0FBQyxTQUFTLEVBRkcsQ0FFSCxDQUFDLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDckYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsNEVBQTRFLENBQUMsQ0FBQztZQUM5RixJQUFNLEtBQUssR0FBa0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QyxnQ0FBZ0M7WUFDaEMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFTLEtBQUssQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QixDQUFDO0lBRVMsZ0NBQVksR0FBdEIsVUFBdUIsaUJBQXFDLEVBQUUsU0FBb0I7UUFBbEYsaUJBZ0NDO1FBL0JDLElBQUksT0FBTyxHQUFHLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQzdDLElBQUksTUFBTSxHQUFHLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUN0QyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN0QixzQ0FBc0M7WUFDdEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QixPQUFPLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQyxJQUFJLFVBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsR0FBRyxNQUFNLENBQUMsQ0FBQztnQkFDdkUsVUFBUSxHQUFHLElBQUksMkJBQVksQ0FBQztvQkFDMUIsTUFBTSxFQUFFLE1BQU07b0JBQ2QsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE9BQU8sRUFBRSxPQUFPO29CQUNoQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7b0JBQzNCLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtpQkFDeEIsQ0FBQyxDQUFDO2dCQUNILElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEdBQUcsVUFBUSxDQUFDO2dCQUVsQyxVQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFRLENBQUMsQ0FBQztnQkFDdEQsVUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxVQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQy9HLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO2dCQUMzQixJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDakMsVUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDdEQsVUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVEsQ0FBQyxDQUFDO1lBQ2pELENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTiwrREFBK0Q7Z0JBQy9ELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxVQUFRLENBQUMsT0FBTyxLQUFLLE9BQU8sRUFBNUIsQ0FBNEIsRUFBRSxzREFBc0QsQ0FBQyxDQUFDO2dCQUM5RyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsVUFBUSxDQUFDLFFBQVEsS0FBSyxLQUFJLENBQUMsUUFBUSxFQUFuQyxDQUFtQyxFQUFFLDREQUE0RCxDQUFDLENBQUM7WUFDN0gsQ0FBQztZQUNELE1BQU0sQ0FBQyxVQUFRLENBQUM7UUFDbEIsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsNkJBQVMsR0FBVCxVQUFVLEtBQVk7UUFDcEIsS0FBSyxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBYSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVEOzs7O09BSUc7SUFDSCxrQ0FBYyxHQUFkLFVBQWUsVUFBc0I7UUFDbkMsVUFBVSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEUsQ0FBQztJQUVELCtCQUFXLEdBQVgsVUFBWSxpQkFBcUM7UUFDL0MsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN4RCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7Z0JBQ2hCLHFGQUFxRjtnQkFDckYsSUFBSSxTQUFTLEdBQUcseUJBQVksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxXQUFXLENBQUM7Z0JBQzFHLE1BQU0sQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsU0FBUyxZQUFZLFFBQVEsQ0FBQyxTQUFTLENBQUM7WUFDL0YsQ0FBQyxFQUFFLHNCQUFzQixDQUFDLENBQUM7WUFDM0IsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUVELG9DQUFnQixHQUFoQixVQUFpQixRQUFzQjtRQUNyQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDbEIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQzdDLElBQUksV0FBVyxHQUFHO2dCQUNoQixRQUFRLEVBQUUsUUFBUTthQUNuQixDQUFDO1lBQ0YsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixJQUFJLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pFLFdBQVcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM5QyxXQUFXLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztZQUNsQyxDQUFDO1lBQ0QsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMxQyxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNILHVDQUFtQixHQUFuQjtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSx1QkFBVSxDQUFDLFNBQVMsRUFBRTtnQkFDeEMsS0FBSyxFQUFFLHNDQUFvQjtnQkFDM0IsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7YUFDbkQsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7SUFFRCw2Q0FBeUIsR0FBekI7UUFDRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDM0MsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUMsU0FBUyxFQUFFO2dCQUMxQyxLQUFLLEVBQUUsMENBQXNCO2dCQUM3QixLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQzthQUNuRCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDekIsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQVk7UUFBakQsaUJBK0JDO1FBOUJDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksUUFBUSxJQUFJLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLFdBQVc7WUFDWCxJQUFJLFNBQVMsR0FBUTtnQkFDbkIsc0JBQXNCLEVBQUUsSUFBSTthQUM3QixDQUFDO1lBQ0YsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLG1CQUFtQjtZQUN2RCxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUM7WUFDL0YsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztZQUNyQyxDQUFDO1lBRUQsU0FBUztZQUNULFFBQVEsQ0FBQyxNQUFNLEdBQUcsVUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3ZELFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRTtnQkFDNUIsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsRUFBRTtvQkFDakUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLEVBQUUsS0FBSyxRQUFRLEVBQWYsQ0FBZSxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNaLENBQUMsQ0FBQyxDQUFDO1lBQ0gsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFO2dCQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUN6QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxDQUFDLENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBQyxHQUFvQjtnQkFDeEQsTUFBTSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbkUsQ0FBQyxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO0lBQ0gsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxRQUFzQixFQUFFLElBQWE7UUFDaEQsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLElBQUksQ0FBQyxDQUFDO1lBRXRFLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDL0IsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztZQUM3QixJQUFJLEdBQUcsSUFBSSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDMUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7b0JBQ2xCLE1BQU0sRUFBRSxJQUFJO29CQUNaLE9BQU8sRUFBRSxPQUFPO29CQUNoQixJQUFJLEVBQUUsSUFBSTtpQkFDWCxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVPLGtDQUFjLEdBQXRCLFVBQXVCLE9BQWU7UUFDcEMsTUFBTSxDQUFDLElBQUksR0FBRyxPQUFPLEdBQUcsY0FBYyxDQUFDO0lBQ3pDLENBQUM7SUFFRCx3Q0FBd0M7SUFDaEMsc0NBQWtCLEdBQTFCLFVBQTJCLE9BQWU7UUFDeEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN6QixDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBQ0QsMkNBQTJDO1FBQzNDLElBQUksSUFBSSxHQUFHLHNCQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNsQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELHdDQUF3QztJQUNoQyxzQ0FBa0IsR0FBMUIsVUFBMkIsT0FBZSxFQUFFLElBQVM7UUFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ1Ysc0JBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUEsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxzQkFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDN0QsQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU8scUNBQWlCLEdBQXpCLFVBQTBCLE9BQWU7UUFBekMsaUJBZUM7UUFkQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNwQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLCtCQUErQjtnQkFDL0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdEQsQ0FBQztZQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDO2dCQUNqQyxNQUFNLENBQUMsS0FBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksS0FBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQztvQkFDakYsT0FBTyxFQUFFLE9BQU87b0JBQ2hCLFNBQVMsRUFBRSxLQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDO2lCQUM1QyxFQUFFO29CQUNELEtBQUssRUFBRSxLQUFJLENBQUMsVUFBVSxDQUFDLEtBQUs7aUJBQzdCLENBQUMsQ0FBQyxDQUFDO1lBQ1IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxPQUFlO1FBQTVCLGlCQWFDO1FBWkMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNQLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEtBQUs7WUFDcEMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEdBQUc7WUFDWCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsR0FBRyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMxQyxDQUFDLENBQUMsQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDaEMsQ0FBQztJQUVELGdDQUFZLEdBQVosVUFBYSxPQUFlLEVBQUUsSUFBUztRQUF2QyxpQkFvQkM7UUFuQkMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3hDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNQLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEtBQUs7WUFDcEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ2hCLFNBQVMsRUFBRSxJQUFJO2lCQUNoQixDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBRztZQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxHQUFHLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM5RSxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ1QsTUFBTSxDQUFDLEtBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0lBQ2hDLENBQUM7SUFFRCw2QkFBUyxHQUFULFVBQVUsUUFBc0I7UUFBaEMsaUJBbUNDO1FBbENDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsd0VBQXdFO1lBQ3hFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDN0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0QsQ0FBQyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBSyxJQUFLLE9BQUEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBcEIsQ0FBb0IsQ0FBQyxDQUFDO1lBQ2xFLENBQUM7WUFFRCw2QkFBNkI7WUFDN0IsUUFBUSxDQUFDLFdBQVcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUM1Qix1Q0FBdUM7Z0JBQ3ZDLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDdEMsZ0NBQWdDO29CQUNoQyxFQUFFLENBQUMsQ0FBQyxLQUFJLENBQUMsa0JBQWtCLEtBQUssS0FBSyxJQUFJLEtBQUksQ0FBQyxrQkFBa0IsS0FBSyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDckYsd0NBQXdDO3dCQUN4QyxLQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQzt3QkFDNUIsS0FBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQztvQkFDakMsQ0FBQztvQkFDRCxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM5QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxLQUFLO29CQUNiLGlFQUFpRTtvQkFDakUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUNYLDZDQUE2Qzt3QkFDN0MsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JDLENBQUM7b0JBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQU8sS0FBSyxDQUFDLENBQUM7Z0JBQy9CLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNULHdFQUF3RTtnQkFDeEUsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQ3pCLEtBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDOUMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO0lBQzlCLENBQUM7SUFFRCxnQ0FBWSxHQUFaLFVBQWEsUUFBc0I7UUFBbkMsaUJBb0JDO1FBbkJDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUNELFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUM3QixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFDO1FBQ2xDLENBQUM7UUFFRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztZQUNiLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLElBQVUsUUFBUSxDQUFDLE1BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUNyRCx3REFBd0Q7Z0JBQ2xELFFBQVEsQ0FBQyxNQUFPLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQy9DLENBQUM7WUFDRCxNQUFNLENBQUMsU0FBUyxDQUFDO1FBQ25CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztZQUNULEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLEtBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNqRCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsK0JBQVcsR0FBWCxVQUFZLFFBQXNCLEVBQUUsR0FBb0I7UUFDdEQsSUFBSSxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO1FBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsV0FBVyxFQUFiLENBQWEsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRTFELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsY0FBYztRQUN0RCxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjO1FBQzFELENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELDZCQUFTLEdBQVQsVUFBVSxRQUFzQixFQUFFLEdBQW9CO1FBQXRELGlCQXVEQztRQXREQyxnRUFBZ0U7UUFDaEUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBa0IsSUFBSSxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQWlCLENBQUM7UUFDdEIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMvQixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QixvRUFBb0U7WUFDcEUsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDdkIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVO2FBQzNCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7WUFDM0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztnQkFDcEQsS0FBSyxFQUFFLElBQUk7YUFDWixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDYixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNkLHlGQUF5RjtnQkFDekYsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsNkNBQTZDLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQztZQUN2SCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuRyxDQUFDO1lBQ0QsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFO2dCQUNoRSxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPO2FBQzlCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07Z0JBQ2QsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ25DLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ2hCLENBQUM7Z0JBRUQsbURBQW1EO2dCQUNuRCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsSUFBSSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxFQUFFLEdBQUcsOEJBQThCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsSCxNQUFNLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLHdDQUF3QztZQUN4QyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ1osTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxLQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ3RFLG1DQUFtQztnQkFDbkMsS0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsd0JBQXdCO2dCQUM5RCxNQUFNLENBQUMsR0FBRyxDQUFDO1lBQ2IsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLEVBQUUsVUFBQyxLQUFZO1lBQ2QseUNBQXlDO1lBRXpDLGlDQUFpQztZQUNqQyxLQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9DLE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSx3QkFBSSxHQUFYLFVBQVksTUFBYyxFQUFFLEtBQXlCLEVBQUUsT0FBaUI7UUFBeEUsaUJBb0hDO1FBcEhzRCx1QkFBaUIsR0FBakIsWUFBaUI7UUFDdEUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUM7WUFDSCxJQUFJLFFBQVEsR0FBaUIsS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDZCxNQUFNLElBQUksS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2pDLENBQUM7WUFFRCxFQUFFLENBQUMsQ0FBQyx5QkFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsb0NBQW9DO2dCQUNwQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQzNDLElBQUksV0FBVyxHQUFnQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsK0RBQStEO29CQUNuSCxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7d0JBQ2pCLDJCQUEyQjt3QkFDM0IsV0FBVyxHQUFHLElBQUkseUJBQVcsQ0FDM0IsT0FBTyxFQUFTLCtEQUErRDt3QkFDL0UsS0FBSyxDQUFDLE9BQU8sRUFBRywrREFBK0Q7d0JBQy9FLElBQUksQ0FBWSwrREFBK0Q7eUJBQ2hGLENBQUM7d0JBQ0YsT0FBTyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7b0JBQ3BDLENBQUM7b0JBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUN0Qyw4QkFBOEI7d0JBQzlCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDOzRCQUN0QixLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSxPQUFPLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO3dCQUN4RCxDQUFDO3dCQUNELEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQzFHLEtBQUssQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO29CQUNsQyxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLDJDQUEyQztnQkFDM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDZCxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDeEIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO29CQUN4RCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNoRCxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sc0NBQXNDO2dCQUN0QyxNQUFNLElBQUksS0FBSyxDQUFDLHVEQUF1RCxDQUFDLENBQUM7WUFDM0UsQ0FBQztZQUVELDhGQUE4RjtZQUM5RixJQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsRUFBRTtnQkFDdEQsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzFCLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDakMsTUFBTSxJQUFJLEtBQUssQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDaEUsQ0FBQztZQUVELElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7WUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDMUMsSUFBSSxDQUFDO29CQUNILDRFQUE0RTtvQkFDNUUsRUFBRSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dCQUN2RSxxREFBcUQ7d0JBQ3JELElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQzVCLElBQUksQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQzt3QkFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUM5QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7d0JBQ3BCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQzt3QkFDbEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTs0QkFDN0Qsc0RBQXNEOzRCQUN0RCxJQUFJLEdBQUcsS0FBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDOzRCQUNqRCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxTQUFTLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQztnQ0FDckQsb0dBQW9HO2dDQUNwRyxNQUFNLENBQUMsSUFBSSxDQUFDOzRCQUNkLENBQUM7NEJBRUQsK0NBQStDOzRCQUMvQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dDQUMxQixNQUFNLENBQUMsS0FBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFJO29DQUM5Qyx5Q0FBeUM7b0NBQ3pDLElBQUksTUFBdUIsQ0FBQztvQ0FDNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3Q0FDMUIsTUFBTSxHQUFHLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7b0NBQ3BDLENBQUM7b0NBQ0QsTUFBTSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7Z0NBQ3hCLENBQUMsRUFBRSxVQUFDLEdBQWtCO29DQUNwQiwwQ0FBMEM7b0NBQzFDLElBQUksTUFBdUIsQ0FBQztvQ0FDNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO3dDQUM1QyxNQUFNLEdBQUcsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQ0FDdkMsQ0FBQztvQ0FDRCxNQUFNLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQztnQ0FDeEIsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUN2QixDQUFDLENBQUMsVUFBVTs0QkFFWixvRUFBb0U7NEJBQ3BFLHVFQUF1RTs0QkFDdkUsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsR0FBa0I7Z0NBQzFELEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztvQ0FDNUMsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDO2dDQUM3QyxDQUFDO2dDQUVELDhCQUE4QjtnQ0FDOUIsS0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEdBQUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztnQ0FDN0MsTUFBTSxDQUFDLElBQUksQ0FBQzs0QkFDZCxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyw4RUFBOEU7d0JBQ3RHLENBQUMsRUFBRTs0QkFDRCxxQ0FBcUM7NEJBQ3JDLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUM1RCxDQUFDLENBQUMsQ0FBQztvQkFDTCxDQUFDO29CQUVELG1CQUFtQjtvQkFDbkIsTUFBTSxDQUFDLEtBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzVELENBQUU7Z0JBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDZixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztnQkFDN0QsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBRTtRQUFBLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDZixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztJQUVPLCtCQUFXLEdBQW5CLFVBQW9CLE1BQWMsRUFBRSxLQUF5QixFQUFFLE9BQVksRUFDdkQsUUFBc0I7UUFEMUMsaUJBdURDO1FBckRDLElBQUksT0FBTyxHQUFXLEtBQU0sQ0FBQyxnQkFBZ0IsQ0FBQztRQUM5QyxJQUFJLElBQUksR0FBUSxJQUFJLENBQUM7UUFDckIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDZixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssUUFBUTtnQkFDWCxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3ZDLEtBQUssQ0FBQztZQUVSLEtBQUssT0FBTztnQkFDVixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdkIsTUFBTSxDQUFDO2dCQUNULENBQUM7Z0JBQ0QsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUM7b0JBQ2xCLEtBQUssRUFBRSxPQUFPO2lCQUNmLENBQUMsQ0FBQztnQkFDSCxLQUFLLENBQUM7WUFFUixLQUFLLFFBQVE7Z0JBQ1gsS0FBSyxDQUFDO1lBRVI7Z0JBQ0UsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUUsY0FBTSxPQUFBLE1BQU0sS0FBSyxNQUFNLEVBQWpCLENBQWlCLEVBQUUsa0JBQWtCLEdBQUcsTUFBTSxDQUFDLENBQUM7Z0JBQ3pFLFFBQVEsR0FBRyxLQUFLLENBQUM7Z0JBQ2pCLEtBQUssQ0FBQztRQUNWLENBQUM7UUFDRCxJQUFJLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxJQUFJLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDN0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLEtBQUssQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLE1BQU0sRUFBaEMsQ0FBZ0MsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBdkIsQ0FBdUIsRUFBRSw2Q0FBNkMsQ0FBQyxDQUFDO1FBQ2hHLElBQUksR0FBRyxHQUFvQjtZQUN6QixHQUFHLEVBQUUsTUFBTSxHQUFHLEdBQUcsR0FBVyxLQUFNLENBQUMsRUFBRTtZQUNyQyxFQUFFLEVBQVUsS0FBTSxDQUFDLEVBQUU7WUFDckIsTUFBTSxFQUFFLE1BQU07WUFDZCxJQUFJLEVBQUUsSUFBSTtZQUNWLDBHQUEwRztZQUMxRyxRQUFRLEVBQUUsUUFBUSxDQUFDLFFBQVE7WUFDM0IsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7U0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsSUFBSSxRQUF5QyxDQUFDO1FBQzlDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDYixzQ0FBc0M7WUFDdEMsUUFBUSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzFDLENBQUMsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQUMsT0FBNkI7Z0JBQzlDLHFEQUFxRDtnQkFDckQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7WUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBQ0QsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxJQUFxQjtZQUNsQyx1RUFBdUU7WUFDdkUsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsR0FBb0IsRUFBRSxPQUFZLEVBQzFELEtBQXlCLEVBQUUsUUFBeUM7UUFEekYsaUJBOENDO1FBM0NDLElBQUksT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDL0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUM7UUFFZCxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ2IsK0NBQStDO1lBQy9DLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDZCx5Q0FBeUM7Z0JBQ3pDLE1BQU0sQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBb0I7b0JBQzVFLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7b0JBQzlFLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsOEJBQThCO1lBQ3RELENBQUMsRUFBRSxVQUFDLEdBQWtCO2dCQUNwQiwrQ0FBK0M7Z0JBQy9DLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxLQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO29CQUM5QyxzRkFBc0Y7b0JBQ3RGLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDN0IsQ0FBQztnQkFBQyxJQUFJLENBQUMsQ0FBQztvQkFDTixpREFBaUQ7b0JBQ2pELE1BQU0sQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsS0FBb0I7d0JBQzVFLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7d0JBQzlFLE1BQU0sQ0FBQyxHQUFHLENBQUM7b0JBQ2IsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNyQixDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTFELE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1lBQ2YsOEJBQThCO1lBQzlCLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUNoQix5Q0FBeUM7Z0JBQ3pDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0JBQzFCLE1BQU0sQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNsQyxDQUFDO1lBQ0gsQ0FBQyxFQUFFLFVBQUMsR0FBa0I7Z0JBQ3BCLDBDQUEwQztnQkFDMUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDckMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZ0NBQVksR0FBcEIsVUFBcUIsUUFBc0IsRUFBRSxHQUFvQixFQUFFLE9BQVksRUFDMUQsS0FBeUI7UUFEOUMsaUJBa0VDO1FBaEVDLE9BQU8sR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ3hCLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGlDQUFpQztRQUVyRCxJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDO1FBQ3RCLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNULEdBQUcsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1lBQ3ZCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxrQkFBa0I7Z0JBQ2xCLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBRSxHQUFHLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbkUsQ0FBQztZQUNELEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLHlCQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCwwQkFBMEI7Z0JBQzFCLElBQUksYUFBYSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUN0RSxJQUFJLFVBQVUsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLFFBQVEsR0FBRyxJQUFJLG1CQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hELHNHQUFzRztnQkFDdEcsUUFBUSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7Z0JBQ3RCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO2dCQUN2QixRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztnQkFDdkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0JBQ3ZCLElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsQ0FBQztnQkFDekMsRUFBRSxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3BCLEdBQUcsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO29CQUN4QyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO3dCQUNkLEdBQUcsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDO29CQUN6QixDQUFDO2dCQUNILENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzt3QkFDZCxHQUFHLElBQUksR0FBRyxHQUFHLFNBQVMsQ0FBQztvQkFDekIsQ0FBQztnQkFDSCxDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCwyQ0FBMkM7UUFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBQzFELElBQUksSUFBSSxHQUFRO1lBQ2QsMEVBQTBFO1lBQzFFLEdBQUcsRUFBRSxHQUFHO1lBQ1IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2YsS0FBSyxFQUFFLEVBQUU7WUFDVCxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7WUFDaEMsb0JBQW9CO1lBQ3BCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztTQUNyQixDQUFDO1FBRUYsaURBQWlEO1FBQ2pELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsRUFBRTtZQUM3QyxTQUFTLEVBQUUsS0FBSSxDQUFDLFNBQVM7U0FDMUIsQ0FBQyxLQUFLLEtBQUksQ0FBQyxTQUFTLEVBRkcsQ0FFSCxDQUFDLENBQUM7UUFDdkIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDckYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsNEVBQTRFLENBQUMsQ0FBQztZQUM5RixJQUFNLEtBQUssR0FBa0IsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN6QyxnQ0FBZ0M7WUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELHNDQUFzQztRQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDakQsMkNBQTJDO2dCQUMzQyxPQUFPLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUM7WUFDekMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTyxrQ0FBYyxHQUF0QixVQUEwQixJQUFrQixFQUFFLFFBQXNCLEVBQUUsR0FBb0IsRUFDaEUsT0FBWSxFQUFFLEtBQXlCO1FBRGpFLGlCQXdIQztRQXRIQyxrQ0FBa0M7UUFDbEMsSUFBSSxVQUFVLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFDLElBQWE7WUFDN0IsMkNBQTJDO1lBQzNDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDbEIsQ0FBQztZQUVELDJCQUEyQjtZQUMzQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNULDRDQUE0QztnQkFDNUMsd0NBQXdDO2dCQUN4QyxJQUFJLFFBQVEsR0FBaUMsRUFBRSxDQUFDO2dCQUNoRCxJQUFJLE9BQVksQ0FBQyxDQUFDLDhCQUE4QjtnQkFDaEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUMxQixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBb0IsQ0FBQyxDQUFDLFFBQVEsQ0FBQzt3QkFDdEgsSUFBSSxFQUFFLElBQUksQ0FBQyx3QkFBd0I7cUJBQ3BDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsQ0FBQztnQkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMseUJBQVksQ0FBQyxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDdEQseURBQXlEO29CQUN6RCxJQUFJLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2pCLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQUMsQ0FBQzt3QkFDckIsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFDO29CQUNILE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFDLENBQU07d0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ04sSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUM7NEJBQzlELE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2hCLElBQUksQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDcEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDTixrQkFBa0I7Z0NBQ2xCLE9BQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsOEJBQThCO2dDQUNsRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQ0FDaEUsNEZBQTRGO29DQUM1RixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFO3dDQUNoRSxFQUFFLEVBQUUsRUFBRTt3Q0FDTixNQUFNLEVBQUUsUUFBUTt3Q0FDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO3dDQUNkLElBQUksRUFBRSxDQUFDO3FDQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ1AsQ0FBQzs0QkFDSCxDQUFDOzRCQUFDLElBQUksQ0FBQyxDQUFDO2dDQUNOLGtCQUFrQjtnQ0FDbEIsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtvQ0FDaEUsRUFBRSxFQUFFLEVBQUU7b0NBQ04sTUFBTSxFQUFFLFFBQVE7b0NBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtvQ0FDZCxJQUFJLEVBQUUsQ0FBQztpQ0FDUixDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNQLENBQUM7d0JBQ0gsQ0FBQztvQkFDSCxDQUFDLENBQUMsQ0FBQztvQkFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLEVBQUU7d0JBQzlCLGtCQUFrQjt3QkFDbEIsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNwQixRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEtBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFOzRCQUNoRSxFQUFFLEVBQUUsRUFBRTs0QkFDTixNQUFNLEVBQUUsUUFBUTs0QkFDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJOzRCQUNkLElBQUksRUFBRSxDQUFDLENBQUMsVUFBVTt5QkFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDUCxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLDBDQUEwQztvQkFDMUMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDaEQsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7d0JBQ3RDLElBQUksR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2hCLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQ1QsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxLQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRTtnQ0FDaEUsRUFBRSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRztnQ0FDOUQsTUFBTSxFQUFFLFFBQVE7Z0NBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtnQ0FDZCxJQUFJLEVBQUUsSUFBSTs2QkFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNQLENBQUM7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDO2dCQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsbUNBQW1DO29CQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7d0JBQ2IsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDZCxDQUFDO29CQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSx5QkFBWSxDQUFDLEtBQUssQ0FBQyxFQUFuQixDQUFtQixDQUFDLENBQUM7b0JBRTdDLG9HQUFvRztvQkFDcEcsb0dBQW9HO29CQUNwRyxJQUFJLFFBQVEsR0FBVSxFQUFFLENBQUM7b0JBQ3pCLElBQUksTUFBTSxHQUFHLHlCQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO29CQUMxRCxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBSSxDQUFDO3dCQUN0QyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2xCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNsQixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQzs0QkFDNUIsT0FBTyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNyQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0NBQ3hCLEtBQUssQ0FBQzs0QkFDUixDQUFDO3dCQUNILENBQUM7b0JBQ0gsQ0FBQztvQkFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM1QixDQUFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxRQUFRO1lBQ2YsSUFBSSxLQUFxQixDQUFDO1lBQzFCLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLHlCQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRCx5RUFBeUU7Z0JBQ3pFLEtBQUssR0FBRyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDMUQsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLENBQUM7WUFDRCxNQUFNLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztnQkFDaEIsa0NBQWtDO2dCQUNsQyxNQUFNLENBQUMsS0FBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDO1lBQzNELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxFQUFFLFVBQUMsS0FBb0I7WUFDdEIsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxLQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsS0FBYTtRQUExRCxpQkFpREM7UUFqRDRDLHFCQUFhLEdBQWIsYUFBYTtRQUN4RCxJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQWEsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQztRQUVELElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLE9BQU8sR0FBRyxRQUFRLENBQUMsc0JBQXNCLENBQUM7UUFDOUMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0QixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMxRSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLENBQUMsT0FBTyxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtZQUMxQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ1YsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLHNDQUFzQyxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBYSxTQUFTLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBRUQscUNBQXFDO1lBQ3JDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxnQ0FBZ0MsQ0FBQyxDQUFDO1lBQzVELElBQUksT0FBTyxHQUFlLElBQVUsS0FBSSxDQUFDLFFBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqRSxPQUFPLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxHQUFHLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFHO2dCQUN4RSxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQWtDO29CQUN0RCxHQUFHLEVBQUUsR0FBRztvQkFDUixLQUFLLEVBQUUsRUFBRTtvQkFFVCxPQUFPLEVBQUUsVUFBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLE9BQU87d0JBQ2hDLE1BQU0sQ0FBQyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQztvQkFDakMsQ0FBQztpQkFDRixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQ1AsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFDLE1BQU07NEJBQzlCLElBQUksR0FBRyxHQUFvQixNQUFNLENBQUMsVUFBVSxDQUFDOzRCQUM3QyxNQUFNLENBQUMsS0FBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzt3QkFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDTixDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLG9DQUFvQzt3QkFDcEMsTUFBTSxDQUFDLEtBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUN6QyxDQUFDO2dCQUNILENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxQixDQUFDLENBQUMsQ0FBQztZQUNILFFBQVEsQ0FBQyxzQkFBc0IsR0FBRyxPQUFPLENBQUM7WUFDMUMsUUFBUSxDQUFDLHdCQUF3QixHQUFHLEdBQUcsQ0FBQztZQUN4QyxNQUFNLENBQUMsT0FBTyxDQUFDO1FBQ2pCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLG1DQUFlLEdBQXZCLFVBQXdCLFFBQXNCO1FBQTlDLGlCQTRDQztRQTNDQyxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDckIsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFDO1FBQ2pELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksR0FBRyxHQUFHLFFBQVEsQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUM3RSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEdBQUcsMkJBQTJCLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLE9BQU8sQ0FBQztZQUNqQixDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLElBQUksYUFBSyxFQUFFLENBQUM7UUFDdkIsSUFBSSxHQUFHLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztRQUMzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekMsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBRztZQUNoRCxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQTZCLENBQUM7Z0JBQy9DLEdBQUcsRUFBRSxHQUFHO2dCQUNSLE9BQU8sRUFBRSxVQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsT0FBTztvQkFDaEMsTUFBTSxDQUFDLFFBQVEsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNqQyxDQUFDO2FBQ0EsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsdUNBQXVDO2dCQUN2QyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtvQkFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQzlCLE1BQU0sQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUMvRCxDQUFDO29CQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ04sRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNuRCxRQUFRLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUM7b0JBQzdDLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQztvQkFDakQsRUFBRSxDQUFDLENBQUMsS0FBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7d0JBQ3pCLFFBQVEsQ0FBQyxNQUFNLEdBQUcsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3RELENBQUM7Z0JBQ0gsQ0FBQztnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztRQUNILFFBQVEsQ0FBQyx5QkFBeUIsR0FBRyxPQUFPLENBQUM7UUFDN0MsUUFBUSxDQUFDLDJCQUEyQixHQUFHLEdBQUcsQ0FBQztRQUMzQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7T0FvQkc7SUFDTywrQ0FBMkIsR0FBckMsVUFBc0MsS0FBWSxFQUFFLE9BQTZCLEVBQUUsT0FNbEY7UUFORCxpQkF5RUM7UUFsRUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1gscUNBQXFDO1lBQ3JDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLDRDQUE0QztnQkFDNUMsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQzlDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2Isa0ZBQWtGO29CQUNsRixrRkFBa0Y7b0JBQ2xGLDJDQUEyQztvQkFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO1lBQ0gsQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUN4QixNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN6QixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxTQUFTLElBQUksYUFBSyxDQUFDO1FBQzNDLElBQUksS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDN0MsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNO1NBQ3ZCLENBQUMsQ0FBQztRQUNILEtBQUssQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxRQUFRLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRSxJQUFJLFlBQVksR0FBRztZQUNqQix5REFBeUQ7WUFDekQsSUFBSSxPQUFPLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNyQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyx3RkFBd0YsR0FBRyxPQUFPLEdBQUcsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLEtBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDakQsQ0FBQztRQUNILENBQUMsQ0FBQztRQUNGLElBQUksWUFBWSxHQUFHO1lBQ2pCLDBCQUEwQjtZQUMxQixLQUFLLEVBQUUsT0FBTyxDQUFDLFVBQVU7U0FDMUIsQ0FBQztRQUNGLElBQUksYUFBYSxHQUFRO1lBQ3ZCLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztZQUN4QixLQUFLLEVBQUUsRUFBRSxDQUFDLDZCQUE2QjtTQUN4QyxDQUFDO1FBQ0YsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixhQUFhLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBRSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFFOUksQ0FBQztRQUFDLElBQUksQ0FBQyxDQUFDO1lBQ04sdUNBQXVDO1lBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLFFBQVEsRUFBbEMsQ0FBa0MsQ0FBQyxDQUFDO1lBQzVELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBQ0QsTUFBTSxDQUF1QixLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBRSxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7WUFDakUscUhBQXFIO1lBQ3JILE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUQsQ0FBQyxFQUFFLFVBQUMsU0FBd0I7WUFDMUIsb0lBQW9JO1lBQ3BJLElBQU0sVUFBVSxHQUFHLFNBQVMsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDO1lBQ3JELE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25CLEtBQUssR0FBRyxDQUFDLENBQUMsWUFBWTtnQkFDdEIsS0FBSyxHQUFHLENBQUMsQ0FBQyxlQUFlO2dCQUN6QixLQUFLLEdBQUc7b0JBQ04sa0ZBQWtGO29CQUNsRixNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLGdDQUFnQztnQkFDdEU7b0JBQ0UsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3JELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7Ozs7OztPQWdCRztJQUNLLGlDQUFhLEdBQXJCO1FBQUEsaUJBeUZDO1FBeEZDLGdCQUFnQjtRQUNoQixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ25CLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFhLFNBQVMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFFRCxzR0FBc0c7UUFDdEcscUZBQXFGO1FBQ3JGLElBQUksV0FBVyxHQUFHO1lBQ2hCLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO2dCQUMxQixNQUFNLENBQUMsS0FBSSxDQUFDLFFBQVEsQ0FBQztZQUN2QixDQUFDO1lBRUQsSUFBSSxPQUFPLEdBQXlCLEtBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztnQkFDWixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLEVBQUUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUNuRSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxDQUFDO1lBQ0QsSUFBSSxRQUFRLEdBQUcsS0FBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN0QyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsTUFBTSxDQUFDLEtBQUksQ0FBQyxRQUFRLENBQUM7WUFDdkIsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxRQUFRLENBQUMsT0FBTyxLQUFLLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQTNDLENBQTJDLEVBQUUsc0JBQXNCLEdBQUcsUUFBUSxDQUFDLE9BQU8sR0FBRyxxQ0FBcUMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDakwsSUFBSSxHQUFHLEdBQUcsS0FBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRXpELElBQUksU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLElBQUksYUFBSyxDQUFDO1lBQzVDLElBQUksS0FBSyxHQUFHLElBQUksU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUU7Z0JBQ2xDLE1BQU0sRUFBRSxRQUFRLENBQUMsTUFBTTthQUN4QixDQUFDLENBQUM7WUFDSCxLQUFLLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkUsSUFBSSxhQUFhLEdBQVE7Z0JBQ3ZCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsS0FBSyxFQUFFLEVBQUUsQ0FBQyw2QkFBNkI7YUFDeEMsQ0FBQztZQUNGLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNiLGFBQWEsQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDLE9BQU8sR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFFLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUU5SSxDQUFDO1lBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxJQUFJLGNBQWMsR0FBRztnQkFDbkIsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO2dCQUN2QixTQUFTLEVBQUUsUUFBUSxDQUFDLFNBQVM7Z0JBQzdCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztnQkFDekIsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2FBQ2hDLENBQUM7WUFDRixNQUFNLENBQUMsS0FBSSxDQUFDLGNBQWMsQ0FBQyxLQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDM0gsWUFBWTtnQkFDWixNQUFNLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekUsQ0FBQyxFQUFFLFVBQUMsS0FBb0I7Z0JBQ3RCLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO29CQUNyQixnQkFBZ0I7b0JBQ2hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSSxDQUFDLDJCQUEyQixDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBQyxNQUFNO3dCQUN0RixpREFBaUQ7d0JBQ2pELEtBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDO3dCQUMxQyxNQUFNLENBQUMsS0FBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3hELENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04scUNBQXFDO29CQUNyQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDekIsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDTiw2REFBNkQ7Z0JBQzdELE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDM0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZCLENBQUMsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLENBQUM7UUFDN0QsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQztRQUM3QixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDUCwrQkFBK0I7WUFDL0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBa0M7Z0JBQ3pELFNBQVMsRUFBRTtvQkFDVCxXQUFXO29CQUNYLE9BQU87b0JBQ1AsS0FBSztpQkFDTjthQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ04sQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3QyxrQkFBa0I7WUFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNqQyxtQkFBbUI7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7UUFDOUIsQ0FBQztRQUVELG1DQUFtQztRQUNuQyxJQUFJLENBQUMsZUFBZSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVPLGdDQUFZLEdBQXBCLFVBQXFCLFFBQXNCLEVBQUUsSUFBZ0M7UUFBN0UsaUJBcUJDO1FBcEJDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBb0I7WUFDcEMsSUFBSSxPQUFrQyxDQUFDO1lBQ3ZDLElBQUksRUFBRSxHQUFHLEtBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUN0QyxJQUFJLE9BQU8sR0FBeUIsRUFBRSxJQUEwQixLQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN0RixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNaLHdEQUF3RDtnQkFDeEQsT0FBTyxHQUE4QjtvQkFDbkMsS0FBSyxFQUFFLElBQUk7aUJBQ1osQ0FBQztZQUNKLENBQUM7WUFBQyxJQUFJLENBQUMsQ0FBQztnQkFDTiwrREFBK0Q7Z0JBQy9ELE9BQU8sR0FBRyxJQUFJLEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRTtvQkFDckMsVUFBVSxFQUFFLEtBQUksQ0FBQyxRQUFRO29CQUN6QixLQUFLLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO2lCQUMzQixDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGlDQUFhLEdBQXJCLFVBQXNCLFFBQXNCLEVBQUUsR0FBb0IsRUFBRSxRQUF5QztRQUE3RyxpQkF1QkM7UUF0QkMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUE2QjtZQUNqRCxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsSUFBSSxFQUFFLEdBQUcsS0FBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDUix3QkFBd0I7b0JBQ3hCLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QixDQUFDO2dCQUVELE9BQU8sR0FBeUIsS0FBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3RELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDYixPQUFPLEdBQUcsSUFBSSxLQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQzt3QkFDaEMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHO3FCQUNiLEVBQUU7d0JBQ0QsVUFBVSxFQUFFLEtBQUksQ0FBQyxRQUFRO3dCQUN6QixLQUFLLEVBQUUsS0FBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLO3FCQUMzQixDQUFDLENBQUM7Z0JBQ0wsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSx5QkFBSyxHQUFaLFVBQWEsVUFBc0I7UUFDakMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksUUFBUSxHQUFpQixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzFELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ2IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQzFCLENBQUM7Z0JBQ0QsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0kseUJBQUssR0FBWjtRQUNFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQztRQUN2QixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDekIsQ0FBQztRQUVELElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxDQUFDO0lBQ0gsQ0FBQztJQUNILGdCQUFDO0FBQUQsQ0FBQyxBQWp3Q0QsQ0FBK0IsYUFBSyxHQWl3Q25DO0FBandDWSxpQkFBUyxZQWl3Q3JCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFO0lBQzVDLEtBQUssRUFBRSw2QkFBNkI7SUFFcEMsVUFBVSxFQUFFLHlCQUFXO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsU0FBUyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUEzRCxDQUEyRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyNC4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIEJhY2tib25lIGZyb20gJ2JhY2tib25lJztcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIG9iamVjdGlkIGZyb20gJy4uL2NvcmUvb2JqZWN0aWQnO1xuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xuaW1wb3J0ICogYXMgd2ViIGZyb20gJy4uL3dlYic7XG5cbmltcG9ydCB7bG9jYWxTdG9yYWdlfSBmcm9tICcuLi93ZWIvb2ZmbGluZSc7XG5pbXBvcnQge0dldFF1ZXJ5fSBmcm9tICcuLi9xdWVyeS9HZXRRdWVyeSc7XG5pbXBvcnQge1N0b3JlLCBTdG9yZUN0b3J9IGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XG5pbXBvcnQge1N5bmNDb250ZXh0fSBmcm9tICcuL1N5bmNDb250ZXh0JztcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZSwgTGl2ZURhdGFNZXNzYWdlTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcbmltcG9ydCB7TGl2ZURhdGFUaW1lc3RhbXAsIExpdmVEYXRhVGltZXN0YW1wTW9kZWx9IGZyb20gJy4vTGl2ZURhdGFUaW1lc3RhbXAnO1xuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuXG4vKipcbiAqIGlvIG9mIGJyb3dzZXIgdmlhIHNjcmlwdCB0YWcgb3IgdmlhIHJlcXVpcmUgc29ja2V0LmlvLWNsaWVudCwgZW50aXJlbHkgb3B0aW9uYWwuXG4gKlxuICogTm90aWNlLCB0aGlzIG1vZHVsZSBpcyBlbnRpcmVseSBvcHRpb25hbCBhcyB0aGUgc3RvcmUgbWF5IG9wZXJhdGUgd2l0aG91dCBpdCBpZiBzb2NrZXRcbiAqIG5vdGlmaWNhdGlvbnMgYXJlIG5vdCB1c2VkLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcHVibGljIEFQSSwgZXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcbiAqL1xuZXhwb3J0IGNvbnN0IGlvOiBTb2NrZXRJT0NsaWVudFN0YXRpYyA9IGdsb2JhbFsnaW8nXSB8fCAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb25cbiAgdHlwZW9mIHJlcXVpcmUgPT09ICdmdW5jdGlvbicgJiYgICAgICAgICAgICAgICAgICAgICAgLy8gb3Igd2hlbiByZXF1aXJlIGlzIGF2YWlsYWJsZVxuICAoKGZ1bmN0aW9uIHJlcXVpcmVTb2NrZXRJbygpIHsgICAgICAgICAgICAgICAgICAgICAgICAvLyByZXF1aXJlZCB2ZXJzaW9uXG4gICAgLy8gaGVyZSB3ZSBhcmUgaW4gYW4gaW1tZWRpYXRlbHkgaW52b2tlZCBmdW5jdGlvbiByZXF1aXJpbmcgc29ja2V0LmlvLWNsaWVudCwgaWYgYXZhaWxhYmxlXG4gICAgdHJ5IHtcbiAgICAgIHJldHVybiAoZ2xvYmFsWydpbyddID0gcmVxdWlyZSgnc29ja2V0LmlvLWNsaWVudCcpKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdvcHRpb25hbCBzb2NrZXQuaW8tY2xpZW50IG1vZHVsZSBpcyBub3QgYXZhaWxhYmxlOiAnICsgZXJyb3IgJiYgZXJyb3IubWVzc2FnZSk7XG4gICAgfVxuICB9KSgpKTtcblxuLyoqXG4gKiBjb25uZWN0cyBhIE1vZGVsL0NvbGxlY3Rpb24gdG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogVGhpcyB3aWxsIGdpdmUgeW91IGFuIG9ubGluZSBhbmQgb2ZmbGluZSBzdG9yZSB3aXRoIGxpdmUgZGF0YSB1cGRhdGVzLlxuICpcbiAqIEBleGFtcGxlXG4gKlxuICogLy8gVGhlIGRlZmF1bHQgY29uZmlndXJhdGlvbiB3aWxsIHNhdmUgdGhlIGNvbXBsZXRlIG1vZGVsIGRhdGEgYXMgYSBqc29uLFxuICogLy8gYW5kIHRoZSBvZmZsaW5lIGNoYW5nZSBsb2cgdG8gYSBsb2NhbCBXZWJTcWwgZGF0YWJhc2UsIHN5bmNocm9uaXplIGl0XG4gKiAvLyB0cm91Z2ggUkVTVCBjYWxscyB3aXRoIHRoZSBzZXJ2ZXIgYW5kIHJlY2VpdmUgbGl2ZSB1cGRhdGVzIHZpYSBhIHNvY2tldC5pbyBjb25uZWN0aW9uLlxuICogY2xhc3MgTXlDb2xsZWN0aW9uIGV4dGVuZHMgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiB7fTtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSAnaHR0cDovL215U2VydmVyLmlvL215T3JnYS9teUFwcGxpY2F0aW9uL215Q29sbGVjdGlvbic7XG4gKiBNeUNvbGxlY3Rpb24ucHJvdG90eXBlLnN0b3JlID0gbmV3IFJlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZSh7XG4gKiAgIHVzZUxvY2FsU3RvcmU6IHRydWUsICAgICAvLyAoZGVmYXVsdCkgc3RvcmUgdGhlIGRhdGEgZm9yIG9mZmxpbmUgdXNlXG4gKiAgIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSwgICAvLyAoZGVmYXVsdCkgcmVnaXN0ZXIgYXQgdGhlIHNlcnZlciBmb3IgbGl2ZSB1cGRhdGVzXG4gKiAgIHVzZU9mZmxpbmVDaGFuZ2VzOiB0cnVlICAvLyAoZGVmYXVsdCkgYWxsb3cgY2hhbmdlcyB0byB0aGUgb2ZmbGluZSBkYXRhXG4gKiB9KTtcbiAqL1xuZXhwb3J0IGNsYXNzIFN5bmNTdG9yZSBleHRlbmRzIFN0b3JlIHtcblxuICAvLyBmb2xsb3dpbmcgYXJlIHN0b3JlLXNwZWNpZmljIG9wdGlvbnMsIGRlZmF1bHRzIHN0b3JlZCBpbiBwcm90b3R5cGUgYXQgZW5kIG9mIHRoaXMgZmlsZVxuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZTogU3RvcmVDdG9yO1xuICBwcm90ZWN0ZWQgbG9jYWxTdG9yZU9wdGlvbnM6IGFueTtcbiAgcHJvdGVjdGVkIHVzZUxvY2FsU3RvcmU6IGJvb2xlYW47XG4gIHByb3RlY3RlZCB1c2VTb2NrZXROb3RpZnk6IGJvb2xlYW47XG4gIHByb3RlY3RlZCB1c2VPZmZsaW5lQ2hhbmdlczogYm9vbGVhbjtcbiAgcHJvdGVjdGVkIHNvY2tldFBhdGg6IHN0cmluZztcbiAgcHJvdGVjdGVkIHNvY2tldFF1ZXJ5OiBzdHJpbmc7XG4gIHByb3RlY3RlZCBjcmVkZW50aWFsczogYW55O1xuICBwcm90ZWN0ZWQgb3JkZXJPZmZsaW5lQ2hhbmdlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIHNlcnZlciBhc3NvY2lhdGVkIHdpdGggdGhpcyBzdG9yZS5cbiAgICpcbiAgICogVGhlIHN5bmMgbWV0aG9kIHdpbGwgZmFpbCBlYXJseSB3aGVuIGJlaW5nIGFwcGxpZWQgdG8gZGF0YSBvZiBzb21lIG90aGVyIHNlcnZlci5cbiAgICovXG4gIHByb3RlY3RlZCBzZXJ2ZXJVcmw6IHN0cmluZztcbiAgLyoqXG4gICAqIGFwcGxpY2F0aW9uIHBhcnQgdXNlZCB0byByZXNvbHZlIFVSTHMgbWF5IG9wdGlvbmFsbHkgYmUgc2V0IHVzaW5nIGNvbnN0cnVjdG9yIG9wdGlvbnMuXG4gICAqL1xuICBwcm90ZWN0ZWQgYXBwbGljYXRpb246IHN0cmluZztcbiAgLyoqXG4gICAqIGlkZW50aXR5IG9yIHVzZXIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgc3RvcmUuXG4gICAqXG4gICAqIFRoZSBhamF4IG1ldGhvZCB3aWxsIHNpbXVsYXRlIGFuIG9mZmxpbmUgdGltZW91dCB3aGVuIHRoZSB1c2VyIGlkZW50aXR5IGlzIGNoYW5nZWQuIFRoaXMgaXNcbiAgICogYmVjYXVzZSBqdXN0IG9uZSBzZXNzaW9uIGNhbiBiZSBtYWludGFpbmVkIHBlciBzZXJ2ZXIgYW5kIGxvZ2luL2xvZ291dCBzZW1hbnRpY3MgbXVzdCBiZSB3ZWxsXG4gICAqIGJlaGF2ZWQuXG4gICAqL1xuICBwcm90ZWN0ZWQgdXNlclV1aWQ6IHN0cmluZztcblxuICBwdWJsaWMgZW5kcG9pbnRzOiB7XG4gICAgLy8gbWFwIG9mIGVudGl0eSB0byBTeW5jRW5kcG9pbnRcbiAgICBbZW50aXR5OiBzdHJpbmddOiBTeW5jRW5kcG9pbnQ7XG4gIH0gPSB7fTtcblxuICBwcml2YXRlIGxhc3RNZXNnVGltZTogYW55OyAvLyBkZXByZWNhdGVkOiBrZXB0IGZvciBtaWdyYXRpb24gYW5kIGFzIGEgZmFpbHNhZmVcbiAgcHJpdmF0ZSB0aW1lc3RhbXBzOiBDb2xsZWN0aW9uO1xuICBwcml2YXRlIHRpbWVzdGFtcHNQcm9taXNlOiBRLlByb21pc2U8Q29sbGVjdGlvbj47XG5cbiAgLyoqXG4gICAqIHdoZW4gc2V0LCBpbmRpY2F0ZXMgd2hpY2ggZW50aXR5IGNhdXNlZCBhIGRpc2Nvbm5lY3Rpb24uXG4gICAqXG4gICAqIDxwPlxuICAgKiBUaGlzIGlzIHNldCB0byBhbiBlbnRpdHkgbmFtZSB0byBsaW1pdCB3aGljaCBlbnRpdHkgbWF5IGNhdXNlIGEgY2hhbmdlIHRvIG9ubGluZSBzdGF0ZSBhZ2Fpbi5cbiAgICogPC9wPlxuICAgKlxuICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgKi9cbiAgcHJpdmF0ZSBkaXNjb25uZWN0ZWRFbnRpdHk6IHN0cmluZyA9ICdhbGwnO1xuXG4gIHB1YmxpYyBtZXNzYWdlczogQ29sbGVjdGlvbjtcbiAgcHVibGljIG1lc3NhZ2VzUHJvbWlzZTogUS5Qcm9taXNlPENvbGxlY3Rpb24+O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBhbnkpIHtcbiAgICBzdXBlcihvcHRpb25zKTtcbiAgICBpZiAodGhpcy5jcmVkZW50aWFscykge1xuICAgICAgdGhpcy5jcmVkZW50aWFscyA9IF8uY2xvbmUodGhpcy5jcmVkZW50aWFscyk7XG4gICAgfVxuICAgIGlmICh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKSB7XG4gICAgICB0aGlzLmxvY2FsU3RvcmVPcHRpb25zID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcbiAgICB9XG4gICAgaWYgKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcykge1xuICAgICAgdGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzID0gXy5jbG9uZSh0aGlzLm9yZGVyT2ZmbGluZUNoYW5nZXMpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSAmJiB0eXBlb2YgaW8gIT09ICdvYmplY3QnKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm5pbmcoJ1NvY2tldC5JTyBub3QgcHJlc2VudCAhIScpO1xuICAgICAgdGhpcy51c2VTb2NrZXROb3RpZnkgPSBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogb3ZlcndyaXR0ZW4gdG8gcmVzb2x2ZSByZWxhdGl2ZSBVUkxzIGFnYWluc3QgdGhlIFN5bmNTdG9yZSNzZXJ2ZXJVcmwuXG4gICAqL1xuICBwcm90ZWN0ZWQgcmVzb2x2ZVVybCh1cmw6IHN0cmluZykge1xuICAgIHJldHVybiB3ZWIucmVzb2x2ZVVybCh1cmwsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmwsXG4gICAgICBhcHBsaWNhdGlvbjogdGhpcy5hcHBsaWNhdGlvblxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIGJpbmRzIHRoZSBzdG9yZSB0byBhIHRhcmdldCBzZXJ2ZXIgd2hlbiB0aGUgZmlyc3QgZW5kcG9pbnQgaXMgY3JlYXRlZC5cbiAgICpcbiAgICogQHBhcmFtIHVybFJvb3QgdXNlZCB0byByZXNvbHZlIHRoZSBzZXJ2ZXIgdG8gb3BlcmF0ZS5cbiAgICAgKi9cbiAgcHJpdmF0ZSBpbml0U2VydmVyKHVybFJvb3Q6IHN0cmluZykge1xuICAgIGxldCBzZXJ2ZXJVcmwgPSB3ZWIucmVzb2x2ZVNlcnZlcih1cmxSb290LCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSk7XG4gICAgaWYgKCF0aGlzLnNlcnZlclVybCkge1xuICAgICAgY29uc3Qgc2VydmVyID0gc2VjdXJpdHkuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG4gICAgICB0aGlzLnNlcnZlclVybCA9IHNlcnZlclVybDtcbiAgICAgIHRoaXMudXNlclV1aWQgPSBzZXJ2ZXIuYXV0aG9yaXphdGlvbi5uYW1lO1xuICAgICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgJiYgIXRoaXMubG9jYWxTdG9yZU9wdGlvbnMuY3JlZGVudGlhbHMpIHtcbiAgICAgICAgLy8gY2FwdHVyZSBjcmVkZW50aWFscyBmb3IgdXNlIGJ5IGNyeXB0byBzdG9yZXNcbiAgICAgICAgdGhpcy5sb2NhbFN0b3JlT3B0aW9ucy5jcmVkZW50aWFscyA9IF8uZGVmYXVsdHMoe1xuICAgICAgICAgIHVzZXJVdWlkOiB0aGlzLnVzZXJVdWlkXG4gICAgICAgIH0sIHNlcnZlci5jcmVkZW50aWFscyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzZXJ2ZXJVcmwgIT09IHRoaXMuc2VydmVyVXJsKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwgKyAnIGFscmVhZHknKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNoZWNrU2VydmVyKHVybDogc3RyaW5nLCBvcHRpb25zPzogYW55KTogUS5Qcm9taXNlPHN0cmluZz4ge1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHdlYi5yZXNvbHZlU2VydmVyKHVybCwge1xuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxuICAgIH0pID09PSB0aGlzLnNlcnZlclVybCk7XG4gICAgaWYgKHNlY3VyaXR5LlNlcnZlci5nZXRJbnN0YW5jZSh0aGlzLnNlcnZlclVybCkuYXV0aG9yaXphdGlvbi5uYW1lICE9PSB0aGlzLnVzZXJVdWlkKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ3VzZXIgaWRlbnRpdHkgd2FzIGNoYW5nZWQsIHdvcmtpbmcgb2ZmbGluZSB1bnRpbCBhdXRob3JpemF0aW9uIGlzIHJlc3RvcmVkJyk7XG4gICAgICBjb25zdCBlcnJvcjogd2ViLkh0dHBFcnJvciA9IG5ldyBFcnJvcigpO1xuICAgICAgLy8gaW52b2tlIGVycm9yIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgIHJldHVybiBvcHRpb25zICYmIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IFEucmVqZWN0PHN0cmluZz4oZXJyb3IpO1xuICAgIH1cbiAgICByZXR1cm4gUS5yZXNvbHZlKHVybCk7XG4gIH1cblxuICBwcm90ZWN0ZWQgaW5pdEVuZHBvaW50KG1vZGVsT3JDb2xsZWN0aW9uOiBNb2RlbCB8IENvbGxlY3Rpb24sIG1vZGVsVHlwZTogTW9kZWxDdG9yKTogU3luY0VuZHBvaW50IHtcbiAgICBsZXQgdXJsUm9vdCA9IG1vZGVsT3JDb2xsZWN0aW9uLmdldFVybFJvb3QoKTtcbiAgICBsZXQgZW50aXR5ID0gbW9kZWxPckNvbGxlY3Rpb24uZW50aXR5O1xuICAgIGlmICh1cmxSb290ICYmIGVudGl0eSkge1xuICAgICAgLy8gZ2V0IG9yIGNyZWF0ZSBlbmRwb2ludCBmb3IgdGhpcyB1cmxcbiAgICAgIHRoaXMuaW5pdFNlcnZlcih1cmxSb290KTtcbiAgICAgIHVybFJvb3QgPSB0aGlzLnJlc29sdmVVcmwodXJsUm9vdCk7XG4gICAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1tlbnRpdHldO1xuICAgICAgaWYgKCFlbmRwb2ludCkge1xuICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5pbml0RW5kcG9pbnQ6ICcgKyBlbnRpdHkpO1xuICAgICAgICBlbmRwb2ludCA9IG5ldyBTeW5jRW5kcG9pbnQoe1xuICAgICAgICAgIGVudGl0eTogZW50aXR5LFxuICAgICAgICAgIG1vZGVsVHlwZTogbW9kZWxUeXBlLFxuICAgICAgICAgIHVybFJvb3Q6IHVybFJvb3QsXG4gICAgICAgICAgc29ja2V0UGF0aDogdGhpcy5zb2NrZXRQYXRoLFxuICAgICAgICAgIHVzZXJVdWlkOiB0aGlzLnVzZXJVdWlkXG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLmVuZHBvaW50c1tlbnRpdHldID0gZW5kcG9pbnQ7XG5cbiAgICAgICAgZW5kcG9pbnQubG9jYWxTdG9yZSA9IHRoaXMuY3JlYXRlTG9jYWxTdG9yZShlbmRwb2ludCk7XG4gICAgICAgIGVuZHBvaW50LnByaW9yaXR5ID0gdGhpcy5vcmRlck9mZmxpbmVDaGFuZ2VzICYmIChfLmxhc3RJbmRleE9mKHRoaXMub3JkZXJPZmZsaW5lQ2hhbmdlcywgZW5kcG9pbnQuZW50aXR5KSArIDEpO1xuICAgICAgICB0aGlzLmNyZWF0ZU1zZ0NvbGxlY3Rpb24oKTtcbiAgICAgICAgdGhpcy5jcmVhdGVUaW1lc3RhbXBDb2xsZWN0aW9uKCk7XG4gICAgICAgIGVuZHBvaW50LnNvY2tldCA9IHRoaXMuY3JlYXRlU29ja2V0KGVuZHBvaW50LCBlbnRpdHkpO1xuICAgICAgICBlbmRwb2ludC5pbmZvID0gdGhpcy5mZXRjaFNlcnZlckluZm8oZW5kcG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gY29uZmlndXJhdGlvbiBjYW4gbm90IGNoYW5nZSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkLi4uXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVybFJvb3QgPT09IHVybFJvb3QsICdjYW4gbm90IGNoYW5nZSB1cmxSb290LCBtdXN0IHJlY3JlYXRlIHN0b3JlIGluc3RlYWQhJyk7XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVuZHBvaW50LnVzZXJVdWlkID09PSB0aGlzLnVzZXJVdWlkLCAnY2FuIG5vdCBjaGFuZ2UgdXNlciBpZGVudGl0eSwgbXVzdCByZWNyZWF0ZSBzdG9yZSBpbnN0ZWFkIScpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGVuZHBvaW50O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBAaW5oZXJpdGRvY1xuICAgKlxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IE1vZGVsIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgaW5pdE1vZGVsKG1vZGVsOiBNb2RlbCk6IHZvaWQge1xuICAgIG1vZGVsLmVuZHBvaW50ID0gdGhpcy5pbml0RW5kcG9pbnQobW9kZWwsIDxNb2RlbEN0b3I+bW9kZWwuY29uc3RydWN0b3IpO1xuICB9XG5cbiAgLyoqXG4gICAqIEBpbmhlcml0ZG9jXG4gICAqXG4gICAqIEBpbnRlcm5hbCBBUEkgb25seSB0byBiZSBjYWxsZWQgYnkgQ29sbGVjdGlvbiBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIGluaXRDb2xsZWN0aW9uKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pOiB2b2lkIHtcbiAgICBjb2xsZWN0aW9uLmVuZHBvaW50ID0gdGhpcy5pbml0RW5kcG9pbnQoY29sbGVjdGlvbiwgY29sbGVjdGlvbi5tb2RlbCk7XG4gIH1cblxuICBnZXRFbmRwb2ludChtb2RlbE9yQ29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uKTogU3luY0VuZHBvaW50IHtcbiAgICBsZXQgZW5kcG9pbnQgPSB0aGlzLmVuZHBvaW50c1ttb2RlbE9yQ29sbGVjdGlvbi5lbnRpdHldO1xuICAgIGlmIChlbmRwb2ludCkge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4ge1xuICAgICAgICAvLyBjaGVja3MgdGhhdCBtb2RlbE9yQ29sbGVjdGlvbiB1c2VzIGEgbW9kZWwgaW5oZXJpdGluZyBmcm9tIHRoZSBvbmUgb2YgdGhlIGVuZHBvaW50XG4gICAgICAgIGxldCBtb2RlbFR5cGUgPSBpc0NvbGxlY3Rpb24obW9kZWxPckNvbGxlY3Rpb24pID8gbW9kZWxPckNvbGxlY3Rpb24ubW9kZWwgOiBtb2RlbE9yQ29sbGVjdGlvbi5jb25zdHJ1Y3RvcjtcbiAgICAgICAgcmV0dXJuIG1vZGVsVHlwZSA9PT0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IG1vZGVsVHlwZS5wcm90b3R5cGUgaW5zdGFuY2VvZiBlbmRwb2ludC5tb2RlbFR5cGU7XG4gICAgICB9LCAnd3JvbmcgdHlwZSBvZiBtb2RlbCEnKTtcbiAgICAgIHJldHVybiBlbmRwb2ludDtcbiAgICB9XG4gIH1cblxuICBjcmVhdGVMb2NhbFN0b3JlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQpOiBTdG9yZSB7XG4gICAgaWYgKHRoaXMudXNlTG9jYWxTdG9yZSkge1xuICAgICAgdmFyIGVudGl0aWVzID0ge307XG4gICAgICBlbnRpdGllc1tlbmRwb2ludC5lbnRpdHldID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHZhciBzdG9yZU9wdGlvbiA9IHtcbiAgICAgICAgZW50aXRpZXM6IGVudGl0aWVzXG4gICAgICB9O1xuICAgICAgaWYgKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgJiYgdHlwZW9mIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHN0b3JlT3B0aW9uID0gXy5jbG9uZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKTtcbiAgICAgICAgc3RvcmVPcHRpb24uZW50aXRpZXMgPSBlbnRpdGllcztcbiAgICAgIH1cbiAgICAgIHJldHVybiBuZXcgdGhpcy5sb2NhbFN0b3JlKHN0b3JlT3B0aW9uKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQGRlc2NyaXB0aW9uIEhlcmUgd2Ugc2F2ZSB0aGUgY2hhbmdlcyBpbiBhIE1lc3NhZ2UgbG9jYWwgd2Vic3FsXG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgY3JlYXRlTXNnQ29sbGVjdGlvbigpOiBDb2xsZWN0aW9uIHtcbiAgICBpZiAodGhpcy51c2VPZmZsaW5lQ2hhbmdlcyAmJiAhdGhpcy5tZXNzYWdlcykge1xuICAgICAgdGhpcy5tZXNzYWdlcyA9IG5ldyBDb2xsZWN0aW9uKHVuZGVmaW5lZCwge1xuICAgICAgICBtb2RlbDogTGl2ZURhdGFNZXNzYWdlTW9kZWwsXG4gICAgICAgIHN0b3JlOiBuZXcgdGhpcy5sb2NhbFN0b3JlKHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpXG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gIH1cblxuICBjcmVhdGVUaW1lc3RhbXBDb2xsZWN0aW9uKCk6IENvbGxlY3Rpb24ge1xuICAgIGlmICh0aGlzLnVzZUxvY2FsU3RvcmUgJiYgIXRoaXMudGltZXN0YW1wcykge1xuICAgICAgdGhpcy50aW1lc3RhbXBzID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XG4gICAgICAgIG1vZGVsOiBMaXZlRGF0YVRpbWVzdGFtcE1vZGVsLFxuICAgICAgICBzdG9yZTogbmV3IHRoaXMubG9jYWxTdG9yZSh0aGlzLmxvY2FsU3RvcmVPcHRpb25zKVxuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzLnRpbWVzdGFtcHM7XG4gIH1cblxuICBjcmVhdGVTb2NrZXQoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKHRoaXMudXNlU29ja2V0Tm90aWZ5ICYmIGVuZHBvaW50ICYmIGVuZHBvaW50LnNvY2tldFBhdGgpIHtcbiAgICAgIGRpYWcuZGVidWcudHJhY2UoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5jcmVhdGVTb2NrZXQ6ICcgKyBuYW1lKTtcblxuICAgICAgLy8gcmVzb3VyY2VcbiAgICAgIGxldCBjb25uZWN0Vm86IGFueSA9IHtcbiAgICAgICAgJ2ZvcmNlIG5ldyBjb25uZWN0aW9uJzogdHJ1ZVxuICAgICAgfTtcbiAgICAgIGxldCByZXNvdXJjZSA9IGVuZHBvaW50LnNvY2tldFBhdGg7IC8vIHJlbW92ZSBsZWFkaW5nIC9cbiAgICAgIGNvbm5lY3RWby5yZXNvdXJjZSA9IChyZXNvdXJjZSAmJiByZXNvdXJjZS5pbmRleE9mKCcvJykgPT09IDApID8gcmVzb3VyY2Uuc3Vic3RyKDEpIDogcmVzb3VyY2U7XG4gICAgICBpZiAodGhpcy5zb2NrZXRRdWVyeSkge1xuICAgICAgICBjb25uZWN0Vm8ucXVlcnkgPSB0aGlzLnNvY2tldFF1ZXJ5O1xuICAgICAgfVxuXG4gICAgICAvLyBzb2NrZXRcbiAgICAgIGVuZHBvaW50LnNvY2tldCA9IGlvLmNvbm5lY3QoZW5kcG9pbnQuaG9zdCwgY29ubmVjdFZvKTtcbiAgICAgIGVuZHBvaW50LnNvY2tldC5vbignY29ubmVjdCcsICgpID0+IHtcbiAgICAgICAgKHRoaXMuX2JpbmRDaGFubmVsKGVuZHBvaW50LCBuYW1lKSB8fCBRLnJlc29sdmUoZW5kcG9pbnQpKS50aGVuKChlcCkgPT4ge1xuICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGVwID09PSBlbmRwb2ludCk7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVwKTtcbiAgICAgICAgfSkuZG9uZSgpO1xuICAgICAgfSk7XG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oJ2Rpc2Nvbm5lY3QnLCAoKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcuaW5mbygnc29ja2V0LmlvOiBkaXNjb25uZWN0Jyk7XG4gICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCkuZG9uZSgpO1xuICAgICAgfSk7XG4gICAgICBlbmRwb2ludC5zb2NrZXQub24oZW5kcG9pbnQuY2hhbm5lbCwgKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwgbXNnKSk7XG4gICAgICB9KTtcbiAgICAgIHJldHVybiBlbmRwb2ludC5zb2NrZXQ7XG4gICAgfVxuICB9XG5cbiAgX2JpbmRDaGFubmVsKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG5hbWU/OiBzdHJpbmcpIHtcbiAgICBpZiAoZW5kcG9pbnQgJiYgZW5kcG9pbnQuc29ja2V0KSB7XG4gICAgICBkaWFnLmRlYnVnLnRyYWNlKCdSZWx1dGlvbi5saXZlZGF0YS5TeW5jU3RvcmUuX2JpbmRDaGFubmVsOiAnICsgbmFtZSk7XG5cbiAgICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICAgIHZhciBzb2NrZXQgPSBlbmRwb2ludC5zb2NrZXQ7XG4gICAgICBuYW1lID0gbmFtZSB8fCBlbmRwb2ludC5lbnRpdHk7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUaW1lc3RhbXAoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgICBzb2NrZXQuZW1pdCgnYmluZCcsIHtcbiAgICAgICAgICBlbnRpdHk6IG5hbWUsXG4gICAgICAgICAgY2hhbm5lbDogY2hhbm5lbCxcbiAgICAgICAgICB0aW1lOiB0aW1lXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gUS5yZXNvbHZlKGVuZHBvaW50KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUga2V5TGFzdE1lc3NhZ2UoY2hhbm5lbDogc3RyaW5nKTogc3RyaW5nIHtcbiAgICByZXR1cm4gJ19fJyArIGNoYW5uZWwgKyAnbGFzdE1lc2dUaW1lJztcbiAgfVxuXG4gIC8vIGRlcHJlY2F0ZWQ6IHVzZSBnZXRUaW1lc3RhbXAgaW5zdGVhZCFcbiAgcHJpdmF0ZSBnZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbDogc3RyaW5nKTogYW55IHtcbiAgICBpZiAoIXRoaXMubGFzdE1lc2dUaW1lKSB7XG4gICAgICB0aGlzLmxhc3RNZXNnVGltZSA9IHt9O1xuICAgIH0gZWxzZSBpZiAodGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRoaXMubGFzdE1lc2dUaW1lW2NoYW5uZWxdO1xuICAgIH1cbiAgICAvLyB0aGUgfCAwIGJlbG93IHR1cm5zIHN0cmluZ3MgaW50byBudW1iZXJzXG4gICAgdmFyIHRpbWUgPSBsb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKHRoaXMua2V5TGFzdE1lc3NhZ2UoY2hhbm5lbCkpIHx8IDA7XG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgIHJldHVybiB0aW1lO1xuICB9XG5cbiAgLy8gZGVwcmVjYXRlZDogdXNlIHNldFRpbWVzdGFtcCBpbnN0ZWFkIVxuICBwcml2YXRlIHNldExhc3RNZXNzYWdlVGltZShjaGFubmVsOiBzdHJpbmcsIHRpbWU6IGFueSk6IGFueSB7XG4gICAgaWYgKCF0aW1lKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UoKS5yZW1vdmVJdGVtKHRoaXMua2V5TGFzdE1lc3NhZ2UoY2hhbm5lbCkpO1xuICAgIH0gZWxzZSBpZih0aW1lID4gdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCkpIHtcbiAgICAgIGxvY2FsU3RvcmFnZSgpLnNldEl0ZW0odGhpcy5rZXlMYXN0TWVzc2FnZShjaGFubmVsKSwgdGltZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiB0aGlzLmxhc3RNZXNnVGltZVtjaGFubmVsXTtcbiAgICB9XG4gICAgdGhpcy5sYXN0TWVzZ1RpbWVbY2hhbm5lbF0gPSB0aW1lO1xuICAgIHJldHVybiB0aW1lO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRUaW1lc3RhbXBNb2RlbChjaGFubmVsOiBzdHJpbmcpOiBRLlByb21pc2U8TGl2ZURhdGFUaW1lc3RhbXBNb2RlbD4ge1xuICAgIGlmICh0aGlzLnRpbWVzdGFtcHMpIHtcbiAgICAgIGlmICghdGhpcy50aW1lc3RhbXBzUHJvbWlzZSkge1xuICAgICAgICAvLyBpbml0aWFsbHkgZmV0Y2ggYWxsIG1lc3NhZ2VzXG4gICAgICAgIHRoaXMudGltZXN0YW1wc1Byb21pc2UgPSBRKHRoaXMudGltZXN0YW1wcy5mZXRjaCgpKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLnRpbWVzdGFtcHNQcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gdGhpcy50aW1lc3RhbXBzLmdldChjaGFubmVsKSB8fCB0aGlzLnRpbWVzdGFtcHMuYWRkKG5ldyB0aGlzLnRpbWVzdGFtcHMubW9kZWwoe1xuICAgICAgICAgICAgY2hhbm5lbDogY2hhbm5lbCxcbiAgICAgICAgICAgIHRpbWVzdGFtcDogdGhpcy5nZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbClcbiAgICAgICAgICB9LCB7XG4gICAgICAgICAgICBzdG9yZTogdGhpcy50aW1lc3RhbXBzLnN0b3JlXG4gICAgICAgICAgfSkpO1xuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgZ2V0VGltZXN0YW1wKGNoYW5uZWw6IHN0cmluZyk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBsZXQgcSA9IHRoaXMuZ2V0VGltZXN0YW1wTW9kZWwoY2hhbm5lbCk7XG4gICAgaWYgKCFxKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlKHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpKTtcbiAgICB9XG5cbiAgICB0aGlzLnRpbWVzdGFtcHNQcm9taXNlID0gcS50aGVuKChtb2RlbCkgPT4ge1xuICAgICAgcmV0dXJuIG1vZGVsLmF0dHJpYnV0ZXMudGltZXN0YW1wO1xuICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5nZXRUaW1lc3RhbXA6ICcgKyBjaGFubmVsLCBlcnIpO1xuICAgICAgcmV0dXJuIHRoaXMuZ2V0TGFzdE1lc3NhZ2VUaW1lKGNoYW5uZWwpO1xuICAgIH0pO1xuICAgIHJldHVybiB0aGlzLnRpbWVzdGFtcHNQcm9taXNlO1xuICB9XG5cbiAgc2V0VGltZXN0YW1wKGNoYW5uZWw6IHN0cmluZywgdGltZTogYW55KTogUS5Qcm9taXNlPGFueT4ge1xuICAgIGxldCBxID0gdGhpcy5nZXRUaW1lc3RhbXBNb2RlbChjaGFubmVsKTtcbiAgICBpZiAoIXEpIHtcbiAgICAgIHJldHVybiB0aGlzLnNldExhc3RNZXNzYWdlVGltZShjaGFubmVsLCB0aW1lKTtcbiAgICB9XG5cbiAgICB0aGlzLnRpbWVzdGFtcHNQcm9taXNlID0gcS50aGVuKChtb2RlbCkgPT4ge1xuICAgICAgaWYgKCF0aW1lIHx8IHRpbWUgPiBtb2RlbC5hdHRyaWJ1dGVzLnRpbWVzdGFtcCkge1xuICAgICAgICByZXR1cm4gbW9kZWwuc2F2ZSh7XG4gICAgICAgICAgdGltZXN0YW1wOiB0aW1lXG4gICAgICAgIH0pLnRoZW5SZXNvbHZlKHRpbWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1vZGVsLmF0dHJpYnV0ZXMudGltZXN0YW1wO1xuICAgIH0pLmNhdGNoKChlcnIpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5zZXRUaW1lc3RhbXA6ICcgKyBjaGFubmVsLCBlcnIpO1xuICAgICAgcmV0dXJuIHRpbWU7XG4gICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICByZXR1cm4gdGhpcy5zZXRMYXN0TWVzc2FnZVRpbWUoY2hhbm5lbCwgdGltZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRoaXMudGltZXN0YW1wc1Byb21pc2U7XG4gIH1cblxuICBvbkNvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgLy8gd2hlbiBvZmZsaW5lIHRyYW5zbWlzc2lvbiBpcyBwZW5kaW5nLCBuZWVkIHRvIHdhaXQgZm9yIGl0IHRvIGNvbXBsZXRlXG4gICAgICBsZXQgcSA9IFEucmVzb2x2ZSh1bmRlZmluZWQpO1xuICAgICAgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlICYmIHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUGVuZGluZygpKSB7XG4gICAgICAgIHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZS5jYXRjaCgoZXJyb3IpID0+IFEucmVzb2x2ZSh1bmRlZmluZWQpKTtcbiAgICAgIH1cblxuICAgICAgLy8gc3luYyBzZXJ2ZXIvY2xpZW50IGNoYW5nZXNcbiAgICAgIGVuZHBvaW50LmlzQ29ubmVjdGVkID0gcS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gbmV4dCB3ZSdsbCBmZXRjaCBzZXJ2ZXItc2lkZSBjaGFuZ2VzXG4gICAgICAgIHJldHVybiB0aGlzLmZldGNoQ2hhbmdlcyhlbmRwb2ludCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgLy8gdGhlbiBzZW5kIGNsaWVudC1zaWRlIGNoYW5nZXNcbiAgICAgICAgICBpZiAodGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPT09ICdhbGwnIHx8IHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID09PSBlbmRwb2ludC5lbnRpdHkpIHtcbiAgICAgICAgICAgIC8vIHJlc3RhcnQgcmVwbGF5aW5nIG9mIG9mZmxpbmUgbWVzc2FnZXNcbiAgICAgICAgICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gbnVsbDtcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gbnVsbDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHRoaXMuX3NlbmRNZXNzYWdlcygpO1xuICAgICAgICB9KS5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgICAvLyBjYXRjaCB3aXRob3V0IGVycm9yIGluZGljYXRlcyBkaXNjb25uZWN0aW9uIHdoaWxlIGdvaW5nIG9ubGluZVxuICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIGRpc2Nvbm5lY3RlZCB3aGlsZSBzZW5kaW5nIG9mZmxpbmUgY2hhbmdlc1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcbiAgICAgICAgfSk7XG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gaW4gdGhlIGVuZCwgd2hlbiBjb25uZWN0ZWQgc3RpbGwsIGZpcmUgYW4gZXZlbnQgaW5mb3JtaW5nIGNsaWVudCBjb2RlXG4gICAgICAgIGlmIChlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIHRoaXMudHJpZ2dlcignY29ubmVjdDonICsgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gZW5kcG9pbnQuaXNDb25uZWN0ZWQ7XG4gIH1cblxuICBvbkRpc2Nvbm5lY3QoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICBlbmRwb2ludC5pc0Nvbm5lY3RlZCA9IG51bGw7XG4gICAgaWYgKCF0aGlzLmRpc2Nvbm5lY3RlZEVudGl0eSkge1xuICAgICAgdGhpcy5kaXNjb25uZWN0ZWRFbnRpdHkgPSAnYWxsJztcbiAgICB9XG5cbiAgICByZXR1cm4gUS5mY2FsbCgoKSA9PiB7XG4gICAgICBpZiAoZW5kcG9pbnQuc29ja2V0ICYmICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0KSB7XG4gICAgICAgIC8vIGNvbnNpZGVyIGNhbGxpbmcgZW5kcG9pbnQuc29ja2V0LmRpc2Nvbm5lY3QoKSBpbnN0ZWFkXG4gICAgICAgICg8YW55PmVuZHBvaW50LnNvY2tldCkuc29ja2V0Lm9uRGlzY29ubmVjdCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgIGlmICghZW5kcG9pbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdkaXNjb25uZWN0OicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIF9maXhNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlKTogTGl2ZURhdGFNZXNzYWdlIHtcbiAgICBsZXQgaWRBdHRyaWJ1dGUgPSBlbmRwb2ludC5tb2RlbFR5cGUucHJvdG90eXBlLmlkQXR0cmlidXRlO1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhaWRBdHRyaWJ1dGUsICdubyBpZEF0dHJpYnV0ZSEnKTtcblxuICAgIGlmIChtc2cuZGF0YSAmJiAhbXNnLmRhdGFbaWRBdHRyaWJ1dGVdICYmIG1zZy5kYXRhLl9pZCkge1xuICAgICAgbXNnLmRhdGFbaWRBdHRyaWJ1dGVdID0gbXNnLmRhdGEuX2lkOyAvLyBzZXJ2ZXIgYnVnIVxuICAgIH0gZWxzZSBpZiAoIW1zZy5kYXRhICYmIG1zZy5tZXRob2QgPT09ICdkZWxldGUnICYmIG1zZ1tpZEF0dHJpYnV0ZV0pIHtcbiAgICAgIG1zZy5kYXRhID0ge307XG4gICAgICBtc2cuZGF0YVtpZEF0dHJpYnV0ZV0gPSBtc2dbaWRBdHRyaWJ1dGVdOyAvLyBzZXJ2ZXIgYnVnIVxuICAgIH1cbiAgICByZXR1cm4gbXNnO1xuICB9XG5cbiAgb25NZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlKTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT4ge1xuICAgIC8vIHRoaXMgaXMgY2FsbGVkIGJ5IHRoZSBzdG9yZSBpdHNlbGYgZm9yIGEgcGFydGljdWxhciBlbmRwb2ludCFcbiAgICBpZiAoIW1zZyB8fCAhbXNnLm1ldGhvZCkge1xuICAgICAgcmV0dXJuIFEucmVqZWN0PExpdmVEYXRhTWVzc2FnZT4obmV3IEVycm9yKCdubyBtZXNzYWdlIG9yIG1ldGhvZCBnaXZlbicpKTtcbiAgICB9XG5cbiAgICB2YXIgcTogUS5Qcm9taXNlPGFueT47XG4gICAgdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIGlmIChlbmRwb2ludC5sb2NhbFN0b3JlKSB7XG4gICAgICAvLyBmaXJzdCB1cGRhdGUgdGhlIGxvY2FsIHN0b3JlIGJ5IGZvcm1pbmcgYSBtb2RlbCBhbmQgaW52b2tpbmcgc3luY1xuICAgICAgdmFyIG9wdGlvbnMgPSBfLmRlZmF1bHRzKHtcbiAgICAgICAgc3RvcmU6IGVuZHBvaW50LmxvY2FsU3RvcmVcbiAgICAgIH0sIHRoaXMubG9jYWxTdG9yZU9wdGlvbnMpO1xuICAgICAgdmFyIG1vZGVsID0gbmV3IGVuZHBvaW50Lm1vZGVsVHlwZShtc2cuZGF0YSwgXy5leHRlbmQoe1xuICAgICAgICBwYXJzZTogdHJ1ZVxuICAgICAgfSwgb3B0aW9ucykpO1xuICAgICAgaWYgKCFtb2RlbC5pZCkge1xuICAgICAgICAvLyBjb2RlIGJlbG93IHdpbGwgcGVyc2lzdCB3aXRoIGF1dG8tYXNzaWduZWQgaWQgYnV0IHRoaXMgbmV2ZXJ0aGVsZXNzIGlzIGEgYnJva2VuIHJlY29yZFxuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdvbk1lc3NhZ2U6ICcgKyBlbmRwb2ludC5lbnRpdHkgKyAnIHJlY2VpdmVkIGRhdGEgd2l0aCBubyB2YWxpZCBpZCBwZXJmb3JtaW5nICcgKyBtc2cubWV0aG9kICsgJyEnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGRpYWcuZGVidWcuZGVidWcoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgJyArIG1vZGVsLmlkICsgJyBwZXJmb3JtaW5nICcgKyBtc2cubWV0aG9kKTtcbiAgICAgIH1cbiAgICAgIHEgPSBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobXNnLm1ldGhvZCwgbW9kZWwsIF8uZXh0ZW5kKG9wdGlvbnMsIHtcbiAgICAgICAgbWVyZ2U6IG1zZy5tZXRob2QgPT09ICdwYXRjaCdcbiAgICAgIH0pKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgaWYgKCFtc2cuaWQgfHwgbXNnLmlkID09PSBtb2RlbC5pZCkge1xuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBpZCB2YWx1ZSB3YXMgcmVhc3NpZ25lZCwgZGVsZXRlIHJlY29yZCBvZiBvbGQgaWRcbiAgICAgICAgdmFyIG9sZERhdGEgPSB7fTtcbiAgICAgICAgb2xkRGF0YVttb2RlbC5pZEF0dHJpYnV0ZV0gPSBtc2cuaWQ7XG4gICAgICAgIHZhciBvbGRNb2RlbCA9IG5ldyBlbmRwb2ludC5tb2RlbFR5cGUob2xkRGF0YSwgb3B0aW9ucyk7XG4gICAgICAgIGRpYWcuZGVidWcuZGVidWcoJ29uTWVzc2FnZTogJyArIGVuZHBvaW50LmVudGl0eSArICcgJyArIG1vZGVsLmlkICsgJyByZWFzc2lnbmVkIGZyb20gb2xkIHJlY29yZCAnICsgb2xkTW9kZWwuaWQpO1xuICAgICAgICByZXR1cm4gZW5kcG9pbnQubG9jYWxTdG9yZS5zeW5jKCdkZWxldGUnLCBvbGRNb2RlbCwgb3B0aW9ucyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8ganVzdCB1cGRhdGUgYWxsIGNvbGxlY3Rpb25zIGxpc3RlbmluZ1xuICAgICAgcSA9IFEucmVzb2x2ZShtc2cpO1xuICAgIH1cblxuICAgIC8vIGZpbmFsbHkgc2V0IHRoZSBtZXNzYWdlIHRpbWVcbiAgICByZXR1cm4gcS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiBRLnJlc29sdmUobXNnLnRpbWUgJiYgdGhpcy5zZXRUaW1lc3RhbXAoY2hhbm5lbCwgbXNnLnRpbWUpKS50aGVuKCgpID0+IHtcbiAgICAgICAgLy8gdXBkYXRlIGFsbCBjb2xsZWN0aW9ucyBsaXN0ZW5pbmdcbiAgICAgICAgdGhpcy50cmlnZ2VyKCdzeW5jOicgKyBjaGFubmVsLCBtc2cpOyAvLyBTeW5jQ29udGV4dC5vbk1lc3NhZ2VcbiAgICAgICAgcmV0dXJuIG1zZztcbiAgICAgIH0pO1xuICAgIH0sIChlcnJvcjogRXJyb3IpID0+IHtcbiAgICAgIC8vIG5vdCBzZXR0aW5nIG1lc3NhZ2UgdGltZSBpbiBlcnJvciBjYXNlXG5cbiAgICAgIC8vIHJlcG9ydCBlcnJvciBhcyBldmVudCBvbiBzdG9yZVxuICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTtcbiAgICAgIHJldHVybiBtc2c7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pOiBRLlByb21pc2U8YW55PiB7XG4gICAgZGlhZy5kZWJ1Zy50cmFjZSgnUmVsdXRpb24ubGl2ZWRhdGEuU3luY1N0b3JlLnN5bmMnKTtcbiAgICB0cnkge1xuICAgICAgdmFyIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQgPSBtb2RlbC5lbmRwb2ludCB8fCB0aGlzLmdldEVuZHBvaW50KG1vZGVsKTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyBlbmRwb2ludCcpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBjb2xsZWN0aW9ucyBjYW4gYmUgZmlsdGVyZWQsIGV0Yy5cbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gJ3JlYWQnICYmICFvcHRpb25zLmJhcmVib25lKSB7XG4gICAgICAgICAgdmFyIHN5bmNDb250ZXh0OiBTeW5jQ29udGV4dCA9IG9wdGlvbnMuc3luY0NvbnRleHQ7IC8vIHN5bmMgY2FuIGJlIGNhbGxlZCBieSBTeW5jQ29udGV4dCBpdHNlbGYgd2hlbiBwYWdpbmcgcmVzdWx0c1xuICAgICAgICAgIGlmICghc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgIC8vIGNhcHR1cmUgR2V0UXVlcnkgb3B0aW9uc1xuICAgICAgICAgICAgc3luY0NvbnRleHQgPSBuZXcgU3luY0NvbnRleHQoXG4gICAgICAgICAgICAgIG9wdGlvbnMsICAgICAgICAvLyBkeW5hbWljIG9wdGlvbnMgcGFzc2VkIHRvIGZldGNoKCkgaW1wbGVtZW50IFVJIGZpbHRlcnMsIGV0Yy5cbiAgICAgICAgICAgICAgbW9kZWwub3B0aW9ucywgIC8vIHN0YXRpYyBvcHRpb25zIG9uIGNvbGxlY3Rpb24gaW1wbGVtZW50IHNjcmVlbi1zcGVjaWZpYyBzdHVmZlxuICAgICAgICAgICAgICB0aGlzICAgICAgICAgICAgLy8gc3RhdGljIG9wdGlvbnMgb2YgdGhpcyBzdG9yZSByZWFsaXplIGZpbHRlcmluZyBjbGllbnQvc2VydmVyXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgb3B0aW9ucy5zeW5jQ29udGV4dCA9IHN5bmNDb250ZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAobW9kZWwuc3luY0NvbnRleHQgIT09IHN5bmNDb250ZXh0KSB7XG4gICAgICAgICAgICAvLyBhc3NpZ24gYSBkaWZmZXJlbnQgaW5zdGFuY2VcbiAgICAgICAgICAgIGlmIChtb2RlbC5zeW5jQ29udGV4dCkge1xuICAgICAgICAgICAgICBtb2RlbC5zdG9wTGlzdGVuaW5nKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIG1vZGVsLmxpc3RlblRvKHRoaXMsICdzeW5jOicgKyBlbmRwb2ludC5jaGFubmVsLCBfLmJpbmQoc3luY0NvbnRleHQub25NZXNzYWdlLCBzeW5jQ29udGV4dCwgdGhpcywgbW9kZWwpKTtcbiAgICAgICAgICAgIG1vZGVsLnN5bmNDb250ZXh0ID0gc3luY0NvbnRleHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKGlzTW9kZWwobW9kZWwpKSB7XG4gICAgICAgIC8vIG9mZmxpbmUgY2FwYWJpbGl0eSByZXF1aXJlcyBJRHMgZm9yIGRhdGFcbiAgICAgICAgaWYgKCFtb2RlbC5pZCkge1xuICAgICAgICAgIGlmIChtZXRob2QgPT09ICdjcmVhdGUnKSB7XG4gICAgICAgICAgICBtb2RlbC5zZXQobW9kZWwuaWRBdHRyaWJ1dGUsIG9iamVjdGlkLm1ha2VPYmplY3RJRCgpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdubyAodmFsaWQpIGlkOiAnICsgbW9kZWwuaWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc29tZXRoaW5nIGlzIHJlYWxseSBhdCBvZGRzIGhlcmUuLi5cbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0YXJnZXQgb2Ygc3luYyBpcyBuZWl0aGVyIGEgbW9kZWwgbm9yIGEgY29sbGVjdGlvbiE/IScpO1xuICAgICAgfVxuXG4gICAgICAvLyBhdCB0aGlzIHBvaW50IHRoZSB0YXJnZXQgc2VydmVyIGlzIGtub3duLCBjaGVjayBtYWtpbmcgc3VyZSB0aGUgY29ycmVjdCBzZXJ2ZXIgaXMgYmVpbmcgaGl0XG4gICAgICBjb25zdCBzZXJ2ZXJVcmwgPSB3ZWIucmVzb2x2ZVNlcnZlcihtb2RlbC5nZXRVcmxSb290KCksIHtcbiAgICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxuICAgICAgfSk7XG4gICAgICBpZiAoc2VydmVyVXJsICE9PSB0aGlzLnNlcnZlclVybCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3N0b3JlIGlzIGJvdW5kIHRvIHNlcnZlciAnICsgdGhpcy5zZXJ2ZXJVcmwpO1xuICAgICAgfVxuXG4gICAgICB2YXIgY2hhbm5lbCA9IGVuZHBvaW50LmNoYW5uZWw7XG4gICAgICByZXR1cm4gdGhpcy5nZXRUaW1lc3RhbXAoY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIG9ubHkgc2VuZCByZWFkIG1lc3NhZ2VzIGlmIG5vIG90aGVyIHN0b3JlIGNhbiBkbyB0aGlzIG9yIGZvciBpbml0aWFsIGxvYWRcbiAgICAgICAgICBpZiAobWV0aG9kID09PSAncmVhZCcgJiYgZW5kcG9pbnQubG9jYWxTdG9yZSAmJiB0aW1lICYmICFvcHRpb25zLnJlc2V0KSB7XG4gICAgICAgICAgICAvLyByZWFkIGRhdGEgZnJvbSBsb2NhbFN0b3JlIGFuZCBmZXRjaCBjaGFuZ2VzIHJlbW90ZVxuICAgICAgICAgICAgdmFyIG9wdHMgPSBfLmNsb25lKG9wdGlvbnMpO1xuICAgICAgICAgICAgb3B0cy5zdG9yZSA9IGVuZHBvaW50LmxvY2FsU3RvcmU7XG4gICAgICAgICAgICBvcHRzLmVudGl0eSA9IGVuZHBvaW50LmVudGl0eTtcbiAgICAgICAgICAgIGRlbGV0ZSBvcHRzLnN1Y2Nlc3M7XG4gICAgICAgICAgICBkZWxldGUgb3B0cy5lcnJvcjtcbiAgICAgICAgICAgIHJldHVybiBlbmRwb2ludC5sb2NhbFN0b3JlLnN5bmMobWV0aG9kLCBtb2RlbCwgb3B0cykudGhlbigocmVzcCkgPT4ge1xuICAgICAgICAgICAgICAvLyBiYWNrYm9uZSBzdWNjZXNzIGNhbGxiYWNrIGFsdGVycyB0aGUgY29sbGVjdGlvbiBub3dcbiAgICAgICAgICAgICAgcmVzcCA9IHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXNwKSB8fCByZXNwO1xuICAgICAgICAgICAgICBpZiAoZW5kcG9pbnQuc29ja2V0IHx8IG9wdGlvbnMuZmV0Y2hNb2RlID09PSAnbG9jYWwnKSB7XG4gICAgICAgICAgICAgICAgLy8gbm8gbmVlZCB0byBmZXRjaCBjaGFuZ2VzIGFzIHdlIGdvdCBhIHdlYnNvY2tldCwgdGhhdCBpcyBlaXRoZXIgY29ubmVjdGVkIG9yIGF0dGVtcHRzIHJlY29ubmVjdGlvblxuICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgLy8gd2hlbiB3ZSBhcmUgZGlzY29ubmVjdGVkLCB0cnkgdG8gY29ubmVjdCBub3dcbiAgICAgICAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLmZldGNoU2VydmVySW5mbyhlbmRwb2ludCkudGhlbigoaW5mbyk6IGFueSA9PiB7XG4gICAgICAgICAgICAgICAgICAvLyB0cmlnZ2VyIHJlY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdDogUS5Qcm9taXNlPHZvaWQ+O1xuICAgICAgICAgICAgICAgICAgaWYgKCFlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLm9uQ29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8IGluZm87XG4gICAgICAgICAgICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAgICAgICAgICAgLy8gdHJpZ2dlciBkaXNjb25uZWN0aW9uIHdoZW4gZGlzY29ubmVjdGVkXG4gICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0OiBRLlByb21pc2U8dm9pZD47XG4gICAgICAgICAgICAgICAgICBpZiAoIXhoci5zdGF0dXNDb2RlICYmIGVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdCA9IHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgcmVzcDtcbiAgICAgICAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTtcbiAgICAgICAgICAgICAgfSAvLyBlbHNlLi4uXG5cbiAgICAgICAgICAgICAgLy8gbG9hZCBjaGFuZ2VzIG9ubHkgKHdpbGwgaGFwcGVuIEFGVEVSIHN1Y2Nlc3MgY2FsbGJhY2sgaXMgaW52b2tlZCxcbiAgICAgICAgICAgICAgLy8gYnV0IHJldHVybmVkIHByb21pc2Ugd2lsbCByZXNvbHZlIG9ubHkgYWZ0ZXIgY2hhbmdlcyB3ZXJlIHByb2Nlc3NlZC5cbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuZmV0Y2hDaGFuZ2VzKGVuZHBvaW50KS5jYXRjaCgoeGhyOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KSB8fCByZXNwO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdC4uLlxuICAgICAgICAgICAgICAgIHRoaXMudHJpZ2dlcignZXJyb3I6JyArIGNoYW5uZWwsIHhociwgbW9kZWwpO1xuICAgICAgICAgICAgICAgIHJldHVybiByZXNwO1xuICAgICAgICAgICAgICB9KS50aGVuUmVzb2x2ZShyZXNwKTsgLy8gY2FsbGVyIGV4cGVjdHMgb3JpZ2luYWwgWEhSIHJlc3BvbnNlIGFzIGNoYW5nZXMgYm9keSBkYXRhIGlzIE5PVCBjb21wYXRpYmxlXG4gICAgICAgICAgICB9LCAoKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGZhbGwtYmFjayB0byBsb2FkaW5nIGZ1bGwgZGF0YSBzZXRcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuX2FkZE1lc3NhZ2UobWV0aG9kLCBtb2RlbCwgb3B0aW9ucywgZW5kcG9pbnQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gZG8gYmFja2JvbmUgcmVzdFxuICAgICAgICAgIHJldHVybiB0aGlzLl9hZGRNZXNzYWdlKG1ldGhvZCwgbW9kZWwsIG9wdGlvbnMsIGVuZHBvaW50KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QodGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIFEucmVqZWN0KHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IGVycm9yKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIF9hZGRNZXNzYWdlKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICB2YXIgY2hhbmdlcyA9ICg8TW9kZWw+bW9kZWwpLmNoYW5nZWRTaW5jZVN5bmM7XG4gICAgdmFyIGRhdGE6IGFueSA9IG51bGw7XG4gICAgdmFyIHN0b3JlTXNnID0gdHJ1ZTtcbiAgICBzd2l0Y2ggKG1ldGhvZCkge1xuICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgIGRhdGEgPSBvcHRpb25zLmF0dHJzIHx8IG1vZGVsLnRvSlNPTigpO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAncGF0Y2gnOlxuICAgICAgICBpZiAoXy5pc0VtcHR5KGNoYW5nZXMpKSB7XG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGRhdGEgPSBtb2RlbC50b0pTT04oe1xuICAgICAgICAgIGF0dHJzOiBjaGFuZ2VzXG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAnZGVsZXRlJzpcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0ICgoKSA9PiBtZXRob2QgPT09ICdyZWFkJywgJ3Vua25vd24gbWV0aG9kOiAnICsgbWV0aG9kKTtcbiAgICAgICAgc3RvcmVNc2cgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIGxldCBlbnRpdHkgPSBtb2RlbC5lbnRpdHkgfHwgZW5kcG9pbnQuZW50aXR5O1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1vZGVsLmVudGl0eSA9PT0gZW5kcG9pbnQuZW50aXR5KTtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbnRpdHkuaW5kZXhPZignficpIDwgMCwgJ2VudGl0eSBuYW1lIG11c3Qgbm90IGNvbnRhaW4gYSB+IGNoYXJhY3RlciEnKTtcbiAgICB2YXIgbXNnOiBMaXZlRGF0YU1lc3NhZ2UgPSB7XG4gICAgICBfaWQ6IGVudGl0eSArICd+JyArICg8TW9kZWw+bW9kZWwpLmlkLFxuICAgICAgaWQ6ICg8TW9kZWw+bW9kZWwpLmlkLFxuICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICBkYXRhOiBkYXRhLFxuICAgICAgLy8gY2hhbm5lbDogZW5kcG9pbnQuY2hhbm5lbCwgLy8gY2hhbm5lbCBpcyBoYWNrZWQgaW4gYnkgc3RvcmVNZXNzYWdlKCksIHdlIGRvbid0IHdhbnQgdG8gdXNlIHRoaXMgYW55bW9yZVxuICAgICAgcHJpb3JpdHk6IGVuZHBvaW50LnByaW9yaXR5LFxuICAgICAgdGltZTogRGF0ZS5ub3coKVxuICAgIH07XG5cbiAgICB2YXIgcSA9IFEucmVzb2x2ZShtc2cpO1xuICAgIHZhciBxTWVzc2FnZTogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZU1vZGVsPjtcbiAgICBpZiAoc3RvcmVNc2cpIHtcbiAgICAgIC8vIHN0b3JlIGFuZCBwb3RlbnRpYWxseSBtZXJnZSBtZXNzYWdlXG4gICAgICBxTWVzc2FnZSA9IHRoaXMuc3RvcmVNZXNzYWdlKGVuZHBvaW50LCBxKTtcbiAgICAgIHEgPSBxTWVzc2FnZS50aGVuKChtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCkgPT4ge1xuICAgICAgICAvLyBpbiBjYXNlIG9mIG1lcmdpbmcsIHRoaXMgcmVzdWx0IGNvdWxkIGJlIGRpZmZlcmVudFxuICAgICAgICByZXR1cm4gbWVzc2FnZS5hdHRyaWJ1dGVzO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBxLnRoZW4oKG1zZzI6IExpdmVEYXRhTWVzc2FnZSkgPT4ge1xuICAgICAgLy8gcGFzcyBpbiBxTWVzc2FnZSBzbyB0aGF0IGRlbGV0aW9uIG9mIHN0b3JlZCBtZXNzYWdlIGNhbiBiZSBzY2hlZHVsZWRcbiAgICAgIHJldHVybiB0aGlzLl9lbWl0TWVzc2FnZShlbmRwb2ludCwgbXNnMiwgb3B0aW9ucywgbW9kZWwsIHFNZXNzYWdlKTtcbiAgICB9KTtcbiAgfVxuXG4gIHByaXZhdGUgX2VtaXRNZXNzYWdlKGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLCBvcHRpb25zOiBhbnksXG4gICAgICAgICAgICAgICAgICAgICAgIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTpcbiAgUS5Qcm9taXNlPGFueT4ge1xuICAgIHZhciBjaGFubmVsID0gZW5kcG9pbnQuY2hhbm5lbDtcbiAgICB2YXIgcUFqYXggPSB0aGlzLl9hamF4TWVzc2FnZShlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XG4gICAgdmFyIHEgPSBxQWpheDtcblxuICAgIGlmIChxTWVzc2FnZSkge1xuICAgICAgLy8gZm9sbG93aW5nIHRha2VzIGNhcmUgb2Ygb2ZmbGluZSBjaGFuZ2Ugc3RvcmVcbiAgICAgIHEgPSBxLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgICAgLy8gc3VjY2VzcywgcmVtb3ZlIG1lc3NhZ2Ugc3RvcmVkLCBpZiBhbnlcbiAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTWVzc2FnZShlbmRwb2ludCwgbXNnLCBxTWVzc2FnZSkuY2F0Y2goKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgdGhpcy50cmlnZ2VyKCdlcnJvcjonICsgY2hhbm5lbCwgZXJyb3IsIG1vZGVsKTsgLy8gY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0Li4uXG4gICAgICAgICAgcmV0dXJuIGRhdGE7XG4gICAgICAgIH0pLnRoZW5SZXNvbHZlKGRhdGEpOyAvLyByZXNvbHZlIGFnYWluIHlpZWxkaW5nIGRhdGFcbiAgICAgIH0sICh4aHI6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgICAgLy8gZmFpbHVyZSBldmVudHVhbGx5IGNhdWdodCBieSBvZmZsaW5lIGNoYW5nZXNcbiAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiB0aGlzLnVzZU9mZmxpbmVDaGFuZ2VzKSB7XG4gICAgICAgICAgLy8gdGhpcyBzZWFtcyB0byBiZSBvbmx5IGEgY29ubmVjdGlvbiBwcm9ibGVtLCBzbyB3ZSBrZWVwIHRoZSBtZXNzYWdlIGFuZCBjYWxsIHN1Y2Nlc3NcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG1zZy5kYXRhKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyByZW1vdmUgbWVzc2FnZSBzdG9yZWQgYW5kIGtlZXAgcmVqZWN0aW9uIGFzIGlzXG4gICAgICAgICAgcmV0dXJuIHRoaXMucmVtb3ZlTWVzc2FnZShlbmRwb2ludCwgbXNnLCBxTWVzc2FnZSkuY2F0Y2goKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpOyAvLyBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXQuLi5cbiAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgfSkudGhlblJlamVjdCh4aHIpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBxID0gdGhpcy5fYXBwbHlSZXNwb25zZShxLCBlbmRwb2ludCwgbXNnLCBvcHRpb25zLCBtb2RlbCk7XG5cbiAgICByZXR1cm4gcS5maW5hbGx5KCgpID0+IHtcbiAgICAgIC8vIGRvIHNvbWUgY29ubmVjdGlvbiBoYW5kbGluZ1xuICAgICAgcmV0dXJuIHFBamF4LnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyB0cmlnZ2VyIHJlY29ubmVjdGlvbiB3aGVuIGRpc2Nvbm5lY3RlZFxuICAgICAgICBpZiAoIWVuZHBvaW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgICAgcmV0dXJuIHRoaXMub25Db25uZWN0KGVuZHBvaW50KTtcbiAgICAgICAgfVxuICAgICAgfSwgKHhocjogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgICAvLyB0cmlnZ2VyIGRpc2Nvbm5lY3Rpb24gd2hlbiBkaXNjb25uZWN0ZWRcbiAgICAgICAgaWYgKCF4aHIuc3RhdHVzQ29kZSAmJiBlbmRwb2ludC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICAgIHJldHVybiB0aGlzLm9uRGlzY29ubmVjdChlbmRwb2ludCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYWpheE1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIG9wdGlvbnM6IGFueSxcbiAgICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBkZWxldGUgb3B0aW9ucy54aHI7IC8vIG1ha2Ugc3VyZSBub3QgdG8gdXNlIG9sZCB2YWx1ZVxuXG4gICAgdmFyIHVybCA9IG9wdGlvbnMudXJsO1xuICAgIGlmICghdXJsKSB7XG4gICAgICB1cmwgPSBlbmRwb2ludC51cmxSb290O1xuICAgICAgaWYgKG1zZy5pZCAmJiBtc2cubWV0aG9kICE9PSAnY3JlYXRlJykge1xuICAgICAgICAvLyBhZGQgSUQgb2YgbW9kZWxcbiAgICAgICAgdXJsICs9ICh1cmwuY2hhckF0KHVybC5sZW5ndGggLSAxKSA9PT0gJy8nID8gJycgOiAnLycgKSArIG1zZy5pZDtcbiAgICAgIH1cbiAgICAgIGlmIChtc2cubWV0aG9kID09PSAncmVhZCcgJiYgaXNDb2xsZWN0aW9uKG1vZGVsKSkge1xuICAgICAgICAvLyBhZGQgcXVlcnkgb2YgY29sbGVjdGlvblxuICAgICAgICB2YXIgY29sbGVjdGlvblVybCA9IF8uaXNGdW5jdGlvbihtb2RlbC51cmwpID8gbW9kZWwudXJsKCkgOiBtb2RlbC51cmw7XG4gICAgICAgIHZhciBxdWVyeUluZGV4ID0gY29sbGVjdGlvblVybC5sYXN0SW5kZXhPZignPycpO1xuICAgICAgICB2YXIgZ2V0UXVlcnkgPSBuZXcgR2V0UXVlcnkoKS5mcm9tSlNPTihvcHRpb25zKTtcbiAgICAgICAgLy8gY3VycmVudGx5IG9ubHkgc29ydE9yZGVyIGNhbiBiZSBzdXBwb3J0ZWQgYXMgd2UgcmVxdWlyZSB0aGUgaW5pdGlhbCBkYXRhIGxvYWQgdG8geWllbGQgZnVsbCBkYXRhc2V0XG4gICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkub2Zmc2V0ID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkuZmlsdGVyID0gbnVsbDtcbiAgICAgICAgZ2V0UXVlcnkuZmllbGRzID0gbnVsbDtcbiAgICAgICAgdmFyIGdldFBhcmFtcyA9IGdldFF1ZXJ5LnRvUXVlcnlQYXJhbXMoKTtcbiAgICAgICAgaWYgKHF1ZXJ5SW5kZXggPj0gMCkge1xuICAgICAgICAgIHVybCArPSBjb2xsZWN0aW9uVXJsLnN1YnN0cihxdWVyeUluZGV4KTtcbiAgICAgICAgICBpZiAoZ2V0UGFyYW1zKSB7XG4gICAgICAgICAgICB1cmwgKz0gJyYnICsgZ2V0UGFyYW1zO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoZ2V0UGFyYW1zKSB7XG4gICAgICAgICAgICB1cmwgKz0gJz8nICsgZ2V0UGFyYW1zO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGVhcmxpZXN0IHBvaW50IHdoZXJlIHRhcmdldCBVUkwgaXMga25vd25cbiAgICBkaWFnLmRlYnVnLmRlYnVnKCdhamF4TWVzc2FnZSAnICsgbXNnLm1ldGhvZCArICcgJyArIHVybCk7XG4gICAgdmFyIG9wdHM6IGFueSA9IHtcbiAgICAgIC8vIG11c3Qgbm90IHRha2UgYXJiaXRyYXJ5IG9wdGlvbnMgYXMgdGhlc2Ugd29uJ3QgYmUgcmVwbGF5ZWQgb24gcmVjb25uZWN0XG4gICAgICB1cmw6IHVybCxcbiAgICAgIGF0dHJzOiBtc2cuZGF0YSxcbiAgICAgIHN0b3JlOiB7fSwgLy8gZW5zdXJlcyBuZXR3b3JrIGlzIHVzZWRcbiAgICAgIGNyZWRlbnRpYWxzOiBvcHRpb25zLmNyZWRlbnRpYWxzLFxuICAgICAgLy8gZXJyb3IgcHJvcGFnYXRpb25cbiAgICAgIGVycm9yOiBvcHRpb25zLmVycm9yXG4gICAgfTtcblxuICAgIC8vIHByb3RlY3QgYWdhaW5zdCB3cm9uZyBzZXJ2ZXIgYW5kIHVzZXIgaWRlbnRpdHlcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB3ZWIucmVzb2x2ZVNlcnZlcih1cmwsIHtcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcbiAgICB9KSA9PT0gdGhpcy5zZXJ2ZXJVcmwpO1xuICAgIGlmIChzZWN1cml0eS5TZXJ2ZXIuZ2V0SW5zdGFuY2UodGhpcy5zZXJ2ZXJVcmwpLmF1dGhvcml6YXRpb24ubmFtZSAhPT0gdGhpcy51c2VyVXVpZCkge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCd1c2VyIGlkZW50aXR5IHdhcyBjaGFuZ2VkLCB3b3JraW5nIG9mZmxpbmUgdW50aWwgYXV0aG9yaXphdGlvbiBpcyByZXN0b3JlZCcpO1xuICAgICAgY29uc3QgZXJyb3I6IHdlYi5IdHRwRXJyb3IgPSBuZXcgRXJyb3IoKTtcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihvcHRzLCBlcnJvcikgfHwgUS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIGFjdHVhbCBhamF4IHJlcXVlc3QgdmlhIGJhY2tib25lLmpzXG4gICAgcmV0dXJuIHRoaXMuY2hlY2tTZXJ2ZXIodXJsLCBvcHRzKS50aGVuKCgpID0+IHtcbiAgICAgIHJldHVybiBtb2RlbC5zeW5jKG1zZy5tZXRob2QsIG1vZGVsLCBvcHRzKS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gdGFrZSBvdmVyIHhociByZXNvbHZpbmcgdGhlIG9wdGlvbnMgY29weVxuICAgICAgICBvcHRpb25zLnhociA9IG9wdHMueGhyLnhociB8fCBvcHRzLnhocjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfYXBwbHlSZXNwb25zZTxUPihxWEhSOiBRLlByb21pc2U8VD4sIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQsIG1zZzogTGl2ZURhdGFNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdGlvbnM6IGFueSwgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxUPiB7XG4gICAgLy8gdmFyIGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIHZhciBjbGllbnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgcmV0dXJuIHFYSFIudGhlbigoZGF0YTogVCB8IGFueSkgPT4ge1xuICAgICAgLy8gZGVsZXRlIG9uIHNlcnZlciBkb2VzIG5vdCByZXNwb25kIGEgYm9keVxuICAgICAgaWYgKCFkYXRhICYmIG1zZy5tZXRob2QgPT09ICdkZWxldGUnKSB7XG4gICAgICAgIGRhdGEgPSBtc2cuZGF0YTtcbiAgICAgIH1cblxuICAgICAgLy8gdXBkYXRlIGxvY2FsIHN0b3JlIHN0YXRlXG4gICAgICBpZiAoZGF0YSkge1xuICAgICAgICAvLyBubyBkYXRhIGlmIHNlcnZlciBhc2tzIG5vdCB0byBhbHRlciBzdGF0ZVxuICAgICAgICAvLyB0aGlzLnNldFRpbWVzdGFtcChjaGFubmVsLCBtc2cudGltZSk7XG4gICAgICAgIHZhciBwcm9taXNlczogUS5Qcm9taXNlPExpdmVEYXRhTWVzc2FnZT5bXSA9IFtdO1xuICAgICAgICB2YXIgZGF0YUlkczogYW55OyAvLyBtb2RlbCBpZCAtPiBhdHRyaWJ1dGVzIGRhdGFcbiAgICAgICAgaWYgKG1zZy5tZXRob2QgIT09ICdyZWFkJykge1xuICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIGRhdGEgPT09IG1zZy5kYXRhID8gbXNnIDogPExpdmVEYXRhTWVzc2FnZT5fLmRlZmF1bHRzKHtcbiAgICAgICAgICAgIGRhdGE6IGRhdGEgLy8ganVzdCBhY2NlcHRzIG5ldyBkYXRhXG4gICAgICAgICAgfSwgbXNnKSkpKTtcbiAgICAgICAgfSBlbHNlIGlmIChpc0NvbGxlY3Rpb24obW9kZWwpICYmIEFycmF5LmlzQXJyYXkoZGF0YSkpIHtcbiAgICAgICAgICAvLyBzeW5jaHJvbml6ZSB0aGUgY29sbGVjdGlvbiBjb250ZW50cyB3aXRoIHRoZSBkYXRhIHJlYWRcbiAgICAgICAgICB2YXIgc3luY0lkcyA9IHt9O1xuICAgICAgICAgIG1vZGVsLm1vZGVscy5mb3JFYWNoKChtKSA9PiB7XG4gICAgICAgICAgICBzeW5jSWRzW20uaWRdID0gbTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBkYXRhSWRzID0ge307XG4gICAgICAgICAgZGF0YS5mb3JFYWNoKChkOiBhbnkpID0+IHtcbiAgICAgICAgICAgIGlmIChkKSB7XG4gICAgICAgICAgICAgIHZhciBpZCA9IGRbZW5kcG9pbnQubW9kZWxUeXBlLnByb3RvdHlwZS5pZEF0dHJpYnV0ZV0gfHwgZC5faWQ7XG4gICAgICAgICAgICAgIGRhdGFJZHNbaWRdID0gZDtcbiAgICAgICAgICAgICAgdmFyIG0gPSBzeW5jSWRzW2lkXTtcbiAgICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgICAvLyB1cGRhdGUgdGhlIGl0ZW1cbiAgICAgICAgICAgICAgICBkZWxldGUgc3luY0lkc1tpZF07IC8vIHNvIHRoYXQgaXQgaXMgZGVsZXRlZCBiZWxvd1xuICAgICAgICAgICAgICAgIGlmICghXy5pc0VxdWFsKF8ucGljay5jYWxsKG0sIG0uYXR0cmlidXRlcywgT2JqZWN0LmtleXMoZCkpLCBkKSkge1xuICAgICAgICAgICAgICAgICAgLy8gYWJvdmUgY2hlY2tlZCB0aGF0IGFsbCBhdHRyaWJ1dGVzIGluIGQgYXJlIGluIG0gd2l0aCBlcXVhbCB2YWx1ZXMgYW5kIGZvdW5kIHNvbWUgbWlzbWF0Y2hcbiAgICAgICAgICAgICAgICAgIHByb21pc2VzLnB1c2godGhpcy5vbk1lc3NhZ2UoZW5kcG9pbnQsIHRoaXMuX2ZpeE1lc3NhZ2UoZW5kcG9pbnQsIHtcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgICBtZXRob2Q6ICd1cGRhdGUnLFxuICAgICAgICAgICAgICAgICAgICB0aW1lOiBtc2cudGltZSxcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogZFxuICAgICAgICAgICAgICAgICAgfSkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIHRoZSBpdGVtXG4gICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgICAgbWV0aG9kOiAnY3JlYXRlJyxcbiAgICAgICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICAgICAgZGF0YTogZFxuICAgICAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBPYmplY3Qua2V5cyhzeW5jSWRzKS5mb3JFYWNoKChpZCkgPT4ge1xuICAgICAgICAgICAgLy8gZGVsZXRlIHRoZSBpdGVtXG4gICAgICAgICAgICB2YXIgbSA9IHN5bmNJZHNbaWRdO1xuICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICBpZDogaWQsXG4gICAgICAgICAgICAgIG1ldGhvZDogJ2RlbGV0ZScsXG4gICAgICAgICAgICAgIHRpbWU6IG1zZy50aW1lLFxuICAgICAgICAgICAgICBkYXRhOiBtLmF0dHJpYnV0ZXNcbiAgICAgICAgICAgIH0pKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gdHJpZ2dlciBhbiB1cGRhdGUgdG8gbG9hZCB0aGUgZGF0YSByZWFkXG4gICAgICAgICAgdmFyIGFycmF5ID0gQXJyYXkuaXNBcnJheShkYXRhKSA/IGRhdGEgOiBbZGF0YV07XG4gICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZGF0YSA9IGFycmF5W2ldO1xuICAgICAgICAgICAgaWYgKGRhdGEpIHtcbiAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaCh0aGlzLm9uTWVzc2FnZShlbmRwb2ludCwgdGhpcy5fZml4TWVzc2FnZShlbmRwb2ludCwge1xuICAgICAgICAgICAgICAgIGlkOiBkYXRhW2VuZHBvaW50Lm1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGVdIHx8IGRhdGEuX2lkLFxuICAgICAgICAgICAgICAgIG1ldGhvZDogJ3VwZGF0ZScsXG4gICAgICAgICAgICAgICAgdGltZTogbXNnLnRpbWUsXG4gICAgICAgICAgICAgICAgZGF0YTogZGF0YVxuICAgICAgICAgICAgICB9KSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gUS5hbGwocHJvbWlzZXMpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIC8vIGRlbGF5ZWQgdGlsbCBvcGVyYXRpb25zIGNvbXBsZXRlXG4gICAgICAgICAgaWYgKCFkYXRhSWRzKSB7XG4gICAgICAgICAgICByZXR1cm4gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKG1vZGVsKSk7XG5cbiAgICAgICAgICAvLyB3aGVuIGNvbGxlY3Rpb24gd2FzIHVwZGF0ZWQgb25seSBwYXNzIGRhdGEgb2YgbW9kZWxzIHRoYXQgd2VyZSBzeW5jZWQgb24gdG8gdGhlIHN1Y2Nlc3MgY2FsbGJhY2ssXG4gICAgICAgICAgLy8gYXMgdGhlIGNhbGxiYWNrIHdpbGwgc2V0IHRoZSBtb2RlbHMgYWdhaW4gY2F1c2luZyBvdXIgc29ydGluZyBhbmQgZmlsdGVyaW5nIHRvIGJlIHdpdGhvdXQgZWZmZWN0LlxuICAgICAgICAgIHZhciByZXNwb25zZTogYW55W10gPSBbXTtcbiAgICAgICAgICBsZXQgbW9kZWxzID0gaXNDb2xsZWN0aW9uKG1vZGVsKSA/IG1vZGVsLm1vZGVscyA6IFttb2RlbF07XG4gICAgICAgICAgZm9yIChsZXQgaSA9IG1vZGVscy5sZW5ndGg7IGktLSA+IDA7ICkge1xuICAgICAgICAgICAgdmFyIG0gPSBtb2RlbHNbaV07XG4gICAgICAgICAgICBpZiAoZGF0YUlkc1ttLmlkXSkge1xuICAgICAgICAgICAgICByZXNwb25zZS5wdXNoKG0uYXR0cmlidXRlcyk7XG4gICAgICAgICAgICAgIGRlbGV0ZSBkYXRhSWRzW20uaWRdO1xuICAgICAgICAgICAgICBpZiAoZGF0YUlkcy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXNwb25zZS5yZXZlcnNlKCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICBsZXQgcVRpbWU6IFEuUHJvbWlzZTxhbnk+O1xuICAgICAgaWYgKG1zZy5tZXRob2QgPT09ICdyZWFkJyAmJiBpc0NvbGxlY3Rpb24obW9kZWwpKSB7XG4gICAgICAgIC8vIFRPRE86IGV4dHJhY3QgRGF0ZSBoZWFkZXIgZnJvbSBvcHRpb25zLnhociBpbnN0ZWFkIG9mIHVzaW5nIGNsaWVudFRpbWVcbiAgICAgICAgcVRpbWUgPSB0aGlzLnNldFRpbWVzdGFtcChlbmRwb2ludC5jaGFubmVsLCBjbGllbnRUaW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHFUaW1lID0gUS5yZXNvbHZlKHVuZGVmaW5lZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcVRpbWUudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIGludm9rZSBzdWNjZXNzIGNhbGxiYWNrLCBpZiBhbnlcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCByZXNwb25zZSkgfHwgcmVzcG9uc2U7XG4gICAgICB9KTtcbiAgICB9LCAoZXJyb3I6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAgIC8vIGludm9rZSBlcnJvciBjYWxsYmFjaywgaWYgYW55XG4gICAgICByZXR1cm4gdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcikgfHwgUS5yZWplY3QoZXJyb3IpO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmZXRjaENoYW5nZXMoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgZm9yY2UgPSBmYWxzZSk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XG4gICAgbGV0IGNoYW5uZWwgPSBlbmRwb2ludC5jaGFubmVsO1xuICAgIGlmICghZW5kcG9pbnQudXJsUm9vdCB8fCAhY2hhbm5lbCkge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIGxldCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGxldCBwcm9taXNlID0gZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nQ2hhbmdlcztcbiAgICBpZiAocHJvbWlzZSAmJiAhZm9yY2UpIHtcbiAgICAgIGlmIChwcm9taXNlLmlzUGVuZGluZygpIHx8IG5vdyAtIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlcyA8IDEwMDApIHtcbiAgICAgICAgLy8gcmV1c2UgZXhpc3RpbmcgZXZlbnR1YWxseSBjb21wbGV0ZWQgcmVxdWVzdCBmb3IgY2hhbmdlc1xuICAgICAgICBkaWFnLmRlYnVnLndhcm5pbmcoY2hhbm5lbCArICcgc2tpcHBpbmcgY2hhbmdlcyByZXF1ZXN0Li4uJyk7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzLmdldFRpbWVzdGFtcChjaGFubmVsKS50aGVuKCh0aW1lKSA9PiB7XG4gICAgICBpZiAoIXRpbWUpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihjaGFubmVsICsgJyBjYW4gbm90IGZldGNoIGNoYW5nZXMgYXQgdGhpcyB0aW1lIScpO1xuICAgICAgICByZXR1cm4gcHJvbWlzZSB8fCBRLnJlc29sdmU8Q29sbGVjdGlvbj4odW5kZWZpbmVkKTtcbiAgICAgIH1cblxuICAgICAgLy8gaW5pdGlhdGUgYSBuZXcgcmVxdWVzdCBmb3IgY2hhbmdlc1xuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKGNoYW5uZWwgKyAnIGluaXRpYXRpbmcgY2hhbmdlcyByZXF1ZXN0Li4uJyk7XG4gICAgICBsZXQgY2hhbmdlczogQ29sbGVjdGlvbiA9IG5ldyAoPGFueT50aGlzLm1lc3NhZ2VzKS5jb25zdHJ1Y3RvcigpO1xuICAgICAgcHJvbWlzZSA9IHRoaXMuY2hlY2tTZXJ2ZXIoZW5kcG9pbnQudXJsUm9vdCArICdjaGFuZ2VzLycgKyB0aW1lKS50aGVuKCh1cmwpID0+IHtcbiAgICAgICAgcmV0dXJuIFEoY2hhbmdlcy5mZXRjaCg8QmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucz57XG4gICAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgICAgc3RvcmU6IHt9LCAvLyByZWFsbHkgZ28gdG8gcmVtb3RlIHNlcnZlclxuXG4gICAgICAgICAgc3VjY2VzczogKG1vZGVsLCByZXNwb25zZSwgb3B0aW9ucykgPT4ge1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlIHx8IG9wdGlvbnMueGhyO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmIChjaGFuZ2VzLm1vZGVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByZXR1cm4gUS5hbGwoY2hhbmdlcy5tYXAoKGNoYW5nZSkgPT4ge1xuICAgICAgICAgICAgICBsZXQgbXNnOiBMaXZlRGF0YU1lc3NhZ2UgPSBjaGFuZ2UuYXR0cmlidXRlcztcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMub25NZXNzYWdlKGVuZHBvaW50LCB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtc2cpKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gZm9sbG93aW5nIHNob3VsZCB1c2Ugc2VydmVyIHRpbWUhXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXRUaW1lc3RhbXAoY2hhbm5lbCwgbm93KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLnRoZW5SZXNvbHZlKGNoYW5nZXMpO1xuICAgICAgfSk7XG4gICAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdDaGFuZ2VzID0gcHJvbWlzZTtcbiAgICAgIGVuZHBvaW50LnRpbWVzdGFtcEZldGNoaW5nQ2hhbmdlcyA9IG5vdztcbiAgICAgIHJldHVybiBwcm9taXNlO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBmZXRjaFNlcnZlckluZm8oZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCk6IFEuUHJvbWlzZTxNb2RlbD4ge1xuICAgIHZhciBub3cgPSBEYXRlLm5vdygpO1xuICAgIHZhciBwcm9taXNlID0gZW5kcG9pbnQucHJvbWlzZUZldGNoaW5nU2VydmVySW5mbztcbiAgICBpZiAocHJvbWlzZSkge1xuICAgICAgaWYgKHByb21pc2UuaXNQZW5kaW5nKCkgfHwgbm93IC0gZW5kcG9pbnQudGltZXN0YW1wRmV0Y2hpbmdTZXJ2ZXJJbmZvIDwgMTAwMCkge1xuICAgICAgICAvLyByZXVzZSBleGlzdGluZyBldmVudHVhbGx5IGNvbXBsZXRlZCByZXF1ZXN0IGZvciBjaGFuZ2VzXG4gICAgICAgIGRpYWcuZGVidWcud2FybmluZyhlbmRwb2ludC5jaGFubmVsICsgJyBza2lwcGluZyBpbmZvIHJlcXVlc3QuLi4nKTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIGluZm8gPSBuZXcgTW9kZWwoKTtcbiAgICB2YXIgdXJsID0gZW5kcG9pbnQudXJsUm9vdDtcbiAgICBpZiAodXJsLmNoYXJBdCgodXJsLmxlbmd0aCAtIDEpKSAhPT0gJy8nKSB7XG4gICAgICB1cmwgKz0gJy8nO1xuICAgIH1cbiAgICBwcm9taXNlID0gdGhpcy5jaGVja1NlcnZlcih1cmwgKyAnaW5mbycpLnRoZW4oKHVybCkgPT4ge1xuICAgICAgcmV0dXJuIFEoaW5mby5mZXRjaCg8QmFja2JvbmUuTW9kZWxGZXRjaE9wdGlvbnM+KHtcbiAgICAgICAgdXJsOiB1cmwsXG4gICAgICAgIHN1Y2Nlc3M6IChtb2RlbCwgcmVzcG9uc2UsIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2UgfHwgb3B0aW9ucy54aHI7XG4gICAgICAgIH1cbiAgICAgICAgfSkpKS50aGVuKCgpID0+IHtcbiAgICAgICAgICAvL0B0b2RvIHdoeSB3ZSBzZXQgYSBzZXJ2ZXIgdGltZSBoZXJlID9cbiAgICAgICAgICByZXR1cm4gdGhpcy5nZXRUaW1lc3RhbXAoZW5kcG9pbnQuY2hhbm5lbCkudGhlbigodGltZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCF0aW1lICYmIGluZm8uZ2V0KCd0aW1lJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0VGltZXN0YW1wKGVuZHBvaW50LmNoYW5uZWwsIGluZm8uZ2V0KCd0aW1lJykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRpbWU7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICghZW5kcG9pbnQuc29ja2V0UGF0aCAmJiBpbmZvLmdldCgnc29ja2V0UGF0aCcpKSB7XG4gICAgICAgICAgICBlbmRwb2ludC5zb2NrZXRQYXRoID0gaW5mby5nZXQoJ3NvY2tldFBhdGgnKTtcbiAgICAgICAgICAgIHZhciBuYW1lID0gaW5mby5nZXQoJ2VudGl0eScpIHx8IGVuZHBvaW50LmVudGl0eTtcbiAgICAgICAgICAgIGlmICh0aGlzLnVzZVNvY2tldE5vdGlmeSkge1xuICAgICAgICAgICAgICBlbmRwb2ludC5zb2NrZXQgPSB0aGlzLmNyZWF0ZVNvY2tldChlbmRwb2ludCwgbmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBpbmZvO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBlbmRwb2ludC5wcm9taXNlRmV0Y2hpbmdTZXJ2ZXJJbmZvID0gcHJvbWlzZTtcbiAgICBlbmRwb2ludC50aW1lc3RhbXBGZXRjaGluZ1NlcnZlckluZm8gPSBub3c7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cblxuICAvKipcbiAgICogY2FsbGVkIHdoZW4gYW4gb2ZmbGluZSBjaGFuZ2Ugd2FzIHNlbnQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIuXG4gICAqXG4gICAqIDxwPlxuICAgKiBNYXkgYmUgb3ZlcndyaXR0ZW4gdG8gYWx0ZXIgY2hhbmdlIG1lc3NhZ2UgZXJyb3IgaGFuZGxpbmcgYmVoYXZpb3IuIFRoZSBkZWZhdWx0IGltcGxlbWVudGF0aW9uIHdpbGwgYXR0ZW1wdFxuICAgKiByZWxvYWRpbmcgdGhlIHNlcnZlciBkYXRhIGZvciByZXN0b3JpbmcgdGhlIGNsaWVudCBzdGF0ZSBzdWNoIHRoYXQgaXQgcmVmbGVjdHMgdGhlIHNlcnZlciBzdGF0ZS4gV2hlbiB0aGlzXG4gICAqIHN1Y2NlZWRlZCwgdGhlIG9mZmxpbmUgY2hhbmdlIGlzIGVmZmVjdGl2ZWx5IHJldmVydGVkIGFuZCB0aGUgY2hhbmdlIG1lc3NhZ2UgaXMgZHJvcHBlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogQW4gb3ZlcndyaXR0ZW4gaW1wbGVtZW50YXRpb24gbWF5IGRlY2lkZWQgd2hldGhlciB0byByZXZlcnQgZmFpbGVkIGNoYW5nZXMgYmFzZWQgb24gdGhlIGVycm9yIHJlcG9ydGVkLlxuICAgKiA8L3A+XG4gICAqIDxwPlxuICAgKiBOb3RpY2UsIHRoZSBtZXRob2QgaXMgbm90IGNhbGxlZCB3aGVuIHRoZSBvZmZsaW5lIGNoYW5nZSBmYWlsZWQgZHVlIHRvIGEgY29ubmVjdGl2aXR5IGlzc3VlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEBwYXJhbSBlcnJvciByZXBvcnRlZCBieSByZW1vdGUgc2VydmVyLlxuICAgKiBAcGFyYW0gbWVzc2FnZSBjaGFuZ2UgcmVwb3J0ZWQsIGF0dHJpYnV0ZXMgb2YgdHlwZSBMaXZlRGF0YU1lc3NhZ2UuXG4gICAqIEBwYXJhbSBvcHRpb25zIGNvbnRleHQgaW5mb3JtYXRpb24gcmVxdWlyZWQgdG8gYWNjZXNzIHRoZSBkYXRhIGxvY2FsbHkgYXMgd2VsbCBhcyByZW1vdGVseS5cbiAgICogQHJldHVybiB7YW55fSBQcm9taXNlIGluZGljYXRpbmcgc3VjY2VzcyB0byBkcm9wIHRoZSBjaGFuZ2UgbWVzc2FnZSBhbmQgcHJvY2VlZCB3aXRoIHRoZSBuZXh0IGNoYW5nZSwgb3JcbiAgICogICAgcmVqZWN0aW9uIGluZGljYXRpbmcgdGhlIGNoYW5nZSBtZXNzYWdlIGlzIGtlcHQgYW5kIHJldHJpZWQgbGF0ZXIgb24uXG4gICAqL1xuICBwcm90ZWN0ZWQgcHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yOiBFcnJvciwgbWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwsIG9wdGlvbnM6IHtcbiAgICBlbnRpdHk6IHN0cmluZyxcbiAgICBtb2RlbFR5cGU6IE1vZGVsQ3RvcixcbiAgICB1cmxSb290OiBzdHJpbmcsXG4gICAgbG9jYWxTdG9yZTogU3RvcmUsXG4gICAgc2lsZW50PzogYm9vbGVhblxuICB9KTogUHJvbWlzZUxpa2U8dm9pZCB8IGFueT4ge1xuICAgIGlmICghZXJyb3IpIHtcbiAgICAgIC8vIG1lc3NhZ2Ugd2FzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHlcbiAgICAgIGlmICghdGhpcy51c2VTb2NrZXROb3RpZnkpIHtcbiAgICAgICAgLy8gd2hlbiBub3QgdXNpbmcgc29ja2V0cywgZmV0Y2ggY2hhbmdlcyBub3dcbiAgICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbb3B0aW9ucy5lbnRpdHldO1xuICAgICAgICBpZiAoZW5kcG9pbnQpIHtcbiAgICAgICAgICAvLyB3aWxsIHB1bGwgdGhlIGNoYW5nZSBjYXVzZWQgYnkgdGhlIG9mZmxpbmUgbWVzc2FnZSBhbmQgdXBkYXRlIHRoZSBtZXNzYWdlIHRpbWUsXG4gICAgICAgICAgLy8gc28gdGhhdCB3ZSBhdm9pZCB0aGUgc2l0dWF0aW9uIHdoZXJlIHRoZSBjaGFuZ2UgY2F1c2VkIGJ5IHJlcGxheWluZyB0aGUgb2ZmbGluZVxuICAgICAgICAgIC8vIGNoYW5nZSByZXN1bHRzIGluIGEgY29uZmxpY3QgbGF0ZXIgb24uLi5cbiAgICAgICAgICByZXR1cm4gdGhpcy5mZXRjaENoYW5nZXMoZW5kcG9pbnQsIHRydWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gUS5yZXNvbHZlKG1lc3NhZ2UpO1xuICAgIH1cblxuICAgIC8vIGZhaWxlZCwgZXZlbnR1YWxseSB1bmRvIHRoZSBtb2RpZmljYXRpb25zIHN0b3JlZFxuICAgIGlmICghb3B0aW9ucy5sb2NhbFN0b3JlKSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QoZXJyb3IpO1xuICAgIH1cblxuICAgIC8vIHJldmVydCBtb2RpZmljYXRpb24gYnkgcmVsb2FkaW5nIGRhdGFcbiAgICBsZXQgbW9kZWxUeXBlID0gb3B0aW9ucy5tb2RlbFR5cGUgfHwgTW9kZWw7XG4gICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtZXNzYWdlLmdldCgnZGF0YScpLCB7XG4gICAgICBlbnRpdHk6IG9wdGlvbnMuZW50aXR5XG4gICAgfSk7XG4gICAgbW9kZWwuaWQgPSBtZXNzYWdlLmdldCgnbWV0aG9kJykgIT09ICdjcmVhdGUnICYmIG1lc3NhZ2UuZ2V0KCdpZCcpO1xuICAgIGxldCB0cmlnZ2VyRXJyb3IgPSAoKSA9PiB7XG4gICAgICAvLyBpbmZvcm0gY2xpZW50IGFwcGxpY2F0aW9uIG9mIHRoZSBvZmZsaW5lIGNoYW5nZXMgZXJyb3JcbiAgICAgIGxldCBjaGFubmVsID0gbWVzc2FnZS5nZXQoJ2NoYW5uZWwnKTtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQ6IHRyaWdnZXJpbmcgZXJyb3IgZm9yIGNoYW5uZWwgJyArIGNoYW5uZWwgKyAnIG9uIHN0b3JlJywgZXJyb3IpO1xuICAgICAgaWYgKCFvcHRpb25zLnNpbGVudCkge1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yOicgKyBjaGFubmVsLCBlcnJvciwgbW9kZWwpO1xuICAgICAgfVxuICAgIH07XG4gICAgbGV0IGxvY2FsT3B0aW9ucyA9IHtcbiAgICAgIC8vIGp1c3QgYWZmZWN0IGxvY2FsIHN0b3JlXG4gICAgICBzdG9yZTogb3B0aW9ucy5sb2NhbFN0b3JlXG4gICAgfTtcbiAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgdXJsUm9vdDogb3B0aW9ucy51cmxSb290LFxuICAgICAgc3RvcmU6IHt9IC8vIHJlYWxseSBnbyB0byByZW1vdGUgc2VydmVyXG4gICAgfTtcbiAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgIHJlbW90ZU9wdGlvbnMudXJsID0gcmVtb3RlT3B0aW9ucy51cmxSb290ICsgKHJlbW90ZU9wdGlvbnMudXJsUm9vdC5jaGFyQXQocmVtb3RlT3B0aW9ucy51cmxSb290Lmxlbmd0aCAtIDEpID09PSAnLycgPyAnJyA6ICcvJyApICsgbW9kZWwuaWQ7XG4gICAgICAvLyBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBtb2RlbC51cmwoKSA9PT0gcmVtb3RlT3B0aW9ucy51cmwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjcmVhdGlvbiBmYWlsZWQsIGp1c3QgZGVsZXRlIGxvY2FsbHlcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSA9PT0gJ2NyZWF0ZScpO1xuICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfVxuICAgIHJldHVybiAoPFEuUHJvbWlzZTxhbnk+Pjxhbnk+bW9kZWwuZmV0Y2gocmVtb3RlT3B0aW9ucykpLnRoZW4oKGRhdGEpID0+IHtcbiAgICAgIC8vIG9yaWdpbmFsIHJlcXVlc3QgZmFpbGVkIGFuZCB0aGUgY29kZSBhYm92ZSByZWxvYWRlZCB0aGUgZGF0YSB0byByZXZlcnQgdGhlIGxvY2FsIG1vZGlmaWNhdGlvbnMsIHdoaWNoIHN1Y2NlZWRlZC4uLlxuICAgICAgcmV0dXJuIG1vZGVsLnNhdmUoZGF0YSwgbG9jYWxPcHRpb25zKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgfSwgKGZldGNoUmVzcDogd2ViLkh0dHBFcnJvcikgPT4ge1xuICAgICAgLy8gb3JpZ2luYWwgcmVxdWVzdCBmYWlsZWQgYW5kIHRoZSBjb2RlIGFib3ZlIHRyaWVkIHRvIHJldmVydCB0aGUgbG9jYWwgbW9kaWZpY2F0aW9ucyBieSByZWxvYWRpbmcgdGhlIGRhdGEsIHdoaWNoIGZhaWxlZCBhcyB3ZWxsLi4uXG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gZmV0Y2hSZXNwICYmIGZldGNoUmVzcC5zdGF0dXNDb2RlO1xuICAgICAgc3dpdGNoIChzdGF0dXNDb2RlKSB7XG4gICAgICAgIGNhc2UgNDA0OiAvLyBOT1QgRk9VTkRcbiAgICAgICAgY2FzZSA0MDE6IC8vIFVOQVVUSE9SSVpFRFxuICAgICAgICBjYXNlIDQxMDogLy8gR09ORSpcbiAgICAgICAgICAvLyAuLi5iZWNhdXNlIHRoZSBpdGVtIGlzIGdvbmUgYnkgbm93LCBtYXliZSBzb21lb25lIGVsc2UgY2hhbmdlZCBpdCB0byBiZSBkZWxldGVkXG4gICAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3kobG9jYWxPcHRpb25zKTsgLy8gc2lsZW50IHJlZ2FyZGluZyB0cmlnZ2VyRXJyb3JcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3QoZmV0Y2hSZXNwKS5maW5hbGx5KHRyaWdnZXJFcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogZmVlZHMgcGVuZGluZyBvZmZsaW5lICNtZXNzYWdlcyB0byB0aGUgcmVtb3RlIHNlcnZlci5cbiAgICpcbiAgICogPHA+XG4gICAqIER1ZSB0byBjbGllbnQgY29kZSBzZXR0aW5nIHVwIG1vZGVscyBvbmUgYXQgYSB0aW1lLCB0aGlzIG1ldGhvZCBpcyBjYWxsZWQgbXVsdGlwbGUgdGltZXMgZHVyaW5nIGluaXRpYWwgc2V0dXAgb2ZcbiAgICogI2VuZHBvaW50cy4gVGhlIGZpcnN0IGNhbGwgZmV0Y2hlcyBwZW5kaW5nIG9mZmxpbmUgI21lc3NhZ2VzLCBvcmRlcmVkIGJ5IHByaW9yaXR5IGFuZCB0aW1lLiBUaGVuIHRoZSAjbWVzc2FnZXNcbiAgICogYXJlIHNlbmQgdG8gdGhlIHJlbW90ZSBzZXJ2ZXIgdW50aWwgZGVwbGV0ZWQsIGFuIGVycm9yIG9jY3Vycywgb3Igc29tZSBtaXNzaW5nIGVuZHBvaW50IGlzIGVuY291bnRlZC5cbiAgICogPC9wPlxuICAgKiA8cD5cbiAgICogVGhlIG1ldGhvZCBpcyB0cmlnZ2VyZWQgZWFjaCB0aW1lIGFuIGVuZHBvaW50IGlzIHJlZ2lzdGVyZWQsIG9yIHN0YXRlIGNoYW5nZXMgdG8gb25saW5lIGZvciBhbnkgZW5kcG9pbnQuIFdoZW5cbiAgICogc3RhdGUgY2hhbmdlcyBmcm9tIG9mZmxpbmUgdG8gb25saW5lIChkaXNyZWdhcmRpbmcgZW5kcG9pbnQpIG1lc3NhZ2Ugc3VibWlzc2lvbiBpcyByZXN0YXJ0ZWQgYnkgcmVzZXR0aW5nIHRoZVxuICAgKiAjbWVzc2FnZXNQcm9taXNlLiBPdGhlcndpc2UsIHN1YnNlcXVlbnQgY2FsbHMgY2hhaW4gdG8gdGhlIGVuZCBvZiAjbWVzc2FnZXNQcm9taXNlLlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IG9mICNtZXNzYWdlcyBDb2xsZWN0aW9uLCBvciBsYXN0IHJlY2VudCBvZmZsaW5lIHJlamVjdGlvblxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgcHJpdmF0ZSBfc2VuZE1lc3NhZ2VzKCk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XG4gICAgLy8gbm90IHJlYWR5IHlldFxuICAgIGlmICghdGhpcy5tZXNzYWdlcykge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTxDb2xsZWN0aW9uPih1bmRlZmluZWQpO1xuICAgIH1cblxuICAgIC8vIHByb2Nlc3NlcyBtZXNzYWdlcyB1bnRpbCBub25lIGxlZnQsIGhpdHRpbmcgYSBtZXNzYWdlIG9mIGEgbm90IHlldCByZWdpc3RlcmVkIGVuZHBvaW50LCBvciBlbnRlcmluZ1xuICAgIC8vIGEgbm9uLXJlY292ZXJhYmxlIGVycm9yLiBUaGUgcHJvbWlzZSByZXR1cm5lZCByZXNvbHZlcyB0byB0aGlzLm1lc3NhZ2VzIHdoZW4gZG9uZS5cbiAgICBsZXQgbmV4dE1lc3NhZ2UgPSAoKTogYW55ID0+IHtcbiAgICAgIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG5cbiAgICAgIGxldCBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IHRoaXMubWVzc2FnZXMubW9kZWxzWzBdO1xuICAgICAgbGV0IGVudGl0eSA9IG1lc3NhZ2UuaWQuc3Vic3RyKDAsIG1lc3NhZ2UuaWQuaW5kZXhPZignficpKTtcbiAgICAgIGlmICghZW50aXR5KSB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ3NlbmRNZXNzYWdlICcgKyBtZXNzYWdlLmlkICsgJyB3aXRoIG5vIGVudGl0eSEnKTtcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2UuZGVzdHJveSgpLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgICAgfVxuICAgICAgbGV0IGVuZHBvaW50ID0gdGhpcy5lbmRwb2ludHNbZW50aXR5XTtcbiAgICAgIGlmICghZW5kcG9pbnQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMubWVzc2FnZXM7XG4gICAgICB9XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBlbmRwb2ludC5jaGFubmVsID09PSBtZXNzYWdlLmdldCgnY2hhbm5lbCcpLCAnY2hhbm5lbCBvZiBlbmRwb2ludCAnICsgZW5kcG9pbnQuY2hhbm5lbCArICcgZG9lcyBub3QgbWF0Y2ggY2hhbm5lbCBvZiBtZXNzYWdlICcgKyBtZXNzYWdlLmdldCgnY2hhbm5lbCcpKTtcbiAgICAgIGxldCBtc2cgPSB0aGlzLl9maXhNZXNzYWdlKGVuZHBvaW50LCBtZXNzYWdlLmF0dHJpYnV0ZXMpO1xuXG4gICAgICBsZXQgbW9kZWxUeXBlID0gZW5kcG9pbnQubW9kZWxUeXBlIHx8IE1vZGVsO1xuICAgICAgbGV0IG1vZGVsID0gbmV3IG1vZGVsVHlwZShtc2cuZGF0YSwge1xuICAgICAgICBlbnRpdHk6IGVuZHBvaW50LmVudGl0eVxuICAgICAgfSk7XG4gICAgICBtb2RlbC5pZCA9IG1lc3NhZ2UuZ2V0KCdtZXRob2QnKSAhPT0gJ2NyZWF0ZScgJiYgbWVzc2FnZS5nZXQoJ2lkJyk7XG4gICAgICBsZXQgcmVtb3RlT3B0aW9uczogYW55ID0ge1xuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBzdG9yZToge30gLy8gcmVhbGx5IGdvIHRvIHJlbW90ZSBzZXJ2ZXJcbiAgICAgIH07XG4gICAgICBpZiAobW9kZWwuaWQpIHtcbiAgICAgICAgcmVtb3RlT3B0aW9ucy51cmwgPSByZW1vdGVPcHRpb25zLnVybFJvb3QgKyAocmVtb3RlT3B0aW9ucy51cmxSb290LmNoYXJBdChyZW1vdGVPcHRpb25zLnVybFJvb3QubGVuZ3RoIC0gMSkgPT09ICcvJyA/ICcnIDogJy8nICkgKyBtb2RlbC5pZDtcbiAgICAgICAgLy8gZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gbW9kZWwudXJsKCkgPT09IHJlbW90ZU9wdGlvbnMudXJsKTtcbiAgICAgIH1cbiAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VuZE1lc3NhZ2UgJyArIG1vZGVsLmlkKTtcbiAgICAgIGxldCBvZmZsaW5lT3B0aW9ucyA9IHtcbiAgICAgICAgZW50aXR5OiBlbmRwb2ludC5lbnRpdHksXG4gICAgICAgIG1vZGVsVHlwZTogZW5kcG9pbnQubW9kZWxUeXBlLFxuICAgICAgICB1cmxSb290OiBlbmRwb2ludC51cmxSb290LFxuICAgICAgICBsb2NhbFN0b3JlOiBlbmRwb2ludC5sb2NhbFN0b3JlXG4gICAgICB9O1xuICAgICAgcmV0dXJuIHRoaXMuX2FwcGx5UmVzcG9uc2UodGhpcy5fYWpheE1lc3NhZ2UoZW5kcG9pbnQsIG1zZywgcmVtb3RlT3B0aW9ucywgbW9kZWwpLCBlbmRwb2ludCwgbXNnLCByZW1vdGVPcHRpb25zLCBtb2RlbCkudGhlbigoKSA9PiB7XG4gICAgICAgIC8vIHN1Y2NlZWRlZFxuICAgICAgICByZXR1cm4gdGhpcy5wcm9jZXNzT2ZmbGluZU1lc3NhZ2VSZXN1bHQobnVsbCwgbWVzc2FnZSwgb2ZmbGluZU9wdGlvbnMpO1xuICAgICAgfSwgKGVycm9yOiB3ZWIuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIGlmIChlcnJvci5zdGF0dXNDb2RlKSB7XG4gICAgICAgICAgLy8gcmVtb3RlIGZhaWxlZFxuICAgICAgICAgIHJldHVybiBRKHRoaXMucHJvY2Vzc09mZmxpbmVNZXNzYWdlUmVzdWx0KGVycm9yLCBtZXNzYWdlLCBvZmZsaW5lT3B0aW9ucykpLmNhdGNoKChlcnJvcjIpID0+IHtcbiAgICAgICAgICAgIC8vIGV4cGxpY2l0bHkgZGlzY29ubmVjdCBkdWUgdG8gZXJyb3IgaW4gZW5kcG9pbnRcbiAgICAgICAgICAgIHRoaXMuZGlzY29ubmVjdGVkRW50aXR5ID0gZW5kcG9pbnQuZW50aXR5O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMub25EaXNjb25uZWN0KGVuZHBvaW50KS50aGVuUmVqZWN0KGVycm9yMik7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gY29ubmVjdGl2aXR5IGlzc3VlLCBrZWVwIHJlamVjdGlvblxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAvLyBhcHBseWluZyBjaGFuZ2Ugc3VjY2VlZGVkIG9yIHN1Y2Nlc3NmdWxseSByZWNvdmVyZWQgY2hhbmdlXG4gICAgICAgIHJldHVybiBtZXNzYWdlLmRlc3Ryb3koKTtcbiAgICAgIH0pLnRoZW4obmV4dE1lc3NhZ2UpO1xuICAgIH07XG5cbiAgICBkaWFnLmRlYnVnLmluZm8oJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZS5fc2VuZE1lc3NhZ2VzJyk7XG4gICAgbGV0IHEgPSB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICBpZiAoIXEpIHtcbiAgICAgIC8vIGluaXRpYWxseSBmZXRjaCBhbGwgbWVzc2FnZXNcbiAgICAgIHEgPSBRKHRoaXMubWVzc2FnZXMuZmV0Y2goPEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnM+e1xuICAgICAgICBzb3J0T3JkZXI6IFtcbiAgICAgICAgICAnK3ByaW9yaXR5JyxcbiAgICAgICAgICAnK3RpbWUnLFxuICAgICAgICAgICcraWQnXG4gICAgICAgIF1cbiAgICAgIH0pKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMubWVzc2FnZXNQcm9taXNlLmlzUmVqZWN0ZWQoKSkge1xuICAgICAgLy8gZWFybHkgcmVqZWN0aW9uXG4gICAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gICAgfSBlbHNlIGlmICghdGhpcy5tZXNzYWdlcy5sZW5ndGgpIHtcbiAgICAgIC8vIG5vIG1vcmUgbWVzc2FnZXNcbiAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VzUHJvbWlzZTtcbiAgICB9XG5cbiAgICAvLyBraWNrIHRvIHByb2Nlc3MgcGVuZGluZyBtZXNzYWdlc1xuICAgIHRoaXMubWVzc2FnZXNQcm9taXNlID0gcS50aGVuKG5leHRNZXNzYWdlKTtcbiAgICByZXR1cm4gdGhpcy5tZXNzYWdlc1Byb21pc2U7XG4gIH1cblxuICBwcml2YXRlIHN0b3JlTWVzc2FnZShlbmRwb2ludDogU3luY0VuZHBvaW50LCBxTXNnOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlPik6IFEuUHJvbWlzZTxMaXZlRGF0YU1lc3NhZ2VNb2RlbD4ge1xuICAgIHJldHVybiBxTXNnLnRoZW4oKG1zZzogTGl2ZURhdGFNZXNzYWdlKSA9PiB7XG4gICAgICBsZXQgb3B0aW9uczogQmFja2JvbmUuTW9kZWxTYXZlT3B0aW9ucztcbiAgICAgIGxldCBpZCA9IHRoaXMubWVzc2FnZXMubW9kZWxJZChtc2cpO1xuICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzdG9yZU1lc3NhZ2UgJyArIGlkKTtcbiAgICAgIHZhciBtZXNzYWdlOiBMaXZlRGF0YU1lc3NhZ2VNb2RlbCA9IGlkICYmIDxMaXZlRGF0YU1lc3NhZ2VNb2RlbD50aGlzLm1lc3NhZ2VzLmdldChpZCk7XG4gICAgICBpZiAobWVzc2FnZSkge1xuICAgICAgICAvLyB1c2UgZXhpc3RpbmcgaW5zdGFuY2UsIHNob3VsZCBub3QgYmUgdGhlIGNhc2UgdXN1YWxseVxuICAgICAgICBvcHRpb25zID0gPEJhY2tib25lLk1vZGVsU2F2ZU9wdGlvbnM+e1xuICAgICAgICAgIG1lcmdlOiB0cnVlXG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBpbnN0YW50aWF0ZSBuZXcgbW9kZWwsIGludGVudGlvbmFsbHkgbm90IGFkZGVkIHRvIGNvbGxlY3Rpb25cbiAgICAgICAgbWVzc2FnZSA9IG5ldyB0aGlzLm1lc3NhZ2VzLm1vZGVsKG1zZywge1xuICAgICAgICAgIGNvbGxlY3Rpb246IHRoaXMubWVzc2FnZXMsXG4gICAgICAgICAgc3RvcmU6IHRoaXMubWVzc2FnZXMuc3RvcmVcbiAgICAgICAgfSk7XG4gICAgICAgIG1lc3NhZ2Uuc2V0KCdjaGFubmVsJywgZW5kcG9pbnQuY2hhbm5lbCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gUShtZXNzYWdlLnNhdmUobXNnLCBvcHRpb25zKSkudGhlblJlc29sdmUobWVzc2FnZSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHJlbW92ZU1lc3NhZ2UoZW5kcG9pbnQ6IFN5bmNFbmRwb2ludCwgbXNnOiBMaXZlRGF0YU1lc3NhZ2UsIHFNZXNzYWdlOiBRLlByb21pc2U8TGl2ZURhdGFNZXNzYWdlTW9kZWw+KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gcU1lc3NhZ2UudGhlbigobWVzc2FnZTogTGl2ZURhdGFNZXNzYWdlTW9kZWwpID0+IHtcbiAgICAgIGlmICghbWVzc2FnZSkge1xuICAgICAgICBsZXQgaWQgPSB0aGlzLm1lc3NhZ2VzLm1vZGVsSWQobXNnKTtcbiAgICAgICAgaWYgKCFpZCkge1xuICAgICAgICAgIC8vIG1zZyBpcyBub3QgcGVyc2lzdGVudFxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUodW5kZWZpbmVkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIG1lc3NhZ2UgPSA8TGl2ZURhdGFNZXNzYWdlTW9kZWw+dGhpcy5tZXNzYWdlcy5nZXQoaWQpO1xuICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcbiAgICAgICAgICBtZXNzYWdlID0gbmV3IHRoaXMubWVzc2FnZXMubW9kZWwoe1xuICAgICAgICAgICAgX2lkOiBtc2cuX2lkXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgY29sbGVjdGlvbjogdGhpcy5tZXNzYWdlcyxcbiAgICAgICAgICAgIHN0b3JlOiB0aGlzLm1lc3NhZ2VzLnN0b3JlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgZGlhZy5kZWJ1Zy50cmFjZSgncmVtb3ZlTWVzc2FnZSAnICsgbWVzc2FnZS5pZCk7XG4gICAgICByZXR1cm4gbWVzc2FnZS5kZXN0cm95KCk7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgY2xlYXIoY29sbGVjdGlvbjogQ29sbGVjdGlvbik6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBpZiAoY29sbGVjdGlvbikge1xuICAgICAgdmFyIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQgPSB0aGlzLmdldEVuZHBvaW50KGNvbGxlY3Rpb24pO1xuICAgICAgaWYgKGVuZHBvaW50KSB7XG4gICAgICAgIGlmICh0aGlzLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgdGhpcy5tZXNzYWdlcy5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgICAgY29sbGVjdGlvbi5yZXNldCgpO1xuICAgICAgICByZXR1cm4gdGhpcy5zZXRUaW1lc3RhbXAoZW5kcG9pbnQuY2hhbm5lbCwgJycpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZSB0aGUgc29ja2V0IGV4cGxpY2l0XG4gICAqL1xuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgaWYgKHRoaXMubWVzc2FnZXMuc3RvcmUpIHtcbiAgICAgIHRoaXMubWVzc2FnZXMuc3RvcmUuY2xvc2UoKTtcbiAgICAgIHRoaXMubWVzc2FnZXMgPSBudWxsO1xuICAgIH1cblxuICAgIGlmICh0aGlzLnRpbWVzdGFtcHMgJiYgdGhpcy50aW1lc3RhbXBzLnN0b3JlKSB7XG4gICAgICB0aGlzLnRpbWVzdGFtcHMuc3RvcmUuY2xvc2UoKTtcbiAgICAgIHRoaXMudGltZXN0YW1wcyA9IG51bGw7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzLmVuZHBvaW50cyk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGwgPSBrZXlzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgdGhpcy5lbmRwb2ludHNba2V5c1tpXV0uY2xvc2UoKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gbWl4aW5zXG5sZXQgc3luY1N0b3JlID0gXy5leHRlbmQoU3luY1N0b3JlLnByb3RvdHlwZSwge1xuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLlN5bmNTdG9yZScsXG5cbiAgbG9jYWxTdG9yZTogV2ViU3FsU3RvcmUsXG4gIHVzZUxvY2FsU3RvcmU6IHRydWUsXG4gIHVzZVNvY2tldE5vdGlmeTogdHJ1ZSxcbiAgdXNlT2ZmbGluZUNoYW5nZXM6IHRydWUsXG4gIHNvY2tldFBhdGg6ICcnXG59KTtcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFN5bmNTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKHN5bmNTdG9yZSkpKTtcbiJdfQ==