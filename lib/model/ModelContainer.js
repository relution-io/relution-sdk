/*
 * @file model/ModelContainer.ts
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
/**
 * @module model
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var diag_1 = require('../core/diag');
/**
 * implementation details of ArrayLookup.
 */
var ArrayLookupImpl = (function (_super) {
    __extends(ArrayLookupImpl, _super);
    function ArrayLookupImpl() {
        _super.apply(this, arguments);
    }
    /**
     * turns a given array into an ArrayLookup and indexes it by lookup property.
     *
     * <p>
     * This must be used instead of the new operator.
     * </p>
     *
     * @param array data.
     * @param lookup property.
       */
    ArrayLookupImpl.create = function (array, lookup) {
        var self = array;
        Object.defineProperty(array, 'index', {
            value: _.keyBy(array, lookup),
            enumerable: false
        });
        self.has = ArrayLookupImpl.prototype.has;
        self.get = ArrayLookupImpl.prototype.get;
        return self;
    };
    ArrayLookupImpl.prototype.has = function (key) {
        return key in this.index;
    };
    ArrayLookupImpl.prototype.get = function (key) {
        var _this = this;
        diag_1.debug.assert(function () { return _this.has(key); }, key);
        return this.index[key];
    };
    return ArrayLookupImpl;
}(Array));
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
        this.models = ArrayLookupImpl.create(array, 'name');
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
        this.fieldDefinitions = ArrayLookupImpl.create(array, 'name');
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
        this.items = ArrayLookupImpl.create(array, 'value');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWxDb250YWluZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWwvTW9kZWxDb250YWluZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRTVCLHFCQUFvQixjQUFjLENBQUMsQ0FBQTtBQXFDbkM7O0dBRUc7QUFDSDtJQUFpQyxtQ0FBUTtJQUF6QztRQUFpQyw4QkFBUTtJQWdDekMsQ0FBQztJQTdCQzs7Ozs7Ozs7O1NBU0s7SUFDRSxzQkFBTSxHQUFiLFVBQWlCLEtBQVUsRUFBRSxNQUFjO1FBQ3pDLElBQU0sSUFBSSxHQUFRLEtBQUssQ0FBQztRQUN4QixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUU7WUFDcEMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQztZQUM3QixVQUFVLEVBQUUsS0FBSztTQUNsQixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsR0FBRyxHQUFHLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO1FBQ3pDLElBQUksQ0FBQyxHQUFHLEdBQUcsZUFBZSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUM7UUFDekMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFFTSw2QkFBRyxHQUFWLFVBQVcsR0FBVztRQUNwQixNQUFNLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7SUFDM0IsQ0FBQztJQUVNLDZCQUFHLEdBQVYsVUFBVyxHQUFXO1FBQXRCLGlCQUdDO1FBRkMsWUFBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsS0FBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBYixDQUFhLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUNILHNCQUFDO0FBQUQsQ0FBQyxBQWhDRCxDQUFpQyxLQUFLLEdBZ0NyQztBQUVEOztHQUVHO0FBQ0g7SUF3QkUsd0JBQVksS0FBc0I7UUFDaEMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNILENBQUM7SUExQkQsc0JBQVcsbUNBQU87YUFBbEI7WUFDRSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDOzs7T0FBQTtJQTBCTSxpQ0FBUSxHQUFmLFVBQWdCLElBQW9CO1FBQXBDLGlCQTBCQztRQXpCQyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUMxQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFDcEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxJQUFJLEVBQUUsQ0FBQztRQUN4QyxJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1FBRXRELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztRQUNwQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxJQUFJLENBQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksSUFBSSxDQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFFNUUsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBRWpELElBQUksS0FBSyxHQUFnQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUMsU0FBUztZQUMxQixJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3BELEtBQUssQ0FBQyxhQUFhLEdBQUcsS0FBSSxDQUFDLElBQUksQ0FBQztZQUNoQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsTUFBTSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXBELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0gscUJBQUM7QUFBRCxDQUFDLEFBekRELElBeURDO0FBekRZLHNCQUFjLGlCQXlEMUIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUEyQkUsbUJBQVksS0FBaUI7UUFDM0IsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkIsQ0FBQztJQUNILENBQUM7SUE3QkQsc0JBQVcsOEJBQU87YUFBbEI7WUFDRSxNQUFNLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxDQUFDOzs7T0FBQTtJQTZCTSw0QkFBUSxHQUFmLFVBQWdCLElBQWU7UUFBL0IsaUJBeUJDO1FBeEJDLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUV0QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzFCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQztRQUV0RCxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7UUFFeEMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDO1FBRWxELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7UUFFdEIsSUFBSSxLQUFLLEdBQXNCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdELEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQUMsU0FBUyxJQUFLLE9BQUEsSUFBSSxLQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBM0MsQ0FBMkMsQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU5RCxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0gsZ0JBQUM7QUFBRCxDQUFDLEFBM0RELElBMkRDO0FBM0RZLGlCQUFTLFlBMkRyQixDQUFBO0FBRUQ7O0dBRUc7QUFDSDtJQTJDRSx5QkFBWSxLQUF1QjtRQUNqQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0gsQ0FBQztJQTdDRCxzQkFBVyxvQ0FBTzthQUFsQjtZQUNFLE1BQU0sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLENBQUM7OztPQUFBO0lBc0JELHNCQUFJLCtDQUFrQjthQUF0QjtZQUNFLElBQUksUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7WUFDN0IsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDYiw0QkFBNEI7Z0JBQzVCLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwRCxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM1QiwyQkFBMkI7Z0JBQzNCLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ2xELEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7b0JBQ2IsUUFBUSxHQUFHLFFBQVEsR0FBRyxJQUFJLENBQUM7Z0JBQzdCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sUUFBUSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLENBQUM7Z0JBQzdDLENBQUM7WUFDSCxDQUFDO1lBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUNsQixDQUFDOzs7T0FBQTtJQVFNLGtDQUFRLEdBQWYsVUFBZ0IsSUFBcUI7UUFDbkMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQztRQUNsRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDO1FBRWhELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUM5QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsY0FBYztZQUN2QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUV2RCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLElBQUksS0FBSyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUM7UUFDakMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLEtBQUssQ0FBQztRQUV6QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzVCLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUUxQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRTFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBQ0gsc0JBQUM7QUFBRCxDQUFDLEFBekVELElBeUVDO0FBekVZLHVCQUFlLGtCQXlFM0IsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUFVRSx3QkFBWSxLQUFzQjtRQUNoQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN2QixDQUFDO0lBQ0gsQ0FBQztJQVpELHNCQUFXLG1DQUFPO2FBQWxCO1lBQ0UsTUFBTSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsQ0FBQzs7O09BQUE7SUFZTSxpQ0FBUSxHQUFmLFVBQWdCLElBQW9CO1FBQ2xDLElBQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQVksRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFcEQsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2xDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUM7UUFFbkMsTUFBTSxDQUFDLElBQUksQ0FBQztJQUNkLENBQUM7SUFDSCxxQkFBQztBQUFELENBQUMsQUF6QkQsSUF5QkM7QUF6Qlksc0JBQWMsaUJBeUIxQixDQUFBO0FBNkJEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNIO0lBSUUsc0JBQ1MsY0FBZ0QsRUFDaEQsU0FBc0MsRUFDdEMsZUFBa0QsRUFDbEQsY0FBZ0Q7UUFIaEQsbUJBQWMsR0FBZCxjQUFjLENBQWtDO1FBQ2hELGNBQVMsR0FBVCxTQUFTLENBQTZCO1FBQ3RDLG9CQUFlLEdBQWYsZUFBZSxDQUFtQztRQUNsRCxtQkFBYyxHQUFkLGNBQWMsQ0FBa0M7UUFFdkQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO1FBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztRQUM5QixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0lBQ3JDLENBQUM7SUFFYSxzQkFBUyxHQUF2QixVQUEyQixHQUFNO1FBQy9CLE1BQU0sQ0FBdUIsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFFLENBQUMsT0FBTyxDQUFDO0lBQzFELENBQUM7SUFJTSwrQkFBUSxHQUFmLFVBQWdCLElBQVM7UUFDdkIsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNoRyxDQUFDO0lBdkJhLHFCQUFRLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxFQUFFLFNBQVMsRUFDakUsZUFBZSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBdUJyQyxtQkFBQztBQUFELENBQUMsQUF6QkQsSUF5QkM7QUF6Qlksb0JBQVksZUF5QnhCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbW9kZWwvTW9kZWxDb250YWluZXIudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI1LjAxLjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBtb2RlbFxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQge2RlYnVnfSBmcm9tICcuLi9jb3JlL2RpYWcnO1xuXG4vKipcbiAqIGN1c3RvbSBBcnJheSB0eXBlIHN1cHBvcnRpbmcgYW4gaW5kZXggbG9va3VwLlxuICpcbiAqIEJld2FyZSwgdGhlIGltcGxlbWVudGF0aW9uIGRvZXMgbm90IHN1cHBvcnQgbW9kaWZpY2F0aW9ucyB0byB0aGUgZGF0YSBjb250YWluZWQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQXJyYXlMb29rdXA8VD4gZXh0ZW5kcyBBcnJheTxUPiB7XG4gIC8qKlxuICAgKiBlbGVtZW50cyBrZXllZCBieSBsb29rdXAgcHJvcGVydHkuXG4gICAqL1xuICBpbmRleDogXy5EaWN0aW9uYXJ5PFQ+O1xuXG4gIC8qKlxuICAgKiB3aGV0aGVyIGFuIGVsZW1lbnQgb2Yga2V5IGV4aXN0cy5cbiAgICpcbiAgICogQHBhcmFtIGtleSB0byBjaGVjay5cbiAgICogQHJldHVybiB7Ym9vbGVhbn0gZXhpc3RhbmNlIGluZGljYXRpb24uXG4gICAqXG4gICAqIEBzZWUgZ2V0XG4gICAqL1xuICBoYXMoa2V5OiBzdHJpbmcpOiBib29sZWFuO1xuXG4gIC8qKlxuICAgKiBhY2Nlc3NlcyBhbiBlbGVtZW50IGJ5IGtleS5cbiAgICpcbiAgICogVXNlIHRoaXMgbWV0aG9kIGluIGNhc2UgaXQgaXMga25vd24gdGhhdCB0aGUga2V5IGlzIHZhbGlkLlxuICAgKiBBbiBhc3NlcnRpb24gd2lsbCBmaXJlIGlmIGl0IGlzIG5vdC5cbiAgICpcbiAgICogQHBhcmFtIGtleSBsb29rdXAgcHJvcGVydHkgdmFsdWUuXG4gICAqIEByZXR1cm4ge1R9IGVsZW1lbnQgb2Yga2V5LlxuICAgKlxuICAgKiBAc2VlIGhhc1xuICAgKi9cbiAgZ2V0KGtleTogc3RyaW5nKTogVDtcbn1cblxuLyoqXG4gKiBpbXBsZW1lbnRhdGlvbiBkZXRhaWxzIG9mIEFycmF5TG9va3VwLlxuICovXG5jbGFzcyBBcnJheUxvb2t1cEltcGw8VD4gZXh0ZW5kcyBBcnJheTxUPiBpbXBsZW1lbnRzIEFycmF5TG9va3VwPFQ+IHtcbiAgcHVibGljIGluZGV4OiBfLkRpY3Rpb25hcnk8VD47XG5cbiAgLyoqXG4gICAqIHR1cm5zIGEgZ2l2ZW4gYXJyYXkgaW50byBhbiBBcnJheUxvb2t1cCBhbmQgaW5kZXhlcyBpdCBieSBsb29rdXAgcHJvcGVydHkuXG4gICAqXG4gICAqIDxwPlxuICAgKiBUaGlzIG11c3QgYmUgdXNlZCBpbnN0ZWFkIG9mIHRoZSBuZXcgb3BlcmF0b3IuXG4gICAqIDwvcD5cbiAgICpcbiAgICogQHBhcmFtIGFycmF5IGRhdGEuXG4gICAqIEBwYXJhbSBsb29rdXAgcHJvcGVydHkuXG4gICAgICovXG4gIHN0YXRpYyBjcmVhdGU8VD4oYXJyYXk6IFRbXSwgbG9va3VwOiBzdHJpbmcpOiBBcnJheUxvb2t1cDxUPiB7XG4gICAgY29uc3Qgc2VsZjogYW55ID0gYXJyYXk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGFycmF5LCAnaW5kZXgnLCB7XG4gICAgICB2YWx1ZTogXy5rZXlCeShhcnJheSwgbG9va3VwKSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgfSk7XG4gICAgc2VsZi5oYXMgPSBBcnJheUxvb2t1cEltcGwucHJvdG90eXBlLmhhcztcbiAgICBzZWxmLmdldCA9IEFycmF5TG9va3VwSW1wbC5wcm90b3R5cGUuZ2V0O1xuICAgIHJldHVybiBzZWxmO1xuICB9XG5cbiAgcHVibGljIGhhcyhrZXk6IHN0cmluZykge1xuICAgIHJldHVybiBrZXkgaW4gdGhpcy5pbmRleDtcbiAgfVxuXG4gIHB1YmxpYyBnZXQoa2V5OiBzdHJpbmcpIHtcbiAgICBkZWJ1Zy5hc3NlcnQoKCkgPT4gdGhpcy5oYXMoa2V5KSwga2V5KTtcbiAgICByZXR1cm4gdGhpcy5pbmRleFtrZXldO1xuICB9XG59XG5cbi8qKlxuICogbWlycm9ycyBNb2RlbENvbnRhaW5lciBvZiBSZWx1dGlvbiBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBNb2RlbENvbnRhaW5lciB7XG4gIHB1YmxpYyBzdGF0aWMgZmFjdG9yeTogTW9kZWxGYWN0b3J5O1xuICBwdWJsaWMgZ2V0IGZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIE1vZGVsRmFjdG9yeS5mYWN0b3J5T2YodGhpcyk7XG4gIH1cblxuICB1dWlkOiBzdHJpbmc7XG5cbiAgdmVyc2lvbjogbnVtYmVyO1xuICBidW5kbGU6IHN0cmluZztcbiAgYXBwbGljYXRpb246IHN0cmluZztcbiAgYWNsRW50cmllczogc3RyaW5nW107XG4gIGVmZmVjdGl2ZVBlcm1pc3Npb25zOiBzdHJpbmc7XG5cbiAgY3JlYXRlZFVzZXI6IHN0cmluZztcbiAgY3JlYXRlZERhdGU6IERhdGU7XG4gIG1vZGlmaWVkVXNlcjogc3RyaW5nO1xuICBtb2RpZmllZERhdGU6IERhdGU7XG5cbiAgbmFtZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuXG4gIG1vZGVsczogQXJyYXlMb29rdXA8TWV0YU1vZGVsPjtcblxuICBjb25zdHJ1Y3RvcihvdGhlcj86IE1vZGVsQ29udGFpbmVyKSB7XG4gICAgaWYgKG90aGVyKSB7XG4gICAgICB0aGlzLmZyb21KU09OKG90aGVyKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZnJvbUpTT04oanNvbjogTW9kZWxDb250YWluZXIpIHtcbiAgICB0aGlzLnV1aWQgPSBqc29uLnV1aWQ7XG5cbiAgICB0aGlzLnZlcnNpb24gPSBqc29uLnZlcnNpb247XG4gICAgdGhpcy5idW5kbGUgPSBqc29uLmJ1bmRsZTtcbiAgICB0aGlzLmFwcGxpY2F0aW9uID0ganNvbi5hcHBsaWNhdGlvbjtcbiAgICB0aGlzLmFjbEVudHJpZXMgPSBqc29uLmFjbEVudHJpZXMgfHwgW107XG4gICAgdGhpcy5lZmZlY3RpdmVQZXJtaXNzaW9ucyA9IGpzb24uZWZmZWN0aXZlUGVybWlzc2lvbnM7XG5cbiAgICB0aGlzLmNyZWF0ZWRVc2VyID0ganNvbi5jcmVhdGVkVXNlcjtcbiAgICB0aGlzLmNyZWF0ZWREYXRlID0ganNvbi5jcmVhdGVkRGF0ZSAmJiBuZXcgRGF0ZSg8YW55Pihqc29uLmNyZWF0ZWREYXRlKSk7XG4gICAgdGhpcy5tb2RpZmllZFVzZXIgPSBqc29uLm1vZGlmaWVkVXNlcjtcbiAgICB0aGlzLm1vZGlmaWVkRGF0ZSA9IGpzb24ubW9kaWZpZWREYXRlICYmIG5ldyBEYXRlKDxhbnk+KGpzb24ubW9kaWZpZWREYXRlKSk7XG5cbiAgICB0aGlzLm5hbWUgPSBqc29uLm5hbWU7XG4gICAgdGhpcy5kZXNjcmlwdGlvbiA9IGpzb24uZGVzY3JpcHRpb24gfHwgdGhpcy5uYW1lO1xuXG4gICAgdmFyIGFycmF5ID0gPE1ldGFNb2RlbFtdPihfLnZhbHVlcyhqc29uLm1vZGVscykgfHwgW10pO1xuICAgIGFycmF5ID0gYXJyYXkubWFwKChqc29uTW9kZWwpID0+IHtcbiAgICAgIGNvbnN0IG1vZGVsID0gbmV3IHRoaXMuZmFjdG9yeS5NZXRhTW9kZWwoanNvbk1vZGVsKTtcbiAgICAgIG1vZGVsLmNvbnRhaW5lclV1aWQgPSB0aGlzLnV1aWQ7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfSk7XG4gICAgdGhpcy5tb2RlbHMgPSBBcnJheUxvb2t1cEltcGwuY3JlYXRlKGFycmF5LCAnbmFtZScpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuLyoqXG4gKiBtaXJyb3JzIE1ldGFNb2RlbCBvZiBSZWx1dGlvbiBzZXJ2ZXIuXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXRhTW9kZWwge1xuICBwdWJsaWMgc3RhdGljIGZhY3Rvcnk6IE1vZGVsRmFjdG9yeTtcbiAgcHVibGljIGdldCBmYWN0b3J5KCkge1xuICAgIHJldHVybiBNb2RlbEZhY3RvcnkuZmFjdG9yeU9mKHRoaXMpO1xuICB9XG5cbiAgdXVpZDogc3RyaW5nO1xuXG4gIHZlcnNpb246IG51bWJlcjtcbiAgYnVuZGxlOiBzdHJpbmc7XG4gIGFjbEVudHJpZXM6IHN0cmluZ1tdO1xuICBlZmZlY3RpdmVQZXJtaXNzaW9uczogc3RyaW5nO1xuXG4gIGNvbnRhaW5lclV1aWQ6IHN0cmluZztcblxuICBuYW1lOiBzdHJpbmc7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG5cbiAgcGFyZW50czogc3RyaW5nW107XG4gIGFic3RyYWt0OiBib29sZWFuO1xuICBpY29uOiBhbnk7XG5cbiAgZmllbGREZWZpbml0aW9uczogQXJyYXlMb29rdXA8RmllbGREZWZpbml0aW9uPjtcblxuICBwcm9wZXJ0eU1hcDogYW55O1xuXG4gIGNvbnN0cnVjdG9yKG90aGVyPzogTWV0YU1vZGVsKSB7XG4gICAgaWYgKG90aGVyKSB7XG4gICAgICB0aGlzLmZyb21KU09OKG90aGVyKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZnJvbUpTT04oanNvbjogTWV0YU1vZGVsKSB7XG4gICAgdGhpcy51dWlkID0ganNvbi51dWlkO1xuXG4gICAgdGhpcy52ZXJzaW9uID0ganNvbi52ZXJzaW9uO1xuICAgIHRoaXMuYnVuZGxlID0ganNvbi5idW5kbGU7XG4gICAgdGhpcy5hY2xFbnRyaWVzID0ganNvbi5hY2xFbnRyaWVzIHx8IFtdO1xuICAgIHRoaXMuZWZmZWN0aXZlUGVybWlzc2lvbnMgPSBqc29uLmVmZmVjdGl2ZVBlcm1pc3Npb25zO1xuXG4gICAgdGhpcy5jb250YWluZXJVdWlkID0ganNvbi5jb250YWluZXJVdWlkO1xuXG4gICAgdGhpcy5uYW1lID0ganNvbi5uYW1lO1xuICAgIHRoaXMubGFiZWwgPSBqc29uLmxhYmVsIHx8IHRoaXMubmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0ganNvbi5kZXNjcmlwdGlvbiB8fCB0aGlzLmxhYmVsO1xuXG4gICAgdGhpcy5wYXJlbnRzID0ganNvbi5wYXJlbnRzIHx8IFtdO1xuICAgIHRoaXMuYWJzdHJha3QgPSBqc29uLmFic3RyYWt0IHx8IGZhbHNlO1xuICAgIHRoaXMuaWNvbiA9IGpzb24uaWNvbjtcblxuICAgIHZhciBhcnJheSA9IDxGaWVsZERlZmluaXRpb25bXT4oanNvbi5maWVsZERlZmluaXRpb25zIHx8IFtdKTtcbiAgICBhcnJheSA9IGFycmF5Lm1hcCgoanNvbkZpZWxkKSA9PiBuZXcgdGhpcy5mYWN0b3J5LkZpZWxkRGVmaW5pdGlvbihqc29uRmllbGQpKTtcbiAgICB0aGlzLmZpZWxkRGVmaW5pdGlvbnMgPSBBcnJheUxvb2t1cEltcGwuY3JlYXRlKGFycmF5LCAnbmFtZScpO1xuXG4gICAgdGhpcy5wcm9wZXJ0eU1hcCA9IGpzb24ucHJvcGVydHlNYXAgfHwge307XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKipcbiAqIG1pcnJvcnMgRmllbGREZWZpbml0aW9uIG9mIFJlbHV0aW9uIHNlcnZlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEZpZWxkRGVmaW5pdGlvbiB7XG4gIHB1YmxpYyBzdGF0aWMgZmFjdG9yeTogTW9kZWxGYWN0b3J5O1xuICBwdWJsaWMgZ2V0IGZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIE1vZGVsRmFjdG9yeS5mYWN0b3J5T2YodGhpcyk7XG4gIH1cblxuICBuYW1lOiBzdHJpbmc7XG4gIGxhYmVsOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG4gIGdyb3VwOiBzdHJpbmc7XG4gIHRvb2x0aXA6IHN0cmluZztcblxuICBkYXRhVHlwZTogc3RyaW5nO1xuICBkZWZhdWx0VmFsdWU6IHN0cmluZztcbiAgZW51bURlZmluaXRpb246IEVudW1EZWZpbml0aW9uO1xuXG4gIGtleUZpZWxkOiBib29sZWFuO1xuICBpbmRleDogYm9vbGVhbjtcbiAgbWFuZGF0b3J5OiBib29sZWFuO1xuXG4gIG1pblNpemU6IG51bWJlcjtcbiAgbWF4U2l6ZTogbnVtYmVyO1xuICByZWdleHA6IHN0cmluZztcblxuICBwcm9wZXJ0eU1hcDogYW55O1xuXG4gIGdldCBkYXRhVHlwZU5vcm1hbGl6ZWQoKTogc3RyaW5nIHtcbiAgICB2YXIgZGF0YVR5cGUgPSB0aGlzLmRhdGFUeXBlO1xuICAgIGlmIChkYXRhVHlwZSkge1xuICAgICAgLy8gbm9ybWFsaXplcyByYXcgamF2YSB0eXBlc1xuICAgICAgZGF0YVR5cGUgPSBkYXRhVHlwZS5yZXBsYWNlKC9eXFxbTCguKyk7JC8sICckMVtdJyk7XG4gICAgfSBlbHNlIGlmICh0aGlzLnByb3BlcnR5TWFwKSB7XG4gICAgICAvLyBub3JtYWxpemVzIG5lc3RlZCBtb2RlbHNcbiAgICAgIGRhdGFUeXBlID0gdGhpcy5wcm9wZXJ0eU1hcFsnYXJyYXlPZkNvbXBsZXhUeXBlJ107XG4gICAgICBpZiAoZGF0YVR5cGUpIHtcbiAgICAgICAgZGF0YVR5cGUgPSBkYXRhVHlwZSArICdbXSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBkYXRhVHlwZSA9IHRoaXMucHJvcGVydHlNYXBbJ2NvbXBsZXhUeXBlJ107XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkYXRhVHlwZTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKG90aGVyPzogRmllbGREZWZpbml0aW9uKSB7XG4gICAgaWYgKG90aGVyKSB7XG4gICAgICB0aGlzLmZyb21KU09OKG90aGVyKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgZnJvbUpTT04oanNvbjogRmllbGREZWZpbml0aW9uKSB7XG4gICAgdGhpcy5uYW1lID0ganNvbi5uYW1lIHx8ICcnO1xuICAgIHRoaXMubGFiZWwgPSBqc29uLmxhYmVsIHx8IHRoaXMubmFtZTtcbiAgICB0aGlzLmRlc2NyaXB0aW9uID0ganNvbi5kZXNjcmlwdGlvbiB8fCB0aGlzLmxhYmVsO1xuICAgIHRoaXMuZ3JvdXAgPSBqc29uLmdyb3VwIHx8IG51bGw7XG4gICAgdGhpcy50b29sdGlwID0ganNvbi50b29sdGlwIHx8IHRoaXMuZGVzY3JpcHRpb247XG5cbiAgICB0aGlzLmRhdGFUeXBlID0ganNvbi5kYXRhVHlwZTtcbiAgICB0aGlzLmRlZmF1bHRWYWx1ZSA9IGpzb24uZGVmYXVsdFZhbHVlO1xuICAgIHRoaXMuZW51bURlZmluaXRpb24gPSBqc29uLmVudW1EZWZpbml0aW9uICYmXG4gICAgICBuZXcgdGhpcy5mYWN0b3J5LkVudW1EZWZpbml0aW9uKGpzb24uZW51bURlZmluaXRpb24pO1xuXG4gICAgdGhpcy5rZXlGaWVsZCA9IGpzb24ua2V5RmllbGQgfHwgZmFsc2U7XG4gICAgdGhpcy5pbmRleCA9IGpzb24uaW5kZXggfHwgZmFsc2U7XG4gICAgdGhpcy5tYW5kYXRvcnkgPSBqc29uLm1hbmRhdG9yeSB8fCBmYWxzZTtcblxuICAgIHRoaXMubWluU2l6ZSA9IGpzb24ubWluU2l6ZTtcbiAgICB0aGlzLm1heFNpemUgPSBqc29uLm1heFNpemU7XG4gICAgdGhpcy5yZWdleHAgPSBqc29uLnJlZ2V4cDtcblxuICAgIHRoaXMucHJvcGVydHlNYXAgPSBqc29uLnByb3BlcnR5TWFwIHx8IHt9O1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cbn1cblxuLyoqXG4gKiBtaXJyb3JzIEVudW1EZWZpbml0aW9uIG9mIFJlbHV0aW9uIHNlcnZlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEVudW1EZWZpbml0aW9uIHtcbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBNb2RlbEZhY3Rvcnk7XG4gIHB1YmxpYyBnZXQgZmFjdG9yeSgpIHtcbiAgICByZXR1cm4gTW9kZWxGYWN0b3J5LmZhY3RvcnlPZih0aGlzKTtcbiAgfVxuXG4gIGl0ZW1zOiBBcnJheUxvb2t1cDxJdGVtPjtcbiAgZW51bWVyYWJsZTogc3RyaW5nO1xuICBzdHJpY3Q6IGJvb2xlYW47XG5cbiAgY29uc3RydWN0b3Iob3RoZXI/OiBFbnVtRGVmaW5pdGlvbikge1xuICAgIGlmIChvdGhlcikge1xuICAgICAgdGhpcy5mcm9tSlNPTihvdGhlcik7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGZyb21KU09OKGpzb246IEVudW1EZWZpbml0aW9uKSB7XG4gICAgY29uc3QgYXJyYXkgPSBqc29uLml0ZW1zIHx8IDxJdGVtW10+W107XG4gICAgdGhpcy5pdGVtcyA9IEFycmF5TG9va3VwSW1wbC5jcmVhdGUoYXJyYXksICd2YWx1ZScpO1xuXG4gICAgdGhpcy5lbnVtZXJhYmxlID0ganNvbi5lbnVtZXJhYmxlO1xuICAgIHRoaXMuc3RyaWN0ID0ganNvbi5zdHJpY3QgfHwgZmFsc2U7XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxufVxuXG4vKipcbiAqIHJlcHJlc2VudHMgYSBwcmVkZWZpbmVkIGNob2ljZSBvZiBhbiBFbnVtRGVmaW5pdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBJdGVtIHtcbiAgdmFsdWU6IG51bWJlciB8IHN0cmluZztcbiAgbGFiZWw6IHN0cmluZztcblxuICB1cmw/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogY29uc3RydWN0b3JzIG9mIG1vZGVsIHR5cGVzIG11c3QgYWRoZXJlIHRoZSBmb2xsb3dpbmcgaW50ZXJmYWNlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVsRmFjdG9yeUN0b3I8VD4ge1xuICAvKipcbiAgICogbmV3LWFibGUgZnJvbSBKU09OIGxpdGVyYWwgZGF0YS5cbiAgICpcbiAgICogQHBhcmFtIGpzb24gbGl0ZXJhbCBkYXRhLlxuICAgKi9cbiAgbmV3KG90aGVyPzogVCk6IFQ7XG5cbiAgLyoqXG4gICAqIHN0YXRpYyBhc3NvY2lhdGlvbiB0byBmYWN0b3J5LlxuICAgKi9cbiAgZmFjdG9yeTogTW9kZWxGYWN0b3J5O1xufVxuXG4vKipcbiAqIGNvbnN0cnVjdGlvbiBmcm9tIEpTT04gbGl0ZXJhbCBkYXRhLlxuICpcbiAqIEBleGFtcGxlIFVzZSB0aGUgZm9sbG93aW5nIGZvciBjcmVhdGlvbiBvZiBhIHN1YmNsYXNzZXMgaGllcmFyY2h5OlxuICogIGV4cG9ydCBjbGFzcyBTb21lTW9kZWxDb250YWluZXIgZXh0ZW5kcyBNb2RlbENvbnRhaW5lciB7XG4gKiAgICBwdWJsaWMgc3RhdGljIGZhY3Rvcnk6IFNvbWVNb2RlbEZhY3Rvcnk7XG4gKiAgfVxuICogIGV4cG9ydCBjbGFzcyBTb21lTWV0YU1vZGVsIGV4dGVuZHMgTWV0YU1vZGVsIHtcbiAqICAgIHB1YmxpYyBzdGF0aWMgZmFjdG9yeTogU29tZU1vZGVsRmFjdG9yeTtcbiAqICB9XG4gKiAgZXhwb3J0IGNsYXNzIFNvbWVGaWVsZERlZmluaXRpb24gZXh0ZW5kcyBGaWVsZERlZmluaXRpb24ge1xuICogICAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBTb21lTW9kZWxGYWN0b3J5O1xuICogIH1cbiAqICBleHBvcnQgY2xhc3MgU29tZUVudW1EZWZpbml0aW9uIGV4dGVuZHMgRW51bURlZmluaXRpb24ge1xuICogICAgcHVibGljIHN0YXRpYyBmYWN0b3J5OiBTb21lTW9kZWxGYWN0b3J5O1xuICogIH1cbiAqICBleHBvcnQgY2xhc3MgU29tZU1vZGVsRmFjdG9yeSBleHRlbmRzIE1vZGVsRmFjdG9yeSB7XG4gKiAgICBwdWJsaWMgc3RhdGljIGluc3RhbmNlID0gbmV3IFNvbWVNb2RlbEZhY3RvcnkoU29tZU1vZGVsQ29udGFpbmVyLCBTb21lTWV0YU1vZGVsLFxuICogICAgICBTb21lRmllbGREZWZpbml0aW9uLCBTb21lRW51bURlZmluaXRpb24pO1xuICogIH1cbiAqL1xuZXhwb3J0IGNsYXNzIE1vZGVsRmFjdG9yeSB7XG4gIHB1YmxpYyBzdGF0aWMgaW5zdGFuY2UgPSBuZXcgTW9kZWxGYWN0b3J5KE1vZGVsQ29udGFpbmVyLCBNZXRhTW9kZWwsXG4gICAgRmllbGREZWZpbml0aW9uLCBFbnVtRGVmaW5pdGlvbik7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIE1vZGVsQ29udGFpbmVyOiBNb2RlbEZhY3RvcnlDdG9yPE1vZGVsQ29udGFpbmVyPixcbiAgICBwdWJsaWMgTWV0YU1vZGVsOiBNb2RlbEZhY3RvcnlDdG9yPE1ldGFNb2RlbD4sXG4gICAgcHVibGljIEZpZWxkRGVmaW5pdGlvbjogTW9kZWxGYWN0b3J5Q3RvcjxGaWVsZERlZmluaXRpb24+LFxuICAgIHB1YmxpYyBFbnVtRGVmaW5pdGlvbjogTW9kZWxGYWN0b3J5Q3RvcjxFbnVtRGVmaW5pdGlvbj5cbiAgKSB7XG4gICAgdGhpcy5Nb2RlbENvbnRhaW5lci5mYWN0b3J5ID0gdGhpcztcbiAgICB0aGlzLk1ldGFNb2RlbC5mYWN0b3J5ID0gdGhpcztcbiAgICB0aGlzLkZpZWxkRGVmaW5pdGlvbi5mYWN0b3J5ID0gdGhpcztcbiAgICB0aGlzLkVudW1EZWZpbml0aW9uLmZhY3RvcnkgPSB0aGlzO1xuICB9XG5cbiAgcHVibGljIHN0YXRpYyBmYWN0b3J5T2Y8VD4ob2JqOiBUKTogTW9kZWxGYWN0b3J5IHtcbiAgICByZXR1cm4gKDxNb2RlbEZhY3RvcnlDdG9yPFQ+PihvYmouY29uc3RydWN0b3IpKS5mYWN0b3J5O1xuICB9XG5cbiAgcHVibGljIGZyb21KU09OKGpzb246IHN0cmluZyk6IE1vZGVsQ29udGFpbmVyO1xuICBwdWJsaWMgZnJvbUpTT04oanNvbjogYW55KTogTW9kZWxDb250YWluZXI7XG4gIHB1YmxpYyBmcm9tSlNPTihqc29uOiBhbnkpOiBNb2RlbENvbnRhaW5lciB7XG4gICAgcmV0dXJuIG5ldyB0aGlzLk1vZGVsQ29udGFpbmVyKCkuZnJvbUpTT04odHlwZW9mIGpzb24gPT09ICdzdHJpbmcnID8gSlNPTi5wYXJzZShqc29uKSA6IGpzb24pO1xuICB9XG59XG4iXX0=