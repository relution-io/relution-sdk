/*
 * @file query/JsonFilterVisitor.ts
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
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var FilterVisitor_1 = require('./FilterVisitor');
var JsonPath_1 = require('./JsonPath');
/**
 * compiles a JsonFilterFn from a given Filter tree.
 *
 * @param filter tree being compiled.
 * @param options customizing the matching, entirely optional.
 * @return {function} a JsonFilterFn function.
 */
function jsonFilter(filter, options) {
    return new JsonFilterVisitor(options).visit(filter);
}
exports.jsonFilter = jsonFilter;
/**
 * compiles a Filter tree into a JsonFilterFn.
 */
var JsonFilterVisitor = (function (_super) {
    __extends(JsonFilterVisitor, _super);
    function JsonFilterVisitor(options) {
        _super.call(this);
        this.options = {
            casesensitive: false
        };
        if (options) {
            _.extend(this.options, options);
        }
    }
    JsonFilterVisitor.prototype.containsString = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var contains = filter.contains;
        if (contains === undefined || contains === null) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return value === undefined || value === null;
            };
        }
        var testFn;
        if (this.options.casesensitive) {
            // case-sensitive
            testFn = function (val) {
                return val.toString().indexOf(contains) >= 0;
            };
        }
        else {
            // case-insensitive (RegExp-based)
            var pattern = contains.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
            var regexp = new RegExp(pattern, 'i');
            testFn = function (val) {
                return regexp.test(val.toString());
            };
        }
        return function (obj) {
            var value = expression.evaluate(obj);
            if (value === undefined || value === null) {
                // null/undefined case
                return false;
            }
            else if (_.isArray(value)) {
                // array case
                for (var i = 0; i < value.length; ++i) {
                    var val = value[i];
                    if (val !== undefined && val !== null && testFn(val)) {
                        return true;
                    }
                }
                return false;
            }
            else {
                // simple case
                return testFn(value);
            }
        };
    };
    JsonFilterVisitor.prototype.string = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var expected = filter.value;
        if (expected === undefined || expected === null) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return value === undefined || value === null;
            };
        }
        var testFn;
        if (this.options.casesensitive) {
            // case-sensitive
            testFn = function (val) {
                return val == expected;
            };
        }
        else {
            // case-insensitive (RegExp-based)
            var pattern = expected.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
            var regexp = new RegExp('^' + pattern + '$', 'i');
            testFn = function (val) {
                return regexp.test(val.toString());
            };
        }
        return function (obj) {
            var value = expression.evaluate(obj);
            if (value === undefined || value === null) {
                // null/undefined case
                return false;
            }
            else if (_.isArray(value)) {
                // array case
                for (var i = 0; i < value.length; ++i) {
                    var val = value[i];
                    if (val !== undefined && val !== null && testFn(val)) {
                        return true;
                    }
                }
                return false;
            }
            else {
                // simple case
                return testFn(value);
            }
        };
    };
    JsonFilterVisitor.prototype.range = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var min = filter.min;
        var max = filter.max;
        if (min === undefined || min === null) {
            if (max === undefined || max === null) {
                return function (obj) {
                    var value = expression.evaluate(obj);
                    return !!value;
                };
            }
            else {
                return function (obj) {
                    var value = expression.evaluate(obj);
                    return !!value && value <= max;
                };
            }
        }
        else if (min === max) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return !!value && value == min;
            };
        }
        else {
            if (max === undefined || max === null) {
                return function (obj) {
                    var value = expression.evaluate(obj);
                    return !!value && value >= min;
                };
            }
            else {
                return function (obj) {
                    var value = expression.evaluate(obj);
                    return !!value && value <= max && value >= min;
                };
            }
        }
    };
    JsonFilterVisitor.prototype.longRange = function (filter) {
        return this.range(filter);
    };
    JsonFilterVisitor.prototype.dateRange = function (filter) {
        return this.range(filter);
    };
    JsonFilterVisitor.prototype.stringRange = function (filter) {
        // not case-insensitive in WebSQL and we want same behavior here!
        return this.range(filter);
    };
    JsonFilterVisitor.prototype.doubleRange = function (filter) {
        return this.range(filter);
    };
    JsonFilterVisitor.prototype.boolean = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var expected = filter.value;
        return function (obj) {
            var value = expression.evaluate(obj);
            return !!value === expected;
        };
    };
    JsonFilterVisitor.prototype.enum = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var values = filter.values;
        if (!values) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return !value;
            };
        }
        else {
            return function (obj) {
                var value = expression.evaluate(obj);
                return values.indexOf(value) >= 0;
            };
        }
    };
    JsonFilterVisitor.prototype.stringEnum = function (filter) {
        // not case-insensitive in WebSQL and we want same behavior here!
        return this.enum(filter);
    };
    JsonFilterVisitor.prototype.longEnum = function (filter) {
        return this.enum(filter);
    };
    JsonFilterVisitor.prototype.stringMap = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var property = filter.key !== undefined && filter.key !== null && new JsonPath_1.JsonPath(filter.key);
        var expected = filter.value;
        var testFn;
        if (expected !== undefined && expected !== null) {
            if (this.options.casesensitive) {
                // case-sensitive
                testFn = function (val) {
                    return val == expected;
                };
            }
            else {
                // case-insensitive (RegExp-based)
                var pattern = expected.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
                var regexp = new RegExp('^' + pattern + '$', 'i');
                testFn = function (val) {
                    return regexp.test(val.toString());
                };
            }
        }
        if (!property && !testFn) {
            // no key and no value --> at least one entry in dictionary
            return function (obj) {
                var value = expression.evaluate(obj);
                return value && _.keys(value).length > 0;
            };
        }
        else if (!property) {
            // no key but some value
            return function (obj) {
                var value = expression.evaluate(obj);
                if (value) {
                    for (var key in value) {
                        var val = value[key];
                        if (val !== undefined && val !== null && testFn(val)) {
                            return true;
                        }
                    }
                }
                return false;
            };
        }
        else if (expected === undefined || expected === null) {
            // key but no value --> any value will do
            return function (obj) {
                var value = expression.evaluate(obj);
                var val = property.evaluate(value);
                return val !== undefined && val !== null;
            };
        }
        else {
            // key and value --> must have exact entry
            return function (obj) {
                var value = expression.evaluate(obj);
                var val = property.evaluate(value);
                return val !== undefined && val !== null && testFn(val);
            };
        }
    };
    JsonFilterVisitor.prototype.like = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        var like = filter.like;
        if (like === undefined || like === null) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return value === undefined || value === null;
            };
        }
        var pattern = like.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1').replace(/%/g, '.*');
        var regexp;
        if (this.options.casesensitive) {
            regexp = new RegExp('^' + pattern + '$');
        }
        else {
            regexp = new RegExp('^' + pattern + '$', 'i');
        }
        return function (obj) {
            var value = expression.evaluate(obj);
            if (value === undefined || value === null) {
                // null/undefined case
                return false;
            }
            else if (_.isArray(value)) {
                // array case
                for (var i = 0; i < value.length; ++i) {
                    var val = value[i];
                    if (!_.isNil(val) && !_.isObjectLike(val) && regexp.test(val.toString())) {
                        return true;
                    }
                }
                return false;
            }
            else {
                // simple case
                return regexp.test(value);
            }
        };
    };
    JsonFilterVisitor.prototype.null = function (filter) {
        var expression = new JsonPath_1.JsonPath(filter.fieldName);
        if (filter.isNull) {
            return function (obj) {
                var value = expression.evaluate(obj);
                return value === undefined || value === null;
            };
        }
        else {
            return function (obj) {
                var value = expression.evaluate(obj);
                return value !== undefined && value !== null;
            };
        }
    };
    JsonFilterVisitor.prototype.filters = function (filter) {
        // build filter functions
        var filters = new Array(filter.filters.length);
        for (var i = 0; i < filters.length; ++i) {
            filters[i] = this.visit(filter.filters[i]);
        }
        return filters;
    };
    JsonFilterVisitor.prototype.andOp = function (filter) {
        var filters = this.filters(filter);
        return function (obj) {
            for (var i = 0; i < filters.length; ++i) {
                var child = filters[i];
                if (!child(obj)) {
                    return false;
                }
            }
            return true;
        };
    };
    JsonFilterVisitor.prototype.orOp = function (filter) {
        var filters = this.filters(filter);
        return function (obj) {
            for (var i = 0; i < filters.length; ++i) {
                var child = filters[i];
                if (child(obj)) {
                    return true;
                }
            }
            return false;
        };
    };
    JsonFilterVisitor.prototype.nandOp = function (filter) {
        var filters = this.filters(filter);
        return function (obj) {
            for (var i = 0; i < filters.length; ++i) {
                var child = filters[i];
                if (!child(obj)) {
                    return true;
                }
            }
            return false;
        };
    };
    JsonFilterVisitor.prototype.norOp = function (filter) {
        var filters = this.filters(filter);
        return function (obj) {
            for (var i = 0; i < filters.length; ++i) {
                var child = filters[i];
                if (child(obj)) {
                    return false;
                }
            }
            return true;
        };
    };
    return JsonFilterVisitor;
}(FilterVisitor_1.FilterVisitorBase));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSnNvbkZpbHRlclZpc2l0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcXVlcnkvSnNvbkZpbHRlclZpc2l0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRzVCLDhCQUFrRCxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3BFLHlCQUF1QixZQUFZLENBQUMsQ0FBQTtBQTBCcEM7Ozs7OztHQU1HO0FBQ0gsb0JBQThCLE1BQXNCLEVBQUUsT0FBMkI7SUFDL0UsTUFBTSxDQUFDLElBQUksaUJBQWlCLENBQUksT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFGZSxrQkFBVSxhQUV6QixDQUFBO0FBRUQ7O0dBRUc7QUFDSDtJQUFtQyxxQ0FBa0M7SUFPbkUsMkJBQVksT0FBMkI7UUFDckMsaUJBQU8sQ0FBQztRQUxBLFlBQU8sR0FBc0I7WUFDckMsYUFBYSxFQUFFLEtBQUs7U0FDckIsQ0FBQztRQUtBLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNILENBQUM7SUFFRCwwQ0FBYyxHQUFkLFVBQWUsTUFBb0M7UUFDakQsSUFBSSxVQUFVLEdBQUcsSUFBSSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFVBQUMsR0FBTTtnQkFDWixJ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QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQztZQUNILENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNILHdCQUFDO0FBQUQsQ0FBQyxBQS9XRCxDQUFtQyxpQ0FBaUIsR0ErV25EIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgcXVlcnkvSnNvbkZpbHRlclZpc2l0b3IudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDIyLjA2LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIHF1ZXJ5XHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuXHJcbmltcG9ydCAqIGFzIGZpbHRlcnMgZnJvbSAnLi9GaWx0ZXInO1xyXG5pbXBvcnQge0ZpbHRlclZpc2l0b3JCYXNlLCBGaWx0ZXJWaXNpdG9yQ29yZX0gZnJvbScuL0ZpbHRlclZpc2l0b3InO1xyXG5pbXBvcnQge0pzb25QYXRofSBmcm9tICcuL0pzb25QYXRoJztcclxuXHJcbi8qKlxyXG4gKiBvcHRpb25zIG9mICNqc29uRmlsdGVyIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBKc29uRmlsdGVyT3B0aW9ucyB7XHJcbiAgLyoqXHJcbiAgICogc2V0IHRvIGV4cGxpY2l0bHkgdXNlIGNhc2Utc2Vuc2l0aXZlIHN0cmluZyBtYXRjaGluZywgZXZhbGF0ZXMgdG8gZmFsc2UgdG8gdXNlIG1hdGNoaW5nXHJcbiAgICogc2VtYW50aWNzIG9mIFdlYlNRTC5cclxuICAgKi9cclxuICBjYXNlc2Vuc2l0aXZlPzogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbXBpbGVkIHRlc3QgZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEpzb25GaWx0ZXJGbjxUPiB7XHJcbiAgLyoqXHJcbiAgICogdGVzdHMgYW4gb2JqZWN0IGFnYWluc3QgYSBGaWx0ZXIgdHJlZS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBhcmcgb2JqZWN0IHRvIHRlc3QuXHJcbiAgICogQHJldHVybiB7Ym9vbGVhbn0gd2hldGhlciB0aGUgZ2l2ZW4gb2JqZWN0IHBhc3NlcyB0aGUgRmlsdGVyIHRyZWUuXHJcbiAgICovXHJcbiAgKGFyZzogVCk6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb21waWxlcyBhIEpzb25GaWx0ZXJGbiBmcm9tIGEgZ2l2ZW4gRmlsdGVyIHRyZWUuXHJcbiAqXHJcbiAqIEBwYXJhbSBmaWx0ZXIgdHJlZSBiZWluZyBjb21waWxlZC5cclxuICogQHBhcmFtIG9wdGlvbnMgY3VzdG9taXppbmcgdGhlIG1hdGNoaW5nLCBlbnRpcmVseSBvcHRpb25hbC5cclxuICogQHJldHVybiB7ZnVuY3Rpb259IGEgSnNvbkZpbHRlckZuIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGpzb25GaWx0ZXI8VD4oZmlsdGVyOiBmaWx0ZXJzLkZpbHRlciwgb3B0aW9ucz86IEpzb25GaWx0ZXJPcHRpb25zKTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICByZXR1cm4gbmV3IEpzb25GaWx0ZXJWaXNpdG9yPFQ+KG9wdGlvbnMpLnZpc2l0KGZpbHRlcik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb21waWxlcyBhIEZpbHRlciB0cmVlIGludG8gYSBKc29uRmlsdGVyRm4uXHJcbiAqL1xyXG5jbGFzcyBKc29uRmlsdGVyVmlzaXRvcjxUPiBleHRlbmRzIEZpbHRlclZpc2l0b3JCYXNlPEpzb25GaWx0ZXJGbjxUPj5cclxuICBpbXBsZW1lbnRzIEZpbHRlclZpc2l0b3JDb3JlPEpzb25GaWx0ZXJGbjxUPj4ge1xyXG5cclxuICBwcm90ZWN0ZWQgb3B0aW9uczogSnNvbkZpbHRlck9wdGlvbnMgPSB7XHJcbiAgICBjYXNlc2Vuc2l0aXZlOiBmYWxzZVxyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBKc29uRmlsdGVyT3B0aW9ucykge1xyXG4gICAgc3VwZXIoKTtcclxuXHJcbiAgICBpZiAob3B0aW9ucykge1xyXG4gICAgICBfLmV4dGVuZCh0aGlzLm9wdGlvbnMsIG9wdGlvbnMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgY29udGFpbnNTdHJpbmcoZmlsdGVyOiBmaWx0ZXJzLkNvbnRhaW5zU3RyaW5nRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICAgIHZhciBleHByZXNzaW9uID0gbmV3IEpzb25QYXRoKGZpbHRlci5maWVsZE5hbWUpO1xyXG4gICAgdmFyIGNvbnRhaW5zID0gZmlsdGVyLmNvbnRhaW5zO1xyXG4gICAgaWYgKGNvbnRhaW5zID09PSB1bmRlZmluZWQgfHwgY29udGFpbnMgPT09IG51bGwpIHtcclxuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGw7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgdmFyIHRlc3RGbjogKHZhbDogYW55KSA9PiBib29sZWFuO1xyXG4gICAgaWYgKHRoaXMub3B0aW9ucy5jYXNlc2Vuc2l0aXZlKSB7XHJcbiAgICAgIC8vIGNhc2Utc2Vuc2l0aXZlXHJcbiAgICAgIHRlc3RGbiA9ICh2YWwpID0+IHtcclxuICAgICAgICByZXR1cm4gdmFsLnRvU3RyaW5nKCkuaW5kZXhPZihjb250YWlucykgPj0gMDtcclxuICAgICAgfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUgKFJlZ0V4cC1iYXNlZClcclxuICAgICAgdmFyIHBhdHRlcm4gPSBjb250YWlucy5yZXBsYWNlKC8oW1xcLlxcXFxcXFtcXF1cXCtcXF5cXCRcXChcXClcXCpcXD9cXHtcXH1cXCxcXCFdKS9nLCAnXFxcXCQxJyk7XHJcbiAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKHBhdHRlcm4sICdpJyk7XHJcbiAgICAgIHRlc3RGbiA9ICh2YWwpID0+IHtcclxuICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsLnRvU3RyaW5nKCkpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcclxuICAgICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAvLyBhcnJheSBjYXNlXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2ldO1xyXG4gICAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbCAmJiB0ZXN0Rm4odmFsKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNpbXBsZSBjYXNlXHJcbiAgICAgICAgcmV0dXJuIHRlc3RGbih2YWx1ZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBzdHJpbmcoZmlsdGVyOiBmaWx0ZXJzLlN0cmluZ0ZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XHJcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBKc29uUGF0aChmaWx0ZXIuZmllbGROYW1lKTtcclxuICAgIHZhciBleHBlY3RlZCA9IGZpbHRlci52YWx1ZTtcclxuICAgIGlmIChleHBlY3RlZCA9PT0gdW5kZWZpbmVkIHx8IGV4cGVjdGVkID09PSBudWxsKSB7XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciB0ZXN0Rm46ICh2YWw6IGFueSkgPT4gYm9vbGVhbjtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2FzZXNlbnNpdGl2ZSkge1xyXG4gICAgICAvLyBjYXNlLXNlbnNpdGl2ZVxyXG4gICAgICB0ZXN0Rm4gPSAodmFsKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHZhbCA9PSBleHBlY3RlZDtcclxuICAgICAgfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGNhc2UtaW5zZW5zaXRpdmUgKFJlZ0V4cC1iYXNlZClcclxuICAgICAgdmFyIHBhdHRlcm4gPSBleHBlY3RlZC5yZXBsYWNlKC8oW1xcLlxcXFxcXFtcXF1cXCtcXF5cXCRcXChcXClcXCpcXD9cXHtcXH1cXCxcXCFdKS9nLCAnXFxcXCQxJyk7XHJcbiAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCdeJyArIHBhdHRlcm4gKyAnJCcsICdpJyk7XHJcbiAgICAgIHRlc3RGbiA9ICh2YWwpID0+IHtcclxuICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsLnRvU3RyaW5nKCkpO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcclxuICAgICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAvLyBhcnJheSBjYXNlXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2ldO1xyXG4gICAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbCAmJiB0ZXN0Rm4odmFsKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIHNpbXBsZSBjYXNlXHJcbiAgICAgICAgcmV0dXJuIHRlc3RGbih2YWx1ZSk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICByYW5nZTxWPihmaWx0ZXI6IGZpbHRlcnMuUmFuZ2VGaWx0ZXI8Vj4pOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XHJcbiAgICB2YXIgbWluOiBWID0gZmlsdGVyLm1pbjtcclxuICAgIHZhciBtYXg6IFYgPSBmaWx0ZXIubWF4O1xyXG4gICAgaWYgKG1pbiA9PT0gdW5kZWZpbmVkIHx8IG1pbiA9PT0gbnVsbCkge1xyXG4gICAgICBpZiAobWF4ID09PSB1bmRlZmluZWQgfHwgbWF4ID09PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgICAgIHJldHVybiAhIXZhbHVlO1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgICAgIHJldHVybiAhIXZhbHVlICYmIHZhbHVlIDw9IG1heDtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKG1pbiA9PT0gbWF4KSB7XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiAhIXZhbHVlICYmIHZhbHVlID09IG1pbjtcclxuICAgICAgfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChtYXggPT09IHVuZGVmaW5lZCB8fCBtYXggPT09IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xyXG4gICAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgICAgcmV0dXJuICEhdmFsdWUgJiYgdmFsdWUgPj0gbWluO1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgICAgIHJldHVybiAhIXZhbHVlICYmIHZhbHVlIDw9IG1heCAmJiB2YWx1ZSA+PSBtaW47XHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbG9uZ1JhbmdlKGZpbHRlcjogZmlsdGVycy5Mb25nUmFuZ2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgcmV0dXJuIHRoaXMucmFuZ2UoZmlsdGVyKTtcclxuICB9XHJcblxyXG4gIGRhdGVSYW5nZShmaWx0ZXI6IGZpbHRlcnMuRGF0ZVJhbmdlRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICAgIHJldHVybiB0aGlzLnJhbmdlKGZpbHRlcik7XHJcbiAgfVxyXG5cclxuICBzdHJpbmdSYW5nZShmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nUmFuZ2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgLy8gbm90IGNhc2UtaW5zZW5zaXRpdmUgaW4gV2ViU1FMIGFuZCB3ZSB3YW50IHNhbWUgYmVoYXZpb3IgaGVyZSFcclxuICAgIHJldHVybiB0aGlzLnJhbmdlKGZpbHRlcik7XHJcbiAgfVxyXG5cclxuICBkb3VibGVSYW5nZShmaWx0ZXI6IGZpbHRlcnMuRG91YmxlUmFuZ2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgcmV0dXJuIHRoaXMucmFuZ2UoZmlsdGVyKTtcclxuICB9XHJcblxyXG4gIGJvb2xlYW4oZmlsdGVyOiBmaWx0ZXJzLkJvb2xlYW5GaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XHJcbiAgICB2YXIgZXhwZWN0ZWQgPSBmaWx0ZXIudmFsdWU7XHJcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xyXG4gICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XHJcbiAgICAgIHJldHVybiAhIXZhbHVlID09PSBleHBlY3RlZDtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBlbnVtPFY+KGZpbHRlcjogZmlsdGVycy5FbnVtRmlsdGVyPFY+KTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICAgIHZhciBleHByZXNzaW9uID0gbmV3IEpzb25QYXRoKGZpbHRlci5maWVsZE5hbWUpO1xyXG4gICAgdmFyIHZhbHVlczogVltdID0gZmlsdGVyLnZhbHVlcztcclxuICAgIGlmICghdmFsdWVzKSB7XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiAhdmFsdWU7XHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgICByZXR1cm4gdmFsdWVzLmluZGV4T2YodmFsdWUpID49IDA7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzdHJpbmdFbnVtKGZpbHRlcjogZmlsdGVycy5TdHJpbmdFbnVtRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICAgIC8vIG5vdCBjYXNlLWluc2Vuc2l0aXZlIGluIFdlYlNRTCBhbmQgd2Ugd2FudCBzYW1lIGJlaGF2aW9yIGhlcmUhXHJcbiAgICByZXR1cm4gdGhpcy5lbnVtKGZpbHRlcik7XHJcbiAgfVxyXG5cclxuICBsb25nRW51bShmaWx0ZXI6IGZpbHRlcnMuTG9uZ0VudW1GaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgcmV0dXJuIHRoaXMuZW51bShmaWx0ZXIpO1xyXG4gIH1cclxuXHJcbiAgc3RyaW5nTWFwKGZpbHRlcjogZmlsdGVycy5TdHJpbmdNYXBGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XHJcbiAgICB2YXIgcHJvcGVydHkgPSBmaWx0ZXIua2V5ICE9PSB1bmRlZmluZWQgJiYgZmlsdGVyLmtleSAhPT0gbnVsbCAmJiBuZXcgSnNvblBhdGgoZmlsdGVyLmtleSk7XHJcbiAgICB2YXIgZXhwZWN0ZWQgPSBmaWx0ZXIudmFsdWU7XHJcblxyXG4gICAgdmFyIHRlc3RGbjogKHZhbDogYW55KSA9PiBib29sZWFuO1xyXG4gICAgaWYgKGV4cGVjdGVkICE9PSB1bmRlZmluZWQgJiYgZXhwZWN0ZWQgIT09IG51bGwpIHtcclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5jYXNlc2Vuc2l0aXZlKSB7XHJcbiAgICAgICAgLy8gY2FzZS1zZW5zaXRpdmVcclxuICAgICAgICB0ZXN0Rm4gPSAodmFsKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gdmFsID09IGV4cGVjdGVkO1xyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZSAoUmVnRXhwLWJhc2VkKVxyXG4gICAgICAgIHZhciBwYXR0ZXJuID0gZXhwZWN0ZWQucmVwbGFjZSgvKFtcXC5cXFxcXFxbXFxdXFwrXFxeXFwkXFwoXFwpXFwqXFw/XFx7XFx9XFwsXFwhXSkvZywgJ1xcXFwkMScpO1xyXG4gICAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKCdeJyArIHBhdHRlcm4gKyAnJCcsICdpJyk7XHJcbiAgICAgICAgdGVzdEZuID0gKHZhbCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KHZhbC50b1N0cmluZygpKTtcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFwcm9wZXJ0eSAmJiAhdGVzdEZuKSB7XHJcbiAgICAgIC8vIG5vIGtleSBhbmQgbm8gdmFsdWUgLS0+IGF0IGxlYXN0IG9uZSBlbnRyeSBpbiBkaWN0aW9uYXJ5XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZSAmJiBfLmtleXModmFsdWUpLmxlbmd0aCA+IDA7XHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2UgaWYgKCFwcm9wZXJ0eSkge1xyXG4gICAgICAvLyBubyBrZXkgYnV0IHNvbWUgdmFsdWVcclxuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XHJcbiAgICAgICAgaWYgKHZhbHVlKSB7XHJcbiAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gdmFsdWUpIHtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2tleV07XHJcbiAgICAgICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGwgJiYgdGVzdEZuKHZhbCkpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2UgaWYgKGV4cGVjdGVkID09PSB1bmRlZmluZWQgfHwgZXhwZWN0ZWQgPT09IG51bGwpIHtcclxuICAgICAgLy8ga2V5IGJ1dCBubyB2YWx1ZSAtLT4gYW55IHZhbHVlIHdpbGwgZG9cclxuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XHJcbiAgICAgICAgdmFyIHZhbCA9IHByb3BlcnR5LmV2YWx1YXRlKHZhbHVlKTtcclxuICAgICAgICByZXR1cm4gdmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBudWxsO1xyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8ga2V5IGFuZCB2YWx1ZSAtLT4gbXVzdCBoYXZlIGV4YWN0IGVudHJ5XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHZhciB2YWwgPSBwcm9wZXJ0eS5ldmFsdWF0ZSh2YWx1ZSk7XHJcbiAgICAgICAgcmV0dXJuIHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbCAmJiB0ZXN0Rm4odmFsKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxpa2UoZmlsdGVyOiBmaWx0ZXJzLkxpa2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XHJcbiAgICB2YXIgbGlrZSA9IGZpbHRlci5saWtlO1xyXG4gICAgaWYgKGxpa2UgPT09IHVuZGVmaW5lZCB8fCBsaWtlID09PSBudWxsKSB7XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsO1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBwYXR0ZXJuID0gbGlrZS5yZXBsYWNlKC8oW1xcLlxcXFxcXFtcXF1cXCtcXF5cXCRcXChcXClcXCpcXD9cXHtcXH1cXCxcXCFdKS9nLCAnXFxcXCQxJykucmVwbGFjZSgvJS9nLCAnLionKTtcclxuICAgIHZhciByZWdleHA6IFJlZ0V4cDtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMuY2FzZXNlbnNpdGl2ZSkge1xyXG4gICAgICByZWdleHAgPSBuZXcgUmVnRXhwKCdeJyArIHBhdHRlcm4gKyAnJCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuICsgJyQnLCAnaScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcclxuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcclxuICAgICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICAvLyBhcnJheSBjYXNlXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZS5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2ldO1xyXG4gICAgICAgICAgaWYgKCFfLmlzTmlsKHZhbCkgJiYgIV8uaXNPYmplY3RMaWtlKHZhbCkgJiYgcmVnZXhwLnRlc3QodmFsLnRvU3RyaW5nKCkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gc2ltcGxlIGNhc2VcclxuICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsdWUpO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgbnVsbChmaWx0ZXI6IGZpbHRlcnMuTnVsbEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XHJcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBKc29uUGF0aChmaWx0ZXIuZmllbGROYW1lKTtcclxuICAgIGlmIChmaWx0ZXIuaXNOdWxsKSB7XHJcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsO1xyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlICE9PSB1bmRlZmluZWQgJiYgdmFsdWUgIT09IG51bGw7XHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmaWx0ZXJzKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPltdIHtcclxuICAgIC8vIGJ1aWxkIGZpbHRlciBmdW5jdGlvbnNcclxuICAgIHZhciBmaWx0ZXJzOiBKc29uRmlsdGVyRm48VD5bXSA9IG5ldyBBcnJheTxKc29uRmlsdGVyRm48VD4+KGZpbHRlci5maWx0ZXJzLmxlbmd0aCk7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgZmlsdGVyc1tpXSA9IHRoaXMudmlzaXQoZmlsdGVyLmZpbHRlcnNbaV0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZpbHRlcnM7XHJcbiAgfVxyXG5cclxuICBhbmRPcChmaWx0ZXI6IGZpbHRlcnMuTG9nT3BGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnMoZmlsdGVyKTtcclxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsdGVycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBjaGlsZCA9IGZpbHRlcnNbaV07XHJcbiAgICAgICAgaWYgKCFjaGlsZChvYmopKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIG9yT3AoZmlsdGVyOiBmaWx0ZXJzLkxvZ09wRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcclxuICAgIGxldCBmaWx0ZXJzID0gdGhpcy5maWx0ZXJzKGZpbHRlcik7XHJcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xyXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyArK2kpIHtcclxuICAgICAgICBsZXQgY2hpbGQgPSBmaWx0ZXJzW2ldO1xyXG4gICAgICAgIGlmIChjaGlsZChvYmopKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIG5hbmRPcChmaWx0ZXI6IGZpbHRlcnMuTG9nT3BGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xyXG4gICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnMoZmlsdGVyKTtcclxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XHJcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsdGVycy5sZW5ndGg7ICsraSkge1xyXG4gICAgICAgIHZhciBjaGlsZCA9IGZpbHRlcnNbaV07XHJcbiAgICAgICAgaWYgKCFjaGlsZChvYmopKSB7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIG5vck9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XHJcbiAgICB2YXIgZmlsdGVycyA9IHRoaXMuZmlsdGVycyhmaWx0ZXIpO1xyXG4gICAgcmV0dXJuIChvYmo6IFQpID0+IHtcclxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgdmFyIGNoaWxkID0gZmlsdGVyc1tpXTtcclxuICAgICAgICBpZiAoY2hpbGQob2JqKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH07XHJcbiAgfVxyXG59XHJcbiJdfQ==