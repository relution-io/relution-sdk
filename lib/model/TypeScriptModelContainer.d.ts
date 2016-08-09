/**
 * model/TypeScriptModelContainer.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 09.08.2016
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
