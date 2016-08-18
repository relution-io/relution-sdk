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
//# sourceMappingURL=JsonPath.js.map