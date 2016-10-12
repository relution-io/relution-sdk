/*
 * @file livedata/SyncContext.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.07.2015
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
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var Q = require('q');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var SyncStore_1 = require('./SyncStore');
var approvals_data_1 = require('./approvals.data');
var urls = require('../web/urls');
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(60000);
    // prepare model/collection types
    var TestModel = (function (_super) {
        __extends(TestModel, _super);
        function TestModel() {
            _super.apply(this, arguments);
        }
        return TestModel;
    }(Model_1.Model.defaults({
        idAttribute: 'id',
        entity: 'approval'
    })));
    var TestCollection = (function (_super) {
        __extends(TestCollection, _super);
        function TestCollection() {
            _super.apply(this, arguments);
        }
        return TestCollection;
    }(Collection_1.Collection.defaults({
        model: TestModel
    })));
    before(function () {
        return http_spec_1.testServer.login.then(function (result) {
            TestCollection.prototype.store = new SyncStore_1.SyncStore({});
            TestCollection.prototype.url = urls.resolveUrl('api/v1/approvals/', {
                serverUrl: http_spec_1.testServer.serverUrl,
                application: 'relutionsdk'
            });
            return result;
        });
    });
    // loads data using collection, returns promise on collection, collection is empty afterwards
    function loadCollection(collection, data) {
        return Q(collection.fetch()).then(function () {
            // delete all before running tests
            return Q.all(collection.models.slice().map(function (model) {
                return model.destroy();
            })).then(function () {
                chai_1.assert.equal(collection.models.length, 0, 'collection must be empty initially after destroy');
                return collection;
            });
        }).then(function (collection2) {
            // load sample data into fresh database
            chai_1.assert.equal(collection2, collection, 'same collection object');
            return Q.all(data.map(function (attrs) {
                return new TestModel(attrs, {
                    collection: collection2
                }).save();
            })).then(function () {
                chai_1.assert.equal(collection2.models.length, data.length, 'collection was updated by async events');
                return collection2;
            });
        });
    }
    var qApprovals;
    function loadApprovals() {
        if (!qApprovals) {
            var approvals = approvals_data_1.makeApprovals();
            var collection = new TestCollection();
            qApprovals = loadCollection(collection, approvals).then(function () {
                collection.stopListening(); // no longer live
                return approvals.sort(function (a, b) {
                    return a.id.localeCompare(b.id);
                });
            });
        }
        return qApprovals;
    }
    return [
        it('preloads sample data', function () {
            return loadApprovals();
        }),
        it('infinite scrolling', function () {
            var approvals;
            var collection = new TestCollection();
            var counter = 10;
            return loadApprovals().then(function (data) {
                approvals = data;
                var options = {
                    limit: counter,
                    sortOrder: ['id']
                };
                return Q(collection.fetch(options)).thenResolve(options);
            }).then(function scroll(options) {
                chai_1.assert.equal(collection.models.length, counter, 'number of models retrieved so far');
                chai_1.assert.deepEqual(collection.models.map(function (x) {
                    delete x.attributes._time; // server adds this, we don't want it
                    return x.attributes;
                }), approvals.slice(0, counter), 'elements are fetched properly');
                if (options.end) {
                    return Q.resolve(options);
                }
                return collection.fetchMore(options).then(function (results) {
                    if (results.length === 0) {
                        chai_1.assert.equal(options.end, true, 'at end of scrolling');
                    }
                    else {
                        var oldCounter = counter;
                        counter = Math.min(approvals.length, counter + 10);
                        chai_1.assert.equal(results.length, counter - oldCounter, 'number of results returned');
                        chai_1.assert.equal(options.more, true, 'can scroll more');
                    }
                    return options;
                }).then(scroll);
            });
        }),
        it('next/prev paging', function () {
            var approvals;
            var collection = new TestCollection();
            var i = 0;
            return loadApprovals().then(function (data) {
                approvals = data;
                var options = {
                    limit: 1,
                    sortOrder: ['id']
                };
                return collection.fetch(options).thenResolve(options);
            }).then(function next(options) {
                chai_1.assert.equal(collection.models.length, 1, 'number of models retrieved so far');
                chai_1.assert.deepEqual(collection.models.map(function (x) {
                    delete x.attributes._time; // server adds this, we don't want it
                    return x.attributes;
                }), approvals.slice(i, i + 1), 'element fetched properly');
                if (!options.next && i > 1) {
                    return Q.resolve(options);
                }
                ++i;
                return collection.fetchNext(options).then(function (results) {
                    chai_1.assert.equal(options.prev, true, 'can page prev');
                    chai_1.assert.equal(results.length, 1, 'number of results returned');
                    chai_1.assert.equal(options.next, i + 1 < approvals.length, 'can page next');
                    return options;
                }).then(next);
            }).then(function prev(options) {
                chai_1.assert.equal(options.prev, i > 0, 'can page prev');
                chai_1.assert.equal(options.next, i + 1 < approvals.length, 'can page next');
                if (!options.prev) {
                    return Q.resolve(options);
                }
                return collection.fetchPrev(options).then(function (results) {
                    chai_1.assert.equal(results.length, 1, 'number of results returned');
                    chai_1.assert.equal(collection.models.length, 1, 'number of models retrieved so far');
                    chai_1.assert.deepEqual(collection.models.map(function (x) {
                        delete x.attributes._time; // server adds this, we don't want it
                        return x.attributes;
                    }), approvals.slice(i - 1, i), 'element fetched properly');
                    --i;
                    return options;
                }).then(prev);
            });
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFFdEMsK0JBQTRCLGtCQUFrQixDQUFDLENBQUE7QUFDL0MsSUFBWSxJQUFJLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFDcEMsMEJBQXlCLGtCQUFrQixDQUFDLENBQUE7QUFFNUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEIsaUNBQWlDO0lBQ2pDO1FBQXdCLDZCQUd0QjtRQUhGO1lBQXdCLDhCQUd0QjtRQUFFLENBQUM7UUFBRCxnQkFBQztJQUFELENBQUMsQUFITCxDQUF3QixhQUFLLENBQUMsUUFBUSxDQUFDO1FBQ3JDLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLE1BQU0sRUFBRSxVQUFVO0tBQ25CLENBQUMsR0FBRztJQUVMO1FBQTZCLGtDQUUzQjtRQUZGO1lBQTZCLDhCQUUzQjtRQUFFLENBQUM7UUFBRCxxQkFBQztJQUFELENBQUMsQUFGTCxDQUE2Qix1QkFBVSxDQUFDLFFBQVEsQ0FBQztRQUMvQyxLQUFLLEVBQUUsU0FBUztLQUNqQixDQUFDLEdBQUc7SUFFTCxNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNs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LENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMS4wNy4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcblxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcblxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQge1N5bmNTdG9yZX0gZnJvbSAnLi9TeW5jU3RvcmUnO1xuXG5pbXBvcnQge21ha2VBcHByb3ZhbHN9IGZyb20gJy4vYXBwcm92YWxzLmRhdGEnO1xuaW1wb3J0ICogYXMgdXJscyBmcm9tICcuLi93ZWIvdXJscyc7XG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHRoaXMudGltZW91dCg2MDAwMCk7XG5cbiAgLy8gcHJlcGFyZSBtb2RlbC9jb2xsZWN0aW9uIHR5cGVzXG4gIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICBpZEF0dHJpYnV0ZTogJ2lkJyxcbiAgICBlbnRpdHk6ICdhcHByb3ZhbCdcbiAgfSkge31cblxuICBjbGFzcyBUZXN0Q29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24uZGVmYXVsdHMoe1xuICAgIG1vZGVsOiBUZXN0TW9kZWxcbiAgfSkge31cblxuICBiZWZvcmUoZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRlc3RTZXJ2ZXIubG9naW4udGhlbigocmVzdWx0KSA9PiB7XG4gICAgICBUZXN0Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgU3luY1N0b3JlKHt9KTtcbiAgICAgIFRlc3RDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSB1cmxzLnJlc29sdmVVcmwoJ2FwaS92MS9hcHByb3ZhbHMvJywge1xuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJ1xuICAgICAgfSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0pO1xuICB9KTtcblxuICAvLyBsb2FkcyBkYXRhIHVzaW5nIGNvbGxlY3Rpb24sIHJldHVybnMgcHJvbWlzZSBvbiBjb2xsZWN0aW9uLCBjb2xsZWN0aW9uIGlzIGVtcHR5IGFmdGVyd2FyZHNcbiAgZnVuY3Rpb24gbG9hZENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgZGF0YTogYW55W10pOiBRLlByb21pc2U8Q29sbGVjdGlvbj4ge1xuICAgIHJldHVybiBRKGNvbGxlY3Rpb24uZmV0Y2goKSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBkZWxldGUgYWxsIGJlZm9yZSBydW5uaW5nIHRlc3RzXG4gICAgICByZXR1cm4gUS5hbGwoY29sbGVjdGlvbi5tb2RlbHMuc2xpY2UoKS5tYXAoZnVuY3Rpb24gKG1vZGVsKSB7XG4gICAgICAgIHJldHVybiBtb2RlbC5kZXN0cm95KCk7XG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDAsICdjb2xsZWN0aW9uIG11c3QgYmUgZW1wdHkgaW5pdGlhbGx5IGFmdGVyIGRlc3Ryb3knKTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb247XG4gICAgICB9KTtcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChjb2xsZWN0aW9uMikge1xuICAgICAgLy8gbG9hZCBzYW1wbGUgZGF0YSBpbnRvIGZyZXNoIGRhdGFiYXNlXG4gICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIsIGNvbGxlY3Rpb24sICdzYW1lIGNvbGxlY3Rpb24gb2JqZWN0Jyk7XG4gICAgICByZXR1cm4gUS5hbGwoZGF0YS5tYXAoZnVuY3Rpb24gKGF0dHJzKSB7XG4gICAgICAgIHJldHVybiBuZXcgVGVzdE1vZGVsKGF0dHJzLCB7XG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbjJcbiAgICAgICAgfSkuc2F2ZSgpO1xuICAgICAgfSkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIubW9kZWxzLmxlbmd0aCwgZGF0YS5sZW5ndGgsICdjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIGJ5IGFzeW5jIGV2ZW50cycpO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbjI7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHZhciBxQXBwcm92YWxzOiBRLlByb21pc2U8YW55W10+O1xuXG4gIGZ1bmN0aW9uIGxvYWRBcHByb3ZhbHMoKSB7XG4gICAgaWYgKCFxQXBwcm92YWxzKSB7XG4gICAgICB2YXIgYXBwcm92YWxzID0gbWFrZUFwcHJvdmFscygpO1xuICAgICAgdmFyIGNvbGxlY3Rpb24gPSBuZXcgVGVzdENvbGxlY3Rpb24oKTtcbiAgICAgIHFBcHByb3ZhbHMgPSBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uLCBhcHByb3ZhbHMpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICBjb2xsZWN0aW9uLnN0b3BMaXN0ZW5pbmcoKTsgLy8gbm8gbG9uZ2VyIGxpdmVcbiAgICAgICAgcmV0dXJuIGFwcHJvdmFscy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XG4gICAgICAgICAgcmV0dXJuIGEuaWQubG9jYWxlQ29tcGFyZShiLmlkKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHFBcHByb3ZhbHM7XG4gIH1cblxuICByZXR1cm4gW1xuXG4gICAgaXQoJ3ByZWxvYWRzIHNhbXBsZSBkYXRhJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIGxvYWRBcHByb3ZhbHMoKTtcbiAgICB9KSxcblxuICAgIGl0KCdpbmZpbml0ZSBzY3JvbGxpbmcnLCAoKSA9PiB7XG4gICAgICB2YXIgYXBwcm92YWxzOiBhbnlbXTtcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gbmV3IFRlc3RDb2xsZWN0aW9uKCk7XG4gICAgICB2YXIgY291bnRlciA9IDEwO1xuICAgICAgcmV0dXJuIGxvYWRBcHByb3ZhbHMoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XG4gICAgICAgIHZhciBvcHRpb25zOiBhbnkgPSB7XG4gICAgICAgICAgbGltaXQ6IGNvdW50ZXIsXG4gICAgICAgICAgc29ydE9yZGVyOiBbICdpZCcgXVxuICAgICAgICB9O1xuICAgICAgICByZXR1cm4gUShjb2xsZWN0aW9uLmZldGNoKG9wdGlvbnMpKS50aGVuUmVzb2x2ZShvcHRpb25zKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc2Nyb2xsKG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgY291bnRlciwgJ251bWJlciBvZiBtb2RlbHMgcmV0cmlldmVkIHNvIGZhcicpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcbiAgICAgICAgICByZXR1cm4geC5hdHRyaWJ1dGVzO1xuICAgICAgICB9KSwgYXBwcm92YWxzLnNsaWNlKDAsIGNvdW50ZXIpLCAnZWxlbWVudHMgYXJlIGZldGNoZWQgcHJvcGVybHknKTtcbiAgICAgICAgaWYgKG9wdGlvbnMuZW5kKSB7XG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShvcHRpb25zKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaE1vcmUob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMuZW5kLCB0cnVlLCAnYXQgZW5kIG9mIHNjcm9sbGluZycpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgb2xkQ291bnRlciA9IGNvdW50ZXI7XG4gICAgICAgICAgICBjb3VudGVyID0gTWF0aC5taW4oYXBwcm92YWxzLmxlbmd0aCwgY291bnRlciArIDEwKTtcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgY291bnRlciAtIG9sZENvdW50ZXIsICdudW1iZXIgb2YgcmVzdWx0cyByZXR1cm5lZCcpO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubW9yZSwgdHJ1ZSwgJ2NhbiBzY3JvbGwgbW9yZScpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgfSkudGhlbihzY3JvbGwpO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnbmV4dC9wcmV2IHBhZ2luZycsICgpID0+IHtcbiAgICAgIHZhciBhcHByb3ZhbHM6IGFueVtdO1xuICAgICAgdmFyIGNvbGxlY3Rpb24gPSBuZXcgVGVzdENvbGxlY3Rpb24oKTtcbiAgICAgIHZhciBpID0gMDtcbiAgICAgIHJldHVybiBsb2FkQXBwcm92YWxzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICBhcHByb3ZhbHMgPSBkYXRhO1xuICAgICAgICB2YXIgb3B0aW9ucyA9IHtcbiAgICAgICAgICBsaW1pdDogMSxcbiAgICAgICAgICBzb3J0T3JkZXI6IFsgJ2lkJyBdXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiAoPGFueT5jb2xsZWN0aW9uLmZldGNoKG9wdGlvbnMpKS50aGVuUmVzb2x2ZShvcHRpb25zKTtcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gbmV4dChvcHRpb25zKTogUHJvbWlzZUxpa2U8YW55PiB7XG4gICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDEsICdudW1iZXIgb2YgbW9kZWxzIHJldHJpZXZlZCBzbyBmYXInKTtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICBkZWxldGUgeC5hdHRyaWJ1dGVzLl90aW1lOyAvLyBzZXJ2ZXIgYWRkcyB0aGlzLCB3ZSBkb24ndCB3YW50IGl0XG4gICAgICAgICAgcmV0dXJuIHguYXR0cmlidXRlcztcbiAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZShpLCBpICsgMSksICdlbGVtZW50IGZldGNoZWQgcHJvcGVybHknKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLm5leHQgJiYgaSA+IDEpIHtcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgICsraTtcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uZmV0Y2hOZXh0KG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5wcmV2LCB0cnVlLCAnY2FuIHBhZ2UgcHJldicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgMSwgJ251bWJlciBvZiByZXN1bHRzIHJldHVybmVkJyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubmV4dCwgaSArIDEgPCBhcHByb3ZhbHMubGVuZ3RoLCAnY2FuIHBhZ2UgbmV4dCcpO1xuICAgICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgICAgICB9KS50aGVuKG5leHQpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiBwcmV2KG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMucHJldiwgaSA+IDAsICdjYW4gcGFnZSBwcmV2Jyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLm5leHQsIGkgKyAxIDwgYXBwcm92YWxzLmxlbmd0aCwgJ2NhbiBwYWdlIG5leHQnKTtcbiAgICAgICAgaWYgKCFvcHRpb25zLnByZXYpIHtcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uLmZldGNoUHJldihvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHRzKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcbiAgICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XG4gICAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZShpIC0gMSwgaSksICdlbGVtZW50IGZldGNoZWQgcHJvcGVybHknKTtcbiAgICAgICAgICAtLWk7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICAgIH0pLnRoZW4ocHJldik7XG4gICAgICB9KTtcbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==