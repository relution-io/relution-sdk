/*
 * @file livedata/Collection.ts
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
var url = require('url');
var diag = require('../core/diag');
var Model_1 = require('./Model');
var Q = require('q');
var rest_1 = require('./rest');
/**
 * tests whether a given object is a Collection.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Collection.
 */
function isCollection(object) {
    if (!object || typeof object !== 'object') {
        return false;
    }
    else if ('isCollection' in object) {
        diag.debug.assert(function () { return object.isCollection === Collection.prototype.isPrototypeOf(object); });
        return object.isCollection;
    }
    else {
        return Collection.prototype.isPrototypeOf(object);
    }
}
exports.isCollection = isCollection;
/**
 * extension of a backbone.js Collection.
 *
 * The Relution.livedata.Collection can be used like a Backbone Collection,
 * but there are some enhancements to fetch, save and delete the
 * contained models from or to other "data stores".
 *
 * see WebSqlStore or SyncStore for examples
 */
var Collection = (function (_super) {
    __extends(Collection, _super);
    function Collection(models, options) {
        _super.call(this, models, options);
        if (this.url && this.url.charAt(this.url.length - 1) !== '/') {
            this.url += '/';
        }
        this.init(models, options);
    }
    Collection.prototype.init = function (models, options) {
        options = options || {};
        this.store = options.store || this.store || (this.model ? this.model.prototype.store : null);
        this.entity = options.entity || this.entity || (this.model ? this.model.prototype.entity : null);
        this.options = options.options || this.options;
        this.entity = this.entity || this._entityFromUrl(this.getUrl());
        this._updateUrl();
        if (this.store && _.isFunction(this.store.initCollection)) {
            this.store.initCollection(this, options);
        }
    };
    Collection.prototype.ajax = function (options) {
        return rest_1.ajax.apply(this, arguments);
    };
    Collection.prototype.sync = function (method, model, options) {
        return rest_1.sync.apply(this, arguments);
    };
    Collection.prototype._entityFromUrl = function (urlStr) {
        if (urlStr) {
            var urlObj = url.parse(urlStr);
            // extract last path part as entity name
            var parts = urlObj.pathname.match(/([^\/]+)\/?$/);
            if (parts && parts.length > 1) {
                return parts[-1];
            }
        }
    };
    Collection.prototype.destroy = function (options) {
        options = options || {};
        var success = options.success;
        if (this.length > 0) {
            options.success = function () {
                if (this.length === 0 && success) {
                    success();
                }
            };
            var model;
            while ((model = this.first())) {
                this.sync('delete', model, options);
                this.remove(model);
            }
        }
        else if (success) {
            success();
        }
    };
    /**
     * save all containing models
     */
    Collection.prototype.save = function () {
        this.each(function (model) {
            model.save();
        });
    };
    Collection.prototype.applyFilter = function (callback) {
        this.trigger('filter', this.filter(callback));
    };
    Collection.prototype.getUrlParams = function (url) {
        url = url || this.getUrl();
        var m = url.match(/\?([^#]*)/);
        var params = {};
        if (m && m.length > 1) {
            _.each(m[1].split('&'), function (p) {
                var a = p.split('=');
                params[a[0]] = a[1];
            });
        }
        return params;
    };
    Collection.prototype.getUrl = function () {
        return (_.isFunction(this.url) ? this.url() : this.url) || '';
    };
    Collection.prototype.getUrlRoot = function () {
        var url = this.getUrl();
        return url.indexOf('?') >= 0 ? url.substr(0, url.indexOf('?')) : url;
    };
    Collection.prototype._updateUrl = function () {
        if (this.options) {
            var params = this.getUrlParams();
            this.url = this.getUrlRoot();
            if (this.options.query) {
                params.query = encodeURIComponent(JSON.stringify(this.options.query));
            }
            if (this.options.fields) {
                params.fields = encodeURIComponent(JSON.stringify(this.options.fields));
            }
            if (this.options.sort) {
                params.sort = encodeURIComponent(JSON.stringify(this.options.sort));
            }
            if (!_.isEmpty(params)) {
                this.url += '?';
                var a = [];
                for (var k in params) {
                    a.push(k + (params[k] ? '=' + params[k] : ''));
                }
                this.url += a.join('&');
            }
        }
    };
    /**
     * reads an additional page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for infinite scrolling
     * implementation.
     *
     * When async processing is done, a more attribute is set on the options object in case additional data might be
     * available which can be loaded by calling this method again. Likewise an end attribute is set if the data is
     * fully loaded.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchMore()
     */
    Collection.prototype.fetchMore = function (options) {
        if (!this.syncContext) {
            return Q.reject(new Error('no context'));
        }
        return this.syncContext.fetchMore(this, options);
    };
    /**
     * reads the next page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for paging
     * implementation.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might be
     * available which can be loaded by calling the corresponding method.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchNext()
     */
    Collection.prototype.fetchNext = function (options) {
        if (!this.syncContext) {
            return Q.reject(new Error('no context'));
        }
        return this.syncContext.fetchNext(this, options);
    };
    /**
     * reads the previous page of data into this collection.
     *
     * A fetch() must have been performed loading the initial set of data. This method is intended for paging
     * implementation.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might be
     * available which can be loaded by calling the corresponding method.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see SyncContext#fetchPrev()
     */
    Collection.prototype.fetchPrev = function (options) {
        if (!this.syncContext) {
            return Q.reject(new Error('no context'));
        }
        return this.syncContext.fetchPrev(this, options);
    };
    return Collection;
}(Backbone.Collection));
exports.Collection = Collection;
// mixins
var collection = _.extend(Collection.prototype, {
    _type: 'Relution.livedata.Collection',
    isModel: false,
    isCollection: true,
    isStore: false,
    // default model type unless overwritten
    model: Model_1.Model
});
diag.debug.assert(function () { return isCollection(Object.create(collection)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Db2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEdBQUcsV0FBTSxLQUFLLENBQUMsQ0FBQTtBQUUzQixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUdyQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFHekMsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIscUJBQXlCLFFBQVEsQ0FBQyxDQUFBO0FBWWxDOzs7OztHQUtHO0FBQ0gsc0JBQTZCLE1BQVc7SUFDdEMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxjQUFjLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsTUFBTSxDQUFDLFlBQVksS0FBSyxVQUFVLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBbEUsQ0FBa0UsQ0FBQyxDQUFDO1FBQzVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNwRCxDQUFDO0FBQ0gsQ0FBQztBQVRlLG9CQUFZLGVB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QUksVUFBVSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRTtJQUM5QyxLQUFLLEVBQUUsOEJBQThCO0lBQ3JDLE9BQU8sRUFBRSxLQUFLO0lBQ2QsWUFBWSxFQUFFLElBQUk7SUFDbEIsT0FBTyxFQUFFLEtBQUs7SUFFZCx3Q0FBd0M7SUFDeEMsS0FBSyxFQUFFLGFBQUs7Q0FDYixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBdkMsQ0FBdUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvQ29sbGVjdGlvbi50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBNLVdheSBvbiAyNy4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBCYWNrYm9uZSBmcm9tICdiYWNrYm9uZSc7XHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XHJcblxyXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XHJcblxyXG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcclxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtTeW5jQ29udGV4dH0gZnJvbSAnLi9TeW5jQ29udGV4dCc7XHJcbmltcG9ydCB7U3luY0VuZHBvaW50fSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcbmltcG9ydCB7YWpheCwgc3luY30gZnJvbSAnLi9yZXN0JztcclxuXHJcbi8qKlxyXG4gKiBjb25zdHJ1Y3RvciBmdW5jdGlvbiBvZiBDb2xsZWN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0aW9uQ3RvciB7XHJcbiAgLyoqXHJcbiAgICogQHNlZSBDb2xsZWN0aW9uI2NvbnN0cnVjdG9yXHJcbiAgICovXHJcbiAgbmV3KG1vZGVscz86IGFueSwgb3B0aW9ucz86IGFueSk6IENvbGxlY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0ZXN0cyB3aGV0aGVyIGEgZ2l2ZW4gb2JqZWN0IGlzIGEgQ29sbGVjdGlvbi5cclxuICpcclxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB0byBjaGVjay5cclxuICogQHJldHVybiB7Ym9vbGVhbn0gd2hldGhlciBvYmplY3QgaXMgYSBDb2xsZWN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzQ29sbGVjdGlvbihvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBDb2xsZWN0aW9uIHtcclxuICBpZiAoIW9iamVjdCB8fCB0eXBlb2Ygb2JqZWN0ICE9PSAnb2JqZWN0Jykge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH0gZWxzZSBpZiAoJ2lzQ29sbGVjdGlvbicgaW4gb2JqZWN0KSB7XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBvYmplY3QuaXNDb2xsZWN0aW9uID09PSBDb2xsZWN0aW9uLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCkpO1xyXG4gICAgcmV0dXJuIG9iamVjdC5pc0NvbGxlY3Rpb247XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBDb2xsZWN0aW9uLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogZXh0ZW5zaW9uIG9mIGEgYmFja2JvbmUuanMgQ29sbGVjdGlvbi5cclxuICpcclxuICogVGhlIFJlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24gY2FuIGJlIHVzZWQgbGlrZSBhIEJhY2tib25lIENvbGxlY3Rpb24sXHJcbiAqIGJ1dCB0aGVyZSBhcmUgc29tZSBlbmhhbmNlbWVudHMgdG8gZmV0Y2gsIHNhdmUgYW5kIGRlbGV0ZSB0aGVcclxuICogY29udGFpbmVkIG1vZGVscyBmcm9tIG9yIHRvIG90aGVyIFwiZGF0YSBzdG9yZXNcIi5cclxuICpcclxuICogc2VlIFdlYlNxbFN0b3JlIG9yIFN5bmNTdG9yZSBmb3IgZXhhbXBsZXNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDb2xsZWN0aW9uIGV4dGVuZHMgQmFja2JvbmUuQ29sbGVjdGlvbjxNb2RlbD4ge1xyXG5cclxuICBwdWJsaWMgX3R5cGU6IHN0cmluZzsgICAgICAgICAvLyBjb25zdGFudCAnUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbicgb24gcHJvdG90eXBlXHJcbiAgcHVibGljIGlzTW9kZWw6IGJvb2xlYW47ICAgICAgLy8gY29uc3RhbnQgZmFsc2Ugb24gcHJvdG90eXBlXHJcbiAgcHVibGljIGlzQ29sbGVjdGlvbjogYm9vbGVhbjsgLy8gY29uc3RhbnQgdHJ1ZSBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNTdG9yZTogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcclxuXHJcbiAgcHVibGljIG1vZGVsOiBNb2RlbEN0b3I7XHJcbiAgcHVibGljIGVudGl0eTogc3RyaW5nO1xyXG4gIHB1YmxpYyBvcHRpb25zOiBhbnk7XHJcblxyXG4gIHB1YmxpYyBzdG9yZTogU3RvcmU7XHJcbiAgcHVibGljIHN5bmNDb250ZXh0OiBTeW5jQ29udGV4dDtcclxuICBwdWJsaWMgY3JlZGVudGlhbHM6IGFueTtcclxuXHJcbiAgcHVibGljIGVuZHBvaW50OiBTeW5jRW5kcG9pbnQ7XHJcbiAgcHVibGljIGNoYW5uZWw6IHN0cmluZztcclxuXHJcbiAgcHVibGljIGNvbnN0cnVjdG9yKG1vZGVscz86IGFueSwgb3B0aW9ucz86IGFueSkge1xyXG4gICAgc3VwZXIobW9kZWxzLCBvcHRpb25zKTtcclxuXHJcbiAgICBpZiAodGhpcy51cmwgJiYgdGhpcy51cmwuY2hhckF0KHRoaXMudXJsLmxlbmd0aCAtIDEpICE9PSAnLycpIHtcclxuICAgICAgdGhpcy51cmwgKz0gJy8nO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaW5pdChtb2RlbHMsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGluaXQobW9kZWxzPzogYW55LCBvcHRpb25zPzogYW55KSB7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHRoaXMuc3RvcmUgPSBvcHRpb25zLnN0b3JlIHx8IHRoaXMuc3RvcmUgfHwgKHRoaXMubW9kZWwgPyB0aGlzLm1vZGVsLnByb3RvdHlwZS5zdG9yZSA6IG51bGwpO1xyXG4gICAgdGhpcy5lbnRpdHkgPSBvcHRpb25zLmVudGl0eSB8fCB0aGlzLmVudGl0eSB8fCAodGhpcy5tb2RlbCA/IHRoaXMubW9kZWwucHJvdG90eXBlLmVudGl0eSA6IG51bGwpO1xyXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucy5vcHRpb25zIHx8IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0aGlzLmVudGl0eSA9IHRoaXMuZW50aXR5IHx8IHRoaXMuX2VudGl0eUZyb21VcmwodGhpcy5nZXRVcmwoKSk7XHJcbiAgICB0aGlzLl91cGRhdGVVcmwoKTtcclxuXHJcbiAgICBpZiAodGhpcy5zdG9yZSAmJiBfLmlzRnVuY3Rpb24odGhpcy5zdG9yZS5pbml0Q29sbGVjdGlvbikpIHtcclxuICAgICAgdGhpcy5zdG9yZS5pbml0Q29sbGVjdGlvbih0aGlzLCBvcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBhamF4KG9wdGlvbnM6IGFueSkge1xyXG4gICAgcmV0dXJuIGFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogQmFja2JvbmUuTW9kZWxCYXNlLCBvcHRpb25zPzogYW55KSB7XHJcbiAgICByZXR1cm4gc3luYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfZW50aXR5RnJvbVVybCh1cmxTdHI6IHN0cmluZykge1xyXG4gICAgaWYgKHVybFN0cikge1xyXG4gICAgICBsZXQgdXJsT2JqID0gdXJsLnBhcnNlKHVybFN0cik7XHJcblxyXG4gICAgICAvLyBleHRyYWN0IGxhc3QgcGF0aCBwYXJ0IGFzIGVudGl0eSBuYW1lXHJcbiAgICAgIHZhciBwYXJ0cyA9IHVybE9iai5wYXRobmFtZS5tYXRjaCgvKFteXFwvXSspXFwvPyQvKTtcclxuICAgICAgaWYgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICByZXR1cm4gcGFydHNbLTFdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZGVzdHJveShvcHRpb25zPzogYW55KSB7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHZhciBzdWNjZXNzID0gb3B0aW9ucy5zdWNjZXNzO1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwICYmIHN1Y2Nlc3MpIHtcclxuICAgICAgICAgIHN1Y2Nlc3MoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBtb2RlbDogTW9kZWw7XHJcbiAgICAgIHdoaWxlICgobW9kZWwgPSB0aGlzLmZpcnN0KCkpKSB7XHJcbiAgICAgICAgdGhpcy5zeW5jKCdkZWxldGUnLCBtb2RlbCwgb3B0aW9ucyk7XHJcbiAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHN1Y2Nlc3MpIHtcclxuICAgICAgc3VjY2VzcygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogc2F2ZSBhbGwgY29udGFpbmluZyBtb2RlbHNcclxuICAgKi9cclxuICBwdWJsaWMgc2F2ZSgpIHtcclxuICAgIHRoaXMuZWFjaChmdW5jdGlvbiAobW9kZWwpIHtcclxuICAgICAgbW9kZWwuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXBwbHlGaWx0ZXIoY2FsbGJhY2s6IF8uTGlzdEl0ZXJhdG9yPE1vZGVsLCBib29sZWFuPikge1xyXG4gICAgdGhpcy50cmlnZ2VyKCdmaWx0ZXInLCB0aGlzLmZpbHRlcihjYWxsYmFjaykpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFVybFBhcmFtcyh1cmw/OiBzdHJpbmcpOiBhbnkge1xyXG4gICAgdXJsID0gdXJsIHx8IHRoaXMuZ2V0VXJsKCk7XHJcbiAgICB2YXIgbSA9IHVybC5tYXRjaCgvXFw/KFteI10qKS8pO1xyXG4gICAgdmFyIHBhcmFtcyA9IHt9O1xyXG4gICAgaWYgKG0gJiYgbS5sZW5ndGggPiAxKSB7XHJcbiAgICAgIF8uZWFjaChtWzFdLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgdmFyIGEgPSBwLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgcGFyYW1zW2FbMF1dID0gYVsxXTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1zO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFVybCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIChfLmlzRnVuY3Rpb24odGhpcy51cmwpID8gdGhpcy51cmwoKSA6IHRoaXMudXJsKSB8fCAnJztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRVcmxSb290KCk6IHN0cmluZyB7XHJcbiAgICB2YXIgdXJsID0gdGhpcy5nZXRVcmwoKTtcclxuICAgIHJldHVybiB1cmwuaW5kZXhPZignPycpID49IDAgPyB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKCc/JykpIDogdXJsO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSAgX3VwZGF0ZVVybCgpIHtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMpIHtcclxuICAgICAgdmFyIHBhcmFtcyA9IHRoaXMuZ2V0VXJsUGFyYW1zKCk7XHJcbiAgICAgIHRoaXMudXJsID0gdGhpcy5nZXRVcmxSb290KCk7XHJcblxyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnF1ZXJ5KSB7XHJcbiAgICAgICAgcGFyYW1zLnF1ZXJ5ID0gZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHRoaXMub3B0aW9ucy5xdWVyeSkpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZmllbGRzKSB7XHJcbiAgICAgICAgcGFyYW1zLmZpZWxkcyA9IGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMuZmllbGRzKSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zb3J0KSB7XHJcbiAgICAgICAgcGFyYW1zLnNvcnQgPSBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkodGhpcy5vcHRpb25zLnNvcnQpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFfLmlzRW1wdHkocGFyYW1zKSkge1xyXG4gICAgICAgIHRoaXMudXJsICs9ICc/JztcclxuICAgICAgICB2YXIgYTogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIHBhcmFtcykge1xyXG4gICAgICAgICAgYS5wdXNoKGsgKyAocGFyYW1zW2tdID8gJz0nICsgcGFyYW1zW2tdIDogJycpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy51cmwgKz0gYS5qb2luKCcmJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIHJlYWRzIGFuIGFkZGl0aW9uYWwgcGFnZSBvZiBkYXRhIGludG8gdGhpcyBjb2xsZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQSBmZXRjaCgpIG11c3QgaGF2ZSBiZWVuIHBlcmZvcm1lZCBsb2FkaW5nIHRoZSBpbml0aWFsIHNldCBvZiBkYXRhLiBUaGlzIG1ldGhvZCBpcyBpbnRlbmRlZCBmb3IgaW5maW5pdGUgc2Nyb2xsaW5nXHJcbiAgICogaW1wbGVtZW50YXRpb24uXHJcbiAgICpcclxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBtb3JlIGF0dHJpYnV0ZSBpcyBzZXQgb24gdGhlIG9wdGlvbnMgb2JqZWN0IGluIGNhc2UgYWRkaXRpb25hbCBkYXRhIG1pZ2h0IGJlXHJcbiAgICogYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGlzIG1ldGhvZCBhZ2Fpbi4gTGlrZXdpc2UgYW4gZW5kIGF0dHJpYnV0ZSBpcyBzZXQgaWYgdGhlIGRhdGEgaXNcclxuICAgKiBmdWxseSBsb2FkZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBzdWNoIGFzIHBhZ2VTaXplIHRvIHJldHJpZXZlLlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxyXG4gICAqXHJcbiAgICogQHNlZSBTeW5jQ29udGV4dCNmZXRjaE1vcmUoKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBmZXRjaE1vcmUob3B0aW9ucz86IGFueSk6IFByb21pc2VMaWtlPGFueT4ge1xyXG4gICAgaWYgKCF0aGlzLnN5bmNDb250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hNb3JlKHRoaXMsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogcmVhZHMgdGhlIG5leHQgcGFnZSBvZiBkYXRhIGludG8gdGhpcyBjb2xsZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQSBmZXRjaCgpIG11c3QgaGF2ZSBiZWVuIHBlcmZvcm1lZCBsb2FkaW5nIHRoZSBpbml0aWFsIHNldCBvZiBkYXRhLiBUaGlzIG1ldGhvZCBpcyBpbnRlbmRlZCBmb3IgcGFnaW5nXHJcbiAgICogaW1wbGVtZW50YXRpb24uXHJcbiAgICpcclxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBuZXh0L3ByZXYgYXR0cmlidXRlIGlzIHNldCBvbiB0aGUgb3B0aW9ucyBvYmplY3QgaW4gY2FzZSBhZGRpdGlvbmFsIHBhZ2VzIG1pZ2h0IGJlXHJcbiAgICogYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGUgY29ycmVzcG9uZGluZyBtZXRob2QuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBzdWNoIGFzIHBhZ2VTaXplIHRvIHJldHJpZXZlLlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxyXG4gICAqXHJcbiAgICogQHNlZSBTeW5jQ29udGV4dCNmZXRjaE5leHQoKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBmZXRjaE5leHQob3B0aW9ucz86IGFueSk6IFByb21pc2VMaWtlPGFueT4ge1xyXG4gICAgaWYgKCF0aGlzLnN5bmNDb250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hOZXh0KHRoaXMsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogcmVhZHMgdGhlIHByZXZpb3VzIHBhZ2Ugb2YgZGF0YSBpbnRvIHRoaXMgY29sbGVjdGlvbi5cclxuICAgKlxyXG4gICAqIEEgZmV0Y2goKSBtdXN0IGhhdmUgYmVlbiBwZXJmb3JtZWQgbG9hZGluZyB0aGUgaW5pdGlhbCBzZXQgb2YgZGF0YS4gVGhpcyBtZXRob2QgaXMgaW50ZW5kZWQgZm9yIHBhZ2luZ1xyXG4gICAqIGltcGxlbWVudGF0aW9uLlxyXG4gICAqXHJcbiAgICogV2hlbiBhc3luYyBwcm9jZXNzaW5nIGlzIGRvbmUsIGEgbmV4dC9wcmV2IGF0dHJpYnV0ZSBpcyBzZXQgb24gdGhlIG9wdGlvbnMgb2JqZWN0IGluIGNhc2UgYWRkaXRpb25hbCBwYWdlcyBtaWdodCBiZVxyXG4gICAqIGF2YWlsYWJsZSB3aGljaCBjYW4gYmUgbG9hZGVkIGJ5IGNhbGxpbmcgdGhlIGNvcnJlc3BvbmRpbmcgbWV0aG9kLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgc3VjaCBhcyBwYWdlU2l6ZSB0byByZXRyaWV2ZS5cclxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIHRoZSBsb2FkIG9wZXJhdGlvbi5cclxuICAgKlxyXG4gICAqIEBzZWUgU3luY0NvbnRleHQjZmV0Y2hQcmV2KClcclxuICAgKi9cclxuICBwdWJsaWMgZmV0Y2hQcmV2KG9wdGlvbnM/OiBhbnkpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgIGlmICghdGhpcy5zeW5jQ29udGV4dCkge1xyXG4gICAgICByZXR1cm4gUS5yZWplY3QobmV3IEVycm9yKCdubyBjb250ZXh0JykpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnN5bmNDb250ZXh0LmZldGNoUHJldih0aGlzLCBvcHRpb25zKTtcclxuICB9XHJcblxyXG59XHJcblxyXG4vLyBtaXhpbnNcclxubGV0IGNvbGxlY3Rpb24gPSBfLmV4dGVuZChDb2xsZWN0aW9uLnByb3RvdHlwZSwge1xyXG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbicsXHJcbiAgaXNNb2RlbDogZmFsc2UsXHJcbiAgaXNDb2xsZWN0aW9uOiB0cnVlLFxyXG4gIGlzU3RvcmU6IGZhbHNlLFxyXG5cclxuICAvLyBkZWZhdWx0IG1vZGVsIHR5cGUgdW5sZXNzIG92ZXJ3cml0dGVuXHJcbiAgbW9kZWw6IE1vZGVsXHJcbn0pO1xyXG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc0NvbGxlY3Rpb24oT2JqZWN0LmNyZWF0ZShjb2xsZWN0aW9uKSkpO1xyXG4iXX0=