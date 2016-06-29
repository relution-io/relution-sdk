// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt

import * as diag from '../core/diag';
import * as base64 from './base64';

import * as Q from 'q';

/**
 * options passed to Collection.fetch() preventing backbone.js from consuming the response.
 *
 * This can be used when fetching large quantities of data and just the store and attached
 * collections are to be updated. By merging these options in and the server response is
 * not used to update the collection fetched itself.
 */
export const bareboneOptions = Object.freeze({
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

export const http = (<any>Backbone).ajax;

(<any>Backbone).ajax = function ajax(options) {
  var superAjax = options && options.ajax || http;
  return superAjax.apply(this, arguments);
};

export function logon(options) {
  var credentials = options && options.credentials;
  var type = credentials && credentials.type;
  var auth = type && logon[type];
  return auth ? auth.apply(this, arguments) : Q.resolve(undefined);
}

(<any>logon).basic = function basic(options) {
  var credentials = options.credentials;
  var auth = credentials.username && base64.encode(encodeURIComponent(credentials.username + ':' + (credentials.password || '')));
  if (auth) {
    options.beforeSend = function (xhr) {
      xhr.setRequestHeader('Authorization', 'Basic ' + auth);
    };
  }
  return Q.resolve(undefined);
};

export function ajax(options) {
  var that = this;
  var args = arguments;

  var fnSuccess = options.success;
  delete options.success;
  var fnError = options.error;
  delete options.error;

  options.method = options.type;  // set method because some ajax libs need this
  var promise = logon.apply(this, arguments).then(function () {
    var superAjax = that.super_ && that.super_.ajax || http;
      var xhr = superAjax.apply(that, args);
      if (!xhr) {
        return Q.reject(new Error('ajax failed'));
      }

    promise.xhr = xhr;
    options.xhr = xhr;
    if (Q.isPromiseAlike(xhr) && typeof xhr.catch === 'function') {
      // promise-based XHR
      return xhr.then(function onSuccess (response) {
        // AJAX success function( Anything data, String textStatus, jqXHR jqXHR )
        if (fnSuccess) {
          fnSuccess(response.data, response.status, response);
        }
        return Q.resolve(response.data);
      }, function onError (response) {
        // AJAX error function( jqXHR jqXHR, String textStatus, String errorThrown )
        response.responseText = response.statusText;  // jQuery compatibility
        response.responseJSON = response.data;        // jQuery compatibility
        if (fnError) {
          fnError(response, response.statusText, response.data);
        }
        return Q.reject(response);
      });
    } else {
      // jQuery-based XHR
      var q = Q.defer();
      xhr.success(function onSuccess(data, textStatus, jqXHR) {
        var result;
        if (fnSuccess) {
          result = fnSuccess.apply(this, arguments);
        }
        q.resolve(data);
        return result;
      });
      xhr.error(function onError (jqXHR, textStatus, errorThrown) {
        var result;
        if (fnError) {
          result = fnError.apply(this, arguments);
        }
        q.reject(jqXHR);
        return result;
      });
      return q.promise;
    }
  });
  return promise;
}

export function sync(method, model, options) {
  options = options || {};
  var store = options.store || this.store;
  options.credentials = options.credentials || this.credentials || store && store.options && store.options.credentials;

  diag.debug.info('Relution.LiveData.sync ' + method + ' ' + model.id);
  if (store && store.sync) {
    // store access (this is redundant model argument)
    var storeAjax = store.ajax && _.bind(store.ajax, store);
    options.ajax = options.ajax ||  storeAjax || this.ajax || ajax;
    options.promise = store.sync.apply(store, arguments);
    return options.promise;
  } else {
    // direct access (goes via Backbone)
    var superSync = this.super_ && this.super_.sync || Backbone.sync;
    options.ajax = options.ajax ||  this.ajax || http;
    return superSync.apply(this, arguments);
  }
}
