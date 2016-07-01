/**
 * @file livedata/Object.ts
 * Relution SDK
 *
 * Created by M-Way on 27.06.2016
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
"use strict";
var _ = require('lodash');
var diag = require('../core/diag');
/**
 * Backbone of browser via script tag or via require backbone.
 *
 * @internal Not public API, exported for testing purposes only!
 */
exports.Backbone = global['Backbone'] ||
    process && !process['browser'] &&
        (global['Backbone'] = require('backbone')); // required version
function _create(args) {
    return new this(args);
}
exports._create = _create;
function _design(obj) {
    var O = this.extend(obj || {});
    return new O();
}
exports._design = _design;
exports._extend = exports.Backbone.Model.extend;
var _Object = (function () {
    function _Object() {
    }
    /**
     * Creates an object based on a passed prototype.
     *
     * @param {Object} proto The prototype of the new object.
     */
    _Object.prototype._create = function (proto) {
        var F = function () {
        };
        F.prototype = proto;
        return new F();
    };
    /**
     * Includes passed properties into a given object.
     *
     * @param {Object} properties The properties to be included into the given object.
     */
    _Object.prototype.include = function (properties) {
        var _this = this;
        for (var prop in properties) {
            diag.debug.assert(function () { return !_this.hasOwnProperty(prop); });
            this[prop] = properties[prop];
        }
        return this;
    };
    /**
     * Creates a new class and extends it with all functions of the defined super class
     * The function takes multiple input arguments. Each argument serves as additional
     * super classes - see mixins.
     *
     * @param {Object} properties The properties to be included into the given object.
     */
    _Object.prototype.design = function (properties) {
        // create the new object
        var obj = this._create(this);
        // assign the properties passed with the arguments array
        obj.include(properties);
        // return the new object
        return obj;
    };
    /**
     * Binds a method to its caller, so it is always executed within the right scope.
     *
     * @param {Object} caller The scope of the method that should be bound.
     * @param {Function} method The method to be bound.
     * @param {Object} arg One or more arguments. If more, then apply is used instead of call.
     */
    _Object.prototype.bindToCaller = function (caller, method, arg) {
        return function () {
            diag.debug.assert(function () { return typeof method === 'function'; });
            diag.debug.assert(function () { return typeof caller === 'object'; });
            if (Array.isArray(arg)) {
                return method.apply(caller, arg);
            }
            return method.call(caller, arg);
        };
    };
    /**
     * Calls a method defined by a handler
     *
     * @param {Object} handler A function, or an object including target and action to use with bindToCaller.
     */
    _Object.prototype.handleCallback = function (handler) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (handler) {
            var target = typeof handler.target === 'object' ? handler.target : this;
            var action = handler;
            if (typeof handler.action === 'function') {
                action = handler.action;
            }
            else if (typeof handler.action === 'string') {
                action = target[handler.action];
            }
            if (typeof action === 'function') {
                return this.bindToCaller(target, action, args)();
            }
        }
    };
    return _Object;
}());
exports._Object = _Object;
// mixins
var _object = _.extend(_Object.prototype, {
    _type: 'Relution.LiveData._Object'
});
diag.debug.assert(function () { return _Object.prototype.isPrototypeOf(Object.create(_object)); });
//# sourceMappingURL=Object.js.map