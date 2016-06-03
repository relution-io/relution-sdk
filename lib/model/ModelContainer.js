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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var diag_1 = require('../core/diag');
/**
 * custom Array type supporting an index lookup.
 *
 * Beware, the implementation does not support modifications to the data contained.
 */
var ArrayLookup = (function (_super) {
    __extends(ArrayLookup, _super);
    /**
     * shallowly copies a given array and indexes it by lookup property.
     *
     * @param array data.
     * @param lookup property.
       */
    function ArrayLookup(array, lookup) {
        _super.apply(this, array);
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
    ArrayLookup.prototype.has = function (key) {
        return key in this.index;
    };
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
    ArrayLookup.prototype.get = function (key) {
        var _this = this;
        diag_1.debug.assert(function () { return _this.has(key); }, key);
        return this.index[key];
    };
    return ArrayLookup;
}(Array));
exports.ArrayLookup = ArrayLookup;
/**
 * mirrors ModelContainer of Relution server.
 */
var ModelContainer = (function () {
    function ModelContainer(other) {
        if (other) {
            this.fromJSON(other);
        }
    }
    Object.defineProperty(ModelContainer.prototype, "factory", {
        get: function () {
            return ModelFactory.factoryOf(this);
        },
        enumerable: true,
        configurable: true
    });
    ModelContainer.prototype.fromJSON = function (json) {
        var _this = this;
        this.uuid = json.uuid;
        this.version = json.version;
        this.bundle = json.bundle;
        this.application = json.application;
        this.aclEntries = json.aclEntries || [];
        this.effectivePermissions = json.effectivePermissions;
        this.createdUser = json.createdUser;
        this.createdDate = json.createdDate && new Date((json.createdDate));
        this.modifiedUser = json.modifiedUser;
        this.modifiedDate = json.modifiedDate && new Date((json.modifiedDate));
        this.name = json.name;
        this.description = json.description || this.name;
        var array = (_.values(json.models) || []);
        array = array.map(function (jsonModel) {
            var model = new _this.factory.MetaModel(jsonModel);
            model.containerUuid = _this.uuid;
            return model;
        });
        this.models = new ArrayLookup(array, 'name');
        return this;
    };
    return ModelContainer;
}());
exports.ModelContainer = ModelContainer;
/**
 * mirrors MetaModel of Relution server.
 */
var MetaModel = (function () {
    function MetaModel(other) {
        if (other) {
            this.fromJSON(other);
        }
    }
    Object.defineProperty(MetaModel.prototype, "factory", {
        get: function () {
            return ModelFactory.factoryOf(this);
        },
        enumerable: true,
        configurable: true
    });
    MetaModel.prototype.fromJSON = function (json) {
        var _this = this;
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
        var array = (json.fieldDefinitions || []);
        array = array.map(function (jsonField) { return new _this.factory.FieldDefinition(jsonField); });
        this.fieldDefinitions = new ArrayLookup(array, 'name');
        this.propertyMap = json.propertyMap || {};
        return this;
    };
    return MetaModel;
}());
exports.MetaModel = MetaModel;
/**
 * mirrors FieldDefinition of Relution server.
 */
var FieldDefinition = (function () {
    function FieldDefinition(other) {
        if (other) {
            this.fromJSON(other);
        }
    }
    Object.defineProperty(FieldDefinition.prototype, "factory", {
        get: function () {
            return ModelFactory.factoryOf(this);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FieldDefinition.prototype, "dataTypeNormalized", {
        get: function () {
            var dataType = this.dataType;
            if (dataType) {
                // normalizes raw java types
                dataType = dataType.replace(/^\[L(.+);$/, '$1[]');
            }
            else if (this.propertyMap) {
                // normalizes nested models
                dataType = this.propertyMap['arrayOfComplexType'];
                if (dataType) {
                    dataType = dataType + '[]';
                }
                else {
                    dataType = this.propertyMap['complexType'];
                }
            }
            return dataType;
        },
        enumerable: true,
        configurable: true
    });
    FieldDefinition.prototype.fromJSON = function (json) {
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
    };
    return FieldDefinition;
}());
exports.FieldDefinition = FieldDefinition;
/**
 * mirrors EnumDefinition of Relution server.
 */
var EnumDefinition = (function () {
    function EnumDefinition(other) {
        if (other) {
            this.fromJSON(other);
        }
    }
    Object.defineProperty(EnumDefinition.prototype, "factory", {
        get: function () {
            return ModelFactory.factoryOf(this);
        },
        enumerable: true,
        configurable: true
    });
    EnumDefinition.prototype.fromJSON = function (json) {
        var array = json.items || [];
        this.items = new ArrayLookup(array, 'value');
        this.enumerable = json.enumerable;
        this.strict = json.strict || false;
        return this;
    };
    return EnumDefinition;
}());
exports.EnumDefinition = EnumDefinition;
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
var ModelFactory = (function () {
    function ModelFactory(ModelContainer, MetaModel, FieldDefinition, EnumDefinition) {
        this.ModelContainer = ModelContainer;
        this.MetaModel = MetaModel;
        this.FieldDefinition = FieldDefinition;
        this.EnumDefinition = EnumDefinition;
        this.ModelContainer.factory = this;
        this.MetaModel.factory = this;
        this.FieldDefinition.factory = this;
        this.EnumDefinition.factory = this;
    }
    ModelFactory.factoryOf = function (obj) {
        return (obj.constructor).factory;
    };
    ModelFactory.prototype.fromJSON = function (json) {
        return new this.ModelContainer().fromJSON(typeof json === 'string' ? JSON.parse(json) : json);
    };
    ModelFactory.instance = new ModelFactory(ModelContainer, MetaModel, FieldDefinition, EnumDefinition);
    return ModelFactory;
}());
exports.ModelFactory = ModelFactory;
//# sourceMappingURL=ModelContainer.js.map