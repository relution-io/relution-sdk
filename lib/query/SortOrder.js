/*
 * @file query/SortOrder.ts
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
/**
 * defines a sort order of fields.
 *
 * Caution, member fields eventually are shared by multiple instances! You may mutate member
 * fields, but not the objects and arrays referenced by them.
 */
var SortOrder = (function () {
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    function SortOrder(other) {
        this.sortFields = other && other.sortFields;
    }
    /**
     * parses a JSON literal such as ['-rating', '+date', 'id'] into this instance.
     *
     * @param json data, such as ['-rating', '+date'].
     * @return {SortOrder} this instance.
     */
    SortOrder.prototype.fromJSON = function (json) {
        this.sortFields = new Array(json.length);
        for (var i = json.length - 1; i >= 0; --i) {
            this.sortFields[i] = new SortField().fromJSON(json[i]);
        }
        return this;
    };
    /**
     * formats a string such as '+name,-id'.
     *
     * @return {string} representation of SortOrder, may be the empty string when this is empty.
       */
    SortOrder.prototype.toString = function () {
        var str = '';
        var length = this.sortFields.length;
        for (var i = 0; i < length; ++i) {
            if (i > 0) {
                str += ',';
            }
            str += this.sortFields[i].toString();
        }
        return str;
    };
    /**
     * combines an other instance such that this order is maintained by priority and equivalent elements are ordered by
     * the other order.
     *
     * You may want to optimize after merging several instances.
     *
     * @param other order to merge into this as secondary.
     */
    SortOrder.prototype.merge = function (other) {
        this.sortFields = this.sortFields.concat(other.sortFields);
    };
    /**
     * eliminates redundant sort fields that do not affect overall order.
     */
    SortOrder.prototype.optimize = function () {
        this.sortFields = _.uniqBy(this.sortFields, function (sortField) {
            return sortField.name;
        });
    };
    return SortOrder;
}());
exports.SortOrder = SortOrder;
var SortField = (function () {
    /**
     * default/copy constructor.
     *
     * @param other instance to optionally initialize an independent copy of.
     */
    function SortField(other) {
        if (other) {
            this.name = other.name;
            this.ascending = other.ascending;
        }
    }
    /**
     * parses a JSON literal such as '-rating' into this instance.
     *
     * @param json data, such as '-rating'.
     * @return {SortField} this instance.
     */
    SortField.prototype.fromJSON = function (json) {
        var order = json.length > 0 && json.charAt(0);
        this.name = order === '+' || order === '-' ? json.substring(1) : json;
        this.ascending = order !== '-';
        return this;
    };
    /**
     * formats a JSON literal such as 'name'.
     *
     * @return {string} JSON literal such as 'name'.
     */
    SortField.prototype.toJSON = function () {
        return this.ascending ? this.name : '-' + this.name;
    };
    /**
     * formats a string such as '+name'.
     *
     * @return {string} such as '+name'.
     */
    SortField.prototype.toString = function () {
        return this.ascending ? '+' + this.name : '-' + this.name;
    };
    return SortField;
}());
exports.SortField = SortField;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU29ydE9yZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3F1ZXJ5L1NvcnRPcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCOzs7OztHQUtHO0FBQ0g7SUFNRTs7OztPQUlHO0lBQ0gsbUJBQW1CLEtBQWlCO1FBQ2xDLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUM7SUFDOUMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksNEJBQVEsR0FBZixVQUFnQixJQUFjO1FBQzVCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksU0FBUyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOzs7O1NBSUs7SUFDRSw0QkFBUSxHQUFmO1FBQ0UsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7UUFDcEMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDVixHQUFHLElBQUksR0FBRyxDQUFDO1lBQ2IsQ0FBQztZQUNELEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSSx5QkFBSyxHQUFaLFVBQWEsS0FBZ0I7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDN0QsQ0FBQztJQUVEOztPQUVHO0lBQ0ksNEJBQVEsR0FBZjtRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFVBQUMsU0FBb0I7WUFDL0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0gsZ0JBQUM7QUFBRCxDQUFDLEFBbEVELElBa0VDO0FBbEVZLGlCQUFTLFlBa0VyQixDQUFBO0FBRUQ7SUFVRTs7OztPQUlHO0lBQ0gsbUJBQW1CLEtBQWlCO1FBQ2xDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDVixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDdkIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDO1FBQ25DLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSw0QkFBUSxHQUFmLFVBQWdCLElBQVk7UUFDMUIsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssS0FBSyxHQUFHLElBQUksS0FBSyxLQUFLLEdBQUcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN0RSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssS0FBSyxHQUFHLENBQUM7UUFDL0IsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRDs7OztPQUlHO0lBQ0ksMEJBQU0sR0FBYjtRQUNFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDdEQsQ0FBQztJQUVEOzs7O09BSUc7SUFDSSw0QkFBUSxHQUFmO1FBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDNUQsQ0FBQztJQUNILGdCQUFDO0FBQUQsQ0FBQyxBQXBERCxJQW9EQztBQXBEWSxpQkFBUyxZQW9EckIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBxdWVyeS9Tb3J0T3JkZXIudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDIyLjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBxdWVyeVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG4vKipcbiAqIGRlZmluZXMgYSBzb3J0IG9yZGVyIG9mIGZpZWxkcy5cbiAqXG4gKiBDYXV0aW9uLCBtZW1iZXIgZmllbGRzIGV2ZW50dWFsbHkgYXJlIHNoYXJlZCBieSBtdWx0aXBsZSBpbnN0YW5jZXMhIFlvdSBtYXkgbXV0YXRlIG1lbWJlclxuICogZmllbGRzLCBidXQgbm90IHRoZSBvYmplY3RzIGFuZCBhcnJheXMgcmVmZXJlbmNlZCBieSB0aGVtLlxuICovXG5leHBvcnQgY2xhc3MgU29ydE9yZGVyIHtcbiAgLyoqXG4gICAqIG9yZGVyZWQgbGlzdCBvZiBmaWVsZHMgdG8gc29ydCBvbi5cbiAgICovXG4gIHNvcnRGaWVsZHM6IFNvcnRGaWVsZFtdO1xuXG4gIC8qKlxuICAgKiBkZWZhdWx0L2NvcHkgY29uc3RydWN0b3IuXG4gICAqXG4gICAqIEBwYXJhbSBvdGhlciBpbnN0YW5jZSB0byBvcHRpb25hbGx5IGluaXRpYWxpemUgYW4gaW5kZXBlbmRlbnQgY29weSBvZi5cbiAgICovXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihvdGhlcj86IFNvcnRPcmRlcikge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IG90aGVyICYmIG90aGVyLnNvcnRGaWVsZHM7XG4gIH1cblxuICAvKipcbiAgICogcGFyc2VzIGEgSlNPTiBsaXRlcmFsIHN1Y2ggYXMgWyctcmF0aW5nJywgJytkYXRlJywgJ2lkJ10gaW50byB0aGlzIGluc3RhbmNlLlxuICAgKlxuICAgKiBAcGFyYW0ganNvbiBkYXRhLCBzdWNoIGFzIFsnLXJhdGluZycsICcrZGF0ZSddLlxuICAgKiBAcmV0dXJuIHtTb3J0T3JkZXJ9IHRoaXMgaW5zdGFuY2UuXG4gICAqL1xuICBwdWJsaWMgZnJvbUpTT04oanNvbjogc3RyaW5nW10pOiBTb3J0T3JkZXIge1xuICAgIHRoaXMuc29ydEZpZWxkcyA9IG5ldyBBcnJheTxTb3J0RmllbGQ+KGpzb24ubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0ganNvbi5sZW5ndGggLSAxOyBpID49IDA7IC0taSkge1xuICAgICAgdGhpcy5zb3J0RmllbGRzW2ldID0gbmV3IFNvcnRGaWVsZCgpLmZyb21KU09OKGpzb25baV0pO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBmb3JtYXRzIGEgc3RyaW5nIHN1Y2ggYXMgJytuYW1lLC1pZCcuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ30gcmVwcmVzZW50YXRpb24gb2YgU29ydE9yZGVyLCBtYXkgYmUgdGhlIGVtcHR5IHN0cmluZyB3aGVuIHRoaXMgaXMgZW1wdHkuXG4gICAgICovXG4gIHB1YmxpYyB0b1N0cmluZygpOiAgc3RyaW5nIHtcbiAgICB2YXIgc3RyID0gJyc7XG4gICAgdmFyIGxlbmd0aCA9IHRoaXMuc29ydEZpZWxkcy5sZW5ndGg7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7ICsraSkge1xuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIHN0ciArPSAnLCc7XG4gICAgICB9XG4gICAgICBzdHIgKz0gdGhpcy5zb3J0RmllbGRzW2ldLnRvU3RyaW5nKCk7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG4gIH1cblxuICAvKipcbiAgICogY29tYmluZXMgYW4gb3RoZXIgaW5zdGFuY2Ugc3VjaCB0aGF0IHRoaXMgb3JkZXIgaXMgbWFpbnRhaW5lZCBieSBwcmlvcml0eSBhbmQgZXF1aXZhbGVudCBlbGVtZW50cyBhcmUgb3JkZXJlZCBieVxuICAgKiB0aGUgb3RoZXIgb3JkZXIuXG4gICAqXG4gICAqIFlvdSBtYXkgd2FudCB0byBvcHRpbWl6ZSBhZnRlciBtZXJnaW5nIHNldmVyYWwgaW5zdGFuY2VzLlxuICAgKlxuICAgKiBAcGFyYW0gb3RoZXIgb3JkZXIgdG8gbWVyZ2UgaW50byB0aGlzIGFzIHNlY29uZGFyeS5cbiAgICovXG4gIHB1YmxpYyBtZXJnZShvdGhlcjogU29ydE9yZGVyKSB7XG4gICAgdGhpcy5zb3J0RmllbGRzID0gdGhpcy5zb3J0RmllbGRzLmNvbmNhdChvdGhlci5zb3J0RmllbGRzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBlbGltaW5hdGVzIHJlZHVuZGFudCBzb3J0IGZpZWxkcyB0aGF0IGRvIG5vdCBhZmZlY3Qgb3ZlcmFsbCBvcmRlci5cbiAgICovXG4gIHB1YmxpYyBvcHRpbWl6ZSgpIHtcbiAgICB0aGlzLnNvcnRGaWVsZHMgPSBfLnVuaXFCeSh0aGlzLnNvcnRGaWVsZHMsIChzb3J0RmllbGQ6IFNvcnRGaWVsZCkgPT4ge1xuICAgICAgcmV0dXJuIHNvcnRGaWVsZC5uYW1lO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBTb3J0RmllbGQge1xuICAvKipcbiAgICogbmFtZS9wYXRoIG9mIGZpZWxkIHRvIHNvcnQgYnkuXG4gICAqL1xuICBuYW1lOiBzdHJpbmc7XG4gIC8qKlxuICAgKiB3aGV0aGVyIHRvIHNvcnQgYXNjZW5kaW5nICh0cnVlKSBvciBkZXNjZW5kaW5nIChmYWxzZSkuXG4gICAqL1xuICBhc2NlbmRpbmc6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIGRlZmF1bHQvY29weSBjb25zdHJ1Y3Rvci5cbiAgICpcbiAgICogQHBhcmFtIG90aGVyIGluc3RhbmNlIHRvIG9wdGlvbmFsbHkgaW5pdGlhbGl6ZSBhbiBpbmRlcGVuZGVudCBjb3B5IG9mLlxuICAgKi9cbiAgcHVibGljIGNvbnN0cnVjdG9yKG90aGVyPzogU29ydEZpZWxkKSB7XG4gICAgaWYgKG90aGVyKSB7XG4gICAgICB0aGlzLm5hbWUgPSBvdGhlci5uYW1lO1xuICAgICAgdGhpcy5hc2NlbmRpbmcgPSBvdGhlci5hc2NlbmRpbmc7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHBhcnNlcyBhIEpTT04gbGl0ZXJhbCBzdWNoIGFzICctcmF0aW5nJyBpbnRvIHRoaXMgaW5zdGFuY2UuXG4gICAqXG4gICAqIEBwYXJhbSBqc29uIGRhdGEsIHN1Y2ggYXMgJy1yYXRpbmcnLlxuICAgKiBAcmV0dXJuIHtTb3J0RmllbGR9IHRoaXMgaW5zdGFuY2UuXG4gICAqL1xuICBwdWJsaWMgZnJvbUpTT04oanNvbjogc3RyaW5nKTogU29ydEZpZWxkIHtcbiAgICB2YXIgb3JkZXIgPSBqc29uLmxlbmd0aCA+IDAgJiYganNvbi5jaGFyQXQoMCk7XG4gICAgdGhpcy5uYW1lID0gb3JkZXIgPT09ICcrJyB8fCBvcmRlciA9PT0gJy0nID8ganNvbi5zdWJzdHJpbmcoMSkgOiBqc29uO1xuICAgIHRoaXMuYXNjZW5kaW5nID0gb3JkZXIgIT09ICctJztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBmb3JtYXRzIGEgSlNPTiBsaXRlcmFsIHN1Y2ggYXMgJ25hbWUnLlxuICAgKlxuICAgKiBAcmV0dXJuIHtzdHJpbmd9IEpTT04gbGl0ZXJhbCBzdWNoIGFzICduYW1lJy5cbiAgICovXG4gIHB1YmxpYyB0b0pTT04oKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5hc2NlbmRpbmcgPyB0aGlzLm5hbWUgOiAnLScgKyB0aGlzLm5hbWU7XG4gIH1cblxuICAvKipcbiAgICogZm9ybWF0cyBhIHN0cmluZyBzdWNoIGFzICcrbmFtZScuXG4gICAqXG4gICAqIEByZXR1cm4ge3N0cmluZ30gc3VjaCBhcyAnK25hbWUnLlxuICAgKi9cbiAgcHVibGljIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuYXNjZW5kaW5nID8gJysnICsgdGhpcy5uYW1lIDogJy0nICsgdGhpcy5uYW1lO1xuICB9XG59XG4iXX0=