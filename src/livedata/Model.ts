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

import * as Backbone from 'backbone';
import * as _ from 'lodash';

import * as diag from '../core/diag';

import {Store} from './Store';
import {Collection} from './Collection';
import {SyncEndpoint} from './SyncEndpoint';

import {ajax, sync} from './rest';

/**
 * constructor function of Model.
 */
export interface ModelCtor {
  /**
   * @see Model#constructor
   */
  new(attributes?: any, options?: any): Model;
}

/**
 * tests whether a given object is a Model.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Model.
 */
export function isModel(object: any): object is Model {
  if (!object || typeof object !== 'object') {
    return false;
  } else if ('isModel' in object) {
    diag.debug.assert(() => object.isModel === Model.prototype.isPrototypeOf(object));
    return object.isModel;
  } else {
    return Model.prototype.isPrototypeOf(object);
  }
}

/**
 * extension of a backbone.js Model.
 */
export class Model/*<AttributesType extends Object>*/ extends Backbone.Model {

  public _type: string;         // constant 'Relution.livedata.Model' on prototype
  public isModel: boolean;      // constant true on prototype
  public isCollection: boolean; // constant false on prototype
  public isStore: boolean;      // constant false on prototype

  public entity: string;
  public changedSinceSync = {};

  public collection: Collection;
  public store: Store;
  public credentials: any;

  public endpoint: SyncEndpoint;

  public constructor(attributes?: any, options?: any) {
    super(attributes, options);

    if (this.urlRoot && typeof this.urlRoot === 'string') {
      if (this.urlRoot.charAt(this.urlRoot.length - 1) !== '/') {
        this.urlRoot += '/';
      }
    }

    this.init(attributes, options);
  }

  protected init(attributes?: any, options?: any) {
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
  }

  public ajax(options: any) {
    return ajax.apply(this, arguments);
  }
  public sync(method: string, model: Backbone.ModelBase, options?: any) {
    return sync.apply(this, arguments);
  }

  public onChange(model: Model, options: any) {
    // For each `set` attribute, update or delete the current value.
    var attrs = model.changedAttributes();
    if (_.isObject(attrs)) {
      for (var key in attrs) {
        this.changedSinceSync[key] = attrs[key];
      }
    }
  }

  public onSync(model: Model, options: any) {
    this.changedSinceSync = {};
  }

  public getUrlRoot(): string {
    if (this.urlRoot) {
      return _.isFunction(this.urlRoot) ? this.urlRoot() : this.urlRoot;
    } else if (this.collection) {
      return this.collection.getUrlRoot();
    } else if (this.url) {
      var url = _.isFunction(this.url) ? this.url() : this.url;
      if (url && this.id && url.indexOf(this.id) > 0) {
        return url.substr(0, url.indexOf(this.id));
      }
      return url;
    }
  }

}

// mixins
let model = _.extend(Model.prototype, {
  _type: 'Relution.livedata.Model',
  isModel: true,
  isCollection: false,
  isStore: false
});
diag.debug.assert(() => isModel(Object.create(model)));
