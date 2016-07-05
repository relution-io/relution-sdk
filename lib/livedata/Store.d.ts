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
 * tests whether a given object is a Store.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Store.
 */
export declare function isStore(object: any): object is Store;
/**
 * base class to build a custom data store.
 */
export declare class Store {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    isStore: boolean;
    protected name: string;
    protected entities: any;
    endpoints: any;
    constructor(options?: any);
    close(): void;
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
    protected trigger: typeof Backbone.Events.prototype.trigger;
    protected handleSuccess(options: any, result: any): any;
    protected handleError(options: any, error: Error): any;
}
