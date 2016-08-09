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

import {ModelFactory, ModelContainer, MetaModel, FieldDefinition, EnumDefinition} from './ModelContainer';

export class TypeScriptModelContainer extends ModelContainer {
  public static factory: TypeScriptModelFactory;
}

export class TypeScriptMetaModel extends MetaModel {
  public static factory: TypeScriptModelFactory;

  modelContainer: TypeScriptModelContainer;
}

export class TypeScriptFieldDefinition extends FieldDefinition {
  public static factory: TypeScriptModelFactory;

  /**
   * @see https://www.typescriptlang.org/docs/handbook/basic-types.html
   */
  public static typeMapping = {
    'java.util.Map': '{ [key: string]: string; }',
    'java.lang.String': 'string',
    'java.lang.String[]': 'string[]',
    'java.lang.Character': 'string',
    'java.lang.Character[]': 'string[]',
    'java.lang.Byte': 'number',
    'java.lang.Byte[]': 'number[]',
    'java.lang.Short': 'number',
    'java.lang.Short[]': 'number[]',
    'java.lang.Integer': 'number',
    'java.lang.Integer[]': 'number[]',
    'java.lang.Long': 'number',
    'java.lang.Long[]': 'number[]',
    'java.math.BigInteger': 'number',
    'java.math.BigInteger[]': 'number[]',
    'java.math.BigDecimal': 'number',
    'java.math.BigDecimal[]': 'number[]',
    'java.lang.Double': 'number',
    'java.lang.Double[]': 'number[]',
    'java.lang.Float': 'number',
    'java.lang.Float[]': 'number[]',
    'java.lang.Boolean': 'boolean',
    'java.lang.Boolean[]': 'boolean[]',
    'com.mwaysolutions.gofer2.file.domain.File': 'any',
    'com.mwaysolutions.gofer2.file.domain.File[]': 'any[]',
    'java.util.Date': 'date',
    'java.util.Date[]': 'date[]',
    'java.lang.Object': 'any',
    'java.lang.Object[]': 'any',
    '[B': 'any' // Binary Data
  };

  model: TypeScriptMetaModel;

  get dataTypeTS(): string {
    const type = this.dataTypeNormalized;
    return TypeScriptFieldDefinition.typeMapping[type] || type;
  }
}

export class TypeScriptEnumDefinition extends EnumDefinition {
  public static factory: TypeScriptModelFactory;
}

export class TypeScriptModelFactory extends ModelFactory {
  public static instance = new TypeScriptModelFactory(TypeScriptModelContainer, TypeScriptMetaModel, TypeScriptFieldDefinition, TypeScriptEnumDefinition);
}
