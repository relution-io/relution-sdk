/*
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
/**
 * @module livedata
 */
/** */

import * as Backbone from 'backbone';
import * as _ from 'lodash';
import * as Q from 'q';
import * as diag from '../core/diag';

import {Model} from './Model';
import {Collection} from './Collection';
import {CollectionCtor} from "./Collection";

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
 * tests whether a given object is a Store.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Store.
 */
export function isStore(object: any): object is Store {
  if (!object || typeof object !== 'object') {
    return false;
  } else if ('isStore' in object) {
    diag.debug.assert(() => object.isStore === Store.prototype.isPrototypeOf(object));
    return object.isStore;
  } else {
    return Store.prototype.isPrototypeOf(object);
  }
}

/**
 * base class to build a custom data store.
 */
export class Store {

  public _type: string;         // constant 'Relution.livedata.Store' on prototype
  public isModel: boolean;      // constant false on prototype
  public isCollection: boolean; // constant false on prototype
  public isStore: boolean;      // constant true on prototype

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

  public close() {
    // nothing to do
  }

  initModel(model: Model, options?: any): void {
    // may be overwritten
  }

  initCollection(collection: Collection, options?: any): void {
    // may be overwritten
  }

  sync(method: string, model: Model | Collection, options?: any): Q.Promise<any> {
    // must be overwritten
    return Q.reject(new Error('not implemented!')); // purely abstract
  }

  fetch(collection: Model, options: Backbone.ModelFetchOptions): Q.Promise<any>;
  fetch(collection: Collection, options: Backbone.CollectionFetchOptions): Q.Promise<any>;
  /**
   *
   * @param collection usually a collection, but can also be a model
   * @param options
   */
  fetch(collection: Model | Collection, options: Backbone.ModelFetchOptions | Backbone.CollectionFetchOptions) {
    var opts = _.extend({}, options || {}, { store: this });
    return (<any>collection).fetch(opts);
  }

  create(collection: CollectionCtor, models: Model[], options?: any) {
    var opts = _.extend({}, options || {}, { store: this });
    return new collection(models, opts);
  }

  save(model: Model, attributes?: any, options?: Backbone.ModelSaveOptions) {
    var opts = _.extend({}, options || {}, { store: this });
    return model.save(attributes, opts);
  }

  destroy(model: Model, options?: Backbone.ModelDestroyOptions) {
    var opts = _.extend({}, options || {}, { store: this });
    model.destroy(opts);
  }

  protected trigger: typeof Backbone.Events.prototype.trigger;

  protected handleSuccess(options: {
    success?: Function
  }, result: any): any {
    if (options.success) {
      return options.success.call(this, result);
    }
  }

  protected handleError(options: {
    error?: Function
  }, error: Error): any {
    if (options.error) {
      return options.error.call(this, error);
    }
  }
}

// mixins
let store = _.extend(Store.prototype, Backbone.Events, {
  _type: 'Relution.livedata.Store',
  isModel: false,
  isCollection: false,
  isStore: true,

  name: 'relution-livedata'
});
diag.debug.assert(() => Store.prototype.isPrototypeOf(Object.create(store)));
