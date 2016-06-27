/**
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

import {Store} from './Store';
import {Model, ModelCtor} from './Model';
import {Collection} from './Collection';

import * as URLUtil from './url';

/**
 * manages connection of SyncStore to one entity.
 */
export class SyncEndpoint {

  public entity: string;
  public modelType: ModelCtor;
  public urlRoot: string;
  public socketPath: string;
  public credentials: any;

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

  constructor(options:{
    entity: string,
    modelType: ModelCtor,
    urlRoot: string,
    socketPath: string,
    credentials: any
  }) {
    this.entity = options.entity;
    this.modelType = options.modelType;
    this.urlRoot = options.urlRoot;
    this.socketPath = options.socketPath;
    this.credentials = options.credentials;

    var href = URLUtil.getLocation(options.urlRoot);
    this.host = href.protocol + '//' + href.host;
    this.path = href.pathname;

    var name = options.entity;
    var user = options.credentials && options.credentials.username ? options.credentials.username : '';
    var hash = URLUtil.hashLocation(options.urlRoot);
    this.channel = name + user + hash;
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
