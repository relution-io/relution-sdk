/*
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4Qyw0QkFBMEIsZUFBZSxDQUFDLENBQUE7QUFFMUMsd0JBQXdCLElBQWM7SUFDcEMsTUFBTSxDQUFDLFVBQVUsS0FBeUIsRUFBRSxLQUFVO1FBQ3BELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsSUFBSSxJQUFJLEdBQVE7SUFDZCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUUsS0FBSztRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixHQUFHLEVBQUUsRUFBRTtLQUNSO0NBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFjO0lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUU7WUFDUCxhQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQztRQUNELEtBQUssRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJ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QzVHLGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDO1lBQ3pHLGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO1FBRTVGLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQztLQUVyQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XHJcblxyXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5pbXBvcnQge1dlYlNxbFN0b3JlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcclxuXHJcbmZ1bmN0aW9uIGJhY2tib25lX2Vycm9yKGRvbmU6IEZ1bmN0aW9uKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uIChtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBlcnJvcjogYW55KSB7XHJcbiAgICBkb25lKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihKU09OLnN0cmluZ2lmeShlcnJvcikpKTtcclxuICB9O1xyXG59XHJcblxyXG52YXIgVEVTVDogYW55ID0ge1xyXG4gIGRhdGE6IHtcclxuICAgIGZpcnN0TmFtZTogJ01heCcsXHJcbiAgICBzdXJlTmFtZTogJ011c3Rlcm1hbm4nLFxyXG4gICAgYWdlOiAzM1xyXG4gIH1cclxufTtcclxuXHJcblRFU1QuZHJvcFRhYmxlVGVzdCA9IGZ1bmN0aW9uIChkb25lOiBGdW5jdGlvbikge1xyXG4gIFRFU1Quc3RvcmUuZHJvcCh7XHJcbiAgICBlbnRpdHk6ICd0ZXN0JyxcclxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgYXNzZXJ0Lm9rKHRydWUsICdkcm9wIHRhYmxlIHRlc3QnKTtcclxuICAgICAgZG9uZSgpO1xyXG4gICAgfSxcclxuICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gIH0pO1xyXG59O1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ2NyZWF0aW5nIHdlYnNxbCBzdG9yZScsIGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoV2ViU3FsU3RvcmUsICdmdW5jdGlvbicsICdXZWJTcWxTdG9yZSBpcyBkZWZpbmVkJyk7XHJcblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFdlYlNxbFN0b3JlKCk7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1Quc3RvcmUsICdvYmplY3QnLCAnc3RvcmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQuJyk7XHJcblxyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2Ryb3AgdGFibGUnLCBURVNULmRyb3BUYWJsZVRlc3QpLFxyXG5cclxuICAgIGl0KCdzaW1wbGUgd2Vic3FsIHN0b3JlJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuXHJcbiAgICAgIGNsYXNzIFNpbXBsZU1vZGVsIGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgU2ltcGxlTW9kZWwucHJvdG90eXBlLmlkQXR0cmlidXRlID0gJ2tleSc7XHJcbiAgICAgIFRFU1QuU2ltcGxlTW9kZWwgPSBTaW1wbGVNb2RlbDtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5TaW1wbGVNb2RlbCwgJ2Z1bmN0aW9uJywgJ1NpbXBsZU1vZGVsIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIGNsYXNzIFNpbXBsZU1vZGVsQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24ge31cclxuICAgICAgU2ltcGxlTW9kZWxDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCA9IFRFU1QuU2ltcGxlTW9kZWw7XHJcbiAgICAgIFNpbXBsZU1vZGVsQ29sbGVjdGlvbi5wcm90b3R5cGUuc3RvcmUgPSBuZXcgV2ViU3FsU3RvcmUoKTtcclxuICAgICAgU2ltcGxlTW9kZWxDb2xsZWN0aW9uLnByb3RvdHlwZS5lbnRpdHkgPSAndGVzdCc7XHJcbiAgICAgIFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uID0gU2ltcGxlTW9kZWxDb2xsZWN0aW9uO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZU1vZGVsQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuU2ltcGxlID0gbmV3IFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlLCAnb2JqZWN0JywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG5cclxuICAgICAgVEVTVC5TaW1wbGUuY3JlYXRlKFRFU1QuZGF0YSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5vayhtb2RlbCwgJ25ldyByZWNvcmQgZXhpc3RzLicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcclxuXHJcbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcclxuXHJcblxyXG4gICAgaXQoJ2NyZWF0aW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKENvbGxlY3Rpb24sICdmdW5jdGlvbicsICdDb2xsZWN0aW9uIGlzIGRlZmluZWQnKTtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsIHt9XHJcbiAgICAgIFRlc3RNb2RlbC5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAna2V5JztcclxuICAgICAgVGVzdE1vZGVsLnByb3RvdHlwZS5lbnRpdHkgPSAndGVzdCc7XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsID0gVGVzdE1vZGVsO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RNb2RlbCwgJ2Z1bmN0aW9uJywgJ1Rlc3RNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWxDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbiB7fVxyXG4gICAgICBUZXN0TW9kZWxDb2xsZWN0aW9uLnByb3RvdHlwZS5tb2RlbCA9IFRFU1QuVGVzdE1vZGVsO1xyXG4gICAgICBUZXN0TW9kZWxDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IFRFU1Quc3RvcmU7XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsQ29sbGVjdGlvbiA9IFRlc3RNb2RlbENvbGxlY3Rpb247XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuVGVzdE1vZGVsQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ1Rlc3QgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XHJcblxyXG4gICAgICBURVNULlRlc3RzID0gbmV3IFRFU1QuVGVzdE1vZGVsQ29sbGVjdGlvbigpO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RzLCAnb2JqZWN0JywgJ1Rlc3QgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhURVNULlRlc3RzLnN0b3JlID09PSBURVNULnN0b3JlLCAnVGVzdCBjb2xsZWN0aW9uIGhhcyB0aGUgY29ycmVjdCBzdG9yZS4nKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRlIHJlY29yZCAxJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuXHJcbiAgICAgIFRFU1QuVGVzdHMuY3JlYXRlKFRFU1QuZGF0YSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5vayhtb2RlbCwgJ25ldyByZWNvcmQgZXhpc3RzLicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcclxuXHJcbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdjcmVhdGUgcmVjb3JkIDInLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChtb2RlbDogTW9kZWwpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XHJcblxyXG4gICAgICAgICAgICBURVNULmtleSA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XHJcblxyXG4gICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmtleSk7XHJcblxyXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XHJcblxyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2ZldGNoaW5nIGRhdGEgd2l0aCBuZXcgbW9kZWwnLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgY2xhc3MgVGVzdE1vZGVsMiBleHRlbmRzIE1vZGVsIHt9XHJcbiAgICAgIFRlc3RNb2RlbDIucHJvdG90eXBlLmlkQXR0cmlidXRlID0gJ2tleSc7XHJcbiAgICAgIFRlc3RNb2RlbDIucHJvdG90eXBlLnN0b3JlID0gVEVTVC5zdG9yZTtcclxuICAgICAgVGVzdE1vZGVsMi5wcm90b3R5cGUuZW50aXR5ID0gJ3Rlc3QnO1xyXG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xyXG5cclxuICAgICAgdmFyIG1vZGVsID0gbmV3IFRFU1QuVGVzdE1vZGVsMih7XHJcbiAgICAgICAga2V5OiBURVNULmtleVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFzc2VydC5pc09iamVjdChtb2RlbCwgJ25ldyBtb2RlbCBjcmVhdGVkJyk7XHJcblxyXG4gICAgICBtb2RlbC5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdtb2RlbCBoYXMgYmVlbiBmZXRjaGVkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmlkLCBURVNULmtleSwgJ2ZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkZWxldGUgcmVjb3JkJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpLmRlc3Ryb3koXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBhbnkpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdyZWNvcmQgaGFzIGJlZW4gZGVsZXRlZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdmZXRjaGluZyBjb2xsZWN0aW9uJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGNvbGxlY3Rpb246IGFueSkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdUZXN0IGNvbGxlY3Rpb24gZmV0Y2hlZCBzdWNjZXNzZnVsbHkuJyk7XHJcbiAgICAgICAgICBURVNULmNvdW50ID0gVEVTVC5UZXN0cy5sZW5ndGg7XHJcbiAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY2xlYW51cCByZWNvcmRzIHdlYnNxbCcsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBkb25lKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgVEVTVC5UZXN0cy5vbignYWxsJywgZnVuY3Rpb24gKGV2ZW50OiBzdHJpbmcpIHtcclxuICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Rlc3Ryb3knICYmIFRFU1QuVGVzdHMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBtb2RlbDogTW9kZWw7XHJcbiAgICAgICAgd2hpbGUgKG1vZGVsID0gVEVTVC5UZXN0cy5maXJzdCgpKSB7XHJcbiAgICAgICAgICBtb2RlbC5kZXN0cm95KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXHJcblxyXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQgKG5vIHNjaGVtYSknLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgLy8gcmVjcmVhdGUgc3RvcmUgdHlwZSB0byBkcm9wIHNjaGVtYSBpbmZvcm1hdGlvblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFdlYlNxbFN0b3JlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgVGVzdE1vZGVsMi5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAna2V5JztcclxuICAgICAgVGVzdE1vZGVsMi5wcm90b3R5cGUuc3RvcmUgPSBURVNULnN0b3JlO1xyXG4gICAgICBUZXN0TW9kZWwyLnByb3RvdHlwZS5lbnRpdHkgPSAndGVzdCc7XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsMiA9IFRlc3RNb2RlbDI7XHJcblxyXG4gICAgICBURVNULlRlc3RzMiA9IG5ldyBDb2xsZWN0aW9uKHVuZGVmaW5lZCwge1xyXG4gICAgICAgIG1vZGVsOiBURVNULlRlc3RNb2RlbDIsXHJcbiAgICAgICAgc3RvcmU6IFRFU1Quc3RvcmVcclxuICAgICAgfSk7XHJcbiAgICAgIGFzc2VydC5pc09iamVjdChURVNULlRlc3RzMiwgJ0NvbGxlY3Rpb24gY3JlYXRlZCcpO1xyXG5cclxuICAgICAgVEVTVC5kYXRhID0ge1xyXG4gICAgICAgIGZpcnN0TmFtZTogJ01heCcsXHJcbiAgICAgICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcclxuICAgICAgICBhZ2U6IDMzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBURVNULlRlc3RzMi5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChtb2RlbDogTW9kZWwpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XHJcblxyXG4gICAgICAgICAgICBURVNULmtleSA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XHJcblxyXG4gICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzMi5nZXQoVEVTVC5rZXkpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAncmVjb3JkIGZvdW5kJyk7XHJcblxyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19