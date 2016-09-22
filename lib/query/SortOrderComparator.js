/*
 * @file query/SortOrderComparator.ts
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
var SortOrder_1 = require('./SortOrder');
var JsonPath_1 = require('./JsonPath');
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param arg defining the SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
function jsonCompare(arg, options) {
    var sortOrder;
    if (typeof arg === 'string') {
        sortOrder = new SortOrder_1.SortOrder();
        sortOrder.fromJSON([arg]);
    }
    else if (_.isArray(arg)) {
        sortOrder = new SortOrder_1.SortOrder();
        sortOrder.fromJSON(arg);
    }
    else {
        sortOrder = arg;
    }
    var comparator = new SortOrderComparator(sortOrder, options);
    return (_.bind(comparator.compare, comparator));
}
exports.jsonCompare = jsonCompare;
/**
 * compiled SortOrder for comparison of objects.
 *
 * @see SortOrder
 */
var SortOrderComparator = (function () {
    /**
     * constructs a compiled SortOrder for object comparison.
     *
     * @param sortOrder to realize.
     */
    function SortOrderComparator(sortOrder, options) {
        this.sortOrder = sortOrder;
        this.options = {
            casesensitive: false
        };
        if (options) {
            _.extend(this.options, options);
        }
        this.expressions = new Array(sortOrder.sortFields.length);
        for (var i = 0; i < this.expressions.length; ++i) {
            this.expressions[i] = new JsonPath_1.JsonPath(sortOrder.sortFields[i].name);
        }
    }
    /**
     * compares objects in a way compatible to Array.sort().
     *
     * @param o1 left operand.
     * @param o2 right operand.
     * @return {number} indicating relative ordering of operands.
     */
    SortOrderComparator.prototype.compare = function (o1, o2) {
        for (var i = 0; i < this.sortOrder.sortFields.length; ++i) {
            var expression = this.expressions[i];
            var val1 = expression.evaluate(o1);
            var val2 = expression.evaluate(o2);
            var cmp = this.compare1(val1, val2);
            if (cmp !== 0) {
                return this.sortOrder.sortFields[i].ascending ? +cmp : -cmp;
            }
        }
        return 0;
    };
    /**
     * compares values in a way compatible to Array.sort().
     *
     * @param o1 left operand.
     * @param o2 right operand.
     * @return {number} indicating relative ordering of operands.
     */
    SortOrderComparator.prototype.compare1 = function (val1, val2) {
        if (!val1 || !val2) {
            // null/undefined case
            if (val2) {
                return -1;
            }
            if (val1) {
                return +1;
            }
        }
        else if (Array.isArray(val1) || Array.isArray(val2)) {
            // array case
            var items1 = Array.isArray(val1) ? val1 : [val1];
            var items2 = Array.isArray(val2) ? val2 : [val2];
            var length = Math.max(items1.length, items2.length);
            for (var i = 0; i < length; ++i) {
                var c = this.compare1(items1[i], items2[i]);
                if (c !== 0) {
                    return c;
                }
            }
        }
        else {
            // comparision case
            if (!this.options.casesensitive) {
                if (typeof val1 === 'string') {
                    val1 = val1.toLowerCase();
                }
                if (typeof val2 === 'string') {
                    val2 = val2.toLowerCase();
                }
            }
            // value case
            if (val1 < val2) {
                return -1;
            }
            if (val1 > val2) {
                return +1;
            }
        }
        return 0;
    };
    return SortOrderComparator;
}());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU29ydE9yZGVyQ29tcGFyYXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9xdWVyeS9Tb3J0T3JkZXJDb21wYXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLHlCQUF1QixZQUFZLENBQUMsQ0FBQTtBQWlEcEM7Ozs7O0dBS0c7QUFDSCxxQkFBK0IsR0FBa0MsRUFBRSxPQUE0QjtJQUU3RixJQUFJLFNBQW9CLENBQUM7SUFDekIsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUM1QixTQUFTLEdBQUcsSUFBSSxxQkFBUyxFQUFFLENBQUM7UUFDNUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFFLEdBQUcsQ0FBRSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQixTQUFTLEdBQUcsSUFBSSxxQkFBUyxFQUFFLENBQUM7UUFDNUIsU0FBUyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixTQUFTLEdBQUcsR0FBRyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxJQUFJLFVBQVUsR0FBRyxJQUFJLG1CQUFtQixDQUFJLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNoRSxNQUFNLENBQW1CLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQztBQWZlLG1CQUFXLGNBZTFCLENBQUE7QUFF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QUNILDBCQUFDO0FBQUQsQ0FBQyxBQS9GRCxJQStGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBxdWVyeS9Tb3J0T3JkZXJDb21wYXJhdG9yLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyMi4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgcXVlcnlcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0IHtTb3J0T3JkZXJ9IGZyb20gJy4vU29ydE9yZGVyJztcbmltcG9ydCB7SnNvblBhdGh9IGZyb20gJy4vSnNvblBhdGgnO1xuXG4vKipcbiAqIG9wdGlvbnMgb2YgI2pzb25Db21wYXJlIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEpzb25Db21wYXJlT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBzZXQgdG8gZXhwbGljaXRseSB1c2UgY2FzZS1zZW5zaXRpdmUgc3RyaW5nIG1hdGNoaW5nLCBldmFsYXRlcyB0byBmYWxzZSB0byB1c2UgbWF0Y2hpbmdcbiAgICogc2VtYW50aWNzIG9mIFdlYlNRTC5cbiAgICovXG4gIGNhc2VzZW5zaXRpdmU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIGNvbXBpbGVkIGNvbXBhcmUgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSnNvbkNvbXBhcmVGbjxUPiB7XG4gIC8qKlxuICAgKiBjb21wYXJlcyBvYmplY3RzIGluIGEgd2F5IGNvbXBhdGlibGUgdG8gQXJyYXkuc29ydCgpLlxuICAgKlxuICAgKiBAcGFyYW0gbzEgbGVmdCBvcGVyYW5kLlxuICAgKiBAcGFyYW0gbzIgcmlnaHQgb3BlcmFuZC5cbiAgICogQHJldHVybiB7bnVtYmVyfSBpbmRpY2F0aW5nIHJlbGF0aXZlIG9yZGVyaW5nIG9mIG9wZXJhbmRzLlxuICAgKi9cbiAgKG8xOiBULCBvMjogVCk6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBjb21waWxlcyBhIEpzb25Db21wYXJlRm4gZnJvbSBhIGdpdmVuIFNvcnRPcmRlci5cbiAqXG4gKiBAcGFyYW0ganNvbiBvZiBTb3J0T3JkZXIgYmVpbmcgY29tcGlsZWQuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gYSBKc29uQ29tcGFyZUZuIGZ1bmN0aW9uIGNvbXBhdGlibGUgdG8gQXJyYXkuc29ydCgpLlxuICovXG5leHBvcnQgZnVuY3Rpb24ganNvbkNvbXBhcmU8VD4oanNvbjogc3RyaW5nLCBvcHRpb25zPzogSnNvbkNvbXBhcmVPcHRpb25zKTogSnNvbkNvbXBhcmVGbjxUPjtcbi8qKlxuICogY29tcGlsZXMgYSBKc29uQ29tcGFyZUZuIGZyb20gYSBnaXZlbiBTb3J0T3JkZXIuXG4gKlxuICogQHBhcmFtIGpzb24gb2YgU29ydE9yZGVyIGJlaW5nIGNvbXBpbGVkLlxuICogQHJldHVybiB7ZnVuY3Rpb259IGEgSnNvbkNvbXBhcmVGbiBmdW5jdGlvbiBjb21wYXRpYmxlIHRvIEFycmF5LnNvcnQoKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGpzb25Db21wYXJlPFQ+KGpzb246IHN0cmluZ1tdLCBvcHRpb25zPzogSnNvbkNvbXBhcmVPcHRpb25zKTogSnNvbkNvbXBhcmVGbjxUPjtcbi8qKlxuICogY29tcGlsZXMgYSBKc29uQ29tcGFyZUZuIGZyb20gYSBnaXZlbiBTb3J0T3JkZXIuXG4gKlxuICogQHBhcmFtIHNvcnRPcmRlciBiZWluZyBjb21waWxlZC5cbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBhIEpzb25Db21wYXJlRm4gZnVuY3Rpb24gY29tcGF0aWJsZSB0byBBcnJheS5zb3J0KCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uQ29tcGFyZTxUPihzb3J0T3JkZXI6IFNvcnRPcmRlciwgb3B0aW9ucz86IEpzb25Db21wYXJlT3B0aW9ucyk6XG4gIEpzb25Db21wYXJlRm48VD47XG4vKipcbiAqIGNvbXBpbGVzIGEgSnNvbkNvbXBhcmVGbiBmcm9tIGEgZ2l2ZW4gU29ydE9yZGVyLlxuICpcbiAqIEBwYXJhbSBhcmcgZGVmaW5pbmcgdGhlIFNvcnRPcmRlciBiZWluZyBjb21waWxlZC5cbiAqIEByZXR1cm4ge2Z1bmN0aW9ufSBhIEpzb25Db21wYXJlRm4gZnVuY3Rpb24gY29tcGF0aWJsZSB0byBBcnJheS5zb3J0KCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uQ29tcGFyZTxUPihhcmc6IHN0cmluZyB8IHN0cmluZ1tdIHwgU29ydE9yZGVyLCBvcHRpb25zPzogSnNvbkNvbXBhcmVPcHRpb25zKTpcbiAgSnNvbkNvbXBhcmVGbjxUPiB7XG4gIHZhciBzb3J0T3JkZXI6IFNvcnRPcmRlcjtcbiAgaWYgKHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnKSB7XG4gICAgc29ydE9yZGVyID0gbmV3IFNvcnRPcmRlcigpO1xuICAgIHNvcnRPcmRlci5mcm9tSlNPTihbIGFyZyBdKTtcbiAgfSBlbHNlIGlmIChfLmlzQXJyYXkoYXJnKSkge1xuICAgIHNvcnRPcmRlciA9IG5ldyBTb3J0T3JkZXIoKTtcbiAgICBzb3J0T3JkZXIuZnJvbUpTT04oYXJnKTtcbiAgfSBlbHNlIHtcbiAgICBzb3J0T3JkZXIgPSBhcmc7XG4gIH1cblxuICB2YXIgY29tcGFyYXRvciA9IG5ldyBTb3J0T3JkZXJDb21wYXJhdG9yPFQ+KHNvcnRPcmRlciwgb3B0aW9ucyk7XG4gIHJldHVybiA8SnNvbkNvbXBhcmVGbjxUPj4oXy5iaW5kKGNvbXBhcmF0b3IuY29tcGFyZSwgY29tcGFyYXRvcikpO1xufVxuXG4vKipcbiAqIGNvbXBpbGVkIFNvcnRPcmRlciBmb3IgY29tcGFyaXNvbiBvZiBvYmplY3RzLlxuICpcbiAqIEBzZWUgU29ydE9yZGVyXG4gKi9cbmNsYXNzIFNvcnRPcmRlckNvbXBhcmF0b3I8VD4ge1xuXG4gIHByb3RlY3RlZCBvcHRpb25zOiBKc29uQ29tcGFyZU9wdGlvbnMgPSB7XG4gICAgY2FzZXNlbnNpdGl2ZTogZmFsc2VcbiAgfTtcblxuICAvKipcbiAgICogY29tcGlsZWQgYWNjZXNzb3IgcGF0aHMgb2YgU29ydEZpZWxkIGRhdGEuXG4gICAqL1xuICBwcml2YXRlIGV4cHJlc3Npb25zOiBKc29uUGF0aFtdO1xuXG4gIC8qKlxuICAgKiBjb25zdHJ1Y3RzIGEgY29tcGlsZWQgU29ydE9yZGVyIGZvciBvYmplY3QgY29tcGFyaXNvbi5cbiAgICpcbiAgICogQHBhcmFtIHNvcnRPcmRlciB0byByZWFsaXplLlxuICAgKi9cbiAgcHVibGljIGNvbnN0cnVjdG9yKHByaXZhdGUgc29ydE9yZGVyOiBTb3J0T3JkZXIsIG9wdGlvbnM/OiBKc29uQ29tcGFyZU9wdGlvbnMpIHtcbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB9XG5cbiAgICB0aGlzLmV4cHJlc3Npb25zID0gbmV3IEFycmF5PEpzb25QYXRoPihzb3J0T3JkZXIuc29ydEZpZWxkcy5sZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5leHByZXNzaW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgdGhpcy5leHByZXNzaW9uc1tpXSA9IG5ldyBKc29uUGF0aChzb3J0T3JkZXIuc29ydEZpZWxkc1tpXS5uYW1lKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogY29tcGFyZXMgb2JqZWN0cyBpbiBhIHdheSBjb21wYXRpYmxlIHRvIEFycmF5LnNvcnQoKS5cbiAgICpcbiAgICogQHBhcmFtIG8xIGxlZnQgb3BlcmFuZC5cbiAgICogQHBhcmFtIG8yIHJpZ2h0IG9wZXJhbmQuXG4gICAqIEByZXR1cm4ge251bWJlcn0gaW5kaWNhdGluZyByZWxhdGl2ZSBvcmRlcmluZyBvZiBvcGVyYW5kcy5cbiAgICovXG4gIHB1YmxpYyBjb21wYXJlKG8xOiBULCBvMjogVCk6IG51bWJlciB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLnNvcnRPcmRlci5zb3J0RmllbGRzLmxlbmd0aDsgKytpKSB7XG4gICAgICB2YXIgZXhwcmVzc2lvbiA9IHRoaXMuZXhwcmVzc2lvbnNbaV07XG4gICAgICB2YXIgdmFsMSA9IGV4cHJlc3Npb24uZXZhbHVhdGUobzEpO1xuICAgICAgdmFyIHZhbDIgPSBleHByZXNzaW9uLmV2YWx1YXRlKG8yKTtcbiAgICAgIHZhciBjbXAgPSB0aGlzLmNvbXBhcmUxKHZhbDEsIHZhbDIpO1xuICAgICAgaWYgKGNtcCAhPT0gMCkge1xuICAgICAgICByZXR1cm4gdGhpcy5zb3J0T3JkZXIuc29ydEZpZWxkc1tpXS5hc2NlbmRpbmcgPyArY21wIDogLWNtcDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIDA7XG4gIH1cblxuICAvKipcbiAgICogY29tcGFyZXMgdmFsdWVzIGluIGEgd2F5IGNvbXBhdGlibGUgdG8gQXJyYXkuc29ydCgpLlxuICAgKlxuICAgKiBAcGFyYW0gbzEgbGVmdCBvcGVyYW5kLlxuICAgKiBAcGFyYW0gbzIgcmlnaHQgb3BlcmFuZC5cbiAgICogQHJldHVybiB7bnVtYmVyfSBpbmRpY2F0aW5nIHJlbGF0aXZlIG9yZGVyaW5nIG9mIG9wZXJhbmRzLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wYXJlMSh2YWwxOiBhbnksIHZhbDI6IGFueSk6IG51bWJlciB7XG4gICAgaWYgKCF2YWwxIHx8ICF2YWwyKSB7XG4gICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXG4gICAgICBpZiAodmFsMikge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAodmFsMSkge1xuICAgICAgICByZXR1cm4gKzE7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHZhbDEpIHx8IEFycmF5LmlzQXJyYXkodmFsMikpIHtcbiAgICAgIC8vIGFycmF5IGNhc2VcbiAgICAgIHZhciBpdGVtczEgPSBBcnJheS5pc0FycmF5KHZhbDEpID8gdmFsMSA6IFt2YWwxXTtcbiAgICAgIHZhciBpdGVtczIgPSBBcnJheS5pc0FycmF5KHZhbDIpID8gdmFsMiA6IFt2YWwyXTtcbiAgICAgIHZhciBsZW5ndGggPSBNYXRoLm1heChpdGVtczEubGVuZ3RoLCBpdGVtczIubGVuZ3RoKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyArK2kpIHtcbiAgICAgICAgdmFyIGMgPSB0aGlzLmNvbXBhcmUxKGl0ZW1zMVtpXSwgaXRlbXMyW2ldKTtcbiAgICAgICAgaWYgKGMgIT09IDApIHtcbiAgICAgICAgICByZXR1cm4gYztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb21wYXJpc2lvbiBjYXNlXG4gICAgICBpZiAoIXRoaXMub3B0aW9ucy5jYXNlc2Vuc2l0aXZlKSB7XG4gICAgICAgIGlmICh0eXBlb2YgdmFsMSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB2YWwxID0gdmFsMS50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2YgdmFsMiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICB2YWwyID0gdmFsMi50b0xvd2VyQ2FzZSgpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIHZhbHVlIGNhc2VcbiAgICAgIGlmICh2YWwxIDwgdmFsMikge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9XG4gICAgICBpZiAodmFsMSA+IHZhbDIpIHtcbiAgICAgICAgcmV0dXJuICsxO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gMDtcbiAgfVxufVxuIl19