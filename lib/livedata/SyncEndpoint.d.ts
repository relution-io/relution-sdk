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
import { Store } from './Store';
import { Model, ModelCtor } from './Model';
import { Collection } from './Collection';
/**
 * manages connection of SyncStore to one entity.
 */
export declare class SyncEndpoint {
    entity: string;
    modelType: ModelCtor;
    urlRoot: string;
    socketPath: string;
    credentials: any;
    host: string;
    path: string;
    channel: string;
    isConnected: Q.Promise<void>;
    localStore: Store;
    info: Q.Promise<Model>;
    priority: number;
    socket: SocketIOClient.Socket;
    promiseFetchingChanges: Q.Promise<Collection>;
    timestampFetchingChanges: number;
    promiseFetchingServerInfo: Q.Promise<Model>;
    timestampFetchingServerInfo: number;
    constructor(options: {
        entity: string;
        modelType: ModelCtor;
        urlRoot: string;
        socketPath: string;
        credentials: any;
    });
    /**
     * close the endpoint explicit.
     */
    close(): void;
}
