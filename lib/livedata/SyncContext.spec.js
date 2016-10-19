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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0NvbnRleHQuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jQ29udGV4dC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsSUFBWSxDQUFDLFdBQU0sR0FBRyxDQUFDLENBQUE7QUFFdkIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFFdEMsK0JBQTRCLGtCQUFrQixDQUFDLENBQUE7QUFFL0MsMEJBQXlCLGtCQUFrQixDQUFDLENBQUE7QUFFNUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsbUJBQW1CLENBQUM7SUFDbEMsSUFBSSxLQUFnQixDQUFDO0lBRXJCLGlDQUFpQztJQUNqQztRQUF3Qiw2QkFJdEI7UUFKRjtZQUF3Qiw4QkFJdEI7UUFBRSxDQUFDO1FBQUQsZ0JBQUM7SUFBRCxDQUFDLEFBSkwsQ0FBd0IsYUFBSyxDQUFDLFFBQVEsQ0FBQztRQUNyQyxXQUFXLEVBQUUsSUFBSTtRQUNqQixNQUFNLEVBQUUsVUFBVTtRQUNsQixPQUFPLEVBQUUsT0FBTztLQUNqQixDQUFDLEdBQUc7SUFFTDtRQUE2QixrQ0FFM0I7UUFGRjtZQUE2Qiw4QkFFM0I7UUFBRSxDQUFDO1FBQUQscUJBQUM7SUFBRCxDQUFDLEFBRkwsQ0FBNkIsdUJBQVUsQ0FBQyxRQUFRLENBQUM7UUFDL0MsS0FBSyxFQUFFLFNBQVM7S0FDakIsQ0FBQyxHQUFHO0lBRUwsTUFBTSxDQUFDO1FBQ0wsTUFBTSxDQUFDLHNCQUFV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QixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNDb250ZXh0LnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAxLjA3LjIwMTVcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcclxuXHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcblxyXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5pbXBvcnQge1N5bmNTdG9yZX0gZnJvbSAnLi9TeW5jU3RvcmUnO1xyXG5cclxuaW1wb3J0IHttYWtlQXBwcm92YWxzfSBmcm9tICcuL2FwcHJvdmFscy5kYXRhJztcclxuaW1wb3J0ICogYXMgdXJscyBmcm9tICcuLi93ZWIvdXJscyc7XHJcbmltcG9ydCB7dGVzdFNlcnZlcn0gZnJvbSAnLi4vd2ViL2h0dHAuc3BlYyc7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgdGhpcy50aW1lb3V0KDYwMDAwKTtcclxuICB2YXIgdXJsUm9vdCA9ICdhcGkvdjEvYXBwcm92YWxzLyc7XHJcbiAgdmFyIHN0b3JlOiBTeW5jU3RvcmU7XHJcblxyXG4gIC8vIHByZXBhcmUgbW9kZWwvY29sbGVjdGlvbiB0eXBlc1xyXG4gIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgIGlkQXR0cmlidXRlOiAnaWQnLFxyXG4gICAgZW50aXR5OiAnYXBwcm92YWwnLFxyXG4gICAgdXJsUm9vdDogdXJsUm9vdFxyXG4gIH0pIHt9XHJcblxyXG4gIGNsYXNzIFRlc3RDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbi5kZWZhdWx0cyh7XHJcbiAgICBtb2RlbDogVGVzdE1vZGVsXHJcbiAgfSkge31cclxuXHJcbiAgYmVmb3JlKGZ1bmN0aW9uKCkge1xyXG4gICAgcmV0dXJuIHRlc3RTZXJ2ZXIubG9naW4udGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgIHN0b3JlID0gbmV3IFN5bmNTdG9yZSh7XHJcbiAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaydcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLy8gbG9hZHMgZGF0YSB1c2luZyBjb2xsZWN0aW9uLCByZXR1cm5zIHByb21pc2Ugb24gY29sbGVjdGlvbiwgY29sbGVjdGlvbiBpcyBlbXB0eSBhZnRlcndhcmRzXHJcbiAgZnVuY3Rpb24gbG9hZENvbGxlY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbiwgZGF0YTogYW55W10pOiBRLlByb21pc2U8Q29sbGVjdGlvbj4ge1xyXG4gICAgcmV0dXJuIFEoY29sbGVjdGlvbi5mZXRjaCgpKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgLy8gZGVsZXRlIGFsbCBiZWZvcmUgcnVubmluZyB0ZXN0c1xyXG4gICAgICByZXR1cm4gUS5hbGwoY29sbGVjdGlvbi5tb2RlbHMuc2xpY2UoKS5tYXAoZnVuY3Rpb24gKG1vZGVsKSB7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKTtcclxuICAgICAgfSkpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjb2xsZWN0aW9uLm1vZGVscy5sZW5ndGgsIDAsICdjb2xsZWN0aW9uIG11c3QgYmUgZW1wdHkgaW5pdGlhbGx5IGFmdGVyIGRlc3Ryb3knKTtcclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbjtcclxuICAgICAgfSk7XHJcbiAgICB9KS50aGVuKGZ1bmN0aW9uIChjb2xsZWN0aW9uMikge1xyXG4gICAgICAvLyBsb2FkIHNhbXBsZSBkYXRhIGludG8gZnJlc2ggZGF0YWJhc2VcclxuICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24yLCBjb2xsZWN0aW9uLCAnc2FtZSBjb2xsZWN0aW9uIG9iamVjdCcpO1xyXG4gICAgICByZXR1cm4gUS5hbGwoZGF0YS5tYXAoZnVuY3Rpb24gKGF0dHJzKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBUZXN0TW9kZWwoYXR0cnMsIHtcclxuICAgICAgICAgIGNvbGxlY3Rpb246IGNvbGxlY3Rpb24yXHJcbiAgICAgICAgfSkuc2F2ZSgpO1xyXG4gICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24yLm1vZGVscy5sZW5ndGgsIGRhdGEubGVuZ3RoLCAnY29sbGVjdGlvbiB3YXMgdXBkYXRlZCBieSBhc3luYyBldmVudHMnKTtcclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbjI7XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICB2YXIgcUFwcHJvdmFsczogUS5Qcm9taXNlPGFueVtdPjtcclxuXHJcbiAgZnVuY3Rpb24gbG9hZEFwcHJvdmFscygpIHtcclxuICAgIGlmICghcUFwcHJvdmFscykge1xyXG4gICAgICB2YXIgYXBwcm92YWxzID0gbWFrZUFwcHJvdmFscygpO1xyXG4gICAgICB2YXIgY29sbGVjdGlvbiA9IHN0b3JlLmNyZWF0ZUNvbGxlY3Rpb24oVGVzdENvbGxlY3Rpb24pO1xyXG4gICAgICBxQXBwcm92YWxzID0gbG9hZENvbGxlY3Rpb24oY29sbGVjdGlvbiwgYXBwcm92YWxzKS50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBjb2xsZWN0aW9uLnN0b3BMaXN0ZW5pbmcoKTsgLy8gbm8gbG9uZ2VyIGxpdmVcclxuICAgICAgICByZXR1cm4gYXBwcm92YWxzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgICAgICAgIHJldHVybiBhLmlkLmxvY2FsZUNvbXBhcmUoYi5pZCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHFBcHByb3ZhbHM7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gW1xyXG5cclxuICAgIGl0KCdwcmVsb2FkcyBzYW1wbGUgZGF0YScsICgpID0+IHtcclxuICAgICAgcmV0dXJuIGxvYWRBcHByb3ZhbHMoKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdpbmZpbml0ZSBzY3JvbGxpbmcnLCAoKSA9PiB7XHJcbiAgICAgIHZhciBhcHByb3ZhbHM6IGFueVtdO1xyXG4gICAgICB2YXIgY29sbGVjdGlvbiA9IHN0b3JlLmNyZWF0ZUNvbGxlY3Rpb24oVGVzdENvbGxlY3Rpb24pO1xyXG4gICAgICB2YXIgY291bnRlciA9IDEwO1xyXG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICBhcHByb3ZhbHMgPSBkYXRhO1xyXG4gICAgICAgIHZhciBvcHRpb25zOiBhbnkgPSB7XHJcbiAgICAgICAgICBsaW1pdDogY291bnRlcixcclxuICAgICAgICAgIHNvcnRPcmRlcjogWyAnaWQnIF1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBRKGNvbGxlY3Rpb24uZmV0Y2gob3B0aW9ucykpLnRoZW5SZXNvbHZlKG9wdGlvbnMpO1xyXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIHNjcm9sbChvcHRpb25zKTogUHJvbWlzZUxpa2U8YW55PiB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgY291bnRlciwgJ251bWJlciBvZiBtb2RlbHMgcmV0cmlldmVkIHNvIGZhcicpO1xyXG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICBkZWxldGUgeC5hdHRyaWJ1dGVzLl90aW1lOyAvLyBzZXJ2ZXIgYWRkcyB0aGlzLCB3ZSBkb24ndCB3YW50IGl0XHJcbiAgICAgICAgICByZXR1cm4geC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgIH0pLCBhcHByb3ZhbHMuc2xpY2UoMCwgY291bnRlciksICdlbGVtZW50cyBhcmUgZmV0Y2hlZCBwcm9wZXJseScpO1xyXG4gICAgICAgIGlmIChvcHRpb25zLmVuZCkge1xyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uZmV0Y2hNb3JlKG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcclxuICAgICAgICAgIGlmIChyZXN1bHRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5lbmQsIHRydWUsICdhdCBlbmQgb2Ygc2Nyb2xsaW5nJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgb2xkQ291bnRlciA9IGNvdW50ZXI7XHJcbiAgICAgICAgICAgIGNvdW50ZXIgPSBNYXRoLm1pbihhcHByb3ZhbHMubGVuZ3RoLCBjb3VudGVyICsgMTApO1xyXG4gICAgICAgICAgICBhc3NlcnQuZXF1YWwocmVzdWx0cy5sZW5ndGgsIGNvdW50ZXIgLSBvbGRDb3VudGVyLCAnbnVtYmVyIG9mIHJlc3VsdHMgcmV0dXJuZWQnKTtcclxuICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMubW9yZSwgdHJ1ZSwgJ2NhbiBzY3JvbGwgbW9yZScpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XHJcbiAgICAgICAgfSkudGhlbihzY3JvbGwpO1xyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCduZXh0L3ByZXYgcGFnaW5nJywgKCkgPT4ge1xyXG4gICAgICB2YXIgYXBwcm92YWxzOiBhbnlbXTtcclxuICAgICAgdmFyIGNvbGxlY3Rpb24gPSBzdG9yZS5jcmVhdGVDb2xsZWN0aW9uKFRlc3RDb2xsZWN0aW9uKTtcclxuICAgICAgdmFyIGkgPSAwO1xyXG4gICAgICByZXR1cm4gbG9hZEFwcHJvdmFscygpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICBhcHByb3ZhbHMgPSBkYXRhO1xyXG4gICAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgICAgbGltaXQ6IDEsXHJcbiAgICAgICAgICBzb3J0T3JkZXI6IFsgJ2lkJyBdXHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gKDxhbnk+Y29sbGVjdGlvbi5mZXRjaChvcHRpb25zKSkudGhlblJlc29sdmUob3B0aW9ucyk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24gbmV4dChvcHRpb25zKTogUHJvbWlzZUxpa2U8YW55PiB7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLmxlbmd0aCwgMSwgJ251bWJlciBvZiBtb2RlbHMgcmV0cmlldmVkIHNvIGZhcicpO1xyXG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uICh4KSB7XHJcbiAgICAgICAgICBkZWxldGUgeC5hdHRyaWJ1dGVzLl90aW1lOyAvLyBzZXJ2ZXIgYWRkcyB0aGlzLCB3ZSBkb24ndCB3YW50IGl0XHJcbiAgICAgICAgICByZXR1cm4geC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgIH0pLCBhcHByb3ZhbHMuc2xpY2UoaSwgaSArIDEpLCAnZWxlbWVudCBmZXRjaGVkIHByb3Blcmx5Jyk7XHJcbiAgICAgICAgaWYgKCFvcHRpb25zLm5leHQgJiYgaSA+IDEpIHtcclxuICAgICAgICAgIHJldHVybiBRLnJlc29sdmUob3B0aW9ucyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgICsraTtcclxuICAgICAgICByZXR1cm4gY29sbGVjdGlvbi5mZXRjaE5leHQob3B0aW9ucykudGhlbihmdW5jdGlvbiAocmVzdWx0cykge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG9wdGlvbnMucHJldiwgdHJ1ZSwgJ2NhbiBwYWdlIHByZXYnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgMSwgJ251bWJlciBvZiByZXN1bHRzIHJldHVybmVkJyk7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwob3B0aW9ucy5uZXh0LCBpICsgMSA8IGFwcHJvdmFscy5sZW5ndGgsICdjYW4gcGFnZSBuZXh0Jyk7XHJcbiAgICAgICAgICByZXR1cm4gb3B0aW9ucztcclxuICAgICAgICB9KS50aGVuKG5leHQpO1xyXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uIHByZXYob3B0aW9ucyk6IFByb21pc2VMaWtlPGFueT4ge1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLnByZXYsIGkgPiAwLCAnY2FuIHBhZ2UgcHJldicpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChvcHRpb25zLm5leHQsIGkgKyAxIDwgYXBwcm92YWxzLmxlbmd0aCwgJ2NhbiBwYWdlIG5leHQnKTtcclxuICAgICAgICBpZiAoIW9wdGlvbnMucHJldikge1xyXG4gICAgICAgICAgcmV0dXJuIFEucmVzb2x2ZShvcHRpb25zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNvbGxlY3Rpb24uZmV0Y2hQcmV2KG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24gKHJlc3VsdHMpIHtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChyZXN1bHRzLmxlbmd0aCwgMSwgJ251bWJlciBvZiByZXN1bHRzIHJldHVybmVkJyk7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoY29sbGVjdGlvbi5tb2RlbHMubGVuZ3RoLCAxLCAnbnVtYmVyIG9mIG1vZGVscyByZXRyaWV2ZWQgc28gZmFyJyk7XHJcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGNvbGxlY3Rpb24ubW9kZWxzLm1hcChmdW5jdGlvbiAoeCkge1xyXG4gICAgICAgICAgICBkZWxldGUgeC5hdHRyaWJ1dGVzLl90aW1lOyAvLyBzZXJ2ZXIgYWRkcyB0aGlzLCB3ZSBkb24ndCB3YW50IGl0XHJcbiAgICAgICAgICAgIHJldHVybiB4LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICB9KSwgYXBwcm92YWxzLnNsaWNlKGkgLSAxLCBpKSwgJ2VsZW1lbnQgZmV0Y2hlZCBwcm9wZXJseScpO1xyXG4gICAgICAgICAgLS1pO1xyXG4gICAgICAgICAgcmV0dXJuIG9wdGlvbnM7XHJcbiAgICAgICAgfSkudGhlbihwcmV2KTtcclxuICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19