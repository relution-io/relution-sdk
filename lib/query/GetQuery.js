/**
 * @file query/GetQuery.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.06.2015
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var _ = require('lodash');
var SortOrder_1 = require('./SortOrder');
/**
 * general query parameters.
 *
 * Caution, member fields eventually are shared by multiple instances! You may mutate member
 * fields, but not the objects and arrays referenced by them.
 */
var GetQuery = (function () {
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    function GetQuery(other) {
        if (other) {
            this.limit = other.limit;
            this.offset = other.offset;
            this.sortOrder = other.sortOrder;
            this.filter = other.filter;
            this.fields = other.fields;
        }
    }
    Object.defineProperty(GetQuery.prototype, "min", {
        get: function () {
            return this.offset || 0;
        },
        set: function (value) {
            var offset = value && value !== 0 ? value : undefined;
            if (offset !== this.offset) {
                var max = this.max;
                this.offset = offset;
                this.max = max;
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(GetQuery.prototype, "max", {
        get: function () {
            return this.limit ? (this.limit + this.min) : Infinity;
        },
        set: function (value) {
            var limit = value && value !== Infinity ? (value - this.min) : undefined;
            if (limit !== this.limit) {
                var min = this.min;
                this.limit = limit;
                this.min = min;
            }
        },
        enumerable: true,
        configurable: true
    });
    GetQuery.prototype.fromJSON = function (json) {
        this.limit = json.limit;
        this.offset = json.offset;
        this.sortOrder = json.sortOrder && new SortOrder_1.SortOrder().fromJSON(json.sortOrder);
        this.filter = json.filter;
        this.fields = json.fields;
        return this;
    };
    GetQuery.isAndFilter = function (filter) {
        return filter.type === 'logOp' && filter.operation === 'and';
    };
    GetQuery.prototype.merge = function (other) {
        this.min = Math.max(this.min, other.min);
        this.max = Math.min(this.max, other.max);
        if (!this.sortOrder) {
            this.sortOrder = other.sortOrder && new SortOrder_1.SortOrder(other.sortOrder);
        }
        else if (other.sortOrder) {
            this.sortOrder.merge(other.sortOrder);
        }
        if (!this.filter) {
            this.filter = other.filter;
        }
        else if (other.filter) {
            this.filter = {
                type: 'logOp',
                operation: 'and',
                filters: [
                    this.filter,
                    other.filter
                ]
            };
        }
        if (!this.fields) {
            this.fields = other.fields;
        }
        else if (other.fields) {
            this.fields = this.fields.concat(other.fields);
        }
    };
    GetQuery.prototype.optimize = function () {
        if (this.sortOrder) {
            this.sortOrder.optimize();
        }
        if (this.filter && GetQuery.isAndFilter(this.filter)) {
            // following loop flattens nested and filters by recursively replacing them by their children
            var filters = this.filter.filters;
            for (var i = filters.length - 1; i >= 0; --i) {
                if (GetQuery.isAndFilter(filters[i])) {
                    // replace current filter with nested filters
                    var nestedFilters = filters[i].filters;
                    Array.prototype.splice.apply(filters, Array.prototype.concat([i, 1], nestedFilters));
                    i += nestedFilters.length;
                }
            }
        }
        if (this.fields) {
            // not an unsorted unique to have resulting array sorted
            Array.prototype.sort.apply(this.fields);
            this.fields = _.sortedUniq(this.fields);
        }
    };
    /**
     * computes query string from this instance.
     *
     * @return {string} of query parameters encoded for URIs, may be undefined if this object is
     *    empty.
     */
    GetQuery.prototype.toQueryParams = function () {
        var params = '';
        if (this.limit) {
            params += '&limit=' + this.limit;
        }
        if (this.offset) {
            params += '&offset=' + this.offset;
        }
        if (this.sortOrder) {
            var sortOrder = this.sortOrder.toString();
            if (sortOrder) {
                params += '&sortOrder=' + encodeURIComponent(sortOrder);
            }
        }
        if (this.filter) {
            params += '&filter=' + encodeURIComponent(JSON.stringify(this.filter));
        }
        if (this.fields) {
            var length = this.fields.length;
            for (var i = 0; i < length; ++i) {
                params += '&field=' + this.fields[i];
            }
        }
        return params && params.substr(1);
    };
    return GetQuery;
}());
exports.GetQuery = GetQuery;
//# sourceMappingURL=GetQuery.js.map