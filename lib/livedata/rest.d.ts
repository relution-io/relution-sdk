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
export declare function logon(options: any): any;
export declare function ajax(options: any): any;
export declare function sync(method: any, model: any, options: any): any;
