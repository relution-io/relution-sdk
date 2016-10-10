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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksUUFBUSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3JDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBTXJDLHFCQUF5QixRQUFRLENBQUMsQ0FBQTtBQTJDbEM7Ozs7O0dBS0c7QUFDSCxpQkFBd0IsTUFBVztJQUNqQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7SUFDZixDQUFDO0lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxNQUFNLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUF4RCxDQUF3RCxDQUFDLENBQUM7UUFDbEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFDeEIsQ0FBQztJQUFDLElBQUksQ0FBQyxDQUFDO1FBQ04sTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQy9DLENBQUM7QUFDSCxDQUFDO0FBVGUsZUFBTyxVQVN0QixDQUFBO0FBRUQ7O0dBRUc7QUFDSCxVQUFrQixtQ0FBbUM7SUFBUyxnQkFBNUMsbUNBQW1DLFVBQXVCO0lBZ0IxRSxlQWhCZ0IsbUNBQW1DLENBZ0JoQyxVQUFnQixFQUFFLE9BQWE7UUFD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LENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzdDLENBQUM7WUFDRCxNQUFNLENBQUMsR0FBRyxDQUFDO1FBQ2IsQ0FBQztJQUNILENBQUM7SUFFSCxhQXZGa0IsbUNBdUZqQjtBQUFELENBQUMsQUF2RkQsQ0FBOEQsUUFBUSxDQUFDLEtBQUssR0F1RjNFO0FBdkZZLGNBQUssbUNBQW1DLEFBQW5DLFNBQUEsbUNBdUZqQixDQUFBO0FBRUQsU0FBUztBQUNULElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRTtJQUNwQyxLQUFLLEVBQUUseUJBQXlCO0lBQ2hDLE9BQU8sRUFBRSxJQUFJO0lBQ2IsWUFBWSxFQUFFLEtBQUs7SUFDbkIsT0FBTyxFQUFFLEtBQUs7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBN0IsQ0FBNkIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvTW9kZWwudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgTS1XYXkgb24gMjcuMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcblxyXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XHJcblxyXG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5pbXBvcnQge1N5bmNFbmRwb2ludH0gZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xyXG5cclxuaW1wb3J0IHthamF4LCBzeW5jfSBmcm9tICcuL3Jlc3QnO1xyXG5cclxuLyoqXHJcbiAqIHByb3RvdHlwZSBwcm9wZXJ0aWVzIHNwZWNpZmllZCB3aGVuIHN1YmNsYXNzaW5nIHVzaW5nIE1vZGVsLmRlZmF1bHRzKCkuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVsUHJvcHMge1xyXG4gIHR5cGU/OiB7XHJcbiAgICAgIGNvbnRhaW5lcjogc3RyaW5nO1xyXG4gICAgICBtb2RlbDogc3RyaW5nO1xyXG4gIH0gfCBzdHJpbmc7XHJcbiAgZW50aXR5Pzogc3RyaW5nO1xyXG4gIHRlbmFuY3k/OiAnVVNFUicgfCAnT1JHQU5JWkFUSU9OJyB8ICdTQ09QRSc7IC8vIGNvbS5td2F5c29sdXRpb25zLmdvZmVyMi5iaWtpbmkuZG9tYWluLkxpdmVEYXRhVGVuYW5jeVxyXG5cclxuICBpZEF0dHJpYnV0ZT86IHN0cmluZztcclxuICBhY2xBdHRyaWJ1dGU/OiBzdHJpbmc7XHJcblxyXG4gIGRlZmF1bHRzPzogYW55O1xyXG5cclxuICB1cmw/OiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKTtcclxuICB1cmxSb290Pzogc3RyaW5nIHwgKCgpID0+IHN0cmluZyk7XHJcbiAgc3RvcmU/OiBTdG9yZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIE1vZGVsLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBNb2RlbEN0b3JUPE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+IHtcclxuICAvKipcclxuICAgKiBwcm90b3R5cGUgb2YgY29uc3RydWN0b3IgZnVuY3Rpb24uXHJcbiAgICovXHJcbiAgcHJvdG90eXBlOiBNb2RlbFR5cGU7XHJcblxyXG4gIC8qKlxyXG4gICAqIEBzZWUgTW9kZWwjY29uc3RydWN0b3JcclxuICAgKi9cclxuICBuZXcoYXR0cmlidXRlcz86IEF0dHJpYnV0ZXNUeXBlLCBvcHRpb25zPzogT3B0aW9uc1R5cGUpOiBNb2RlbFR5cGU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBjb25zdHJ1Y3RvciBmdW5jdGlvbiBvZiBNb2RlbC5cclxuICovXHJcbmV4cG9ydCB0eXBlIE1vZGVsQ3RvciA9IE1vZGVsQ3RvclQ8TW9kZWwsIGFueSwgYW55PjtcclxuXHJcbi8qKlxyXG4gKiB0ZXN0cyB3aGV0aGVyIGEgZ2l2ZW4gb2JqZWN0IGlzIGEgTW9kZWwuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgdG8gY2hlY2suXHJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgb2JqZWN0IGlzIGEgTW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNNb2RlbChvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBNb2RlbCB7XHJcbiAgaWYgKCFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9IGVsc2UgaWYgKCdpc01vZGVsJyBpbiBvYmplY3QpIHtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG9iamVjdC5pc01vZGVsID09PSBNb2RlbC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpKTtcclxuICAgIHJldHVybiBvYmplY3QuaXNNb2RlbDtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIE1vZGVsLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogZXh0ZW5zaW9uIG9mIGEgYmFja2JvbmUuanMgTW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTW9kZWwvKjxBdHRyaWJ1dGVzVHlwZSBleHRlbmRzIE9iamVjdD4qLyBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcclxuXHJcbiAgcHVibGljIF90eXBlOiBzdHJpbmc7ICAgICAgICAgLy8gY29uc3RhbnQgJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCB0cnVlIG9uIHByb3RvdHlwZVxyXG4gIHB1YmxpYyBpc0NvbGxlY3Rpb246IGJvb2xlYW47IC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxyXG4gIHB1YmxpYyBpc1N0b3JlOiBib29sZWFuOyAgICAgIC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxyXG5cclxuICBwdWJsaWMgZW50aXR5OiBzdHJpbmc7XHJcbiAgcHVibGljIGNoYW5nZWRTaW5jZVN5bmMgPSB7fTtcclxuXHJcbiAgcHVibGljIGNvbGxlY3Rpb246IENvbGxlY3Rpb247XHJcbiAgcHVibGljIHN0b3JlOiBTdG9yZTtcclxuICBwdWJsaWMgY3JlZGVudGlhbHM6IGFueTtcclxuXHJcbiAgcHVibGljIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQ7XHJcblxyXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzPzogYW55LCBvcHRpb25zPzogYW55KSB7XHJcbiAgICBzdXBlcihhdHRyaWJ1dGVzLCBvcHRpb25zKTtcclxuXHJcbiAgICBpZiAodGhpcy51cmxSb290ICYmIHR5cGVvZiB0aGlzLnVybFJvb3QgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIGlmICh0aGlzLnVybFJvb3QuY2hhckF0KHRoaXMudXJsUm9vdC5sZW5ndGggLSAxKSAhPT0gJy8nKSB7XHJcbiAgICAgICAgdGhpcy51cmxSb290ICs9ICcvJztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaW5pdChhdHRyaWJ1dGVzLCBvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIHNldHMgdXAgcHJvdG90eXBlIHByb3BlcnRpZXMgd2hlbiBkZWZpbmluZyBhIE1vZGVsIHN1YmNsYXNzLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB7TW9kZWxQcm9wc30gcHJvcGVydGllcyBvZiBwcm90b3R5cGUgdG8gc2V0LlxyXG4gICAqL1xyXG4gIHB1YmxpYyBzdGF0aWMgZGVmYXVsdHMocHJvcGVydGllczogTW9kZWxQcm9wcyk6IE1vZGVsQ3RvciB7XHJcbiAgICByZXR1cm4gc3VwZXJbJ2V4dGVuZCddKHByb3BlcnRpZXMpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGluaXQoYXR0cmlidXRlcz86IGFueSwgb3B0aW9ucz86IGFueSkge1xyXG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XHJcblxyXG4gICAgdGhpcy5jb2xsZWN0aW9uID0gb3B0aW9ucy5jb2xsZWN0aW9uIHx8IHRoaXMuY29sbGVjdGlvbjtcclxuICAgIHRoaXMuaWRBdHRyaWJ1dGUgPSBvcHRpb25zLmlkQXR0cmlidXRlIHx8IHRoaXMuaWRBdHRyaWJ1dGU7XHJcbiAgICB0aGlzLnN0b3JlID0gdGhpcy5zdG9yZSB8fCAodGhpcy5jb2xsZWN0aW9uID8gdGhpcy5jb2xsZWN0aW9uLnN0b3JlIDogbnVsbCkgfHwgb3B0aW9ucy5zdG9yZTtcclxuICAgIGlmICh0aGlzLnN0b3JlICYmIF8uaXNGdW5jdGlvbih0aGlzLnN0b3JlLmluaXRNb2RlbCkpIHtcclxuICAgICAgdGhpcy5zdG9yZS5pbml0TW9kZWwodGhpcywgb3B0aW9ucyk7XHJcbiAgICB9XHJcbiAgICB0aGlzLmVudGl0eSA9IHRoaXMuZW50aXR5IHx8ICh0aGlzLmNvbGxlY3Rpb24gPyB0aGlzLmNvbGxlY3Rpb24uZW50aXR5IDogbnVsbCkgfHwgb3B0aW9ucy5lbnRpdHk7XHJcbiAgICB0aGlzLmNyZWRlbnRpYWxzID0gdGhpcy5jcmVkZW50aWFscyB8fCAodGhpcy5jb2xsZWN0aW9uID8gdGhpcy5jb2xsZWN0aW9uLmNyZWRlbnRpYWxzIDogbnVsbCkgfHwgb3B0aW9ucy5jcmVkZW50aWFscztcclxuICAgIHRoaXMub24oJ2NoYW5nZScsIHRoaXMub25DaGFuZ2UsIHRoaXMpO1xyXG4gICAgdGhpcy5vbignc3luYycsIHRoaXMub25TeW5jLCB0aGlzKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhamF4KG9wdGlvbnM6IGFueSkge1xyXG4gICAgcmV0dXJuIGFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB9XHJcbiAgcHVibGljIHN5bmMobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBCYWNrYm9uZS5Nb2RlbEJhc2UsIG9wdGlvbnM/OiBhbnkpIHtcclxuICAgIHJldHVybiBzeW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgb25DaGFuZ2UobW9kZWw6IE1vZGVsLCBvcHRpb25zOiBhbnkpIHtcclxuICAgIC8vIEZvciBlYWNoIGBzZXRgIGF0dHJpYnV0ZSwgdXBkYXRlIG9yIGRlbGV0ZSB0aGUgY3VycmVudCB2YWx1ZS5cclxuICAgIHZhciBhdHRycyA9IG1vZGVsLmNoYW5nZWRBdHRyaWJ1dGVzKCk7XHJcbiAgICBpZiAoXy5pc09iamVjdChhdHRycykpIHtcclxuICAgICAgZm9yICh2YXIga2V5IGluIGF0dHJzKSB7XHJcbiAgICAgICAgdGhpcy5jaGFuZ2VkU2luY2VTeW5jW2tleV0gPSBhdHRyc1trZXldO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgb25TeW5jKG1vZGVsOiBNb2RlbCwgb3B0aW9uczogYW55KSB7XHJcbiAgICB0aGlzLmNoYW5nZWRTaW5jZVN5bmMgPSB7fTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRVcmxSb290KCk6IHN0cmluZyB7XHJcbiAgICBpZiAodGhpcy51cmxSb290KSB7XHJcbiAgICAgIHJldHVybiBfLmlzRnVuY3Rpb24odGhpcy51cmxSb290KSA/IHRoaXMudXJsUm9vdCgpIDogdGhpcy51cmxSb290O1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLmNvbGxlY3Rpb24pIHtcclxuICAgICAgcmV0dXJuIHRoaXMuY29sbGVjdGlvbi5nZXRVcmxSb290KCk7XHJcbiAgICB9IGVsc2UgaWYgKHRoaXMudXJsKSB7XHJcbiAgICAgIHZhciB1cmwgPSBfLmlzRnVuY3Rpb24odGhpcy51cmwpID8gdGhpcy51cmwoKSA6IHRoaXMudXJsO1xyXG4gICAgICBpZiAodXJsICYmIHRoaXMuaWQgJiYgdXJsLmluZGV4T2YodGhpcy5pZCkgPiAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHVybC5zdWJzdHIoMCwgdXJsLmluZGV4T2YodGhpcy5pZCkpO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB1cmw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufVxyXG5cclxuLy8gbWl4aW5zXHJcbmxldCBtb2RlbCA9IF8uZXh0ZW5kKE1vZGVsLnByb3RvdHlwZSwge1xyXG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuTW9kZWwnLFxyXG4gIGlzTW9kZWw6IHRydWUsXHJcbiAgaXNDb2xsZWN0aW9uOiBmYWxzZSxcclxuICBpc1N0b3JlOiBmYWxzZVxyXG59KTtcclxuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNNb2RlbChPYmplY3QuY3JlYXRlKG1vZGVsKSkpO1xyXG4iXX0=