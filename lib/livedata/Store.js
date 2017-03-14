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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLFFBQVEsV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUNyQyxJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUM1QixJQUFZLENBQUMsV0FBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUVyQyxzQkFBZ0UsU0FBUyxDQUFDLENBQUE7QUFDMUUsMkJBQXlGLGNBQWMsQ0FBQyxDQUFBO0FBWXhHOzs7OztHQUtHO0FBQ0gsaUJBQXdCLE1BQVc7SUFDakMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLElBQUksT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsTUFBTSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBeEQsQ0FBd0QsQ0FBQyxDQUFDO1FBQ2xGLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0lBQ3hCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUMvQyxDQUFDO0FBQ0gsQ0FBQztBQVRlLGVBQU8sVUFTdEIsQ0FBQTtBQUVEOztHQUVHO0FBQ0g7SUFxQ0UsZUFBWSxPQUFhO1FBM0J6Qjs7Ozs7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QU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN6QyxDQUFDO0lBQ0gsQ0FBQztJQUNILFlBQUM7QUFBRCxDQUFDLEFBN1BELElBNlBDO0FBN1BZLGFBQUssUUE2UGpCLENBQUE7QUFFRCxTQUFTO0FBQ1QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUU7SUFDckQsS0FBSyxFQUFFLHlCQUF5QjtJQUNoQyxPQUFPLEVBQUUsS0FBSztJQUNkLFlBQVksRUFBRSxLQUFLO0lBQ25CLE9BQU8sRUFBRSxJQUFJO0lBRWIsSUFBSSxFQUFFLG1CQUFtQjtDQUMxQixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFuRCxDQUFtRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3RvcmUudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgQmFja2JvbmUgZnJvbSAnYmFja2JvbmUnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcblxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yLCBNb2RlbEN0b3JULCBNb2RlbFByb3BzLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbiwgQ29sbGVjdGlvbkN0b3IsIENvbGxlY3Rpb25DdG9yVCwgQ29sbGVjdGlvblByb3BzLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5cbi8qKlxuICogY29uc3RydWN0b3IgZnVuY3Rpb24gb2YgU3RvcmUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3RvcmVDdG9yIHtcbiAgLyoqXG4gICAqIEBzZWUgU3RvcmUjY29uc3RydWN0b3JcbiAgICovXG4gIG5ldyhvcHRpb25zPzogYW55KTogU3RvcmU7XG59XG5cbi8qKlxuICogdGVzdHMgd2hldGhlciBhIGdpdmVuIG9iamVjdCBpcyBhIFN0b3JlLlxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmplY3QgdG8gY2hlY2suXG4gKiBAcmV0dXJuIHtib29sZWFufSB3aGV0aGVyIG9iamVjdCBpcyBhIFN0b3JlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNTdG9yZShvYmplY3Q6IGFueSk6IG9iamVjdCBpcyBTdG9yZSB7XG4gIGlmICghb2JqZWN0IHx8IHR5cGVvZiBvYmplY3QgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9IGVsc2UgaWYgKCdpc1N0b3JlJyBpbiBvYmplY3QpIHtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBvYmplY3QuaXNTdG9yZSA9PT0gU3RvcmUucHJvdG90eXBlLmlzUHJvdG90eXBlT2Yob2JqZWN0KSk7XG4gICAgcmV0dXJuIG9iamVjdC5pc1N0b3JlO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihvYmplY3QpO1xuICB9XG59XG5cbi8qKlxuICogYmFzZSBjbGFzcyB0byBidWlsZCBhIGN1c3RvbSBkYXRhIHN0b3JlLlxuICovXG5leHBvcnQgY2xhc3MgU3RvcmUge1xuXG4gIHB1YmxpYyBfdHlwZTogc3RyaW5nOyAgICAgICAgIC8vIGNvbnN0YW50ICdSZWx1dGlvbi5saXZlZGF0YS5TdG9yZScgb24gcHJvdG90eXBlXG4gIHB1YmxpYyBpc01vZGVsOiBib29sZWFuOyAgICAgIC8vIGNvbnN0YW50IGZhbHNlIG9uIHByb3RvdHlwZVxuICBwdWJsaWMgaXNDb2xsZWN0aW9uOiBib29sZWFuOyAvLyBjb25zdGFudCBmYWxzZSBvbiBwcm90b3R5cGVcbiAgcHVibGljIGlzU3RvcmU6IGJvb2xlYW47ICAgICAgLy8gY29uc3RhbnQgdHJ1ZSBvbiBwcm90b3R5cGVcblxuICAvLyBmb2xsb3dpbmcgYXJlIHN0b3JlLXNwZWNpZmljIG9wdGlvbnMsIGRlZmF1bHRzIHN0b3JlZCBpbiBwcm90b3R5cGUgYXQgZW5kIG9mIHRoaXMgZmlsZVxuICBwcm90ZWN0ZWQgbmFtZTogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBzdG9yZXMgTW9kZWwgYW5kIENvbGxlY3Rpb24gY29uc3RydWN0b3JzIGJ5IGVudGl0eSBuYW1lLlxuICAgKiBcbiAgICogQHNlZSBTdG9yZSNtYWtlTW9kZWxcbiAgICogQHNlZSBTdG9yZSNtYWtlQ29sbGVjdGlvblxuICAgKi9cbiAgcHJpdmF0ZSBpbXBsZW1lbnRhdGlvbnM6IF8uRGljdGlvbmFyeTx7XG4gICAgLyoqXG4gICAgICogc3ViY2xhc3NlZCBNb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICAgKiBcbiAgICAgKiBAc2VlIFN0b3JlI2V4dGVuZE1vZGVsXG4gICAgICovXG4gICAgbW9kZWxDdG9yOiBhbnksXG5cbiAgICAvKipcbiAgICAgKiBzdWJjbGFzc2VkIENvbGxlY3Rpb24gY29uc3RydWN0b3IuXG4gICAgICogXG4gICAgICogQHNlZSBTdG9yZSNleHRlbmRDb2xsZWN0aW9uXG4gICAgICovXG4gICAgY29sbGVjdGlvbkN0b3I/OiBhbnlcbiAgfT4gPSB7XG4gICAgLy8gaW5pdGlhbGx5IGVtcHR5XG4gIH07XG5cbiAgcHJvdGVjdGVkIGVudGl0aWVzOiBhbnk7XG4gIHB1YmxpYyBlbmRwb2ludHM6IGFueTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XG4gICAgaWYgKG9wdGlvbnMpIHtcbiAgICAgIC8vIGNvcHkgb3B0aW9ucyB2YWx1ZXMgaW50byB0aGUgb2JqZWN0XG4gICAgICBfLmV4dGVuZCh0aGlzLCBvcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgY2xvc2UoKSB7XG4gICAgLy8gbm90aGluZyB0byBkb1xuICB9XG5cbiAgLyoqXG4gICAqIGZhY3RvcnkgbWV0aG9kIGNyZWF0aW5nIG5ldyBNb2RlbCBpbnN0YW5jZSBib3VuZCB0byB0aGlzIFN0b3JlLlxuICAgKiBcbiAgICogQHBhcmFtICBtb2RlbFR5cGUgdG8gaW5zdGFudGlhdGUuXG4gICAqIEBwYXJhbSAgYXR0cmlidXRlcyBvZiBuZXcgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSAgb3B0aW9ucyBhdCBjcmVhdGlvbiB0aW1lLlxuICAgKiBAcmV0dXJuIG5ldyBNb2RlbCBpbnN0YW5jZS5cbiAgICogXG4gICAqIEBzZWUgU3RvcmUjY3JlYXRlQ29sbGVjdGlvblxuICAgKi9cbiAgcHVibGljIGNyZWF0ZU1vZGVsPE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+KG1vZGVsVHlwZTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4sIGF0dHJpYnV0ZXM/OiBBdHRyaWJ1dGVzVHlwZSwgb3B0aW9ucz86IE9wdGlvbnNUeXBlKTogTW9kZWxUeXBlIHtcbiAgICByZXR1cm4gbmV3ICh0aGlzLmV4dGVuZE1vZGVsKG1vZGVsVHlwZSkpKGF0dHJpYnV0ZXMsIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIGZhY3RvcnkgbWV0aG9kIGNyZWF0aW5nIG5ldyBDb2xsZWN0aW9uIGluc3RhbmNlIGJvdW5kIHRvIHRoaXMgU3RvcmUuXG4gICAqIFxuICAgKiBAcGFyYW0gIGNvbGxlY3Rpb25UeXBlIHRvIGluc3RhbnRpYXRlLlxuICAgKiBAcGFyYW0gIG1vZGVscyBvZiBuZXcgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSAgb3B0aW9ucyBhdCBjcmVhdGlvbiB0aW1lLlxuICAgKiBAcmV0dXJuIG5ldyBDb2xsZWN0aW9uIGluc3RhbmNlLlxuICAgKiBcbiAgICogQHNlZSBTdG9yZSNjcmVhdGVNb2RlbFxuICAgKi9cbiAgcHVibGljIGNyZWF0ZUNvbGxlY3Rpb248Q29sbGVjdGlvblR5cGUgZXh0ZW5kcyBDb2xsZWN0aW9uLCBNb2RlbFR5cGUgZXh0ZW5kcyBNb2RlbCwgT3B0aW9uc1R5cGU+KGNvbGxlY3Rpb25UeXBlOiBDb2xsZWN0aW9uQ3RvclQ8Q29sbGVjdGlvblR5cGUsIE1vZGVsVHlwZSwgT3B0aW9uc1R5cGU+LCBtb2RlbHM/OiBNb2RlbFR5cGVbXSB8IE9iamVjdFtdLCBvcHRpb25zPzogYW55KTogQ29sbGVjdGlvblR5cGUge1xuICAgIHJldHVybiBuZXcgKHRoaXMuZXh0ZW5kQ29sbGVjdGlvbihjb2xsZWN0aW9uVHlwZSkpKG1vZGVscywgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogYWRkaXRpb25hbCBpbml0aWFsaXphdGlvbiBvZiBNb2RlbCBpbnN0YW5jZS5cbiAgICogXG4gICAqIEBzZWUgU3RvcmUjaW5pdENvbGxlY3Rpb25cbiAgICpcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBNb2RlbCBjb25zdHJ1Y3Rvci5cbiAgICovXG4gIGluaXRNb2RlbChtb2RlbDogTW9kZWwsIG9wdGlvbnM/OiBhbnkpOiB2b2lkIHtcbiAgICAvLyBtYXkgYmUgb3ZlcndyaXR0ZW5cbiAgfVxuXG4gIC8qKlxuICAgKiBhZGRpdGlvbmFsIGluaXRpYWxpemF0aW9uIG9mIENvbGxlY3Rpb24gaW5zdGFuY2UuXG4gICAqIFxuICAgKiBAc2VlIFN0b3JlI2luaXRNb2RlbFxuICAgKiBcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBDb2xsZWN0aW9uIGNvbnN0cnVjdG9yLlxuICAgKi9cbiAgaW5pdENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IHZvaWQge1xuICAgIC8vIG1heSBiZSBvdmVyd3JpdHRlblxuICB9XG5cbiAgLyoqXG4gICAqIHN1YmNsYXNzZXMgYSBNb2RlbCB0eXBlIHN1Y2ggdGhhdCBpdCBpcyBsaW5rZWQgdG8gdGhpcyBTdG9yZS5cbiAgICogXG4gICAqIEBwYXJhbSBtb2RlbFR5cGUgdG8gc3ViY2xhc3MuXG4gICAqIEByZXR1cm4gc3ViY2xhc3NlZCBNb2RlbCBpbXBsZW1lbnRhdGlvbi5cbiAgICogXG4gICAqIEBzZWUgU3RvcmUjY3JlYXRlTW9kZWxcbiAgICogQHNlZSBTdG9yZSNkZWZhdWx0c01vZGVsXG4gICAqIEBzZWUgU3RvcmUjZXh0ZW5kQ29sbGVjdGlvblxuICAgKiBcbiAgICogQGludGVybmFsIEFQSSBvbmx5IHRvIGJlIGNhbGxlZCBieSBTdG9yZSNjcmVhdGVNb2RlbC5cbiAgICovXG4gIHByaXZhdGUgZXh0ZW5kTW9kZWw8TW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4obW9kZWxUeXBlOiBNb2RlbEN0b3JUPE1vZGVsVHlwZSwgQXR0cmlidXRlc1R5cGUsIE9wdGlvbnNUeXBlPik6IE1vZGVsQ3RvclQ8TW9kZWxUeXBlLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+IHtcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc01vZGVsKG1vZGVsVHlwZS5wcm90b3R5cGUpKTtcbiAgICBjb25zdCBlbnRpdHkgPSBtb2RlbFR5cGUucHJvdG90eXBlLmVudGl0eTtcbiAgICBsZXQgaW1wbGVtZW50YXRpb24gPSB0aGlzLmltcGxlbWVudGF0aW9uc1tlbnRpdHldO1xuICAgIGlmIChpbXBsZW1lbnRhdGlvbiAmJiBpbXBsZW1lbnRhdGlvbi5tb2RlbEN0b3IgJiYgaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yLnByb3RvdHlwZS5fX3Byb3RvX18uY29uc3RydWN0b3IgPT09IG1vZGVsVHlwZSkge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yLnByb3RvdHlwZS5zdG9yZSA9PT0gdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbXBsZW1lbnRhdGlvbiAmJiBpbXBsZW1lbnRhdGlvbi5tb2RlbEN0b3IpIHtcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdyZWRlZmluaXRpb24gb2YgbW9kZWwgJyArIGVudGl0eSArICcgbWlnaHQgbm90IHdvcmsgYXMgZXhwZWN0ZWQgYXMgZXhpc3RpbmcgY29sbGVjdGlvbnMgcmVtYWluIGJvdW5kIHRvIHByZXZpb3VzIG1vZGVsIHR5cGUhJyk7XG4gICAgICB9XG4gICAgICAvLyBjb2xsZWN0aW9uVHlwZSBpcyByZXNldCBzbyB0aGF0IG5ld2x5IGNyZWF0ZWQgY29sbGVjdGlvbnMgZ2V0IGJvdW5kIHRvIG5ldyBtb2RlbCBpbXBsZW1lbnRhdGlvblxuICAgICAgdGhpcy5pbXBsZW1lbnRhdGlvbnNbZW50aXR5XSA9IGltcGxlbWVudGF0aW9uID0ge1xuICAgICAgICBtb2RlbEN0b3I6IG1vZGVsVHlwZVsnZXh0ZW5kJ10odGhpcy5kZWZhdWx0c01vZGVsKG1vZGVsVHlwZSkpXG4gICAgICB9O1xuICAgIH1cbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc01vZGVsKGltcGxlbWVudGF0aW9uLm1vZGVsQ3Rvci5wcm90b3R5cGUpKTtcbiAgICByZXR1cm4gaW1wbGVtZW50YXRpb24ubW9kZWxDdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIHN1YmNsYXNzZXMgYSBDb2xsZWN0aW9uIHR5cGUgc3VjaCB0aGF0IGl0IGlzIGxpbmtlZCB0byB0aGlzIFN0b3JlLlxuICAgKiBcbiAgICogQHBhcmFtIGNvbGxlY3Rpb25UeXBlIHRvIHN1YmNsYXNzLlxuICAgKiBAcmV0dXJuIHN1YmNsYXNzZWQgQ29sbGVjdGlvbiBpbXBsZW1lbnRhdGlvbi5cbiAgICogXG4gICAqIEBzZWUgU3RvcmUjY3JlYXRlQ29sbGVjdGlvblxuICAgKiBAc2VlIFN0b3JlI2RlZmF1bHRzQ29sbGVjdGlvblxuICAgKiBAc2VlIFN0b3JlI2V4dGVuZE1vZGVsXG4gICAqIFxuICAgKiBAaW50ZXJuYWwgQVBJIG9ubHkgdG8gYmUgY2FsbGVkIGJ5IFN0b3JlI2NyZWF0ZUNvbGxlY3Rpb24uXG4gICAqL1xuICBwcml2YXRlIGV4dGVuZENvbGxlY3Rpb248Q29sbGVjdGlvblR5cGUgZXh0ZW5kcyBDb2xsZWN0aW9uLCBNb2RlbFR5cGUgZXh0ZW5kcyBNb2RlbCwgT3B0aW9uc1R5cGU+KGNvbGxlY3Rpb25UeXBlOiBDb2xsZWN0aW9uQ3RvclQ8Q29sbGVjdGlvblR5cGUsIE1vZGVsVHlwZSwgT3B0aW9uc1R5cGU+KTogQ29sbGVjdGlvbkN0b3JUPENvbGxlY3Rpb25UeXBlLCBNb2RlbFR5cGUsIE9wdGlvbnNUeXBlPiB7XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gaXNDb2xsZWN0aW9uKGNvbGxlY3Rpb25UeXBlLnByb3RvdHlwZSkpO1xuICAgIGNvbnN0IG1vZGVsVHlwZSA9IHRoaXMuZXh0ZW5kTW9kZWwoY29sbGVjdGlvblR5cGUucHJvdG90eXBlLm1vZGVsKTtcbiAgICBjb25zdCBlbnRpdHkgPSBtb2RlbFR5cGUucHJvdG90eXBlLmVudGl0eTtcbiAgICBsZXQgaW1wbGVtZW50YXRpb24gPSB0aGlzLmltcGxlbWVudGF0aW9uc1tlbnRpdHldO1xuICAgIGRpYWcuZGVidWcuYXNzZXJ0KGltcGxlbWVudGF0aW9uICYmIGltcGxlbWVudGF0aW9uLm1vZGVsQ3RvciA9PT0gbW9kZWxUeXBlKTtcbiAgICBpZiAoaW1wbGVtZW50YXRpb24uY29sbGVjdGlvbkN0b3IgJiYgaW1wbGVtZW50YXRpb24uY29sbGVjdGlvbkN0b3IucHJvdG90eXBlLl9fcHJvdG9fXy5jb25zdHJ1Y3RvciA9PT0gY29sbGVjdGlvblR5cGUpIHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yLnByb3RvdHlwZS5zdG9yZSA9PT0gdGhpcyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChpbXBsZW1lbnRhdGlvbiAmJiBpbXBsZW1lbnRhdGlvbi5jb2xsZWN0aW9uQ3Rvcikge1xuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3JlZGVmaW5pdGlvbiBvZiBjb2xsZWN0aW9uICcgKyBlbnRpdHkgKyAnIG1pZ2h0IG5vdCB3b3JrIGFzIGV4cGVjdGVkIGFzIGV4aXN0aW5nIGNvbGxlY3Rpb25zIG1pZ2h0IGV4aXN0IScpO1xuICAgICAgfVxuICAgICAgaW1wbGVtZW50YXRpb24uY29sbGVjdGlvbkN0b3IgPSBjb2xsZWN0aW9uVHlwZVsnZXh0ZW5kJ10odGhpcy5kZWZhdWx0c0NvbGxlY3Rpb24oY29sbGVjdGlvblR5cGUsIG1vZGVsVHlwZSkpO1xuICAgIH1cbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBpc0NvbGxlY3Rpb24oaW1wbGVtZW50YXRpb24uY29sbGVjdGlvbkN0b3IucHJvdG90eXBlKSk7XG4gICAgcmV0dXJuIGltcGxlbWVudGF0aW9uLmNvbGxlY3Rpb25DdG9yO1xuICB9XG5cbiAgLyoqXG4gICAqIGRlZmluZXMgcHJvdG90eXBlIHByb3BlcnRpZXMgdXNlZCBmb3IgYSBnaXZlbiBNb2RlbCB0eXBlLlxuICAgKiBcbiAgICogQHBhcmFtIG1vZGVsVHlwZSBiZWluZyBzdWJjbGFzc2VkLlxuICAgKiBAcmV0dXJuIHByb3RvdHlwZSBwcm9wZXJ0aWVzIG9mIE1vZGVsLlxuICAgKiBcbiAgICogQHNlZSBTdG9yZSNkZWZhdWx0c0NvbGxlY3Rpb25cbiAgICovXG4gIHByb3RlY3RlZCBkZWZhdWx0c01vZGVsPE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLCBBdHRyaWJ1dGVzVHlwZSwgT3B0aW9uc1R5cGU+KG1vZGVsVHlwZTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBPcHRpb25zVHlwZT4pOiBNb2RlbFByb3BzIHtcbiAgICAvLyBtYXkgYmUgb3ZlcndyaXR0ZW5cbiAgICByZXR1cm4ge1xuICAgICAgdXJsUm9vdDogdGhpcy5yZXNvbHZlVXJsKDxzdHJpbmc+Xy5yZXN1bHQobW9kZWxUeXBlLnByb3RvdHlwZSwgJ3VybFJvb3QnKSksXG4gICAgICBzdG9yZTogdGhpc1xuICAgIH07XG4gIH07XG5cbiAgLyoqXG4gICAqIGRlZmluZXMgcHJvdG90eXBlIHByb3BlcnRpZXMgdXNlZCBmb3IgYSBnaXZlbiBDb2xsZWN0aW9uIHR5cGUuXG4gICAqIFxuICAgKiBAcGFyYW0gY29sbGVjdGlvblR5cGUgYmVpbmcgc3ViY2xhc3NlZC5cbiAgICogQHBhcmFtIG1vZGVsVHlwZSB0aGF0IHdhcyBzdWJjbGFzc2VkIGFscmVhZHksIGRvIG5vdCBhcHBseSBTdG9yZSNleHRlbmRNb2RlbCBvbiBpdCFcbiAgICogQHJldHVybiBwcm90b3R5cGUgcHJvcGVydGllcyBvZiBDb2xsZWN0aW9uLlxuICAgKiBcbiAgICogQHNlZSBTdG9yZSNkZWZhdWx0c01vZGVsXG4gICAqL1xuICBwcm90ZWN0ZWQgZGVmYXVsdHNDb2xsZWN0aW9uPENvbGxlY3Rpb25UeXBlIGV4dGVuZHMgQ29sbGVjdGlvbiwgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwsIE9wdGlvbnNUeXBlLCBBdHRyaWJ1dGVzVHlwZSwgTW9kZWxPcHRpb25zVHlwZT4oY29sbGVjdGlvblR5cGU6IENvbGxlY3Rpb25DdG9yVDxDb2xsZWN0aW9uVHlwZSwgTW9kZWxUeXBlLCBPcHRpb25zVHlwZT4sIG1vZGVsVHlwZTogTW9kZWxDdG9yVDxNb2RlbFR5cGUsIEF0dHJpYnV0ZXNUeXBlLCBNb2RlbE9wdGlvbnNUeXBlPik6IENvbGxlY3Rpb25Qcm9wcyB7XG4gICAgLy8gbWF5IGJlIG92ZXJ3cml0dGVuXG4gICAgcmV0dXJuIHtcbiAgICAgIG1vZGVsOiBtb2RlbFR5cGUsXG4gICAgICB1cmw6IG1vZGVsVHlwZS5wcm90b3R5cGUudXJsUm9vdCxcbiAgICAgIHN0b3JlOiB0aGlzXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBtYXkgYmUgb3ZlcndyaXR0ZW4gdG8gcmVzb2x2ZSByZWxhdGl2ZSBVUkxzIGFnYWluc3QgdGhlIGFjdHVhbCBzZXJ2ZXIuXG4gICAqIFxuICAgKiBAcGFyYW0gdXJsIHRvIHJlc29sdmUuXG4gICAqIEByZXR1cm4gcmVzb2x2ZWQgdXJsLlxuICAgKi9cbiAgcHJvdGVjdGVkIHJlc29sdmVVcmwodXJsOiBzdHJpbmcpIHtcbiAgICAvLyBtYXkgYmUgb3ZlcndyaXR0ZW5cbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICAvLyBtdXN0IGJlIG92ZXJ3cml0dGVuXG4gICAgcmV0dXJuIFEucmVqZWN0KG5ldyBFcnJvcignbm90IGltcGxlbWVudGVkIScpKTsgLy8gcHVyZWx5IGFic3RyYWN0XG4gIH1cblxuICBmZXRjaChjb2xsZWN0aW9uOiBNb2RlbCwgb3B0aW9uczogQmFja2JvbmUuTW9kZWxGZXRjaE9wdGlvbnMpOiBRLlByb21pc2U8YW55PjtcbiAgZmV0Y2goY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9uczogQmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucyk6IFEuUHJvbWlzZTxhbnk+O1xuICAvKipcbiAgICpcbiAgICogQHBhcmFtIGNvbGxlY3Rpb24gdXN1YWxseSBhIGNvbGxlY3Rpb24sIGJ1dCBjYW4gYWxzbyBiZSBhIG1vZGVsXG4gICAqIEBwYXJhbSBvcHRpb25zXG4gICAqL1xuICBmZXRjaChjb2xsZWN0aW9uOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IEJhY2tib25lLk1vZGVsRmV0Y2hPcHRpb25zIHwgQmFja2JvbmUuQ29sbGVjdGlvbkZldGNoT3B0aW9ucykge1xuICAgIHZhciBvcHRzID0gXy5leHRlbmQoe30sIG9wdGlvbnMgfHwge30sIHsgc3RvcmU6IHRoaXMgfSk7XG4gICAgcmV0dXJuICg8YW55PmNvbGxlY3Rpb24pLmZldGNoKG9wdHMpO1xuICB9XG5cbiAgY3JlYXRlKGNvbGxlY3Rpb246IENvbGxlY3Rpb25DdG9yLCBtb2RlbHM6IE1vZGVsW10sIG9wdGlvbnM/OiBhbnkpIHtcbiAgICB2YXIgb3B0cyA9IF8uZXh0ZW5kKHt9LCBvcHRpb25zIHx8IHt9LCB7IHN0b3JlOiB0aGlzIH0pO1xuICAgIHJldHVybiBuZXcgY29sbGVjdGlvbihtb2RlbHMsIG9wdHMpO1xuICB9XG5cbiAgc2F2ZShtb2RlbDogTW9kZWwsIGF0dHJpYnV0ZXM/OiBhbnksIG9wdGlvbnM/OiBCYWNrYm9uZS5Nb2RlbFNhdmVPcHRpb25zKSB7XG4gICAgdmFyIG9wdHMgPSBfLmV4dGVuZCh7fSwgb3B0aW9ucyB8fCB7fSwgeyBzdG9yZTogdGhpcyB9KTtcbiAgICByZXR1cm4gbW9kZWwuc2F2ZShhdHRyaWJ1dGVzLCBvcHRzKTtcbiAgfVxuXG4gIGRlc3Ryb3kobW9kZWw6IE1vZGVsLCBvcHRpb25zPzogQmFja2JvbmUuTW9kZWxEZXN0cm95T3B0aW9ucykge1xuICAgIHZhciBvcHRzID0gXy5leHRlbmQoe30sIG9wdGlvbnMgfHwge30sIHsgc3RvcmU6IHRoaXMgfSk7XG4gICAgbW9kZWwuZGVzdHJveShvcHRzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCB0cmlnZ2VyOiB0eXBlb2YgQmFja2JvbmUuRXZlbnRzLnByb3RvdHlwZS50cmlnZ2VyO1xuXG4gIHByb3RlY3RlZCBoYW5kbGVTdWNjZXNzKG9wdGlvbnM6IHtcbiAgICBzdWNjZXNzPzogRnVuY3Rpb25cbiAgfSwgcmVzdWx0OiBhbnkpOiBhbnkge1xuICAgIGlmIChvcHRpb25zLnN1Y2Nlc3MpIHtcbiAgICAgIHJldHVybiBvcHRpb25zLnN1Y2Nlc3MuY2FsbCh0aGlzLCByZXN1bHQpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBoYW5kbGVFcnJvcihvcHRpb25zOiB7XG4gICAgZXJyb3I/OiBGdW5jdGlvblxuICB9LCBlcnJvcjogRXJyb3IpOiBhbnkge1xuICAgIGlmIChvcHRpb25zLmVycm9yKSB7XG4gICAgICByZXR1cm4gb3B0aW9ucy5lcnJvci5jYWxsKHRoaXMsIGVycm9yKTtcbiAgICB9XG4gIH1cbn1cblxuLy8gbWl4aW5zXG5sZXQgc3RvcmUgPSBfLmV4dGVuZChTdG9yZS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cywge1xuICBfdHlwZTogJ1JlbHV0aW9uLmxpdmVkYXRhLlN0b3JlJyxcbiAgaXNNb2RlbDogZmFsc2UsXG4gIGlzQ29sbGVjdGlvbjogZmFsc2UsXG4gIGlzU3RvcmU6IHRydWUsXG5cbiAgbmFtZTogJ3JlbHV0aW9uLWxpdmVkYXRhJ1xufSk7XG5kaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBTdG9yZS5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihPYmplY3QuY3JlYXRlKHN0b3JlKSkpO1xuIl19