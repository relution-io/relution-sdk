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
            }(Model_1.Model.defaults({
                idAttribute: 'key'
            })));
            TEST.SimpleModel = SimpleModel;
            chai_1.assert.typeOf(TEST.SimpleModel, 'function', 'SimpleModel model successfully extended.');
            var SimpleModelCollection = (function (_super) {
                __extends(SimpleModelCollection, _super);
                function SimpleModelCollection() {
                    _super.apply(this, arguments);
                }
                return SimpleModelCollection;
            }(Collection_1.Collection.defaults({
                model: TEST.SimpleModel,
                store: new WebSqlStore_1.WebSqlStore(),
                entity: 'test'
            })));
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
            }(Model_1.Model.defaults({
                idAttribute: 'key',
                entity: 'test'
            })));
            TEST.TestModel = TestModel;
            chai_1.assert.typeOf(TEST.TestModel, 'function', 'TestModel model successfully extended.');
            var TestModelCollection = (function (_super) {
                __extends(TestModelCollection, _super);
                function TestModelCollection() {
                    _super.apply(this, arguments);
                }
                return TestModelCollection;
            }(Collection_1.Collection.defaults({
                model: TEST.TestModel,
                store: TEST.store
            })));
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
            }(Model_1.Model.defaults({
                idAttribute: 'key',
                store: TEST.store,
                entity: 'test'
            })));
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
            }(Model_1.Model.defaults({
                idAttribute: 'key',
                store: TEST.store,
                entity: 'test'
            })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4Qyw0QkFBMEIsZUFBZSxDQUFDLENBQUE7QUFFMUMsd0JBQXdCLElBQWM7SUFDcEMsTUFBTSxDQUFDLFVBQVUsS0FBeUIsRUFBRSxLQUFVO1FBQ3BELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsSUFBSSxJQUFJLEdBQVE7SUFDZCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUUsS0FBSztRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixHQUFHLEVBQUUsRUFBRTtLQUNSO0NBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFjO0lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUU7WUFDUCxhQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQztRQUNELEtBQUssRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJ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QTBDLENBQUMsQ0FBQztRQUU1RixDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7S0FFckMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvV2ViU3FsU3RvcmUuc3BlYy50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xyXG5cclxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuaW1wb3J0IHtXZWJTcWxTdG9yZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XHJcblxyXG5mdW5jdGlvbiBiYWNrYm9uZV9lcnJvcihkb25lOiBGdW5jdGlvbikge1xyXG4gIHJldHVybiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgZXJyb3I6IGFueSkge1xyXG4gICAgZG9uZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKSk7XHJcbiAgfTtcclxufVxyXG5cclxudmFyIFRFU1Q6IGFueSA9IHtcclxuICBkYXRhOiB7XHJcbiAgICBmaXJzdE5hbWU6ICdNYXgnLFxyXG4gICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcclxuICAgIGFnZTogMzNcclxuICB9XHJcbn07XHJcblxyXG5URVNULmRyb3BUYWJsZVRlc3QgPSBmdW5jdGlvbiAoZG9uZTogRnVuY3Rpb24pIHtcclxuICBURVNULnN0b3JlLmRyb3Aoe1xyXG4gICAgZW50aXR5OiAndGVzdCcsXHJcbiAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGFzc2VydC5vayh0cnVlLCAnZHJvcCB0YWJsZSB0ZXN0Jyk7XHJcbiAgICAgIGRvbmUoKTtcclxuICAgIH0sXHJcbiAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICB9KTtcclxufTtcclxuXHJcbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcclxuICByZXR1cm4gW1xyXG5cclxuICAgIGl0KCdjcmVhdGluZyB3ZWJzcWwgc3RvcmUnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFdlYlNxbFN0b3JlLCAnZnVuY3Rpb24nLCAnV2ViU3FsU3RvcmUgaXMgZGVmaW5lZCcpO1xyXG5cclxuICAgICAgVEVTVC5zdG9yZSA9IG5ldyBXZWJTcWxTdG9yZSgpO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULnN0b3JlLCAnb2JqZWN0JywgJ3N0b3JlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcclxuXHJcbiAgICBpdCgnc2ltcGxlIHdlYnNxbCBzdG9yZScsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBjbGFzcyBTaW1wbGVNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgICAgICBpZEF0dHJpYnV0ZTogJ2tleSdcclxuICAgICAgfSkge31cclxuICAgICAgVEVTVC5TaW1wbGVNb2RlbCA9IFNpbXBsZU1vZGVsO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZU1vZGVsLCAnZnVuY3Rpb24nLCAnU2ltcGxlTW9kZWwgbW9kZWwgc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xyXG5cclxuICAgICAgY2xhc3MgU2ltcGxlTW9kZWxDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbi5kZWZhdWx0cyh7XHJcbiAgICAgICAgbW9kZWw6IFRFU1QuU2ltcGxlTW9kZWwsXHJcbiAgICAgICAgc3RvcmU6IG5ldyBXZWJTcWxTdG9yZSgpLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uID0gU2ltcGxlTW9kZWxDb2xsZWN0aW9uO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZU1vZGVsQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuU2ltcGxlID0gbmV3IFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlLCAnb2JqZWN0JywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG5cclxuICAgICAgVEVTVC5TaW1wbGUuY3JlYXRlKFRFU1QuZGF0YSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5vayhtb2RlbCwgJ25ldyByZWNvcmQgZXhpc3RzLicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcclxuXHJcbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcclxuXHJcblxyXG4gICAgaXQoJ2NyZWF0aW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKENvbGxlY3Rpb24sICdmdW5jdGlvbicsICdDb2xsZWN0aW9uIGlzIGRlZmluZWQnKTtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgICAgICBpZEF0dHJpYnV0ZTogJ2tleScsXHJcbiAgICAgICAgZW50aXR5OiAndGVzdCdcclxuICAgICAgfSkge31cclxuICAgICAgVEVTVC5UZXN0TW9kZWwgPSBUZXN0TW9kZWw7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuVGVzdE1vZGVsLCAnZnVuY3Rpb24nLCAnVGVzdE1vZGVsIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbENvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcclxuICAgICAgICBtb2RlbDogVEVTVC5UZXN0TW9kZWwsXHJcbiAgICAgICAgc3RvcmU6IFRFU1Quc3RvcmVcclxuICAgICAgfSkge31cclxuICAgICAgVEVTVC5UZXN0TW9kZWxDb2xsZWN0aW9uID0gVGVzdE1vZGVsQ29sbGVjdGlvbjtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5UZXN0TW9kZWxDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuVGVzdHMgPSBuZXcgVEVTVC5UZXN0TW9kZWxDb2xsZWN0aW9uKCk7XHJcblxyXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuVGVzdHMsICdvYmplY3QnLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKFRFU1QuVGVzdHMuc3RvcmUgPT09IFRFU1Quc3RvcmUsICdUZXN0IGNvbGxlY3Rpb24gaGFzIHRoZSBjb3JyZWN0IHN0b3JlLicpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdjcmVhdGUgcmVjb3JkIDEnLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChtb2RlbDogTW9kZWwpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XHJcblxyXG4gICAgICAgICAgICBURVNULmtleSA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XHJcblxyXG4gICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQgMicsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBURVNULlRlc3RzLmNyZWF0ZShURVNULmRhdGEsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcclxuXHJcbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XHJcblxyXG4gICAgICAgICAgICBhc3NlcnQub2soVEVTVC5rZXksICduZXcgcmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuXHJcbiAgICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgncmVhZCByZWNvcmQnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciBtb2RlbCA9IFRFU1QuVGVzdHMuZ2V0KFRFU1Qua2V5KTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgZGF0YSB3aXRoIG5ldyBtb2RlbCcsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcclxuICAgICAgICBzdG9yZTogVEVTVC5zdG9yZSxcclxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xyXG5cclxuICAgICAgdmFyIG1vZGVsID0gbmV3IFRFU1QuVGVzdE1vZGVsMih7XHJcbiAgICAgICAga2V5OiBURVNULmtleVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFzc2VydC5pc09iamVjdChtb2RlbCwgJ25ldyBtb2RlbCBjcmVhdGVkJyk7XHJcblxyXG4gICAgICBtb2RlbC5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdtb2RlbCBoYXMgYmVlbiBmZXRjaGVkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmlkLCBURVNULmtleSwgJ2ZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkZWxldGUgcmVjb3JkJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpLmRlc3Ryb3koXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBhbnkpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdyZWNvcmQgaGFzIGJlZW4gZGVsZXRlZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdmZXRjaGluZyBjb2xsZWN0aW9uJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGNvbGxlY3Rpb246IGFueSkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdUZXN0IGNvbGxlY3Rpb24gZmV0Y2hlZCBzdWNjZXNzZnVsbHkuJyk7XHJcbiAgICAgICAgICBURVNULmNvdW50ID0gVEVTVC5UZXN0cy5sZW5ndGg7XHJcbiAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY2xlYW51cCByZWNvcmRzIHdlYnNxbCcsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBkb25lKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgVEVTVC5UZXN0cy5vbignYWxsJywgZnVuY3Rpb24gKGV2ZW50OiBzdHJpbmcpIHtcclxuICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Rlc3Ryb3knICYmIFRFU1QuVGVzdHMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBtb2RlbDogTW9kZWw7XHJcbiAgICAgICAgd2hpbGUgKG1vZGVsID0gVEVTVC5UZXN0cy5maXJzdCgpKSB7XHJcbiAgICAgICAgICBtb2RlbC5kZXN0cm95KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXHJcblxyXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQgKG5vIHNjaGVtYSknLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgLy8gcmVjcmVhdGUgc3RvcmUgdHlwZSB0byBkcm9wIHNjaGVtYSBpbmZvcm1hdGlvblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFdlYlNxbFN0b3JlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcclxuICAgICAgICBzdG9yZTogVEVTVC5zdG9yZSxcclxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xyXG4gICAgICBcclxuICAgICAgVEVTVC5UZXN0czIgPSBuZXcgQ29sbGVjdGlvbih1bmRlZmluZWQsIHtcclxuICAgICAgICBtb2RlbDogVEVTVC5UZXN0TW9kZWwyLFxyXG4gICAgICAgIHN0b3JlOiBURVNULnN0b3JlXHJcbiAgICAgIH0pO1xyXG4gICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5UZXN0czIsICdDb2xsZWN0aW9uIGNyZWF0ZWQnKTtcclxuXHJcbiAgICAgIFRFU1QuZGF0YSA9IHtcclxuICAgICAgICBmaXJzdE5hbWU6ICdNYXgnLFxyXG4gICAgICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXHJcbiAgICAgICAgYWdlOiAzM1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgVEVTVC5UZXN0czIuY3JlYXRlKFRFU1QuZGF0YSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5vayhtb2RlbCwgJ25ldyByZWNvcmQgZXhpc3RzLicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcclxuXHJcbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdyZWFkIHJlY29yZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0czIuZ2V0KFRFU1Qua2V5KTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdClcclxuXHJcbiAgXTtcclxufSk7XHJcbiJdfQ==