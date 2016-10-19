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
    /**
     * sets up prototype properties when defining a Collection subclass.
     *
     * @param {CollectionProps} properties of prototype to set.
     */
    Collection.defaults = function (properties) {
        return _super['extend'].call(this, properties);
    };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Db2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEdBQUcsV0FBTSxLQUFLLENBQUMsQ0FBQTtBQUUzQixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUdyQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFHekMsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIscUJBQXlCLFFBQVEsQ0FBQyxDQUFBO0FBbUNsQzs7Ozs7R0FLRztBQUNILHNCQUE2QixNQUFXO0lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLE1BQU0sQ0FBQyxZQUFZLEtBQUssVUFBVSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQWxFLENBQWtFLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUM3QixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztBQUNILENBQUM7QUFUZSxvQkFBWSxl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Q0FBQztJQUNuRCxDQUFDO0lBRUgsaUJBQUM7QUFBRCxDQUFDLEFBMU5ELENBQWdDLFFBQVEsQ0FBQyxVQUFVLEdBME5sRDtBQTFOWSxrQkFBVSxhQTBOdEIsQ0FBQTtBQUVELFNBQVM7QUFDVCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUU7SUFDOUMsS0FBSyxFQUFFLDhCQUE4QjtJQUNyQyxPQUFPLEVBQUUsS0FBSztJQUNkLFlBQVksRUFBRSxJQUFJO0lBQ2xCLE9BQU8sRUFBRSxLQUFLO0lBRWQsd0NBQXdDO0lBQ3hDLEtBQUssRUFBRSxhQUFLO0NBQ2IsQ0FBQyxDQUFDO0FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQXZDLENBQXVDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL0NvbGxlY3Rpb24udHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgTS1XYXkgb24gMjcuMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5cclxuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XHJcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3Rvcn0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7U3luY0NvbnRleHR9IGZyb20gJy4vU3luY0NvbnRleHQnO1xyXG5pbXBvcnQge1N5bmNFbmRwb2ludH0gZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5pbXBvcnQge2FqYXgsIHN5bmN9IGZyb20gJy4vcmVzdCc7XHJcblxyXG4vKipcclxuICogcHJvdG90eXBlIHByb3BlcnRpZXMgc3BlY2lmaWVkIHdoZW4gc3ViY2xhc3NpbmcgdXNpbmcgQ29sbGVjdGlvbi5kZWZhdWx0cygpLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0aW9uUHJvcHMge1xyXG4gIG1vZGVsPzogTW9kZWxDdG9yO1xyXG4gIGVudGl0eT86IHN0cmluZztcclxuXHJcbiAgb3B0aW9ucz86IGFueTtcclxuXHJcbiAgdXJsPzogc3RyaW5nIHwgKCgpID0+IHN0cmluZyk7XHJcbiAgc3RvcmU/OiBTdG9yZTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIENvbGxlY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIENvbGxlY3Rpb25DdG9yVDxDb2xsZWN0aW9uVHlwZSBleHRlbmRzIENvbGxlY3Rpb24sIE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLCBPcHRpb25zVHlwZT4ge1xyXG4gIC8qKlxyXG4gICAqIHByb3RvdHlwZSBvZiBjb25zdHJ1Y3RvciBmdW5jdGlvbi5cclxuICAgKi9cclxuICBwcm90b3R5cGU6IENvbGxlY3Rpb25UeXBlO1xyXG5cclxuICAvKipcclxuICAgKiBAc2VlIENvbGxlY3Rpb24jY29uc3RydWN0b3JcclxuICAgKi9cclxuICBuZXcobW9kZWxzPzogTW9kZWxUeXBlW10gfCBPYmplY3RbXSwgb3B0aW9ucz86IGFueSk6IENvbGxlY3Rpb25UeXBlO1xyXG59XHJcblxyXG4vKipcclxuICogY29uc3RydWN0b3IgZnVuY3Rpb24gb2YgQ29sbGVjdGlvbi5cclxuICovXHJcbmV4cG9ydCB0eXBlIENvbGxlY3Rpb25DdG9yID0gQ29sbGVjdGlvbkN0b3JUPENvbGxlY3Rpb24sIE1vZGVsLCBhbnk+O1xyXG5cclxuLyoqXHJcbiAqIHRlc3RzIHdoZXRoZXIgYSBnaXZlbiBvYmplY3QgaXMgYSBDb2xsZWN0aW9uLlxyXG4gKlxyXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqZWN0IHRvIGNoZWNrLlxyXG4gKiBAcmV0dXJuIHtib29sZWFufSB3aGV0aGVyIG9iamVjdCBpcyBhIENvbGxlY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNDb2xsZWN0aW9uKG9iamVjdDogYW55KTogb2JqZWN0IGlzIENvbGxlY3Rpb24ge1xyXG4gIGlmICghb2JqZWN0IHx8IHR5cGVvZiBvYmplY3QgIT09ICdvYmplY3QnKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfSBlbHNlIGlmICgnaXNDb2xsZWN0aW9uJyBpbiBvYmplY3QpIHtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG9iamVjdC5pc0NvbGxlY3Rpb24gPT09IENvbGxlY3Rpb24ucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqZWN0KSk7XHJcbiAgICByZXR1cm4gb2JqZWN0LmlzQ29sbGVjdGlvbjtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIENvbGxlY3Rpb24ucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqZWN0KTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBleHRlbnNpb24gb2YgYSBiYWNrYm9uZS5qcyBDb2xsZWN0aW9uLlxyXG4gKlxyXG4gKiBUaGUgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiBjYW4gYmUgdXNlZCBsaWtlIGEgQmFja2JvbmUgQ29sbGVjdGlvbixcclxuICogYnV0IHRoZXJlIGFyZSBzb21lIGVuaGFuY2VtZW50cyB0byBmZXRjaCwgc2F2ZSBhbmQgZGVsZXRlIHRoZVxyXG4gKiBjb250YWluZWQgbW9kZWxzIGZyb20gb3IgdG8gb3RoZXIgXCJkYXRhIHN0b3Jlc1wiLlxyXG4gKlxyXG4gKiBzZWUgV2ViU3FsU3RvcmUgb3IgU3luY1N0b3JlIGZvciBleGFtcGxlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uPE1vZGVsPiB7XHJcblxyXG4gIHB1YmxpYyBfdHlwZTogc3RyaW5nOyAgICAgICAgIC8vIGNvbnN0YW50ICdSZWx1dGlvbi5saXZlZGF0YS5Db2xsZWN0aW9uJyBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNDb2xsZWN0aW9uOiBib29sZWFuOyAvLyBjb25zdGFudCB0cnVlIG9uIHByb3RvdHlwZVxyXG4gIHB1YmxpYyBpc1N0b3JlOiBib29sZWFuOyAgICAgIC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxyXG5cclxuICBwdWJsaWMgbW9kZWw6IE1vZGVsQ3RvcjtcclxuICBwdWJsaWMgZW50aXR5OiBzdHJpbmc7XHJcbiAgcHVibGljIG9wdGlvbnM6IGFueTtcclxuXHJcbiAgcHVibGljIHN0b3JlOiBTdG9yZTtcclxuICBwdWJsaWMgc3luY0NvbnRleHQ6IFN5bmNDb250ZXh0O1xyXG4gIHB1YmxpYyBjcmVkZW50aWFsczogYW55O1xyXG5cclxuICBwdWJsaWMgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludDtcclxuICBwdWJsaWMgY2hhbm5lbDogc3RyaW5nO1xyXG5cclxuICBwdWJsaWMgY29uc3RydWN0b3IobW9kZWxzPzogTW9kZWxbXSB8IE9iamVjdFtdLCBvcHRpb25zPzogYW55KSB7XHJcbiAgICBzdXBlcihtb2RlbHMsIG9wdGlvbnMpO1xyXG5cclxuICAgIGlmICh0aGlzLnVybCAmJiB0aGlzLnVybC5jaGFyQXQodGhpcy51cmwubGVuZ3RoIC0gMSkgIT09ICcvJykge1xyXG4gICAgICB0aGlzLnVybCArPSAnLyc7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5pbml0KG1vZGVscywgb3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBzZXRzIHVwIHByb3RvdHlwZSBwcm9wZXJ0aWVzIHdoZW4gZGVmaW5pbmcgYSBDb2xsZWN0aW9uIHN1YmNsYXNzLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB7Q29sbGVjdGlvblByb3BzfSBwcm9wZXJ0aWVzIG9mIHByb3RvdHlwZSB0byBzZXQuXHJcbiAgICovXHJcbiAgcHVibGljIHN0YXRpYyBkZWZhdWx0cyhwcm9wZXJ0aWVzOiBDb2xsZWN0aW9uUHJvcHMpOiBDb2xsZWN0aW9uQ3RvciB7XHJcbiAgICByZXR1cm4gc3VwZXJbJ2V4dGVuZCddKHByb3BlcnRpZXMpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIGluaXQobW9kZWxzPzogTW9kZWxbXSB8IE9iamVjdFtdLCBvcHRpb25zPzogYW55KSB7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHRoaXMuc3RvcmUgPSBvcHRpb25zLnN0b3JlIHx8IHRoaXMuc3RvcmUgfHwgKHRoaXMubW9kZWwgPyB0aGlzLm1vZGVsLnByb3RvdHlwZS5zdG9yZSA6IG51bGwpO1xyXG4gICAgdGhpcy5lbnRpdHkgPSBvcHRpb25zLmVudGl0eSB8fCB0aGlzLmVudGl0eSB8fCAodGhpcy5tb2RlbCA/IHRoaXMubW9kZWwucHJvdG90eXBlLmVudGl0eSA6IG51bGwpO1xyXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucy5vcHRpb25zIHx8IHRoaXMub3B0aW9ucztcclxuXHJcbiAgICB0aGlzLmVudGl0eSA9IHRoaXMuZW50aXR5IHx8IHRoaXMuX2VudGl0eUZyb21VcmwodGhpcy5nZXRVcmwoKSk7XHJcbiAgICB0aGlzLl91cGRhdGVVcmwoKTtcclxuXHJcbiAgICBpZiAodGhpcy5zdG9yZSAmJiBfLmlzRnVuY3Rpb24odGhpcy5zdG9yZS5pbml0Q29sbGVjdGlvbikpIHtcclxuICAgICAgdGhpcy5zdG9yZS5pbml0Q29sbGVjdGlvbih0aGlzLCBvcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBhamF4KG9wdGlvbnM6IGFueSkge1xyXG4gICAgcmV0dXJuIGFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBzeW5jKG1ldGhvZDogc3RyaW5nLCBtb2RlbDogQmFja2JvbmUuTW9kZWxCYXNlLCBvcHRpb25zPzogYW55KSB7XHJcbiAgICByZXR1cm4gc3luYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBfZW50aXR5RnJvbVVybCh1cmxTdHI6IHN0cmluZykge1xyXG4gICAgaWYgKHVybFN0cikge1xyXG4gICAgICBsZXQgdXJsT2JqID0gdXJsLnBhcnNlKHVybFN0cik7XHJcblxyXG4gICAgICAvLyBleHRyYWN0IGxhc3QgcGF0aCBwYXJ0IGFzIGVudGl0eSBuYW1lXHJcbiAgICAgIHZhciBwYXJ0cyA9IHVybE9iai5wYXRobmFtZS5tYXRjaCgvKFteXFwvXSspXFwvPyQvKTtcclxuICAgICAgaWYgKHBhcnRzICYmIHBhcnRzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICByZXR1cm4gcGFydHNbLTFdO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZGVzdHJveShvcHRpb25zPzogYW55KSB7XHJcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgIHZhciBzdWNjZXNzID0gb3B0aW9ucy5zdWNjZXNzO1xyXG4gICAgaWYgKHRoaXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09PSAwICYmIHN1Y2Nlc3MpIHtcclxuICAgICAgICAgIHN1Y2Nlc3MoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBtb2RlbDogTW9kZWw7XHJcbiAgICAgIHdoaWxlICgobW9kZWwgPSB0aGlzLmZpcnN0KCkpKSB7XHJcbiAgICAgICAgdGhpcy5zeW5jKCdkZWxldGUnLCBtb2RlbCwgb3B0aW9ucyk7XHJcbiAgICAgICAgdGhpcy5yZW1vdmUobW9kZWwpO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHN1Y2Nlc3MpIHtcclxuICAgICAgc3VjY2VzcygpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogc2F2ZSBhbGwgY29udGFpbmluZyBtb2RlbHNcclxuICAgKi9cclxuICBwdWJsaWMgc2F2ZSgpIHtcclxuICAgIHRoaXMuZWFjaChmdW5jdGlvbiAobW9kZWwpIHtcclxuICAgICAgbW9kZWwuc2F2ZSgpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgYXBwbHlGaWx0ZXIoY2FsbGJhY2s6IF8uTGlzdEl0ZXJhdG9yPE1vZGVsLCBib29sZWFuPikge1xyXG4gICAgdGhpcy50cmlnZ2VyKCdmaWx0ZXInLCB0aGlzLmZpbHRlcihjYWxsYmFjaykpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFVybFBhcmFtcyh1cmw/OiBzdHJpbmcpOiBhbnkge1xyXG4gICAgdXJsID0gdXJsIHx8IHRoaXMuZ2V0VXJsKCk7XHJcbiAgICB2YXIgbSA9IHVybC5tYXRjaCgvXFw/KFteI10qKS8pO1xyXG4gICAgdmFyIHBhcmFtcyA9IHt9O1xyXG4gICAgaWYgKG0gJiYgbS5sZW5ndGggPiAxKSB7XHJcbiAgICAgIF8uZWFjaChtWzFdLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChwKSB7XHJcbiAgICAgICAgdmFyIGEgPSBwLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgcGFyYW1zW2FbMF1dID0gYVsxXTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcGFyYW1zO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldFVybCgpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIChfLmlzRnVuY3Rpb24odGhpcy51cmwpID8gdGhpcy51cmwoKSA6IHRoaXMudXJsKSB8fCAnJztcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXRVcmxSb290KCk6IHN0cmluZyB7XHJcbiAgICB2YXIgdXJsID0gdGhpcy5nZXRVcmwoKTtcclxuICAgIHJldHVybiB1cmwuaW5kZXhPZignPycpID49IDAgPyB1cmwuc3Vic3RyKDAsIHVybC5pbmRleE9mKCc/JykpIDogdXJsO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSAgX3VwZGF0ZVVybCgpIHtcclxuICAgIGlmICh0aGlzLm9wdGlvbnMpIHtcclxuICAgICAgdmFyIHBhcmFtcyA9IHRoaXMuZ2V0VXJsUGFyYW1zKCk7XHJcbiAgICAgIHRoaXMudXJsID0gdGhpcy5nZXRVcmxSb290KCk7XHJcblxyXG4gICAgICBpZiAodGhpcy5vcHRpb25zLnF1ZXJ5KSB7XHJcbiAgICAgICAgcGFyYW1zLnF1ZXJ5ID0gZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHRoaXMub3B0aW9ucy5xdWVyeSkpO1xyXG4gICAgICB9XHJcbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuZmllbGRzKSB7XHJcbiAgICAgICAgcGFyYW1zLmZpZWxkcyA9IGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMuZmllbGRzKSk7XHJcbiAgICAgIH1cclxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5zb3J0KSB7XHJcbiAgICAgICAgcGFyYW1zLnNvcnQgPSBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkodGhpcy5vcHRpb25zLnNvcnQpKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKCFfLmlzRW1wdHkocGFyYW1zKSkge1xyXG4gICAgICAgIHRoaXMudXJsICs9ICc/JztcclxuICAgICAgICB2YXIgYTogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBrIGluIHBhcmFtcykge1xyXG4gICAgICAgICAgYS5wdXNoKGsgKyAocGFyYW1zW2tdID8gJz0nICsgcGFyYW1zW2tdIDogJycpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy51cmwgKz0gYS5qb2luKCcmJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIHJlYWRzIGFuIGFkZGl0aW9uYWwgcGFnZSBvZiBkYXRhIGludG8gdGhpcyBjb2xsZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQSBmZXRjaCgpIG11c3QgaGF2ZSBiZWVuIHBlcmZvcm1lZCBsb2FkaW5nIHRoZSBpbml0aWFsIHNldCBvZiBkYXRhLiBUaGlzIG1ldGhvZCBpcyBpbnRlbmRlZCBmb3IgaW5maW5pdGUgc2Nyb2xsaW5nXHJcbiAgICogaW1wbGVtZW50YXRpb24uXHJcbiAgICpcclxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBtb3JlIGF0dHJpYnV0ZSBpcyBzZXQgb24gdGhlIG9wdGlvbnMgb2JqZWN0IGluIGNhc2UgYWRkaXRpb25hbCBkYXRhIG1pZ2h0IGJlXHJcbiAgICogYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGlzIG1ldGhvZCBhZ2Fpbi4gTGlrZXdpc2UgYW4gZW5kIGF0dHJpYnV0ZSBpcyBzZXQgaWYgdGhlIGRhdGEgaXNcclxuICAgKiBmdWxseSBsb2FkZWQuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBzdWNoIGFzIHBhZ2VTaXplIHRvIHJldHJpZXZlLlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxyXG4gICAqXHJcbiAgICogQHNlZSBTeW5jQ29udGV4dCNmZXRjaE1vcmUoKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBmZXRjaE1vcmUob3B0aW9ucz86IGFueSk6IFByb21pc2VMaWtlPGFueT4ge1xyXG4gICAgaWYgKCF0aGlzLnN5bmNDb250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hNb3JlKHRoaXMsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogcmVhZHMgdGhlIG5leHQgcGFnZSBvZiBkYXRhIGludG8gdGhpcyBjb2xsZWN0aW9uLlxyXG4gICAqXHJcbiAgICogQSBmZXRjaCgpIG11c3QgaGF2ZSBiZWVuIHBlcmZvcm1lZCBsb2FkaW5nIHRoZSBpbml0aWFsIHNldCBvZiBkYXRhLiBUaGlzIG1ldGhvZCBpcyBpbnRlbmRlZCBmb3IgcGFnaW5nXHJcbiAgICogaW1wbGVtZW50YXRpb24uXHJcbiAgICpcclxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBuZXh0L3ByZXYgYXR0cmlidXRlIGlzIHNldCBvbiB0aGUgb3B0aW9ucyBvYmplY3QgaW4gY2FzZSBhZGRpdGlvbmFsIHBhZ2VzIG1pZ2h0IGJlXHJcbiAgICogYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGUgY29ycmVzcG9uZGluZyBtZXRob2QuXHJcbiAgICpcclxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBzdWNoIGFzIHBhZ2VTaXplIHRvIHJldHJpZXZlLlxyXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxyXG4gICAqXHJcbiAgICogQHNlZSBTeW5jQ29udGV4dCNmZXRjaE5leHQoKVxyXG4gICAqL1xyXG4gIHB1YmxpYyBmZXRjaE5leHQob3B0aW9ucz86IGFueSk6IFByb21pc2VMaWtlPGFueT4ge1xyXG4gICAgaWYgKCF0aGlzLnN5bmNDb250ZXh0KSB7XHJcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hOZXh0KHRoaXMsIG9wdGlvbnMpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogcmVhZHMgdGhlIHByZXZpb3VzIHBhZ2Ugb2YgZGF0YSBpbnRvIHRoaXMgY29sbGVjdGlvbi5cclxuICAgKlxyXG4gICAqIEEgZmV0Y2goKSBtdXN0IGhhdmUgYmVlbiBwZXJmb3JtZWQgbG9hZGluZyB0aGUgaW5pdGlhbCBzZXQgb2YgZGF0YS4gVGhpcyBtZXRob2QgaXMgaW50ZW5kZWQgZm9yIHBhZ2luZ1xyXG4gICAqIGltcGxlbWVudGF0aW9uLlxyXG4gICAqXHJcbiAgICogV2hlbiBhc3luYyBwcm9jZXNzaW5nIGlzIGRvbmUsIGEgbmV4dC9wcmV2IGF0dHJpYnV0ZSBpcyBzZXQgb24gdGhlIG9wdGlvbnMgb2JqZWN0IGluIGNhc2UgYWRkaXRpb25hbCBwYWdlcyBtaWdodCBiZVxyXG4gICAqIGF2YWlsYWJsZSB3aGljaCBjYW4gYmUgbG9hZGVkIGJ5IGNhbGxpbmcgdGhlIGNvcnJlc3BvbmRpbmcgbWV0aG9kLlxyXG4gICAqXHJcbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgc3VjaCBhcyBwYWdlU2l6ZSB0byByZXRyaWV2ZS5cclxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIHRoZSBsb2FkIG9wZXJhdGlvbi5cclxuICAgKlxyXG4gICAqIEBzZWUgU3luY0NvbnRleHQjZmV0Y2hQcmV2KClcclxuICAgKi9cclxuICBwdWJsaWMgZmV0Y2hQcmV2KG9wdGlvbnM/OiBhbnkpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgIGlmICghdGhpcy5zeW5jQ29udGV4dCkge1xyXG4gICAgICByZXR1cm4gUS5yZWplY3QobmV3IEVycm9yKCdubyBjb250ZXh0JykpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnN5bmNDb250ZXh0LmZldGNoUHJldih0aGlzLCBvcHRpb25zKTtcclxuICB9XHJcblxyXG59XHJcblxyXG4vLyBtaXhpbnNcclxubGV0IGNvbGxlY3Rpb24gPSBfLmV4dGVuZChDb2xsZWN0aW9uLnByb3RvdHlwZSwge1xyXG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbicsXHJcbiAgaXNNb2RlbDogZmFsc2UsXHJcbiAgaXNDb2xsZWN0aW9uOiB0cnVlLFxyXG4gIGlzU3RvcmU6IGZhbHNlLFxyXG5cclxuICAvLyBkZWZhdWx0IG1vZGVsIHR5cGUgdW5sZXNzIG92ZXJ3cml0dGVuXHJcbiAgbW9kZWw6IE1vZGVsXHJcbn0pO1xyXG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc0NvbGxlY3Rpb24oT2JqZWN0LmNyZWF0ZShjb2xsZWN0aW9uKSkpO1xyXG4iXX0=