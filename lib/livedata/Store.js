/**
 * @file livedata/Store.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 24.06.2015
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
 * tests whether a given object is a Store.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Store.
 */
function isStore(object) {
    if (!object || typeof object !== 'object') {
        return false;
    }
    else if ('isStore' in object) {
        diag.debug.assert(function () { return object.isStore === Store.prototype.isPrototypeOf(object); });
        return object.isStore;
    }
    else {
        return Store.prototype.isPrototypeOf(object);
    }
}
exports.isStore = isStore;
/**
 * base class to build a custom data store.
 */
var Store = (function () {
    function Store(options) {
        if (options) {
            // copy options values into the object
            _.extend(this, options);
        }
    }
    Store.prototype.close = function () {
        // nothing to do
    };
    Store.prototype.initModel = function (model, options) {
        // may be overwritten
    };
    Store.prototype.initCollection = function (collection, options) {
        // may be overwritten
    };
    Store.prototype.sync = function (method, model, options) {
        // must be overwritten
        return Q.reject(new Error('not implemented!')); // purely abstract
    };
    /**
     *
     * @param collection usually a collection, but can also be a model
     * @param options
     */
    Store.prototype.fetch = function (collection, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return collection.fetch(opts);
    };
    Store.prototype.create = function (collection, models, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return new collection(models, opts);
    };
    Store.prototype.save = function (model, attr, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return model.save(attr, opts);
    };
    Store.prototype.destroy = function (model, options) {
        var opts = _.extend({}, options || {}, { store: this });
        model.destroy(opts);
    };
    Store.prototype.handleSuccess = function (options, result) {
        if (options.success) {
            return options.success.call(this, result);
        }
    };
    Store.prototype.handleError = function (options, error) {
        if (options.error) {
            return options.error.call(this, error);
        }
    };
    return Store;
}());
exports.Store = Store;
// mixins
var store = _.extend(Store.prototype, Backbone.Events, {
    _type: 'Relution.livedata.Store',
    isModel: false,
    isCollection: false,
    isStore: true,
    name: 'relution-livedata'
});
diag.debug.assert(function () { return Store.prototype.isPrototypeOf(Object.create(store)); });
//# sourceMappingURL=Store.js.map