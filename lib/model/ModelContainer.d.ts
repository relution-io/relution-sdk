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
/**
 * custom Array type supporting an index lookup.
 *
 * Beware, the implementation does not support modifications to the data contained.
 */
export interface ArrayLookup<T> extends Array<T> {
    /**
     * elements keyed by lookup property.
     */
    index: _.Dictionary<T>;
    /**
     * whether an element of key exists.
     *
     * @param key to check.
     * @return {boolean} existance indication.
     *
     * @see get
     */
    has(key: string): boolean;
    /**
     * accesses an element by key.
     *
     * Use this method in case it is known that the key is valid.
     * An assertion will fire if it is not.
     *
     * @param key lookup property value.
     * @return {T} element of key.
     *
     * @see has
     */
    get(key: string): T;
}
/**
 * mirrors ModelContainer of Relution server.
 */
export declare class ModelContainer {
    static factory: ModelFactory;
    factory: ModelFactory;
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
    constructor(other?: ModelContainer);
    fromJSON(json: ModelContainer): this;
}
/**
 * mirrors MetaModel of Relution server.
 */
export declare class MetaModel {
    static factory: ModelFactory;
    factory: ModelFactory;
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
    constructor(other?: MetaModel);
    fromJSON(json: MetaModel): this;
}
/**
 * mirrors FieldDefinition of Relution server.
 */
export declare class FieldDefinition {
    static factory: ModelFactory;
    factory: ModelFactory;
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
    dataTypeNormalized: string;
    constructor(other?: FieldDefinition);
    fromJSON(json: FieldDefinition): this;
}
/**
 * mirrors EnumDefinition of Relution server.
 */
export declare class EnumDefinition {
    static factory: ModelFactory;
    factory: ModelFactory;
    items: ArrayLookup<Item>;
    enumerable: string;
    strict: boolean;
    constructor(other?: EnumDefinition);
    fromJSON(json: EnumDefinition): this;
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
    new (other?: T): T;
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
export declare class ModelFactory {
    ModelContainer: ModelFactoryCtor<ModelContainer>;
    MetaModel: ModelFactoryCtor<MetaModel>;
    FieldDefinition: ModelFactoryCtor<FieldDefinition>;
    EnumDefinition: ModelFactoryCtor<EnumDefinition>;
    static instance: ModelFactory;
    constructor(ModelContainer: ModelFactoryCtor<ModelContainer>, MetaModel: ModelFactoryCtor<MetaModel>, FieldDefinition: ModelFactoryCtor<FieldDefinition>, EnumDefinition: ModelFactoryCtor<EnumDefinition>);
    static factoryOf<T>(obj: T): ModelFactory;
    fromJSON(json: string): ModelContainer;
    fromJSON(json: any): ModelContainer;
}
