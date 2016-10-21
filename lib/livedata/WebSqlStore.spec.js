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
                entity: 'test'
            })));
            TEST.SimpleModelCollection = SimpleModelCollection;
            chai_1.assert.typeOf(TEST.SimpleModelCollection, 'function', 'Simple collection successfully extended.');
            TEST.Simple = new WebSqlStore_1.WebSqlStore().createCollection(SimpleModelCollection);
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
            })));
            TEST.TestModelCollection = TestModelCollection;
            chai_1.assert.typeOf(TEST.TestModelCollection, 'function', 'Test collection successfully extended.');
            TEST.Tests = TEST.store.createCollection(TestModelCollection);
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
                entity: 'test'
            })));
            TEST.TestModel2 = TestModel2;
            var model = TEST.store.createModel(TestModel2, { key: TEST.key });
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
                entity: 'test'
            })));
            TEST.TestModel2 = TestModel2;
            TEST.Tests2 = TEST.store.createCollection(Collection_1.Collection.defaults({
                model: TEST.TestModel2
            }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4Qyw0QkFBMEIsZUFBZSxDQUFDLENBQUE7QUFFMUMsd0JBQXdCLElBQWM7SUFDcEMsTUFBTSxDQUFDLFVBQVUsS0FBeUIsRUFBRSxLQUFVO1FBQ3BELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsSUFBSSxJQUFJLEdBQVE7SUFDZCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUUsS0FBSztRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixHQUFHLEVBQUUsRUFBRTtLQUNSO0NBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFjO0lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUU7WUFDUCxhQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQztRQUNELEtBQUssRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJ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RXJDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcblxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQge1dlYlNxbFN0b3JlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcblxuZnVuY3Rpb24gYmFja2JvbmVfZXJyb3IoZG9uZTogRnVuY3Rpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBlcnJvcjogYW55KSB7XG4gICAgZG9uZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKSk7XG4gIH07XG59XG5cbnZhciBURVNUOiBhbnkgPSB7XG4gIGRhdGE6IHtcbiAgICBmaXJzdE5hbWU6ICdNYXgnLFxuICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXG4gICAgYWdlOiAzM1xuICB9XG59O1xuXG5URVNULmRyb3BUYWJsZVRlc3QgPSBmdW5jdGlvbiAoZG9uZTogRnVuY3Rpb24pIHtcbiAgVEVTVC5zdG9yZS5kcm9wKHtcbiAgICBlbnRpdHk6ICd0ZXN0JyxcbiAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICBhc3NlcnQub2sodHJ1ZSwgJ2Ryb3AgdGFibGUgdGVzdCcpO1xuICAgICAgZG9uZSgpO1xuICAgIH0sXG4gICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXG4gIH0pO1xufTtcblxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW1xuXG4gICAgaXQoJ2NyZWF0aW5nIHdlYnNxbCBzdG9yZScsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihXZWJTcWxTdG9yZSwgJ2Z1bmN0aW9uJywgJ1dlYlNxbFN0b3JlIGlzIGRlZmluZWQnKTtcblxuICAgICAgVEVTVC5zdG9yZSA9IG5ldyBXZWJTcWxTdG9yZSgpO1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1Quc3RvcmUsICdvYmplY3QnLCAnc3RvcmUgc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQuJyk7XG5cbiAgICB9KSxcblxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcblxuICAgIGl0KCdzaW1wbGUgd2Vic3FsIHN0b3JlJywgZnVuY3Rpb24gKGRvbmUpIHtcblxuICAgICAgY2xhc3MgU2ltcGxlTW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5J1xuICAgICAgfSkge31cbiAgICAgIFRFU1QuU2ltcGxlTW9kZWwgPSBTaW1wbGVNb2RlbDtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZU1vZGVsLCAnZnVuY3Rpb24nLCAnU2ltcGxlTW9kZWwgbW9kZWwgc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xuXG4gICAgICBjbGFzcyBTaW1wbGVNb2RlbENvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcbiAgICAgICAgbW9kZWw6IFRFU1QuU2ltcGxlTW9kZWwsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5TaW1wbGVNb2RlbENvbGxlY3Rpb24gPSBTaW1wbGVNb2RlbENvbGxlY3Rpb247XG5cbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5TaW1wbGVNb2RlbENvbGxlY3Rpb24sICdmdW5jdGlvbicsICdTaW1wbGUgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XG5cbiAgICAgIFRFU1QuU2ltcGxlID0gbmV3IFdlYlNxbFN0b3JlKCkuY3JlYXRlQ29sbGVjdGlvbihTaW1wbGVNb2RlbENvbGxlY3Rpb24pO1xuXG4gICAgICBhc3NlcnQudHlwZU9mKFRFU1QuU2ltcGxlLCAnb2JqZWN0JywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xuXG4gICAgICBURVNULlNpbXBsZS5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XG5cbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xuXG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KSxcblxuXG4gICAgaXQoJ2NyZWF0aW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIGFzc2VydC50eXBlT2YoQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ0NvbGxlY3Rpb24gaXMgZGVmaW5lZCcpO1xuXG4gICAgICBjbGFzcyBUZXN0TW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcbiAgICAgICAgZW50aXR5OiAndGVzdCdcbiAgICAgIH0pIHt9XG4gICAgICBURVNULlRlc3RNb2RlbCA9IFRlc3RNb2RlbDtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RNb2RlbCwgJ2Z1bmN0aW9uJywgJ1Rlc3RNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XG5cbiAgICAgIGNsYXNzIFRlc3RNb2RlbENvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcbiAgICAgICAgbW9kZWw6IFRFU1QuVGVzdE1vZGVsLFxuICAgICAgfSkge31cbiAgICAgIFRFU1QuVGVzdE1vZGVsQ29sbGVjdGlvbiA9IFRlc3RNb2RlbENvbGxlY3Rpb247XG5cbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5UZXN0TW9kZWxDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcblxuICAgICAgVEVTVC5UZXN0cyA9ICg8V2ViU3FsU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlQ29sbGVjdGlvbihUZXN0TW9kZWxDb2xsZWN0aW9uKTtcblxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RzLCAnb2JqZWN0JywgJ1Rlc3QgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcblxuICAgICAgYXNzZXJ0Lm9rKFRFU1QuVGVzdHMuc3RvcmUgPT09IFRFU1Quc3RvcmUsICdUZXN0IGNvbGxlY3Rpb24gaGFzIHRoZSBjb3JyZWN0IHN0b3JlLicpO1xuXG4gICAgfSksXG5cbiAgICBpdCgnY3JlYXRlIHJlY29yZCAxJywgZnVuY3Rpb24gKGRvbmUpIHtcblxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XG5cbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xuXG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdjcmVhdGUgcmVjb3JkIDInLCBmdW5jdGlvbiAoZG9uZSkge1xuXG4gICAgICBURVNULlRlc3RzLmNyZWF0ZShURVNULmRhdGEsXG4gICAgICAgIHtcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcblxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcblxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XG5cbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pLFxuXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpO1xuXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcblxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xuXG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgZGF0YSB3aXRoIG5ldyBtb2RlbCcsIGZ1bmN0aW9uIChkb25lKSB7XG5cbiAgICAgIGNsYXNzIFRlc3RNb2RlbDIgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcbiAgICAgICAgZW50aXR5OiAndGVzdCdcbiAgICAgIH0pIHt9XG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xuXG4gICAgICB2YXIgbW9kZWwgPSAoPFdlYlNxbFN0b3JlPlRFU1Quc3RvcmUpLmNyZWF0ZU1vZGVsKFRlc3RNb2RlbDIsIHsga2V5OiBURVNULmtleSB9KTtcblxuICAgICAgYXNzZXJ0LmlzT2JqZWN0KG1vZGVsLCAnbmV3IG1vZGVsIGNyZWF0ZWQnKTtcblxuICAgICAgbW9kZWwuZmV0Y2goe1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdtb2RlbCBoYXMgYmVlbiBmZXRjaGVkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5pZCwgVEVTVC5rZXksICdmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0IGlkJyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2RlbGV0ZSByZWNvcmQnLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpLmRlc3Ryb3koXG4gICAgICAgIHtcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IGFueSkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdyZWNvcmQgaGFzIGJlZW4gZGVsZXRlZC4nKTtcbiAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICB9LFxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgICB9XG4gICAgICApO1xuICAgIH0pLFxuXG4gICAgaXQoJ2ZldGNoaW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChjb2xsZWN0aW9uOiBhbnkpIHtcbiAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ1Rlc3QgY29sbGVjdGlvbiBmZXRjaGVkIHN1Y2Nlc3NmdWxseS4nKTtcbiAgICAgICAgICBURVNULmNvdW50ID0gVEVTVC5UZXN0cy5sZW5ndGg7XG4gICAgICAgICAgZG9uZSgpO1xuICAgICAgICB9LFxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2NsZWFudXAgcmVjb3JkcyB3ZWJzcWwnLCBmdW5jdGlvbiAoZG9uZSkge1xuXG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZG9uZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgVEVTVC5UZXN0cy5vbignYWxsJywgZnVuY3Rpb24gKGV2ZW50OiBzdHJpbmcpIHtcbiAgICAgICAgICBpZiAoZXZlbnQgPT09ICdkZXN0cm95JyAmJiBURVNULlRlc3RzLmxlbmd0aCA9PSAwKSB7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgdmFyIG1vZGVsOiBNb2RlbDtcbiAgICAgICAgd2hpbGUgKG1vZGVsID0gVEVTVC5UZXN0cy5maXJzdCgpKSB7XG4gICAgICAgICAgbW9kZWwuZGVzdHJveSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSksXG5cbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXG5cbiAgICBpdCgnY3JlYXRlIHJlY29yZCAobm8gc2NoZW1hKScsIGZ1bmN0aW9uIChkb25lKSB7XG5cbiAgICAgIC8vIHJlY3JlYXRlIHN0b3JlIHR5cGUgdG8gZHJvcCBzY2hlbWEgaW5mb3JtYXRpb25cbiAgICAgIFRFU1Quc3RvcmUgPSBuZXcgV2ViU3FsU3RvcmUodW5kZWZpbmVkKTtcblxuICAgICAgY2xhc3MgVGVzdE1vZGVsMiBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdrZXknLFxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xuICAgICAgfSkge31cbiAgICAgIFRFU1QuVGVzdE1vZGVsMiA9IFRlc3RNb2RlbDI7XG5cbiAgICAgIFRFU1QuVGVzdHMyID0gKDxXZWJTcWxTdG9yZT5URVNULnN0b3JlKS5jcmVhdGVDb2xsZWN0aW9uKENvbGxlY3Rpb24uZGVmYXVsdHMoe1xuICAgICAgICBtb2RlbDogVEVTVC5UZXN0TW9kZWwyXG4gICAgICB9KSk7XG4gICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5UZXN0czIsICdDb2xsZWN0aW9uIGNyZWF0ZWQnKTtcblxuICAgICAgVEVTVC5kYXRhID0ge1xuICAgICAgICBmaXJzdE5hbWU6ICdNYXgnLFxuICAgICAgICBzdXJlTmFtZTogJ011c3Rlcm1hbm4nLFxuICAgICAgICBhZ2U6IDMzXG4gICAgICB9O1xuXG4gICAgICBURVNULlRlc3RzMi5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XG5cbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xuXG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdyZWFkIHJlY29yZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgIHZhciBtb2RlbCA9IFRFU1QuVGVzdHMyLmdldChURVNULmtleSk7XG5cbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XG5cbiAgICB9KSxcblxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KVxuXG4gIF07XG59KTtcbiJdfQ==