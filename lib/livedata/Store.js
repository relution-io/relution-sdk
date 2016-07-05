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
var Collection_1 = require('./Collection');
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
        if (_.isArray(data) || Backbone.Collection.prototype.isPrototypeOf(data)) {
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
        if (Backbone.Model.prototype.isPrototypeOf(model)) {
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
        if (model && model.destroy) {
            var opts = _.extend({}, options || {}, { store: this });
            model.destroy(opts);
        }
    };
    Store.prototype._checkData = function (options, data) {
        if ((!_.isArray(data) || data.length === 0) && !_.isObject(data)) {
            var error = new Error('no data.');
            diag.debug.error(error.message);
            this.handleError(options, error);
            return false;
        }
        return true;
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
    _type: 'Relution.LiveData.Store',
    isModel: false,
    isCollection: false,
    name: 'relution-livedata'
});
diag.debug.assert(function () { return Store.prototype.isPrototypeOf(Object.create(store)); });
//# sourceMappingURL=Store.js.map