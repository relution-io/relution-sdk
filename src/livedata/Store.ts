/**
 * @file livedata/Store.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 24.06.2015
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

import {Backbone} from './Object';
import {Model} from './Model';
import {Collection, isCollection} from './Collection';

import {_Object, _create} from './Object';

/**
 * constructor function of Store.
 */
export interface StoreCtor {
  /**
   * @see Store#constructor
   */
  new(options?: any): Store;
}

/**
 * base class to build a custom data store.
 */
export class Store {

  public _type: string;         // constant 'Relution.LiveData.Store' on prototype
  public isModel: boolean;      // constant false on prototype
  public isCollection: boolean; // constant false on prototype

  // following are store-specific options, defaults stored in prototype at end of this file
  protected name: string;

  protected entities: any;
  public endpoints: any;

  constructor(options?: any) {
    if (options) {
      // copy options values into the object
      _.extend(this, options);
    }
  }

  public static _create = _create;

  protected trigger;

  getArray(data) {
    if (_.isArray(data)) {
      return data;
    } else if (isCollection(data)) {
      return data.models;
    }
    return _.isObject(data) ? [data] : [];
  }

  getDataArray(data) {
    var array = [];
    if (_.isArray(data) || Backbone.Collection.prototype.isPrototypeOf(data)) {
      _.each(data, function(d) {
        var attrs = this.getAttributes(d);
        if (attrs) {
          array.push(attrs);
        }
      });
    } else {
      var attrs = this.getAttributes(data);
      if (attrs) {
        array.push(this.getAttributes(attrs));
      }
    }
    return array;
  }

  getAttributes(model) {
    if (Backbone.Model.prototype.isPrototypeOf(model)) {
      return model.attributes;
    }
    return _.isObject(model) ? model : null;
  }

  initModel(model, options?: any): void {
    // may be overwritten
  }

  initCollection(collection, options?: any): void {
    // may be overwritten
  }

  sync(method: string, model: Model | Collection, options?: any): PromiseLike<any> {
    // must be overwritten
    return Q.reject(new Error('not implemented!')); // purely abstract
  }

  /**
   *
   * @param collection usally a collection, but can also be a model
   * @param options
   */
  fetch(collection, options) {
    var opts = _.extend({}, options || {}, { store: this });
    return collection.fetch(opts);
  }

  create(collection, model, options) {
    var opts = _.extend({}, options || {}, { store: this });
    return collection._create(model, opts);
  }

  save(model, attr, options) {
    var opts = _.extend({}, options || {}, { store: this });
    return model.save(attr, opts);
  }

  destroy(model, options) {
    if (model && model.destroy) {
      var opts = _.extend({}, options || {}, { store: this });
      model.destroy(opts);
    }
  }

  _checkData(obj, data) {
    if ((!_.isArray(data) || data.length === 0) && !_.isObject(data)) {
      var error = Store.CONST.ERROR_NO_DATA;
      diag.debug.error(error);
      this.handleError(obj, error);
      return false;
    }
    return true;
  }

  private handleCallback; // mixed in via _Object

  protected handleSuccess(obj, ...args): any {
    if (obj.success) {
      this.handleCallback.apply(this, [obj.success].concat(args));
    }
    if (obj.finish) {
      this.handleCallback.apply(this, [obj.finish].concat(args));
    }
  }

  protected handleError(obj, ...args): any {
    if (obj.error) {
      this.handleCallback.apply(this, [obj.error].concat(args));
    }
    if (obj.finish) {
      this.handleCallback.apply(this, [obj.finish].concat(args));
    }
  }

  static CONST = {
    ERROR_NO_DATA: 'No data passed. ',
    ERROR_LOAD_DATA: 'Error while loading data from store. ',
    ERROR_SAVE_DATA: 'Error while saving data to the store. ',
    ERROR_LOAD_IDS: 'Error while loading ids from store. ',
    ERROR_SAVE_IDS: 'Error while saving ids to the store. '
  };

  public close() {
    // nothing to do
  }
}

// mixins
let store = _.extend(Store.prototype, Backbone.Events, _Object.prototype, {
  _type: 'Relution.LiveData.Store',
  isModel: false,
  isCollection: false,

  name: 'relution-livedata'
});
diag.debug.assert(() => Store.prototype.isPrototypeOf(Object.create(store)));
