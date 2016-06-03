/**
 * model/ModelContainer.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 25.01.2016
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

import {debug} from '../core/diag';

/**
 * custom Array type supporting an index lookup.
 *
 * Beware, the implementation does not support modifications to the data contained.
 */
export class ArrayLookup<T> extends Array<T> {
  /**
   * elements keyed by lookup property.
   */
  public index: _.Dictionary<T>;

  /**
   * shallowly copies a given array and indexes it by lookup property.
   *
   * @param array data.
   * @param lookup property.
     */
  constructor(array: T[], lookup: string) {
    super(...array);
    this.index = _.keyBy(array, lookup, this);
  }

  /**
   * whether an element of key exists.
   *
   * @param key to check.
   * @return {boolean} existance indication.
   *
   * @see get
   */
  public has(key: string) {
    return key in this.index;
  }

  /**
   * accesses an element by key.
   *
   * Use this method in case it is known that the key is valid. An assertion will fire if it is not.
   *
   * @param key lookup property value.
   * @return {T} element of key.
   *
   * @see has
   */
  public get(key: string) {
    debug.assert(() => this.has(key), key);
    return this.index[key];
  }
}

/**
 * mirrors ModelContainer of Relution server.
 */
export class ModelContainer {
  public static factory: ModelFactory;
  public get factory() {
    return ModelFactory.factoryOf(this);
  }

  uuid: string;

  version: number;
  bundle: string;
  application: string;
  aclEntries: string[];
  effectivePermissions: string;

  createdUser: string;
  createdDate: Date;
  modifiedUser: string;
  modifiedDate: Date;

  name: string;
  description: string;

  models: ArrayLookup<MetaModel>;

  constructor(other?: ModelContainer) {
    if (other) {
      this.fromJSON(other);
    }
  }

  public fromJSON(json: ModelContainer) {
    this.uuid = json.uuid;

    this.version = json.version;
    this.bundle = json.bundle;
    this.application = json.application;
    this.aclEntries = json.aclEntries || [];
    this.effectivePermissions = json.effectivePermissions;

    this.createdUser = json.createdUser;
    this.createdDate = json.createdDate && new Date(<any>(json.createdDate));
    this.modifiedUser = json.modifiedUser;
    this.modifiedDate = json.modifiedDate && new Date(<any>(json.modifiedDate));

    this.name = json.name;
    this.description = json.description || this.name;

    var array = <MetaModel[]>(_.values(json.models) || []);
    array = array.map((jsonModel) => {
      const model = new this.factory.MetaModel(jsonModel);
      model.containerUuid = this.uuid;
      return model;
    });
    this.models = new ArrayLookup(array, 'name');

    return this;
  }
}

/**
 * mirrors MetaModel of Relution server.
 */
export class MetaModel {
  public static factory: ModelFactory;
  public get factory() {
    return ModelFactory.factoryOf(this);
  }

  uuid: string;

  version: number;
  bundle: string;
  aclEntries: string[];
  effectivePermissions: string;

  containerUuid: string;

  name: string;
  label: string;
  description: string;

  parents: string[];
  abstrakt: boolean;
  icon: any;

  fieldDefinitions: ArrayLookup<FieldDefinition>;

  propertyMap: any;

  constructor(other?: MetaModel) {
    if (other) {
      this.fromJSON(other);
    }
  }

  public fromJSON(json: MetaModel) {
    this.uuid = json.uuid;

    this.version = json.version;
    this.bundle = json.bundle;
    this.aclEntries = json.aclEntries || [];
    this.effectivePermissions = json.effectivePermissions;

    this.containerUuid = json.containerUuid;

    this.name = json.name;
    this.label = json.label || this.name;
    this.description = json.description || this.label;

    this.parents = json.parents || [];
    this.abstrakt = json.abstrakt || false;
    this.icon = json.icon;

    var array = <FieldDefinition[]>(json.fieldDefinitions || []);
    array = array.map((jsonField) => new this.factory.FieldDefinition(jsonField));
    this.fieldDefinitions = new ArrayLookup(array, 'name');

    this.propertyMap = json.propertyMap || {};

    return this;
  }
}

/**
 * mirrors FieldDefinition of Relution server.
 */
export class FieldDefinition {
  public static factory: ModelFactory;
  public get factory() {
    return ModelFactory.factoryOf(this);
  }

  name: string;
  label: string;
  description: string;
  group: string;
  tooltip: string;

