/**
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
"use strict";
var chai_1 = require('chai');
var Q = require('q');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var SyncStore_1 = require('./SyncStore');
var approvals_data_1 = require('./approvals.data');
var serverUrl = "http://localhost:8200";
describe(module.filename || __filename, function () {
    this.timeout(60000);
    // prepare model/collection types
    var store = new SyncStore_1.SyncStore({});
    var TestModel = Model_1.Model.extend({
        idAttribute: 'id',
        entity: 'approval'
    });
    var TestCollection = Collection_1.Collection.extend({
        model: TestModel,
        store: store,
        url: serverUrl + '/relution/livedata/approvals/'
    });
    // loads data using collection, returns promise on collection, collection is empty afterwards
    function loadCollection(collection, data) {
        return collection.fetch().then(function () {
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
                return collection.fetch(options).thenResolve(options);
            }).then(function scroll(options) {
                chai_1.assert.equal(collection.models.length, counter, 'number of models retrieved so far');
                chai_1.assert.deepEqual(collection.models.map(function (x) {
                    delete x.attributes._time; // server adds this, we don't want it
                    return x.attributes;
                }), approvals.slice(0, counter), 'elements are fetched properly');
                if (options.end) {
                    return options;
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
                    return options;
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
                    return options;
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
//# sourceMappingURL=SyncContext.spec.js.map