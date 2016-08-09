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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var ModelContainer_1 = require('./ModelContainer');
var TypeScriptModelContainer = (function (_super) {
    __extends(TypeScriptModelContainer, _super);
    function TypeScriptModelContainer() {
        _super.apply(this, arguments);
    }
    return TypeScriptModelContainer;
}(ModelContainer_1.ModelContainer));
exports.TypeScriptModelContainer = TypeScriptModelContainer;
var TypeScriptMetaModel = (function (_super) {
    __extends(TypeScriptMetaModel, _super);
    function TypeScriptMetaModel() {
        _super.apply(this, arguments);
    }
    return TypeScriptMetaModel;
}(ModelContainer_1.MetaModel));
exports.TypeScriptMetaModel = TypeScriptMetaModel;
var TypeScriptFieldDefinition = (function (_super) {
    __extends(TypeScriptFieldDefinition, _super);
    function TypeScriptFieldDefinition() {
        _super.apply(this, arguments);
    }
    Object.defineProperty(TypeScriptFieldDefinition.prototype, "dataTypeTS", {
        get: function () {
            var type = this.dataTypeNormalized;
            return TypeScriptFieldDefinition.typeMapping[type] || type;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * @see https://www.typescriptlang.org/docs/handbook/basic-types.html
     */
    TypeScriptFieldDefinition.typeMapping = {
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
    return TypeScriptFieldDefinition;
}(ModelContainer_1.FieldDefinition));
exports.TypeScriptFieldDefinition = TypeScriptFieldDefinition;
var TypeScriptEnumDefinition = (function (_super) {
    __extends(TypeScriptEnumDefinition, _super);
    function TypeScriptEnumDefinition() {
        _super.apply(this, arguments);
    }
    return TypeScriptEnumDefinition;
}(ModelContainer_1.EnumDefinition));
exports.TypeScriptEnumDefinition = TypeScriptEnumDefinition;
var TypeScriptModelFactory = (function (_super) {
    __extends(TypeScriptModelFactory, _super);
    function TypeScriptModelFactory() {
        _super.apply(this, arguments);
    }
    TypeScriptModelFactory.instance = new TypeScriptModelFactory(TypeScriptModelContainer, TypeScriptMetaModel, TypeScriptFieldDefinition, TypeScriptEnumDefinition);
    return TypeScriptModelFactory;
}(ModelContainer_1.ModelFactory));
exports.TypeScriptModelFactory = TypeScriptModelFactory;
//# sourceMappingURL=TypeScriptModelContainer.js.map