import { Filter } from './Filter';
import { SortOrder } from './SortOrder';
/**
 * general query parameters.
 *
 * Caution, member fields eventually are shared by multiple instances! You may mutate member
 * fields, but not the objects and arrays referenced by them.
 */
export declare class GetQuery {
    limit: number;
    offset: number;
    sortOrder: SortOrder;
    filter: Filter;
    fields: string[];
    min: number;
    max: number;
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    constructor(other?: GetQuery);
    fromJSON(json: {
        limit?: number;
        offset?: number;
        sortOrder?: string[];
        filter?: {
            type: string;
        };
        fields?: string[];
    }): GetQuery;
    private static isAndFilter(filter);
    merge(other: GetQuery): void;
    optimize(): void;
    /**
     * computes query string from this instance.
     *
     * @return {string} of query parameters encoded for URIs, may be undefined if this object is
     *    empty.
     */
    toQueryParams(): string;
}
