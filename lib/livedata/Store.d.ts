import { Model } from './Model';
import { Collection } from './Collection';
import { _create } from './Object';
/**
 * constructor function of Store.
 */
export interface StoreCtor {
    /**
     * @see Store#constructor
     */
    new (options?: any): Store;
}
/**
 * base class to build a custom data store.
 */
export declare class Store {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    protected name: string;
    protected entities: any;
    endpoints: any;
    constructor(options?: any);
    static _create: typeof _create;
    protected trigger: any;
    getArray(data: any): any;
    getDataArray(data: any): any[];
    getAttributes(model: any): any;
    initModel(model: any, options?: any): void;
    initCollection(collection: any, options?: any): void;
    sync(method: string, model: Model | Collection, options?: any): PromiseLike<any>;
    /**
     *
     * @param collection usally a collection, but can also be a model
     * @param options
     */
    fetch(collection: any, options: any): any;
    create(collection: any, model: any, options: any): any;
    save(model: any, attr: any, options: any): any;
    destroy(model: any, options: any): void;
    _checkData(obj: any, data: any): boolean;
    private handleCallback;
    protected handleSuccess(obj: any, ...args: any[]): any;
    protected handleError(obj: any, ...args: any[]): any;
    static CONST: {
        ERROR_NO_DATA: string;
        ERROR_LOAD_DATA: string;
        ERROR_SAVE_DATA: string;
        ERROR_LOAD_IDS: string;
        ERROR_SAVE_IDS: string;
    };
    close(): void;
}
