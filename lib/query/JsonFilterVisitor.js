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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSnNvbkZpbHRlclZpc2l0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcXVlcnkvSnNvbkZpbHRlclZpc2l0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRzVCLDhCQUFrRCxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3BFLHlCQUF1QixZQUFZLENBQUMsQ0FBQTtBQTBCcEM7Ozs7OztHQU1HO0FBQ0gsb0JBQThCLE1BQXNCLEVBQUUsT0FBMkI7SUFDL0UsTUFBTSxDQUFDLElBQUksaUJBQWlCLENBQUksT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pELENBQUM7QUFGZSxrQkFBVSxhQUV6QixDQUFBO0FBRUQ7O0dBRUc7QUFDSDtJQUFtQyxxQ0FBa0M7SUFPbkUsMkJBQVksT0FBMkI7UUFDckMsaUJBQU8sQ0FBQztRQUxBLFlBQU8sR0FBc0I7WUFDckMsYUFBYSxFQUFFLEtBQUs7U0FDckIsQ0FBQztRQUtBLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQztJQUNILENBQUM7SUFFRCwwQ0FBYyxHQUFkLFVBQWUsTUFBb0M7UUFDakQsSUFBSSxVQUFVLEdBQUcsSUFBSSxtQkFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNoRCxJQUFJLFFBQVEsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDaEQsTUFBTSxDQUFDLFVBQUMsR0FBTTtnQkFDWixJ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QixFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQztZQUNILENBQUM7WUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUNILHdCQUFDO0FBQUQsQ0FBQyxBQS9XRCxDQUFtQyxpQ0FBaUIsR0ErV25EIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHF1ZXJ5L0pzb25GaWx0ZXJWaXNpdG9yLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyMi4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgcXVlcnlcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcblxuaW1wb3J0ICogYXMgZmlsdGVycyBmcm9tICcuL0ZpbHRlcic7XG5pbXBvcnQge0ZpbHRlclZpc2l0b3JCYXNlLCBGaWx0ZXJWaXNpdG9yQ29yZX0gZnJvbScuL0ZpbHRlclZpc2l0b3InO1xuaW1wb3J0IHtKc29uUGF0aH0gZnJvbSAnLi9Kc29uUGF0aCc7XG5cbi8qKlxuICogb3B0aW9ucyBvZiAjanNvbkZpbHRlciBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBKc29uRmlsdGVyT3B0aW9ucyB7XG4gIC8qKlxuICAgKiBzZXQgdG8gZXhwbGljaXRseSB1c2UgY2FzZS1zZW5zaXRpdmUgc3RyaW5nIG1hdGNoaW5nLCBldmFsYXRlcyB0byBmYWxzZSB0byB1c2UgbWF0Y2hpbmdcbiAgICogc2VtYW50aWNzIG9mIFdlYlNRTC5cbiAgICovXG4gIGNhc2VzZW5zaXRpdmU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIGNvbXBpbGVkIHRlc3QgZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSnNvbkZpbHRlckZuPFQ+IHtcbiAgLyoqXG4gICAqIHRlc3RzIGFuIG9iamVjdCBhZ2FpbnN0IGEgRmlsdGVyIHRyZWUuXG4gICAqXG4gICAqIEBwYXJhbSBhcmcgb2JqZWN0IHRvIHRlc3QuXG4gICAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgdGhlIGdpdmVuIG9iamVjdCBwYXNzZXMgdGhlIEZpbHRlciB0cmVlLlxuICAgKi9cbiAgKGFyZzogVCk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogY29tcGlsZXMgYSBKc29uRmlsdGVyRm4gZnJvbSBhIGdpdmVuIEZpbHRlciB0cmVlLlxuICpcbiAqIEBwYXJhbSBmaWx0ZXIgdHJlZSBiZWluZyBjb21waWxlZC5cbiAqIEBwYXJhbSBvcHRpb25zIGN1c3RvbWl6aW5nIHRoZSBtYXRjaGluZywgZW50aXJlbHkgb3B0aW9uYWwuXG4gKiBAcmV0dXJuIHtmdW5jdGlvbn0gYSBKc29uRmlsdGVyRm4gZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBqc29uRmlsdGVyPFQ+KGZpbHRlcjogZmlsdGVycy5GaWx0ZXIsIG9wdGlvbnM/OiBKc29uRmlsdGVyT3B0aW9ucyk6IEpzb25GaWx0ZXJGbjxUPiB7XG4gIHJldHVybiBuZXcgSnNvbkZpbHRlclZpc2l0b3I8VD4ob3B0aW9ucykudmlzaXQoZmlsdGVyKTtcbn1cblxuLyoqXG4gKiBjb21waWxlcyBhIEZpbHRlciB0cmVlIGludG8gYSBKc29uRmlsdGVyRm4uXG4gKi9cbmNsYXNzIEpzb25GaWx0ZXJWaXNpdG9yPFQ+IGV4dGVuZHMgRmlsdGVyVmlzaXRvckJhc2U8SnNvbkZpbHRlckZuPFQ+PlxuICBpbXBsZW1lbnRzIEZpbHRlclZpc2l0b3JDb3JlPEpzb25GaWx0ZXJGbjxUPj4ge1xuXG4gIHByb3RlY3RlZCBvcHRpb25zOiBKc29uRmlsdGVyT3B0aW9ucyA9IHtcbiAgICBjYXNlc2Vuc2l0aXZlOiBmYWxzZVxuICB9O1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM/OiBKc29uRmlsdGVyT3B0aW9ucykge1xuICAgIHN1cGVyKCk7XG5cbiAgICBpZiAob3B0aW9ucykge1xuICAgICAgXy5leHRlbmQodGhpcy5vcHRpb25zLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBjb250YWluc1N0cmluZyhmaWx0ZXI6IGZpbHRlcnMuQ29udGFpbnNTdHJpbmdGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHZhciBleHByZXNzaW9uID0gbmV3IEpzb25QYXRoKGZpbHRlci5maWVsZE5hbWUpO1xuICAgIHZhciBjb250YWlucyA9IGZpbHRlci5jb250YWlucztcbiAgICBpZiAoY29udGFpbnMgPT09IHVuZGVmaW5lZCB8fCBjb250YWlucyA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xuICAgICAgICByZXR1cm4gdmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbDtcbiAgICAgIH07XG4gICAgfVxuXG4gICAgdmFyIHRlc3RGbjogKHZhbDogYW55KSA9PiBib29sZWFuO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2FzZXNlbnNpdGl2ZSkge1xuICAgICAgLy8gY2FzZS1zZW5zaXRpdmVcbiAgICAgIHRlc3RGbiA9ICh2YWwpID0+IHtcbiAgICAgICAgcmV0dXJuIHZhbC50b1N0cmluZygpLmluZGV4T2YoY29udGFpbnMpID49IDA7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlIChSZWdFeHAtYmFzZWQpXG4gICAgICB2YXIgcGF0dGVybiA9IGNvbnRhaW5zLnJlcGxhY2UoLyhbXFwuXFxcXFxcW1xcXVxcK1xcXlxcJFxcKFxcKVxcKlxcP1xce1xcfVxcLFxcIV0pL2csICdcXFxcJDEnKTtcbiAgICAgIHZhciByZWdleHAgPSBuZXcgUmVnRXhwKHBhdHRlcm4sICdpJyk7XG4gICAgICB0ZXN0Rm4gPSAodmFsKSA9PiB7XG4gICAgICAgIHJldHVybiByZWdleHAudGVzdCh2YWwudG9TdHJpbmcoKSk7XG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAvLyBhcnJheSBjYXNlXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YXIgdmFsID0gdmFsdWVbaV07XG4gICAgICAgICAgaWYgKHZhbCAhPT0gdW5kZWZpbmVkICYmIHZhbCAhPT0gbnVsbCAmJiB0ZXN0Rm4odmFsKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNpbXBsZSBjYXNlXG4gICAgICAgIHJldHVybiB0ZXN0Rm4odmFsdWUpO1xuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBzdHJpbmcoZmlsdGVyOiBmaWx0ZXJzLlN0cmluZ0ZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XG4gICAgdmFyIGV4cGVjdGVkID0gZmlsdGVyLnZhbHVlO1xuICAgIGlmIChleHBlY3RlZCA9PT0gdW5kZWZpbmVkIHx8IGV4cGVjdGVkID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgdGVzdEZuOiAodmFsOiBhbnkpID0+IGJvb2xlYW47XG4gICAgaWYgKHRoaXMub3B0aW9ucy5jYXNlc2Vuc2l0aXZlKSB7XG4gICAgICAvLyBjYXNlLXNlbnNpdGl2ZVxuICAgICAgdGVzdEZuID0gKHZhbCkgPT4ge1xuICAgICAgICByZXR1cm4gdmFsID09IGV4cGVjdGVkO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY2FzZS1pbnNlbnNpdGl2ZSAoUmVnRXhwLWJhc2VkKVxuICAgICAgdmFyIHBhdHRlcm4gPSBleHBlY3RlZC5yZXBsYWNlKC8oW1xcLlxcXFxcXFtcXF1cXCtcXF5cXCRcXChcXClcXCpcXD9cXHtcXH1cXCxcXCFdKS9nLCAnXFxcXCQxJyk7XG4gICAgICB2YXIgcmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuICsgJyQnLCAnaScpO1xuICAgICAgdGVzdEZuID0gKHZhbCkgPT4ge1xuICAgICAgICByZXR1cm4gcmVnZXhwLnRlc3QodmFsLnRvU3RyaW5nKCkpO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xuICAgICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgICAgLy8gbnVsbC91bmRlZmluZWQgY2FzZVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKF8uaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgLy8gYXJyYXkgY2FzZVxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgdmFyIHZhbCA9IHZhbHVlW2ldO1xuICAgICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGwgJiYgdGVzdEZuKHZhbCkpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBzaW1wbGUgY2FzZVxuICAgICAgICByZXR1cm4gdGVzdEZuKHZhbHVlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgcmFuZ2U8Vj4oZmlsdGVyOiBmaWx0ZXJzLlJhbmdlRmlsdGVyPFY+KTogSnNvbkZpbHRlckZuPFQ+IHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBKc29uUGF0aChmaWx0ZXIuZmllbGROYW1lKTtcbiAgICB2YXIgbWluOiBWID0gZmlsdGVyLm1pbjtcbiAgICB2YXIgbWF4OiBWID0gZmlsdGVyLm1heDtcbiAgICBpZiAobWluID09PSB1bmRlZmluZWQgfHwgbWluID09PSBudWxsKSB7XG4gICAgICBpZiAobWF4ID09PSB1bmRlZmluZWQgfHwgbWF4ID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xuICAgICAgICAgIHJldHVybiAhIXZhbHVlO1xuICAgICAgICB9O1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcbiAgICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgICAgcmV0dXJuICEhdmFsdWUgJiYgdmFsdWUgPD0gbWF4O1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobWluID09PSBtYXgpIHtcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcbiAgICAgICAgcmV0dXJuICEhdmFsdWUgJiYgdmFsdWUgPT0gbWluO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG1heCA9PT0gdW5kZWZpbmVkIHx8IG1heCA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcbiAgICAgICAgICByZXR1cm4gISF2YWx1ZSAmJiB2YWx1ZSA+PSBtaW47XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcbiAgICAgICAgICByZXR1cm4gISF2YWx1ZSAmJiB2YWx1ZSA8PSBtYXggJiYgdmFsdWUgPj0gbWluO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGxvbmdSYW5nZShmaWx0ZXI6IGZpbHRlcnMuTG9uZ1JhbmdlRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcbiAgICByZXR1cm4gdGhpcy5yYW5nZShmaWx0ZXIpO1xuICB9XG5cbiAgZGF0ZVJhbmdlKGZpbHRlcjogZmlsdGVycy5EYXRlUmFuZ2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHJldHVybiB0aGlzLnJhbmdlKGZpbHRlcik7XG4gIH1cblxuICBzdHJpbmdSYW5nZShmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nUmFuZ2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIC8vIG5vdCBjYXNlLWluc2Vuc2l0aXZlIGluIFdlYlNRTCBhbmQgd2Ugd2FudCBzYW1lIGJlaGF2aW9yIGhlcmUhXG4gICAgcmV0dXJuIHRoaXMucmFuZ2UoZmlsdGVyKTtcbiAgfVxuXG4gIGRvdWJsZVJhbmdlKGZpbHRlcjogZmlsdGVycy5Eb3VibGVSYW5nZUZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgcmV0dXJuIHRoaXMucmFuZ2UoZmlsdGVyKTtcbiAgfVxuXG4gIGJvb2xlYW4oZmlsdGVyOiBmaWx0ZXJzLkJvb2xlYW5GaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHZhciBleHByZXNzaW9uID0gbmV3IEpzb25QYXRoKGZpbHRlci5maWVsZE5hbWUpO1xuICAgIHZhciBleHBlY3RlZCA9IGZpbHRlci52YWx1ZTtcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xuICAgICAgcmV0dXJuICEhdmFsdWUgPT09IGV4cGVjdGVkO1xuICAgIH07XG4gIH1cblxuICBlbnVtPFY+KGZpbHRlcjogZmlsdGVycy5FbnVtRmlsdGVyPFY+KTogSnNvbkZpbHRlckZuPFQ+IHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBKc29uUGF0aChmaWx0ZXIuZmllbGROYW1lKTtcbiAgICB2YXIgdmFsdWVzOiBWW10gPSBmaWx0ZXIudmFsdWVzO1xuICAgIGlmICghdmFsdWVzKSB7XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiAhdmFsdWU7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiB2YWx1ZXMuaW5kZXhPZih2YWx1ZSkgPj0gMDtcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgc3RyaW5nRW51bShmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nRW51bUZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgLy8gbm90IGNhc2UtaW5zZW5zaXRpdmUgaW4gV2ViU1FMIGFuZCB3ZSB3YW50IHNhbWUgYmVoYXZpb3IgaGVyZSFcbiAgICByZXR1cm4gdGhpcy5lbnVtKGZpbHRlcik7XG4gIH1cblxuICBsb25nRW51bShmaWx0ZXI6IGZpbHRlcnMuTG9uZ0VudW1GaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHJldHVybiB0aGlzLmVudW0oZmlsdGVyKTtcbiAgfVxuXG4gIHN0cmluZ01hcChmaWx0ZXI6IGZpbHRlcnMuU3RyaW5nTWFwRmlsdGVyKTogSnNvbkZpbHRlckZuPFQ+IHtcbiAgICB2YXIgZXhwcmVzc2lvbiA9IG5ldyBKc29uUGF0aChmaWx0ZXIuZmllbGROYW1lKTtcbiAgICB2YXIgcHJvcGVydHkgPSBmaWx0ZXIua2V5ICE9PSB1bmRlZmluZWQgJiYgZmlsdGVyLmtleSAhPT0gbnVsbCAmJiBuZXcgSnNvblBhdGgoZmlsdGVyLmtleSk7XG4gICAgdmFyIGV4cGVjdGVkID0gZmlsdGVyLnZhbHVlO1xuXG4gICAgdmFyIHRlc3RGbjogKHZhbDogYW55KSA9PiBib29sZWFuO1xuICAgIGlmIChleHBlY3RlZCAhPT0gdW5kZWZpbmVkICYmIGV4cGVjdGVkICE9PSBudWxsKSB7XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmNhc2VzZW5zaXRpdmUpIHtcbiAgICAgICAgLy8gY2FzZS1zZW5zaXRpdmVcbiAgICAgICAgdGVzdEZuID0gKHZhbCkgPT4ge1xuICAgICAgICAgIHJldHVybiB2YWwgPT0gZXhwZWN0ZWQ7XG4gICAgICAgIH07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBjYXNlLWluc2Vuc2l0aXZlIChSZWdFeHAtYmFzZWQpXG4gICAgICAgIHZhciBwYXR0ZXJuID0gZXhwZWN0ZWQucmVwbGFjZSgvKFtcXC5cXFxcXFxbXFxdXFwrXFxeXFwkXFwoXFwpXFwqXFw/XFx7XFx9XFwsXFwhXSkvZywgJ1xcXFwkMScpO1xuICAgICAgICB2YXIgcmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuICsgJyQnLCAnaScpO1xuICAgICAgICB0ZXN0Rm4gPSAodmFsKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KHZhbC50b1N0cmluZygpKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXByb3BlcnR5ICYmICF0ZXN0Rm4pIHtcbiAgICAgIC8vIG5vIGtleSBhbmQgbm8gdmFsdWUgLS0+IGF0IGxlYXN0IG9uZSBlbnRyeSBpbiBkaWN0aW9uYXJ5XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiB2YWx1ZSAmJiBfLmtleXModmFsdWUpLmxlbmd0aCA+IDA7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoIXByb3BlcnR5KSB7XG4gICAgICAvLyBubyBrZXkgYnV0IHNvbWUgdmFsdWVcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcbiAgICAgICAgaWYgKHZhbHVlKSB7XG4gICAgICAgICAgZm9yICh2YXIga2V5IGluIHZhbHVlKSB7XG4gICAgICAgICAgICB2YXIgdmFsID0gdmFsdWVba2V5XTtcbiAgICAgICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGwgJiYgdGVzdEZuKHZhbCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChleHBlY3RlZCA9PT0gdW5kZWZpbmVkIHx8IGV4cGVjdGVkID09PSBudWxsKSB7XG4gICAgICAvLyBrZXkgYnV0IG5vIHZhbHVlIC0tPiBhbnkgdmFsdWUgd2lsbCBkb1xuICAgICAgcmV0dXJuIChvYmo6IFQpID0+IHtcbiAgICAgICAgdmFyIHZhbHVlID0gZXhwcmVzc2lvbi5ldmFsdWF0ZShvYmopO1xuICAgICAgICB2YXIgdmFsID0gcHJvcGVydHkuZXZhbHVhdGUodmFsdWUpO1xuICAgICAgICByZXR1cm4gdmFsICE9PSB1bmRlZmluZWQgJiYgdmFsICE9PSBudWxsO1xuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8ga2V5IGFuZCB2YWx1ZSAtLT4gbXVzdCBoYXZlIGV4YWN0IGVudHJ5XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHZhciB2YWwgPSBwcm9wZXJ0eS5ldmFsdWF0ZSh2YWx1ZSk7XG4gICAgICAgIHJldHVybiB2YWwgIT09IHVuZGVmaW5lZCAmJiB2YWwgIT09IG51bGwgJiYgdGVzdEZuKHZhbCk7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIGxpa2UoZmlsdGVyOiBmaWx0ZXJzLkxpa2VGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHZhciBleHByZXNzaW9uID0gbmV3IEpzb25QYXRoKGZpbHRlci5maWVsZE5hbWUpO1xuICAgIHZhciBsaWtlID0gZmlsdGVyLmxpa2U7XG4gICAgaWYgKGxpa2UgPT09IHVuZGVmaW5lZCB8fCBsaWtlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsO1xuICAgICAgfTtcbiAgICB9XG5cbiAgICB2YXIgcGF0dGVybiA9IGxpa2UucmVwbGFjZSgvKFtcXC5cXFxcXFxbXFxdXFwrXFxeXFwkXFwoXFwpXFwqXFw/XFx7XFx9XFwsXFwhXSkvZywgJ1xcXFwkMScpLnJlcGxhY2UoLyUvZywgJy4qJyk7XG4gICAgdmFyIHJlZ2V4cDogUmVnRXhwO1xuICAgIGlmICh0aGlzLm9wdGlvbnMuY2FzZXNlbnNpdGl2ZSkge1xuICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuICsgJyQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVnZXhwID0gbmV3IFJlZ0V4cCgnXicgKyBwYXR0ZXJuICsgJyQnLCAnaScpO1xuICAgIH1cblxuICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgICAvLyBudWxsL3VuZGVmaW5lZCBjYXNlXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICAvLyBhcnJheSBjYXNlXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICB2YXIgdmFsID0gdmFsdWVbaV07XG4gICAgICAgICAgaWYgKCFfLmlzTmlsKHZhbCkgJiYgIV8uaXNPYmplY3RMaWtlKHZhbCkgJiYgcmVnZXhwLnRlc3QodmFsLnRvU3RyaW5nKCkpKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gc2ltcGxlIGNhc2VcbiAgICAgICAgcmV0dXJuIHJlZ2V4cC50ZXN0KHZhbHVlKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG5cbiAgbnVsbChmaWx0ZXI6IGZpbHRlcnMuTnVsbEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgdmFyIGV4cHJlc3Npb24gPSBuZXcgSnNvblBhdGgoZmlsdGVyLmZpZWxkTmFtZSk7XG4gICAgaWYgKGZpbHRlci5pc051bGwpIHtcbiAgICAgIHJldHVybiAob2JqOiBUKSA9PiB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGV4cHJlc3Npb24uZXZhbHVhdGUob2JqKTtcbiAgICAgICAgcmV0dXJuIHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGw7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgICB2YXIgdmFsdWUgPSBleHByZXNzaW9uLmV2YWx1YXRlKG9iaik7XG4gICAgICAgIHJldHVybiB2YWx1ZSAhPT0gdW5kZWZpbmVkICYmIHZhbHVlICE9PSBudWxsO1xuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICBmaWx0ZXJzKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPltdIHtcbiAgICAvLyBidWlsZCBmaWx0ZXIgZnVuY3Rpb25zXG4gICAgdmFyIGZpbHRlcnM6IEpzb25GaWx0ZXJGbjxUPltdID0gbmV3IEFycmF5PEpzb25GaWx0ZXJGbjxUPj4oZmlsdGVyLmZpbHRlcnMubGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGZpbHRlcnNbaV0gPSB0aGlzLnZpc2l0KGZpbHRlci5maWx0ZXJzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIGZpbHRlcnM7XG4gIH1cblxuICBhbmRPcChmaWx0ZXI6IGZpbHRlcnMuTG9nT3BGaWx0ZXIpOiBKc29uRmlsdGVyRm48VD4ge1xuICAgIHZhciBmaWx0ZXJzID0gdGhpcy5maWx0ZXJzKGZpbHRlcik7XG4gICAgcmV0dXJuIChvYmo6IFQpID0+IHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsdGVycy5sZW5ndGg7ICsraSkge1xuICAgICAgICB2YXIgY2hpbGQgPSBmaWx0ZXJzW2ldO1xuICAgICAgICBpZiAoIWNoaWxkKG9iaikpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG4gIH1cblxuICBvck9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgbGV0IGZpbHRlcnMgPSB0aGlzLmZpbHRlcnMoZmlsdGVyKTtcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGxldCBjaGlsZCA9IGZpbHRlcnNbaV07XG4gICAgICAgIGlmIChjaGlsZChvYmopKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9O1xuICB9XG5cbiAgbmFuZE9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnMoZmlsdGVyKTtcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGZpbHRlcnNbaV07XG4gICAgICAgIGlmICghY2hpbGQob2JqKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfTtcbiAgfVxuXG4gIG5vck9wKGZpbHRlcjogZmlsdGVycy5Mb2dPcEZpbHRlcik6IEpzb25GaWx0ZXJGbjxUPiB7XG4gICAgdmFyIGZpbHRlcnMgPSB0aGlzLmZpbHRlcnMoZmlsdGVyKTtcbiAgICByZXR1cm4gKG9iajogVCkgPT4ge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIHZhciBjaGlsZCA9IGZpbHRlcnNbaV07XG4gICAgICAgIGlmIChjaGlsZChvYmopKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9O1xuICB9XG59XG4iXX0=