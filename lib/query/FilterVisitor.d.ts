/**
 * @module query
 */
/** */
import * as filters from './Filter';
export interface FilterVisitorCore<T> {
    andOp(filter: filters.LogOpFilter): T;
    orOp(filter: filters.LogOpFilter): T;
    nandOp(filter: filters.LogOpFilter): T;
    norOp(filter: filters.LogOpFilter): T;
    boolean(filter: filters.BooleanFilter): T;
    containsString(filter: filters.ContainsStringFilter): T;
    dateRange(filter: filters.DateRangeFilter): T;
    doubleRange(filter: filters.DoubleRangeFilter): T;
    like(filter: filters.LikeFilter): T;
    logOp(filter: filters.LogOpFilter): T;
    longEnum(filter: filters.LongEnumFilter): T;
    longRange(filter: filters.LongRangeFilter): T;
    stringEnum(filter: filters.StringEnumFilter): T;
    string(filter: filters.StringFilter): T;
    stringMap(filter: filters.StringMapFilter): T;
    stringRange(filter: filters.StringRangeFilter): T;
    null(filter: filters.NullFilter): T;
}
export declare class FilterVisitorBase<T> {
    visit(filter: filters.Filter): T;
    logOp(filter: filters.LogOpFilter): T;
}
