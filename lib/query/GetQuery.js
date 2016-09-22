/*
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
/**
 * @module query
 */
/** */
"use strict";
var _ = require('lodash');
var Filter_1 = require('./Filter');
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
        if (json.filter && !Filter_1.isFilter(json.filter)) {
            throw new Error('unknown type of filter: ' + json.filter.type);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR2V0UXVlcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcXVlcnkvR2V0UXVlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU1Qix1QkFBNEMsVUFBVSxDQUFDLENBQUE7QUFDdkQsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBRXRDOzs7OztHQUtHO0FBQ0g7SUFnQ0U7Ozs7T0FJRztJQUNILGtCQUFtQixLQUFnQjtRQUNqQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ3pCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztZQUUzQixJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDakMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDO1lBRTNCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQztRQUM3QixDQUFDO0lBQ0gsQ0FBQztJQXRDRCxzQkFBVyx5QkFBRzthQUFkO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDO1FBQzFCLENBQUM7YUFDRCxVQUFlLEtBQWE7WUFDMUIsSUFBSSxNQUFNLEdBQUcsS0FBSyxJQUFJLEtBQUssS0FBSyxDQUFDLEdBQUcsS0FBSyxHQUFHLFNBQVMsQ0FBQztZQUN0RCxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxD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QUFDO1lBQzFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2QsTUFBTSxJQUFJLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMxRCxDQUFDO1FBQ0gsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxVQUFVLEdBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDaEIsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDaEMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsTUFBTSxJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3ZDLENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDSCxlQUFDO0FBQUQsQ0FBQyxBQWxLRCxJQWtLQztBQWxLWSxnQkFBUSxXQWtLcEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBxdWVyeS9HZXRRdWVyeS50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjIuMDYuMjAxNVxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHF1ZXJ5XG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5cbmltcG9ydCB7aXNGaWx0ZXIsIEZpbHRlciwgTG9nT3BGaWx0ZXJ9IGZyb20gJy4vRmlsdGVyJztcbmltcG9ydCB7U29ydE9yZGVyfSBmcm9tICcuL1NvcnRPcmRlcic7XG5cbi8qKlxuICogZ2VuZXJhbCBxdWVyeSBwYXJhbWV0ZXJzLlxuICpcbiAqIENhdXRpb24sIG1lbWJlciBmaWVsZHMgZXZlbnR1YWxseSBhcmUgc2hhcmVkIGJ5IG11bHRpcGxlIGluc3RhbmNlcyEgWW91IG1heSBtdXRhdGUgbWVtYmVyXG4gKiBmaWVsZHMsIGJ1dCBub3QgdGhlIG9iamVjdHMgYW5kIGFycmF5cyByZWZlcmVuY2VkIGJ5IHRoZW0uXG4gKi9cbmV4cG9ydCBjbGFzcyBHZXRRdWVyeSB7XG4gIHB1YmxpYyBsaW1pdDogbnVtYmVyO1xuICBwdWJsaWMgb2Zmc2V0OiBudW1iZXI7XG5cbiAgcHVibGljIHNvcnRPcmRlcjogU29ydE9yZGVyO1xuICBwdWJsaWMgZmlsdGVyOiBGaWx0ZXI7XG5cbiAgcHVibGljIGZpZWxkczogc3RyaW5nW107XG5cbiAgcHVibGljIGdldCBtaW4oKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5vZmZzZXQgfHwgMDtcbiAgfVxuICBwdWJsaWMgc2V0IG1pbih2YWx1ZTogbnVtYmVyKSB7XG4gICAgdmFyIG9mZnNldCA9IHZhbHVlICYmIHZhbHVlICE9PSAwID8gdmFsdWUgOiB1bmRlZmluZWQ7XG4gICAgaWYgKG9mZnNldCAhPT0gdGhpcy5vZmZzZXQpIHtcbiAgICAgIHZhciBtYXggPSB0aGlzLm1heDtcbiAgICAgIHRoaXMub2Zmc2V0ID0gb2Zmc2V0O1xuICAgICAgdGhpcy5tYXggPSBtYXg7XG4gICAgfVxuICB9XG4gIHB1YmxpYyBnZXQgbWF4KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMubGltaXQgPyAodGhpcy5saW1pdCArIHRoaXMubWluKSA6IEluZmluaXR5O1xuICB9XG4gIHB1YmxpYyBzZXQgbWF4KHZhbHVlOiBudW1iZXIpIHtcbiAgICB2YXIgbGltaXQgPSB2YWx1ZSAmJiB2YWx1ZSAhPT0gSW5maW5pdHkgPyAodmFsdWUgLSB0aGlzLm1pbikgOiB1bmRlZmluZWQ7XG4gICAgaWYgKGxpbWl0ICE9PSB0aGlzLmxpbWl0KSB7XG4gICAgICB2YXIgbWluID0gdGhpcy5taW47XG4gICAgICB0aGlzLmxpbWl0ID0gbGltaXQ7XG4gICAgICB0aGlzLm1pbiA9IG1pbjtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogZGVmYXVsdC9jb3B5IGNvbnN0cnVjdG9yLlxuICAgKlxuICAgKiBAcGFyYW0gb3RoZXIgaW5zdGFuY2UgdG8gb3B0aW9uYWxseSBpbml0aWFsaXplIGFuIGluZGVwZW5kZW50IGNvcHkgb2YuXG4gICAqL1xuICBwdWJsaWMgY29uc3RydWN0b3Iob3RoZXI/OiBHZXRRdWVyeSkge1xuICAgIGlmIChvdGhlcikge1xuICAgICAgdGhpcy5saW1pdCA9IG90aGVyLmxpbWl0O1xuICAgICAgdGhpcy5vZmZzZXQgPSBvdGhlci5vZmZzZXQ7XG5cbiAgICAgIHRoaXMuc29ydE9yZGVyID0gb3RoZXIuc29ydE9yZGVyO1xuICAgICAgdGhpcy5maWx0ZXIgPSBvdGhlci5maWx0ZXI7XG5cbiAgICAgIHRoaXMuZmllbGRzID0gb3RoZXIuZmllbGRzO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBmcm9tSlNPTihqc29uOiB7XG4gICAgbGltaXQ/OiBudW1iZXI7XG4gICAgb2Zmc2V0PzogbnVtYmVyO1xuXG4gICAgc29ydE9yZGVyPzogc3RyaW5nW107XG4gICAgZmlsdGVyPzogeyB0eXBlOiBzdHJpbmcgfTtcblxuICAgIGZpZWxkcz86IHN0cmluZ1tdO1xuICB9KTogR2V0UXVlcnkge1xuICAgIHRoaXMubGltaXQgPSBqc29uLmxpbWl0O1xuICAgIHRoaXMub2Zmc2V0ID0ganNvbi5vZmZzZXQ7XG5cbiAgICB0aGlzLnNvcnRPcmRlciA9IGpzb24uc29ydE9yZGVyICYmIG5ldyBTb3J0T3JkZXIoKS5mcm9tSlNPTihqc29uLnNvcnRPcmRlcik7XG4gICAgaWYgKGpzb24uZmlsdGVyICYmICFpc0ZpbHRlcihqc29uLmZpbHRlcikpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biB0eXBlIG9mIGZpbHRlcjogJyArIGpzb24uZmlsdGVyLnR5cGUpO1xuICAgIH1cbiAgICB0aGlzLmZpbHRlciA9IDxGaWx0ZXI+anNvbi5maWx0ZXI7XG5cbiAgICB0aGlzLmZpZWxkcyA9IGpzb24uZmllbGRzO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBpc0FuZEZpbHRlcihmaWx0ZXI6IEZpbHRlcikge1xuICAgIHJldHVybiBmaWx0ZXIudHlwZSA9PT0gJ2xvZ09wJyAmJiAoPExvZ09wRmlsdGVyPmZpbHRlcikub3BlcmF0aW9uID09PSAnYW5kJztcbiAgfVxuXG4gIHB1YmxpYyBtZXJnZShvdGhlcjogR2V0UXVlcnkpIHtcbiAgICB0aGlzLm1pbiA9IE1hdGgubWF4KHRoaXMubWluLCBvdGhlci5taW4pO1xuICAgIHRoaXMubWF4ID0gTWF0aC5taW4odGhpcy5tYXgsIG90aGVyLm1heCk7XG5cbiAgICBpZiAoIXRoaXMuc29ydE9yZGVyKSB7XG4gICAgICB0aGlzLnNvcnRPcmRlciA9IG90aGVyLnNvcnRPcmRlciAmJiBuZXcgU29ydE9yZGVyKG90aGVyLnNvcnRPcmRlcik7XG4gICAgfSBlbHNlIGlmIChvdGhlci5zb3J0T3JkZXIpIHtcbiAgICAgIHRoaXMuc29ydE9yZGVyLm1lcmdlKG90aGVyLnNvcnRPcmRlcik7XG4gICAgfVxuXG4gICAgaWYgKCF0aGlzLmZpbHRlcikge1xuICAgICAgdGhpcy5maWx0ZXIgPSBvdGhlci5maWx0ZXI7XG4gICAgfSBlbHNlIGlmIChvdGhlci5maWx0ZXIpIHtcbiAgICAgIHRoaXMuZmlsdGVyID0gPExvZ09wRmlsdGVyPntcbiAgICAgICAgdHlwZTogJ2xvZ09wJyxcbiAgICAgICAgb3BlcmF0aW9uOiAnYW5kJyxcbiAgICAgICAgZmlsdGVyczogW1xuICAgICAgICAgIHRoaXMuZmlsdGVyLFxuICAgICAgICAgIG90aGVyLmZpbHRlclxuICAgICAgICBdXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmICghdGhpcy5maWVsZHMpIHtcbiAgICAgIHRoaXMuZmllbGRzID0gb3RoZXIuZmllbGRzO1xuICAgIH0gZWxzZSBpZiAob3RoZXIuZmllbGRzKSB7XG4gICAgICB0aGlzLmZpZWxkcyA9IHRoaXMuZmllbGRzLmNvbmNhdChvdGhlci5maWVsZHMpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvcHRpbWl6ZSgpIHtcbiAgICBpZiAodGhpcy5zb3J0T3JkZXIpIHtcbiAgICAgIHRoaXMuc29ydE9yZGVyLm9wdGltaXplKCk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuZmlsdGVyICYmIEdldFF1ZXJ5LmlzQW5kRmlsdGVyKHRoaXMuZmlsdGVyKSkge1xuICAgICAgLy8gZm9sbG93aW5nIGxvb3AgZmxhdHRlbnMgbmVzdGVkIGFuZCBmaWx0ZXJzIGJ5IHJlY3Vyc2l2ZWx5IHJlcGxhY2luZyB0aGVtIGJ5IHRoZWlyIGNoaWxkcmVuXG4gICAgICB2YXIgZmlsdGVycyA9ICg8TG9nT3BGaWx0ZXI+dGhpcy5maWx0ZXIpLmZpbHRlcnM7XG4gICAgICBmb3IgKHZhciBpID0gZmlsdGVycy5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgICBpZiAoR2V0UXVlcnkuaXNBbmRGaWx0ZXIoZmlsdGVyc1tpXSkpIHtcbiAgICAgICAgICAvLyByZXBsYWNlIGN1cnJlbnQgZmlsdGVyIHdpdGggbmVzdGVkIGZpbHRlcnNcbiAgICAgICAgICB2YXIgbmVzdGVkRmlsdGVycyA9ICg8TG9nT3BGaWx0ZXI+ZmlsdGVyc1tpXSkuZmlsdGVycztcbiAgICAgICAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KGZpbHRlcnMsIEFycmF5LnByb3RvdHlwZS5jb25jYXQoW2ksIDFdLCBuZXN0ZWRGaWx0ZXJzKSk7XG4gICAgICAgICAgaSArPSBuZXN0ZWRGaWx0ZXJzLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmZpZWxkcykge1xuICAgICAgLy8gbm90IGFuIHVuc29ydGVkIHVuaXF1ZSB0byBoYXZlIHJlc3VsdGluZyBhcnJheSBzb3J0ZWRcbiAgICAgIEFycmF5LnByb3RvdHlwZS5zb3J0LmFwcGx5KHRoaXMuZmllbGRzKTtcbiAgICAgIHRoaXMuZmllbGRzID0gXy5zb3J0ZWRVbmlxKHRoaXMuZmllbGRzKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogY29tcHV0ZXMgcXVlcnkgc3RyaW5nIGZyb20gdGhpcyBpbnN0YW5jZS5cbiAgICpcbiAgICogQHJldHVybiB7c3RyaW5nfSBvZiBxdWVyeSBwYXJhbWV0ZXJzIGVuY29kZWQgZm9yIFVSSXMsIG1heSBiZSB1bmRlZmluZWQgaWYgdGhpcyBvYmplY3QgaXNcbiAgICogICAgZW1wdHkuXG4gICAqL1xuICBwdWJsaWMgdG9RdWVyeVBhcmFtcygpOiBzdHJpbmcge1xuICAgIHZhciBwYXJhbXMgPSAnJztcbiAgICBpZiAodGhpcy5saW1pdCkge1xuICAgICAgcGFyYW1zICs9ICcmbGltaXQ9JyArIHRoaXMubGltaXQ7XG4gICAgfVxuICAgIGlmICh0aGlzLm9mZnNldCkge1xuICAgICAgcGFyYW1zICs9ICcmb2Zmc2V0PScgKyB0aGlzLm9mZnNldDtcbiAgICB9XG4gICAgaWYgKHRoaXMuc29ydE9yZGVyKSB7XG4gICAgICB2YXIgc29ydE9yZGVyID0gdGhpcy5zb3J0T3JkZXIudG9TdHJpbmcoKTtcbiAgICAgIGlmIChzb3J0T3JkZXIpIHtcbiAgICAgICAgcGFyYW1zICs9ICcmc29ydE9yZGVyPScgKyBlbmNvZGVVUklDb21wb25lbnQoc29ydE9yZGVyKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRoaXMuZmlsdGVyKSB7XG4gICAgICBwYXJhbXMgKz0gJyZmaWx0ZXI9JyArICBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkodGhpcy5maWx0ZXIpKTtcbiAgICB9XG4gICAgaWYgKHRoaXMuZmllbGRzKSB7XG4gICAgICB2YXIgbGVuZ3RoID0gdGhpcy5maWVsZHMubGVuZ3RoO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgICBwYXJhbXMgKz0gJyZmaWVsZD0nICsgdGhpcy5maWVsZHNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXMgJiYgcGFyYW1zLnN1YnN0cigxKTtcbiAgfVxufVxuIl19