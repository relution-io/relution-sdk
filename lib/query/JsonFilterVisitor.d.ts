import * as filters from './Filter';
/**
 * options of #jsonFilter function.
 */
export interface JsonFilterOptions {
    /**
     * set to explicitly use case-sensitive string matching, evalates to false to use matching
     * semantics of WebSQL.
     */
    casesensitive?: boolean;
}
/**
 * compiled test function.
 */
export interface JsonFilterFn<T> {
    /**
     * tests an object against a Filter tree.
     *
     * @param arg object to test.
     * @return {boolean} whether the given object passes the Filter tree.
     */
    (arg: T): boolean;
}
/**
 * compiles a JsonFilterFn from a given Filter tree.
 *
 * @param filter tree being compiled.
 * @param options customizing the matching, entirely optional.
 * @return {function} a JsonFilterFn function.
 */
export declare function jsonFilter<T>(filter: filters.Filter, options?: JsonFilterOptions): JsonFilterFn<T>;
