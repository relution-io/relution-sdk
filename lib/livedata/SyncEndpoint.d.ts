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
    userUuid: string;
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
        userUuid: string;
    });
    /**
     * close the endpoint explicit.
     */
    close(): void;
}