  dataType: string;
  defaultValue: string;
  enumDefinition: EnumDefinition;

  keyField: boolean;
  index: boolean;
  mandatory: boolean;

  minSize: number;
  maxSize: number;
  regexp: string;

  propertyMap: any;

  get dataTypeNormalized(): string {
    var dataType = this.dataType;
    if (dataType) {
      // normalizes raw java types
      dataType = dataType.replace(/^\[L(.+);$/, '$1[]');
    } else if (this.propertyMap) {
      // normalizes nested models
      dataType = this.propertyMap['arrayOfComplexType'];
      if (dataType) {
        dataType = dataType + '[]';
      } else {
        dataType = this.propertyMap['complexType'];
      }
    }
    return dataType;
  }

  constructor(other?: FieldDefinition) {
    if (other) {
      this.fromJSON(other);
    }
  }

  public fromJSON(json: FieldDefinition) {
    this.name = json.name || '';
    this.label = json.label || this.name;
    this.description = json.description || this.label;
    this.group = json.group || null;
    this.tooltip = json.tooltip || this.description;

    this.dataType = json.dataType;
    this.defaultValue = json.defaultValue;
    this.enumDefinition = json.enumDefinition &&
      new this.factory.EnumDefinition(json.enumDefinition);

    this.keyField = json.keyField || false;
    this.index = json.index || false;
    this.mandatory = json.mandatory || false;

    this.minSize = json.minSize;
    this.maxSize = json.maxSize;
    this.regexp = json.regexp;

    this.propertyMap = json.propertyMap || {};

    return this;
  }
}

/**
 * mirrors EnumDefinition of Relution server.
 */
export class EnumDefinition {
  public static factory: ModelFactory;
  public get factory() {
    return ModelFactory.factoryOf(this);
  }

  items: ArrayLookup<Item>;
  enumerable: string;
  strict: boolean;

  constructor(other?: EnumDefinition) {
    if (other) {
      this.fromJSON(other);
    }
  }

  public fromJSON(json: EnumDefinition) {
    const array = json.items || <Item[]>[];
    this.items = new ArrayLookup(array, 'value');

    this.enumerable = json.enumerable;
    this.strict = json.strict || false;

    return this;
  }
}

/**
 * represents a predefined choice of an EnumDefinition.
 */
export interface Item {
  value: number | string;
  label: string;

  url?: string;
}

/**
 * constructors of model types must adhere the following interface.
 */
export interface ModelFactoryCtor<T> {
  /**
   * new-able from JSON literal data.
   *
   * @param json literal data.
   */
  new(other?: T): T;

  /**
   * static association to factory.
   */
  factory: ModelFactory;
}

/**
 * construction from JSON literal data.
 *
 * @example Use the following for creation of a subclasses hierarchy:
 *  export class SomeModelContainer extends ModelContainer {
 *    public static factory: SomeModelFactory;
 *  }
 *  export class SomeMetaModel extends MetaModel {
 *    public static factory: SomeModelFactory;
 *  }
 *  export class SomeFieldDefinition extends FieldDefinition {
 *    public static factory: SomeModelFactory;
 *  }
 *  export class SomeEnumDefinition extends EnumDefinition {
 *    public static factory: SomeModelFactory;
 *  }
 *  export class SomeModelFactory extends ModelFactory {
 *    public static instance = new SomeModelFactory(SomeModelContainer, SomeMetaModel,
 *      SomeFieldDefinition, SomeEnumDefinition);
 *  }
 */
export class ModelFactory {
  public static instance = new ModelFactory(ModelContainer, MetaModel,
    FieldDefinition, EnumDefinition);

  constructor(
    public ModelContainer: ModelFactoryCtor<ModelContainer>,
    public MetaModel: ModelFactoryCtor<MetaModel>,
    public FieldDefinition: ModelFactoryCtor<FieldDefinition>,
    public EnumDefinition: ModelFactoryCtor<EnumDefinition>
  ) {
    this.ModelContainer.factory = this;
    this.MetaModel.factory = this;
    this.FieldDefinition.factory = this;
    this.EnumDefinition.factory = this;
  }

  public static factoryOf<T>(obj: T): ModelFactory {
    return (<ModelFactoryCtor<T>>(obj.constructor)).factory;
  }

  public fromJSON(json: string): ModelContainer;
  public fromJSON(json: any): ModelContainer {
    return new this.ModelContainer().fromJSON(typeof json === 'string' ? JSON.parse(json) : json);
  }
}
