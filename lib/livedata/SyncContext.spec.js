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
    }(Model_1.Model));
    TestModel.prototype.idAttribute = 'id';
    TestModel.prototype.entity = 'approval';
    var TestCollection = (function (_super) {
        __extends(TestCollection, _super);
        function TestCollection() {
            _super.apply(this, arguments);
        }
        return TestCollection;
    }(Collection_1.Collection));
    TestCollection.prototype.model = TestModel;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFFdEMsK0JBQTRCLGtCQUFrQixDQUFDLENBQUE7QUFDL0MsSUFBWSxJQUFJLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFDcEMsMEJBQXlCLGtCQUFrQixDQUFDLENBQUE7QUFFNUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEIsaUNBQWlDO0lBQ2pDO1FBQXdCLDZCQUFLO1FBQTdCO1lBQXdCLDhCQUFLO1FBQzdCLENBQUM7UUFBRCxnQkFBQztJQUFELENBQUMsQUFERCxDQUF3QixhQUFLLEdBQzVCO0lBQ0QsU0FBUyxDQUFDLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0lBQ3ZDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztJQUV4QztRQUE2QixrQ0FBVTtRQUF2QztZQUE2Qiw4QkFBVTtRQUN2QyxDQUFDO1FBQUQscUJBQUM7SUFBRCxDQUFDLEFBREQsQ0FBNkIsdUJBQVUsR0FDdEM7SUFDRCxjQUFjLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxTQUFTLENBQUM7SUFFM0MsTUFBTSxDQUFDO1FBQ0wsTUFBTSxDQUFDLHNCQUFVLENBQUMsS0FBSyxDQUFD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QUFNLENBQUMsT0FBTyxDQUFDO2dCQUNqQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMS4wNy4yMDE1XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XHJcblxyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5cclxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcclxuXHJcbmltcG9ydCB7bWFrZUFwcHJvdmFsc30gZnJvbSAnLi9hcHByb3ZhbHMuZGF0YSc7XHJcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi4vd2ViL3VybHMnO1xyXG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMudGltZW91dCg2MDAwMCk7XHJcblxyXG4gIC8vIHByZXBhcmUgbW9kZWwvY29sbGVjdGlvbiB0eXBlc1xyXG4gIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsIHtcclxuICB9XHJcbiAgVGVzdE1vZGVsLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdpZCc7XHJcbiAgVGVzdE1vZGVsLnByb3RvdHlwZS5lbnRpdHkgPSAnYXBwcm92YWwnO1xyXG5cclxuICBjbGFzcyBUZXN0Q29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24ge1xyXG4gIH1cclxuICBUZXN0Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBUZXN0TW9kZWw7XHJcblxyXG4gIGJlZm9yZShmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xyXG4gICAgICBUZXN0Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgU3luY1N0b3JlKHt9KTtcclxuICAgICAgVGVzdENvbGxlY3Rpb24ucHJvdG90eXBlLnVybCA9IHVybHMucmVzb2x2ZVVybCgnYXBpL3YxL2FwcHJvdmFscy8nLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0ZXN0U2VydmVyLnNlcnZlclVybCxcclxuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJ1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBsb2FkcyBkYXRhIHVzaW5nIGNvbGxlY3Rpb24sIHJldHVybnMgcHJvbWlzZSBvbiBjb2xsZWN0aW9uLCBjb2xsZWN0aW9uIGlzIGVtcHR5IGFmdGVyd2FyZHNcclxuICBmdW5jdGlvbiBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uLCBkYXRhOiBhbnlbXSk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XHJcbiAgICByZXR1cm4gUShjb2xsZWN0aW9uLmZldGNoKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyBkZWxldGUgYWxsIGJlZm9yZSBydW5uaW5nIHRlc3RzXHJcbiAgICAgIHJldHVybiBRLmFsbChjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpLm1hcChmdW5jdGlvbiAobW9kZWwpIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveSgpO1xyXG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgMCwgJ2NvbGxlY3Rpb24gbXVzdCBiZSBlbXB0eSBpbml0aWFsbHkgYWZ0ZXIgZGVzdHJveScpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xyXG4gICAgICB9KTtcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbGxlY3Rpb24yKSB7XHJcbiAgICAgIC8vIGxvYWQgc2FtcGxlIGRhdGEgaW50byBmcmVzaCBkYXRhYmFzZVxyXG4gICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIsIGNvbGxlY3Rpb24sICdzYW1lIGNvbGxlY3Rpb24gb2JqZWN0Jyk7XHJcbiAgICAgIHJldHVybiBRLmFsbChkYXRhLm1hcChmdW5jdGlvbiAoYXR0cnMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRlc3RNb2RlbChhdHRycywge1xyXG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbjJcclxuICAgICAgICB9KS5zYXZlKCk7XHJcbiAgICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIubW9kZWxzLmxlbmd0aCwgZGF0YS5sZW5ndGgsICdjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIGJ5IGFzeW5jIGV2ZW50cycpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uMjtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHZhciBxQXBwcm92YWxzOiBRLlByb21pc2U8YW55W10+O1xyXG5cclxuICBmdW5jdGlvbiBsb2FkQXBwcm92YWxzKCkge1xyXG4gICAgaWYgKCFxQXBwcm92YWxzKSB7XHJcbiAgICAgIHZhciBhcHByb3ZhbHMgPSBtYWtlQXBwcm92YWxzKCk7XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gbmV3IFRlc3RDb2xsZWN0aW9uKCk7XHJcbiAgICAgIHFBcHByb3ZhbHMgPSBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uLCBhcHByb3ZhbHMpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGNvbGxlY3Rpb24uc3RvcExpc3RlbmluZygpOyAvLyBubyBsb25nZXIgbGl2ZVxyXG4gICAgICAgIHJldHVybiBhcHByb3ZhbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgcmV0dXJuIGEuaWQubG9jYWxlQ29tcGFyZShiLmlkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcUFwcHJvdmFscztcclxuICB9XHJcblxyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ3ByZWxvYWRzIHNhbXBsZSBkYXRhJywgKCkgPT4ge1xyXG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2luZmluaXRlIHNjcm9sbGluZycsICgpID0+IHtcclxuICAgICAgdmFyIGFwcHJvdmFsczogYW55W107XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gbmV3IFRlc3RDb2xsZWN0aW9uKCk7XHJcbiAgICAgIHZhciBjb3VudGVyID0gMTA7XHJcbiAgICAgIHJldHVybiBsb2FkQXBwcm92YWxzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XHJcbiAgICAgICAgdmFyIG9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgICAgIGxpbWl0OiBjb3VudGVyLFxyXG4gICAgICAgICAgc29ydE9yZGVyOiBbICdpZCcgXVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIFEoY29sbGVjdGlvbi5mZXRjaChvcHRpb25zKSkudGhlblJlc29sdmUob3B0aW9ucyk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc2Nyb2xsKG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCBjb3VudGVyLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XHJcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZSgwLCBjb3VudGVyKSwgJ2VsZW1lbnRzIGFyZSBmZXRjaGVkIHByb3Blcmx5Jyk7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuZW5kKSB7XHJcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaE1vcmUob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLmVuZCwgdHJ1ZSwgJ2F0IGVuZCBvZiBzY3JvbGxpbmcnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBvbGRDb3VudGVyID0gY291bnRlcjtcclxuICAgICAgICAgICAgY291bnRlciA9IE1hdGgubWluKGFwcHJvdmFscy5sZW5ndGgsIGNvdW50ZXIgKyAxMCk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgY291bnRlciAtIG9sZENvdW50ZXIsICdudW1iZXIgb2YgcmVzdWx0cyByZXR1cm5lZCcpO1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5tb3JlLCB0cnVlLCAnY2FuIHNjcm9sbCBtb3JlJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcclxuICAgICAgICB9KS50aGVuKHNjcm9sbCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ25leHQvcHJldiBwYWdpbmcnLCAoKSA9PiB7XHJcbiAgICAgIHZhciBhcHByb3ZhbHM6IGFueVtdO1xyXG4gICAgICB2YXIgY29sbGVjdGlvbiA9IG5ldyBUZXN0Q29sbGVjdGlvbigpO1xyXG4gICAgICB2YXIgaSA9IDA7XHJcbiAgICAgIHJldHVybiBsb2FkQXBwcm92YWxzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICBsaW1pdDogMSxcclxuICAgICAgICAgIHNvcnRPcmRlcjogWyAnaWQnIF1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiAoPGFueT5jb2xsZWN0aW9uLmZldGNoKG9wdGlvbnMpKS50aGVuUmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgfSkudGhlbihmdW5jdGlvbiBuZXh0KG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XHJcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZShpLCBpICsgMSksICdlbGVtZW50IGZldGNoZWQgcHJvcGVybHknKTtcclxuICAgICAgICBpZiAoIW9wdGlvbnMubmV4dCAmJiBpID4gMSkge1xyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgKytpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uLmZldGNoTmV4dChvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHRzKSB7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5wcmV2LCB0cnVlLCAnY2FuIHBhZ2UgcHJldicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLm5leHQsIGkgKyAxIDwgYXBwcm92YWxzLmxlbmd0aCwgJ2NhbiBwYWdlIG5leHQnKTtcclxuICAgICAgICAgIHJldHVybiBvcHRpb25zO1xyXG4gICAgICAgIH0pLnRoZW4obmV4dCk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gcHJldihvcHRpb25zKTogUHJvbWlzZUxpa2U8YW55PiB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMucHJldiwgaSA+IDAsICdjYW4gcGFnZSBwcmV2Jyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubmV4dCwgaSArIDEgPCBhcHByb3ZhbHMubGVuZ3RoLCAnY2FuIHBhZ2UgbmV4dCcpO1xyXG4gICAgICAgIGlmICghb3B0aW9ucy5wcmV2KSB7XHJcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaFByZXYob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDEsICdudW1iZXIgb2YgbW9kZWxzIHJldHJpZXZlZCBzbyBmYXInKTtcclxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgICAgcmV0dXJuIHguYXR0cmlidXRlcztcclxuICAgICAgICAgIH0pLCBhcHByb3ZhbHMuc2xpY2UoaSAtIDEsIGkpLCAnZWxlbWVudCBmZXRjaGVkIHByb3Blcmx5Jyk7XHJcbiAgICAgICAgICAtLWk7XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcclxuICAgICAgICB9KS50aGVuKHByZXYpO1xyXG4gICAgICB9KTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=