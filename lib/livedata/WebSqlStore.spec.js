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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9XZWJTcWxTdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBQzlCLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4Qyw0QkFBMEIsZUFBZSxDQUFDLENBQUE7QUFFMUMsd0JBQXdCLElBQWM7SUFDcEMsTUFBTSxDQUFDLFVBQVUsS0FBeUIsRUFBRSxLQUFVO1FBQ3BELElBQUksQ0FBQyxLQUFLLFlBQVksS0FBSyxHQUFHLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsSUFBSSxJQUFJLEdBQVE7SUFDZCxJQUFJLEVBQUU7UUFDSixTQUFTLEVBQUUsS0FBSztRQUNoQixRQUFRLEVBQUUsWUFBWTtRQUN0QixHQUFHLEVBQUUsRUFBRTtLQUNSO0NBQ0YsQ0FBQztBQUVGLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxJQUFjO0lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2QsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUU7WUFDUCxhQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLElBQUksRUFBRSxDQUFDO1FBQ1QsQ0FBQztRQUNELEtBQUssRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDO0tBQzVCLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUVGLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJ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RXJDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1dlYlNxbFN0b3JlLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcclxuXHJcbmltcG9ydCB7TW9kZWx9IGZyb20gJy4vTW9kZWwnO1xyXG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcbmltcG9ydCB7V2ViU3FsU3RvcmV9IGZyb20gJy4vV2ViU3FsU3RvcmUnO1xyXG5cclxuZnVuY3Rpb24gYmFja2JvbmVfZXJyb3IoZG9uZTogRnVuY3Rpb24pIHtcclxuICByZXR1cm4gZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIGVycm9yOiBhbnkpIHtcclxuICAgIGRvbmUoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGVycm9yKSkpO1xyXG4gIH07XHJcbn1cclxuXHJcbnZhciBURVNUOiBhbnkgPSB7XHJcbiAgZGF0YToge1xyXG4gICAgZmlyc3ROYW1lOiAnTWF4JyxcclxuICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXHJcbiAgICBhZ2U6IDMzXHJcbiAgfVxyXG59O1xyXG5cclxuVEVTVC5kcm9wVGFibGVUZXN0ID0gZnVuY3Rpb24gKGRvbmU6IEZ1bmN0aW9uKSB7XHJcbiAgVEVTVC5zdG9yZS5kcm9wKHtcclxuICAgIGVudGl0eTogJ3Rlc3QnLFxyXG4gICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICBhc3NlcnQub2sodHJ1ZSwgJ2Ryb3AgdGFibGUgdGVzdCcpO1xyXG4gICAgICBkb25lKCk7XHJcbiAgICB9LFxyXG4gICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgfSk7XHJcbn07XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgd2Vic3FsIHN0b3JlJywgZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihXZWJTcWxTdG9yZSwgJ2Z1bmN0aW9uJywgJ1dlYlNxbFN0b3JlIGlzIGRlZmluZWQnKTtcclxuXHJcbiAgICAgIFRFU1Quc3RvcmUgPSBuZXcgV2ViU3FsU3RvcmUoKTtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5zdG9yZSwgJ29iamVjdCcsICdzdG9yZSBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXHJcblxyXG4gICAgaXQoJ3NpbXBsZSB3ZWJzcWwgc3RvcmUnLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgY2xhc3MgU2ltcGxlTW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdrZXknXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuU2ltcGxlTW9kZWwgPSBTaW1wbGVNb2RlbDtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5TaW1wbGVNb2RlbCwgJ2Z1bmN0aW9uJywgJ1NpbXBsZU1vZGVsIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIGNsYXNzIFNpbXBsZU1vZGVsQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24uZGVmYXVsdHMoe1xyXG4gICAgICAgIG1vZGVsOiBURVNULlNpbXBsZU1vZGVsLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuU2ltcGxlTW9kZWxDb2xsZWN0aW9uID0gU2ltcGxlTW9kZWxDb2xsZWN0aW9uO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZU1vZGVsQ29sbGVjdGlvbiwgJ2Z1bmN0aW9uJywgJ1NpbXBsZSBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuU2ltcGxlID0gbmV3IFdlYlNxbFN0b3JlKCkuY3JlYXRlQ29sbGVjdGlvbihTaW1wbGVNb2RlbENvbGxlY3Rpb24pO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlNpbXBsZSwgJ29iamVjdCcsICdTaW1wbGUgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuU2ltcGxlLmNyZWF0ZShURVNULmRhdGEsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcclxuXHJcbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XHJcblxyXG4gICAgICAgICAgICBhc3NlcnQub2soVEVTVC5rZXksICduZXcgcmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuXHJcbiAgICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXHJcblxyXG5cclxuICAgIGl0KCdjcmVhdGluZyBjb2xsZWN0aW9uJywgZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnQ29sbGVjdGlvbiBpcyBkZWZpbmVkJyk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdrZXknLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsID0gVGVzdE1vZGVsO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RNb2RlbCwgJ2Z1bmN0aW9uJywgJ1Rlc3RNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWxDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbi5kZWZhdWx0cyh7XHJcbiAgICAgICAgbW9kZWw6IFRFU1QuVGVzdE1vZGVsLFxyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbENvbGxlY3Rpb24gPSBUZXN0TW9kZWxDb2xsZWN0aW9uO1xyXG5cclxuICAgICAgYXNzZXJ0LnR5cGVPZihURVNULlRlc3RNb2RlbENvbGxlY3Rpb24sICdmdW5jdGlvbicsICdUZXN0IGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xyXG5cclxuICAgICAgVEVTVC5UZXN0cyA9ICg8V2ViU3FsU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlQ29sbGVjdGlvbihUZXN0TW9kZWxDb2xsZWN0aW9uKTtcclxuXHJcbiAgICAgIGFzc2VydC50eXBlT2YoVEVTVC5UZXN0cywgJ29iamVjdCcsICdUZXN0IGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQuJyk7XHJcblxyXG4gICAgICBhc3NlcnQub2soVEVTVC5UZXN0cy5zdG9yZSA9PT0gVEVTVC5zdG9yZSwgJ1Rlc3QgY29sbGVjdGlvbiBoYXMgdGhlIGNvcnJlY3Qgc3RvcmUuJyk7XHJcblxyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQgMScsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBURVNULlRlc3RzLmNyZWF0ZShURVNULmRhdGEsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgICBhc3NlcnQub2sobW9kZWwsICduZXcgcmVjb3JkIGV4aXN0cy4nKTtcclxuXHJcbiAgICAgICAgICAgIFRFU1Qua2V5ID0gbW9kZWwuaWQ7XHJcblxyXG4gICAgICAgICAgICBhc3NlcnQub2soVEVTVC5rZXksICduZXcgcmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuXHJcbiAgICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRlIHJlY29yZCAyJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuXHJcbiAgICAgIFRFU1QuVGVzdHMuY3JlYXRlKFRFU1QuZGF0YSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbiAobW9kZWw6IE1vZGVsKSB7XHJcbiAgICAgICAgICAgIGFzc2VydC5vayhtb2RlbCwgJ25ldyByZWNvcmQgZXhpc3RzLicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5rZXkgPSBtb2RlbC5pZDtcclxuXHJcbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmtleSwgJ25ldyByZWNvcmQgaGFzIGFuIGlkLicpO1xyXG5cclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdyZWFkIHJlY29yZCcsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAncmVjb3JkIGZvdW5kJyk7XHJcblxyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdmZXRjaGluZyBkYXRhIHdpdGggbmV3IG1vZGVsJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbDIgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdrZXknLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsMiA9IFRlc3RNb2RlbDI7XHJcblxyXG4gICAgICB2YXIgbW9kZWwgPSAoPFdlYlNxbFN0b3JlPlRFU1Quc3RvcmUpLmNyZWF0ZU1vZGVsKFRlc3RNb2RlbDIsIHsga2V5OiBURVNULmtleSB9KTtcclxuXHJcbiAgICAgIGFzc2VydC5pc09iamVjdChtb2RlbCwgJ25ldyBtb2RlbCBjcmVhdGVkJyk7XHJcblxyXG4gICAgICBtb2RlbC5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdtb2RlbCBoYXMgYmVlbiBmZXRjaGVkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmlkLCBURVNULmtleSwgJ2ZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkZWxldGUgcmVjb3JkJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5nZXQoVEVTVC5rZXkpLmRlc3Ryb3koXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKG1vZGVsOiBhbnkpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdyZWNvcmQgaGFzIGJlZW4gZGVsZXRlZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdmZXRjaGluZyBjb2xsZWN0aW9uJywgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24gKGNvbGxlY3Rpb246IGFueSkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdUZXN0IGNvbGxlY3Rpb24gZmV0Y2hlZCBzdWNjZXNzZnVsbHkuJyk7XHJcbiAgICAgICAgICBURVNULmNvdW50ID0gVEVTVC5UZXN0cy5sZW5ndGg7XHJcbiAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY2xlYW51cCByZWNvcmRzIHdlYnNxbCcsIGZ1bmN0aW9uIChkb25lKSB7XHJcblxyXG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBkb25lKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgVEVTVC5UZXN0cy5vbignYWxsJywgZnVuY3Rpb24gKGV2ZW50OiBzdHJpbmcpIHtcclxuICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Rlc3Ryb3knICYmIFRFU1QuVGVzdHMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHZhciBtb2RlbDogTW9kZWw7XHJcbiAgICAgICAgd2hpbGUgKG1vZGVsID0gVEVTVC5UZXN0cy5maXJzdCgpKSB7XHJcbiAgICAgICAgICBtb2RlbC5kZXN0cm95KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZHJvcCB0YWJsZScsIFRFU1QuZHJvcFRhYmxlVGVzdCksXHJcblxyXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQgKG5vIHNjaGVtYSknLCBmdW5jdGlvbiAoZG9uZSkge1xyXG5cclxuICAgICAgLy8gcmVjcmVhdGUgc3RvcmUgdHlwZSB0byBkcm9wIHNjaGVtYSBpbmZvcm1hdGlvblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFdlYlNxbFN0b3JlKHVuZGVmaW5lZCk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgICAgIGlkQXR0cmlidXRlOiAna2V5JyxcclxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xyXG5cclxuICAgICAgVEVTVC5UZXN0czIgPSAoPFdlYlNxbFN0b3JlPlRFU1Quc3RvcmUpLmNyZWF0ZUNvbGxlY3Rpb24oQ29sbGVjdGlvbi5kZWZhdWx0cyh7XHJcbiAgICAgICAgbW9kZWw6IFRFU1QuVGVzdE1vZGVsMlxyXG4gICAgICB9KSk7XHJcbiAgICAgIGFzc2VydC5pc09iamVjdChURVNULlRlc3RzMiwgJ0NvbGxlY3Rpb24gY3JlYXRlZCcpO1xyXG5cclxuICAgICAgVEVTVC5kYXRhID0ge1xyXG4gICAgICAgIGZpcnN0TmFtZTogJ01heCcsXHJcbiAgICAgICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcclxuICAgICAgICBhZ2U6IDMzXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBURVNULlRlc3RzMi5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChtb2RlbDogTW9kZWwpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAnbmV3IHJlY29yZCBleGlzdHMuJyk7XHJcblxyXG4gICAgICAgICAgICBURVNULmtleSA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1Qua2V5LCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XHJcblxyXG4gICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ3JlYWQgcmVjb3JkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzMi5nZXQoVEVTVC5rZXkpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAncmVjb3JkIGZvdW5kJyk7XHJcblxyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnc3VyZU5hbWUnIHZhbHVlXCIpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkcm9wIHRhYmxlJywgVEVTVC5kcm9wVGFibGVUZXN0KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19