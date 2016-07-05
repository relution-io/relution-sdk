/**
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
import * as Q from 'q';
import { Store, StoreCtor } from './Store';
import { SyncEndpoint } from './SyncEndpoint';
import { LiveDataMessage, LiveDataMessageModel } from './LiveDataMessage';
import { Model, ModelCtor } from './Model';
import { Collection } from './Collection';
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
export declare class SyncStore extends Store {
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
     * identity or user associated with this store.
     *
     * The ajax method will simulate an offline timeout when the user identity is changed. This is
     * because just one session can be maintained per server and login/logout semantics must be well
     * behaved.
     */
    protected userUuid: string;
    endpoints: {
        [entity: string]: SyncEndpoint;
    };
    private lastMesgTime;
    /**
     * when set, indicates which entity caused a disconnection.
     *
     * <p>
     * This is set to an entity name to limit which entity may cause a change to online state again.
     * </p>
     *
     * @type {string}
     */
    private disconnectedEntity;
    messages: Collection;
    messagesPromise: Q.Promise<Collection>;
    constructor(options?: any);
    /**
     * binds the store to a target server when the first endpoint is created.
     *
     * @param urlRoot used to resolve the server to operate.
       */
    private initServer(urlRoot);
    private checkServer(url, options?);
    protected initEndpoint(modelOrCollection: Model | Collection, modelType: ModelCtor): SyncEndpoint;
    initModel(model: Model): void;
    initCollection(collection: Collection): void;
    getEndpoint(modelOrCollection: Model | Collection): SyncEndpoint;
    createLocalStore(endpoint: SyncEndpoint): Store;
    /**
     * @description Here we save the changes in a Message local websql
     * @returns {*}
     */
    createMsgCollection(): Collection;
    createSocket(endpoint: SyncEndpoint, name: string): SocketIOClient.Socket;
    _bindChannel(endpoint: SyncEndpoint, name: any): void;
    getLastMessageTime(channel: string): any;
    setLastMessageTime(channel: string, time: any): void;
    onConnect(endpoint: SyncEndpoint): Q.Promise<void>;
    onDisconnect(endpoint: SyncEndpoint): Q.Promise<void>;
    _fixMessage(endpoint: SyncEndpoint, msg: LiveDataMessage): LiveDataMessage;
    onMessage(endpoint: SyncEndpoint, msg: LiveDataMessage): Q.Promise<LiveDataMessage>;
    sync(method: string, model: Model | Collection, options?: any): PromiseLike<any>;
    private _addMessage(method, model, options, endpoint);
    private _emitMessage(endpoint, msg, options, model, qMessage);
    private _ajaxMessage(endpoint, msg, options, model);
    private _applyResponse<T>(qXHR, endpoint, msg, options, model);
    private fetchChanges(endpoint, force?);
    private fetchServerInfo(endpoint);
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
        entity: string;
        modelType: ModelCtor;
        urlRoot: string;
        localStore: Store;
        silent?: boolean;
    }): PromiseLike<void | any>;
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
    private _sendMessages();
    private storeMessage(endpoint, qMsg);
    private removeMessage(endpoint, msg, qMessage);
    clear(collection: Collection): void;
    /**
     * close the socket explicit
     */
    close(): void;
}
