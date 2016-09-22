/*
 * @file livedata/SyncContext.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 26.06.2015
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
var _ = require('lodash');
var diag = require('../core/diag');
var GetQuery_1 = require('../query/GetQuery');
var JsonFilterVisitor_1 = require('../query/JsonFilterVisitor');
var SortOrderComparator_1 = require('../query/SortOrderComparator');
/**
 * receives change messages and updates collections.
 */
var SyncContext = (function () {
    /**
     * captures option values forming a GetQuery.
     *
     * @param options to merge.
     * @constructor
     */
    function SyncContext() {
        var _this = this;
        var options = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            options[_i - 0] = arguments[_i];
        }
        /**
         * relevant parameters for paging, filtering and sorting.
         *
         * @type {Relution.livedata.GetQuery}
         */
        this.getQuery = new GetQuery_1.GetQuery();
        // merge options forming a GetQuery
        options.forEach(function (json) {
            if (json) {
                _this.getQuery.merge(new GetQuery_1.GetQuery().fromJSON(json));
            }
        });
        this.getQuery.optimize();
        // compute local members
        this.pageSize = this.getQuery.limit;
        this.compareFn = this.getQuery.sortOrder && SortOrderComparator_1.jsonCompare(this.getQuery.sortOrder);
        this.filterFn = this.getQuery.filter && JsonFilterVisitor_1.jsonFilter(this.getQuery.filter);
    }
    /**
     * reads an additional page of data into the collection.
     *
     * When async processing is done, a more attribute is set on the options object in case additional data might be
     * available which can be loaded by calling this method again. Likewise an end attribute is set if the data is
     * fully loaded.
     *
     * @param {object} collection to load data into.
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchMore()
     */
    SyncContext.prototype.fetchMore = function (collection, options) {
        if (options === void 0) { options = {}; }
        var getQuery = this.getQuery;
        options = _.defaults(options, {
            limit: options.pageSize || this.pageSize || getQuery.limit,
            sortOrder: getQuery.sortOrder,
            filter: getQuery.filter,
            fields: getQuery.fields
        });
        // prepare a query for the next page of data to load
        options.offset = (getQuery.offset | 0) + collection.models.length;
        // this must be set in options to state we handle it
        options.syncContext = this;
        // setup callbacks handling processing of results, do not use promises as these execute too late...
        // Notice, since we call collection.sync() directly, the signature of success/error callbacks here is ajax-style.
        // However, the user-provided callbacks are to being called backbone.js-style with collection and object.
        var oldSuccess = options.success;
        var oldError = options.error;
        options.success = function fetchMoreSuccess(models) {
            // restore callbacks
            options.success = oldSuccess;
            options.error = oldError;
            // update models
            if (models) {
                // add models to collection, if any
                if (models.length <= 0) {
                    // reached the end
                    delete options.more;
                }
                else {
                    // read additional data
                    if (options.syncContext.compareFn) {
                        // notice, existing range of models is sorted by definition already
                        options.at = options.syncContext.insertionPoint(models[0], collection.models);
                    }
                    models = collection.add(models, options) || models;
                    // adjust query parameter
                    getQuery.limit = collection.models.length;
                    if (options.syncContext.getQuery.limit > getQuery.limit) {
                        // reached the end
                        delete options.more;
                    }
                    else {
                        // more data to load
                        options.more = true;
                        delete options.end;
                    }
                }
                // reached the end?
                if (!options.more) {
                    getQuery.limit = undefined; // open end
                    options.end = true;
                }
            }
            // restore query parameter
            options.syncContext.getQuery = getQuery;
            // call user success callback
            if (options.success) {
                models = options.success.call(this, collection, models, options) || models;
            }
            return models;
        };
        options.error = function fetchMoreError(error) {
            // restore callbacks
            options.success = oldSuccess;
            options.error = oldError;
            // restore query parameter
            options.syncContext.getQuery = getQuery;
            // call user error callback
            if (options.error) {
                error = options.error.call(this, collection, error, options) || error;
            }
            return error;
        };
        // fire up the page load
        this.getQuery = new GetQuery_1.GetQuery(getQuery);
        this.getQuery.limit = getQuery.limit + options.limit;
        return collection.sync(options.method || 'read', collection, options);
    };
    /**
     * reads a page of data into the collection.
     *
     * When async processing is done, a next/prev attribute is set on the options object in case additional pages might
     * be available which can be loaded by calling this method again.
     *
     * @param {object} collection to load data into.
     * @param {object} options incl. offset and limit of page to retrieve.
     * @return {Promise} promise of the load operation.
     */
    SyncContext.prototype.fetchRange = function (collection, options) {
        if (options === void 0) { options = {}; }
        // this must be set in options to state we handle it
        options.syncContext = this;
        // prepare a query for the page of data to load
        var oldQuery = this.getQuery;
        var newQuery = new GetQuery_1.GetQuery(oldQuery);
        if (options.offset >= 0) {
            newQuery.offset = options.offset;
        }
        else if (options.offset < 0) {
            newQuery.offset = undefined;
        }
        var oldLimit = options.limit;
        if (options.limit > 0) {
            newQuery.limit = options.limit + 1;
            options.limit = newQuery.limit;
        }
        else if (options.limit <= 0) {
            newQuery.limit = undefined;
        }
        // setup callbacks handling processing of results, do not use promises as these execute too late...
        // Notice, since we call collection.sync() directly, the signature of success/error callbacks here is ajax-style.
        // However, the user-provided callbacks are to being called backbone.js-style with collection and object.
        var oldSuccess = options.success;
        var oldError = options.error;
        options.success = function fetchRangeSuccess(models) {
            // restore callbacks and limit
            options.success = oldSuccess;
            options.error = oldError;
            if (oldLimit !== undefined) {
                options.limit = oldLimit;
            }
            // update models
            if (models) {
                // add models to collection, if any
                if (models.length > 0) {
                    // adjust query parameter
                    options.next = newQuery.limit && models.length >= newQuery.limit;
                    if (options.next) {
                        // trick here was to read one more item to see if there is more to come
                        models.length = models.length - 1;
                    }
                    // realize the page
                    models = collection.reset(models, options) || models;
                }
                else {
                    // reached the end
                    delete options.next;
                }
                options.prev = newQuery.offset > 0;
            }
            // call user success callback
            if (options.success) {
                models = options.success.call(this, collection, models, options) || models;
            }
            return models;
        };
        options.error = function fetchMoreError(error) {
            // restore callbacks and limit
            options.success = oldSuccess;
            options.error = oldError;
            if (oldLimit !== undefined) {
                options.limit = oldLimit;
            }
            // restore query parameter
            options.syncContext.getQuery = oldQuery;
            // call user error callback
            if (options.error) {
                error = options.error.call(this, collection, error, options) || error;
            }
            return error;
        };
        // fire up the page load
        this.getQuery = newQuery;
        return collection.sync(options.method || 'read', collection, options);
    };
    /**
     * reads the next page of data into the collection.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchNext()
     */
    SyncContext.prototype.fetchNext = function (collection, options) {
        if (options === void 0) { options = {}; }
        options.limit = options.pageSize || this.pageSize || this.getQuery.limit;
        options.offset = (this.getQuery.offset | 0) + collection.models.length;
        return this.fetchRange(collection, options);
    };
    /**
     * reads the previous page of data into the collection.
     *
     * @param {object} options such as pageSize to retrieve.
     * @return {Promise} promise of the load operation.
     *
     * @see Collection#fetchPrev()
     */
    SyncContext.prototype.fetchPrev = function (collection, options) {
        if (options === void 0) { options = {}; }
        options.limit = options.pageSize || this.pageSize || this.getQuery.limit;
        options.offset = (this.getQuery.offset | 0) - options.limit;
        return this.fetchRange(collection, options);
    };
    SyncContext.prototype.filterAttributes = function (attrs, options) {
        return this.filterFn ? attrs.filter(this.filterFn) : attrs;
    };
    SyncContext.prototype.sortAttributes = function (attrs, options) {
        return this.compareFn ? attrs.sort(this.compareFn) : attrs;
    };
    SyncContext.prototype.rangeAttributes = function (attrs, options) {
        var offset = options && options.offset || this.getQuery.offset;
        if (offset > 0) {
            attrs.splice(0, offset);
        }
        var limit = options && options.limit || this.getQuery.limit;
        if (limit < attrs.length) {
            attrs.length = limit;
        }
        return attrs;
    };
    SyncContext.prototype.processAttributes = function (attrs, options) {
        attrs = this.filterAttributes(attrs, options);
        attrs = this.sortAttributes(attrs, options);
        attrs = this.rangeAttributes(attrs, options);
        return attrs;
    };
    /**
     * receives change messages.
     *
     * Change messages are communicated by the SyncStore indirectly triggering a sync:channel event. This happens
     * regardless of whether the change originates local or remote. The context then alters the backbone data
     * incorporating the change.
     *
     * @param store
     * @param collection
     * @param msg
     */
    SyncContext.prototype.onMessage = function (store, collection, msg) {
        var options = {
            collection: collection,
            entity: collection.entity,
            merge: msg.method === 'patch',
            parse: true,
            fromMessage: true
        };
        var newId = collection.modelId(msg.data); // modelId(attrs) missing in DefinitelyTyped definitions
        var oldId = msg.id || newId;
        if (oldId === 'all') {
            collection.reset(msg.data || {}, options);
            return;
        }
        // update the collection
        var model = oldId && collection.get(oldId);
        switch (msg.method) {
            case 'create':
            /* falls through */
            case 'update':
                if (newId !== oldId) {
                    diag.debug.warn('updating id ' + oldId + ' to ' + newId);
                }
                if (!model) {
                    // create model in case it does not exist
                    model = new options.collection.model(msg.data, options);
                    if (this.filterFn && !this.filterFn(model.attributes)) {
                        break; // filtered
                    }
                    if (model.validationError) {
                        collection.trigger('invalid', this, model.validationError, options);
                    }
                    else {
                        var index = collection.models.length;
                        if (this.compareFn && index > 0) {
                            options.at = index = this.insertionPoint(model.attributes, collection.models);
                        }
                        // look at index and respect offset/limit eventually ignoring model or removing some,
                        // the not operators below cause proper handling when offset or limit is undefined...
                        /* jshint -W018 */
                        if ((!(this.getQuery.offset > 0) || index > 0) && !(index >= this.getQuery.limit)) {
                            /* jshint +W018 */
                            collection.add(model, options);
                            if (this.getQuery.limit && collection.models.length > this.getQuery.limit) {
                                collection.remove(collection.models[collection.models.length - 1], options);
                            }
                        }
                    }
                    break;
                }
            /* falls through */
            case 'patch':
                if (model) {
                    // update model unless it is filtered
                    model.set(msg.data, options);
                    if (this.filterFn && !this.filterFn(model.attributes)) {
                        // eventually the model is filtered
                        collection.remove(model, options);
                    }
                    else if (this.compareFn) {
                        // eventually the model changes position in collection.models
                        var oldIndex = collection.models.indexOf(model);
                        this.lastInsertionPoint = oldIndex >= 0 ? oldIndex : undefined;
                        var newIndex = this.insertionPoint(model.attributes, collection.models);
                        if (oldIndex !== newIndex) {
                            // following acts just like backbone.Collection.sort()
                            collection.models.splice(oldIndex, 1);
                            collection.models.splice(newIndex, 0, model);
                            collection.trigger('sort', collection, options);
                        }
                    }
                }
                break;
            case 'delete':
                if (model) {
                    // remove model
                    collection.remove(model, options);
                }
                break;
        }
    };
    /**
     * computes the insertion point of attributes into models sorted by compareFn.
     *
     * This is used to compute the at-index of backbone.js add() method options when adding models to a sorted collection.
     *
     * @param attributes being inserted.
     * @param models sorted by compareFn.
     * @return {number} insertion point.
     */
    SyncContext.prototype.insertionPoint = function (attributes, models) {
        if (this.lastInsertionPoint !== undefined) {
            // following performs two comparisons at the last insertion point to take advantage of locality,
            // this means we don't subdivide evenly but check tiny interval at insertion position firstly...
            var start = Math.max(0, this.lastInsertionPoint);
            var end = Math.min(models.length, this.lastInsertionPoint + 3);
            if (end - start > 1) {
                // focus on (start;end] range speeding up binary searches by taking locality into account
                var point = this.insertionPointBinarySearch(attributes, models, start, end);
                if (point >= end) {
                    // select upper interval
                    if (point < models.length) {
                        point = this.insertionPointBinarySearch(attributes, models, point, models.length);
                    }
                }
                else if (point < start) {
                    // select lower interval
                    if (point > 0) {
                        point = this.insertionPointBinarySearch(attributes, models, 0, point);
                    }
                }
                this.lastInsertionPoint = point;
                return point;
            }
        }
        // locality not applicable or did not work
        this.lastInsertionPoint = this.insertionPointBinarySearch(attributes, models, 0, models.length);
        return this.lastInsertionPoint;
    };
    /**
     * performs a binary search for insertion point of attributes into models[start:end] sorted by compareFn.
     *
     * @param attributes being inserted.
     * @param models sorted by compareFn.
     * @param compare function as of Array.sort().
     * @param start inclusive index of search interval.
     * @param end exclusive index of search interval.
     * @return {number} insertion point.
     */
    SyncContext.prototype.insertionPointBinarySearch = function (attributes, models, start, end) {
        var pivot = (start + end) >> 1;
        var delta = this.compareFn(attributes, models[pivot].attributes);
        if (end - start <= 1) {
            return delta < 0 ? pivot : pivot + 1;
        }
        else if (delta < 0) {
            // select lower half
            return this.insertionPointBinarySearch(attributes, models, start, pivot);
        }
        else if (delta > 0) {
            // select upper half
            if (++pivot < end) {
                return this.insertionPointBinarySearch(attributes, models, pivot, end);
            }
        }
        else {
        }
        return pivot;
    };
    return SyncContext;
}());
exports.SyncContext = SyncContext;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY0NvbnRleHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLENBQUMsV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUU1QixJQUFZLElBQUksV0FBTSxjQUFjLENBQUMsQ0FBQTtBQUVyQyx5QkFBdUIsbUJBQW1CLENBQUMsQ0FBQTtBQUMzQyxrQ0FBdUMsNEJBQTRCLENBQUMsQ0FBQTtBQUNwRSxvQ0FBeUMsOEJBQThCLENBQUMsQ0FBQTtBQU14RTs7R0FFRztBQUNIO0lBNkJFOzs7OztPQUtHO0lBQ0g7UUFuQ0YsaUJBd2NDO1FBcmFvQixpQkFBZ0I7YUFBaEIsV0FBZ0IsQ0FBaEIsc0JBQWdCLENBQWhCLElBQWdCO1lBQWhCLGdDQUFnQjs7UUFqQ25DOzs7O1dBSUc7UUFDSyxhQUFRLEdBQWEsSUFBSSxtQkFBUSxFQUFFLENBQUM7UUE2QjFDLG1DQUFtQztRQUNuQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQUMsSUFBSTtZQUNuQixFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUNULEtBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksbUJBQVEsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ3JELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUM7UUFFekIsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7UUFDcEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsSUFBSSxpQ0FBVyxDQUFDLElBQUksQ0FBQyxRQUFR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Q0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNqRSxFQUFFLENBQUMsQ0FBQyxHQUFHLEdBQUcsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDckIsTUFBTSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNyQixvQkFBb0I7WUFDcEIsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLG9CQUFvQjtZQUNwQixFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUNsQixNQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3pFLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7UUFFUixDQUFDO1FBQ0QsTUFBTSxDQUFDLEtBQUssQ0FBQztJQUNmLENBQUM7SUFDSCxrQkFBQztBQUFELENBQUMsQUF4Y0QsSUF3Y0M7QUF4Y1ksbUJBQVcsY0F3Y3ZCLENBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY0NvbnRleHQudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI2LjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4uL2NvcmUvZGlhZyc7XG5cbmltcG9ydCB7R2V0UXVlcnl9IGZyb20gJy4uL3F1ZXJ5L0dldFF1ZXJ5JztcbmltcG9ydCB7anNvbkZpbHRlciwgSnNvbkZpbHRlckZufSBmcm9tICcuLi9xdWVyeS9Kc29uRmlsdGVyVmlzaXRvcic7XG5pbXBvcnQge2pzb25Db21wYXJlLCBKc29uQ29tcGFyZUZufSBmcm9tICcuLi9xdWVyeS9Tb3J0T3JkZXJDb21wYXJhdG9yJztcbmltcG9ydCB7U3RvcmV9IGZyb20gJy4vU3RvcmUnO1xuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQge0xpdmVEYXRhTWVzc2FnZX0gZnJvbSAnLi9MaXZlRGF0YU1lc3NhZ2UnO1xuXG4vKipcbiAqIHJlY2VpdmVzIGNoYW5nZSBtZXNzYWdlcyBhbmQgdXBkYXRlcyBjb2xsZWN0aW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIFN5bmNDb250ZXh0IHtcblxuICAvKipcbiAgICogcmVsZXZhbnQgcGFyYW1ldGVycyBmb3IgcGFnaW5nLCBmaWx0ZXJpbmcgYW5kIHNvcnRpbmcuXG4gICAqXG4gICAqIEB0eXBlIHtSZWx1dGlvbi5saXZlZGF0YS5HZXRRdWVyeX1cbiAgICovXG4gIHByaXZhdGUgZ2V0UXVlcnk6IEdldFF1ZXJ5ID0gbmV3IEdldFF1ZXJ5KCk7XG5cbiAgLyoqXG4gICAqIGxpbWl0IG9mIGdldFF1ZXJ5IGNhcHR1cmVkIGF0IGNvbnN0cnVjdGlvbiB0aW1lLlxuICAgKi9cbiAgcHJpdmF0ZSBwYWdlU2l6ZTogbnVtYmVyO1xuXG4gIC8qKlxuICAgKiB1c2VkIHRvIHNwZWVkIHVwIGluc2VydGlvbiBwb2ludCB3aGVuIGRvaW5nIGNvbnNlY3V0aXZlIGluc2VydGlvbnMgaW50byBzb3J0ZWQgcmFuZ2VzLlxuICAgKi9cbiAgcHJpdmF0ZSBsYXN0SW5zZXJ0aW9uUG9pbnQ6IG51bWJlcjtcblxuICAvKipcbiAgICogd2hlbiBzZXQsIGRlZmluZXMgc29ydGluZyBvZiBjb2xsZWN0aW9uLlxuICAgKi9cbiAgcHJpdmF0ZSBjb21wYXJlRm46IEpzb25Db21wYXJlRm48YW55PjtcblxuICAvKipcbiAgICogd2hlbiBzZXQsIGRlZmluZXMgZmlsdGVyaW5nIG9mIGNvbGxlY3Rpb24uXG4gICAqL1xuICBwcml2YXRlIGZpbHRlckZuOiBKc29uRmlsdGVyRm48YW55PjtcblxuICAvKipcbiAgICogY2FwdHVyZXMgb3B0aW9uIHZhbHVlcyBmb3JtaW5nIGEgR2V0UXVlcnkuXG4gICAqXG4gICAqIEBwYXJhbSBvcHRpb25zIHRvIG1lcmdlLlxuICAgKiBAY29uc3RydWN0b3JcbiAgICovXG4gIHB1YmxpYyBjb25zdHJ1Y3RvciguLi5vcHRpb25zOiB7fVtdKSB7XG4gICAgLy8gbWVyZ2Ugb3B0aW9ucyBmb3JtaW5nIGEgR2V0UXVlcnlcbiAgICBvcHRpb25zLmZvckVhY2goKGpzb24pID0+IHtcbiAgICAgIGlmIChqc29uKSB7XG4gICAgICAgIHRoaXMuZ2V0UXVlcnkubWVyZ2UobmV3IEdldFF1ZXJ5KCkuZnJvbUpTT04oanNvbikpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuZ2V0UXVlcnkub3B0aW1pemUoKTtcblxuICAgIC8vIGNvbXB1dGUgbG9jYWwgbWVtYmVyc1xuICAgIHRoaXMucGFnZVNpemUgPSB0aGlzLmdldFF1ZXJ5LmxpbWl0O1xuICAgIHRoaXMuY29tcGFyZUZuID0gdGhpcy5nZXRRdWVyeS5zb3J0T3JkZXIgJiYganNvbkNvbXBhcmUodGhpcy5nZXRRdWVyeS5zb3J0T3JkZXIpO1xuICAgIHRoaXMuZmlsdGVyRm4gPSB0aGlzLmdldFF1ZXJ5LmZpbHRlciAmJiBqc29uRmlsdGVyKHRoaXMuZ2V0UXVlcnkuZmlsdGVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiByZWFkcyBhbiBhZGRpdGlvbmFsIHBhZ2Ugb2YgZGF0YSBpbnRvIHRoZSBjb2xsZWN0aW9uLlxuICAgKlxuICAgKiBXaGVuIGFzeW5jIHByb2Nlc3NpbmcgaXMgZG9uZSwgYSBtb3JlIGF0dHJpYnV0ZSBpcyBzZXQgb24gdGhlIG9wdGlvbnMgb2JqZWN0IGluIGNhc2UgYWRkaXRpb25hbCBkYXRhIG1pZ2h0IGJlXG4gICAqIGF2YWlsYWJsZSB3aGljaCBjYW4gYmUgbG9hZGVkIGJ5IGNhbGxpbmcgdGhpcyBtZXRob2QgYWdhaW4uIExpa2V3aXNlIGFuIGVuZCBhdHRyaWJ1dGUgaXMgc2V0IGlmIHRoZSBkYXRhIGlzXG4gICAqIGZ1bGx5IGxvYWRlZC5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbGxlY3Rpb24gdG8gbG9hZCBkYXRhIGludG8uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHN1Y2ggYXMgcGFnZVNpemUgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24jZmV0Y2hNb3JlKClcbiAgICovXG4gIHB1YmxpYyBmZXRjaE1vcmUoY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pIHtcbiAgICB2YXIgZ2V0UXVlcnkgPSB0aGlzLmdldFF1ZXJ5O1xuICAgIG9wdGlvbnMgPSBfLmRlZmF1bHRzKG9wdGlvbnMsIHtcbiAgICAgIGxpbWl0OiBvcHRpb25zLnBhZ2VTaXplIHx8IHRoaXMucGFnZVNpemUgfHwgZ2V0UXVlcnkubGltaXQsXG4gICAgICBzb3J0T3JkZXI6IGdldFF1ZXJ5LnNvcnRPcmRlcixcbiAgICAgIGZpbHRlcjogZ2V0UXVlcnkuZmlsdGVyLFxuICAgICAgZmllbGRzOiBnZXRRdWVyeS5maWVsZHNcbiAgICB9KTtcbiAgICAvLyBwcmVwYXJlIGEgcXVlcnkgZm9yIHRoZSBuZXh0IHBhZ2Ugb2YgZGF0YSB0byBsb2FkXG4gICAgb3B0aW9ucy5vZmZzZXQgPSAoZ2V0UXVlcnkub2Zmc2V0IHwgMCkgKyBjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGg7XG4gICAgLy8gdGhpcyBtdXN0IGJlIHNldCBpbiBvcHRpb25zIHRvIHN0YXRlIHdlIGhhbmRsZSBpdFxuICAgIG9wdGlvbnMuc3luY0NvbnRleHQgPSB0aGlzO1xuXG4gICAgLy8gc2V0dXAgY2FsbGJhY2tzIGhhbmRsaW5nIHByb2Nlc3Npbmcgb2YgcmVzdWx0cywgZG8gbm90IHVzZSBwcm9taXNlcyBhcyB0aGVzZSBleGVjdXRlIHRvbyBsYXRlLi4uXG4gICAgLy8gTm90aWNlLCBzaW5jZSB3ZSBjYWxsIGNvbGxlY3Rpb24uc3luYygpIGRpcmVjdGx5LCB0aGUgc2lnbmF0dXJlIG9mIHN1Y2Nlc3MvZXJyb3IgY2FsbGJhY2tzIGhlcmUgaXMgYWpheC1zdHlsZS5cbiAgICAvLyBIb3dldmVyLCB0aGUgdXNlci1wcm92aWRlZCBjYWxsYmFja3MgYXJlIHRvIGJlaW5nIGNhbGxlZCBiYWNrYm9uZS5qcy1zdHlsZSB3aXRoIGNvbGxlY3Rpb24gYW5kIG9iamVjdC5cbiAgICB2YXIgb2xkU3VjY2VzcyA9IG9wdGlvbnMuc3VjY2VzcztcbiAgICB2YXIgb2xkRXJyb3IgPSBvcHRpb25zLmVycm9yO1xuICAgIG9wdGlvbnMuc3VjY2VzcyA9IGZ1bmN0aW9uIGZldGNoTW9yZVN1Y2Nlc3MobW9kZWxzOiBhbnlbXSkge1xuICAgICAgLy8gcmVzdG9yZSBjYWxsYmFja3NcbiAgICAgIG9wdGlvbnMuc3VjY2VzcyA9IG9sZFN1Y2Nlc3M7XG4gICAgICBvcHRpb25zLmVycm9yID0gb2xkRXJyb3I7XG5cbiAgICAgIC8vIHVwZGF0ZSBtb2RlbHNcbiAgICAgIGlmIChtb2RlbHMpIHtcbiAgICAgICAgLy8gYWRkIG1vZGVscyB0byBjb2xsZWN0aW9uLCBpZiBhbnlcbiAgICAgICAgaWYgKG1vZGVscy5sZW5ndGggPD0gMCkge1xuICAgICAgICAgIC8vIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgIGRlbGV0ZSBvcHRpb25zLm1vcmU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgLy8gcmVhZCBhZGRpdGlvbmFsIGRhdGFcbiAgICAgICAgICBpZiAob3B0aW9ucy5zeW5jQ29udGV4dC5jb21wYXJlRm4pIHtcbiAgICAgICAgICAgIC8vIG5vdGljZSwgZXhpc3RpbmcgcmFuZ2Ugb2YgbW9kZWxzIGlzIHNvcnRlZCBieSBkZWZpbml0aW9uIGFscmVhZHlcbiAgICAgICAgICAgIG9wdGlvbnMuYXQgPSBvcHRpb25zLnN5bmNDb250ZXh0Lmluc2VydGlvblBvaW50KG1vZGVsc1swXSwgY29sbGVjdGlvbi5tb2RlbHMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBtb2RlbHMgPSA8YW55PmNvbGxlY3Rpb24uYWRkKG1vZGVscywgb3B0aW9ucykgfHwgbW9kZWxzO1xuXG4gICAgICAgICAgLy8gYWRqdXN0IHF1ZXJ5IHBhcmFtZXRlclxuICAgICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoO1xuICAgICAgICAgIGlmIChvcHRpb25zLnN5bmNDb250ZXh0LmdldFF1ZXJ5LmxpbWl0ID4gZ2V0UXVlcnkubGltaXQpIHtcbiAgICAgICAgICAgIC8vIHJlYWNoZWQgdGhlIGVuZFxuICAgICAgICAgICAgZGVsZXRlIG9wdGlvbnMubW9yZTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gbW9yZSBkYXRhIHRvIGxvYWRcbiAgICAgICAgICAgIG9wdGlvbnMubW9yZSA9IHRydWU7XG4gICAgICAgICAgICBkZWxldGUgb3B0aW9ucy5lbmQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gcmVhY2hlZCB0aGUgZW5kP1xuICAgICAgICBpZiAoIW9wdGlvbnMubW9yZSkge1xuICAgICAgICAgIGdldFF1ZXJ5LmxpbWl0ID0gdW5kZWZpbmVkOyAvLyBvcGVuIGVuZFxuICAgICAgICAgIG9wdGlvbnMuZW5kID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyByZXN0b3JlIHF1ZXJ5IHBhcmFtZXRlclxuICAgICAgb3B0aW9ucy5zeW5jQ29udGV4dC5nZXRRdWVyeSA9IGdldFF1ZXJ5O1xuXG4gICAgICAvLyBjYWxsIHVzZXIgc3VjY2VzcyBjYWxsYmFja1xuICAgICAgaWYgKG9wdGlvbnMuc3VjY2Vzcykge1xuICAgICAgICBtb2RlbHMgPSBvcHRpb25zLnN1Y2Nlc3MuY2FsbCh0aGlzLCBjb2xsZWN0aW9uLCBtb2RlbHMsIG9wdGlvbnMpIHx8IG1vZGVscztcbiAgICAgIH1cbiAgICAgIHJldHVybiBtb2RlbHM7XG4gICAgfTtcbiAgICBvcHRpb25zLmVycm9yID0gZnVuY3Rpb24gZmV0Y2hNb3JlRXJyb3IoZXJyb3I6IEVycm9yKSB7XG4gICAgICAvLyByZXN0b3JlIGNhbGxiYWNrc1xuICAgICAgb3B0aW9ucy5zdWNjZXNzID0gb2xkU3VjY2VzcztcbiAgICAgIG9wdGlvbnMuZXJyb3IgPSBvbGRFcnJvcjtcblxuICAgICAgLy8gcmVzdG9yZSBxdWVyeSBwYXJhbWV0ZXJcbiAgICAgIG9wdGlvbnMuc3luY0NvbnRleHQuZ2V0UXVlcnkgPSBnZXRRdWVyeTtcblxuICAgICAgLy8gY2FsbCB1c2VyIGVycm9yIGNhbGxiYWNrXG4gICAgICBpZiAob3B0aW9ucy5lcnJvcikge1xuICAgICAgICBlcnJvciA9IG9wdGlvbnMuZXJyb3IuY2FsbCh0aGlzLCBjb2xsZWN0aW9uLCBlcnJvciwgb3B0aW9ucykgfHwgZXJyb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXJyb3I7XG4gICAgfTtcblxuICAgIC8vIGZpcmUgdXAgdGhlIHBhZ2UgbG9hZFxuICAgIHRoaXMuZ2V0UXVlcnkgPSBuZXcgR2V0UXVlcnkoZ2V0UXVlcnkpO1xuICAgIHRoaXMuZ2V0UXVlcnkubGltaXQgPSBnZXRRdWVyeS5saW1pdCArIG9wdGlvbnMubGltaXQ7XG4gICAgcmV0dXJuIGNvbGxlY3Rpb24uc3luYyhvcHRpb25zLm1ldGhvZCB8fCAncmVhZCcsIGNvbGxlY3Rpb24sIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlYWRzIGEgcGFnZSBvZiBkYXRhIGludG8gdGhlIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIFdoZW4gYXN5bmMgcHJvY2Vzc2luZyBpcyBkb25lLCBhIG5leHQvcHJldiBhdHRyaWJ1dGUgaXMgc2V0IG9uIHRoZSBvcHRpb25zIG9iamVjdCBpbiBjYXNlIGFkZGl0aW9uYWwgcGFnZXMgbWlnaHRcbiAgICogYmUgYXZhaWxhYmxlIHdoaWNoIGNhbiBiZSBsb2FkZWQgYnkgY2FsbGluZyB0aGlzIG1ldGhvZCBhZ2Fpbi5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IGNvbGxlY3Rpb24gdG8gbG9hZCBkYXRhIGludG8uXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIGluY2wuIG9mZnNldCBhbmQgbGltaXQgb2YgcGFnZSB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiB0aGUgbG9hZCBvcGVyYXRpb24uXG4gICAqL1xuICBwcml2YXRlIGZldGNoUmFuZ2UoY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pIHtcbiAgICAvLyB0aGlzIG11c3QgYmUgc2V0IGluIG9wdGlvbnMgdG8gc3RhdGUgd2UgaGFuZGxlIGl0XG4gICAgb3B0aW9ucy5zeW5jQ29udGV4dCA9IHRoaXM7XG5cbiAgICAvLyBwcmVwYXJlIGEgcXVlcnkgZm9yIHRoZSBwYWdlIG9mIGRhdGEgdG8gbG9hZFxuICAgIHZhciBvbGRRdWVyeSA9IHRoaXMuZ2V0UXVlcnk7XG4gICAgdmFyIG5ld1F1ZXJ5ID0gbmV3IEdldFF1ZXJ5KG9sZFF1ZXJ5KTtcbiAgICBpZiAob3B0aW9ucy5vZmZzZXQgPj0gMCkge1xuICAgICAgbmV3UXVlcnkub2Zmc2V0ID0gb3B0aW9ucy5vZmZzZXQ7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLm9mZnNldCA8IDApIHtcbiAgICAgIG5ld1F1ZXJ5Lm9mZnNldCA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIG9sZExpbWl0ID0gb3B0aW9ucy5saW1pdDtcbiAgICBpZiAob3B0aW9ucy5saW1pdCA+IDApIHtcbiAgICAgIG5ld1F1ZXJ5LmxpbWl0ID0gb3B0aW9ucy5saW1pdCArIDE7XG4gICAgICBvcHRpb25zLmxpbWl0ID0gbmV3UXVlcnkubGltaXQ7XG4gICAgfSBlbHNlIGlmIChvcHRpb25zLmxpbWl0IDw9IDApIHtcbiAgICAgIG5ld1F1ZXJ5LmxpbWl0ID0gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIHNldHVwIGNhbGxiYWNrcyBoYW5kbGluZyBwcm9jZXNzaW5nIG9mIHJlc3VsdHMsIGRvIG5vdCB1c2UgcHJvbWlzZXMgYXMgdGhlc2UgZXhlY3V0ZSB0b28gbGF0ZS4uLlxuICAgIC8vIE5vdGljZSwgc2luY2Ugd2UgY2FsbCBjb2xsZWN0aW9uLnN5bmMoKSBkaXJlY3RseSwgdGhlIHNpZ25hdHVyZSBvZiBzdWNjZXNzL2Vycm9yIGNhbGxiYWNrcyBoZXJlIGlzIGFqYXgtc3R5bGUuXG4gICAgLy8gSG93ZXZlciwgdGhlIHVzZXItcHJvdmlkZWQgY2FsbGJhY2tzIGFyZSB0byBiZWluZyBjYWxsZWQgYmFja2JvbmUuanMtc3R5bGUgd2l0aCBjb2xsZWN0aW9uIGFuZCBvYmplY3QuXG4gICAgdmFyIG9sZFN1Y2Nlc3MgPSBvcHRpb25zLnN1Y2Nlc3M7XG4gICAgdmFyIG9sZEVycm9yID0gb3B0aW9ucy5lcnJvcjtcbiAgICBvcHRpb25zLnN1Y2Nlc3MgPSBmdW5jdGlvbiBmZXRjaFJhbmdlU3VjY2Vzcyhtb2RlbHM6IGFueVtdKSB7XG4gICAgICAvLyByZXN0b3JlIGNhbGxiYWNrcyBhbmQgbGltaXRcbiAgICAgIG9wdGlvbnMuc3VjY2VzcyA9IG9sZFN1Y2Nlc3M7XG4gICAgICBvcHRpb25zLmVycm9yID0gb2xkRXJyb3I7XG4gICAgICBpZiAob2xkTGltaXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBvcHRpb25zLmxpbWl0ID0gb2xkTGltaXQ7XG4gICAgICB9XG5cbiAgICAgIC8vIHVwZGF0ZSBtb2RlbHNcbiAgICAgIGlmIChtb2RlbHMpIHtcbiAgICAgICAgLy8gYWRkIG1vZGVscyB0byBjb2xsZWN0aW9uLCBpZiBhbnlcbiAgICAgICAgaWYgKG1vZGVscy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8gYWRqdXN0IHF1ZXJ5IHBhcmFtZXRlclxuICAgICAgICAgIG9wdGlvbnMubmV4dCA9IG5ld1F1ZXJ5LmxpbWl0ICYmIG1vZGVscy5sZW5ndGggPj0gbmV3UXVlcnkubGltaXQ7XG4gICAgICAgICAgaWYgKG9wdGlvbnMubmV4dCkge1xuICAgICAgICAgICAgLy8gdHJpY2sgaGVyZSB3YXMgdG8gcmVhZCBvbmUgbW9yZSBpdGVtIHRvIHNlZSBpZiB0aGVyZSBpcyBtb3JlIHRvIGNvbWVcbiAgICAgICAgICAgIG1vZGVscy5sZW5ndGggPSBtb2RlbHMubGVuZ3RoIC0gMTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyByZWFsaXplIHRoZSBwYWdlXG4gICAgICAgICAgbW9kZWxzID0gY29sbGVjdGlvbi5yZXNldChtb2RlbHMsIG9wdGlvbnMpIHx8IG1vZGVscztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyByZWFjaGVkIHRoZSBlbmRcbiAgICAgICAgICBkZWxldGUgb3B0aW9ucy5uZXh0O1xuICAgICAgICB9XG4gICAgICAgIG9wdGlvbnMucHJldiA9IG5ld1F1ZXJ5Lm9mZnNldCA+IDA7XG4gICAgICB9XG5cbiAgICAgIC8vIGNhbGwgdXNlciBzdWNjZXNzIGNhbGxiYWNrXG4gICAgICBpZiAob3B0aW9ucy5zdWNjZXNzKSB7XG4gICAgICAgIG1vZGVscyA9IG9wdGlvbnMuc3VjY2Vzcy5jYWxsKHRoaXMsIGNvbGxlY3Rpb24sIG1vZGVscywgb3B0aW9ucykgfHwgbW9kZWxzO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG1vZGVscztcbiAgICB9O1xuICAgIG9wdGlvbnMuZXJyb3IgPSBmdW5jdGlvbiBmZXRjaE1vcmVFcnJvcihlcnJvcjogRXJyb3IpIHtcbiAgICAgIC8vIHJlc3RvcmUgY2FsbGJhY2tzIGFuZCBsaW1pdFxuICAgICAgb3B0aW9ucy5zdWNjZXNzID0gb2xkU3VjY2VzcztcbiAgICAgIG9wdGlvbnMuZXJyb3IgPSBvbGRFcnJvcjtcbiAgICAgIGlmIChvbGRMaW1pdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9wdGlvbnMubGltaXQgPSBvbGRMaW1pdDtcbiAgICAgIH1cblxuICAgICAgLy8gcmVzdG9yZSBxdWVyeSBwYXJhbWV0ZXJcbiAgICAgIG9wdGlvbnMuc3luY0NvbnRleHQuZ2V0UXVlcnkgPSBvbGRRdWVyeTtcblxuICAgICAgLy8gY2FsbCB1c2VyIGVycm9yIGNhbGxiYWNrXG4gICAgICBpZiAob3B0aW9ucy5lcnJvcikge1xuICAgICAgICBlcnJvciA9IG9wdGlvbnMuZXJyb3IuY2FsbCh0aGlzLCBjb2xsZWN0aW9uLCBlcnJvciwgb3B0aW9ucykgfHwgZXJyb3I7XG4gICAgICB9XG4gICAgICByZXR1cm4gZXJyb3I7XG4gICAgfTtcblxuICAgIC8vIGZpcmUgdXAgdGhlIHBhZ2UgbG9hZFxuICAgIHRoaXMuZ2V0UXVlcnkgPSBuZXdRdWVyeTtcbiAgICByZXR1cm4gY29sbGVjdGlvbi5zeW5jKG9wdGlvbnMubWV0aG9kIHx8ICdyZWFkJywgY29sbGVjdGlvbiwgb3B0aW9ucyk7XG4gIH1cblxuICAvKipcbiAgICogcmVhZHMgdGhlIG5leHQgcGFnZSBvZiBkYXRhIGludG8gdGhlIGNvbGxlY3Rpb24uXG4gICAqXG4gICAqIEBwYXJhbSB7b2JqZWN0fSBvcHRpb25zIHN1Y2ggYXMgcGFnZVNpemUgdG8gcmV0cmlldmUuXG4gICAqIEByZXR1cm4ge1Byb21pc2V9IHByb21pc2Ugb2YgdGhlIGxvYWQgb3BlcmF0aW9uLlxuICAgKlxuICAgKiBAc2VlIENvbGxlY3Rpb24jZmV0Y2hOZXh0KClcbiAgICovXG4gIHB1YmxpYyBmZXRjaE5leHQoY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgb3B0aW9uczogYW55ID0ge30pIHtcbiAgICBvcHRpb25zLmxpbWl0ID0gb3B0aW9ucy5wYWdlU2l6ZSB8fCB0aGlzLnBhZ2VTaXplIHx8IHRoaXMuZ2V0UXVlcnkubGltaXQ7XG4gICAgb3B0aW9ucy5vZmZzZXQgPSAodGhpcy5nZXRRdWVyeS5vZmZzZXQgfCAwKSArIGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aDtcbiAgICByZXR1cm4gdGhpcy5mZXRjaFJhbmdlKGNvbGxlY3Rpb24sIG9wdGlvbnMpO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlYWRzIHRoZSBwcmV2aW91cyBwYWdlIG9mIGRhdGEgaW50byB0aGUgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIHtvYmplY3R9IG9wdGlvbnMgc3VjaCBhcyBwYWdlU2l6ZSB0byByZXRyaWV2ZS5cbiAgICogQHJldHVybiB7UHJvbWlzZX0gcHJvbWlzZSBvZiB0aGUgbG9hZCBvcGVyYXRpb24uXG4gICAqXG4gICAqIEBzZWUgQ29sbGVjdGlvbiNmZXRjaFByZXYoKVxuICAgKi9cbiAgcHVibGljIGZldGNoUHJldihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkgPSB7fSkge1xuICAgIG9wdGlvbnMubGltaXQgPSBvcHRpb25zLnBhZ2VTaXplIHx8IHRoaXMucGFnZVNpemUgfHwgdGhpcy5nZXRRdWVyeS5saW1pdDtcbiAgICBvcHRpb25zLm9mZnNldCA9ICh0aGlzLmdldFF1ZXJ5Lm9mZnNldCB8IDApIC0gb3B0aW9ucy5saW1pdDtcbiAgICByZXR1cm4gdGhpcy5mZXRjaFJhbmdlKGNvbGxlY3Rpb24sIG9wdGlvbnMpO1xuICB9XG5cbiAgcHVibGljIGZpbHRlckF0dHJpYnV0ZXM8VD4oYXR0cnM6IFRbXSwgb3B0aW9ucz86IGFueSk6IFRbXSB7XG4gICAgcmV0dXJuIHRoaXMuZmlsdGVyRm4gPyBhdHRycy5maWx0ZXIodGhpcy5maWx0ZXJGbikgOiBhdHRycztcbiAgfVxuXG4gIHB1YmxpYyBzb3J0QXR0cmlidXRlczxUPihhdHRyczogVFtdLCBvcHRpb25zPzogYW55KTogVFtdIHtcbiAgICByZXR1cm4gdGhpcy5jb21wYXJlRm4gPyBhdHRycy5zb3J0KHRoaXMuY29tcGFyZUZuKSA6IGF0dHJzO1xuICB9XG5cbiAgcHVibGljIHJhbmdlQXR0cmlidXRlczxUPihhdHRyczogVFtdLCBvcHRpb25zPzogYW55KTogVFtdIHtcbiAgICB2YXIgb2Zmc2V0ID0gb3B0aW9ucyAmJiBvcHRpb25zLm9mZnNldCB8fCB0aGlzLmdldFF1ZXJ5Lm9mZnNldDtcbiAgICBpZiAob2Zmc2V0ID4gMCkge1xuICAgICAgYXR0cnMuc3BsaWNlKDAsIG9mZnNldCk7XG4gICAgfVxuICAgIHZhciBsaW1pdCA9IG9wdGlvbnMgJiYgb3B0aW9ucy5saW1pdCB8fCAgdGhpcy5nZXRRdWVyeS5saW1pdDtcbiAgICBpZiAobGltaXQgPCBhdHRycy5sZW5ndGgpIHtcbiAgICAgIGF0dHJzLmxlbmd0aCA9IGxpbWl0O1xuICAgIH1cbiAgICByZXR1cm4gYXR0cnM7XG4gIH1cblxuICBwdWJsaWMgcHJvY2Vzc0F0dHJpYnV0ZXM8VD4oYXR0cnM6IFRbXSwgb3B0aW9ucz86IGFueSk6IFRbXSB7XG4gICAgYXR0cnMgPSB0aGlzLmZpbHRlckF0dHJpYnV0ZXMoYXR0cnMsIG9wdGlvbnMpO1xuICAgIGF0dHJzID0gdGhpcy5zb3J0QXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgYXR0cnMgPSB0aGlzLnJhbmdlQXR0cmlidXRlcyhhdHRycywgb3B0aW9ucyk7XG4gICAgcmV0dXJuIGF0dHJzO1xuICB9XG5cbiAgLyoqXG4gICAqIHJlY2VpdmVzIGNoYW5nZSBtZXNzYWdlcy5cbiAgICpcbiAgICogQ2hhbmdlIG1lc3NhZ2VzIGFyZSBjb21tdW5pY2F0ZWQgYnkgdGhlIFN5bmNTdG9yZSBpbmRpcmVjdGx5IHRyaWdnZXJpbmcgYSBzeW5jOmNoYW5uZWwgZXZlbnQuIFRoaXMgaGFwcGVuc1xuICAgKiByZWdhcmRsZXNzIG9mIHdoZXRoZXIgdGhlIGNoYW5nZSBvcmlnaW5hdGVzIGxvY2FsIG9yIHJlbW90ZS4gVGhlIGNvbnRleHQgdGhlbiBhbHRlcnMgdGhlIGJhY2tib25lIGRhdGFcbiAgICogaW5jb3Jwb3JhdGluZyB0aGUgY2hhbmdlLlxuICAgKlxuICAgKiBAcGFyYW0gc3RvcmVcbiAgICogQHBhcmFtIGNvbGxlY3Rpb25cbiAgICogQHBhcmFtIG1zZ1xuICAgKi9cbiAgcHVibGljIG9uTWVzc2FnZShzdG9yZTogU3RvcmUsIGNvbGxlY3Rpb246IENvbGxlY3Rpb24sIG1zZzogTGl2ZURhdGFNZXNzYWdlKSB7XG4gICAgdmFyIG9wdGlvbnM6IGFueSA9IHtcbiAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb24sXG4gICAgICBlbnRpdHk6IGNvbGxlY3Rpb24uZW50aXR5LFxuICAgICAgbWVyZ2U6IG1zZy5tZXRob2QgPT09ICdwYXRjaCcsXG4gICAgICBwYXJzZTogdHJ1ZSxcbiAgICAgIGZyb21NZXNzYWdlOiB0cnVlXG4gICAgfTtcbiAgICB2YXIgbmV3SWQgPSAoPGFueT5jb2xsZWN0aW9uKS5tb2RlbElkKG1zZy5kYXRhKTsgLy8gbW9kZWxJZChhdHRycykgbWlzc2luZyBpbiBEZWZpbml0ZWx5VHlwZWQgZGVmaW5pdGlvbnNcbiAgICB2YXIgb2xkSWQgPSBtc2cuaWQgfHwgbmV3SWQ7XG4gICAgaWYgKG9sZElkID09PSAnYWxsJykge1xuICAgICAgY29sbGVjdGlvbi5yZXNldChtc2cuZGF0YSB8fCB7fSwgb3B0aW9ucyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gdXBkYXRlIHRoZSBjb2xsZWN0aW9uXG4gICAgdmFyIG1vZGVsID0gb2xkSWQgJiYgY29sbGVjdGlvbi5nZXQob2xkSWQpO1xuICAgIHN3aXRjaCAobXNnLm1ldGhvZCkge1xuICAgICAgY2FzZSAnY3JlYXRlJzpcbiAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgJ3VwZGF0ZSc6XG4gICAgICAgIGlmIChuZXdJZCAhPT0gb2xkSWQpIHtcbiAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3VwZGF0aW5nIGlkICcgKyBvbGRJZCArICcgdG8gJyArIG5ld0lkKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIW1vZGVsKSB7XG4gICAgICAgICAgLy8gY3JlYXRlIG1vZGVsIGluIGNhc2UgaXQgZG9lcyBub3QgZXhpc3RcbiAgICAgICAgICBtb2RlbCA9IG5ldyBvcHRpb25zLmNvbGxlY3Rpb24ubW9kZWwobXNnLmRhdGEsIG9wdGlvbnMpO1xuICAgICAgICAgIGlmICh0aGlzLmZpbHRlckZuICYmICF0aGlzLmZpbHRlckZuKG1vZGVsLmF0dHJpYnV0ZXMpKSB7XG4gICAgICAgICAgICBicmVhazsgLy8gZmlsdGVyZWRcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG1vZGVsLnZhbGlkYXRpb25FcnJvcikge1xuICAgICAgICAgICAgY29sbGVjdGlvbi50cmlnZ2VyKCdpbnZhbGlkJywgdGhpcywgbW9kZWwudmFsaWRhdGlvbkVycm9yLCBvcHRpb25zKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKHRoaXMuY29tcGFyZUZuICYmIGluZGV4ID4gMCkge1xuICAgICAgICAgICAgICBvcHRpb25zLmF0ID0gaW5kZXggPSB0aGlzLmluc2VydGlvblBvaW50KG1vZGVsLmF0dHJpYnV0ZXMsIGNvbGxlY3Rpb24ubW9kZWxzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGxvb2sgYXQgaW5kZXggYW5kIHJlc3BlY3Qgb2Zmc2V0L2xpbWl0IGV2ZW50dWFsbHkgaWdub3JpbmcgbW9kZWwgb3IgcmVtb3Zpbmcgc29tZSxcbiAgICAgICAgICAgIC8vIHRoZSBub3Qgb3BlcmF0b3JzIGJlbG93IGNhdXNlIHByb3BlciBoYW5kbGluZyB3aGVuIG9mZnNldCBvciBsaW1pdCBpcyB1bmRlZmluZWQuLi5cbiAgICAgICAgICAgIC8qIGpzaGludCAtVzAxOCAqL1xuICAgICAgICAgICAgaWYgKCghKHRoaXMuZ2V0UXVlcnkub2Zmc2V0ID4gMCkgfHwgaW5kZXggPiAwKSAmJiAhKGluZGV4ID49IHRoaXMuZ2V0UXVlcnkubGltaXQpKSB7XG4gICAgICAgICAgICAgIC8qIGpzaGludCArVzAxOCAqL1xuICAgICAgICAgICAgICBjb2xsZWN0aW9uLmFkZChtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIGlmICh0aGlzLmdldFF1ZXJ5LmxpbWl0ICYmIGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCA+IHRoaXMuZ2V0UXVlcnkubGltaXQpIHtcbiAgICAgICAgICAgICAgICBjb2xsZWN0aW9uLnJlbW92ZShjb2xsZWN0aW9uLm1vZGVsc1tjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGggLSAxXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIC8qIGZhbGxzIHRocm91Z2ggKi9cbiAgICAgIGNhc2UgJ3BhdGNoJzpcbiAgICAgICAgaWYgKG1vZGVsKSB7XG4gICAgICAgICAgLy8gdXBkYXRlIG1vZGVsIHVubGVzcyBpdCBpcyBmaWx0ZXJlZFxuICAgICAgICAgIG1vZGVsLnNldChtc2cuZGF0YSwgb3B0aW9ucyk7XG4gICAgICAgICAgaWYgKHRoaXMuZmlsdGVyRm4gJiYgIXRoaXMuZmlsdGVyRm4obW9kZWwuYXR0cmlidXRlcykpIHtcbiAgICAgICAgICAgIC8vIGV2ZW50dWFsbHkgdGhlIG1vZGVsIGlzIGZpbHRlcmVkXG4gICAgICAgICAgICBjb2xsZWN0aW9uLnJlbW92ZShtb2RlbCwgb3B0aW9ucyk7XG4gICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNvbXBhcmVGbikge1xuICAgICAgICAgICAgLy8gZXZlbnR1YWxseSB0aGUgbW9kZWwgY2hhbmdlcyBwb3NpdGlvbiBpbiBjb2xsZWN0aW9uLm1vZGVsc1xuICAgICAgICAgICAgdmFyIG9sZEluZGV4ID0gY29sbGVjdGlvbi5tb2RlbHMuaW5kZXhPZihtb2RlbCk7XG4gICAgICAgICAgICB0aGlzLmxhc3RJbnNlcnRpb25Qb2ludCA9IG9sZEluZGV4ID49IDAgPyBvbGRJbmRleCA6IHVuZGVmaW5lZDtcbiAgICAgICAgICAgIHZhciBuZXdJbmRleCA9IHRoaXMuaW5zZXJ0aW9uUG9pbnQobW9kZWwuYXR0cmlidXRlcywgY29sbGVjdGlvbi5tb2RlbHMpO1xuICAgICAgICAgICAgaWYgKG9sZEluZGV4ICE9PSBuZXdJbmRleCkge1xuICAgICAgICAgICAgICAvLyBmb2xsb3dpbmcgYWN0cyBqdXN0IGxpa2UgYmFja2JvbmUuQ29sbGVjdGlvbi5zb3J0KClcbiAgICAgICAgICAgICAgY29sbGVjdGlvbi5tb2RlbHMuc3BsaWNlKG9sZEluZGV4LCAxKTtcbiAgICAgICAgICAgICAgY29sbGVjdGlvbi5tb2RlbHMuc3BsaWNlKG5ld0luZGV4LCAwLCBtb2RlbCk7XG4gICAgICAgICAgICAgIGNvbGxlY3Rpb24udHJpZ2dlcignc29ydCcsIGNvbGxlY3Rpb24sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgJ2RlbGV0ZSc6XG4gICAgICAgIGlmIChtb2RlbCkge1xuICAgICAgICAgIC8vIHJlbW92ZSBtb2RlbFxuICAgICAgICAgIGNvbGxlY3Rpb24ucmVtb3ZlKG1vZGVsLCBvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogY29tcHV0ZXMgdGhlIGluc2VydGlvbiBwb2ludCBvZiBhdHRyaWJ1dGVzIGludG8gbW9kZWxzIHNvcnRlZCBieSBjb21wYXJlRm4uXG4gICAqXG4gICAqIFRoaXMgaXMgdXNlZCB0byBjb21wdXRlIHRoZSBhdC1pbmRleCBvZiBiYWNrYm9uZS5qcyBhZGQoKSBtZXRob2Qgb3B0aW9ucyB3aGVuIGFkZGluZyBtb2RlbHMgdG8gYSBzb3J0ZWQgY29sbGVjdGlvbi5cbiAgICpcbiAgICogQHBhcmFtIGF0dHJpYnV0ZXMgYmVpbmcgaW5zZXJ0ZWQuXG4gICAqIEBwYXJhbSBtb2RlbHMgc29ydGVkIGJ5IGNvbXBhcmVGbi5cbiAgICogQHJldHVybiB7bnVtYmVyfSBpbnNlcnRpb24gcG9pbnQuXG4gICAqL1xuICBwcml2YXRlIGluc2VydGlvblBvaW50KGF0dHJpYnV0ZXM6IGFueSwgbW9kZWxzOiBNb2RlbFtdKTogbnVtYmVyIHtcbiAgICBpZiAodGhpcy5sYXN0SW5zZXJ0aW9uUG9pbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZm9sbG93aW5nIHBlcmZvcm1zIHR3byBjb21wYXJpc29ucyBhdCB0aGUgbGFzdCBpbnNlcnRpb24gcG9pbnQgdG8gdGFrZSBhZHZhbnRhZ2Ugb2YgbG9jYWxpdHksXG4gICAgICAvLyB0aGlzIG1lYW5zIHdlIGRvbid0IHN1YmRpdmlkZSBldmVubHkgYnV0IGNoZWNrIHRpbnkgaW50ZXJ2YWwgYXQgaW5zZXJ0aW9uIHBvc2l0aW9uIGZpcnN0bHkuLi5cbiAgICAgIHZhciBzdGFydCA9IE1hdGgubWF4KDAsIHRoaXMubGFzdEluc2VydGlvblBvaW50KTtcbiAgICAgIHZhciBlbmQgPSBNYXRoLm1pbihtb2RlbHMubGVuZ3RoLCB0aGlzLmxhc3RJbnNlcnRpb25Qb2ludCArIDMpO1xuICAgICAgaWYgKGVuZCAtIHN0YXJ0ID4gMSkge1xuICAgICAgICAvLyBmb2N1cyBvbiAoc3RhcnQ7ZW5kXSByYW5nZSBzcGVlZGluZyB1cCBiaW5hcnkgc2VhcmNoZXMgYnkgdGFraW5nIGxvY2FsaXR5IGludG8gYWNjb3VudFxuICAgICAgICB2YXIgcG9pbnQgPSB0aGlzLmluc2VydGlvblBvaW50QmluYXJ5U2VhcmNoKGF0dHJpYnV0ZXMsIG1vZGVscywgc3RhcnQsIGVuZCk7XG4gICAgICAgIGlmIChwb2ludCA+PSBlbmQpIHtcbiAgICAgICAgICAvLyBzZWxlY3QgdXBwZXIgaW50ZXJ2YWxcbiAgICAgICAgICBpZiAocG9pbnQgPCBtb2RlbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICBwb2ludCA9IHRoaXMuaW5zZXJ0aW9uUG9pbnRCaW5hcnlTZWFyY2goYXR0cmlidXRlcywgbW9kZWxzLCBwb2ludCwgbW9kZWxzLmxlbmd0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHBvaW50IDwgc3RhcnQpIHtcbiAgICAgICAgICAvLyBzZWxlY3QgbG93ZXIgaW50ZXJ2YWxcbiAgICAgICAgICBpZiAocG9pbnQgPiAwKSB7XG4gICAgICAgICAgICBwb2ludCA9IHRoaXMuaW5zZXJ0aW9uUG9pbnRCaW5hcnlTZWFyY2goYXR0cmlidXRlcywgbW9kZWxzLCAwLCBwb2ludCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMubGFzdEluc2VydGlvblBvaW50ID0gcG9pbnQ7XG4gICAgICAgIHJldHVybiBwb2ludDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBsb2NhbGl0eSBub3QgYXBwbGljYWJsZSBvciBkaWQgbm90IHdvcmtcbiAgICB0aGlzLmxhc3RJbnNlcnRpb25Qb2ludCA9IHRoaXMuaW5zZXJ0aW9uUG9pbnRCaW5hcnlTZWFyY2goYXR0cmlidXRlcywgbW9kZWxzLCAwLCBtb2RlbHMubGVuZ3RoKTtcbiAgICByZXR1cm4gdGhpcy5sYXN0SW5zZXJ0aW9uUG9pbnQ7XG4gIH1cblxuICAvKipcbiAgICogcGVyZm9ybXMgYSBiaW5hcnkgc2VhcmNoIGZvciBpbnNlcnRpb24gcG9pbnQgb2YgYXR0cmlidXRlcyBpbnRvIG1vZGVsc1tzdGFydDplbmRdIHNvcnRlZCBieSBjb21wYXJlRm4uXG4gICAqXG4gICAqIEBwYXJhbSBhdHRyaWJ1dGVzIGJlaW5nIGluc2VydGVkLlxuICAgKiBAcGFyYW0gbW9kZWxzIHNvcnRlZCBieSBjb21wYXJlRm4uXG4gICAqIEBwYXJhbSBjb21wYXJlIGZ1bmN0aW9uIGFzIG9mIEFycmF5LnNvcnQoKS5cbiAgICogQHBhcmFtIHN0YXJ0IGluY2x1c2l2ZSBpbmRleCBvZiBzZWFyY2ggaW50ZXJ2YWwuXG4gICAqIEBwYXJhbSBlbmQgZXhjbHVzaXZlIGluZGV4IG9mIHNlYXJjaCBpbnRlcnZhbC5cbiAgICogQHJldHVybiB7bnVtYmVyfSBpbnNlcnRpb24gcG9pbnQuXG4gICAqL1xuICBwcml2YXRlIGluc2VydGlvblBvaW50QmluYXJ5U2VhcmNoKGF0dHJpYnV0ZXM6IGFueSwgbW9kZWxzOiBNb2RlbFtdLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0OiBudW1iZXIsIGVuZDogbnVtYmVyKTogbnVtYmVyIHtcbiAgICB2YXIgcGl2b3QgPSAoc3RhcnQgKyBlbmQpID4+IDE7XG4gICAgdmFyIGRlbHRhID0gdGhpcy5jb21wYXJlRm4oYXR0cmlidXRlcywgbW9kZWxzW3Bpdm90XS5hdHRyaWJ1dGVzKTtcbiAgICBpZiAoZW5kIC0gc3RhcnQgPD0gMSkge1xuICAgICAgcmV0dXJuIGRlbHRhIDwgMCA/IHBpdm90IDogcGl2b3QgKyAxO1xuICAgIH0gZWxzZSBpZiAoZGVsdGEgPCAwKSB7XG4gICAgICAvLyBzZWxlY3QgbG93ZXIgaGFsZlxuICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0aW9uUG9pbnRCaW5hcnlTZWFyY2goYXR0cmlidXRlcywgbW9kZWxzLCBzdGFydCwgcGl2b3QpO1xuICAgIH0gZWxzZSBpZiAoZGVsdGEgPiAwKSB7XG4gICAgICAvLyBzZWxlY3QgdXBwZXIgaGFsZlxuICAgICAgaWYgKCsrcGl2b3QgPCBlbmQpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5zZXJ0aW9uUG9pbnRCaW5hcnlTZWFyY2goYXR0cmlidXRlcywgbW9kZWxzLCBwaXZvdCwgZW5kKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZXhhY3QgbWF0Y2hcbiAgICB9XG4gICAgcmV0dXJuIHBpdm90O1xuICB9XG59XG4iXX0=