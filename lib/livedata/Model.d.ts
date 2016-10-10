/// <reference types="backbone" />
/**
 * @module livedata
 */
/** */
import * as Backbone from 'backbone';
import { Store } from './Store';
import { Collection } from './Collection';
import { SyncEndpoint } from './SyncEndpoint';
/**
 * prototype properties specified when subclassing using Model.defaults().
 */
export interface ModelProps {
    type?: {
        container: string;
        model: string;
    } | string;
    entity?: string;
    tenancy?: 'USER' | 'ORGANIZATION' | 'SCOPE';
    idAttribute?: string;
    aclAttribute?: string;
    defaults?: any;
    url?: string | (() => string);
    urlRoot?: string | (() => string);
    store?: Store;
}
/**
 * constructor function of Model.
 */
export interface ModelCtorT<ModelType extends Model, AttributesType, OptionsType> {
    /**
     * prototype of constructor function.
     */
    prototype: ModelType;
    /**
     * @see Model#constructor
     */
    new (attributes?: AttributesType, options?: OptionsType): ModelType;
}
/**
 * constructor function of Model.
 */
export declare type ModelCtor = ModelCtorT<Model, any, any>;
/**
 * tests whether a given object is a Model.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Model.
 */
export declare function isModel(object: any): object is Model;
/**
 * extension of a backbone.js Model.
 */
export declare class Model extends Backbone.Model {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    isStore: boolean;
    entity: string;
    changedSinceSync: {};
    collection: Collection;
    store: Store;
    credentials: any;
    endpoint: SyncEndpoint;
    constructor(attributes?: any, options?: any);
    /**
     * sets up prototype properties when defining a Model subclass.
     *
     * @param {ModelProps} properties of prototype to set.
     */
    static defaults(properties: ModelProps): ModelCtor;
    protected init(attributes?: any, options?: any): void;
    ajax(options: any): any;
    sync(method: string, model: Backbone.ModelBase, options?: any): any;
    onChange(model: Model, options: any): void;
    onSync(model: Model, options: any): void;
    getUrlRoot(): string;
}
