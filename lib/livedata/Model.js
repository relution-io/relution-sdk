/*
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
/**
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Backbone = require('backbone');
var _ = require('lodash');
var diag = require('../core/diag');
var rest_1 = require('./rest');
/**
 * tests whether a given object is a Model.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Model.
 */
function isModel(object) {
    if (!object || typeof object !== 'object') {
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
        this.changedSinceSync = {};
        if (this.urlRoot && typeof this.urlRoot === 'string') {
            if (this.urlRoot.charAt(this.urlRoot.length - 1) !== '/') {
                this.urlRoot += '/';
            }
        }
        this.init(attributes, options);
    }
    /**
     * sets up prototype properties when defining a Model subclass.
     *
     * @param {ModelProps} properties of prototype to set.
     */
    Model /*<AttributesType extends Object>*/.defaults = function (properties) {
        return _super['extend'].call(this, properties);
    };
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
    return Model /*<AttributesType extends Object>*/;
}(Backbone.Model));
exports.Model /*<AttributesType extends Object>*/ = Model /*<AttributesType extends Object>*/;
// mixins
var model = _.extend(Model.prototype, {
    _type: 'Relution.livedata.Model',
    isModel: true,
    isCollection: false,
    isStore: false
});
diag.debug.assert(function () { return isModel(Object.create(model)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksUUFBUSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3JDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBTXJDLHFCQUF5QixRQUFRLENBQUMsQ0FBQTtBQTJDbEM7Ozs7O0dBS0c7QUFDSCxpQkFBd0IsTUFBVztJQUNqQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxNQUFNLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUF4RCxDQUF3RCxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLENBQUM7QUFDSCxDQUFDO0FBVGUsZUFBTyxVQVN0QixDQUFBO0FBRUQ7O0dBRUc7QUFDSCxVQUFrQixtQ0FBbUM7SUFBUyxnQkFBNUMsbUNBQW1DLFVBQXVCO0lBZ0IxRSxlQWhCZ0IsbUNBQW1DLENBZ0JoQyxVQUFnQixFQUFFLE9BQWE7UUFD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LENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztJQUNILENBQUM7SUFFSCxhQXZGa0IsbUNBdUZqQjtBQUFELENBQUMsQUF2RkQsQ0FBOEQsUUFBUSxDQUFDLEtBQUssR0F1RjNFO0FBdkZZLGNBQUssbUNBQW1DLEFBQW5DLFNBQUEsbUNBdUZqQixDQUFBO0FBRUQsU0FBUztBQUNULElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtJQUNwQyxLQUFLLEVBQUUseUJBQXlCO0lBQ2hDLE9BQU8sRUFBRSxJQUFJO0lBQ2IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsT0FBTyxFQUFFLEtBQUs7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBN0IsQ0FBNkIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL01vZGVsLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IE0tV2F5IG9uIDI3LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XG5cbmltcG9ydCB7U3RvcmV9IGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuaW1wb3J0IHtTeW5jRW5kcG9pbnR9IGZyb20gJy4vU3luY0VuZHBvaW50JztcblxuaW1wb3J0IHthamF4LCBzeW5jfSBmcm9tICcuL3Jlc3QnO1xuXG4vKipcbiAqIHByb3RvdHlwZSBwcm9wZXJ0aWVzIHNwZWNpZmllZCB3aGVuIHN1YmNsYXNzaW5nIHVzaW5nIE1vZGVsLmRlZmF1bHRzKCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTW9kZWxQcm9wcyB7XG4gIHR5cGU/OiB7XG4gICAgICBjb250YWluZXI6IHN0cmluZztcbiAgICAgIG1vZGVsOiBzdHJpbmc7XG4gIH0gfCBzdHJpbmc7XG4gIGVudGl0eT86IHN0cmluZztcbiAgdGVuYW5jeT86ICdVU0VSJyB8ICdPUkdBTklaQVRJT04nIHwgJ1NDT1BFJzsgLy8gY29tLm13YXlzb2x1dGlvbnMuZ29mZXIyLmJpa2luaS5kb21haW4uTGl2ZURhdGFUZW5hbmN5XG5cbiAgaWRBdHRyaWJ1dGU/OiBzdHJpbmc7XG4gIGFjbEF0dHJpYnV0ZT86IHN0cmluZztcblxuICBkZWZhdWx0cz86IGFueTtcblxuICB1cmw/OiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKTtcbiAgdXJsUm9vdD86IHN0cmluZyB8ICgoKSA9PiBzdHJpbmcpO1xuICBzdG9yZT86IFN0b3JlO1xufVxuXG4vKipcbiAqIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIE1vZGVsLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVsQ3RvclQ8TW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4ge1xuICAvKipcbiAgICogcHJvdG90eXBlIG9mIGNvbnN0cnVjdG9yIGZ1bmN0aW9uLlxuICAgKi9cbiAgcHJvdG90eXBlOiBNb2RlbFR5cGU7XG5cbiAgLyoqXG4gICAqIEBzZWUgTW9kZWwjY29uc3RydWN0b3JcbiAgICovXG4gIG5ldyhhdHRyaWJ1dGVzPzogQXR0cmlidXRlc1R5cGUsIG9wdGlvbnM/OiBPcHRpb25zVHlwZSk6IE1vZGVsVHlwZTtcbn1cblxuLyoqXG4gKiBjb25zdHJ1Y3RvciBmdW5jdGlvbiBvZiBNb2RlbC5cbiAqL1xuZXhwb3J0IHR5cGUgTW9kZWxDdG9yID0gTW9kZWxDdG9yVDxNb2RlbCwgYW55LCBhbnk+O1xuXG4vKipcbiAqIHRlc3RzIHdoZXRoZXIgYSBnaXZlbiBvYmplY3QgaXMgYSBNb2RlbC5cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0IHRvIGNoZWNrLlxuICogQHJldHVybiB7Ym9vbGVhbn0gd2hldGhlciBvYmplY3QgaXMgYSBNb2RlbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzTW9kZWwob2JqZWN0OiBhbnkpOiBvYmplY3QgaXMgTW9kZWwge1xuICBpZiAoIW9iamVjdCB8fCB0eXBlb2Ygb2JqZWN0ICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSBlbHNlIGlmICgnaXNNb2RlbCcgaW4gb2JqZWN0KSB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gb2JqZWN0LmlzTW9kZWwgPT09IE1vZGVsLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCkpO1xuICAgIHJldHVybiBvYmplY3QuaXNNb2RlbDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gTW9kZWwucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqZWN0KTtcbiAgfVxufVxuXG4vKipcbiAqIGV4dGVuc2lvbiBvZiBhIGJhY2tib25lLmpzIE1vZGVsLlxuICovXG5leHBvcnQgY2xhc3MgTW9kZWwvKjxBdHRyaWJ1dGVzVHlwZSBleHRlbmRzIE9iamVjdD4qLyBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcblxuICBwdWJsaWMgX3R5cGU6IHN0cmluZzsgICAgICAgICAvLyBjb25zdGFudCAnUmVsdXRpb24ubGl2ZWRhdGEuTW9kZWwnIG9uIHByb3RvdHlwZVxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCB0cnVlIG9uIHByb3RvdHlwZVxuICBwdWJsaWMgaXNDb2xsZWN0aW9uOiBib29sZWFuOyAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcbiAgcHVibGljIGlzU3RvcmU6IGJvb2xlYW47ICAgICAgLy8gY29uc3RhbnQgZmFsc2Ugb24gcHJvdG90eXBlXG5cbiAgcHVibGljIGVudGl0eTogc3RyaW5nO1xuICBwdWJsaWMgY2hhbmdlZFNpbmNlU3luYyA9IHt9O1xuXG4gIHB1YmxpYyBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uO1xuICBwdWJsaWMgc3RvcmU6IFN0b3JlO1xuICBwdWJsaWMgY3JlZGVudGlhbHM6IGFueTtcblxuICBwdWJsaWMgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludDtcblxuICBwdWJsaWMgY29uc3RydWN0b3IoYXR0cmlidXRlcz86IGFueSwgb3B0aW9ucz86IGFueSkge1xuICAgIHN1cGVyKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuXG4gICAgaWYgKHRoaXMudXJsUm9vdCAmJiB0eXBlb2YgdGhpcy51cmxSb290ID09PSAnc3RyaW5nJykge1xuICAgICAgaWYgKHRoaXMudXJsUm9vdC5jaGFyQXQodGhpcy51cmxSb290Lmxlbmd0aCAtIDEpICE9PSAnLycpIHtcbiAgICAgICAgdGhpcy51cmxSb290ICs9ICcvJztcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLmluaXQoYXR0cmlidXRlcywgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogc2V0cyB1cCBwcm90b3R5cGUgcHJvcGVydGllcyB3aGVuIGRlZmluaW5nIGEgTW9kZWwgc3ViY2xhc3MuXG4gICAqIFxuICAgKiBAcGFyYW0ge01vZGVsUHJvcHN9IHByb3BlcnRpZXMgb2YgcHJvdG90eXBlIHRvIHNldC5cbiAgICovXG4gIHB1YmxpYyBzdGF0aWMgZGVmYXVsdHMocHJvcGVydGllczogTW9kZWxQcm9wcyk6IE1vZGVsQ3RvciB7XG4gICAgcmV0dXJuIHN1cGVyWydleHRlbmQnXShwcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpbml0KGF0dHJpYnV0ZXM/OiBhbnksIG9wdGlvbnM/OiBhbnkpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuICAgIHRoaXMuY29sbGVjdGlvbiA9IG9wdGlvbnMuY29sbGVjdGlvbiB8fCB0aGlzLmNvbGxlY3Rpb247XG4gICAgdGhpcy5pZEF0dHJpYnV0ZSA9IG9wdGlvbnMuaWRBdHRyaWJ1dGUgfHwgdGhpcy5pZEF0dHJpYnV0ZTtcbiAgICB0aGlzLnN0b3JlID0gdGhpcy5zdG9yZSB8fCAodGhpcy5jb2xsZWN0aW9uID8gdGhpcy5jb2xsZWN0aW9uLnN0b3JlIDogbnVsbCkgfHwgb3B0aW9ucy5zdG9yZTtcbiAgICBpZiAodGhpcy5zdG9yZSAmJiBfLmlzRnVuY3Rpb24odGhpcy5zdG9yZS5pbml0TW9kZWwpKSB7XG4gICAgICB0aGlzLnN0b3JlLmluaXRNb2RlbCh0aGlzLCBvcHRpb25zKTtcbiAgICB9XG4gICAgdGhpcy5lbnRpdHkgPSB0aGlzLmVudGl0eSB8fCAodGhpcy5jb2xsZWN0aW9uID8gdGhpcy5jb2xsZWN0aW9uLmVudGl0eSA6IG51bGwpIHx8IG9wdGlvbnMuZW50aXR5O1xuICAgIHRoaXMuY3JlZGVudGlhbHMgPSB0aGlzLmNyZWRlbnRpYWxzIHx8ICh0aGlzLmNvbGxlY3Rpb24gPyB0aGlzLmNvbGxlY3Rpb24uY3JlZGVudGlhbHMgOiBudWxsKSB8fCBvcHRpb25zLmNyZWRlbnRpYWxzO1xuICAgIHRoaXMub24oJ2NoYW5nZScsIHRoaXMub25DaGFuZ2UsIHRoaXMpO1xuICAgIHRoaXMub24oJ3N5bmMnLCB0aGlzLm9uU3luYywgdGhpcyk7XG4gIH1cblxuICBwdWJsaWMgYWpheChvcHRpb25zOiBhbnkpIHtcbiAgICByZXR1cm4gYWpheC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogQmFja2JvbmUuTW9kZWxCYXNlLCBvcHRpb25zPzogYW55KSB7XG4gICAgcmV0dXJuIHN5bmMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIHB1YmxpYyBvbkNoYW5nZShtb2RlbDogTW9kZWwsIG9wdGlvbnM6IGFueSkge1xuICAgIC8vIEZvciBlYWNoIGBzZXRgIGF0dHJpYnV0ZSwgdXBkYXRlIG9yIGRlbGV0ZSB0aGUgY3VycmVudCB2YWx1ZS5cbiAgICB2YXIgYXR0cnMgPSBtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpO1xuICAgIGlmIChfLmlzT2JqZWN0KGF0dHJzKSkge1xuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XG4gICAgICAgIHRoaXMuY2hhbmdlZFNpbmNlU3luY1trZXldID0gYXR0cnNba2V5XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBwdWJsaWMgb25TeW5jKG1vZGVsOiBNb2RlbCwgb3B0aW9uczogYW55KSB7XG4gICAgdGhpcy5jaGFuZ2VkU2luY2VTeW5jID0ge307XG4gIH1cblxuICBwdWJsaWMgZ2V0VXJsUm9vdCgpOiBzdHJpbmcge1xuICAgIGlmICh0aGlzLnVybFJvb3QpIHtcbiAgICAgIHJldHVybiBfLmlzRnVuY3Rpb24odGhpcy51cmxSb290KSA/IHRoaXMudXJsUm9vdCgpIDogdGhpcy51cmxSb290O1xuICAgIH0gZWxzZSBpZiAodGhpcy5jb2xsZWN0aW9uKSB7XG4gICAgICByZXR1cm4gdGhpcy5jb2xsZWN0aW9uLmdldFVybFJvb3QoKTtcbiAgICB9IGVsc2UgaWYgKHRoaXMudXJsKSB7XG4gICAgICB2YXIgdXJsID0gXy5pc0Z1bmN0aW9uKHRoaXMudXJsKSA/IHRoaXMudXJsKCkgOiB0aGlzLnVybDtcbiAgICAgIGlmICh1cmwgJiYgdGhpcy5pZCAmJiB1cmwuaW5kZXhPZih0aGlzLmlkKSA+IDApIHtcbiAgICAgICAgcmV0dXJuIHVybC5zdWJzdHIoMCwgdXJsLmluZGV4T2YodGhpcy5pZCkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVybDtcbiAgICB9XG4gIH1cblxufVxuXG4vLyBtaXhpbnNcbmxldCBtb2RlbCA9IF8uZXh0ZW5kKE1vZGVsLnByb3RvdHlwZSwge1xuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyxcbiAgaXNNb2RlbDogdHJ1ZSxcbiAgaXNDb2xsZWN0aW9uOiBmYWxzZSxcbiAgaXNTdG9yZTogZmFsc2Vcbn0pO1xuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNNb2RlbChPYmplY3QuY3JlYXRlKG1vZGVsKSkpO1xuIl19