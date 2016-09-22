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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksUUFBUSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3JDLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBTXJDLHFCQUF5QixRQUFRLENBQUMsQ0FBQTtBQVlsQzs7Ozs7R0FLRztBQUNILGlCQUF3QixNQUFXO0lBQ2pDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDL0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLE1BQU0sQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQXhELENBQXdELENBQUMsQ0FBQztRQUNsRixNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUN4QixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDL0MsQ0FBQztBQUNILENBQUM7QUFUZSxlQUFPLFVBU3RCLENBQUE7QUFFRDs7R0FFRztBQUNILFVBQWtCLG1DQUFtQztJQUFTLGdCQUE1QyxtQ0FBbUMsVUFBdUI7SUFnQjFFLGVBaEJnQixtQ0FBbUMsQ0FnQmhDLFVBQWdCLEVBQUUsT0FBYTtRQUNo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QUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDN0MsQ0FBQztZQUNELE1BQU0sQ0FBQyxHQUFHLENBQUM7UUFDYixDQUFDO0lBQ0gsQ0FBQztJQUVILGFBOUVrQixtQ0E4RWpCO0FBQUQsQ0FBQyxBQTlFRCxDQUE4RCxRQUFRLENBQUMsS0FBSyxHQThFM0U7QUE5RVksY0FBSyxtQ0FBbUMsQUFBbkMsU0FBQSxtQ0E4RWpCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFO0lBQ3BDLEtBQUssRUFBRSx5QkFBeUI7SUFDaEMsT0FBTyxFQUFFLElBQUk7SUFDYixZQUFZLEVBQUUsS0FBSztJQUNuQixPQUFPLEVBQUUsS0FBSztDQUNmLENBQUMsQ0FBQztBQUNILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUE3QixDQUE2QixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9Nb2RlbC50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBNLVdheSBvbiAyNy4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSc7XHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuXHJcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcclxuXHJcbmltcG9ydCB7U3RvcmV9IGZyb20gJy4vU3RvcmUnO1xyXG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XHJcblxyXG5pbXBvcnQge2FqYXgsIHN5bmN9IGZyb20gJy4vcmVzdCc7XHJcblxyXG4vKipcclxuICogY29uc3RydWN0b3IgZnVuY3Rpb24gb2YgTW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVsQ3RvciB7XHJcbiAgLyoqXHJcbiAgICogQHNlZSBNb2RlbCNjb25zdHJ1Y3RvclxyXG4gICAqL1xyXG4gIG5ldyhhdHRyaWJ1dGVzPzogYW55LCBvcHRpb25zPzogYW55KTogTW9kZWw7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0ZXN0cyB3aGV0aGVyIGEgZ2l2ZW4gb2JqZWN0IGlzIGEgTW9kZWwuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgdG8gY2hlY2suXHJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgb2JqZWN0IGlzIGEgTW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNNb2RlbChvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBNb2RlbCB7XHJcbiAgaWYgKCFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9IGVsc2UgaWYgKCdpc01vZGVsJyBpbiBvYmplY3QpIHtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG9iamVjdC5pc01vZGVsID09PSBNb2RlbC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpKTtcclxuICAgIHJldHVybiBvYmplY3QuaXNNb2RlbDtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIE1vZGVsLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogZXh0ZW5zaW9uIG9mIGEgYmFja2JvbmUuanMgTW9kZWwuXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTW9kZWwvKjxBdHRyaWJ1dGVzVHlwZSBleHRlbmRzIE9iamVjdD4qLyBleHRlbmRzIEJhY2tib25lLk1vZGVsIHtcclxuXHJcbiAgcHVibGljIF90eXBlOiBzdHJpbmc7ICAgICAgICAgLy8gY29uc3RhbnQgJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCB0cnVlIG9uIHByb3RvdHlwZVxyXG4gIHB1YmxpYyBpc0NvbGxlY3Rpb246IGJvb2xlYW47IC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxyXG4gIHB1YmxpYyBpc1N0b3JlOiBib29sZWFuOyAgICAgIC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxyXG5cclxuICBwdWJsaWMgZW50aXR5OiBzdHJpbmc7XHJcbiAgcHVibGljIGNoYW5nZWRTaW5jZVN5bmMgPSB7fTtcclxuXHJcbiAgcHVibGljIGNvbGxlY3Rpb246IENvbGxlY3Rpb247XHJcbiAgcHVibGljIHN0b3JlOiBTdG9yZTtcclxuICBwdWJsaWMgY3JlZGVudGlhbHM6IGFueTtcclxuXHJcbiAgcHVibGljIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQ7XHJcblxyXG4gIHB1YmxpYyBjb25zdHJ1Y3RvcihhdHRyaWJ1dGVzPzogYW55LCBvcHRpb25zPzogYW55KSB7XHJcbiAgICBzdXBlcihhdHRyaWJ1dGVzLCBvcHRpb25zKTtcclxuXHJcbiAgICBpZiAodGhpcy51cmxSb290ICYmIHR5cGVvZiB0aGlzLnVybFJvb3QgPT09ICdzdHJpbmcnKSB7XHJcbiAgICAgIGlmICh0aGlzLnVybFJvb3QuY2hhckF0KHRoaXMudXJsUm9vdC5sZW5ndGggLSAxKSAhPT0gJy8nKSB7XHJcbiAgICAgICAgdGhpcy51cmxSb290ICs9ICcvJztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaW5pdChhdHRyaWJ1dGVzLCBvcHRpb25zKTtcclxuICB9XHJcblxyXG4gIHByb3RlY3RlZCBpbml0KGF0dHJpYnV0ZXM/OiBhbnksIG9wdGlvbnM/OiBhbnkpIHtcclxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG5cclxuICAgIHRoaXMuY29sbGVjdGlvbiA9IG9wdGlvbnMuY29sbGVjdGlvbiB8fCB0aGlzLmNvbGxlY3Rpb247XHJcbiAgICB0aGlzLmlkQXR0cmlidXRlID0gb3B0aW9ucy5pZEF0dHJpYnV0ZSB8fCB0aGlzLmlkQXR0cmlidXRlO1xyXG4gICAgdGhpcy5zdG9yZSA9IHRoaXMuc3RvcmUgfHwgKHRoaXMuY29sbGVjdGlvbiA/IHRoaXMuY29sbGVjdGlvbi5zdG9yZSA6IG51bGwpIHx8IG9wdGlvbnMuc3RvcmU7XHJcbiAgICBpZiAodGhpcy5zdG9yZSAmJiBfLmlzRnVuY3Rpb24odGhpcy5zdG9yZS5pbml0TW9kZWwpKSB7XHJcbiAgICAgIHRoaXMuc3RvcmUuaW5pdE1vZGVsKHRoaXMsIG9wdGlvbnMpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5lbnRpdHkgPSB0aGlzLmVudGl0eSB8fCAodGhpcy5jb2xsZWN0aW9uID8gdGhpcy5jb2xsZWN0aW9uLmVudGl0eSA6IG51bGwpIHx8IG9wdGlvbnMuZW50aXR5O1xyXG4gICAgdGhpcy5jcmVkZW50aWFscyA9IHRoaXMuY3JlZGVudGlhbHMgfHwgKHRoaXMuY29sbGVjdGlvbiA/IHRoaXMuY29sbGVjdGlvbi5jcmVkZW50aWFscyA6IG51bGwpIHx8IG9wdGlvbnMuY3JlZGVudGlhbHM7XHJcbiAgICB0aGlzLm9uKCdjaGFuZ2UnLCB0aGlzLm9uQ2hhbmdlLCB0aGlzKTtcclxuICAgIHRoaXMub24oJ3N5bmMnLCB0aGlzLm9uU3luYywgdGhpcyk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYWpheChvcHRpb25zOiBhbnkpIHtcclxuICAgIHJldHVybiBhamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgfVxyXG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogQmFja2JvbmUuTW9kZWxCYXNlLCBvcHRpb25zPzogYW55KSB7XHJcbiAgICByZXR1cm4gc3luYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIG9uQ2hhbmdlKG1vZGVsOiBNb2RlbCwgb3B0aW9uczogYW55KSB7XHJcbiAgICAvLyBGb3IgZWFjaCBgc2V0YCBhdHRyaWJ1dGUsIHVwZGF0ZSBvciBkZWxldGUgdGhlIGN1cnJlbnQgdmFsdWUuXHJcbiAgICB2YXIgYXR0cnMgPSBtb2RlbC5jaGFuZ2VkQXR0cmlidXRlcygpO1xyXG4gICAgaWYgKF8uaXNPYmplY3QoYXR0cnMpKSB7XHJcbiAgICAgIGZvciAodmFyIGtleSBpbiBhdHRycykge1xyXG4gICAgICAgIHRoaXMuY2hhbmdlZFNpbmNlU3luY1trZXldID0gYXR0cnNba2V5XTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHVibGljIG9uU3luYyhtb2RlbDogTW9kZWwsIG9wdGlvbnM6IGFueSkge1xyXG4gICAgdGhpcy5jaGFuZ2VkU2luY2VTeW5jID0ge307XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0VXJsUm9vdCgpOiBzdHJpbmcge1xyXG4gICAgaWYgKHRoaXMudXJsUm9vdCkge1xyXG4gICAgICByZXR1cm4gXy5pc0Z1bmN0aW9uKHRoaXMudXJsUm9vdCkgPyB0aGlzLnVybFJvb3QoKSA6IHRoaXMudXJsUm9vdDtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5jb2xsZWN0aW9uKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmNvbGxlY3Rpb24uZ2V0VXJsUm9vdCgpO1xyXG4gICAgfSBlbHNlIGlmICh0aGlzLnVybCkge1xyXG4gICAgICB2YXIgdXJsID0gXy5pc0Z1bmN0aW9uKHRoaXMudXJsKSA/IHRoaXMudXJsKCkgOiB0aGlzLnVybDtcclxuICAgICAgaWYgKHVybCAmJiB0aGlzLmlkICYmIHVybC5pbmRleE9mKHRoaXMuaWQpID4gMCkge1xyXG4gICAgICAgIHJldHVybiB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKHRoaXMuaWQpKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdXJsO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbn1cclxuXHJcbi8vIG1peGluc1xyXG5sZXQgbW9kZWwgPSBfLmV4dGVuZChNb2RlbC5wcm90b3R5cGUsIHtcclxuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyxcclxuICBpc01vZGVsOiB0cnVlLFxyXG4gIGlzQ29sbGVjdGlvbjogZmFsc2UsXHJcbiAgaXNTdG9yZTogZmFsc2VcclxufSk7XHJcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzTW9kZWwoT2JqZWN0LmNyZWF0ZShtb2RlbCkpKTtcclxuIl19