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

import * as Backbone from 'backbone';
import * as Q from 'q';
import * as _ from 'lodash';

import * as diag from '../core/diag';
import * as objectid from '../core/objectid';
import * as security from '../security';
import * as web from '../web';

import {localStorage} from '../web/offline';
import {GetQuery} from '../query/GetQuery';
import {Store, StoreCtor} from './Store';
import {WebSqlStore} from './WebSqlStore';
import {SyncContext} from './SyncContext';
import {SyncEndpoint} from './SyncEndpoint';
import {LiveDataMessage, LiveDataMessageModel} from './LiveDataMessage';
import {LiveDataTimestamp, LiveDataTimestampModel} from './LiveDataTimestamp';
import {Model, ModelCtor, isModel} from './Model';
import {Collection, isCollection} from './Collection';

/**
 * io of browser via script tag or via require socket.io-client, entirely optional.
 *
 * Notice, this module is entirely optional as the store may operate without it if socket
 * notifications are not used.
 *
 * @internal Not public API, exported for testing purposes only!
 */
export const io: SocketIOClientStatic = global['io'] || // native implementation
  typeof require === 'function' &&                      // or when require is available
  ((function requireSocketIo() {                        // required version
    // here we are in an immediately invoked function requiring socket.io-client, if available
    try {
      return (global['io'] = require('socket.io-client'));
    } catch (error) {
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
export class SyncStore extends Store {

  // following are store-specific options, defaults stored in prototype at end of this file
  protected localStore: StoreCtor;
  protected localStoreOptions: any;
  protected useLocalStore: boolean;
  protected useSocketNotify: boolean;
  protected useOfflineChanges: boolean;
  protected socketPath: string;
  protected socketQuery: string;
  protected credentials: any;
  protected orderOfflineChanges: string[];

  /**
   * server associated with this store.
   *
   * The sync method will fail early when being applied to data of some other server.
   */
  protected serverUrl: string;
  /**
   * application part used to resolve URLs may optionally be set using constructor options.
   */
  protected application: string;
  /**
   * identity or user associated with this store.
   *
   * The ajax method will simulate an offline timeout when the user identity is changed. This is
   * because just one session can be maintained per server and login/logout semantics must be well
   * behaved.
   */
  protected userUuid: string;

  public endpoints: {
    // map of entity to SyncEndpoint
    [entity: string]: SyncEndpoint;
  } = {};

  private lastMesgTime: any; // deprecated: kept for migration and as a failsafe
  private timestamps: Collection;
  private timestampsPromise: Q.Promise<Collection>;

  /**
   * when set, indicates which entity caused a disconnection.
   *
   * <p>
   * This is set to an entity name to limit which entity may cause a change to online state again.
   * </p>
   *
   * @type {string}
   */
  private disconnectedEntity: string = 'all';

  public messages: Collection;
  public messagesPromise: Q.Promise<Collection>;

  constructor(options?: any) {
    super(options);
    if (this.credentials) {
      this.credentials = _.clone(this.credentials);
    }
    if (this.localStoreOptions) {
      this.localStoreOptions = _.clone(this.localStoreOptions);
    }
    if (this.orderOfflineChanges) {
      this.orderOfflineChanges = _.clone(this.orderOfflineChanges);
    }

    if (this.useSocketNotify && typeof io !== 'object') {
      diag.debug.warning('Socket.IO not present !!');
      this.useSocketNotify = false;
    }
  }

  /**
   * overwritten to resolve relative URLs against the SyncStore#serverUrl.
   */
  protected resolveUrl(url: string) {
    return web.resolveUrl(url, {
      serverUrl: this.serverUrl,
      application: this.application
    });
  }

  /**
   * binds the store to a target server when the first endpoint is created.
   *
   * @param urlRoot used to resolve the server to operate.
     */
  private initServer(urlRoot: string) {
    let serverUrl = web.resolveServer(urlRoot, {
      serverUrl: this.serverUrl
    });
    if (!this.serverUrl) {
      const server = security.Server.getInstance(serverUrl);
      this.serverUrl = serverUrl;
      this.userUuid = server.authorization.name;
      if (this.localStoreOptions && !this.localStoreOptions.credentials) {
        // capture credentials for use by crypto stores
        this.localStoreOptions.credentials = _.defaults({
          userUuid: this.userUuid
        }, server.credentials);
      }
    } else if (serverUrl !== this.serverUrl) {
      throw new Error('store is bound to server ' + this.serverUrl + ' already');
    }
  }

  private checkServer(url: string, options?: any): Q.Promise<string> {
    diag.debug.assert(() => web.resolveServer(url, {
      serverUrl: this.serverUrl
    }) === this.serverUrl);
    if (security.Server.getInstance(this.serverUrl).authorization.name !== this.userUuid) {
      diag.debug.warn('user identity was changed, working offline until authorization is restored');
      const error: web.HttpError = new Error();
      // invoke error callback, if any
      return options && this.handleError(options, error) || Q.reject<string>(error);
    }
    return Q.resolve(url);
  }

  protected initEndpoint(modelOrCollection: Model | Collection, modelType: ModelCtor): SyncEndpoint {
    let urlRoot = modelOrCollection.getUrlRoot();
    let entity = modelOrCollection.entity;
    if (urlRoot && entity) {
      // get or create endpoint for this url
      this.initServer(urlRoot);
      urlRoot = this.resolveUrl(urlRoot);
      let endpoint = this.endpoints[entity];
      if (!endpoint) {
        diag.debug.info('Relution.livedata.SyncStore.initEndpoint: ' + entity);
        endpoint = new SyncEndpoint({
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
        this.createTimestampCollection();
        endpoint.socket = this.createSocket(endpoint, entity);
        endpoint.info = this.fetchServerInfo(endpoint);
      } else {
        // configuration can not change, must recreate store instead...
        diag.debug.assert(() => endpoint.urlRoot === urlRoot, 'can not change urlRoot, must recreate store instead!');
        diag.debug.assert(() => endpoint.userUuid === this.userUuid, 'can not change user identity, must recreate store instead!');
      }
      return endpoint;
    }
  }

  /**
   * @inheritdoc
   *
   * @internal API only to be called by Model constructor.
   */
  initModel(model: Model): void {
    model.endpoint = this.initEndpoint(model, <ModelCtor>model.constructor);
  }

  /**
   * @inheritdoc
   *
   * @internal API only to be called by Collection constructor.
   */
  initCollection(collection: Collection): void {
    collection.endpoint = this.initEndpoint(collection, collection.model);
  }

  getEndpoint(modelOrCollection: Model | Collection): SyncEndpoint {
    let endpoint = this.endpoints[modelOrCollection.entity];
    if (endpoint) {
      diag.debug.assert(() => {
        // checks that modelOrCollection uses a model inheriting from the one of the endpoint
        let modelType = isCollection(modelOrCollection) ? modelOrCollection.model : modelOrCollection.constructor;
        return modelType === endpoint.modelType || modelType.prototype instanceof endpoint.modelType;
      }, 'wrong type of model!');
      return endpoint;
    }
  }

  createLocalStore(endpoint: SyncEndpoint): Store {
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
  }

  /**
   * @description Here we save the changes in a Message local websql
   * @returns {*}
   */
  createMsgCollection(): Collection {
    if (this.useOfflineChanges && !this.messages) {
      this.messages = new Collection(undefined, {
        model: LiveDataMessageModel,
        store: new this.localStore(this.localStoreOptions)
      });
    }
    return this.messages;
  }

  createTimestampCollection(): Collection {
    if (this.useLocalStore && !this.timestamps) {
      this.timestamps = new Collection(undefined, {
        model: LiveDataTimestampModel,
        store: new this.localStore(this.localStoreOptions)
      });
    }
    return this.timestamps;
  }

  createSocket(endpoint: SyncEndpoint, name: string) {
    if (this.useSocketNotify && endpoint && endpoint.socketPath) {
      diag.debug.trace('Relution.livedata.SyncStore.createSocket: ' + name);

      // resource
      let connectVo: any = {
        'force new connection': true
      };
      let resource = endpoint.socketPath; // remove leading /
      connectVo.resource = (resource && resource.indexOf('/') === 0) ? resource.substr(1) : resource;
      if (this.socketQuery) {
        connectVo.query = this.socketQuery;
      }

      // socket
      endpoint.socket = io.connect(endpoint.host, connectVo);
      endpoint.socket.on('connect', () => {
        (this._bindChannel(endpoint, name) || Q.resolve(endpoint)).then((ep) => {
          diag.debug.assert(() => ep === endpoint);
          return this.onConnect(ep);
        }).done();
      });
      endpoint.socket.on('disconnect', () => {
        diag.debug.info('socket.io: disconnect');
        return this.onDisconnect(endpoint).done();
      });
      endpoint.socket.on(endpoint.channel, (msg: LiveDataMessage) => {
        return this.onMessage(endpoint, this._fixMessage(endpoint, msg));
      });
      return endpoint.socket;
    }
  }

  _bindChannel(endpoint: SyncEndpoint, name?: string) {
    if (endpoint && endpoint.socket) {
      diag.debug.trace('Relution.livedata.SyncStore._bindChannel: ' + name);

      var channel = endpoint.channel;
      var socket = endpoint.socket;
      name = name || endpoint.entity;
      return this.getTimestamp(channel).then((time) => {
        socket.emit('bind', {
          entity: name,
          channel: channel,
          time: time
        });
        return Q.resolve(endpoint);
      });
    }
  }

  private keyLastMessage(channel: string): string {
    return '__' + channel + 'lastMesgTime';
  }

  // deprecated: use getTimestamp instead!
  private getLastMessageTime(channel: string): any {
    if (!this.lastMesgTime) {
      this.lastMesgTime = {};
    } else if (this.lastMesgTime[channel] !== undefined) {
      return this.lastMesgTime[channel];
    }
    // the | 0 below turns strings into numbers
    var time = localStorage().getItem(this.keyLastMessage(channel)) || 0;
    this.lastMesgTime[channel] = time;
    return time;
  }

  // deprecated: use setTimestamp instead!
  private setLastMessageTime(channel: string, time: any): any {
    if (!time) {
      localStorage().removeItem(this.keyLastMessage(channel));
    } else if(time > this.getLastMessageTime(channel)) {
      localStorage().setItem(this.keyLastMessage(channel), time);
    } else {
      return this.lastMesgTime[channel];
    }
    this.lastMesgTime[channel] = time;
    return time;
  }

  private getTimestampModel(channel: string): Q.Promise<LiveDataTimestampModel> {
    if (this.timestamps) {
      if (!this.timestampsPromise) {
        // initially fetch all messages
        this.timestampsPromise = Q(this.timestamps.fetch());
      }
      return this.timestampsPromise.then(() => {
        return this.timestamps.get(channel) || this.timestamps.add(new this.timestamps.model({
            channel: channel,
            timestamp: this.getLastMessageTime(channel)
          }, {
            store: this.timestamps.store
          }));
      });
    }
  }

  getTimestamp(channel: string): Q.Promise<any> {
    let q = this.getTimestampModel(channel);
    if (!q) {
      return Q.resolve(this.getLastMessageTime(channel));
    }

    this.timestampsPromise = q.then((model) => {
      return model.attributes.timestamp;
    }).catch((err) => {
      diag.debug.error('Relution.livedata.SyncStore.getTimestamp: ' + channel, err);
      return this.getLastMessageTime(channel);
    });
    return this.timestampsPromise;
  }

  setTimestamp(channel: string, time: any): Q.Promise<any> {
    let q = this.getTimestampModel(channel);
    if (!q) {
      return this.setLastMessageTime(channel, time);
    }

    this.timestampsPromise = q.then((model) => {
      if (!time || time > model.attributes.timestamp) {
        return model.save({
          timestamp: time
        }).thenResolve(time);
      }
      return model.attributes.timestamp;
    }).catch((err) => {
      diag.debug.error('Relution.livedata.SyncStore.setTimestamp: ' + channel, err);
      return time;
    }).finally(() => {
      return this.setLastMessageTime(channel, time);
    });
    return this.timestampsPromise;
  }

  onConnect(endpoint: SyncEndpoint): Q.Promise<void> {
    if (!endpoint.isConnected) {
      // when offline transmission is pending, need to wait for it to complete
      let q = Q.resolve(undefined);
      if (this.messagesPromise && this.messagesPromise.isPending()) {
        q = this.messagesPromise.catch((error) => Q.resolve(undefined));
      }

      // sync server/client changes
      endpoint.isConnected = q.then(() => {
        // next we'll fetch server-side changes
        return this.fetchChanges(endpoint).then(() => {
          // then send client-side changes
          if (this.disconnectedEntity === 'all' || this.disconnectedEntity === endpoint.entity) {
            // restart replaying of offline messages
            this.messagesPromise = null;
            this.disconnectedEntity = null;
          }
          return this._sendMessages();
        }).catch((error) => {
          // catch without error indicates disconnection while going online
          if (!error) {
            // disconnected while sending offline changes
            return this.onDisconnect(endpoint);
          }
          return Q.reject<void>(error);
        });
      }).finally(() => {
        // in the end, when connected still, fire an event informing client code
        if (endpoint.isConnected) {
          this.trigger('connect:' + endpoint.channel);
        }
      });
    }
    return endpoint.isConnected;
  }

  onDisconnect(endpoint: SyncEndpoint): Q.Promise<void> {
    if (!endpoint.isConnected) {
      return Q.resolve<void>(undefined);
    }
    endpoint.isConnected = null;
    if (!this.disconnectedEntity) {
      this.disconnectedEntity = 'all';
    }

    return Q.fcall(() => {
      if (endpoint.socket && (<any>endpoint.socket).socket) {
        // consider calling endpoint.socket.disconnect() instead
        (<any>endpoint.socket).socket.onDisconnect();
      }
      return undefined;
    }).finally(() => {
      if (!endpoint.isConnected) {
        this.trigger('disconnect:' + endpoint.channel);
      }
    });
  }

  _fixMessage(endpoint: SyncEndpoint, msg: LiveDataMessage): LiveDataMessage {
    let idAttribute = endpoint.modelType.prototype.idAttribute;
    diag.debug.assert(() => !!idAttribute, 'no idAttribute!');

    if (msg.data && !msg.data[idAttribute] && msg.data._id) {
      msg.data[idAttribute] = msg.data._id; // server bug!
    } else if (!msg.data && msg.method === 'delete' && msg[idAttribute]) {
      msg.data = {};
      msg.data[idAttribute] = msg[idAttribute]; // server bug!
    }
    return msg;
  }

  onMessage(endpoint: SyncEndpoint, msg: LiveDataMessage): Q.Promise<LiveDataMessage> {
    // this is called by the store itself for a particular endpoint!
    if (!msg || !msg.method) {
      return Q.reject<LiveDataMessage>(new Error('no message or method given'));
    }

    var q: Q.Promise<any>;
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
      } else {
        diag.debug.debug('onMessage: ' + endpoint.entity + ' ' + model.id + ' performing ' + msg.method);
      }
      q = endpoint.localStore.sync(msg.method, model, _.extend(options, {
        merge: msg.method === 'patch'
      })).then((result) => {
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
    } else {
      // just update all collections listening
      q = Q.resolve(msg);
    }

    // finally set the message time
    return q.then(() => {
      return Q.resolve(msg.time && this.setTimestamp(channel, msg.time)).then(() => {
        // update all collections listening
        this.trigger('sync:' + channel, msg); // SyncContext.onMessage
        return msg;
      });
    }, (error: Error) => {
      // not setting message time in error case

      // report error as event on store
      this.trigger('error:' + channel, error, model);
      return msg;
    });
  }

  public sync(method: string, model: Model | Collection, options: any = {}): Q.Promise<any> {
    diag.debug.trace('Relution.livedata.SyncStore.sync');
    try {
      var endpoint: SyncEndpoint = model.endpoint || this.getEndpoint(model);
      if (!endpoint) {
        throw new Error('no endpoint');
      }

      if (isCollection(model)) {
        // collections can be filtered, etc.
        if (method === 'read' && !options.barebone) {
          var syncContext: SyncContext = options.syncContext; // sync can be called by SyncContext itself when paging results
          if (!syncContext) {
            // capture GetQuery options
            syncContext = new SyncContext(
              options,        // dynamic options passed to fetch() implement UI filters, etc.
              model.options,  // static options on collection implement screen-specific stuff
              this            // static options of this store realize filtering client/server
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
      } else if (isModel(model)) {
        // offline capability requires IDs for data
        if (!model.id) {
          if (method === 'create') {
            model.set(model.idAttribute, objectid.makeObjectID());
          } else {
            throw new Error('no (valid) id: ' + model.id);
          }
        }
      } else {
        // something is really at odds here...
        throw new Error('target of sync is neither a model nor a collection!?!');
      }

      // at this point the target server is known, check making sure the correct server is being hit
      const serverUrl = web.resolveServer(model.getUrlRoot(), {
        serverUrl: this.serverUrl
      });
      if (serverUrl !== this.serverUrl) {
        throw new Error('store is bound to server ' + this.serverUrl);
      }

      var channel = endpoint.channel;
      return this.getTimestamp(channel).then((time) => {
        try {
          // only send read messages if no other store can do this or for initial load
          if (method === 'read' && endpoint.localStore && time && !options.reset) {
            // read data from localStore and fetch changes remote
            var opts = _.clone(options);
            opts.store = endpoint.localStore;
            opts.entity = endpoint.entity;
            delete opts.success;
            delete opts.error;
            return endpoint.localStore.sync(method, model, opts).then((resp) => {
              // backbone success callback alters the collection now
              resp = this.handleSuccess(options, resp) || resp;
              if (endpoint.socket || options.fetchMode === 'local') {
                // no need to fetch changes as we got a websocket, that is either connected or attempts reconnection
                return resp;
              }

              // when we are disconnected, try to connect now
              if (!endpoint.isConnected) {
                return this.fetchServerInfo(endpoint).then((info): any => {
                  // trigger reconnection when disconnected
                  var result: Q.Promise<void>;
                  if (!endpoint.isConnected) {
                    result = this.onConnect(endpoint);
                  }
                  return result || info;
                }, (xhr: web.HttpError) => {
                  // trigger disconnection when disconnected
                  var result: Q.Promise<void>;
                  if (!xhr.statusCode && endpoint.isConnected) {
                    result = this.onDisconnect(endpoint);
                  }
                  return result || resp;
                }).thenResolve(resp);
              } // else...

              // load changes only (will happen AFTER success callback is invoked,
              // but returned promise will resolve only after changes were processed.
              return this.fetchChanges(endpoint).catch((xhr: web.HttpError) => {
                if (!xhr.statusCode && endpoint.isConnected) {
                  return this.onDisconnect(endpoint) || resp;
                }

                // can not do much about it...
                this.trigger('error:' + channel, xhr, model);
                return resp;
              }).thenResolve(resp); // caller expects original XHR response as changes body data is NOT compatible
            }, () => {
              // fall-back to loading full data set
              return this._addMessage(method, model, options, endpoint);
            });
          }

          // do backbone rest
          return this._addMessage(method, model, options, endpoint);
        } catch (error) {
          return Q.reject(this.handleError(options, error) || error);
        }
      });
    } catch (error) {
      return Q.reject(this.handleError(options, error) || error);
    }
  }

  private _addMessage(method: string, model: Model | Collection, options: any,
                      endpoint: SyncEndpoint): Q.Promise<any> {
    var changes = (<Model>model).changedSinceSync;
    var data: any = null;
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
        diag.debug.assert (() => method === 'read', 'unknown method: ' + method);
        storeMsg = false;
        break;
    }
    let entity = model.entity || endpoint.entity;
    diag.debug.assert(() => model.entity === endpoint.entity);
    diag.debug.assert(() => entity.indexOf('~') < 0, 'entity name must not contain a ~ character!');
    var msg: LiveDataMessage = {
      _id: entity + '~' + (<Model>model).id,
      id: (<Model>model).id,
      method: method,
      data: data,
      // channel: endpoint.channel, // channel is hacked in by storeMessage(), we don't want to use this anymore
      priority: endpoint.priority,
      time: Date.now()
    };

    var q = Q.resolve(msg);
    var qMessage: Q.Promise<LiveDataMessageModel>;
    if (storeMsg) {
      // store and potentially merge message
      qMessage = this.storeMessage(endpoint, q);
      q = qMessage.then((message: LiveDataMessageModel) => {
        // in case of merging, this result could be different
        return message.attributes;
      });
    }
    return q.then((msg2: LiveDataMessage) => {
      // pass in qMessage so that deletion of stored message can be scheduled
      return this._emitMessage(endpoint, msg2, options, model, qMessage);
    });
  }

  private _emitMessage(endpoint: SyncEndpoint, msg: LiveDataMessage, options: any,
                       model: Model | Collection, qMessage: Q.Promise<LiveDataMessageModel>):
  Q.Promise<any> {
    var channel = endpoint.channel;
    var qAjax = this._ajaxMessage(endpoint, msg, options, model);
    var q = qAjax;

    if (qMessage) {
      // following takes care of offline change store
      q = q.then((data) => {
        // success, remove message stored, if any
        return this.removeMessage(endpoint, msg, qMessage).catch((error: web.HttpError) => {
          this.trigger('error:' + channel, error, model); // can not do much about it...
          return data;
        }).thenResolve(data); // resolve again yielding data
      }, (xhr: web.HttpError) => {
        // failure eventually caught by offline changes
        if (!xhr.statusCode && this.useOfflineChanges) {
          // this seams to be only a connection problem, so we keep the message and call success
          return Q.resolve(msg.data);
        } else {
          // remove message stored and keep rejection as is
          return this.removeMessage(endpoint, msg, qMessage).catch((error: web.HttpError) => {
            this.trigger('error:' + channel, error, model); // can not do much about it...
            return xhr;
          }).thenReject(xhr);
        }
      });
    }

    q = this._applyResponse(q, endpoint, msg, options, model);

    return q.finally(() => {
      // do some connection handling
      return qAjax.then(() => {
        // trigger reconnection when disconnected
        if (!endpoint.isConnected) {
          return this.onConnect(endpoint);
        }
      }, (xhr: web.HttpError) => {
        // trigger disconnection when disconnected
        if (!xhr.statusCode && endpoint.isConnected) {
          return this.onDisconnect(endpoint);
        }
      });
    });
  }

  private _ajaxMessage(endpoint: SyncEndpoint, msg: LiveDataMessage, options: any,
                       model: Model | Collection): Q.Promise<any> {
    options = options || {};
    delete options.xhr; // make sure not to use old value

    var url = options.url;
    if (!url) {
      url = endpoint.urlRoot;
      if (msg.id && msg.method !== 'create') {
        // add ID of model
        url += (url.charAt(url.length - 1) === '/' ? '' : '/' ) + msg.id;
      }
      if (msg.method === 'read' && isCollection(model)) {
        // add query of collection
        var collectionUrl = _.isFunction(model.url) ? model.url() : model.url;
        var queryIndex = collectionUrl.lastIndexOf('?');
        var getQuery = new GetQuery().fromJSON(options);
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
        } else {
          if (getParams) {
            url += '?' + getParams;
          }
        }
      }
    }

    // earliest point where target URL is known
    diag.debug.debug('ajaxMessage ' + msg.method + ' ' + url);
    var opts: any = {
      // must not take arbitrary options as these won't be replayed on reconnect
      url: url,
      attrs: msg.data,
      store: {}, // ensures network is used
      credentials: options.credentials,
      // error propagation
      error: options.error
    };

    // protect against wrong server and user identity
    diag.debug.assert(() => web.resolveServer(url, {
      serverUrl: this.serverUrl
    }) === this.serverUrl);
    if (security.Server.getInstance(this.serverUrl).authorization.name !== this.userUuid) {
      diag.debug.warn('user identity was changed, working offline until authorization is restored');
      const error: web.HttpError = new Error();
      // invoke error callback, if any
      return this.handleError(opts, error) || Q.reject(error);
    }

    // actual ajax request via backbone.js
    return this.checkServer(url, opts).then(() => {
      return model.sync(msg.method, model, opts).finally(() => {
        // take over xhr resolving the options copy
        options.xhr = opts.xhr.xhr || opts.xhr;
      });
    });
  }

  private _applyResponse<T>(qXHR: Q.Promise<T>, endpoint: SyncEndpoint, msg: LiveDataMessage,
                            options: any, model: Model | Collection): Q.Promise<T> {
    // var channel = endpoint.channel;
    var clientTime = new Date().getTime();
    return qXHR.then((data: T | any) => {
      // delete on server does not respond a body
      if (!data && msg.method === 'delete') {
        data = msg.data;
      }

      // update local store state
      if (data) {
        // no data if server asks not to alter state
        // this.setTimestamp(channel, msg.time);
        var promises: Q.Promise<LiveDataMessage>[] = [];
        var dataIds: any; // model id -> attributes data
        if (msg.method !== 'read') {
          promises.push(this.onMessage(endpoint, this._fixMessage(endpoint, data === msg.data ? msg : <LiveDataMessage>_.defaults({
            data: data // just accepts new data
          }, msg))));
        } else if (isCollection(model) && Array.isArray(data)) {
          // synchronize the collection contents with the data read
          var syncIds = {};
          model.models.forEach((m) => {
            syncIds[m.id] = m;
          });
          dataIds = {};
          data.forEach((d: any) => {
            if (d) {
              var id = d[endpoint.modelType.prototype.idAttribute] || d._id;
              dataIds[id] = d;
              var m = syncIds[id];
              if (m) {
                // update the item
                delete syncIds[id]; // so that it is deleted below
                if (!_.isEqual(_.pick.call(m, m.attributes, Object.keys(d)), d)) {
                  // above checked that all attributes in d are in m with equal values and found some mismatch
                  promises.push(this.onMessage(endpoint, this._fixMessage(endpoint, {
                    id: id,
                    method: 'update',
                    time: msg.time,
                    data: d
                  })));
                }
              } else {
                // create the item
                promises.push(this.onMessage(endpoint, this._fixMessage(endpoint, {
                  id: id,
                  method: 'create',
                  time: msg.time,
                  data: d
                })));
              }
            }
          });
          Object.keys(syncIds).forEach((id) => {
            // delete the item
            var m = syncIds[id];
            promises.push(this.onMessage(endpoint, this._fixMessage(endpoint, {
              id: id,
              method: 'delete',
              time: msg.time,
              data: m.attributes
            })));
          });
        } else {
          // trigger an update to load the data read
          var array = Array.isArray(data) ? data : [data];
          for (let i = 0; i < array.length; i++) {
            data = array[i];
            if (data) {
              promises.push(this.onMessage(endpoint, this._fixMessage(endpoint, {
                id: data[endpoint.modelType.prototype.idAttribute] || data._id,
                method: 'update',
                time: msg.time,
                data: data
              })));
            }
          }
        }
        return Q.all(promises).then(() => {
          // delayed till operations complete
          if (!dataIds) {
            return data;
          }
          diag.debug.assert(() => isCollection(model));

          // when collection was updated only pass data of models that were synced on to the success callback,
          // as the callback will set the models again causing our sorting and filtering to be without effect.
          var response: any[] = [];
          let models = isCollection(model) ? model.models : [model];
          for (let i = models.length; i-- > 0; ) {
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
    }).then((response) => {
      let qTime: Q.Promise<any>;
      if (msg.method === 'read' && isCollection(model)) {
        // TODO: extract Date header from options.xhr instead of using clientTime
        qTime = this.setTimestamp(endpoint.channel, clientTime);
      } else {
        qTime = Q.resolve(undefined);
      }
      return qTime.then(() => {
        // invoke success callback, if any
        return this.handleSuccess(options, response) || response;
      });
    }, (error: web.HttpError) => {
      // invoke error callback, if any
      return this.handleError(options, error) || Q.reject(error);
    });
  }

  private fetchChanges(endpoint: SyncEndpoint, force = false): Q.Promise<Collection> {
    let channel = endpoint.channel;
    if (!endpoint.urlRoot || !channel) {
      return Q.resolve<Collection>(undefined);
    }

    let now = Date.now();
    let promise = endpoint.promiseFetchingChanges;
    if (promise && !force) {
      if (promise.isPending() || now - endpoint.timestampFetchingChanges < 1000) {
        // reuse existing eventually completed request for changes
        diag.debug.warning(channel + ' skipping changes request...');
        return promise;
      }
    }

    return this.getTimestamp(channel).then((time) => {
      if (!time) {
        diag.debug.error(channel + ' can not fetch changes at this time!');
        return promise || Q.resolve<Collection>(undefined);
      }

      // initiate a new request for changes
      diag.debug.info(channel + ' initiating changes request...');
      let changes: Collection = new (<any>this.messages).constructor();
      promise = this.checkServer(endpoint.urlRoot + 'changes/' + time).then((url) => {
        return Q(changes.fetch(<Backbone.CollectionFetchOptions>{
          url: url,
          store: {}, // really go to remote server

          success: (model, response, options) => {
            return response || options.xhr;
          }
        })).then(() => {
          if (changes.models.length > 0) {
            return Q.all(changes.map((change) => {
              let msg: LiveDataMessage = change.attributes;
              return this.onMessage(endpoint, this._fixMessage(endpoint, msg));
            }));
          } else {
            // following should use server time!
            return this.setTimestamp(channel, now);
          }
        }).thenResolve(changes);
      });
      endpoint.promiseFetchingChanges = promise;
      endpoint.timestampFetchingChanges = now;
      return promise;
    });
  }

  private fetchServerInfo(endpoint: SyncEndpoint): Q.Promise<Model> {
    var now = Date.now();
    var promise = endpoint.promiseFetchingServerInfo;
    if (promise) {
      if (promise.isPending() || now - endpoint.timestampFetchingServerInfo < 1000) {
        // reuse existing eventually completed request for changes
        diag.debug.warning(endpoint.channel + ' skipping info request...');
        return promise;
      }
    }

    var info = new Model();
    var url = endpoint.urlRoot;
    if (url.charAt((url.length - 1)) !== '/') {
      url += '/';
    }
    promise = this.checkServer(url + 'info').then((url) => {
      return Q(info.fetch(<Backbone.ModelFetchOptions>({
        url: url,
        success: (model, response, options) => {
          return response || options.xhr;
        }
        }))).then(() => {
          //@todo why we set a server time here ?
          return this.getTimestamp(endpoint.channel).then((time) => {
            if (!time && info.get('time')) {
              return this.setTimestamp(endpoint.channel, info.get('time'));
            }
            return time;
          });
        }).then(() => {
          if (!endpoint.socketPath && info.get('socketPath')) {
            endpoint.socketPath = info.get('socketPath');
            var name = info.get('entity') || endpoint.entity;
            if (this.useSocketNotify) {
              endpoint.socket = this.createSocket(endpoint, name);
            }
          }
          return info;
        });
    });
    endpoint.promiseFetchingServerInfo = promise;
    endpoint.timestampFetchingServerInfo = now;
    return promise;
  }

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
  protected processOfflineMessageResult(error: Error, message: LiveDataMessageModel, options: {
    entity: string,
    modelType: ModelCtor,
    urlRoot: string,
    localStore: Store,
    silent?: boolean
  }): PromiseLike<void | any> {
    if (!error) {
      // message was processed successfully
      if (!this.useSocketNotify) {
        // when not using sockets, fetch changes now
        let endpoint = this.endpoints[options.entity];
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
    let modelType = options.modelType || Model;
    let model = new modelType(message.get('data'), {
      entity: options.entity
    });
    model.id = message.get('method') !== 'create' && message.get('id');
    let triggerError = () => {
      // inform client application of the offline changes error
      let channel = message.get('channel');
      diag.debug.error('Relution.livedata.SyncStore.processOfflineMessageResult: triggering error for channel ' + channel + ' on store', error);
      if (!options.silent) {
        this.trigger('error:' + channel, error, model);
      }
    };
    let localOptions = {
      // just affect local store
      store: options.localStore
    };
    let remoteOptions: any = {
      urlRoot: options.urlRoot,
      store: {} // really go to remote server
    };
    if (model.id) {
      remoteOptions.url = remoteOptions.urlRoot + (remoteOptions.urlRoot.charAt(remoteOptions.urlRoot.length - 1) === '/' ? '' : '/' ) + model.id;
      // diag.debug.assert(() => model.url() === remoteOptions.url);
    } else {
      // creation failed, just delete locally
      diag.debug.assert(() => message.get('method') === 'create');
      return model.destroy(localOptions).finally(triggerError);
    }
    return (<Q.Promise<any>><any>model.fetch(remoteOptions)).then((data) => {
      // original request failed and the code above reloaded the data to revert the local modifications, which succeeded...
      return model.save(data, localOptions).finally(triggerError);
    }, (fetchResp: web.HttpError) => {
      // original request failed and the code above tried to revert the local modifications by reloading the data, which failed as well...
      const statusCode = fetchResp && fetchResp.statusCode;
      switch (statusCode) {
        case 404: // NOT FOUND
        case 401: // UNAUTHORIZED
        case 410: // GONE*
          // ...because the item is gone by now, maybe someone else changed it to be deleted
          return model.destroy(localOptions); // silent regarding triggerError
        default:
          return Q.reject(fetchResp).finally(triggerError);
      }
    });
  }

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
  private _sendMessages(): Q.Promise<Collection> {
    // not ready yet
    if (!this.messages) {
      return Q.resolve<Collection>(undefined);
    }

    // processes messages until none left, hitting a message of a not yet registered endpoint, or entering
    // a non-recoverable error. The promise returned resolves to this.messages when done.
    let nextMessage = (): any => {
      if (!this.messages.length) {
        return this.messages;
      }

      let message: LiveDataMessageModel = this.messages.models[0];
      let entity = message.id.substr(0, message.id.indexOf('~'));
      if (!entity) {
        diag.debug.error('sendMessage ' + message.id + ' with no entity!');
        return message.destroy().then(nextMessage);
      }
      let endpoint = this.endpoints[entity];
      if (!endpoint) {
        return this.messages;
      }
      diag.debug.assert(() => endpoint.channel === message.get('channel'), 'channel of endpoint ' + endpoint.channel + ' does not match channel of message ' + message.get('channel'));
      let msg = this._fixMessage(endpoint, message.attributes);

      let modelType = endpoint.modelType || Model;
      let model = new modelType(msg.data, {
        entity: endpoint.entity
      });
      model.id = message.get('method') !== 'create' && message.get('id');
      let remoteOptions: any = {
        urlRoot: endpoint.urlRoot,
        store: {} // really go to remote server
      };
      if (model.id) {
        remoteOptions.url = remoteOptions.urlRoot + (remoteOptions.urlRoot.charAt(remoteOptions.urlRoot.length - 1) === '/' ? '' : '/' ) + model.id;
        // diag.debug.assert(() => model.url() === remoteOptions.url);
      }
      diag.debug.info('sendMessage ' + model.id);
      let offlineOptions = {
        entity: endpoint.entity,
        modelType: endpoint.modelType,
        urlRoot: endpoint.urlRoot,
        localStore: endpoint.localStore
      };
      return this._applyResponse(this._ajaxMessage(endpoint, msg, remoteOptions, model), endpoint, msg, remoteOptions, model).then(() => {
        // succeeded
        return this.processOfflineMessageResult(null, message, offlineOptions);
      }, (error: web.HttpError) => {
        if (error.statusCode) {
          // remote failed
          return Q(this.processOfflineMessageResult(error, message, offlineOptions)).catch((error2) => {
            // explicitly disconnect due to error in endpoint
            this.disconnectedEntity = endpoint.entity;
            return this.onDisconnect(endpoint).thenReject(error2);
          });
        } else {
          // connectivity issue, keep rejection
          return Q.reject(error);
        }
      }).then(() => {
        // applying change succeeded or successfully recovered change
        return message.destroy();
      }).then(nextMessage);
    };

    diag.debug.info('Relution.livedata.SyncStore._sendMessages');
    let q = this.messagesPromise;
    if (!q) {
      // initially fetch all messages
      q = Q(this.messages.fetch(<Backbone.CollectionFetchOptions>{
        sortOrder: [
          '+priority',
          '+time',
          '+id'
        ]
      }));
    } else if (this.messagesPromise.isRejected()) {
      // early rejection
      return this.messagesPromise;
    } else if (!this.messages.length) {
      // no more messages
      return this.messagesPromise;
    }

    // kick to process pending messages
    this.messagesPromise = q.then(nextMessage);
    return this.messagesPromise;
  }

  private storeMessage(endpoint: SyncEndpoint, qMsg: Q.Promise<LiveDataMessage>): Q.Promise<LiveDataMessageModel> {
    return qMsg.then((msg: LiveDataMessage) => {
      let options: Backbone.ModelSaveOptions;
      let id = this.messages.modelId(msg);
      diag.debug.info('storeMessage ' + id);
      var message: LiveDataMessageModel = id && <LiveDataMessageModel>this.messages.get(id);
      if (message) {
        // use existing instance, should not be the case usually
        options = <Backbone.ModelSaveOptions>{
          merge: true
        };
      } else {
        // instantiate new model, intentionally not added to collection
        message = new this.messages.model(msg, {
          collection: this.messages,
          store: this.messages.store
        });
        message.set('channel', endpoint.channel);
      }
      return Q(message.save(msg, options)).thenResolve(message);
    });
  }

  private removeMessage(endpoint: SyncEndpoint, msg: LiveDataMessage, qMessage: Q.Promise<LiveDataMessageModel>): Q.Promise<void> {
    return qMessage.then((message: LiveDataMessageModel) => {
      if (!message) {
        let id = this.messages.modelId(msg);
        if (!id) {
          // msg is not persistent
          return Q.resolve(undefined);
        }

        message = <LiveDataMessageModel>this.messages.get(id);
        if (!message) {
          message = new this.messages.model({
            _id: msg._id
          }, {
            collection: this.messages,
            store: this.messages.store
          });
        }
      }

      diag.debug.trace('removeMessage ' + message.id);
      return message.destroy();
    });
  }

  public clear(collection: Collection): Q.Promise<any> {
    if (collection) {
      var endpoint: SyncEndpoint = this.getEndpoint(collection);
      if (endpoint) {
        if (this.messages) {
          this.messages.destroy();
        }
        collection.reset();
        return this.setTimestamp(endpoint.channel, '');
      }
    }
  }

  /**
   * close the socket explicit
   */
  public close() {
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
  }
}

// mixins
let syncStore = _.extend(SyncStore.prototype, {
  _type: 'Relution.livedata.SyncStore',

  localStore: WebSqlStore,
  useLocalStore: true,
  useSocketNotify: true,
  useOfflineChanges: true,
  socketPath: ''
});
diag.debug.assert(() => SyncStore.prototype.isPrototypeOf(Object.create(syncStore)));
