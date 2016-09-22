/// <reference types="q" />
/// <reference types="backbone" />
/// <reference types="node" />
/**
 * @module livedata
 */
/** */
import * as Backbone from 'backbone';
import * as Q from 'q';
import { Model } from './Model';
import { Collection } from './Collection';
import { CollectionCtor } from "./Collection";
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
    initModel(model: Model, options?: any): void;
    initCollection(collection: Collection, options?: any): void;
    sync(method: string, model: Model | Collection, options?: any): Q.Promise<any>;
    fetch(collection: Model, options: Backbone.ModelFetchOptions): Q.Promise<any>;
    fetch(collection: Collection, options: Backbone.CollectionFetchOptions): Q.Promise<any>;
    create(collection: CollectionCtor, models: Model[], options?: any): Collection;
    save(model: Model, attributes?: any, options?: Backbone.ModelSaveOptions): any;
    destroy(model: Model, options?: Backbone.ModelDestroyOptions): void;
    protected trigger: typeof Backbone.Events.prototype.trigger;
    protected handleSuccess(options: {
        success?: Function;
    }, result: any): any;
    protected handleError(options: {
        error?: Function;
    }, error: Error): any;
}
