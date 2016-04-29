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
    models: MetaModel[] | {
        [name: string]: MetaModel | number;
        length: number;
    };
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
    fieldDefinitions: FieldDefinition[] | {
        [name: string]: FieldDefinition | number;
        length: number;
    };
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
    items: Items;
    enumerable: string;
    strict: boolean;
    constructor(other?: EnumDefinition);
    fromJSON(json: EnumDefinition): this;
}
/**
 * captures deviation of JSON data regarding internal object and external array representations.
 */
export declare class Items {
    [valueTextual: string]: Item | Function;
    [valueNumeric: number]: Item;
    constructor(other: Items);
    fromJSON(json: Items): this;
    toJSON(): Item[];
}
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
}
