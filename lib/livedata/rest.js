/*
 * @file livedata/rest.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 27.06.2015
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
var diag = require('../core/diag');
var Q = require('q');
var web = require('../web');
/**
 * Backbone of browser via script tag or via require backbone.
 *
 * Notice, Backbone module is a mandatory runtime dependency of the Relution SDK!
 *
 * @internal Not public API, exported for testing purposes only!
 */
exports.Backbone = global['Backbone'] ||
    typeof require === 'function' &&
        (global['Backbone'] = require('backbone')); // required version
/**
 * options passed to Collection.fetch() preventing backbone.js from consuming the response.
 *
 * This can be used when fetching large quantities of data and just the store and attached
 * collections are to be updated. By merging these options in and the server response is
 * not used to update the collection fetched itself.
 */
exports.bareboneOptions = Object.freeze({
    // indicates not to rely on Collection contents to aware code, not used by backbone.js
    barebone: true,
    // prevents any mutation of the Collection contents
    add: false,
    remove: false,
    merge: false,
    // does not resort once the response data arrives
    sort: false,
    // omits events from being fired
    silent: true
});
var backboneAjax = exports.Backbone.ajax;
exports.Backbone.ajax = function ajax(options) {
    var superAjax = options && options.ajax || backboneAjax;
    return superAjax.apply(this, arguments);
};
function ajax(options) {
    var that = this;
    var args = arguments;
    var fnSuccess = options.success;
    delete options.success;
    var fnError = options.error;
    delete options.error;
    options.method = options.type;
    options.body = options.data;
    var superAjax = that.super_ && that.super_.ajax || web.ajax;
    var xhr = superAjax.apply(that, args);
    if (!xhr) {
        return Q.reject(new Error('ajax failed'));
    }
    options.xhr = xhr;
    var promise = xhr.then(function (response) {
        // AJAX success function( Anything data, String textStatus, jqXHR jqXHR )
        if (fnSuccess) {
            fnSuccess(response);
        }
        return Q.resolve(response);
    }, function (response) {
        // AJAX error function( jqXHR jqXHR, String textStatus, String errorThrown )
        if (fnError) {
            fnError(response, response.statusMessage || response.message, response);
        }
        return Q.reject(response);
    });
    promise.xhr = xhr;
    return promise;
}
exports.ajax = ajax;
function sync(method, model, options) {
    if (options === void 0) { options = {}; }
    var store = options.store || this.store;
    options.credentials = options.credentials || this.credentials || store && store.options && store.options.credentials;
    diag.debug.info('Relution.livedata.sync ' + method + ' ' + model.id);
    if (store && store.sync) {
        // store access (this is redundant model argument)
        var storeAjax = store.ajax && _.bind(store.ajax, store);
        options.ajax = options.ajax || storeAjax || this.ajax || ajax;
        options.promise = store.sync.apply(store, arguments);
        return options.promise;
    }
    else {
        // direct access (goes via Backbone)
        var superSync = this.super_ && this.super_.sync || exports.Backbone.sync;
        options.ajax = options.ajax || this.ajax;
        if (options.ajax) {
            // we must avoid backbone stringifying the body data as our ajax runs in
            if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
                options.data = options.attrs || model.toJSON(options);
            }
        }
        return superSync.apply(this, arguments);
    }
}
exports.sync = sync;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9yZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFFckMsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsSUFBWSxHQUFHLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFLOUI7Ozs7OztHQU1HO0FBQ1UsZ0JBQVEsR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDO0lBQ3hDLE9BQU8sT0FBTyxLQUFLLFVBQVU7UUFDN0IsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUI7QUFFakU7Ozs7OztHQU1HO0FBQ1UsdUJBQWUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzNDLHNGQUFzRjtJQUN0RixRQUFRLEVBQUUsSUFBSTtJQUVkLG1EQUFtRDtJQUNuRCxHQUFHLEVBQUUsS0FBSztJQUNWLE1BQU0sRUFBRSxLQUFLO0lBQ2IsS0FBSyxFQUFFLEtBQUs7SUFFWixpREFBaUQ7SUFDakQsSUFBSSxFQUFFLEtBQUs7SUFFWCxnQ0FBZ0M7SUFDaEMsTUFBTSxFQUFFLElBQUk7Q0FDYixDQUFDLENBQUM7QUFFSCxJQUFNLFlBQVksR0FBRyxnQkFBUSxDQUFDLElBQUksQ0FBQztBQUVuQyxnQkFBUSxDQUFDLElBQUksR0FBRyxjQUFjLE9BQWE7SUFDekMsSUFBSSxTQUFTLEdBQUcsT0FBTyxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksWUFBWSxDQUFDO0lBQ3hELE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUM7QUFFRixjQUFxQixPQUFZO0lBQy9C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LEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNyRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztJQUN6QixDQUFDO0lBQUMsSUFBSSxDQUFDLENBQUM7UUFDTixvQ0FBb0M7UUFDcEMsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxnQkFBUSxDQUFDLElBQUksQ0FBQztRQUNqRSxPQUFPLENBQUMsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztRQUN6QyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNqQix3RUFBd0U7WUFDeEUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsTUFBTSxLQUFLLFFBQVEsSUFBSSxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hHLE9BQU8sQ0FBQyxJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3hELENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7QUFDSCxDQUFDO0FBeEJlLFlBQUksT0F3Qm5CLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvcmVzdC50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjcuMDYuMjAxNVxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XG5cbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5cbmltcG9ydCAqIGFzIHdlYiBmcm9tICcuLi93ZWInO1xuXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcblxuLyoqXG4gKiBCYWNrYm9uZSBvZiBicm93c2VyIHZpYSBzY3JpcHQgdGFnIG9yIHZpYSByZXF1aXJlIGJhY2tib25lLlxuICpcbiAqIE5vdGljZSwgQmFja2JvbmUgbW9kdWxlIGlzIGEgbWFuZGF0b3J5IHJ1bnRpbWUgZGVwZW5kZW5jeSBvZiB0aGUgUmVsdXRpb24gU0RLIVxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcHVibGljIEFQSSwgZXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcbiAqL1xuZXhwb3J0IGNvbnN0IEJhY2tib25lID0gZ2xvYmFsWydCYWNrYm9uZSddIHx8IC8vIG5hdGl2ZSBpbXBsZW1lbnRhdGlvblxuICB0eXBlb2YgcmVxdWlyZSA9PT0gJ2Z1bmN0aW9uJyAmJiAgICAgICAgICAgIC8vIG9yIHdoZW4gcmVxdWlyZSBpcyBhdmFpbGFibGVcbiAgKGdsb2JhbFsnQmFja2JvbmUnXSA9IHJlcXVpcmUoJ2JhY2tib25lJykpOyAvLyByZXF1aXJlZCB2ZXJzaW9uXG5cbi8qKlxuICogb3B0aW9ucyBwYXNzZWQgdG8gQ29sbGVjdGlvbi5mZXRjaCgpIHByZXZlbnRpbmcgYmFja2JvbmUuanMgZnJvbSBjb25zdW1pbmcgdGhlIHJlc3BvbnNlLlxuICpcbiAqIFRoaXMgY2FuIGJlIHVzZWQgd2hlbiBmZXRjaGluZyBsYXJnZSBxdWFudGl0aWVzIG9mIGRhdGEgYW5kIGp1c3QgdGhlIHN0b3JlIGFuZCBhdHRhY2hlZFxuICogY29sbGVjdGlvbnMgYXJlIHRvIGJlIHVwZGF0ZWQuIEJ5IG1lcmdpbmcgdGhlc2Ugb3B0aW9ucyBpbiBhbmQgdGhlIHNlcnZlciByZXNwb25zZSBpc1xuICogbm90IHVzZWQgdG8gdXBkYXRlIHRoZSBjb2xsZWN0aW9uIGZldGNoZWQgaXRzZWxmLlxuICovXG5leHBvcnQgY29uc3QgYmFyZWJvbmVPcHRpb25zID0gT2JqZWN0LmZyZWV6ZSh7XG4gIC8vIGluZGljYXRlcyBub3QgdG8gcmVseSBvbiBDb2xsZWN0aW9uIGNvbnRlbnRzIHRvIGF3YXJlIGNvZGUsIG5vdCB1c2VkIGJ5IGJhY2tib25lLmpzXG4gIGJhcmVib25lOiB0cnVlLFxuXG4gIC8vIHByZXZlbnRzIGFueSBtdXRhdGlvbiBvZiB0aGUgQ29sbGVjdGlvbiBjb250ZW50c1xuICBhZGQ6IGZhbHNlLFxuICByZW1vdmU6IGZhbHNlLFxuICBtZXJnZTogZmFsc2UsXG5cbiAgLy8gZG9lcyBub3QgcmVzb3J0IG9uY2UgdGhlIHJlc3BvbnNlIGRhdGEgYXJyaXZlc1xuICBzb3J0OiBmYWxzZSxcblxuICAvLyBvbWl0cyBldmVudHMgZnJvbSBiZWluZyBmaXJlZFxuICBzaWxlbnQ6IHRydWVcbn0pO1xuXG5jb25zdCBiYWNrYm9uZUFqYXggPSBCYWNrYm9uZS5hamF4O1xuXG5CYWNrYm9uZS5hamF4ID0gZnVuY3Rpb24gYWpheChvcHRpb25zPzogYW55KSB7XG4gIHZhciBzdXBlckFqYXggPSBvcHRpb25zICYmIG9wdGlvbnMuYWpheCB8fCBiYWNrYm9uZUFqYXg7XG4gIHJldHVybiBzdXBlckFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBhamF4KG9wdGlvbnM6IGFueSk6IFByb21pc2VMaWtlPGFueT4ge1xuICB2YXIgdGhhdCA9IHRoaXM7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuXG4gIHZhciBmblN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gIGRlbGV0ZSBvcHRpb25zLnN1Y2Nlc3M7XG4gIHZhciBmbkVycm9yID0gb3B0aW9ucy5lcnJvcjtcbiAgZGVsZXRlIG9wdGlvbnMuZXJyb3I7XG5cbiAgb3B0aW9ucy5tZXRob2QgPSBvcHRpb25zLnR5cGU7XG4gIG9wdGlvbnMuYm9keSA9IG9wdGlvbnMuZGF0YTtcblxuICB2YXIgc3VwZXJBamF4ID0gdGhhdC5zdXBlcl8gJiYgdGhhdC5zdXBlcl8uYWpheCB8fCB3ZWIuYWpheDtcbiAgdmFyIHhociA9IHN1cGVyQWpheC5hcHBseSh0aGF0LCBhcmdzKTtcbiAgaWYgKCF4aHIpIHtcbiAgICByZXR1cm4gUS5yZWplY3QobmV3IEVycm9yKCdhamF4IGZhaWxlZCcpKTtcbiAgfVxuICBvcHRpb25zLnhociA9IHhocjtcblxuICBsZXQgcHJvbWlzZSA9IHhoci50aGVuKChyZXNwb25zZTogYW55KSA9PiB7XG4gICAgLy8gQUpBWCBzdWNjZXNzIGZ1bmN0aW9uKCBBbnl0aGluZyBkYXRhLCBTdHJpbmcgdGV4dFN0YXR1cywganFYSFIganFYSFIgKVxuICAgIGlmIChmblN1Y2Nlc3MpIHtcbiAgICAgIGZuU3VjY2VzcyhyZXNwb25zZSk7XG4gICAgfVxuICAgIHJldHVybiBRLnJlc29sdmUocmVzcG9uc2UpO1xuICB9LCAocmVzcG9uc2U6IHdlYi5IdHRwRXJyb3IpID0+IHtcbiAgICAvLyBBSkFYIGVycm9yIGZ1bmN0aW9uKCBqcVhIUiBqcVhIUiwgU3RyaW5nIHRleHRTdGF0dXMsIFN0cmluZyBlcnJvclRocm93biApXG4gICAgaWYgKGZuRXJyb3IpIHtcbiAgICAgIGZuRXJyb3IocmVzcG9uc2UsIHJlc3BvbnNlLnN0YXR1c01lc3NhZ2UgfHwgcmVzcG9uc2UubWVzc2FnZSwgcmVzcG9uc2UpO1xuICAgIH1cbiAgICByZXR1cm4gUS5yZWplY3QocmVzcG9uc2UpO1xuICB9KTtcbiAgcHJvbWlzZS54aHIgPSB4aHI7XG4gIHJldHVybiBwcm9taXNlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pOlxuUHJvbWlzZUxpa2U8YW55PiB7XG4gIHZhciBzdG9yZSA9IG9wdGlvbnMuc3RvcmUgfHwgdGhpcy5zdG9yZTtcbiAgb3B0aW9ucy5jcmVkZW50aWFscyA9IG9wdGlvbnMuY3JlZGVudGlhbHMgfHwgdGhpcy5jcmVkZW50aWFscyB8fCBzdG9yZSAmJiBzdG9yZS5vcHRpb25zICYmIHN0b3JlLm9wdGlvbnMuY3JlZGVudGlhbHM7XG5cbiAgZGlhZy5kZWJ1Zy5pbmZvKCdSZWx1dGlvbi5saXZlZGF0YS5zeW5jICcgKyBtZXRob2QgKyAnICcgKyAoPGFueT5tb2RlbCkuaWQpO1xuICBpZiAoc3RvcmUgJiYgc3RvcmUuc3luYykge1xuICAgIC8vIHN0b3JlIGFjY2VzcyAodGhpcyBpcyByZWR1bmRhbnQgbW9kZWwgYXJndW1lbnQpXG4gICAgdmFyIHN0b3JlQWpheCA9IHN0b3JlLmFqYXggJiYgXy5iaW5kKHN0b3JlLmFqYXgsIHN0b3JlKTtcbiAgICBvcHRpb25zLmFqYXggPSBvcHRpb25zLmFqYXggfHwgIHN0b3JlQWpheCB8fCB0aGlzLmFqYXggfHwgYWpheDtcbiAgICBvcHRpb25zLnByb21pc2UgPSBzdG9yZS5zeW5jLmFwcGx5KHN0b3JlLCBhcmd1bWVudHMpO1xuICAgIHJldHVybiBvcHRpb25zLnByb21pc2U7XG4gIH0gZWxzZSB7XG4gICAgLy8gZGlyZWN0IGFjY2VzcyAoZ29lcyB2aWEgQmFja2JvbmUpXG4gICAgdmFyIHN1cGVyU3luYyA9IHRoaXMuc3VwZXJfICYmIHRoaXMuc3VwZXJfLnN5bmMgfHwgQmFja2JvbmUuc3luYztcbiAgICBvcHRpb25zLmFqYXggPSBvcHRpb25zLmFqYXggfHwgdGhpcy5hamF4O1xuICAgIGlmIChvcHRpb25zLmFqYXgpIHtcbiAgICAgIC8vIHdlIG11c3QgYXZvaWQgYmFja2JvbmUgc3RyaW5naWZ5aW5nIHRoZSBib2R5IGRhdGEgYXMgb3VyIGFqYXggcnVucyBpblxuICAgICAgaWYgKG9wdGlvbnMuZGF0YSA9PSBudWxsICYmIG1vZGVsICYmIChtZXRob2QgPT09ICdjcmVhdGUnIHx8IG1ldGhvZCA9PT0gJ3VwZGF0ZScgfHwgbWV0aG9kID09PSAncGF0Y2gnKSkge1xuICAgICAgICBvcHRpb25zLmRhdGEgPSBvcHRpb25zLmF0dHJzIHx8IG1vZGVsLnRvSlNPTihvcHRpb25zKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1cGVyU3luYy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG59XG4iXX0=