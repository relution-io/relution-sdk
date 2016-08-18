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
//# sourceMappingURL=rest.js.map