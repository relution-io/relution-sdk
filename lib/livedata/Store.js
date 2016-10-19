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
"use strict";
var Backbone = require('backbone');
var _ = require('lodash');
var Q = require('q');
var diag = require('../core/diag');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
/**
 * tests whether a given object is a Store.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Store.
 */
function isStore(object) {
    if (!object || typeof object !== 'object') {
        return false;
    }
    else if ('isStore' in object) {
        diag.debug.assert(function () { return object.isStore === Store.prototype.isPrototypeOf(object); });
        return object.isStore;
    }
    else {
        return Store.prototype.isPrototypeOf(object);
    }
}
exports.isStore = isStore;
/**
 * base class to build a custom data store.
 */
var Store = (function () {
    function Store(options) {
        /**
         * stores Model and Collection constructors by entity name.
         *
         * @see Store#makeModel
         * @see Store#makeCollection
         */
        this.implementations = {};
        if (options) {
            // copy options values into the object
            _.extend(this, options);
        }
    }
    Store.prototype.close = function () {
        // nothing to do
    };
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
    Store.prototype.createModel = function (modelType, attributes, options) {
        return new (this.extendModel(modelType))(attributes, options);
    };
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
    Store.prototype.createCollection = function (collectionType, models, options) {
        return new (this.extendCollection(collectionType))(models, options);
    };
    /**
     * additional initialization of Model instance.
     *
     * @see Store#initCollection
     *
     * @internal API only to be called by Model constructor.
     */
    Store.prototype.initModel = function (model, options) {
        // may be overwritten
    };
    /**
     * additional initialization of Collection instance.
     *
     * @see Store#initModel
     *
     * @internal API only to be called by Collection constructor.
     */
    Store.prototype.initCollection = function (collection, options) {
        // may be overwritten
    };
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
    Store.prototype.extendModel = function (modelType) {
        diag.debug.assert(function () { return Model_1.isModel(modelType.prototype); });
        var entity = modelType.prototype.entity;
        var implementation = this.implementations[entity];
        if (implementation && implementation.modelCtor && implementation.modelCtor.prototype.__proto__.constructor === modelType) {
            diag.debug.assert(implementation.modelCtor.prototype.store === this);
        }
        else {
            if (implementation && implementation.modelCtor) {
                diag.debug.warn('redefinition of model ' + entity + ' might not work as expected as existing collections remain bound to previous model type!');
            }
            // collectionType is reset so that newly created collections get bound to new model implementation
            this.implementations[entity] = implementation = {
                modelCtor: modelType['extend'](this.defaultsModel(modelType))
            };
        }
        diag.debug.assert(function () { return Model_1.isModel(implementation.modelCtor.prototype); });
        return implementation.modelCtor;
    };
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
    Store.prototype.extendCollection = function (collectionType) {
        diag.debug.assert(function () { return Collection_1.isCollection(collectionType.prototype); });
        var modelType = this.extendModel(collectionType.prototype.model);
        var entity = modelType.prototype.entity;
        var implementation = this.implementations[entity];
        diag.debug.assert(implementation && implementation.modelCtor === modelType);
        if (implementation.collectionCtor && implementation.collectionCtor.prototype.__proto__.constructor === collectionType) {
            diag.debug.assert(implementation.collectionCtor.prototype.store === this);
        }
        else {
            if (implementation && implementation.collectionCtor) {
                diag.debug.warn('redefinition of collection ' + entity + ' might not work as expected as existing collections might exist!');
            }
            implementation.collectionCtor = collectionType['extend'](this.defaultsCollection(collectionType, modelType));
        }
        diag.debug.assert(function () { return Collection_1.isCollection(implementation.collectionCtor.prototype); });
        return implementation.collectionCtor;
    };
    /**
     * defines prototype properties used for a given Model type.
     *
     * @param modelType being subclassed.
     * @return prototype properties of Model.
     *
     * @see Store#defaultsCollection
     */
    Store.prototype.defaultsModel = function (modelType) {
        // may be overwritten
        return {
            urlRoot: this.resolveUrl(_.result(modelType.prototype, 'urlRoot')),
            store: this
        };
    };
    ;
    /**
     * defines prototype properties used for a given Collection type.
     *
     * @param collectionType being subclassed.
     * @param modelType that was subclassed already, do not apply Store#extendModel on it!
     * @return prototype properties of Collection.
     *
     * @see Store#defaultsModel
     */
    Store.prototype.defaultsCollection = function (collectionType, modelType) {
        // may be overwritten
        return {
            model: modelType,
            url: modelType.prototype.urlRoot,
            store: this
        };
    };
    /**
     * may be overwritten to resolve relative URLs against the actual server.
     *
     * @param url to resolve.
     * @return resolved url.
     */
    Store.prototype.resolveUrl = function (url) {
        // may be overwritten
        return url;
    };
    Store.prototype.sync = function (method, model, options) {
        // must be overwritten
        return Q.reject(new Error('not implemented!')); // purely abstract
    };
    /**
     *
     * @param collection usually a collection, but can also be a model
     * @param options
     */
    Store.prototype.fetch = function (collection, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return collection.fetch(opts);
    };
    Store.prototype.create = function (collection, models, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return new collection(models, opts);
    };
    Store.prototype.save = function (model, attributes, options) {
        var opts = _.extend({}, options || {}, { store: this });
        return model.save(attributes, opts);
    };
    Store.prototype.destroy = function (model, options) {
        var opts = _.extend({}, options || {}, { store: this });
        model.destroy(opts);
    };
    Store.prototype.handleSuccess = function (options, result) {
        if (options.success) {
            return options.success.call(this, result);
        }
    };
    Store.prototype.handleError = function (options, error) {
        if (options.error) {
            return options.error.call(this, error);
        }
    };
    return Store;
}());
exports.Store = Store;
// mixins
var store = _.extend(Store.prototype, Backbone.Events, {
    _type: 'Relution.livedata.Store',
    isModel: false,
    isCollection: false,
    isStore: true,
    name: 'relution-livedata'
});
diag.debug.assert(function () { return Store.prototype.isPrototypeOf(Object.create(store)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLENBQUMsV0FBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUVyQyxzQkFBZ0UsU0FBUyxDQUFDLENBQUE7QUFDMUUsMkJBQXlGLGNBQWMsQ0FBQyxDQUFBO0FBWXhHOzs7OztHQUtHO0FBQ0gsaUJBQXdCLE1BQVc7SUFDakMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsTUFBTSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBeEQsQ0FBd0QsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQyxDQUFDO0FBQ0gsQ0FBQztBQVRlLGVBQU8sVUFTdEIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUFxQ0UsZUFBWSxPQUFhO1FBM0J6Qjs7Ozs7V0FLRztRQUNLLG9CQUFlLEdBY2xCLEVBRUosQ0FBQztRQU1BLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDWixzQ0FBc0M7WUFDdEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUIsQ0FBQztJQUNILENBQUM7SUFFTSxxQkFBSyxHQUFaO1FBQ0UsZ0JBQWdCO0lBQ2xCLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSwyQkFBVyxHQUFsQixVQUF5RSxTQUE2RCxFQUFFLFVBQTJCLEVBQUUsT0FBcUI7UUFDeEwsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2hFLENBQUM7SUFFRDs7Ozs7Ozs7O09BU0c7SUFDSSxnQ0FBZ0IsR0FBdkIsVUFBaUcsY0FBdUUsRUFBRSxNQUErQixFQUFFLE9BQWE7UUFDdE4sTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILHlCQUFTLEdBQVQsVUFBVSxLQUFZLEVBQUUsT0FBYTtRQUNuQyxxQkFBcUI7SUFDdkIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILDhCQUFjLEdBQWQsVUFBZSxVQUFzQixFQUFFLE9BQWE7UUFDbEQscUJBQXFCO0lBQ3ZCLENBQUM7SUFFRDs7Ozs7Ozs7Ozs7T0FXRztJQUNLLDJCQUFXLEdBQW5CLFVBQTBFLFNBQTZEO1FBQ3JJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxlQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUE1QixDQUE0QixDQUFDLENBQUM7UUFDdEQsSUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7UUFDMUMsSUFBSSxjQUFjLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNsRCxFQUFFLENBQUMsQ0FBQyxjQUFjLElBQUksY0FBYyxDQUFDLFNBQVMsSUFBSSxjQUFjLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDekgsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLEVBQUUsQ0FBQyxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsTUFBTSxHQUFHLDBGQUEwRixDQUFDLENBQUM7WUFDbEosQ0FBQztZQUNELGtHQUFrRztZQUNsRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLGNBQWMsR0FBRztnQkFDOUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzlELENBQUM7UUFDSixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLGVBQU8sQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUEzQyxDQUEyQyxDQUFDLENBQUM7UUFDckUsTUFBTSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7SUFDbEMsQ0FBQztJQUVEOzs7Ozs7Ozs7OztPQVdHO0lBQ0ssZ0NBQWdCLEdBQXhCLFVBQWtHLGNBQXVFO1FBQ3ZLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSx5QkFBWSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBdEMsQ0FBc0MsQ0FBQyxDQUFDO1FBQ2hFLElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuRSxJQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztRQUMxQyxJQUFJLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQWMsSUFBSSxjQUFjLENBQUMsU0FBUyxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQzVFLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxjQUFjLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFdBQVcsS0FBSyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RILElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixFQUFFLENBQUMsQ0FBQyxjQUFjLElBQUksY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDZCQUE2QixHQUFHLE1BQU0sR0FBRyxrRUFBa0UsQ0FBQyxDQUFDO1lBQy9ILENBQUM7WUFDRCxjQUFjLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDL0csQ0FBQztRQUNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSx5QkFBWSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQXJELENBQXFELENBQUMsQ0FBQztRQUMvRSxNQUFNLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNPLDZCQUFhLEdBQXZCLFVBQThFLFNBQTZEO1FBQ3pJLHFCQUFxQjtRQUNyQixNQUFNLENBQUM7WUFDTCxPQUFPLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDMUUsS0FBSyxFQUFFLElBQUk7U0FDWixDQUFDO0lBQ0osQ0FBQzs7SUFFRDs7Ozs7Ozs7T0FRRztJQUNPLGtDQUFrQixHQUE1QixVQUF3SSxjQUF1RSxFQUFFLFNBQWtFO1FBQ2pSLHFCQUFxQjtRQUNyQixNQUFNLENBQUM7WUFDTCxLQUFLLEVBQUUsU0FBUztZQUNoQixHQUFHLEVBQUUsU0FBUyxDQUFDLFNBQVMsQ0FBQyxPQUFPO1lBQ2hDLEtBQUssRUFBRSxJQUFJO1NBQ1osQ0FBQztJQUNKLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNPLDBCQUFVLEdBQXBCLFVBQXFCLEdBQVc7UUFDOUIscUJBQXFCO1FBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsb0JBQUksR0FBSixVQUFLLE1BQWMsRUFBRSxLQUF5QixFQUFFLE9BQWE7UUFDM0Qsc0JBQXNCO1FBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtJQUNwRSxDQUFDO0lBSUQ7Ozs7T0FJRztJQUNILHFCQUFLLEdBQUwsVUFBTSxVQUE4QixFQUFFLE9BQXFFO1FBQ3pHLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RCxNQUFNLENBQU8sVUFBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsc0JBQU0sR0FBTixVQUFPLFVBQTBCLEVBQUUsTUFBZSxFQUFFLE9BQWE7UUFDL0QsSUFBSSxJQUFJLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVELG9CQUFJLEdBQUosVUFBSyxLQUFZLEVBQUUsVUFBZ0IsRUFBRSxPQUFtQztRQUN0RSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxPQUFPLElBQUksRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDeEQsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCx1QkFBTyxHQUFQLFVBQVEsS0FBWSxFQUFFLE9BQXNDO1FBQzFELElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN4RCxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFJUyw2QkFBYSxHQUF2QixVQUF3QixPQUV2QixFQUFFLE1BQVc7UUFDWixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNwQixNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLENBQUM7SUFDSCxDQUFDO0lBRVMsMkJBQVcsR0FBckIsVUFBc0IsT0FFckIsRUFBRSxLQUFZO1FBQ2IsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbEIsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0gsQ0FBQztJQUNILFlBQUM7QUFBRCxDQUFDLEFBN1BELElBNlBDO0FBN1BZLGFBQUssUUE2UGpCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUU7SUFDckQsS0FBSyxFQUFFLHlCQUF5QjtJQUNoQyxPQUFPLEVBQUUsS0FBSztJQUNkLFlBQVksRUFBRSxLQUFLO0lBQ25CLE9BQU8sRUFBRSxJQUFJO0lBRWIsSUFBSSxFQUFFLG1CQUFtQjtDQUMxQixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TdG9yZS50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjQuMDYuMjAxNVxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcclxuXHJcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3RvciwgTW9kZWxDdG9yVCwgTW9kZWxQcm9wcywgaXNNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbiwgQ29sbGVjdGlvbkN0b3IsIENvbGxlY3Rpb25DdG9yVCwgQ29sbGVjdGlvblByb3BzLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcblxyXG4vKipcclxuICogY29uc3RydWN0b3IgZnVuY3Rpb24gb2YgU3RvcmUuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFN0b3JlQ3RvciB7XHJcbiAgLyoqXHJcbiAgICogQHNlZSBTdG9yZSNjb25zdHJ1Y3RvclxyXG4gICAqL1xyXG4gIG5ldyhvcHRpb25zPzogYW55KTogU3RvcmU7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiB0ZXN0cyB3aGV0aGVyIGEgZ2l2ZW4gb2JqZWN0IGlzIGEgU3RvcmUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgdG8gY2hlY2suXHJcbiAqIEByZXR1cm4ge2Jvb2xlYW59IHdoZXRoZXIgb2JqZWN0IGlzIGEgU3RvcmUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNTdG9yZShvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBTdG9yZSB7XHJcbiAgaWYgKCFvYmplY3QgfHwgdHlwZW9mIG9iamVjdCAhPT0gJ29iamVjdCcpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9IGVsc2UgaWYgKCdpc1N0b3JlJyBpbiBvYmplY3QpIHtcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IG9iamVjdC5pc1N0b3JlID09PSBTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpKTtcclxuICAgIHJldHVybiBvYmplY3QuaXNTdG9yZTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIFN0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKG9iamVjdCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogYmFzZSBjbGFzcyB0byBidWlsZCBhIGN1c3RvbSBkYXRhIHN0b3JlLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFN0b3JlIHtcclxuXHJcbiAgcHVibGljIF90eXBlOiBzdHJpbmc7ICAgICAgICAgLy8gY29uc3RhbnQgJ1JlbHV0aW9uLmxpdmVkYXRhLlN0b3JlJyBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNNb2RlbDogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNDb2xsZWN0aW9uOiBib29sZWFuOyAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcclxuICBwdWJsaWMgaXNTdG9yZTogYm9vbGVhbjsgICAgICAvLyBjb25zdGFudCB0cnVlIG9uIHByb3RvdHlwZVxyXG5cclxuICAvLyBmb2xsb3dpbmcgYXJlIHN0b3JlLXNwZWNpZmljIG9wdGlvbnMsIGRlZmF1bHRzIHN0b3JlZCBpbiBwcm90b3R5cGUgYXQgZW5kIG9mIHRoaXMgZmlsZVxyXG4gIHByb3RlY3RlZCBuYW1lOiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIHN0b3JlcyBNb2RlbCBhbmQgQ29sbGVjdGlvbiBjb25zdHJ1Y3RvcnMgYnkgZW50aXR5IG5hbWUuXHJcbiAgICogXHJcbiAgICogQHNlZSBTdG9yZSNtYWtlTW9kZWxcclxuICAgKiBAc2VlIFN0b3JlI21ha2VDb2xsZWN0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBpbXBsZW1lbnRhdGlvbnM6IF8uRGljdGlvbmFyeTx7XHJcbiAgICAvKipcclxuICAgICAqIHN1YmNsYXNzZWQgTW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICAgKiBcclxuICAgICAqIEBzZWUgU3RvcmUjZXh0ZW5kTW9kZWxcclxuICAgICAqL1xyXG4gICAgbW9kZWxDdG9yOiBhbnksXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBzdWJjbGFzc2VkIENvbGxlY3Rpb24gY29uc3RydWN0b3IuXHJcbiAgICAgKiBcclxuICAgICAqIEBzZWUgU3RvcmUjZXh0ZW5kQ29sbGVjdGlvblxyXG4gICAgICovXHJcbiAgICBjb2xsZWN0aW9uQ3Rvcj86IGFueVxyXG4gIH0+ID0ge1xyXG4gICAgLy8gaW5pdGlhbGx5IGVtcHR5XHJcbiAgfTtcclxuXHJcbiAgcHJvdGVjdGVkIGVudGl0aWVzOiBhbnk7XHJcbiAgcHVibGljIGVuZHBvaW50czogYW55O1xyXG5cclxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XHJcbiAgICBpZiAob3B0aW9ucykge1xyXG4gICAgICAvLyBjb3B5IG9wdGlvbnMgdmFsdWVzIGludG8gdGhlIG9iamVjdFxyXG4gICAgICBfLmV4dGVuZCh0aGlzLCBvcHRpb25zKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHB1YmxpYyBjbG9zZSgpIHtcclxuICAgIC8vIG5vdGhpbmcgdG8gZG9cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGZhY3RvcnkgbWV0aG9kIGNyZWF0aW5nIG5ldyBNb2RlbCBpbnN0YW5jZSBib3VuZCB0byB0aGlzIFN0b3JlLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSAgbW9kZWxUeXBlIHRvIGluc3RhbnRpYXRlLlxyXG4gICAqIEBwYXJhbSAgYXR0cmlidXRlcyBvZiBuZXcgaW5zdGFuY2UuXHJcbiAgICogQHBhcmFtICBvcHRpb25zIGF0IGNyZWF0aW9uIHRpbWUuXHJcbiAgICogQHJldHVybiBuZXcgTW9kZWwgaW5zdGFuY2UuXHJcbiAgICogXHJcbiAgICogQHNlZSBTdG9yZSNjcmVhdGVDb2xsZWN0aW9uXHJcbiAgICovXHJcbiAgcHVibGljIGNyZWF0ZU1vZGVsPE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+KG1vZGVsVHlwZTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4sIGF0dHJpYnV0ZXM/OiBBdHRyaWJ1dGVzVHlwZSwgb3B0aW9ucz86IE9wdGlvbnNUeXBlKTogTW9kZWxUeXBlIHtcclxuICAgIHJldHVybiBuZXcgKHRoaXMuZXh0ZW5kTW9kZWwobW9kZWxUeXBlKSkoYXR0cmlidXRlcywgb3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBmYWN0b3J5IG1ldGhvZCBjcmVhdGluZyBuZXcgQ29sbGVjdGlvbiBpbnN0YW5jZSBib3VuZCB0byB0aGlzIFN0b3JlLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSAgY29sbGVjdGlvblR5cGUgdG8gaW5zdGFudGlhdGUuXHJcbiAgICogQHBhcmFtICBtb2RlbHMgb2YgbmV3IGluc3RhbmNlLlxyXG4gICAqIEBwYXJhbSAgb3B0aW9ucyBhdCBjcmVhdGlvbiB0aW1lLlxyXG4gICAqIEByZXR1cm4gbmV3IENvbGxlY3Rpb24gaW5zdGFuY2UuXHJcbiAgICogXHJcbiAgICogQHNlZSBTdG9yZSNjcmVhdGVNb2RlbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVDb2xsZWN0aW9uPENvbGxlY3Rpb25UeXBlIGV4dGVuZHMgQ29sbGVjdGlvbiwgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIE9wdGlvbnNUeXBlPihjb2xsZWN0aW9uVHlwZTogQ29sbGVjdGlvbkN0b3JUPENvbGxlY3Rpb25UeXBlLCBNb2RlbFR5cGUsIE9wdGlvbnNUeXBlPiwgbW9kZWxzPzogTW9kZWxUeXBlW10gfCBPYmplY3RbXSwgb3B0aW9ucz86IGFueSk6IENvbGxlY3Rpb25UeXBlIHtcclxuICAgIHJldHVybiBuZXcgKHRoaXMuZXh0ZW5kQ29sbGVjdGlvbihjb2xsZWN0aW9uVHlwZSkpKG1vZGVscywgb3B0aW9ucyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhZGRpdGlvbmFsIGluaXRpYWxpemF0aW9uIG9mIE1vZGVsIGluc3RhbmNlLlxyXG4gICAqIFxyXG4gICAqIEBzZWUgU3RvcmUjaW5pdENvbGxlY3Rpb25cclxuICAgKlxyXG4gICAqIEBpbnRlcm5hbCBBUEkgb25seSB0byBiZSBjYWxsZWQgYnkgTW9kZWwgY29uc3RydWN0b3IuXHJcbiAgICovXHJcbiAgaW5pdE1vZGVsKG1vZGVsOiBNb2RlbCwgb3B0aW9ucz86IGFueSk6IHZvaWQge1xyXG4gICAgLy8gbWF5IGJlIG92ZXJ3cml0dGVuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBhZGRpdGlvbmFsIGluaXRpYWxpemF0aW9uIG9mIENvbGxlY3Rpb24gaW5zdGFuY2UuXHJcbiAgICogXHJcbiAgICogQHNlZSBTdG9yZSNpbml0TW9kZWxcclxuICAgKiBcclxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IENvbGxlY3Rpb24gY29uc3RydWN0b3IuXHJcbiAgICovXHJcbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IHZvaWQge1xyXG4gICAgLy8gbWF5IGJlIG92ZXJ3cml0dGVuXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBzdWJjbGFzc2VzIGEgTW9kZWwgdHlwZSBzdWNoIHRoYXQgaXQgaXMgbGlua2VkIHRvIHRoaXMgU3RvcmUuXHJcbiAgICogXHJcbiAgICogQHBhcmFtIG1vZGVsVHlwZSB0byBzdWJjbGFzcy5cclxuICAgKiBAcmV0dXJuIHN1YmNsYXNzZWQgTW9kZWwgaW1wbGVtZW50YXRpb24uXHJcbiAgICogXHJcbiAgICogQHNlZSBTdG9yZSNjcmVhdGVNb2RlbFxyXG4gICAqIEBzZWUgU3RvcmUjZGVmYXVsdHNNb2RlbFxyXG4gICAqIEBzZWUgU3RvcmUjZXh0ZW5kQ29sbGVjdGlvblxyXG4gICAqIFxyXG4gICAqIEBpbnRlcm5hbCBBUEkgb25seSB0byBiZSBjYWxsZWQgYnkgU3RvcmUjY3JlYXRlTW9kZWwuXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBleHRlbmRNb2RlbDxNb2RlbFR5cGUgZXh0ZW5kcyBNb2RlbCwgQXR0cmlidXRlc1R5cGUsIE9wdGlvbnNUeXBlPihtb2RlbFR5cGU6IE1vZGVsQ3RvclQ8TW9kZWxUeXBlLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+KTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4ge1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNNb2RlbChtb2RlbFR5cGUucHJvdG90eXBlKSk7XHJcbiAgICBjb25zdCBlbnRpdHkgPSBtb2RlbFR5cGUucHJvdG90eXBlLmVudGl0eTtcclxuICAgIGxldCBpbXBsZW1lbnRhdGlvbiA9IHRoaXMuaW1wbGVtZW50YXRpb25zW2VudGl0eV07XHJcbiAgICBpZiAoaW1wbGVtZW50YXRpb24gJiYgaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yICYmIGltcGxlbWVudGF0aW9uLm1vZGVsQ3Rvci5wcm90b3R5cGUuX19wcm90b19fLmNvbnN0cnVjdG9yID09PSBtb2RlbFR5cGUpIHtcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yLnByb3RvdHlwZS5zdG9yZSA9PT0gdGhpcyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoaW1wbGVtZW50YXRpb24gJiYgaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yKSB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdyZWRlZmluaXRpb24gb2YgbW9kZWwgJyArIGVudGl0eSArICcgbWlnaHQgbm90IHdvcmsgYXMgZXhwZWN0ZWQgYXMgZXhpc3RpbmcgY29sbGVjdGlvbnMgcmVtYWluIGJvdW5kIHRvIHByZXZpb3VzIG1vZGVsIHR5cGUhJyk7XHJcbiAgICAgIH1cclxuICAgICAgLy8gY29sbGVjdGlvblR5cGUgaXMgcmVzZXQgc28gdGhhdCBuZXdseSBjcmVhdGVkIGNvbGxlY3Rpb25zIGdldCBib3VuZCB0byBuZXcgbW9kZWwgaW1wbGVtZW50YXRpb25cclxuICAgICAgdGhpcy5pbXBsZW1lbnRhdGlvbnNbZW50aXR5XSA9IGltcGxlbWVudGF0aW9uID0ge1xyXG4gICAgICAgIG1vZGVsQ3RvcjogbW9kZWxUeXBlWydleHRlbmQnXSh0aGlzLmRlZmF1bHRzTW9kZWwobW9kZWxUeXBlKSlcclxuICAgICAgfTtcclxuICAgIH1cclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzTW9kZWwoaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yLnByb3RvdHlwZSkpO1xyXG4gICAgcmV0dXJuIGltcGxlbWVudGF0aW9uLm1vZGVsQ3RvcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIHN1YmNsYXNzZXMgYSBDb2xsZWN0aW9uIHR5cGUgc3VjaCB0aGF0IGl0IGlzIGxpbmtlZCB0byB0aGlzIFN0b3JlLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBjb2xsZWN0aW9uVHlwZSB0byBzdWJjbGFzcy5cclxuICAgKiBAcmV0dXJuIHN1YmNsYXNzZWQgQ29sbGVjdGlvbiBpbXBsZW1lbnRhdGlvbi5cclxuICAgKiBcclxuICAgKiBAc2VlIFN0b3JlI2NyZWF0ZUNvbGxlY3Rpb25cclxuICAgKiBAc2VlIFN0b3JlI2RlZmF1bHRzQ29sbGVjdGlvblxyXG4gICAqIEBzZWUgU3RvcmUjZXh0ZW5kTW9kZWxcclxuICAgKiBcclxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IFN0b3JlI2NyZWF0ZUNvbGxlY3Rpb24uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBleHRlbmRDb2xsZWN0aW9uPENvbGxlY3Rpb25UeXBlIGV4dGVuZHMgQ29sbGVjdGlvbiwgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIE9wdGlvbnNUeXBlPihjb2xsZWN0aW9uVHlwZTogQ29sbGVjdGlvbkN0b3JUPENvbGxlY3Rpb25UeXBlLCBNb2RlbFR5cGUsIE9wdGlvbnNUeXBlPik6IENvbGxlY3Rpb25DdG9yVDxDb2xsZWN0aW9uVHlwZSwgTW9kZWxUeXBlLCBPcHRpb25zVHlwZT4ge1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKGNvbGxlY3Rpb25UeXBlLnByb3RvdHlwZSkpO1xyXG4gICAgY29uc3QgbW9kZWxUeXBlID0gdGhpcy5leHRlbmRNb2RlbChjb2xsZWN0aW9uVHlwZS5wcm90b3R5cGUubW9kZWwpO1xyXG4gICAgY29uc3QgZW50aXR5ID0gbW9kZWxUeXBlLnByb3RvdHlwZS5lbnRpdHk7XHJcbiAgICBsZXQgaW1wbGVtZW50YXRpb24gPSB0aGlzLmltcGxlbWVudGF0aW9uc1tlbnRpdHldO1xyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoaW1wbGVtZW50YXRpb24gJiYgaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yID09PSBtb2RlbFR5cGUpO1xyXG4gICAgaWYgKGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yICYmIGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yLnByb3RvdHlwZS5fX3Byb3RvX18uY29uc3RydWN0b3IgPT09IGNvbGxlY3Rpb25UeXBlKSB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yLnByb3RvdHlwZS5zdG9yZSA9PT0gdGhpcyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoaW1wbGVtZW50YXRpb24gJiYgaW1wbGVtZW50YXRpb24uY29sbGVjdGlvbkN0b3IpIHtcclxuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3JlZGVmaW5pdGlvbiBvZiBjb2xsZWN0aW9uICcgKyBlbnRpdHkgKyAnIG1pZ2h0IG5vdCB3b3JrIGFzIGV4cGVjdGVkIGFzIGV4aXN0aW5nIGNvbGxlY3Rpb25zIG1pZ2h0IGV4aXN0IScpO1xyXG4gICAgICB9XHJcbiAgICAgIGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yID0gY29sbGVjdGlvblR5cGVbJ2V4dGVuZCddKHRoaXMuZGVmYXVsdHNDb2xsZWN0aW9uKGNvbGxlY3Rpb25UeXBlLCBtb2RlbFR5cGUpKTtcclxuICAgIH1cclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IGlzQ29sbGVjdGlvbihpbXBsZW1lbnRhdGlvbi5jb2xsZWN0aW9uQ3Rvci5wcm90b3R5cGUpKTtcclxuICAgIHJldHVybiBpbXBsZW1lbnRhdGlvbi5jb2xsZWN0aW9uQ3RvcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIGRlZmluZXMgcHJvdG90eXBlIHByb3BlcnRpZXMgdXNlZCBmb3IgYSBnaXZlbiBNb2RlbCB0eXBlLlxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBtb2RlbFR5cGUgYmVpbmcgc3ViY2xhc3NlZC5cclxuICAgKiBAcmV0dXJuIHByb3RvdHlwZSBwcm9wZXJ0aWVzIG9mIE1vZGVsLlxyXG4gICAqIFxyXG4gICAqIEBzZWUgU3RvcmUjZGVmYXVsdHNDb2xsZWN0aW9uXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIGRlZmF1bHRzTW9kZWw8TW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4obW9kZWxUeXBlOiBNb2RlbEN0b3JUPE1vZGVsVHlwZSwgQXR0cmlidXRlc1R5cGUsIE9wdGlvbnNUeXBlPik6IE1vZGVsUHJvcHMge1xyXG4gICAgLy8gbWF5IGJlIG92ZXJ3cml0dGVuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1cmxSb290OiB0aGlzLnJlc29sdmVVcmwoPHN0cmluZz5fLnJlc3VsdChtb2RlbFR5cGUucHJvdG90eXBlLCAndXJsUm9vdCcpKSxcclxuICAgICAgc3RvcmU6IHRoaXNcclxuICAgIH07XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogZGVmaW5lcyBwcm90b3R5cGUgcHJvcGVydGllcyB1c2VkIGZvciBhIGdpdmVuIENvbGxlY3Rpb24gdHlwZS5cclxuICAgKiBcclxuICAgKiBAcGFyYW0gY29sbGVjdGlvblR5cGUgYmVpbmcgc3ViY2xhc3NlZC5cclxuICAgKiBAcGFyYW0gbW9kZWxUeXBlIHRoYXQgd2FzIHN1YmNsYXNzZWQgYWxyZWFkeSwgZG8gbm90IGFwcGx5IFN0b3JlI2V4dGVuZE1vZGVsIG9uIGl0IVxyXG4gICAqIEByZXR1cm4gcHJvdG90eXBlIHByb3BlcnRpZXMgb2YgQ29sbGVjdGlvbi5cclxuICAgKiBcclxuICAgKiBAc2VlIFN0b3JlI2RlZmF1bHRzTW9kZWxcclxuICAgKi9cclxuICBwcm90ZWN0ZWQgZGVmYXVsdHNDb2xsZWN0aW9uPENvbGxlY3Rpb25UeXBlIGV4dGVuZHMgQ29sbGVjdGlvbiwgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIE9wdGlvbnNUeXBlLCBBdHRyaWJ1dGVzVHlwZSwgTW9kZWxPcHRpb25zVHlwZT4oY29sbGVjdGlvblR5cGU6IENvbGxlY3Rpb25DdG9yVDxDb2xsZWN0aW9uVHlwZSwgTW9kZWxUeXBlLCBPcHRpb25zVHlwZT4sIG1vZGVsVHlwZTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBNb2RlbE9wdGlvbnNUeXBlPik6IENvbGxlY3Rpb25Qcm9wcyB7XHJcbiAgICAvLyBtYXkgYmUgb3ZlcndyaXR0ZW5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1vZGVsOiBtb2RlbFR5cGUsXHJcbiAgICAgIHVybDogbW9kZWxUeXBlLnByb3RvdHlwZS51cmxSb290LFxyXG4gICAgICBzdG9yZTogdGhpc1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIG1heSBiZSBvdmVyd3JpdHRlbiB0byByZXNvbHZlIHJlbGF0aXZlIFVSTHMgYWdhaW5zdCB0aGUgYWN0dWFsIHNlcnZlci5cclxuICAgKiBcclxuICAgKiBAcGFyYW0gdXJsIHRvIHJlc29sdmUuXHJcbiAgICogQHJldHVybiByZXNvbHZlZCB1cmwuXHJcbiAgICovXHJcbiAgcHJvdGVjdGVkIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpIHtcclxuICAgIC8vIG1heSBiZSBvdmVyd3JpdHRlblxyXG4gICAgcmV0dXJuIHVybDtcclxuICB9XHJcblxyXG4gIHN5bmMobWV0aG9kOiBzdHJpbmcsIG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM/OiBhbnkpOiBRLlByb21pc2U8YW55PiB7XHJcbiAgICAvLyBtdXN0IGJlIG92ZXJ3cml0dGVuXHJcbiAgICByZXR1cm4gUS5yZWplY3QobmV3IEVycm9yKCdub3QgaW1wbGVtZW50ZWQhJykpOyAvLyBwdXJlbHkgYWJzdHJhY3RcclxuICB9XHJcblxyXG4gIGZldGNoKGNvbGxlY3Rpb246IE1vZGVsLCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbEZldGNoT3B0aW9ucyk6IFEuUHJvbWlzZTxhbnk+O1xyXG4gIGZldGNoKGNvbGxlY3Rpb246IENvbGxlY3Rpb24sIG9wdGlvbnM6IEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnMpOiBRLlByb21pc2U8YW55PjtcclxuICAvKipcclxuICAgKlxyXG4gICAqIEBwYXJhbSBjb2xsZWN0aW9uIHVzdWFsbHkgYSBjb2xsZWN0aW9uLCBidXQgY2FuIGFsc28gYmUgYSBtb2RlbFxyXG4gICAqIEBwYXJhbSBvcHRpb25zXHJcbiAgICovXHJcbiAgZmV0Y2goY29sbGVjdGlvbjogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBCYWNrYm9uZS5Nb2RlbEZldGNoT3B0aW9ucyB8IEJhY2tib25lLkNvbGxlY3Rpb25GZXRjaE9wdGlvbnMpIHtcclxuICAgIHZhciBvcHRzID0gXy5leHRlbmQoe30sIG9wdGlvbnMgfHwge30sIHsgc3RvcmU6IHRoaXMgfSk7XHJcbiAgICByZXR1cm4gKDxhbnk+Y29sbGVjdGlvbikuZmV0Y2gob3B0cyk7XHJcbiAgfVxyXG5cclxuICBjcmVhdGUoY29sbGVjdGlvbjogQ29sbGVjdGlvbkN0b3IsIG1vZGVsczogTW9kZWxbXSwgb3B0aW9ucz86IGFueSkge1xyXG4gICAgdmFyIG9wdHMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucyB8fCB7fSwgeyBzdG9yZTogdGhpcyB9KTtcclxuICAgIHJldHVybiBuZXcgY29sbGVjdGlvbihtb2RlbHMsIG9wdHMpO1xyXG4gIH1cclxuXHJcbiAgc2F2ZShtb2RlbDogTW9kZWwsIGF0dHJpYnV0ZXM/OiBhbnksIG9wdGlvbnM/OiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zKSB7XHJcbiAgICB2YXIgb3B0cyA9IF8uZXh0ZW5kKHt9LCBvcHRpb25zIHx8IHt9LCB7IHN0b3JlOiB0aGlzIH0pO1xyXG4gICAgcmV0dXJuIG1vZGVsLnNhdmUoYXR0cmlidXRlcywgb3B0cyk7XHJcbiAgfVxyXG5cclxuICBkZXN0cm95KG1vZGVsOiBNb2RlbCwgb3B0aW9ucz86IEJhY2tib25lLk1vZGVsRGVzdHJveU9wdGlvbnMpIHtcclxuICAgIHZhciBvcHRzID0gXy5leHRlbmQoe30sIG9wdGlvbnMgfHwge30sIHsgc3RvcmU6IHRoaXMgfSk7XHJcbiAgICBtb2RlbC5kZXN0cm95KG9wdHMpO1xyXG4gIH1cclxuXHJcbiAgcHJvdGVjdGVkIHRyaWdnZXI6IHR5cGVvZiBCYWNrYm9uZS5FdmVudHMucHJvdG90eXBlLnRyaWdnZXI7XHJcblxyXG4gIHByb3RlY3RlZCBoYW5kbGVTdWNjZXNzKG9wdGlvbnM6IHtcclxuICAgIHN1Y2Nlc3M/OiBGdW5jdGlvblxyXG4gIH0sIHJlc3VsdDogYW55KTogYW55IHtcclxuICAgIGlmIChvcHRpb25zLnN1Y2Nlc3MpIHtcclxuICAgICAgcmV0dXJuIG9wdGlvbnMuc3VjY2Vzcy5jYWxsKHRoaXMsIHJlc3VsdCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcm90ZWN0ZWQgaGFuZGxlRXJyb3Iob3B0aW9uczoge1xyXG4gICAgZXJyb3I/OiBGdW5jdGlvblxyXG4gIH0sIGVycm9yOiBFcnJvcik6IGFueSB7XHJcbiAgICBpZiAob3B0aW9ucy5lcnJvcikge1xyXG4gICAgICByZXR1cm4gb3B0aW9ucy5lcnJvci5jYWxsKHRoaXMsIGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIG1peGluc1xyXG5sZXQgc3RvcmUgPSBfLmV4dGVuZChTdG9yZS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xyXG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuU3RvcmUnLFxyXG4gIGlzTW9kZWw6IGZhbHNlLFxyXG4gIGlzQ29sbGVjdGlvbjogZmFsc2UsXHJcbiAgaXNTdG9yZTogdHJ1ZSxcclxuXHJcbiAgbmFtZTogJ3JlbHV0aW9uLWxpdmVkYXRhJ1xyXG59KTtcclxuZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gU3RvcmUucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoT2JqZWN0LmNyZWF0ZShzdG9yZSkpKTtcclxuIl19