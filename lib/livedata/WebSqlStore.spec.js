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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4Qyw0QkFBMEIsZUFBZSxDQUFDLENBQUE7QUFFMUMsd0JBQXdCLElBQWM7SUFDcEMsTUFBTSxDQUFDLFVBQVUsS0FBeUIsRUFBRSxLQUFVO1FBQ3BELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsSUFBSSxJQUFJLEdBQVE7SUFDZCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUUsS0FBSztRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixHQUFHLEVBQUUsRUFBRTtLQUNSO0NBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFjO0lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUU7WUFDUCxhQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQztRQUNELEtBQUssRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJ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QTBDLENBQUMsQ0FBQztRQUU1RixDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUM7S0FFckMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL1dlYlNxbFN0b3JlLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcbmltcG9ydCB7V2ViU3FsU3RvcmV9IGZyb20gJy4vV2ViU3FsU3RvcmUnO1xuXG5mdW5jdGlvbiBiYWNrYm9uZV9lcnJvcihkb25lOiBGdW5jdGlvbikge1xuICByZXR1cm4gZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIGVycm9yOiBhbnkpIHtcbiAgICBkb25lKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihKU09OLnN0cmluZ2lmeShlcnJvcikpKTtcbiAgfTtcbn1cblxudmFyIFRFU1Q6IGFueSA9IHtcbiAgZGF0YToge1xuICAgIGZpcnN0TmFtZTogJ01heCcsXG4gICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcbiAgICBhZ2U6IDMzXG4gIH1cbn07XG5cblRFU1QuZHJvcFRhYmxlVGVzdCA9IGZ1bmN0aW9uIChkb25lOiBGdW5jdGlvbikge1xuICBURVNULnN0b3JlLmRyb3Aoe1xuICAgIGVudGl0eTogJ3Rlc3QnLFxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGFzc2VydC5vayh0cnVlLCAnZHJvcCB0YWJsZSB0ZXN0Jyk7XG4gICAgICBkb25lKCk7XG4gICAgfSxcbiAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgfSk7XG59O1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnY3JlYXRpbmcgd2Vic3FsIHN0b3JlJywgZnVuY3Rpb24gKCkge1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFdlYlNxbFN0b3JlLCAnZnVuY3Rpb24nLCAnV2ViU3FsU3RvcmUgaXMgZGVmaW5lZCcpO1xuXG4gICAgICBURVNULnN0b3JlID0gbmV3IFdlYlNxbFN0b3JlKCk7XG5cbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5zdG9yZSwgJ29iamVjdCcsICdzdG9yZSBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcblxuICAgIH0pLFxuXG4gICAgaXQoJ2Ryb3AgdGFibGUnLCBURVNULmRyb3BUYWJsZVRlc3QpLFxuXG4gICAgaXQoJ3NpbXBsZSB3ZWJzcWwgc3RvcmUnLCBmdW5jdGlvbiAoZG9uZSkge1xuXG4gICAgICBjbGFzcyBTaW1wbGVNb2RlbCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdrZXknXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5TaW1wbGVNb2RlbCA9IFNpbXBsZU1vZGVsO1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlTW9kZWwsICdmdW5jdGlvbicsICdTaW1wbGVNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XG5cbiAgICAgIGNsYXNzIFNpbXBsZU1vZGVsQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24uZGVmYXVsdHMoe1xuICAgICAgICBtb2RlbDogVEVTVC5TaW1wbGVNb2RlbCxcbiAgICAgICAgc3RvcmU6IG5ldyBXZWJTcWxTdG9yZSgpLFxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xuICAgICAgfSkge31cbiAgICAgIFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uID0gU2ltcGxlTW9kZWxDb2xsZWN0aW9uO1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnU2ltcGxlIGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xuXG4gICAgICBURVNULlNpbXBsZSA9IG5ldyBURVNULlNpbXBsZU1vZGVsQ29sbGVjdGlvbigpO1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlLCAnb2JqZWN0JywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xuXG4gICAgICBURVNULlNpbXBsZS5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XG5cbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xuXG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcblxuXG4gICAgaXQoJ2NyZWF0aW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGFzc2VydC50eXBlT2YoQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ0NvbGxlY3Rpb24gaXMgZGVmaW5lZCcpO1xuXG4gICAgICBjbGFzcyBUZXN0TW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcbiAgICAgICAgZW50aXR5OiAndGVzdCdcbiAgICAgIH0pIHt9XG4gICAgICBURVNULlRlc3RNb2RlbCA9IFRlc3RNb2RlbDtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RNb2RlbCwgJ2Z1bmN0aW9uJywgJ1Rlc3RNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XG5cbiAgICAgIGNsYXNzIFRlc3RNb2RlbENvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcbiAgICAgICAgbW9kZWw6IFRFU1QuVGVzdE1vZGVsLFxuICAgICAgICBzdG9yZTogVEVTVC5zdG9yZVxuICAgICAgfSkge31cbiAgICAgIFRFU1QuVGVzdE1vZGVsQ29sbGVjdGlvbiA9IFRlc3RNb2RlbENvbGxlY3Rpb247XG5cbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5UZXN0TW9kZWxDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcblxuICAgICAgVEVTVC5UZXN0cyA9IG5ldyBURVNULlRlc3RNb2RlbENvbGxlY3Rpb24oKTtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RzLCAnb2JqZWN0JywgJ1Rlc3QgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcblxuICAgICAgYXNzZXJ0Lm9rKFRFU1QuVGVzdHMuc3RvcmUgPT09IFRFU1Quc3RvcmUsICdUZXN0IGNvbGxlY3Rpb24gaGFzIHRoZSBjb3JyZWN0IHN0b3JlLicpO1xuXG4gICAgfSksXG5cbiAgICBpdCgnY3JlYXRlIHJlY29yZCAxJywgZnVuY3Rpb24gKGRvbmUpIHtcblxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XG5cbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xuXG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdjcmVhdGUgcmVjb3JkIDInLCBmdW5jdGlvbiAoZG9uZSkge1xuXG4gICAgICBURVNULlRlc3RzLmNyZWF0ZShURVNULmRhdGEsXG4gICAgICAgIHtcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcblxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcblxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XG5cbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pLFxuXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpO1xuXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcblxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xuXG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgZGF0YSB3aXRoIG5ldyBtb2RlbCcsIGZ1bmN0aW9uIChkb25lKSB7XG5cbiAgICAgIGNsYXNzIFRlc3RNb2RlbDIgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcbiAgICAgICAgc3RvcmU6IFRFU1Quc3RvcmUsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5UZXN0TW9kZWwyID0gVGVzdE1vZGVsMjtcblxuICAgICAgdmFyIG1vZGVsID0gbmV3IFRFU1QuVGVzdE1vZGVsMih7XG4gICAgICAgIGtleTogVEVTVC5rZXlcbiAgICAgIH0pO1xuXG4gICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICduZXcgbW9kZWwgY3JlYXRlZCcpO1xuXG4gICAgICBtb2RlbC5mZXRjaCh7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ21vZGVsIGhhcyBiZWVuIGZldGNoZWQuJyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmlkLCBURVNULmtleSwgJ2ZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZGVsZXRlIHJlY29yZCcsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICBURVNULlRlc3RzLmdldChURVNULmtleSkuZGVzdHJveShcbiAgICAgICAge1xuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChtb2RlbDogYW55KSB7XG4gICAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ3JlY29yZCBoYXMgYmVlbiBkZWxldGVkLicpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgY29sbGVjdGlvbicsIGZ1bmN0aW9uIChkb25lKSB7XG4gICAgICBURVNULlRlc3RzLmZldGNoKHtcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGNvbGxlY3Rpb246IGFueSkge1xuICAgICAgICAgIGFzc2VydC5vayh0cnVlLCAnVGVzdCBjb2xsZWN0aW9uIGZldGNoZWQgc3VjY2Vzc2Z1bGx5LicpO1xuICAgICAgICAgIFRFU1QuY291bnQgPSBURVNULlRlc3RzLmxlbmd0aDtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnY2xlYW51cCByZWNvcmRzIHdlYnNxbCcsIGZ1bmN0aW9uIChkb25lKSB7XG5cbiAgICAgIGlmIChURVNULlRlc3RzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBkb25lKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBURVNULlRlc3RzLm9uKCdhbGwnLCBmdW5jdGlvbiAoZXZlbnQ6IHN0cmluZykge1xuICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Rlc3Ryb3knICYmIFRFU1QuVGVzdHMubGVuZ3RoID09IDApIHtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbW9kZWw6IE1vZGVsO1xuICAgICAgICB3aGlsZSAobW9kZWwgPSBURVNULlRlc3RzLmZpcnN0KCkpIHtcbiAgICAgICAgICBtb2RlbC5kZXN0cm95KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KSxcblxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcblxuICAgIGl0KCdjcmVhdGUgcmVjb3JkIChubyBzY2hlbWEpJywgZnVuY3Rpb24gKGRvbmUpIHtcblxuICAgICAgLy8gcmVjcmVhdGUgc3RvcmUgdHlwZSB0byBkcm9wIHNjaGVtYSBpbmZvcm1hdGlvblxuICAgICAgVEVTVC5zdG9yZSA9IG5ldyBXZWJTcWxTdG9yZSh1bmRlZmluZWQpO1xuXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xuICAgICAgICBpZEF0dHJpYnV0ZTogJ2tleScsXG4gICAgICAgIHN0b3JlOiBURVNULnN0b3JlLFxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xuICAgICAgfSkge31cbiAgICAgIFRFU1QuVGVzdE1vZGVsMiA9IFRlc3RNb2RlbDI7XG4gICAgICBcbiAgICAgIFRFU1QuVGVzdHMyID0gbmV3IENvbGxlY3Rpb24odW5kZWZpbmVkLCB7XG4gICAgICAgIG1vZGVsOiBURVNULlRlc3RNb2RlbDIsXG4gICAgICAgIHN0b3JlOiBURVNULnN0b3JlXG4gICAgICB9KTtcbiAgICAgIGFzc2VydC5pc09iamVjdChURVNULlRlc3RzMiwgJ0NvbGxlY3Rpb24gY3JlYXRlZCcpO1xuXG4gICAgICBURVNULmRhdGEgPSB7XG4gICAgICAgIGZpcnN0TmFtZTogJ01heCcsXG4gICAgICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXG4gICAgICAgIGFnZTogMzNcbiAgICAgIH07XG5cbiAgICAgIFRFU1QuVGVzdHMyLmNyZWF0ZShURVNULmRhdGEsXG4gICAgICAgIHtcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcblxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcblxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XG5cbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pLFxuXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0czIuZ2V0KFRFU1Qua2V5KTtcblxuICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAncmVjb3JkIGZvdW5kJyk7XG5cbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcblxuICAgIH0pLFxuXG4gICAgaXQoJ2Ryb3AgdGFibGUnLCBURVNULmRyb3BUYWJsZVRlc3QpXG5cbiAgXTtcbn0pO1xuIl19