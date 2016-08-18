/**
 * @module model
 */
/** */
import { ModelFactory, ModelContainer, MetaModel, FieldDefinition, EnumDefinition } from './ModelContainer';
export declare class TypeScriptModelContainer extends ModelContainer {
    static factory: TypeScriptModelFactory;
}
export declare class TypeScriptMetaModel extends MetaModel {
    static factory: TypeScriptModelFactory;
    modelContainer: TypeScriptModelContainer;
}
export declare class TypeScriptFieldDefinition extends FieldDefinition {
    static factory: TypeScriptModelFactory;
    /**
     * @see https://www.typescriptlang.org/docs/handbook/basic-types.html
     */
    static typeMapping: {
        'java.util.Map': string;
        'java.lang.String': string;
        'java.lang.String[]': string;
        'java.lang.Character': string;
        'java.lang.Character[]': string;
        'java.lang.Byte': string;
        'java.lang.Byte[]': string;
        'java.lang.Short': string;
        'java.lang.Short[]': string;
        'java.lang.Integer': string;
        'java.lang.Integer[]': string;
        'java.lang.Long': string;
        'java.lang.Long[]': string;
        'java.math.BigInteger': string;
        'java.math.BigInteger[]': string;
        'java.math.BigDecimal': string;
        'java.math.BigDecimal[]': string;
        'java.lang.Double': string;
        'java.lang.Double[]': string;
        'java.lang.Float': string;
        'java.lang.Float[]': string;
        'java.lang.Boolean': string;
        'java.lang.Boolean[]': string;
        'com.mwaysolutions.gofer2.file.domain.File': string;
        'com.mwaysolutions.gofer2.file.domain.File[]': string;
        'java.util.Date': string;
        'java.util.Date[]': string;
        'java.lang.Object': string;
        'java.lang.Object[]': string;
        '[B': string;
    };
    model: TypeScriptMetaModel;
    dataTypeTS: string;
}
export declare class TypeScriptEnumDefinition extends EnumDefinition {
    static factory: TypeScriptModelFactory;
}
export declare class TypeScriptModelFactory extends ModelFactory {
    static instance: TypeScriptModelFactory;
}
