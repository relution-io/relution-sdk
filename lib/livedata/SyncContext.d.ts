import { Store } from './Store';
import { Collection } from './Collection';
import { LiveDataMessage } from './LiveDataMessage';
/**
 * receives change messages and updates collections.
 */
export declare class SyncContext {
    /**
     * relevant parameters for paging, filtering and sorting.
     *
     * @type {Relution.LiveData.GetQuery}
     */
    private getQuery;
    /**
     * limit of getQuery captured at construction time.
     */
    private pageSize;
    /**
     * used to speed up insertion point when doing consecutive insertions into sorted ranges.
     */
    private lastInsertionPoint;
    /**
     * when set, defines sorting of collection.
     */
    private compareFn;
    /**
     * when set, defines filtering of collection.
     */
    private filterFn;
    /**
     * captures option values forming a GetQuery.
     *
     * @param options to merge.
     * @constructor
     */
    constructor(...options: {}[]);
    /**
     * reads an additional page of data into the collection.
     *
     * When async processing is done, a more attribute is set on the options object in case additional data might be
     * available which can be loaded by calling this method again. Likewise an end attribute is set if the data is
     * fully loaded.
     *
     * @param {object} collection to load data into.
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchMore()
     */
    fetchMore(collection: Collection, options?: any): any;
    /**
     * reads a page of data into the collection.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might
     * be available which can be loaded by calling this method again.
     *
     * @param {object} collection to load data into.
     * @param {object} options incl. offset and limit of page to retrieve.
     * @return {Promise} promise of the load operation.
     */
    private fetchRange(collection, options?);
    /**
     * reads the next page of data into the collection.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchNext()
     */
    fetchNext(collection: Collection, options?: any): any;
    /**
     * reads the previous page of data into the collection.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchPrev()
     */
    fetchPrev(collection: Collection, options?: any): any;
    filterAttributes<T>(attrs: T[], options?: any): T[];
    sortAttributes<T>(attrs: T[], options?: any): T[];
    rangeAttributes<T>(attrs: T[], options?: any): T[];
    processAttributes<T>(attrs: T[], options?: any): T[];
    /**
     * receives change messages.
     *
     * Change messages are communicated by the SyncStore indirectly triggering a sync:channel event. This happens
     * regardless of whether the change originates local or remote. The context then alters the backbone data
     * incorporating the change.
     *
     * @param store
     * @param collection
     * @param msg
     */
    onMessage(store: Store, collection: Collection, msg: LiveDataMessage): void;
    /**
     * computes the insertion point of attributes into models sorted by compareFn.
     *
     * This is used to compute the at-index of backbone.js add() method options when adding models to a sorted collection.
     *
     * @param attributes being inserted.
     * @param models sorted by compareFn.
     * @return {number} insertion point.
     */
    private insertionPoint(attributes, models);
    /**
     * performs a binary search for insertion point of attributes into models[start:end] sorted by compareFn.
     *
     * @param attributes being inserted.
     * @param models sorted by compareFn.
     * @param compare function as of Array.sort().
     * @param start inclusive index of search interval.
     * @param end exclusive index of search interval.
     * @return {number} insertion point.
     */
    private insertionPointBinarySearch(attributes, models, start, end);
}
