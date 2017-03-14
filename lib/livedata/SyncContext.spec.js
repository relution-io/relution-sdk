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
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(60000);
    var urlRoot = 'api/v1/approvals/';
    var store;
    // prepare model/collection types
    var TestModel = (function (_super) {
        __extends(TestModel, _super);
        function TestModel() {
            _super.apply(this, arguments);
        }
        return TestModel;
    }(Model_1.Model.defaults({
        idAttribute: 'id',
        entity: 'approval',
        urlRoot: urlRoot
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
            store = new SyncStore_1.SyncStore({
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
            var collection = store.createCollection(TestCollection);
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
            var collection = store.createCollection(TestCollection);
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
            var collection = store.createCollection(TestCollection);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFFdEMsK0JBQTRCLGtCQUFrQixDQUFDLENBQUE7QUFFL0MsMEJBQXlCLGtCQUFrQixDQUFDLENBQUE7QUFFNUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7SUFDbEMsSUFBSSxLQUFnQixDQUFDO0lBRXJCLGlDQUFpQztJQUNqQztRQUF3Qiw2QkFJdEI7UUFKRjtZQUF3Qiw4QkFJdEI7UUFBRSxDQUFDO1FBQUQsZ0JBQUM7SUFBRCxDQUFDLEFBSkwsQ0FBd0IsYUFBSyxDQUFDLFFBQVEsQ0FBQztRQUNyQyxXQUFXLEVBQUUsSUFBSTtRQUNqQixNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUUsT0FBTztLQUNqQixDQUFDLEdBQUc7SUFFTDtRQUE2QixrQ0FFM0I7UUFGRjtZQUE2Qiw4QkFFM0I7UUFBRSxDQUFDO1FBQUQscUJBQUM7SUFBRCxDQUFDLEFBRkwsQ0FBNkIsdUJBQVUsQ0FBQyxRQUFRLENBQUM7UUFDL0MsS0FBSyxFQUFFLFNBQVM7S0FDakIsQ0FBQyxHQUFHO0lBRUwsTUFBTSxDQUFDO1FBQ0wsTUFBTSxDQUFDLHNCQUFV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QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMS4wNy4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcblxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcblxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQge1N5bmNTdG9yZX0gZnJvbSAnLi9TeW5jU3RvcmUnO1xuXG5pbXBvcnQge21ha2VBcHByb3ZhbHN9IGZyb20gJy4vYXBwcm92YWxzLmRhdGEnO1xuaW1wb3J0ICogYXMgdXJscyBmcm9tICcuLi93ZWIvdXJscyc7XG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHRoaXMudGltZW91dCg2MDAwMCk7XG4gIHZhciB1cmxSb290ID0gJ2FwaS92MS9hcHByb3ZhbHMvJztcbiAgdmFyIHN0b3JlOiBTeW5jU3RvcmU7XG5cbiAgLy8gcHJlcGFyZSBtb2RlbC9jb2xsZWN0aW9uIHR5cGVzXG4gIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICBpZEF0dHJpYnV0ZTogJ2lkJyxcbiAgICBlbnRpdHk6ICdhcHByb3ZhbCcsXG4gICAgdXJsUm9vdDogdXJsUm9vdFxuICB9KSB7fVxuXG4gIGNsYXNzIFRlc3RDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbi5kZWZhdWx0cyh7XG4gICAgbW9kZWw6IFRlc3RNb2RlbFxuICB9KSB7fVxuXG4gIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGVzdFNlcnZlci5sb2dpbi50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgIHN0b3JlID0gbmV3IFN5bmNTdG9yZSh7XG4gICAgICAgIGFwcGxpY2F0aW9uOiAncmVsdXRpb25zZGsnXG4gICAgICB9KTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSk7XG4gIH0pO1xuXG4gIC8vIGxvYWRzIGRhdGEgdXNpbmcgY29sbGVjdGlvbiwgcmV0dXJucyBwcm9taXNlIG9uIGNvbGxlY3Rpb24sIGNvbGxlY3Rpb24gaXMgZW1wdHkgYWZ0ZXJ3YXJkc1xuICBmdW5jdGlvbiBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uLCBkYXRhOiBhbnlbXSk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XG4gICAgcmV0dXJuIFEoY29sbGVjdGlvbi5mZXRjaCgpKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIGRlbGV0ZSBhbGwgYmVmb3JlIHJ1bm5pbmcgdGVzdHNcbiAgICAgIHJldHVybiBRLmFsbChjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpLm1hcChmdW5jdGlvbiAobW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKTtcbiAgICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgMCwgJ2NvbGxlY3Rpb24gbXVzdCBiZSBlbXB0eSBpbml0aWFsbHkgYWZ0ZXIgZGVzdHJveScpO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcbiAgICAgIH0pO1xuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbGxlY3Rpb24yKSB7XG4gICAgICAvLyBsb2FkIHNhbXBsZSBkYXRhIGludG8gZnJlc2ggZGF0YWJhc2VcbiAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uMiwgY29sbGVjdGlvbiwgJ3NhbWUgY29sbGVjdGlvbiBvYmplY3QnKTtcbiAgICAgIHJldHVybiBRLmFsbChkYXRhLm1hcChmdW5jdGlvbiAoYXR0cnMpIHtcbiAgICAgICAgcmV0dXJuIG5ldyBUZXN0TW9kZWwoYXR0cnMsIHtcbiAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uMlxuICAgICAgICB9KS5zYXZlKCk7XG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uMi5tb2RlbHMubGVuZ3RoLCBkYXRhLmxlbmd0aCwgJ2NvbGxlY3Rpb24gd2FzIHVwZGF0ZWQgYnkgYXN5bmMgZXZlbnRzJyk7XG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uMjtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIHFBcHByb3ZhbHM6IFEuUHJvbWlzZTxhbnlbXT47XG5cbiAgZnVuY3Rpb24gbG9hZEFwcHJvdmFscygpIHtcbiAgICBpZiAoIXFBcHByb3ZhbHMpIHtcbiAgICAgIHZhciBhcHByb3ZhbHMgPSBtYWtlQXBwcm92YWxzKCk7XG4gICAgICB2YXIgY29sbGVjdGlvbiA9IHN0b3JlLmNyZWF0ZUNvbGxlY3Rpb24oVGVzdENvbGxlY3Rpb24pO1xuICAgICAgcUFwcHJvdmFscyA9IGxvYWRDb2xsZWN0aW9uKGNvbGxlY3Rpb24sIGFwcHJvdmFscykudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNvbGxlY3Rpb24uc3RvcExpc3RlbmluZygpOyAvLyBubyBsb25nZXIgbGl2ZVxuICAgICAgICByZXR1cm4gYXBwcm92YWxzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgICByZXR1cm4gYS5pZC5sb2NhbGVDb21wYXJlKGIuaWQpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcUFwcHJvdmFscztcbiAgfVxuXG4gIHJldHVybiBbXG5cbiAgICBpdCgncHJlbG9hZHMgc2FtcGxlIGRhdGEnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2luZmluaXRlIHNjcm9sbGluZycsICgpID0+IHtcbiAgICAgIHZhciBhcHByb3ZhbHM6IGFueVtdO1xuICAgICAgdmFyIGNvbGxlY3Rpb24gPSBzdG9yZS5jcmVhdGVDb2xsZWN0aW9uKFRlc3RDb2xsZWN0aW9uKTtcbiAgICAgIHZhciBjb3VudGVyID0gMTA7XG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgYXBwcm92YWxzID0gZGF0YTtcbiAgICAgICAgdmFyIG9wdGlvbnM6IGFueSA9IHtcbiAgICAgICAgICBsaW1pdDogY291bnRlcixcbiAgICAgICAgICBzb3J0T3JkZXI6IFsgJ2lkJyBdXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBRKGNvbGxlY3Rpb24uZmV0Y2gob3B0aW9ucykpLnRoZW5SZXNvbHZlKG9wdGlvbnMpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiBzY3JvbGwob3B0aW9ucyk6IFByb21pc2VMaWtlPGFueT4ge1xuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCBjb3VudGVyLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgZGVsZXRlIHguYXR0cmlidXRlcy5fdGltZTsgLy8gc2VydmVyIGFkZHMgdGhpcywgd2UgZG9uJ3Qgd2FudCBpdFxuICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XG4gICAgICAgIH0pLCBhcHByb3ZhbHMuc2xpY2UoMCwgY291bnRlciksICdlbGVtZW50cyBhcmUgZmV0Y2hlZCBwcm9wZXJseScpO1xuICAgICAgICBpZiAob3B0aW9ucy5lbmQpIHtcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uLmZldGNoTW9yZShvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHRzKSB7XG4gICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5lbmQsIHRydWUsICdhdCBlbmQgb2Ygc2Nyb2xsaW5nJyk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciBvbGRDb3VudGVyID0gY291bnRlcjtcbiAgICAgICAgICAgIGNvdW50ZXIgPSBNYXRoLm1pbihhcHByb3ZhbHMubGVuZ3RoLCBjb3VudGVyICsgMTApO1xuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCBjb3VudGVyIC0gb2xkQ291bnRlciwgJ251bWJlciBvZiByZXN1bHRzIHJldHVybmVkJyk7XG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5tb3JlLCB0cnVlLCAnY2FuIHNjcm9sbCBtb3JlJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBvcHRpb25zO1xuICAgICAgICB9KS50aGVuKHNjcm9sbCk7XG4gICAgICB9KTtcbiAgICB9KSxcblxuICAgIGl0KCduZXh0L3ByZXYgcGFnaW5nJywgKCkgPT4ge1xuICAgICAgdmFyIGFwcHJvdmFsczogYW55W107XG4gICAgICB2YXIgY29sbGVjdGlvbiA9IHN0b3JlLmNyZWF0ZUNvbGxlY3Rpb24oVGVzdENvbGxlY3Rpb24pO1xuICAgICAgdmFyIGkgPSAwO1xuICAgICAgcmV0dXJuIGxvYWRBcHByb3ZhbHMoKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XG4gICAgICAgIHZhciBvcHRpb25zID0ge1xuICAgICAgICAgIGxpbWl0OiAxLFxuICAgICAgICAgIHNvcnRPcmRlcjogWyAnaWQnIF1cbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuICg8YW55PmNvbGxlY3Rpb24uZmV0Y2gob3B0aW9ucykpLnRoZW5SZXNvbHZlKG9wdGlvbnMpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbiBuZXh0KG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgMSwgJ251bWJlciBvZiBtb2RlbHMgcmV0cmlldmVkIHNvIGZhcicpO1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcbiAgICAgICAgICByZXR1cm4geC5hdHRyaWJ1dGVzO1xuICAgICAgICB9KSwgYXBwcm92YWxzLnNsaWNlKGksIGkgKyAxKSwgJ2VsZW1lbnQgZmV0Y2hlZCBwcm9wZXJseScpO1xuICAgICAgICBpZiAoIW9wdGlvbnMubmV4dCAmJiBpID4gMSkge1xuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgKytpO1xuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaE5leHQob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLnByZXYsIHRydWUsICdjYW4gcGFnZSBwcmV2Jyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5uZXh0LCBpICsgMSA8IGFwcHJvdmFscy5sZW5ndGgsICdjYW4gcGFnZSBuZXh0Jyk7XG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XG4gICAgICAgIH0pLnRoZW4obmV4dCk7XG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIHByZXYob3B0aW9ucyk6IFByb21pc2VMaWtlPGFueT4ge1xuICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5wcmV2LCBpID4gMCwgJ2NhbiBwYWdlIHByZXYnKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubmV4dCwgaSArIDEgPCBhcHByb3ZhbHMubGVuZ3RoLCAnY2FuIHBhZ2UgbmV4dCcpO1xuICAgICAgICBpZiAoIW9wdGlvbnMucHJldikge1xuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUob3B0aW9ucyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uZmV0Y2hQcmV2KG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5sZW5ndGgsIDEsICdudW1iZXIgb2YgcmVzdWx0cyByZXR1cm5lZCcpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDEsICdudW1iZXIgb2YgbW9kZWxzIHJldHJpZXZlZCBzbyBmYXInKTtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLm1hcChmdW5jdGlvbiAoeCkge1xuICAgICAgICAgICAgZGVsZXRlIHguYXR0cmlidXRlcy5fdGltZTsgLy8gc2VydmVyIGFkZHMgdGhpcywgd2UgZG9uJ3Qgd2FudCBpdFxuICAgICAgICAgICAgcmV0dXJuIHguYXR0cmlidXRlcztcbiAgICAgICAgICB9KSwgYXBwcm92YWxzLnNsaWNlKGkgLSAxLCBpKSwgJ2VsZW1lbnQgZmV0Y2hlZCBwcm9wZXJseScpO1xuICAgICAgICAgIC0taTtcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcbiAgICAgICAgfSkudGhlbihwcmV2KTtcbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19