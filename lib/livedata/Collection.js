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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Db2xsZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLEdBQUcsV0FBTSxLQUFLLENBQUMsQ0FBQTtBQUUzQixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUdyQyxzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFHekMsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFDdkIscUJBQXlCLFFBQVEsQ0FBQyxDQUFBO0FBbUNsQzs7Ozs7R0FLRztBQUNILHNCQUE2QixNQUFXO0lBQ3RDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLE9BQU8sTUFBTSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDMUMsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLE1BQU0sQ0FBQyxZQUFZLEtBQUssVUFBVSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQWxFLENBQWtFLENBQUMsQ0FBQztRQUM1RixNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUM3QixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQztBQUNILENBQUM7QUFUZSxvQkFBWSxl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Q0FBQztJQUNuRCxDQUFDO0lBRUgsaUJBQUM7QUFBRCxDQUFDLEFBMU5ELENBQWdDLFFBQVEsQ0FBQyxVQUFVLEdBME5sRDtBQTFOWSxrQkFBVSxhQTBOdEIsQ0FBQTtBQUVELFNBQVM7QUFDVCxJQUFJLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUU7SUFDOUMsS0FBSyxFQUFFLDhCQUE4QjtJQUNyQyxPQUFPLEVBQUUsS0FBSztJQUNkLFlBQVksRUFBRSxJQUFJO0lBQ2xCLE9BQU8sRUFBRSxLQUFLO0lBRWQsd0NBQXdDO0lBQ3hDLEtBQUssRUFBRSxhQUFLO0NBQ2IsQ0FBQyxDQUFDO0FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLFlBQVksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQXZDLENBQXVDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9Db2xsZWN0aW9uLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IE0tV2F5IG9uIDI3LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcblxuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3J9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtTeW5jQ29udGV4dH0gZnJvbSAnLi9TeW5jQ29udGV4dCc7XG5pbXBvcnQge1N5bmNFbmRwb2ludH0gZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCB7YWpheCwgc3luY30gZnJvbSAnLi9yZXN0JztcblxuLyoqXG4gKiBwcm90b3R5cGUgcHJvcGVydGllcyBzcGVjaWZpZWQgd2hlbiBzdWJjbGFzc2luZyB1c2luZyBDb2xsZWN0aW9uLmRlZmF1bHRzKCkuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGlvblByb3BzIHtcbiAgbW9kZWw/OiBNb2RlbEN0b3I7XG4gIGVudGl0eT86IHN0cmluZztcblxuICBvcHRpb25zPzogYW55O1xuXG4gIHVybD86IHN0cmluZyB8ICgoKSA9PiBzdHJpbmcpO1xuICBzdG9yZT86IFN0b3JlO1xufVxuXG4vKipcbiAqIGNvbnN0cnVjdG9yIGZ1bmN0aW9uIG9mIENvbGxlY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGlvbkN0b3JUPENvbGxlY3Rpb25UeXBlIGV4dGVuZHMgQ29sbGVjdGlvbiwgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIE9wdGlvbnNUeXBlPiB7XG4gIC8qKlxuICAgKiBwcm90b3R5cGUgb2YgY29uc3RydWN0b3IgZnVuY3Rpb24uXG4gICAqL1xuICBwcm90b3R5cGU6IENvbGxlY3Rpb25UeXBlO1xuXG4gIC8qKlxuICAgKiBAc2VlIENvbGxlY3Rpb24jY29uc3RydWN0b3JcbiAgICovXG4gIG5ldyhtb2RlbHM/OiBNb2RlbFR5cGVbXSB8IE9iamVjdFtdLCBvcHRpb25zPzogYW55KTogQ29sbGVjdGlvblR5cGU7XG59XG5cbi8qKlxuICogY29uc3RydWN0b3IgZnVuY3Rpb24gb2YgQ29sbGVjdGlvbi5cbiAqL1xuZXhwb3J0IHR5cGUgQ29sbGVjdGlvbkN0b3IgPSBDb2xsZWN0aW9uQ3RvclQ8Q29sbGVjdGlvbiwgTW9kZWwsIGFueT47XG5cbi8qKlxuICogdGVzdHMgd2hldGhlciBhIGdpdmVuIG9iamVjdCBpcyBhIENvbGxlY3Rpb24uXG4gKlxuICogQHBhcmFtIHtvYmplY3R9IG9iamVjdCB0byBjaGVjay5cbiAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgb2JqZWN0IGlzIGEgQ29sbGVjdGlvbi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzQ29sbGVjdGlvbihvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBDb2xsZWN0aW9uIHtcbiAgaWYgKCFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSBpZiAoJ2lzQ29sbGVjdGlvbicgaW4gb2JqZWN0KSB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gb2JqZWN0LmlzQ29sbGVjdGlvbiA9PT0gQ29sbGVjdGlvbi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpKTtcbiAgICByZXR1cm4gb2JqZWN0LmlzQ29sbGVjdGlvbjtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gQ29sbGVjdGlvbi5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpO1xuICB9XG59XG5cbi8qKlxuICogZXh0ZW5zaW9uIG9mIGEgYmFja2JvbmUuanMgQ29sbGVjdGlvbi5cbiAqXG4gKiBUaGUgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiBjYW4gYmUgdXNlZCBsaWtlIGEgQmFja2JvbmUgQ29sbGVjdGlvbixcbiAqIGJ1dCB0aGVyZSBhcmUgc29tZSBlbmhhbmNlbWVudHMgdG8gZmV0Y2gsIHNhdmUgYW5kIGRlbGV0ZSB0aGVcbiAqIGNvbnRhaW5lZCBtb2RlbHMgZnJvbSBvciB0byBvdGhlciBcImRhdGEgc3RvcmVzXCIuXG4gKlxuICogc2VlIFdlYlNxbFN0b3JlIG9yIFN5bmNTdG9yZSBmb3IgZXhhbXBsZXNcbiAqL1xuZXhwb3J0IGNsYXNzIENvbGxlY3Rpb24gZXh0ZW5kcyBCYWNrYm9uZS5Db2xsZWN0aW9uPE1vZGVsPiB7XG5cbiAgcHVibGljIF90eXBlOiBzdHJpbmc7ICAgICAgICAgLy8gY29uc3RhbnQgJ1JlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24nIG9uIHByb3RvdHlwZVxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcbiAgcHVibGljIGlzQ29sbGVjdGlvbjogYm9vbGVhbjsgLy8gY29uc3RhbnQgdHJ1ZSBvbiBwcm90b3R5cGVcbiAgcHVibGljIGlzU3RvcmU6IGJvb2xlYW47ICAgICAgLy8gY29uc3RhbnQgZmFsc2Ugb24gcHJvdG90eXBlXG5cbiAgcHVibGljIG1vZGVsOiBNb2RlbEN0b3I7XG4gIHB1YmxpYyBlbnRpdHk6IHN0cmluZztcbiAgcHVibGljIG9wdGlvbnM6IGFueTtcblxuICBwdWJsaWMgc3RvcmU6IFN0b3JlO1xuICBwdWJsaWMgc3luY0NvbnRleHQ6IFN5bmNDb250ZXh0O1xuICBwdWJsaWMgY3JlZGVudGlhbHM6IGFueTtcblxuICBwdWJsaWMgZW5kcG9pbnQ6IFN5bmNFbmRwb2ludDtcbiAgcHVibGljIGNoYW5uZWw6IHN0cmluZztcblxuICBwdWJsaWMgY29uc3RydWN0b3IobW9kZWxzPzogTW9kZWxbXSB8IE9iamVjdFtdLCBvcHRpb25zPzogYW55KSB7XG4gICAgc3VwZXIobW9kZWxzLCBvcHRpb25zKTtcblxuICAgIGlmICh0aGlzLnVybCAmJiB0aGlzLnVybC5jaGFyQXQodGhpcy51cmwubGVuZ3RoIC0gMSkgIT09ICcvJykge1xuICAgICAgdGhpcy51cmwgKz0gJy8nO1xuICAgIH1cblxuICAgIHRoaXMuaW5pdChtb2RlbHMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHNldHMgdXAgcHJvdG90eXBlIHByb3BlcnRpZXMgd2hlbiBkZWZpbmluZyBhIENvbGxlY3Rpb24gc3ViY2xhc3MuXG4gICAqIFxuICAgKiBAcGFyYW0ge0NvbGxlY3Rpb25Qcm9wc30gcHJvcGVydGllcyBvZiBwcm90b3R5cGUgdG8gc2V0LlxuICAgKi9cbiAgcHVibGljIHN0YXRpYyBkZWZhdWx0cyhwcm9wZXJ0aWVzOiBDb2xsZWN0aW9uUHJvcHMpOiBDb2xsZWN0aW9uQ3RvciB7XG4gICAgcmV0dXJuIHN1cGVyWydleHRlbmQnXShwcm9wZXJ0aWVzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBpbml0KG1vZGVscz86IE1vZGVsW10gfCBPYmplY3RbXSwgb3B0aW9ucz86IGFueSkge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMuc3RvcmUgPSBvcHRpb25zLnN0b3JlIHx8IHRoaXMuc3RvcmUgfHwgKHRoaXMubW9kZWwgPyB0aGlzLm1vZGVsLnByb3RvdHlwZS5zdG9yZSA6IG51bGwpO1xuICAgIHRoaXMuZW50aXR5ID0gb3B0aW9ucy5lbnRpdHkgfHwgdGhpcy5lbnRpdHkgfHwgKHRoaXMubW9kZWwgPyB0aGlzLm1vZGVsLnByb3RvdHlwZS5lbnRpdHkgOiBudWxsKTtcbiAgICB0aGlzLm9wdGlvbnMgPSBvcHRpb25zLm9wdGlvbnMgfHwgdGhpcy5vcHRpb25zO1xuXG4gICAgdGhpcy5lbnRpdHkgPSB0aGlzLmVudGl0eSB8fCB0aGlzLl9lbnRpdHlGcm9tVXJsKHRoaXMuZ2V0VXJsKCkpO1xuICAgIHRoaXMuX3VwZGF0ZVVybCgpO1xuXG4gICAgaWYgKHRoaXMuc3RvcmUgJiYgXy5pc0Z1bmN0aW9uKHRoaXMuc3RvcmUuaW5pdENvbGxlY3Rpb24pKSB7XG4gICAgICB0aGlzLnN0b3JlLmluaXRDb2xsZWN0aW9uKHRoaXMsIG9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBhamF4KG9wdGlvbnM6IGFueSkge1xuICAgIHJldHVybiBhamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBwdWJsaWMgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IEJhY2tib25lLk1vZGVsQmFzZSwgb3B0aW9ucz86IGFueSkge1xuICAgIHJldHVybiBzeW5jLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBwcml2YXRlIF9lbnRpdHlGcm9tVXJsKHVybFN0cjogc3RyaW5nKSB7XG4gICAgaWYgKHVybFN0cikge1xuICAgICAgbGV0IHVybE9iaiA9IHVybC5wYXJzZSh1cmxTdHIpO1xuXG4gICAgICAvLyBleHRyYWN0IGxhc3QgcGF0aCBwYXJ0IGFzIGVudGl0eSBuYW1lXG4gICAgICB2YXIgcGFydHMgPSB1cmxPYmoucGF0aG5hbWUubWF0Y2goLyhbXlxcL10rKVxcLz8kLyk7XG4gICAgICBpZiAocGFydHMgJiYgcGFydHMubGVuZ3RoID4gMSkge1xuICAgICAgICByZXR1cm4gcGFydHNbLTFdO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBkZXN0cm95KG9wdGlvbnM/OiBhbnkpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgc3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcztcbiAgICBpZiAodGhpcy5sZW5ndGggPiAwKSB7XG4gICAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PT0gMCAmJiBzdWNjZXNzKSB7XG4gICAgICAgICAgc3VjY2VzcygpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgdmFyIG1vZGVsOiBNb2RlbDtcbiAgICAgIHdoaWxlICgobW9kZWwgPSB0aGlzLmZpcnN0KCkpKSB7XG4gICAgICAgIHRoaXMuc3luYygnZGVsZXRlJywgbW9kZWwsIG9wdGlvbnMpO1xuICAgICAgICB0aGlzLnJlbW92ZShtb2RlbCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdWNjZXNzKSB7XG4gICAgICBzdWNjZXNzKCk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIHNhdmUgYWxsIGNvbnRhaW5pbmcgbW9kZWxzXG4gICAqL1xuICBwdWJsaWMgc2F2ZSgpIHtcbiAgICB0aGlzLmVhY2goZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICBtb2RlbC5zYXZlKCk7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgYXBwbHlGaWx0ZXIoY2FsbGJhY2s6IF8uTGlzdEl0ZXJhdG9yPE1vZGVsLCBib29sZWFuPikge1xuICAgIHRoaXMudHJpZ2dlcignZmlsdGVyJywgdGhpcy5maWx0ZXIoY2FsbGJhY2spKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXRVcmxQYXJhbXModXJsPzogc3RyaW5nKTogYW55IHtcbiAgICB1cmwgPSB1cmwgfHwgdGhpcy5nZXRVcmwoKTtcbiAgICB2YXIgbSA9IHVybC5tYXRjaCgvXFw/KFteI10qKS8pO1xuICAgIHZhciBwYXJhbXMgPSB7fTtcbiAgICBpZiAobSAmJiBtLmxlbmd0aCA+IDEpIHtcbiAgICAgIF8uZWFjaChtWzFdLnNwbGl0KCcmJyksIGZ1bmN0aW9uIChwKSB7XG4gICAgICAgIHZhciBhID0gcC5zcGxpdCgnPScpO1xuICAgICAgICBwYXJhbXNbYVswXV0gPSBhWzFdO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBwYXJhbXM7XG4gIH1cblxuICBwdWJsaWMgZ2V0VXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIChfLmlzRnVuY3Rpb24odGhpcy51cmwpID8gdGhpcy51cmwoKSA6IHRoaXMudXJsKSB8fCAnJztcbiAgfVxuXG4gIHB1YmxpYyBnZXRVcmxSb290KCk6IHN0cmluZyB7XG4gICAgdmFyIHVybCA9IHRoaXMuZ2V0VXJsKCk7XG4gICAgcmV0dXJuIHVybC5pbmRleE9mKCc/JykgPj0gMCA/IHVybC5zdWJzdHIoMCwgdXJsLmluZGV4T2YoJz8nKSkgOiB1cmw7XG4gIH1cblxuICBwcml2YXRlICBfdXBkYXRlVXJsKCkge1xuICAgIGlmICh0aGlzLm9wdGlvbnMpIHtcbiAgICAgIHZhciBwYXJhbXMgPSB0aGlzLmdldFVybFBhcmFtcygpO1xuICAgICAgdGhpcy51cmwgPSB0aGlzLmdldFVybFJvb3QoKTtcblxuICAgICAgaWYgKHRoaXMub3B0aW9ucy5xdWVyeSkge1xuICAgICAgICBwYXJhbXMucXVlcnkgPSBlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkodGhpcy5vcHRpb25zLnF1ZXJ5KSk7XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5vcHRpb25zLmZpZWxkcykge1xuICAgICAgICBwYXJhbXMuZmllbGRzID0gZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KHRoaXMub3B0aW9ucy5maWVsZHMpKTtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLm9wdGlvbnMuc29ydCkge1xuICAgICAgICBwYXJhbXMuc29ydCA9IGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeSh0aGlzLm9wdGlvbnMuc29ydCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoIV8uaXNFbXB0eShwYXJhbXMpKSB7XG4gICAgICAgIHRoaXMudXJsICs9ICc/JztcbiAgICAgICAgdmFyIGE6IHN0cmluZ1tdID0gW107XG4gICAgICAgIGZvciAodmFyIGsgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgYS5wdXNoKGsgKyAocGFyYW1zW2tdID8gJz0nICsgcGFyYW1zW2tdIDogJycpKTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnVybCArPSBhLmpvaW4oJyYnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogcmVhZHMgYW4gYWRkaXRpb25hbCBwYWdlIG9mIGRhdGEgaW50byB0aGlzIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEEgZmV0Y2goKSBtdXN0IGhhdmUgYmVlbiBwZXJmb3JtZWQgbG9hZGluZyB0aGUgaW5pdGlhbCBzZXQgb2YgZGF0YS4gVGhpcyBtZXRob2QgaXMgaW50ZW5kZWQgZm9yIGluZmluaXRlIHNjcm9sbGluZ1xuICAgKiBpbXBsZW1lbnRhdGlvbi5cbiAgICpcbiAgICogV2hlbiBhc3luYyBwcm9jZXNzaW5nIGlzIGRvbmUsIGEgbW9yZSBhdHRyaWJ1dGUgaXMgc2V0IG9uIHRoZSBvcHRpb25zIG9iamVjdCBpbiBjYXNlIGFkZGl0aW9uYWwgZGF0YSBtaWdodCBiZVxuICAgKiBhdmFpbGFibGUgd2hpY2ggY2FuIGJlIGxvYWRlZCBieSBjYWxsaW5nIHRoaXMgbWV0aG9kIGFnYWluLiBMaWtld2lzZSBhbiBlbmQgYXR0cmlidXRlIGlzIHNldCBpZiB0aGUgZGF0YSBpc1xuICAgKiBmdWxseSBsb2FkZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHN1Y2ggYXMgcGFnZVNpemUgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBAc2VlIFN5bmNDb250ZXh0I2ZldGNoTW9yZSgpXG4gICAqL1xuICBwdWJsaWMgZmV0Y2hNb3JlKG9wdGlvbnM/OiBhbnkpOiBQcm9taXNlTGlrZTxhbnk+IHtcbiAgICBpZiAoIXRoaXMuc3luY0NvbnRleHQpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hNb3JlKHRoaXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlYWRzIHRoZSBuZXh0IHBhZ2Ugb2YgZGF0YSBpbnRvIHRoaXMgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQSBmZXRjaCgpIG11c3QgaGF2ZSBiZWVuIHBlcmZvcm1lZCBsb2FkaW5nIHRoZSBpbml0aWFsIHNldCBvZiBkYXRhLiBUaGlzIG1ldGhvZCBpcyBpbnRlbmRlZCBmb3IgcGFnaW5nXG4gICAqIGltcGxlbWVudGF0aW9uLlxuICAgKlxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBuZXh0L3ByZXYgYXR0cmlidXRlIGlzIHNldCBvbiB0aGUgb3B0aW9ucyBvYmplY3QgaW4gY2FzZSBhZGRpdGlvbmFsIHBhZ2VzIG1pZ2h0IGJlXG4gICAqIGF2YWlsYWJsZSB3aGljaCBjYW4gYmUgbG9hZGVkIGJ5IGNhbGxpbmcgdGhlIGNvcnJlc3BvbmRpbmcgbWV0aG9kLlxuICAgKlxuICAgKiBAcGFyYW0ge29iamVjdH0gb3B0aW9ucyBzdWNoIGFzIHBhZ2VTaXplIHRvIHJldHJpZXZlLlxuICAgKiBAcmV0dXJuIHtQcm9taXNlfSBwcm9taXNlIG9mIHRoZSBsb2FkIG9wZXJhdGlvbi5cbiAgICpcbiAgICogQHNlZSBTeW5jQ29udGV4dCNmZXRjaE5leHQoKVxuICAgKi9cbiAgcHVibGljIGZldGNoTmV4dChvcHRpb25zPzogYW55KTogUHJvbWlzZUxpa2U8YW55PiB7XG4gICAgaWYgKCF0aGlzLnN5bmNDb250ZXh0KSB7XG4gICAgICByZXR1cm4gUS5yZWplY3QobmV3IEVycm9yKCdubyBjb250ZXh0JykpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLnN5bmNDb250ZXh0LmZldGNoTmV4dCh0aGlzLCBvcHRpb25zKTtcbiAgfVxuXG4gIC8qKlxuICAgKiByZWFkcyB0aGUgcHJldmlvdXMgcGFnZSBvZiBkYXRhIGludG8gdGhpcyBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBBIGZldGNoKCkgbXVzdCBoYXZlIGJlZW4gcGVyZm9ybWVkIGxvYWRpbmcgdGhlIGluaXRpYWwgc2V0IG9mIGRhdGEuIFRoaXMgbWV0aG9kIGlzIGludGVuZGVkIGZvciBwYWdpbmdcbiAgICogaW1wbGVtZW50YXRpb24uXG4gICAqXG4gICAqIFdoZW4gYXN5bmMgcHJvY2Vzc2luZyBpcyBkb25lLCBhIG5leHQvcHJldiBhdHRyaWJ1dGUgaXMgc2V0IG9uIHRoZSBvcHRpb25zIG9iamVjdCBpbiBjYXNlIGFkZGl0aW9uYWwgcGFnZXMgbWlnaHQgYmVcbiAgICogYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGUgY29ycmVzcG9uZGluZyBtZXRob2QuXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHN1Y2ggYXMgcGFnZVNpemUgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBAc2VlIFN5bmNDb250ZXh0I2ZldGNoUHJldigpXG4gICAqL1xuICBwdWJsaWMgZmV0Y2hQcmV2KG9wdGlvbnM/OiBhbnkpOiBQcm9taXNlTGlrZTxhbnk+IHtcbiAgICBpZiAoIXRoaXMuc3luY0NvbnRleHQpIHtcbiAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ25vIGNvbnRleHQnKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuc3luY0NvbnRleHQuZmV0Y2hQcmV2KHRoaXMsIG9wdGlvbnMpO1xuICB9XG5cbn1cblxuLy8gbWl4aW5zXG5sZXQgY29sbGVjdGlvbiA9IF8uZXh0ZW5kKENvbGxlY3Rpb24ucHJvdG90eXBlLCB7XG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbicsXG4gIGlzTW9kZWw6IGZhbHNlLFxuICBpc0NvbGxlY3Rpb246IHRydWUsXG4gIGlzU3RvcmU6IGZhbHNlLFxuXG4gIC8vIGRlZmF1bHQgbW9kZWwgdHlwZSB1bmxlc3Mgb3ZlcndyaXR0ZW5cbiAgbW9kZWw6IE1vZGVsXG59KTtcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzQ29sbGVjdGlvbihPYmplY3QuY3JlYXRlKGNvbGxlY3Rpb24pKSk7XG4iXX0=