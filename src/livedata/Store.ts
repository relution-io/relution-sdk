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

import {Model, ModelCtor, ModelCtorT, ModelProps, isModel} from './Model';
import {Collection, CollectionCtor, CollectionCtorT, CollectionProps, isCollection} from './Collection';

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

  /**
   * stores Model and Collection constructors by entity name.
   * 
   * @see Store#makeModel
   * @see Store#makeCollection
   */
  private implementations: _.Dictionary<{
    /**
     * subclassed Model constructor.
     * 
     * @see Store#extendModel
     */
    modelCtor: any,

    /**
     * subclassed Collection constructor.
     * 
     * @see Store#extendCollection
     */
    collectionCtor?: any
  }> = {
    // initially empty
  };

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

  /**
   * factory method creating new Model instance bound to this Store.
   * 
   * @param  modelType to instantiate.
   * @param  attributes of new instance.
   * @param  options at creation time.
   * @return new Model instance.
   * 
   * @see Store#createCollection
   */
  public createModel<ModelType extends Model, AttributesType, OptionsType>(modelType: ModelCtorT<ModelType, AttributesType, OptionsType>, attributes?: AttributesType, options?: OptionsType): ModelType {
    return new (this.extendModel(modelType))(attributes, options);
  }

  /**
   * factory method creating new Collection instance bound to this Store.
   * 
   * @param  collectionType to instantiate.
   * @param  models of new instance.
   * @param  options at creation time.
   * @return new Collection instance.
   * 
   * @see Store#createModel
   */
  public createCollection<CollectionType extends Collection, ModelType extends Model, OptionsType>(collectionType: CollectionCtorT<CollectionType, ModelType, OptionsType>, models?: ModelType[] | Object[], options?: any): CollectionType {
    return new (this.extendCollection(collectionType))(models, options);
  }

  /**
   * additional initialization of Model instance.
   * 
   * @see Store#initCollection
   *
   * @internal API only to be called by Model constructor.
   */
  initModel(model: Model, options?: any): void {
    // may be overwritten
  }

  /**
   * additional initialization of Collection instance.
   * 
   * @see Store#initModel
   * 
   * @internal API only to be called by Collection constructor.
   */
  initCollection(collection: Collection, options?: any): void {
    // may be overwritten
  }

  /**
   * subclasses a Model type such that it is linked to this Store.
   * 
   * @param modelType to subclass.
   * @return subclassed Model implementation.
   * 
   * @see Store#createModel
   * @see Store#defaultsModel
   * @see Store#extendCollection
   * 
   * @internal API only to be called by Store#createModel.
   */
  private extendModel<ModelType extends Model, AttributesType, OptionsType>(modelType: ModelCtorT<ModelType, AttributesType, OptionsType>): ModelCtorT<ModelType, AttributesType, OptionsType> {
    diag.debug.assert(() => isModel(modelType.prototype));
    const entity = modelType.prototype.entity;
    let implementation = this.implementations[entity];
    if (implementation && implementation.modelCtor && implementation.modelCtor.prototype.__proto__.constructor === modelType) {
      diag.debug.assert(implementation.modelCtor.prototype.store === this);
    } else {
      if (implementation && implementation.modelCtor) {
        diag.debug.warn('redefinition of model ' + entity + ' might not work as expected as existing collections remain bound to previous model type!');
      }
      // collectionType is reset so that newly created collections get bound to new model implementation
      this.implementations[entity] = implementation = {
        modelCtor: modelType['extend'](this.defaultsModel(modelType))
      };
    }
    diag.debug.assert(() => isModel(implementation.modelCtor.prototype));
    return implementation.modelCtor;
  }

  /**
   * subclasses a Collection type such that it is linked to this Store.
   * 
   * @param collectionType to subclass.
   * @return subclassed Collection implementation.
   * 
   * @see Store#createCollection
   * @see Store#defaultsCollection
   * @see Store#extendModel
   * 
   * @internal API only to be called by Store#createCollection.
   */
  private extendCollection<CollectionType extends Collection, ModelType extends Model, OptionsType>(collectionType: CollectionCtorT<CollectionType, ModelType, OptionsType>): CollectionCtorT<CollectionType, ModelType, OptionsType> {
    diag.debug.assert(() => isCollection(collectionType.prototype));
    const modelType = this.extendModel(collectionType.prototype.model);
    const entity = modelType.prototype.entity;
    let implementation = this.implementations[entity];
    diag.debug.assert(implementation && implementation.modelCtor === modelType);
    if (implementation.collectionCtor && implementation.collectionCtor.prototype.__proto__.constructor === collectionType) {
      diag.debug.assert(implementation.collectionCtor.prototype.store === this);
    } else {
      if (implementation && implementation.collectionCtor) {
        diag.debug.warn('redefinition of collection ' + entity + ' might not work as expected as existing collections might exist!');
      }
      implementation.collectionCtor = collectionType['extend'](this.defaultsCollection(collectionType, modelType));
    }
    diag.debug.assert(() => isCollection(implementation.collectionCtor.prototype));
    return implementation.collectionCtor;
  }

  /**
   * defines prototype properties used for a given Model type.
   * 
   * @param modelType being subclassed.
   * @return prototype properties of Model.
   * 
   * @see Store#defaultsCollection
   */
  protected defaultsModel<ModelType extends Model, AttributesType, OptionsType>(modelType: ModelCtorT<ModelType, AttributesType, OptionsType>): ModelProps {
    // may be overwritten
    return {
      urlRoot: this.resolveUrl(<string>_.result(modelType.prototype, 'urlRoot')),
      store: this
    };
  };

  /**
   * defines prototype properties used for a given Collection type.
   * 
   * @param collectionType being subclassed.
   * @param modelType that was subclassed already, do not apply Store#extendModel on it!
   * @return prototype properties of Collection.
   * 
   * @see Store#defaultsModel
   */
  protected defaultsCollection<CollectionType extends Collection, ModelType extends Model, OptionsType, AttributesType, ModelOptionsType>(collectionType: CollectionCtorT<CollectionType, ModelType, OptionsType>, modelType: ModelCtorT<ModelType, AttributesType, ModelOptionsType>): CollectionProps {
    // may be overwritten
    return {
      model: modelType,
      url: modelType.prototype.urlRoot,
      store: this
    };
  }

  /**
   * may be overwritten to resolve relative URLs against the actual server.
   * 
   * @param url to resolve.
   * @return resolved url.
   */
  protected resolveUrl(url: string) {
    // may be overwritten
    return url;
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
