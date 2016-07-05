import { Model } from './Model';
import { Collection } from './Collection';
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
    close(): void;
    protected trigger: typeof Backbone.Events.prototype.trigger;
    getArray(data: any): any;
    getDataArray(data: any): any[];
    getAttributes(model: any): any;
    initModel(model: any, options?: any): void;
    initCollection(collection: any, options?: any): void;
    sync(method: string, model: Model | Collection, options?: any): PromiseLike<any>;
    /**
     *
     * @param collection usually a collection, but can also be a model
     * @param options
     */
    fetch(collection: any, options: any): any;
    create(collection: any, models: any, options: any): any;
    save(model: any, attr: any, options: any): any;
    destroy(model: any, options: any): void;
    _checkData(options: any, data: any): boolean;
    protected handleSuccess(options: any, result: any): any;
    protected handleError(options: any, error: Error): any;
}
