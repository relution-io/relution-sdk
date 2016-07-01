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
var Object_1 = require('./Object');
var Collection_1 = require('./Collection');
var Object_2 = require('./Object');
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
    Store.prototype.getArray = function (data) {
        if (_.isArray(data)) {
            return data;
        }
        else if (Collection_1.isCollection(data)) {
            return data.models;
        }
        return _.isObject(data) ? [data] : [];
    };
    Store.prototype.getDataArray = function (data) {
        var array = [];
        if (_.isArray(data) || Object_1.Backbone.Collection.prototype.isPrototypeOf(data)) {
            _.each(data, function (d) {
                var attrs = this.getAttributes(d);
                if (attrs) {
                    array.push(attrs);
                }
            });
        }
        else {
            var attrs = this.getAttributes(data);
            if (attrs) {
                array.push(this.getAttributes(attrs));
            }
        }
        return array;
    };
    Store.prototype.getAttributes = function (model) {
        if (Object_1.Backbone.Model.prototype.isPrototypeOf(model)) {
            return model.attributes;
        }
        return _.isObject(model) ? model : null;
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
     * @param collection usally a collection, but can also be a model
     * @param options
     */
    Store.prototype.fetch = function (collection, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return collection.fetch(opts);
    };
    Store.prototype.create = function (collection, model, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return collection.create(model, opts);
    };
    Store.prototype.save = function (model, attr, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return model.save(attr, opts);
    };
    Store.prototype.destroy = function (model, options) {
        if (model && model.destroy) {
            var opts = _.extend({}, options || {}, { store: this });
            model.destroy(opts);
        }
    };
    Store.prototype._checkData = function (obj, data) {
        if ((!_.isArray(data) || data.length === 0) && !_.isObject(data)) {
            var error = Store.CONST.ERROR_NO_DATA;
            diag.debug.error(error);
            this.handleError(obj, error);
            return false;
        }
        return true;
    };
    Store.prototype.handleSuccess = function (obj) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (obj.success) {
            this.handleCallback.apply(this, [obj.success].concat(args));
        }
        if (obj.finish) {
            this.handleCallback.apply(this, [obj.finish].concat(args));
        }
    };
    Store.prototype.handleError = function (obj) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (obj.error) {
            this.handleCallback.apply(this, [obj.error].concat(args));
        }
        if (obj.finish) {
            this.handleCallback.apply(this, [obj.finish].concat(args));
        }
    };
    Store.prototype.close = function () {
        // nothing to do
    };
    Store.extend = Object_2._extend;
    Store.create = Object_2._create;
    Store.design = Object_2._design;
    Store.CONST = {
        ERROR_NO_DATA: 'No data passed. ',
        ERROR_LOAD_DATA: 'Error while loading data from store. ',
        ERROR_SAVE_DATA: 'Error while saving data to the store. ',
        ERROR_LOAD_IDS: 'Error while loading ids from store. ',
        ERROR_SAVE_IDS: 'Error while saving ids to the store. '
    };
    return Store;
}());
exports.Store = Store;
// mixins
var store = _.extend(Store.prototype, Object_1.Backbone.Events, Object_2._Object.prototype, {
    _type: 'Relution.LiveData.Store',
    isModel: false,
    isCollection: false,
    name: 'relution-livedata'
});
diag.debug.assert(function () { return Store.prototype.isPrototypeOf(Object.create(store)); });
//# sourceMappingURL=Store.js.map