import { Store } from './Store';
import { Model, ModelCtor } from './Model';
import { SyncContext } from './SyncContext';
import { SyncEndpoint } from './SyncEndpoint';
/**
 * constructor function of Collection.
 */
export interface CollectionCtor {
    /**
     * @see Collection#constructor
     */
    new (models?: any, options?: any): Collection;
}
/**
 * tests whether a given object is a Collection.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Collection.
 */
export declare function isCollection(object: any): object is Collection;
/**
 * extension of a backbone.js Collection.
 *
 * The Relution.livedata.Collection can be used like a Backbone Collection,
 * but there are some enhancements to fetch, save and delete the
 * contained models from or to other "data stores".
 *
 * see WebSqlStore or SyncStore for examples
 */
export declare class Collection extends Backbone.Collection<Model> {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    model: ModelCtor;
    entity: string;
    options: any;
    store: Store;
    syncContext: SyncContext;
    credentials: any;
    endpoint: SyncEndpoint;
    channel: string;
    constructor(models?: any, options?: any);
    protected init(models?: any, options?: any): void;
    modelId: (attrs: any) => any;
    ajax(options: any): any;
    sync(method: string, model: Backbone.ModelBase, options?: any): any;
    entityFromUrl(url: any): string;
    destroy(options?: any): void;
    /**
     * save all containing models
     */
    save(): void;
    applyFilter(callback: any): void;
    getUrlParams(url?: string): any;
    getUrl(): string;
    getUrlRoot(): string;
    private _updateUrl();
    /**
     * reads an additional page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for infinite scrolling
     * implementation.
     *
     * When async processing is done, a more attribute is set on the options object in case additional data might be
     * available which can be loaded by calling this method again. Likewise an end attribute is set if the data is
     * fully loaded.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchMore()
     */
    fetchMore(options: any): PromiseLike<any>;
    /**
     * reads the next page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for paging
     * implementation.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might be
     * available which can be loaded by calling the corresponding method.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchNext()
     */
    fetchNext(options: any): PromiseLike<any>;
    /**
     * reads the previous page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for paging
     * implementation.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might be
     * available which can be loaded by calling the corresponding method.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchPrev()
     */
    fetchPrev(options: any): PromiseLike<any>;
}
