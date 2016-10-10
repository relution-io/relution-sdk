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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFFdEMsK0JBQTRCLGtCQUFrQixDQUFDLENBQUE7QUFDL0MsSUFBWSxJQUFJLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFDcEMsMEJBQXlCLGtCQUFrQixDQUFDLENBQUE7QUFFNUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFcEIsaUNBQWlDO0lBQ2pDO1FBQXdCLDZCQUd0QjtRQUhGO1lBQXdCLDhCQUd0QjtRQUFFLENBQUM7UUFBRCxnQkFBQztJQUFELENBQUMsQUFITCxDQUF3QixhQUFLLENBQUMsUUFBUSxDQUFDO1FBQ3JDLFdBQVcsRUFBRSxJQUFJO1FBQ2pCLE1BQU0sRUFBRSxVQUFVO0tBQ25CLENBQUMsR0FBRztJQUVMO1FBQTZCLGtDQUUzQjtRQUZGO1lBQTZCLDhCQUUzQjtRQUFFLENBQUM7UUFBRCxxQkFBQztJQUFELENBQUMsQUFGTCxDQUE2Qix1QkFBVSxDQUFDLFFBQVEsQ0FBQztRQUMvQyxLQUFLLEVBQUUsU0FBUztLQUNqQixDQUFDLEdBQUc7SUFFTCxNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNs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LENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNDb250ZXh0LnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAxLjA3LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcclxuXHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcblxyXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5pbXBvcnQge1N5bmNTdG9yZX0gZnJvbSAnLi9TeW5jU3RvcmUnO1xyXG5cclxuaW1wb3J0IHttYWtlQXBwcm92YWxzfSBmcm9tICcuL2FwcHJvdmFscy5kYXRhJztcclxuaW1wb3J0ICogYXMgdXJscyBmcm9tICcuLi93ZWIvdXJscyc7XHJcbmltcG9ydCB7dGVzdFNlcnZlcn0gZnJvbSAnLi4vd2ViL2h0dHAuc3BlYyc7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy50aW1lb3V0KDYwMDAwKTtcclxuXHJcbiAgLy8gcHJlcGFyZSBtb2RlbC9jb2xsZWN0aW9uIHR5cGVzXHJcbiAgY2xhc3MgVGVzdE1vZGVsIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgaWRBdHRyaWJ1dGU6ICdpZCcsXHJcbiAgICBlbnRpdHk6ICdhcHByb3ZhbCdcclxuICB9KSB7fVxyXG5cclxuICBjbGFzcyBUZXN0Q29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24uZGVmYXVsdHMoe1xyXG4gICAgbW9kZWw6IFRlc3RNb2RlbFxyXG4gIH0pIHt9XHJcblxyXG4gIGJlZm9yZShmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xyXG4gICAgICBUZXN0Q29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgU3luY1N0b3JlKHt9KTtcclxuICAgICAgVGVzdENvbGxlY3Rpb24ucHJvdG90eXBlLnVybCA9IHVybHMucmVzb2x2ZVVybCgnYXBpL3YxL2FwcHJvdmFscy8nLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0ZXN0U2VydmVyLnNlcnZlclVybCxcclxuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJ1xyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBsb2FkcyBkYXRhIHVzaW5nIGNvbGxlY3Rpb24sIHJldHVybnMgcHJvbWlzZSBvbiBjb2xsZWN0aW9uLCBjb2xsZWN0aW9uIGlzIGVtcHR5IGFmdGVyd2FyZHNcclxuICBmdW5jdGlvbiBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uLCBkYXRhOiBhbnlbXSk6IFEuUHJvbWlzZTxDb2xsZWN0aW9uPiB7XHJcbiAgICByZXR1cm4gUShjb2xsZWN0aW9uLmZldGNoKCkpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyBkZWxldGUgYWxsIGJlZm9yZSBydW5uaW5nIHRlc3RzXHJcbiAgICAgIHJldHVybiBRLmFsbChjb2xsZWN0aW9uLm1vZGVscy5zbGljZSgpLm1hcChmdW5jdGlvbiAobW9kZWwpIHtcclxuICAgICAgICByZXR1cm4gbW9kZWwuZGVzdHJveSgpO1xyXG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgMCwgJ2NvbGxlY3Rpb24gbXVzdCBiZSBlbXB0eSBpbml0aWFsbHkgYWZ0ZXIgZGVzdHJveScpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uO1xyXG4gICAgICB9KTtcclxuICAgIH0pLnRoZW4oZnVuY3Rpb24gKGNvbGxlY3Rpb24yKSB7XHJcbiAgICAgIC8vIGxvYWQgc2FtcGxlIGRhdGEgaW50byBmcmVzaCBkYXRhYmFzZVxyXG4gICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIsIGNvbGxlY3Rpb24sICdzYW1lIGNvbGxlY3Rpb24gb2JqZWN0Jyk7XHJcbiAgICAgIHJldHVybiBRLmFsbChkYXRhLm1hcChmdW5jdGlvbiAoYXR0cnMpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFRlc3RNb2RlbChhdHRycywge1xyXG4gICAgICAgICAgY29sbGVjdGlvbjogY29sbGVjdGlvbjJcclxuICAgICAgICB9KS5zYXZlKCk7XHJcbiAgICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbjIubW9kZWxzLmxlbmd0aCwgZGF0YS5sZW5ndGgsICdjb2xsZWN0aW9uIHdhcyB1cGRhdGVkIGJ5IGFzeW5jIGV2ZW50cycpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uMjtcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHZhciBxQXBwcm92YWxzOiBRLlByb21pc2U8YW55W10+O1xyXG5cclxuICBmdW5jdGlvbiBsb2FkQXBwcm92YWxzKCkge1xyXG4gICAgaWYgKCFxQXBwcm92YWxzKSB7XHJcbiAgICAgIHZhciBhcHByb3ZhbHMgPSBtYWtlQXBwcm92YWxzKCk7XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gbmV3IFRlc3RDb2xsZWN0aW9uKCk7XHJcbiAgICAgIHFBcHByb3ZhbHMgPSBsb2FkQ29sbGVjdGlvbihjb2xsZWN0aW9uLCBhcHByb3ZhbHMpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGNvbGxlY3Rpb24uc3RvcExpc3RlbmluZygpOyAvLyBubyBsb25nZXIgbGl2ZVxyXG4gICAgICAgIHJldHVybiBhcHByb3ZhbHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgICAgICAgcmV0dXJuIGEuaWQubG9jYWxlQ29tcGFyZShiLmlkKTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gcUFwcHJvdmFscztcclxuICB9XHJcblxyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ3ByZWxvYWRzIHNhbXBsZSBkYXRhJywgKCkgPT4ge1xyXG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2luZmluaXRlIHNjcm9sbGluZycsICgpID0+IHtcclxuICAgICAgdmFyIGFwcHJvdmFsczogYW55W107XHJcbiAgICAgIHZhciBjb2xsZWN0aW9uID0gbmV3IFRlc3RDb2xsZWN0aW9uKCk7XHJcbiAgICAgIHZhciBjb3VudGVyID0gMTA7XHJcbiAgICAgIHJldHVybiBsb2FkQXBwcm92YWxzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XHJcbiAgICAgICAgdmFyIG9wdGlvbnM6IGFueSA9IHtcclxuICAgICAgICAgIGxpbWl0OiBjb3VudGVyLFxyXG4gICAgICAgICAgc29ydE9yZGVyOiBbICdpZCcgXVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIFEoY29sbGVjdGlvbi5mZXRjaChvcHRpb25zKSkudGhlblJlc29sdmUob3B0aW9ucyk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gc2Nyb2xsKG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCBjb3VudGVyLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XHJcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZSgwLCBjb3VudGVyKSwgJ2VsZW1lbnRzIGFyZSBmZXRjaGVkIHByb3Blcmx5Jyk7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuZW5kKSB7XHJcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaE1vcmUob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLmVuZCwgdHJ1ZSwgJ2F0IGVuZCBvZiBzY3JvbGxpbmcnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBvbGRDb3VudGVyID0gY291bnRlcjtcclxuICAgICAgICAgICAgY291bnRlciA9IE1hdGgubWluKGFwcHJvdmFscy5sZW5ndGgsIGNvdW50ZXIgKyAxMCk7XHJcbiAgICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgY291bnRlciAtIG9sZENvdW50ZXIsICdudW1iZXIgb2YgcmVzdWx0cyByZXR1cm5lZCcpO1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5tb3JlLCB0cnVlLCAnY2FuIHNjcm9sbCBtb3JlJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcclxuICAgICAgICB9KS50aGVuKHNjcm9sbCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ25leHQvcHJldiBwYWdpbmcnLCAoKSA9PiB7XHJcbiAgICAgIHZhciBhcHByb3ZhbHM6IGFueVtdO1xyXG4gICAgICB2YXIgY29sbGVjdGlvbiA9IG5ldyBUZXN0Q29sbGVjdGlvbigpO1xyXG4gICAgICB2YXIgaSA9IDA7XHJcbiAgICAgIHJldHVybiBsb2FkQXBwcm92YWxzKCkudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgIGFwcHJvdmFscyA9IGRhdGE7XHJcbiAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICBsaW1pdDogMSxcclxuICAgICAgICAgIHNvcnRPcmRlcjogWyAnaWQnIF1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiAoPGFueT5jb2xsZWN0aW9uLmZldGNoKG9wdGlvbnMpKS50aGVuUmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgfSkudGhlbihmdW5jdGlvbiBuZXh0KG9wdGlvbnMpOiBQcm9taXNlTGlrZTxhbnk+IHtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XHJcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChjb2xsZWN0aW9uLm1vZGVscy5tYXAoZnVuY3Rpb24gKHgpIHtcclxuICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgfSksIGFwcHJvdmFscy5zbGljZShpLCBpICsgMSksICdlbGVtZW50IGZldGNoZWQgcHJvcGVybHknKTtcclxuICAgICAgICBpZiAoIW9wdGlvbnMubmV4dCAmJiBpID4gMSkge1xyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgKytpO1xyXG4gICAgICAgIHJldHVybiBjb2xsZWN0aW9uLmZldGNoTmV4dChvcHRpb25zKS50aGVuKGZ1bmN0aW9uIChyZXN1bHRzKSB7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5wcmV2LCB0cnVlLCAnY2FuIHBhZ2UgcHJldicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLm5leHQsIGkgKyAxIDwgYXBwcm92YWxzLmxlbmd0aCwgJ2NhbiBwYWdlIG5leHQnKTtcclxuICAgICAgICAgIHJldHVybiBvcHRpb25zO1xyXG4gICAgICAgIH0pLnRoZW4obmV4dCk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gcHJldihvcHRpb25zKTogUHJvbWlzZUxpa2U8YW55PiB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMucHJldiwgaSA+IDAsICdjYW4gcGFnZSBwcmV2Jyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubmV4dCwgaSArIDEgPCBhcHByb3ZhbHMubGVuZ3RoLCAnY2FuIHBhZ2UgbmV4dCcpO1xyXG4gICAgICAgIGlmICghb3B0aW9ucy5wcmV2KSB7XHJcbiAgICAgICAgICByZXR1cm4gUS5yZXNvbHZlKG9wdGlvbnMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaFByZXYob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHJlc3VsdHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDEsICdudW1iZXIgb2YgbW9kZWxzIHJldHJpZXZlZCBzbyBmYXInKTtcclxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSB4LmF0dHJpYnV0ZXMuX3RpbWU7IC8vIHNlcnZlciBhZGRzIHRoaXMsIHdlIGRvbid0IHdhbnQgaXRcclxuICAgICAgICAgICAgcmV0dXJuIHguYXR0cmlidXRlcztcclxuICAgICAgICAgIH0pLCBhcHByb3ZhbHMuc2xpY2UoaSAtIDEsIGkpLCAnZWxlbWVudCBmZXRjaGVkIHByb3Blcmx5Jyk7XHJcbiAgICAgICAgICAtLWk7XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcclxuICAgICAgICB9KS50aGVuKHByZXYpO1xyXG4gICAgICB9KTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=