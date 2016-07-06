/**
 * @file livedata/WebSqlStore.spec.ts
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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var WebSqlStore_1 = require('./WebSqlStore');
function backbone_error(done) {
    return function (model, error) {
        done(error instanceof Error ? error : new Error(JSON.stringify(error)));
    };
}
var TEST = {
    data: {
        firstName: 'Max',
        sureName: 'Mustermann',
        age: 33
    }
};
TEST.dropTableTest = function (done) {
    TEST.store.drop({
        entity: 'test',
        success: function () {
            chai_1.assert.ok(true, 'drop table test');
            done();
        },
        error: backbone_error(done)
    });
};
describe(module.filename || __filename, function () {
    return [
        it('creating websql store', function () {
            chai_1.assert.typeOf(global.openDatabase, 'function', 'Browser supports WebSql');
            chai_1.assert.typeOf(WebSqlStore_1.WebSqlStore, 'function', 'WebSqlStore is defined');
            TEST.store = new WebSqlStore_1.WebSqlStore();
            chai_1.assert.typeOf(TEST.store, 'object', 'store successfully created.');
        }),
        it('drop table', TEST.dropTableTest),
        it('simple websql store', function (done) {
            var SimpleModel = (function (_super) {
                __extends(SimpleModel, _super);
                function SimpleModel() {
                    _super.apply(this, arguments);
                }
                return SimpleModel;
            }(Model_1.Model));
            SimpleModel.prototype.idAttribute = 'key';
            TEST.SimpleModel = SimpleModel;
            chai_1.assert.typeOf(TEST.SimpleModel, 'function', 'SimpleModel model successfully extended.');
            var SimpleModelCollection = (function (_super) {
                __extends(SimpleModelCollection, _super);
                function SimpleModelCollection() {
                    _super.apply(this, arguments);
                }
                return SimpleModelCollection;
            }(Collection_1.Collection));
            SimpleModelCollection.prototype.model = TEST.SimpleModel;
            SimpleModelCollection.prototype.store = new WebSqlStore_1.WebSqlStore();
            SimpleModelCollection.prototype.entity = 'test';
            TEST.SimpleModelCollection = SimpleModelCollection;
            chai_1.assert.typeOf(TEST.SimpleModelCollection, 'function', 'Simple collection successfully extended.');
            TEST.Simple = new TEST.SimpleModelCollection();
            chai_1.assert.typeOf(TEST.Simple, 'object', 'Simple collection successfully created.');
            TEST.Simple.create(TEST.data, {
                success: function (model) {
                    chai_1.assert.ok(model, 'new record exists.');
                    TEST.key = model.id;
                    chai_1.assert.ok(TEST.key, 'new record has an id.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('drop table', TEST.dropTableTest),
        it('creating collection', function () {
            chai_1.assert.typeOf(Collection_1.Collection, 'function', 'Collection is defined');
            var TestModel = (function (_super) {
                __extends(TestModel, _super);
                function TestModel() {
                    _super.apply(this, arguments);
                }
                return TestModel;
            }(Model_1.Model));
            TestModel.prototype.idAttribute = 'key';
            TestModel.prototype.entity = 'test';
            TEST.TestModel = TestModel;
            chai_1.assert.typeOf(TEST.TestModel, 'function', 'TestModel model successfully extended.');
            var TestModelCollection = (function (_super) {
                __extends(TestModelCollection, _super);
                function TestModelCollection() {
                    _super.apply(this, arguments);
                }
                return TestModelCollection;
            }(Collection_1.Collection));
            TestModelCollection.prototype.model = TEST.TestModel;
            TestModelCollection.prototype.store = TEST.store;
            TEST.TestModelCollection = TestModelCollection;
            chai_1.assert.typeOf(TEST.TestModelCollection, 'function', 'Test collection successfully extended.');
            TEST.Tests = new TEST.TestModelCollection();
            chai_1.assert.typeOf(TEST.Tests, 'object', 'Test collection successfully created.');
            chai_1.assert.ok(TEST.Tests.store === TEST.store, 'Test collection has the correct store.');
        }),
        it('create record 1', function (done) {
            TEST.Tests.create(TEST.data, {
                success: function (model) {
                    chai_1.assert.ok(model, 'new record exists.');
                    TEST.key = model.id;
                    chai_1.assert.ok(TEST.key, 'new record has an id.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('create record 2', function (done) {
            TEST.Tests.create(TEST.data, {
                success: function (model) {
                    chai_1.assert.ok(model, 'new record exists.');
                    TEST.key = model.id;
                    chai_1.assert.ok(TEST.key, 'new record has an id.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('read record', function () {
            var model = TEST.Tests.get(TEST.key);
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
            TestModel2.prototype.idAttribute = 'key';
            TestModel2.prototype.store = TEST.store;
            TestModel2.prototype.entity = 'test';
            TEST.TestModel2 = TestModel2;
            var model = new TEST.TestModel2({
                key: TEST.key
            });
            chai_1.assert.isObject(model, 'new model created');
            model.fetch({
                success: function () {
                    chai_1.assert.ok(true, 'model has been fetched.');
                    chai_1.assert.equal(model.id, TEST.key, 'found record has the correct id');
                    chai_1.assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
                    chai_1.assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
                    chai_1.assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('delete record', function (done) {
            TEST.Tests.get(TEST.key).destroy({
                success: function (model) {
                    chai_1.assert.ok(true, 'record has been deleted.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('fetching collection', function (done) {
            TEST.Tests.fetch({
                success: function (collection) {
                    chai_1.assert.ok(true, 'Test collection fetched successfully.');
                    TEST.count = TEST.Tests.length;
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('cleanup records websql', function (done) {
            if (TEST.Tests.length === 0) {
                done();
            }
            else {
                TEST.Tests.on('all', function (event) {
                    if (event === 'destroy' && TEST.Tests.length == 0) {
                        done();
                    }
                });
                var model;
                while (model = TEST.Tests.first()) {
                    model.destroy();
                }
            }
        }),
        it('drop table', TEST.dropTableTest),
        it('create record (no schema)', function (done) {
            // recreate store type to drop schema information
            TEST.store = new WebSqlStore_1.WebSqlStore(undefined);
            var TestModel2 = (function (_super) {
                __extends(TestModel2, _super);
                function TestModel2() {
                    _super.apply(this, arguments);
                }
                return TestModel2;
            }(Model_1.Model));
            TestModel2.prototype.idAttribute = 'key';
            TestModel2.prototype.store = TEST.store;
            TestModel2.prototype.entity = 'test';
            TEST.TestModel2 = TestModel2;
            TEST.Tests2 = new Collection_1.Collection(undefined, {
                model: TEST.TestModel2,
                store: TEST.store
            });
            chai_1.assert.isObject(TEST.Tests2, 'Collection created');
            TEST.data = {
                firstName: 'Max',
                sureName: 'Mustermann',
                age: 33
            };
            TEST.Tests2.create(TEST.data, {
                success: function (model) {
                    chai_1.assert.ok(model, 'new record exists.');
                    TEST.key = model.id;
                    chai_1.assert.ok(TEST.key, 'new record has an id.');
                    done();
                },
                error: backbone_error(done)
            });
        }),
        it('read record', function () {
            var model = TEST.Tests2.get(TEST.key);
            chai_1.assert.ok(model, 'record found');
            chai_1.assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
            chai_1.assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
            chai_1.assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
        }),
        it('drop table', TEST.dropTableTest)
    ];
});
//# sourceMappingURL=WebSqlStore.spec.js.map