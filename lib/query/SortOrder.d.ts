/**
 * defines a sort order of fields.
 *
 * Caution, member fields eventually are shared by multiple instances! You may mutate member
 * fields, but not the objects and arrays referenced by them.
 */
export declare class SortOrder {
    /**
     * ordered list of fields to sort on.
     */
    sortFields: SortField[];
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    constructor(other?: SortOrder);
    /**
     * parses a JSON literal such as ['-rating', '+date', 'id'] into this instance.
     *
     * @param json data, such as ['-rating', '+date'].
     * @return {SortOrder} this instance.
     */
    fromJSON(json: string[]): SortOrder;
    /**
     * formats a string such as '+name,-id'.
     *
     * @return {string} representation of SortOrder, may be the empty string when this is empty.
       */
    toString(): string;
    /**
     * combines an other instance such that this order is maintained by priority and equivalent elements are ordered by
     * the other order.
     *
     * You may want to optimize after merging several instances.
     *
     * @param other order to merge into this as secondary.
     */
    merge(other: SortOrder): void;
    /**
     * eliminates redundant sort fields that do not affect overall order.
     */
    optimize(): void;
}
export declare class SortField {
    /**
     * name/path of field to sort by.
     */
    name: string;
    /**
     * whether to sort ascending (true) or descending (false).
     */
    ascending: boolean;
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    constructor(other?: SortField);
    /**
     * parses a JSON literal such as '-rating' into this instance.
     *
     * @param json data, such as '-rating'.
     * @return {SortField} this instance.
     */
    fromJSON(json: string): SortField;
    /**
     * formats a JSON literal such as 'name'.
     *
     * @return {string} JSON literal such as 'name'.
     */
    toJSON(): string;
    /**
     * formats a string such as '+name'.
     *
     * @return {string} such as '+name'.
     */
    toString(): string;
}
