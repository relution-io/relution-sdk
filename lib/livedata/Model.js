/**
 * @file livedata/Model.ts
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
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Object_1 = require('./Object');
var rest_1 = require('./rest');
var diag = require('../core/diag');
/**
 * tests whether a given object is a Model.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Model.
 */
function isModel(object) {
    if (typeof object !== 'object') {
        return false;
    }
    else if ('isModel' in object) {
        diag.debug.assert(function () { return object.isModel === Model.prototype.isPrototypeOf(object); });
        return object.isModel;
    }
    else {
        return Model.prototype.isPrototypeOf(object);
    }
}
exports.isModel = isModel;
/**
 * extension of a backbone.js Model.
 */
var Model /*<AttributesType extends Object>*/ = (function (_super) {
    __extends(Model /*<AttributesType extends Object>*/, _super);
    function Model /*<AttributesType extends Object>*/(attributes, options) {
        _super.call(this, attributes, options);
        this.defaults = {};
        this.changedSinceSync = {};
        if (this.urlRoot && typeof this.urlRoot === 'string') {
            if (this.urlRoot.charAt(this.urlRoot.length - 1) !== '/') {
                this.urlRoot += '/';
            }
        }
        this.init(attributes, options);
    }
    Model /*<AttributesType extends Object>*/.prototype.init = function (attributes, options) {
        options = options || {};
        this.collection = options.collection || this.collection;
        this.idAttribute = options.idAttribute || this.idAttribute;
        this.store = this.store || (this.collection ? this.collection.store : null) || options.store;
        if (this.store && _.isFunction(this.store.initModel)) {
            this.store.initModel(this, options);
        }
        this.entity = this.entity || (this.collection ? this.collection.entity : null) || options.entity;
        this.credentials = this.credentials || (this.collection ? this.collection.credentials : null) || options.credentials;
        this.on('change', this.onChange, this);
        this.on('sync', this.onSync, this);
    };
    Model /*<AttributesType extends Object>*/.prototype.ajax = function (options) {
        return rest_1.ajax.apply(this, arguments);
    };
    Model /*<AttributesType extends Object>*/.prototype.sync = function (method, model, options) {
        return rest_1.sync.apply(this, arguments);
    };
    Model /*<AttributesType extends Object>*/.prototype.onChange = function (model, options) {
        // For each `set` attribute, update or delete the current value.
        var attrs = model.changedAttributes();
        if (_.isObject(attrs)) {
            for (var key in attrs) {
                this.changedSinceSync[key] = attrs[key];
            }
        }
    };
    Model /*<AttributesType extends Object>*/.prototype.onSync = function (model, options) {
        this.changedSinceSync = {};
    };
    Model /*<AttributesType extends Object>*/.prototype.getUrlRoot = function () {
        if (this.urlRoot) {
            return _.isFunction(this.urlRoot) ? this.urlRoot() : this.urlRoot;
        }
        else if (this.collection) {
            return this.collection.getUrlRoot();
        }
        else if (this.url) {
            var url = _.isFunction(this.url) ? this.url() : this.url;
            if (url && this.id && url.indexOf(this.id) > 0) {
                return url.substr(0, url.indexOf(this.id));
            }
            return url;
        }
    };
    Model /*<AttributesType extends Object>*/.extend = Backbone.Model.extend;
    Model /*<AttributesType extends Object>*/.create = Object_1._create;
    Model /*<AttributesType extends Object>*/.design = Object_1._design;
    return Model /*<AttributesType extends Object>*/;
}(Backbone.Model));
exports.Model /*<AttributesType extends Object>*/ = Model /*<AttributesType extends Object>*/;
// mixins
var model = _.extend(Model.prototype, Object_1._Object, {
    _type: 'Relution.LiveData.Model',
    isModel: true,
    isCollection: false
});
diag.debug.assert(function () { return isModel(Object.create(model)); });
//# sourceMappingURL=Model.js.map