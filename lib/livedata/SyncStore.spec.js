/*
 * @file livedata/SyncStore.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.06.2016
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
var _ = require('lodash');
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var SyncStore_1 = require('./SyncStore');
var serverUrl = 'http://localhost:8200';
function backbone_error(done) {
    return function (model, error) {
        done(error instanceof Error ? error : new Error(JSON.stringify(error)));
    };
}
describe(module.filename || __filename, function () {
    this.timeout(5000 * 1000);
    var TEST = {
        data: {
            firstName: 'Max',
            sureName: 'Mustermann',
            age: 33
        }
    };
    return [
        it('creating store', function () {
            chai_1.assert.isString(serverUrl, 'Server url is defined.');
            chai_1.assert.isFunction(SyncStore_1.SyncStore, 'SyncStore is defined');
            TEST.store = new SyncStore_1.SyncStore({
                useLocalStore: true,
                useSocketNotify: false
            });
            chai_1.assert.isObject(TEST.store, 'store successfully created.');
            chai_1.assert.ok(TEST.store.useLocalStore);
            chai_1.assert.ok(!TEST.store.useSocketNotify);
        }),
        it('creating collection', function () {
            chai_1.assert.isFunction(Collection_1.Collection, 'Collection is defined');
            var TestModel = (function (_super) {
                __extends(TestModel, _super);
                function TestModel() {
                    _super.apply(this, arguments);
                }
                return TestModel;
            }(Model_1.Model));
            TestModel.prototype.idAttribute = '_id';
            TestModel.prototype.entity = 'test';
            TEST.TestModel = TestModel;
            chai_1.assert.isFunction(TEST.TestModel, 'TestModel model successfully extended.');
            TEST.url = serverUrl + '/relution/livedata/test/';
            var TestsModelCollection = (function (_super) {
                __extends(TestsModelCollection, _super);
                function TestsModelCollection() {
                    _super.apply(this, arguments);
                }
                return TestsModelCollection;
            }(Collection_1.Collection));
            TestsModelCollection.prototype.model = TEST.TestModel;
            TestsModelCollection.prototype.url = TEST.url;
            TestsModelCollection.prototype.store = TEST.store;
            TestsModelCollection.prototype.options = {
                sort: { sureName: 1 },
                fields: { USERNAME: 1, sureName: 1, firstName: 1, age: 1 },
                query: { age: { $gte: 25 } }
            };
            TEST.TestsModelCollection = TestsModelCollection;
            chai_1.assert.isFunction(TEST.TestsModelCollection, 'Test collection successfully extended.');
            TEST.Tests = new TEST.TestsModelCollection();
            chai_1.assert.isObject(TEST.Tests, 'Test collection successfully created.');
            chai_1.assert.equal(TEST.Tests.store, TEST.store, 'Test collection has the correct store.');
            var url = TEST.Tests.getUrl();
            chai_1.assert.ok(url !== TEST.url, 'The base url has been extended.');
            chai_1.assert.equal(url.indexOf(TEST.url), 0, 'the new url starts with the set url.');
            chai_1.assert.ok(url.indexOf('query=') > 0, 'query is part of the url.');
            chai_1.assert.ok(url.indexOf('fields=') > 0, 'fields is part of the url.');
            chai_1.assert.ok(url.indexOf('sort=') > 0, 'sort is part of the url.');
            // try to clean everything
            TEST.store.clear(TEST.Tests);
        }),
        it('create record', function (done) {
            TEST.Tests.create(TEST.data, {
                success: function (model) {
                    chai_1.assert.isObject(model, 'new record created successfully.');
                    TEST.id = model.id;
                    chai_1.assert.ok(TEST.id, 'new record has an id.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('get record', function () {
            var model = TEST.Tests.get(TEST.id);
            chai_1.assert.ok(model, 'record found');
            chai_1.assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
            chai_1.assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
            chai_1.assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
        }),
        it('fetching data with new model', function (done) {
            var TestModel2 = (function (_super) {
                __extends(TestModel2, _super);
                function TestModel2() {
                    _super.apply(this, arguments);
                }
                return TestModel2;
            }(Model_1.Model));
            TestModel2.prototype.url = TEST.url;
            TestModel2.prototype.idAttribute = '_id';
            TestModel2.prototype.store = TEST.store;
            TestModel2.prototype.entity = 'test';
            TEST.TestModel2 = TestModel2;
            var data = { _id: TEST.id };
            var model = new TEST.TestModel2(data);
            chai_1.assert.isObject(model, 'new model created');
            chai_1.assert.ok(_.isEqual(model.attributes, data), 'new model holds correct data attributes');
            model.fetch({
                success: function () {
                    chai_1.assert.ok(true, 'model has been fetched.');
                    chai_1.assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
                    // following is different to other tests as TEST.store does not recreate localStore and thus does not see entity change
                    chai_1.assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'USERNAME' value");
                    chai_1.assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('fetching model with no id using callbacks', function (done) {
            var TestModel2 = (function (_super) {
                __extends(TestModel2, _super);
                function TestModel2() {
                    _super.apply(this, arguments);
                }
                return TestModel2;
            }(Model_1.Model));
            TestModel2.prototype.url = TEST.url;
            TestModel2.prototype.idAttribute = '_id';
            TestModel2.prototype.store = TEST.store;
            TestModel2.prototype.entity = 'test';
            TEST.TestModel2 = TestModel2;
            var model = new TEST.TestModel2({});
            model.fetch({
                success: function (model2) {
                    backbone_error(done)(model2, new Error('this should have failed!'));
                },
                error: function () {
                    done();
                }
            });
        }),
        it('fetching model with empty-string id using promises', function (done) {
            var TestModel2 = (function (_super) {
                __extends(TestModel2, _super);
                function TestModel2() {
                    _super.apply(this, arguments);
                }
                return TestModel2;
            }(Model_1.Model));
            TestModel2.prototype.url = TEST.url;
            TestModel2.prototype.idAttribute = '_id';
            TestModel2.prototype.store = TEST.store;
            TestModel2.prototype.entity = 'test';
            TEST.TestModel2 = TestModel2;
            var model = new TEST.TestModel2({
                _id: ''
            });
            model.fetch().then(function () {
                throw new Error('this should have failed!');
            }, function () {
                return model;
            }).then(function (model2) {
                done();
                return model2;
            }, function (error) {
                backbone_error(done)(model, error);
                return model;
            }).done();
        }),
        it('fetching collection', function (done) {
            TEST.Tests.reset();
            chai_1.assert.equal(TEST.Tests.length, 0, 'reset has cleared the collection.');
            TEST.Tests.fetch({
                success: function (collection) {
                    chai_1.assert.isObject(TEST.Tests.get(TEST.id), 'The model is still there');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('get record', function () {
            var model = TEST.Tests.get(TEST.id);
            chai_1.assert.ok(model, 'record found');
            chai_1.assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
            chai_1.assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
            chai_1.assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
        }),
        // following test checks client-side behavior in case server-side alters object ID on update:
        //
        // 1. The test temporarily overwrites the ajax() method to modify response data, substituting new
        //    by old id.
        // 2. Then the synced collection is checked to contain correct data and that lookup by ids works
        //    such that an old id lookup no longer finds data and a new id lookup yields the existing record.
        // 3. The update operation is repeated substituting old id by new id to revert into correct state again.
        // 4. Finally the restored state is checked.
        //
        // In effect the ID change is done twice. This is to avoid failure in subsequent tests which attempt
        // to delete records. Since we modified the IDs by tweaking the HTTP response data in the ajax call,
        // the actual server does not know about the ID changes. Thus, deletions in subsequent tests would
        // fail, if we did not change the ID back again!
        it('change record id', function (done) {
            var model = TEST.Tests.get(TEST.id);
            chai_1.assert.ok(model, 'record found');
            var oldId = model.id;
            var newId = '4711-' + oldId;
            var TestModel = (function (_super) {
                __extends(TestModel, _super);
                function TestModel() {
                    _super.apply(this, arguments);
                }
                TestModel.prototype.ajax = function (options) {
                    // following simulates server reassigning ID value
                    return Model_1.Model.prototype.ajax.apply(this, arguments).then(function (response) {
                        if (response._id === oldId) {
                            response._id = newId;
                        }
                        else if (response._id === newId) {
                            response._id = oldId;
                        }
                        return response;
                    });
                };
                return TestModel;
            }(Model_1.Model));
            TestModel.prototype.url = TEST.url;
            TestModel.prototype.idAttribute = '_id';
            TestModel.prototype.store = TEST.store;
            TestModel.prototype.entity = 'test';
            var testModel = new TestModel(model.attributes);
            var options = {
                wait: true
            };
            var promise = testModel.save(undefined, options);
            return promise.then(function () {
                chai_1.assert.ok(testModel.id, 'record has an id.');
                chai_1.assert.equal(testModel.id, newId, 'record has new id.');
                chai_1.assert.equal(TEST.Tests.get(testModel.id), model, 'model is found in collection by new id.');
                chai_1.assert.isUndefined(TEST.Tests.get(oldId), 'model is missing in collection by old id.');
            }).then(function () {
                // reverts local changes
                return testModel.save(undefined, options).then(function () {
                    chai_1.assert.ok(testModel.id, 'record has an id.');
                    chai_1.assert.equal(testModel.id, oldId, 'record has new id.');
                    chai_1.assert.equal(TEST.Tests.get(testModel.id), model, 'model is found in collection by old id.');
                    chai_1.assert.isUndefined(TEST.Tests.get(newId), 'model is missing in collection by new id.');
                });
            }).then(done, backbone_error(done));
        }),
        it('delete record', function (done) {
            var model = TEST.Tests.get(TEST.id);
            chai_1.assert.isObject(model, 'model found in collection');
            chai_1.assert.equal(model.id, TEST.id, 'model has the correct id');
            model.destroy({
                success: function (model2) {
                    chai_1.assert.ok(true, 'record has been deleted.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('cleanup records', function (done) {
            if (TEST.Tests.length === 0) {
                done();
            }
            else {
                var hasError = false, isDone = false;
                TEST.Tests.models.forEach(function (model) {
                    if (!hasError) {
                        model.destroy({
                            success: function () {
                                if (TEST.Tests.length == 0 && !isDone) {
                                    isDone = true;
                                    chai_1.assert.equal(TEST.Tests.length, 0, 'collection is empty');
                                    done();
                                }
                            },
                            error: function () {
                                hasError = isDone = true;
                                backbone_error(done).apply(this, arguments);
                            }
                        });
                    }
                });
            }
        })
    ];
});
//# sourceMappingURL=SyncStore.spec.js.map