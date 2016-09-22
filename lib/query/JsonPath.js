/*
 * @file query/JsonPath.ts
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
/**
 * external evaluation function of JSONPath library.
 *
 * @see https://libraries.io/bower/JSONPath
 */
var jsonPath = require('JSONPath');
/**
 * compiled JSON path expression.
 *
 * @see http://goessner.net/articles/JsonPath/
 * @see https://libraries.io/bower/JSONPath
 */
var JsonPath = (function () {
    /**
     * constructs a compiled expression.
     *
     * @param expression to compile.
     */
    function JsonPath(expression) {
        this.expression = jsonPath.eval(null, expression, {
            resultType: 'PATH'
        }) || expression;
        this.simple = /^\w+$/.test(this.expression);
    }
    /**
     * evaluates the expression on a target object.
     *
     * @param obj to evaluate expression on.
     * @param arg options object.
     * @return{any} result of evaluating expression on object.
     */
    JsonPath.prototype.evaluate = function (obj, arg) {
        if (!arg && this.simple) {
            // fastpath
            return obj && obj[this.expression];
        }
        var result = jsonPath.eval(obj, this.expression, arg || {
            wrap: false
        });
        // when result is false it might indicate a missing value,
        // we differentiate by requesting the path here
        if (arg || result !== false || jsonPath.eval(obj, this.expression, {
            resultType: 'PATH',
            wrap: false
        })) {
            return result;
        }
        // intentionally we do not return a value here...
    };
    return JsonPath;
}());
exports.JsonPath = JsonPath;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSnNvblBhdGguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcXVlcnkvSnNvblBhdGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTjs7OztHQUlHO0FBQ0gsSUFBTSxRQUFRLEdBVVYsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRXhCOzs7OztHQUtHO0FBQ0g7SUFXRTs7OztPQUlHO0lBQ0gsa0JBQVksVUFBa0I7UUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDaEQsVUFBVSxFQUFFLE1BQU07U0FDbkIsQ0FBQyxJQUFJLFVBQVUsQ0FBQztRQUNqQixJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCwyQkFBUSxHQUFSLFVBQVMsR0FBUSxFQUFFLEdBQVE7UUFDekIsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDeEIsV0FBVztZQUNYLE1BQU0sQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyQyxDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLElBQUk7WUFDdEQsSUFBSSxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUM7UUFDSCwwREFBMEQ7UUFDMUQsK0NBQStDO1FBQy9DLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUU7WUFDL0QsVUFBVSxFQUFFLE1BQU07WUFDbEIsSUFBSSxFQUFFLEtBQUs7U0FDWixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQ0QsaURBQWlEO0lBQ25ELENBQUM7SUFDSCxlQUFDO0FBQUQsQ0FBQyxBQWpERCxJQWlEQztBQWpEWSxnQkFBUSxXQWlEcEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBxdWVyeS9Kc29uUGF0aC50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjIuMDYuMjAxNVxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHF1ZXJ5XG4gKi9cbi8qKiAqL1xuXG4vKipcbiAqIGV4dGVybmFsIGV2YWx1YXRpb24gZnVuY3Rpb24gb2YgSlNPTlBhdGggbGlicmFyeS5cbiAqXG4gKiBAc2VlIGh0dHBzOi8vbGlicmFyaWVzLmlvL2Jvd2VyL0pTT05QYXRoXG4gKi9cbmNvbnN0IGpzb25QYXRoOiB7XG4gIC8qKlxuICAgKiBldmFsdWF0ZXMgYSBKU09OUGF0aCBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gb2JqIHRvIGV2YWx1YXRlIGV4cHJlc3Npb24gb24uXG4gICAqIEBwYXJhbSBleHByIHRvIGV2YWx1YXRlIG9uIG9iamVjdC5cbiAgICogQHBhcmFtIGFyZyBvcHRpb25zIG9iamVjdC5cbiAgICogQHJldHVybnthbnl9IHJlc3VsdCBvZiBldmFsdWF0aW5nIGV4cHJlc3Npb24gb24gb2JqZWN0LlxuICAgKi9cbiAgZXZhbDogKG9iajogYW55LCBleHByOiBzdHJpbmcsIGFyZz86IHt9KSA9PiBhbnk7XG59ID0gcmVxdWlyZSgnSlNPTlBhdGgnKTtcblxuLyoqXG4gKiBjb21waWxlZCBKU09OIHBhdGggZXhwcmVzc2lvbi5cbiAqXG4gKiBAc2VlIGh0dHA6Ly9nb2Vzc25lci5uZXQvYXJ0aWNsZXMvSnNvblBhdGgvXG4gKiBAc2VlIGh0dHBzOi8vbGlicmFyaWVzLmlvL2Jvd2VyL0pTT05QYXRoXG4gKi9cbmV4cG9ydCBjbGFzcyBKc29uUGF0aCB7XG4gIC8qKlxuICAgKiBub3JtYWxpemVkIEpTT04gcGF0aCBleHByZXNzaW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBleHByZXNzaW9uOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIHdoZXRoZXIgdGhlIGV4cHJlc3Npb24gaXMgYSBzaW1wbGUgcHJvcGVydHkgYWNjZXNzLlxuICAgKi9cbiAgcHJpdmF0ZSBzaW1wbGU6IGJvb2xlYW47XG5cbiAgLyoqXG4gICAqIGNvbnN0cnVjdHMgYSBjb21waWxlZCBleHByZXNzaW9uLlxuICAgKlxuICAgKiBAcGFyYW0gZXhwcmVzc2lvbiB0byBjb21waWxlLlxuICAgKi9cbiAgY29uc3RydWN0b3IoZXhwcmVzc2lvbjogc3RyaW5nKSB7XG4gICAgdGhpcy5leHByZXNzaW9uID0ganNvblBhdGguZXZhbChudWxsLCBleHByZXNzaW9uLCB7XG4gICAgICByZXN1bHRUeXBlOiAnUEFUSCdcbiAgICB9KSB8fCBleHByZXNzaW9uO1xuICAgIHRoaXMuc2ltcGxlID0gL15cXHcrJC8udGVzdCh0aGlzLmV4cHJlc3Npb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIGV2YWx1YXRlcyB0aGUgZXhwcmVzc2lvbiBvbiBhIHRhcmdldCBvYmplY3QuXG4gICAqXG4gICAqIEBwYXJhbSBvYmogdG8gZXZhbHVhdGUgZXhwcmVzc2lvbiBvbi5cbiAgICogQHBhcmFtIGFyZyBvcHRpb25zIG9iamVjdC5cbiAgICogQHJldHVybnthbnl9IHJlc3VsdCBvZiBldmFsdWF0aW5nIGV4cHJlc3Npb24gb24gb2JqZWN0LlxuICAgKi9cbiAgZXZhbHVhdGUob2JqOiBhbnksIGFyZz86IHt9KTogYW55IHtcbiAgICBpZiAoIWFyZyAmJiB0aGlzLnNpbXBsZSkge1xuICAgICAgLy8gZmFzdHBhdGhcbiAgICAgIHJldHVybiBvYmogJiYgb2JqW3RoaXMuZXhwcmVzc2lvbl07XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IGpzb25QYXRoLmV2YWwob2JqLCB0aGlzLmV4cHJlc3Npb24sIGFyZyB8fCB7XG4gICAgICB3cmFwOiBmYWxzZVxuICAgIH0pO1xuICAgIC8vIHdoZW4gcmVzdWx0IGlzIGZhbHNlIGl0IG1pZ2h0IGluZGljYXRlIGEgbWlzc2luZyB2YWx1ZSxcbiAgICAvLyB3ZSBkaWZmZXJlbnRpYXRlIGJ5IHJlcXVlc3RpbmcgdGhlIHBhdGggaGVyZVxuICAgIGlmIChhcmcgfHwgcmVzdWx0ICE9PSBmYWxzZSB8fCBqc29uUGF0aC5ldmFsKG9iaiwgdGhpcy5leHByZXNzaW9uLCB7XG4gICAgICAgIHJlc3VsdFR5cGU6ICdQQVRIJyxcbiAgICAgICAgd3JhcDogZmFsc2VcbiAgICAgIH0pKSB7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgICAvLyBpbnRlbnRpb25hbGx5IHdlIGRvIG5vdCByZXR1cm4gYSB2YWx1ZSBoZXJlLi4uXG4gIH1cbn1cbiJdfQ==