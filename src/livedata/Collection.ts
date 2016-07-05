/**
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

import * as _ from 'lodash';

import * as diag from '../core/diag';

import {Store} from './Store';
import {Model, ModelCtor} from './Model';
import {SyncContext} from './SyncContext';
import {SyncEndpoint} from './SyncEndpoint';

import {ajax, sync} from './rest';

/**
 * constructor function of Collection.
 */
export interface CollectionCtor {
  /**
   * @see Collection#constructor
   */
  new(models?: any, options?: any): Collection;
}

/**
 * tests whether a given object is a Collection.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Collection.
 */
export function isCollection(object): object is Collection {
  if (!object || typeof object !== 'object') {
    return false;
  } else if ('isCollection' in object) {
    diag.debug.assert(() => object.isCollection === Collection.prototype.isPrototypeOf(object));
    return object.isCollection;
  } else {
    return Collection.prototype.isPrototypeOf(object);
  }
}

/**
 * extension of a backbone.js Collection.
 *
 * The Relution.livedata.Collection can be used like a Backbone Collection,
 * but there are some enhancements to fetch, save and delete the
 * contained models from or to other "data stores".
 *
 * see WebSqlStore or SyncStore for examples
 */
export class Collection extends Backbone.Collection<Model> {

  public _type: string;         // constant 'Relution.LiveData.Collection' on prototype
  public isModel: boolean;      // constant false on prototype
  public isCollection: boolean; // constant true on prototype

  public model: ModelCtor;
  public entity: string;
  public options;

  public store: Store;
  public syncContext: SyncContext;
  public credentials: any;

  public endpoint: SyncEndpoint;
  public channel: string;

  public constructor(models?: any, options?: any) {
    super(models, options);

    if (this.url && this.url.charAt(this.url.length - 1) !== '/') {
      this.url += '/';
    }

    this.init(models, options);
  }

  protected init(models?: any, options?: any) {
    options = options || {};
    this.store = options.store || this.store || (this.model ? this.model.prototype.store : null);
    this.entity = options.entity || this.entity || (this.model ? this.model.prototype.entity : null);
    this.options = options.options || this.options;

    this.entity = this.entity || this.entityFromUrl(this.url);
    this._updateUrl();

    if (this.store && _.isFunction(this.store.initCollection)) {
      this.store.initCollection(this, options);
    }
  }

  // following fixes DefinitelyTyped definitions of backbone.js not declaring modelId() method
  public modelId: (attrs: any) => any;

  public ajax(options: any) {
    return ajax.apply(this, arguments);
  }
  public sync(method: string, model: Backbone.ModelBase, options?: any) {
    return sync.apply(this, arguments);
  }

  public entityFromUrl(url) {
    if (url) {
      var location = document.createElement('a');
      location.href = url || this.url;
      // IE doesn't populate all link properties when setting .href with a relative URL,
      // however .href will return an absolute URL which then can be used on itself
      // to populate these additional fields.
      if (location.host === '') {
        location.href = location.href;
      }

      // extract last path part as entity name
      var parts = location.pathname.match(/([^\/]+)\/?$/);
      if (parts && parts.length > 1) {
        return parts[-1];
      }
    }
  }

  public destroy(options?) {
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
    } else if (success) {
      success();
    }
  }

  /**
   * save all containing models
   */
  public save() {
    this.each(function (model) {
      model.save();
    });
  }

  public applyFilter(callback) {
    this.trigger('filter', this.filter(callback));
  }

  public getUrlParams(url?: string): any {
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
  }

  public getUrl(): string {
    return (_.isFunction(this.url) ? this.url() : this.url) || '';
  }

  public getUrlRoot(): string {
    var url = this.getUrl();
    return url.indexOf('?') >= 0 ? url.substr(0, url.indexOf('?')) : url;
  }

  private  _updateUrl() {
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
  }

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
  public fetchMore(options): PromiseLike<any> {
    if (!this.syncContext) {
      return Q.reject(new Error('no context'));
    }

    return this.syncContext.fetchMore(this, options);
  }

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
  public fetchNext(options): PromiseLike<any> {
    if (!this.syncContext) {
      return Q.reject(new Error('no context'));
    }

    return this.syncContext.fetchNext(this, options);
  }

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
  public fetchPrev(options): PromiseLike<any> {
    if (!this.syncContext) {
      return Q.reject(new Error('no context'));
    }

    return this.syncContext.fetchPrev(this, options);
  }

}

// mixins
let collection = _.extend(Collection.prototype, {
  _type: 'Relution.LiveData.Collection',
  isModel: false,
  isCollection: true,

  // default model type unless overwritten
  model: Model
});
diag.debug.assert(() => isCollection(Object.create(collection)));
