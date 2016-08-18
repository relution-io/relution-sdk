import { Store } from './Store';
import { Collection } from './Collection';
import { SyncEndpoint } from './SyncEndpoint';
/**
 * constructor function of Model.
 */
export interface ModelCtor {
    /**
     * @see Model#constructor
     */
    new (attributes?: any, options?: any): Model;
}
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
    protected init(attributes?: any, options?: any): void;
    ajax(options: any): any;
    sync(method: string, model: Backbone.ModelBase, options?: any): any;
    onChange(model: Model, options: any): void;
    onSync(model: Model, options: any): void;
    getUrlRoot(): string;
}