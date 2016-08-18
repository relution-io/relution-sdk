/*
 * @file core/diag.ts
 * Relution SDK
 *
 * Created by Pascal Brewing, Thomas Beckmann
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
 * @module core
 */
/** */
"use strict";
var _ = require('lodash');
var assert = require('assert');
/**
 * console featuring coloring, fontSize and enabled state.
 */
var Diagnostics = (function () {
    function Diagnostics(enabled, fontSize) {
        if (enabled === void 0) { enabled = false; }
        if (fontSize === void 0) { fontSize = '12px'; }
        this.enabled_ = enabled;
        this.fontSize_ = fontSize;
        this.reset();
    }
    Diagnostics.STUB = function () {
        // empty by intention
    };
    Diagnostics.prototype.reset = function () {
        // uses bound functions to avoid browsers outputting incorrect line numbers
        if (this.enabled_) {
            if (!process || 'browser' in process) {
                // browser
                this.log = _.bind(console.log, console, '%c%s');
                this.trace = _.bind(console.trace, console, '%c%s', "color: #378c13; font-size: " + this.fontSize_ + ";font-weight: normal;");
                this.debug = _.bind(console.info, console, '%c%s', "color: #008c13; font-size: " + this.fontSize_ + ";font-weight: normal;");
                this.info = _.bind(console.info, console, '%c%s', "color: #00f; font-size: " + this.fontSize_ + ";font-weight: normal;");
                this.warn = _.bind(console.warn, console, '%c%s', "color: #e69138; font-size: " + this.fontSize_ + ";font-weight: normal;");
                this.error = _.bind(console.error, console, '%c%s', "color: #f00; font-size: " + this.fontSize_ + ";font-weight: normal;");
            }
            else {
                // node
                this.log = _.bind(console.log, console, '\u001b[15m  LOG\u001b[00m %s');
                this.trace = _.bind(console.trace, console, '\u001b[34mTRACE\u001b[00m %s');
                this.debug = _.bind(console.info, console, '\u001b[35mDEBUG\u001b[00m %s');
                this.info = _.bind(console.info, console, '\u001b[32m INFO\u001b[00m %s');
                this.warn = _.bind(console.warn, console, '\u001b[36m WARN\u001b[00m %s');
                this.error = _.bind(console.error, console, '\u001b[31mERROR\u001b[00m %s');
            }
        }
        else {
            this.log = Diagnostics.STUB;
            this.trace = Diagnostics.STUB;
            this.debug = Diagnostics.STUB;
            this.info = Diagnostics.STUB;
            this.warn = Diagnostics.STUB;
            this.error = Diagnostics.STUB;
        }
        this.warning = this.warn; // alias only
    };
    Object.defineProperty(Diagnostics.prototype, "enabled", {
        get: function () {
            return this.enabled_;
        },
        set: function (enabled) {
            if (this.enabled_ !== enabled) {
                this.enabled_ = enabled;
                this.reset();
            }
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Diagnostics.prototype, "fontSize", {
        get: function () {
            return this.fontSize_;
        },
        set: function (fontSize) {
            if (this.fontSize_ !== fontSize) {
                this.fontSize_ = fontSize;
                this.reset();
            }
        },
        enumerable: true,
        configurable: true
    });
    /**
     * uses toSource() if available, falling back to toString() otherwise.
     *
     * @param func to generate source of.
     * @return {string} of func.
       */
    Diagnostics.toSource = function (func) {
        var anything = func; // must not type-check as name and toSource() might not exist
        return anything.name ||
            (typeof anything.toSource === 'function' ? anything.toSource() : func.toString());
    };
    /**
     * evaluates given check expression as a strong invariant never ever violated.
     *
     * <p>
     * Use assert to ensure an assumption at runtime. When running with assertions enabled, the
     * check expression is evaluated immediately. A check expression evaluating to false signals a
     * violation of invariant that should never happen. If it does, a hard error is output
     * unconditionally to the console and an AssertionError is thrown.
     * </p>
     * <p>
     * Do not use assertions as a means of ordinary error checking. Here are some valid examples of
     * assertions:
     * <pre>
     *     assert(() => Date.now() > 0, 'current time millis can not be before 1970 start of time!');
     *     assert(() => total_price >= item_price,
     *                  'total is sum of individual prices and thus can not be less than each one!');
     *     assert(() => num*num >= 0, 'squared num is less than zero!');
     * </pre>
     * </p>
     *
     * @param check expression validating an assumption of the calling code, typically an
     *    arrow-function expression.
     * @param message optional explanation of disaster.
     */
    Diagnostics.prototype.assert = function (check, message) {
        var debugMode = this.enabled;
        if (exports.assertions === undefined ? debugMode : exports.assertions) {
            try {
                if (_.isFunction(check)) {
                    assert(check(), message || Diagnostics.toSource(check));
                }
                else {
                    assert(check, message);
                }
            }
            catch (error) {
                if (debugMode) {
                    this.error('Assertion failed: ' + error.message, error);
                    debugger; // so you can inspect what causes the problem
                }
                else {
                    console.error('Assertion failed: ' + error.message, error);
                }
                throw error;
            }
        }
    };
    /**
     * used in catch-blocks or Promise rejection callbacks to ensure the caught value is an Error.
     *
     * @param error to check.
     * @param message of disaster.
     * @return {any} value evaluating to true stating error is an instance of Error.
     */
    Diagnostics.prototype.assertIsError = function (error, message) {
        this.assert(function () { return _.isError(error); }, message);
        return error;
    };
    return Diagnostics;
}());
exports.Diagnostics = Diagnostics;
exports.debug = new Diagnostics(true);
//# sourceMappingURL=diag.js.map