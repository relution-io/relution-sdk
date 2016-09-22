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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL2RpYWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQTJCakM7O0dBRUc7QUFDSDtJQVFFLHFCQUFtQixPQUFlLEVBQUUsUUFBaUI7UUFBbEMsdUJBQWUsR0FBZixlQUFlO1FBQUUsd0JBQWlCLEdBQWpCLGlCQUFpQjtRQUNuRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUMxQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDZixDQUFDO0lBWGMsZ0JBQUksR0FBbkI7UUFDRSxxQkFBcUI7SUFDdkIsQ0FBQztJQVdPLDJCQUFLLEdBQWI7UUFDRSwyRUFBMkU7UUFDM0UsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDbEIsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLElBQUksU0FBUyxJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLFVBQVU7Z0JBQ1YsSUFBSSxDQUFDLEdBQUcsR0FBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUN6RCxJQUFJLENBQUMsS0FBSyxHQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUN6RCxnQ0FBOEIsSUFBSSxDQUFDLFNBQVMsMEJBQXVCLENBQUMsQ0FBQztnQkFDdkUsSUFBSSxDQUFDLEtBQUssR0FBWSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8s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LElBQUksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDeEQsUUFBUSxDQUFDLENBQUMsNkNBQTZDO2dCQUN6RCxDQUFDO2dCQUFDLElBQUksQ0FBQyxDQUFDO29CQUNOLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDN0QsQ0FBQztnQkFDRCxNQUFNLEtBQUssQ0FBQztZQUNkLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNJLG1DQUFhLEdBQXBCLFVBQXFCLEtBQVUsRUFBRSxPQUFnQjtRQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFoQixDQUFnQixFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQ0gsa0JBQUM7QUFBRCxDQUFDLEFBckpELElBcUpDO0FBckpZLG1CQUFXLGNBcUp2QixDQUFBO0FBRVksYUFBSyxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGNvcmUvZGlhZy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBQYXNjYWwgQnJld2luZywgVGhvbWFzIEJlY2ttYW5uXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgY29yZVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5cbi8qKlxuICogZXhwcmVzc2lvbiB2YWxpZGF0aW5nIGFuIGFzc3VtcHRpb24gb2YgdGhlIGNhbGxpbmcgY29kZSwgdHlwaWNhbGx5IGFuIGFycm93LWZ1bmN0aW9uIGV4cHJlc3Npb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXNzZXJ0aW9uQ2hlY2sge1xuICAoKTogYm9vbGVhbjtcbn1cblxuLyoqXG4gKiBzdWJ0eXBlIG9mIEVycm9yIHRocm93biBieSBhc3NlcnQoKSBpbiBjYXNlIEFzc2VydGlvbkNoZWNrIGZhaWxzLlxuICovXG5leHBvcnQgdHlwZSBBc3NlcnRpb25FcnJvciA9IGFzc2VydC5Bc3NlcnRpb25FcnJvcjtcblxuLyoqXG4gKiBlbmFibGVzL2Rpc2FibGVzIGFzc2VydGlvbiB0ZXN0aW5nIGF0IHJ1bnRpbWUuXG4gKlxuICogPHA+XG4gKiBXaGVuIHVuZGVmaW5lZCwgaXNEZWJ1Z01vZGUoKSBjb250cm9scyB3aGV0aGVyIGFzc2VydGlvbnMgYXJlIHZhbGlkYXRlZC5cbiAqIDwvcD5cbiAqL1xuZXhwb3J0IGxldCBhc3NlcnRpb25zOiBib29sZWFuO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvZ0Z1bmMge1xuICAobWVzc2FnZTogc3RyaW5nLCAuLi5wYXJhbWV0ZXJzOiBhbnlbXSk6IHZvaWQ7XG59XG5cbi8qKlxuICogY29uc29sZSBmZWF0dXJpbmcgY29sb3JpbmcsIGZvbnRTaXplIGFuZCBlbmFibGVkIHN0YXRlLlxuICovXG5leHBvcnQgY2xhc3MgRGlhZ25vc3RpY3Mge1xuICBwcml2YXRlIHN0YXRpYyBTVFVCKCkge1xuICAgIC8vIGVtcHR5IGJ5IGludGVudGlvblxuICB9XG5cbiAgcHJpdmF0ZSBmb250U2l6ZV86IHN0cmluZztcbiAgcHJpdmF0ZSBlbmFibGVkXzogYm9vbGVhbjtcblxuICBwdWJsaWMgY29uc3RydWN0b3IoZW5hYmxlZCA9IGZhbHNlLCBmb250U2l6ZSA9ICcxMnB4Jykge1xuICAgIHRoaXMuZW5hYmxlZF8gPSBlbmFibGVkO1xuICAgIHRoaXMuZm9udFNpemVfID0gZm9udFNpemU7XG4gICAgdGhpcy5yZXNldCgpO1xuICB9XG5cbiAgcHJpdmF0ZSByZXNldCgpIHtcbiAgICAvLyB1c2VzIGJvdW5kIGZ1bmN0aW9ucyB0byBhdm9pZCBicm93c2VycyBvdXRwdXR0aW5nIGluY29ycmVjdCBsaW5lIG51bWJlcnNcbiAgICBpZiAodGhpcy5lbmFibGVkXykge1xuICAgICAgaWYgKCFwcm9jZXNzIHx8ICdicm93c2VyJyBpbiBwcm9jZXNzKSB7XG4gICAgICAgIC8vIGJyb3dzZXJcbiAgICAgICAgdGhpcy5sb2cgPSA8TG9nRnVuYz5fLmJpbmQoY29uc29sZS5sb2csIGNvbnNvbGUsICclYyVzJyk7XG4gICAgICAgIHRoaXMudHJhY2UgPSA8TG9nRnVuYz5fLmJpbmQoY29uc29sZS50cmFjZSwgY29uc29sZSwgJyVjJXMnLFxuICAgICAgICAgIGBjb2xvcjogIzM3OGMxMzsgZm9udC1zaXplOiAke3RoaXMuZm9udFNpemVffTtmb250LXdlaWdodDogbm9ybWFsO2ApO1xuICAgICAgICB0aGlzLmRlYnVnID0gPExvZ0Z1bmM+Xy5iaW5kKGNvbnNvbGUuaW5mbywgY29uc29sZSwgJyVjJXMnLFxuICAgICAgICAgIGBjb2xvcjogIzAwOGMxMzsgZm9udC1zaXplOiAke3RoaXMuZm9udFNpemVffTtmb250LXdlaWdodDogbm9ybWFsO2ApO1xuICAgICAgICB0aGlzLmluZm8gPSA8TG9nRnVuYz5fLmJpbmQoY29uc29sZS5pbmZvLCBjb25zb2xlLCAnJWMlcycsXG4gICAgICAgICAgYGNvbG9yOiAjMDBmOyBmb250LXNpemU6ICR7dGhpcy5mb250U2l6ZV99O2ZvbnQtd2VpZ2h0OiBub3JtYWw7YCk7XG4gICAgICAgIHRoaXMud2FybiA9IDxMb2dGdW5jPl8uYmluZChjb25zb2xlLndhcm4sIGNvbnNvbGUsICclYyVzJyxcbiAgICAgICAgICBgY29sb3I6ICNlNjkxMzg7IGZvbnQtc2l6ZTogJHt0aGlzLmZvbnRTaXplX307Zm9udC13ZWlnaHQ6IG5vcm1hbDtgKTtcbiAgICAgICAgdGhpcy5lcnJvciA9IDxMb2dGdW5jPl8uYmluZChjb25zb2xlLmVycm9yLCBjb25zb2xlLCAnJWMlcycsXG4gICAgICAgICAgYGNvbG9yOiAjZjAwOyBmb250LXNpemU6ICR7dGhpcy5mb250U2l6ZV99O2ZvbnQtd2VpZ2h0OiBub3JtYWw7YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBub2RlXG4gICAgICAgIHRoaXMubG9nID0gPExvZ0Z1bmM+Xy5iaW5kKGNvbnNvbGUubG9nLCBjb25zb2xlLCAnXFx1MDAxYlsxNW0gIExPR1xcdTAwMWJbMDBtICVzJyk7XG4gICAgICAgIHRoaXMudHJhY2UgPSA8TG9nRnVuYz5fLmJpbmQoY29uc29sZS50cmFjZSwgY29uc29sZSwgJ1xcdTAwMWJbMzRtVFJBQ0VcXHUwMDFiWzAwbSAlcycpO1xuICAgICAgICB0aGlzLmRlYnVnID0gPExvZ0Z1bmM+Xy5iaW5kKGNvbnNvbGUuaW5mbywgY29uc29sZSwgJ1xcdTAwMWJbMzVtREVCVUdcXHUwMDFiWzAwbSAlcycpO1xuICAgICAgICB0aGlzLmluZm8gPSA8TG9nRnVuYz5fLmJpbmQoY29uc29sZS5pbmZvLCBjb25zb2xlLCAnXFx1MDAxYlszMm0gSU5GT1xcdTAwMWJbMDBtICVzJyk7XG4gICAgICAgIHRoaXMud2FybiA9IDxMb2dGdW5jPl8uYmluZChjb25zb2xlLndhcm4sIGNvbnNvbGUsICdcXHUwMDFiWzM2bSBXQVJOXFx1MDAxYlswMG0gJXMnKTtcbiAgICAgICAgdGhpcy5lcnJvciA9IDxMb2dGdW5jPl8uYmluZChjb25zb2xlLmVycm9yLCBjb25zb2xlLCAnXFx1MDAxYlszMW1FUlJPUlxcdTAwMWJbMDBtICVzJyk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMubG9nID0gRGlhZ25vc3RpY3MuU1RVQjtcbiAgICAgIHRoaXMudHJhY2UgPSBEaWFnbm9zdGljcy5TVFVCO1xuICAgICAgdGhpcy5kZWJ1ZyA9IERpYWdub3N0aWNzLlNUVUI7XG4gICAgICB0aGlzLmluZm8gPSBEaWFnbm9zdGljcy5TVFVCO1xuICAgICAgdGhpcy53YXJuID0gRGlhZ25vc3RpY3MuU1RVQjtcbiAgICAgIHRoaXMuZXJyb3IgPSBEaWFnbm9zdGljcy5TVFVCO1xuICAgIH1cbiAgICB0aGlzLndhcm5pbmcgPSB0aGlzLndhcm47IC8vIGFsaWFzIG9ubHlcbiAgfVxuXG4gIHB1YmxpYyBnZXQgZW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5lbmFibGVkXztcbiAgfVxuXG4gIHB1YmxpYyBzZXQgZW5hYmxlZChlbmFibGVkOiBib29sZWFuKSB7XG4gICAgaWYgKHRoaXMuZW5hYmxlZF8gIT09IGVuYWJsZWQpIHtcbiAgICAgIHRoaXMuZW5hYmxlZF8gPSBlbmFibGVkO1xuICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBnZXQgZm9udFNpemUoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gdGhpcy5mb250U2l6ZV87XG4gIH1cblxuICBwdWJsaWMgc2V0IGZvbnRTaXplKGZvbnRTaXplOiBzdHJpbmcpIHtcbiAgICBpZiAodGhpcy5mb250U2l6ZV8gIT09IGZvbnRTaXplKSB7XG4gICAgICB0aGlzLmZvbnRTaXplXyA9IGZvbnRTaXplO1xuICAgICAgdGhpcy5yZXNldCgpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBsb2c6IExvZ0Z1bmM7XG5cbiAgcHVibGljIHRyYWNlOiBMb2dGdW5jO1xuICBwdWJsaWMgZGVidWc6IExvZ0Z1bmM7XG4gIHB1YmxpYyBpbmZvOiBMb2dGdW5jO1xuICBwdWJsaWMgd2FybjogTG9nRnVuYztcbiAgcHVibGljIHdhcm5pbmc6IExvZ0Z1bmM7XG4gIHB1YmxpYyBlcnJvcjogTG9nRnVuYztcblxuICAvKipcbiAgICogdXNlcyB0b1NvdXJjZSgpIGlmIGF2YWlsYWJsZSwgZmFsbGluZyBiYWNrIHRvIHRvU3RyaW5nKCkgb3RoZXJ3aXNlLlxuICAgKlxuICAgKiBAcGFyYW0gZnVuYyB0byBnZW5lcmF0ZSBzb3VyY2Ugb2YuXG4gICAqIEByZXR1cm4ge3N0cmluZ30gb2YgZnVuYy5cbiAgICAgKi9cbiAgcHJpdmF0ZSBzdGF0aWMgdG9Tb3VyY2UoZnVuYzogRnVuY3Rpb24pOiBzdHJpbmcge1xuICAgIGxldCBhbnl0aGluZzogYW55ID0gZnVuYzsgLy8gbXVzdCBub3QgdHlwZS1jaGVjayBhcyBuYW1lIGFuZCB0b1NvdXJjZSgpIG1pZ2h0IG5vdCBleGlzdFxuICAgIHJldHVybiBhbnl0aGluZy5uYW1lIHx8XG4gICAgICAodHlwZW9mIGFueXRoaW5nLnRvU291cmNlID09PSAnZnVuY3Rpb24nID8gYW55dGhpbmcudG9Tb3VyY2UoKSA6IGZ1bmMudG9TdHJpbmcoKSk7XG4gIH1cblxuICAvKipcbiAgICogZXZhbHVhdGVzIGdpdmVuIGNoZWNrIGV4cHJlc3Npb24gYXMgYSBzdHJvbmcgaW52YXJpYW50IG5ldmVyIGV2ZXIgdmlvbGF0ZWQuXG4gICAqXG4gICAqIDxwPlxuICAgKiBVc2UgYXNzZXJ0IHRvIGVuc3VyZSBhbiBhc3N1bXB0aW9uIGF0IHJ1bnRpbWUuIFdoZW4gcnVubmluZyB3aXRoIGFzc2VydGlvbnMgZW5hYmxlZCwgdGhlXG4gICAqIGNoZWNrIGV4cHJlc3Npb24gaXMgZXZhbHVhdGVkIGltbWVkaWF0ZWx5LiBBIGNoZWNrIGV4cHJlc3Npb24gZXZhbHVhdGluZyB0byBmYWxzZSBzaWduYWxzIGFcbiAgICogdmlvbGF0aW9uIG9mIGludmFyaWFudCB0aGF0IHNob3VsZCBuZXZlciBoYXBwZW4uIElmIGl0IGRvZXMsIGEgaGFyZCBlcnJvciBpcyBvdXRwdXRcbiAgICogdW5jb25kaXRpb25hbGx5IHRvIHRoZSBjb25zb2xlIGFuZCBhbiBBc3NlcnRpb25FcnJvciBpcyB0aHJvd24uXG4gICAqIDwvcD5cbiAgICogPHA+XG4gICAqIERvIG5vdCB1c2UgYXNzZXJ0aW9ucyBhcyBhIG1lYW5zIG9mIG9yZGluYXJ5IGVycm9yIGNoZWNraW5nLiBIZXJlIGFyZSBzb21lIHZhbGlkIGV4YW1wbGVzIG9mXG4gICAqIGFzc2VydGlvbnM6XG4gICAqIDxwcmU+XG4gICAqICAgICBhc3NlcnQoKCkgPT4gRGF0ZS5ub3coKSA+IDAsICdjdXJyZW50IHRpbWUgbWlsbGlzIGNhbiBub3QgYmUgYmVmb3JlIDE5NzAgc3RhcnQgb2YgdGltZSEnKTtcbiAgICogICAgIGFzc2VydCgoKSA9PiB0b3RhbF9wcmljZSA+PSBpdGVtX3ByaWNlLFxuICAgKiAgICAgICAgICAgICAgICAgICd0b3RhbCBpcyBzdW0gb2YgaW5kaXZpZHVhbCBwcmljZXMgYW5kIHRodXMgY2FuIG5vdCBiZSBsZXNzIHRoYW4gZWFjaCBvbmUhJyk7XG4gICAqICAgICBhc3NlcnQoKCkgPT4gbnVtKm51bSA+PSAwLCAnc3F1YXJlZCBudW0gaXMgbGVzcyB0aGFuIHplcm8hJyk7XG4gICAqIDwvcHJlPlxuICAgKiA8L3A+XG4gICAqXG4gICAqIEBwYXJhbSBjaGVjayBleHByZXNzaW9uIHZhbGlkYXRpbmcgYW4gYXNzdW1wdGlvbiBvZiB0aGUgY2FsbGluZyBjb2RlLCB0eXBpY2FsbHkgYW5cbiAgICogICAgYXJyb3ctZnVuY3Rpb24gZXhwcmVzc2lvbi5cbiAgICogQHBhcmFtIG1lc3NhZ2Ugb3B0aW9uYWwgZXhwbGFuYXRpb24gb2YgZGlzYXN0ZXIuXG4gICAqL1xuICBwdWJsaWMgYXNzZXJ0KGNoZWNrOiBBc3NlcnRpb25DaGVjayB8IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBsZXQgZGVidWdNb2RlID0gdGhpcy5lbmFibGVkO1xuICAgIGlmIChhc3NlcnRpb25zID09PSB1bmRlZmluZWQgPyBkZWJ1Z01vZGUgOiBhc3NlcnRpb25zKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGNoZWNrKSkge1xuICAgICAgICAgIGFzc2VydChjaGVjaygpLCBtZXNzYWdlIHx8IERpYWdub3N0aWNzLnRvU291cmNlKGNoZWNrKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYXNzZXJ0KGNoZWNrLCBtZXNzYWdlKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaWYgKGRlYnVnTW9kZSkge1xuICAgICAgICAgIHRoaXMuZXJyb3IoJ0Fzc2VydGlvbiBmYWlsZWQ6ICcgKyBlcnJvci5tZXNzYWdlLCBlcnJvcik7XG4gICAgICAgICAgZGVidWdnZXI7IC8vIHNvIHlvdSBjYW4gaW5zcGVjdCB3aGF0IGNhdXNlcyB0aGUgcHJvYmxlbVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Fzc2VydGlvbiBmYWlsZWQ6ICcgKyBlcnJvci5tZXNzYWdlLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHVzZWQgaW4gY2F0Y2gtYmxvY2tzIG9yIFByb21pc2UgcmVqZWN0aW9uIGNhbGxiYWNrcyB0byBlbnN1cmUgdGhlIGNhdWdodCB2YWx1ZSBpcyBhbiBFcnJvci5cbiAgICpcbiAgICogQHBhcmFtIGVycm9yIHRvIGNoZWNrLlxuICAgKiBAcGFyYW0gbWVzc2FnZSBvZiBkaXNhc3Rlci5cbiAgICogQHJldHVybiB7YW55fSB2YWx1ZSBldmFsdWF0aW5nIHRvIHRydWUgc3RhdGluZyBlcnJvciBpcyBhbiBpbnN0YW5jZSBvZiBFcnJvci5cbiAgICovXG4gIHB1YmxpYyBhc3NlcnRJc0Vycm9yKGVycm9yOiBhbnksIG1lc3NhZ2U/OiBzdHJpbmcpOiBlcnJvciBpcyBFcnJvciB7XG4gICAgdGhpcy5hc3NlcnQoKCkgPT4gXy5pc0Vycm9yKGVycm9yKSwgbWVzc2FnZSk7XG4gICAgcmV0dXJuIGVycm9yO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBkZWJ1ZyA9IG5ldyBEaWFnbm9zdGljcyh0cnVlKTtcbiJdfQ==