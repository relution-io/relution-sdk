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
                    if (regexp.test(val)) {
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
//# sourceMappingURL=JsonFilterVisitor.js.map