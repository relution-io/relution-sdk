import { Model } from './Model';
import { Collection } from './Collection';
/**
 * options passed to Collection.fetch() preventing backbone.js from consuming the response.
 *
 * This can be used when fetching large quantities of data and just the store and attached
 * collections are to be updated. By merging these options in and the server response is
 * not used to update the collection fetched itself.
 */
export declare const bareboneOptions: {
    barebone: boolean;
    add: boolean;
    remove: boolean;
    merge: boolean;
    sort: boolean;
    silent: boolean;
};
export declare function ajax(options: any): PromiseLike<any>;
export declare function sync(method: string, model: Model | Collection, options?: any): PromiseLike<any>;
