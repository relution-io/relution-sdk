/// <reference types="chai" />
/// <reference types="q" />
/// <reference types="backbone" />
/// <reference types="node" />
/**
 * @module livedata
 */
/** */
import * as Backbone from 'backbone';
import * as Q from 'q';
import { Model, ModelCtorT, ModelProps } from './Model';
import { Collection, CollectionCtor, CollectionCtorT, CollectionProps } from './Collection';
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
    /**
     * stores Model and Collection constructors by entity name.
     *
     * @see Store#makeModel
     * @see Store#makeCollection
     */
    private implementations;
    protected entities: any;
    endpoints: any;
    constructor(options?: any);
    close(): void;
    /**
     * factory method creating new Model instance bound to this Store.
     *
     * @param  modelType to instantiate.
     * @param  attributes of new instance.
     * @param  options at creation time.
     * @return new Model instance.
     *
     * @see Store#createCollection
     */
    createModel<ModelType extends Model, AttributesType, OptionsType>(modelType: ModelCtorT<ModelType, AttributesType, OptionsType>, attributes?: AttributesType, options?: OptionsType): ModelType;
    /**
     * factory method creating new Collection instance bound to this Store.
     *
     * @param  collectionType to instantiate.
     * @param  models of new instance.
     * @param  options at creation time.
     * @return new Collection instance.
     *
     * @see Store#createModel
     */
    createCollection<CollectionType extends Collection, ModelType extends Model, OptionsType>(collectionType: CollectionCtorT<CollectionType, ModelType, OptionsType>, models?: ModelType[] | Object[], options?: any): CollectionType;
    /**
     * defines prototype properties used for a given Model type.
     *
     * @param modelType being subclassed.
     * @return prototype properties of Model.
     *
     * @see Store#defaultsCollection
     */
    protected defaultsModel<ModelType extends Model, AttributesType, OptionsType>(modelType: ModelCtorT<ModelType, AttributesType, OptionsType>): ModelProps;
    /**
     * defines prototype properties used for a given Collection type.
     *
     * @param collectionType being subclassed.
     * @param modelType that was subclassed already, do not apply Store#extendModel on it!
     * @return prototype properties of Collection.
     *
     * @see Store#defaultsModel
     */
    protected defaultsCollection<CollectionType extends Collection, ModelType extends Model, OptionsType, AttributesType, ModelOptionsType>(collectionType: CollectionCtorT<CollectionType, ModelType, OptionsType>, modelType: ModelCtorT<ModelType, AttributesType, ModelOptionsType>): CollectionProps;
    /**
     * may be overwritten to resolve relative URLs against the actual server.
     *
     * @param url to resolve.
     * @return resolved url.
     */
    protected resolveUrl(url: string): string;
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
