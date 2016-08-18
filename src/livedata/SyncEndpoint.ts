/*
 * @file livedata/SyncEndpoint.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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

import * as url from 'url';

import {Store} from './Store';
import {Model, ModelCtor} from './Model';
import {Collection} from './Collection';

/**
 * very simple hash coding implementation.
 *
 * @internal For library use only.
 */
export function hashCode(...args: string[]) {
  var hash = 0;
  for (var i = 0; i < args.length; ++i) {
    var str = args[i] || '';
    for (var j = 0, l = str.length; j < l; ++j) {
      var char = str.charCodeAt(j);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
  }
  return hash;
}

/**
 * manages connection of SyncStore to one entity.
 */
export class SyncEndpoint {

  public entity: string;
  public modelType: ModelCtor;
  public urlRoot: string;
  public socketPath: string;
  public userUuid: string;

  public host: string;
  public path: string;
  public channel: string;
  public isConnected: Q.Promise<void> = null;

  public localStore: Store;
  public info: Q.Promise<Model>;
  public priority: number;
  public socket: SocketIOClient.Socket;

  // promise of last SyncStore.fetchChanges
  public promiseFetchingChanges: Q.Promise<Collection>;
  // timestamp of last SyncStore.fetchChanges, 0 while request is outstanding
  public timestampFetchingChanges: number;

  // promise of last SyncStore.fetchServerInfo
  public promiseFetchingServerInfo: Q.Promise<Model>;
  // timestamp of last SyncStore.fetchServerInfo, 0 while request is outstanding
  public timestampFetchingServerInfo: number;

  constructor(options: {
    entity: string,
    modelType: ModelCtor,
    urlRoot: string,
    socketPath: string,
    userUuid: string
  }) {
    this.entity = options.entity;
    this.modelType = options.modelType;
    this.urlRoot = options.urlRoot;
    this.socketPath = options.socketPath;
    this.userUuid = options.userUuid;

    var href = url.parse(options.urlRoot);
    this.host = href.protocol + '//' + href.hostname;
    if (!href.port) {
      // socket.io needs port event for standard protocols
      if (href.protocol === 'https:') {
        this.host += ':443';
      } else if (href.protocol === 'http:') {
        this.host += ':80';
      }
    }
    this.path = href.pathname;

    var user = options.userUuid ? options.userUuid + '/' : '';
    var name = options.entity;
    var hash = hashCode(this.host);
    this.channel = user + name + '/' + hash;
  }

  /**
   * close the endpoint explicit.
   */
  public close() {
    if (this.socket) {
      // consider calling this.socket.close() instead
      (<any>this.socket).socket.close();
      this.socket = null;
    }
    if (this.localStore) {
      this.localStore.close();
      this.localStore = null;
    }
  }
}
