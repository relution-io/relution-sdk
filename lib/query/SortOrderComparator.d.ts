import { SortOrder } from './SortOrder';
/**
 * options of #jsonCompare function.
 */
export interface JsonCompareOptions {
    /**
     * set to explicitly use case-sensitive string matching, evalates to false to use matching
     * semantics of WebSQL.
     */
    casesensitive?: boolean;
}
/**
 * compiled compare function.
 */
export interface JsonCompareFn<T> {
    /**
     * compares objects in a way compatible to Array.sort().
     *
     * @param o1 left operand.
     * @param o2 right operand.
     * @return {number} indicating relative ordering of operands.
     */
    (o1: T, o2: T): number;
}
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param json of SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param json of SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export declare function jsonCompare<T>(json: string[], options?: JsonCompareOptions): JsonCompareFn<T>;
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param sortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export declare function jsonCompare<T>(sortOrder: SortOrder, options?: JsonCompareOptions): JsonCompareFn<T>;
