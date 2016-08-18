/**
 * @module query
 */
/** */
/**
 * kind of Filter as defined by corresponding Java object model.
 */
export declare type FilterType = 'boolean' | 'containsString' | 'dateRange' | 'doubleRange' | 'like' | 'logOp' | 'longEnum' | 'longRange' | 'stringEnum' | 'string' | 'stringMap' | 'stringRange' | 'null';
/**
 * all known valid types of filters.
 *
 * @type {string[]} of all known types of filters.
 */
export declare const filterTypes: string[];
/**
 * checks if a given type value is a valid FilterType value.
 *
 * @param type value to check.
 * @return {boolean} whether type value is valid.
 */
export declare function isFilterType(type: any): type is FilterType;
export interface Filter {
    /**
     * kind of Filter as defined by corresponding Java object model.
     */
    type: FilterType;
}
/**
 * checks if an object is a Filter.
 *
 * @param filter object to check.
 * @return {boolean} whether filter is a filter.
 */
export declare function isFilter(filter: any): filter is Filter;
export interface LogOpFilter extends Filter {
    /**
     * kind of Operation as defined by corresponding Java object model.
     *
     * <p>
     *  - and
     *  - or
     *  - nand
     *  - nor
     * </p>
     */
    operation: string;
    /**
     * filters evaluated with logical operation (filter1 LOGOP filter2 LOGOP filter3...).
     */
    filters: Filter[];
}
export interface FieldFilter extends Filter {
    /**
     * field expression identifying left hand side of the filter.
     */
    fieldName: string;
}
/**
 * implementation detail of the library.
 */
export interface ValueFilter<T> extends FieldFilter {
    value: T;
}
/**
 * implementation detail of the library.
 */
export interface RangeFilter<T> extends FieldFilter {
    min?: T;
    max?: T;
}
/**
 * implementation detail of the library.
 */
export interface EnumFilter<T> extends FieldFilter {
    values: T[];
}
export interface BooleanFilter extends ValueFilter<boolean> {
}
export interface ContainsStringFilter extends FieldFilter {
    contains: string;
}
export interface DateRangeFilter extends RangeFilter<Date> {
}
/**
 * implementation detail of the library.
 */
export interface NumberRangeFilter extends RangeFilter<number> {
}
export interface DoubleRangeFilter extends NumberRangeFilter {
}
export interface LongRangeFilter extends NumberRangeFilter {
}
export interface LikeFilter extends FieldFilter {
    like: string;
}
export interface LongEnumFilter extends EnumFilter<number> {
}
export interface StringEnumFilter extends EnumFilter<string> {
}
export interface StringFilter extends ValueFilter<string> {
}
export interface StringMapFilter extends FieldFilter {
    key?: string;
    value?: string;
}
export interface StringRangeFilter extends RangeFilter<string> {
}
export interface NullFilter extends FieldFilter {
    isNull: boolean;
}
