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
var http_spec_1 = require('../web/http.spec');
function backbone_error(done) {
    return function (model, error) {
        done(error instanceof Error ? error : new Error(JSON.stringify(error)));
    };
}
describe(module.filename || __filename, function () {
    this.timeout(5000 * 1000);
    var TEST;
    before(function () {
        return http_spec_1.testServer.login.then(function (result) {
            TEST = {
                data: {
                    firstName: 'Max',
                    sureName: 'Mustermann',
                    age: 33
                }
            };
            return result;
        });
    });
    return [
        it('creating store', function () {
            chai_1.assert.isString(http_spec_1.testServer.serverUrl, 'Server url is defined.');
            chai_1.assert.isFunction(SyncStore_1.SyncStore, 'SyncStore is defined');
            TEST.store = new SyncStore_1.SyncStore({
                application: 'relutionsdk',
                useLocalStore: true,
                useSocketNotify: false
            });
            chai_1.assert.isObject(TEST.store, 'store successfully created.');
            chai_1.assert.ok(TEST.store.useLocalStore);
            chai_1.assert.ok(!TEST.store.useSocketNotify);
        }),
        it('creating collection', function () {
            chai_1.assert.isFunction(Collection_1.Collection, 'Collection is defined');
            TEST.urlRoot = 'api/v1/test/';
            var TestModel = (function (_super) {
                __extends(TestModel, _super);
                function TestModel() {
                    _super.apply(this, arguments);
                }
                return TestModel;
            }(Model_1.Model.defaults({
                idAttribute: '_id',
                entity: 'test',
                urlRoot: TEST.urlRoot
            })));
            TEST.TestModel = TestModel;
            chai_1.assert.isFunction(TEST.TestModel, 'TestModel model successfully extended.');
            var TestsModelCollection = (function (_super) {
                __extends(TestsModelCollection, _super);
                function TestsModelCollection() {
                    _super.apply(this, arguments);
                }
                return TestsModelCollection;
            }(Collection_1.Collection.defaults({
                model: TEST.TestModel,
                options: {
                    sort: { sureName: 1 },
                    fields: { USERNAME: 1, sureName: 1, firstName: 1, age: 1 },
                    query: { age: { $gte: 25 } }
                }
            })));
            TEST.TestsModelCollection = TestsModelCollection;
            chai_1.assert.isFunction(TEST.TestsModelCollection, 'Test collection successfully extended.');
            TEST.Tests = TEST.store.createCollection(TestsModelCollection);
            chai_1.assert.isObject(TEST.Tests, 'Test collection successfully created.');
            chai_1.assert.equal(TEST.Tests.store, TEST.store, 'Test collection has the correct store.');
            var url = TEST.Tests.getUrl();
            chai_1.assert.ok(url !== TEST.urlRoot, 'The base url has been extended.');
            chai_1.assert.ok(url.indexOf(TEST.urlRoot) > 0, 'the new url has the set url as a part.');
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
            }(Model_1.Model.defaults({
                urlRoot: TEST.urlRoot,
                idAttribute: '_id',
                entity: 'test'
            })));
            TEST.TestModel2 = TestModel2;
            var data = { _id: TEST.id };
            var model = TEST.store.createModel(TestModel2, data);
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
            var TestModel3 = (function (_super) {
                __extends(TestModel3, _super);
                function TestModel3() {
                    _super.apply(this, arguments);
                }
                return TestModel3;
            }(Model_1.Model.defaults({
                urlRoot: TEST.urlRoot,
                idAttribute: '_id',
                entity: 'test'
            })));
            TEST.TestModel3 = TestModel3;
            var model = TEST.store.createModel(TestModel3, {});
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
            var TestModel4 = (function (_super) {
                __extends(TestModel4, _super);
                function TestModel4() {
                    _super.apply(this, arguments);
                }
                return TestModel4;
            }(Model_1.Model.defaults({
                urlRoot: TEST.urlRoot,
                idAttribute: '_id',
                entity: 'test'
            })));
            TEST.TestModel4 = TestModel4;
            var model = TEST.store.createModel(TestModel4, {
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
            var TestModel5 = (function (_super) {
                __extends(TestModel5, _super);
                function TestModel5(attrs) {
                    _super.call(this, attrs);
                    this.ajax = this.ajax.bind(this);
                }
                TestModel5.prototype.ajax = function (options) {
                    var _this = this;
                    // following simulates server reassigning ID value
                    return _super.prototype.ajax.apply(this, arguments).then(function (response) {
                        if (_this.id === oldId) {
                            response._id = newId;
                        }
                        else if (_this.id === newId) {
                            response._id = oldId;
                        }
                        return response;
                    });
                };
                return TestModel5;
            }(Model_1.Model.defaults({
                urlRoot: TEST.urlRoot,
                idAttribute: '_id',
                entity: 'test'
            })));
            var testModel = TEST.store.createModel(TestModel5, model.attributes);
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
                options['url'] = testModel.urlRoot + oldId; // must fix up URL as we hacked it
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
            chai_1.assert.equal(TEST.Tests.models.length, TEST.Tests.length, 'backbone and array report the same length');
            if (TEST.Tests.length === 0) {
                done();
            }
            else {
                var hasError = false, isDone = false;
                var count = 0;
                TEST.Tests.models.forEach(function (model) {
                    if (!hasError) {
                        ++count;
                        model.destroy({
                            success: function () {
                                if (--count === 0 && !isDone) {
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
                chai_1.assert.equal(count, TEST.Tests.length, 'destroy executes asynchronously');
            }
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsMkJBQXlCLGNBQWMsQ0FBQyxDQUFBO0FBQ3hDLDBCQUF3QixhQUFhLENBQUMsQ0FBQTtBQUV0QywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1Qyx3QkFBd0IsSUFBYztJQUNwQyxNQUFNLENBQUMsVUFBVSxLQUF5QixFQUFFLEtBQVU7UUFDcEQsSUFBSSxDQUFDLEtBQUssWUFBWSxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFFMUIsSUFBSSxJQUFTLENBQUM7SUFFZCxNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxJQUFJLEdBQUc7Z0JBQ0wsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxLQUFLO29CQUNoQixRQUFRLEVBQUUsWUFBWTtvQkFDdEIsR0FBRyxFQUFFLEVBQUU7aUJBQ1I7YUFDRixDQUFDO1lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNM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QzFELElBQUksRUFBRSxDQUFDO2dDQUNULENBQUM7NEJBQ0gsQ0FBQzs0QkFDRCxLQUFLLEVBQUU7Z0NBQ0wsUUFBUSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0NBQ3pCLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRCQUM5QyxDQUFDO3lCQUNGLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDNUUsQ0FBQztRQUNILENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNTdG9yZS5zcGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcclxuXHJcbmltcG9ydCB7TW9kZWx9IGZyb20gJy4vTW9kZWwnO1xyXG5pbXBvcnQge0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcbmltcG9ydCB7U3luY1N0b3JlfSBmcm9tICcuL1N5bmNTdG9yZSc7XHJcblxyXG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xyXG5cclxuZnVuY3Rpb24gYmFja2JvbmVfZXJyb3IoZG9uZTogRnVuY3Rpb24pIHtcclxuICByZXR1cm4gZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIGVycm9yOiBhbnkpIHtcclxuICAgIGRvbmUoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGVycm9yKSkpO1xyXG4gIH07XHJcbn1cclxuXHJcbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcclxuICB0aGlzLnRpbWVvdXQoNTAwMCAqIDEwMDApO1xyXG5cclxuICB2YXIgVEVTVDogYW55O1xyXG5cclxuICBiZWZvcmUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGVzdFNlcnZlci5sb2dpbi50aGVuKChyZXN1bHQpID0+IHtcclxuICAgICAgVEVTVCA9IHtcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICBmaXJzdE5hbWU6ICdNYXgnLFxyXG4gICAgICAgICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcclxuICAgICAgICAgIGFnZTogMzNcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgc3RvcmUnLCAoKSA9PiB7XHJcbiAgICAgIGFzc2VydC5pc1N0cmluZyh0ZXN0U2VydmVyLnNlcnZlclVybCwgJ1NlcnZlciB1cmwgaXMgZGVmaW5lZC4nKTtcclxuXHJcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKFN5bmNTdG9yZSwgJ1N5bmNTdG9yZSBpcyBkZWZpbmVkJyk7XHJcblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFN5bmNTdG9yZSh7XHJcbiAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaycsXHJcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcclxuICAgICAgICB1c2VTb2NrZXROb3RpZnk6IGZhbHNlXHJcbiAgICAgIH0pO1xyXG4gICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5zdG9yZSwgJ3N0b3JlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG4gICAgICBhc3NlcnQub2soVEVTVC5zdG9yZS51c2VMb2NhbFN0b3JlKTtcclxuICAgICAgYXNzZXJ0Lm9rKCFURVNULnN0b3JlLnVzZVNvY2tldE5vdGlmeSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgY29sbGVjdGlvbicsICgpID0+IHtcclxuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oQ29sbGVjdGlvbiwgJ0NvbGxlY3Rpb24gaXMgZGVmaW5lZCcpO1xyXG5cclxuICAgICAgVEVTVC51cmxSb290ID0gJ2FwaS92MS90ZXN0Lyc7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdfaWQnLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnLFxyXG4gICAgICAgIHVybFJvb3Q6IFRFU1QudXJsUm9vdFxyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbCA9IFRlc3RNb2RlbDtcclxuXHJcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKFRFU1QuVGVzdE1vZGVsLCAnVGVzdE1vZGVsIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RzTW9kZWxDb2xsZWN0aW9uIGV4dGVuZHMgQ29sbGVjdGlvbi5kZWZhdWx0cyh7XHJcbiAgICAgICAgbW9kZWw6IFRFU1QuVGVzdE1vZGVsLFxyXG4gICAgICAgIG9wdGlvbnM6IHtcclxuICAgICAgICAgIHNvcnQ6IHsgc3VyZU5hbWU6IDEgfSxcclxuICAgICAgICAgIGZpZWxkczogeyBVU0VSTkFNRTogMSwgc3VyZU5hbWU6IDEsIGZpcnN0TmFtZTogMSwgYWdlOiAxIH0sXHJcbiAgICAgICAgICBxdWVyeTogeyBhZ2U6IHsgJGd0ZTogMjUgfSB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RzTW9kZWxDb2xsZWN0aW9uID0gVGVzdHNNb2RlbENvbGxlY3Rpb247XHJcblxyXG4gICAgICBhc3NlcnQuaXNGdW5jdGlvbihURVNULlRlc3RzTW9kZWxDb2xsZWN0aW9uLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuVGVzdHMgPSAoPFN5bmNTdG9yZT5URVNULnN0b3JlKS5jcmVhdGVDb2xsZWN0aW9uKFRlc3RzTW9kZWxDb2xsZWN0aW9uKTtcclxuXHJcbiAgICAgIGFzc2VydC5pc09iamVjdChURVNULlRlc3RzLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMuc3RvcmUsIFRFU1Quc3RvcmUsICdUZXN0IGNvbGxlY3Rpb24gaGFzIHRoZSBjb3JyZWN0IHN0b3JlLicpO1xyXG5cclxuICAgICAgdmFyIHVybCA9IFRFU1QuVGVzdHMuZ2V0VXJsKCk7XHJcblxyXG4gICAgICBhc3NlcnQub2sodXJsICE9PSBURVNULnVybFJvb3QsICdUaGUgYmFzZSB1cmwgaGFzIGJlZW4gZXh0ZW5kZWQuJyk7XHJcblxyXG4gICAgICBhc3NlcnQub2sodXJsLmluZGV4T2YoVEVTVC51cmxSb290KSA+IDAsICd0aGUgbmV3IHVybCBoYXMgdGhlIHNldCB1cmwgYXMgYSBwYXJ0LicpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKHVybC5pbmRleE9mKCdxdWVyeT0nKSA+IDAsICdxdWVyeSBpcyBwYXJ0IG9mIHRoZSB1cmwuJyk7XHJcblxyXG4gICAgICBhc3NlcnQub2sodXJsLmluZGV4T2YoJ2ZpZWxkcz0nKSA+IDAsICdmaWVsZHMgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKHVybC5pbmRleE9mKCdzb3J0PScpID4gMCwgJ3NvcnQgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xyXG5cclxuICAgICAgLy8gdHJ5IHRvIGNsZWFuIGV2ZXJ5dGhpbmdcclxuICAgICAgVEVTVC5zdG9yZS5jbGVhcihURVNULlRlc3RzKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdjcmVhdGUgcmVjb3JkJywgKGRvbmUpID0+IHtcclxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICduZXcgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5pZCA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1QuaWQsICduZXcgcmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdnZXQgcmVjb3JkJywgKCkgPT4ge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgZGF0YSB3aXRoIG5ldyBtb2RlbCcsIChkb25lKSA9PiB7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgICAgIHVybFJvb3Q6IFRFU1QudXJsUm9vdCxcclxuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXHJcbiAgICAgICAgZW50aXR5OiAndGVzdCdcclxuICAgICAgfSkge31cclxuICAgICAgVEVTVC5UZXN0TW9kZWwyID0gVGVzdE1vZGVsMjtcclxuXHJcbiAgICAgIHZhciBkYXRhID0geyBfaWQ6IFRFU1QuaWQgfTtcclxuICAgICAgdmFyIG1vZGVsID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlTW9kZWwoVGVzdE1vZGVsMiwgZGF0YSk7XHJcblxyXG4gICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICduZXcgbW9kZWwgY3JlYXRlZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKF8uaXNFcXVhbChtb2RlbC5hdHRyaWJ1dGVzLCBkYXRhKSwgJ25ldyBtb2RlbCBob2xkcyBjb3JyZWN0IGRhdGEgYXR0cmlidXRlcycpO1xyXG5cclxuICAgICAgbW9kZWwuZmV0Y2goe1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdtb2RlbCBoYXMgYmVlbiBmZXRjaGVkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIC8vIGZvbGxvd2luZyBpcyBkaWZmZXJlbnQgdG8gb3RoZXIgdGVzdHMgYXMgVEVTVC5zdG9yZSBkb2VzIG5vdCByZWNyZWF0ZSBsb2NhbFN0b3JlIGFuZCB0aHVzIGRvZXMgbm90IHNlZSBlbnRpdHkgY2hhbmdlXHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGEuc3VyZU5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnVVNFUk5BTUUnIHZhbHVlXCIpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdmZXRjaGluZyBtb2RlbCB3aXRoIG5vIGlkIHVzaW5nIGNhbGxiYWNrcycsIChkb25lKSA9PiB7XHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbDMgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgdXJsUm9vdDogVEVTVC51cmxSb290LFxyXG4gICAgICAgIGlkQXR0cmlidXRlOiAnX2lkJyxcclxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xyXG4gICAgICB9KSB7fVxyXG4gICAgICBURVNULlRlc3RNb2RlbDMgPSBUZXN0TW9kZWwzO1xyXG5cclxuICAgICAgdmFyIG1vZGVsID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlTW9kZWwoVGVzdE1vZGVsMywge30pO1xyXG4gICAgICBtb2RlbC5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24obW9kZWwyOiBNb2RlbCkge1xyXG4gICAgICAgICAgYmFja2JvbmVfZXJyb3IoZG9uZSkobW9kZWwyLCBuZXcgRXJyb3IoJ3RoaXMgc2hvdWxkIGhhdmUgZmFpbGVkIScpKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2ZldGNoaW5nIG1vZGVsIHdpdGggZW1wdHktc3RyaW5nIGlkIHVzaW5nIHByb21pc2VzJywgKGRvbmUpID0+IHtcclxuICAgICAgY2xhc3MgVGVzdE1vZGVsNCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgICAgICB1cmxSb290OiBURVNULnVybFJvb3QsXHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdfaWQnLFxyXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXHJcbiAgICAgIH0pIHt9XHJcbiAgICAgIFRFU1QuVGVzdE1vZGVsNCA9IFRlc3RNb2RlbDQ7XHJcblxyXG4gICAgICB2YXIgbW9kZWwgPSAoPFN5bmNTdG9yZT5URVNULnN0b3JlKS5jcmVhdGVNb2RlbChUZXN0TW9kZWw0LCB7XHJcbiAgICAgICAgX2lkOiAnJ1xyXG4gICAgICB9KTtcclxuICAgICAgbW9kZWwuZmV0Y2goKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcigndGhpcyBzaG91bGQgaGF2ZSBmYWlsZWQhJyk7XHJcbiAgICAgIH0sXHJcbiAgICAgIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIHJldHVybiBtb2RlbDtcclxuICAgICAgfSkudGhlbihmdW5jdGlvbihtb2RlbDI6IE1vZGVsKSB7XHJcbiAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgIHJldHVybiBtb2RlbDI7XHJcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yOiBFcnJvcikge1xyXG4gICAgICAgIGJhY2tib25lX2Vycm9yKGRvbmUpKG1vZGVsLCBlcnJvcik7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xyXG4gICAgICB9KS5kb25lKCk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgY29sbGVjdGlvbicsIChkb25lKSA9PiB7XHJcbiAgICAgIFRFU1QuVGVzdHMucmVzZXQoKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMubGVuZ3RoLCAwLCAncmVzZXQgaGFzIGNsZWFyZWQgdGhlIGNvbGxlY3Rpb24uJyk7XHJcblxyXG4gICAgICBURVNULlRlc3RzLmZldGNoKHtcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihjb2xsZWN0aW9uOiBDb2xsZWN0aW9uKSB7XHJcbiAgICAgICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCksICdUaGUgbW9kZWwgaXMgc3RpbGwgdGhlcmUnKTtcclxuICAgICAgICAgIGRvbmUoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdnZXQgcmVjb3JkJywgKCkgPT4ge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICAvLyBmb2xsb3dpbmcgdGVzdCBjaGVja3MgY2xpZW50LXNpZGUgYmVoYXZpb3IgaW4gY2FzZSBzZXJ2ZXItc2lkZSBhbHRlcnMgb2JqZWN0IElEIG9uIHVwZGF0ZTpcclxuICAgIC8vXHJcbiAgICAvLyAxLiBUaGUgdGVzdCB0ZW1wb3JhcmlseSBvdmVyd3JpdGVzIHRoZSBhamF4KCkgbWV0aG9kIHRvIG1vZGlmeSByZXNwb25zZSBkYXRhLCBzdWJzdGl0dXRpbmcgbmV3XHJcbiAgICAvLyAgICBieSBvbGQgaWQuXHJcbiAgICAvLyAyLiBUaGVuIHRoZSBzeW5jZWQgY29sbGVjdGlvbiBpcyBjaGVja2VkIHRvIGNvbnRhaW4gY29ycmVjdCBkYXRhIGFuZCB0aGF0IGxvb2t1cCBieSBpZHMgd29ya3NcclxuICAgIC8vICAgIHN1Y2ggdGhhdCBhbiBvbGQgaWQgbG9va3VwIG5vIGxvbmdlciBmaW5kcyBkYXRhIGFuZCBhIG5ldyBpZCBsb29rdXAgeWllbGRzIHRoZSBleGlzdGluZyByZWNvcmQuXHJcbiAgICAvLyAzLiBUaGUgdXBkYXRlIG9wZXJhdGlvbiBpcyByZXBlYXRlZCBzdWJzdGl0dXRpbmcgb2xkIGlkIGJ5IG5ldyBpZCB0byByZXZlcnQgaW50byBjb3JyZWN0IHN0YXRlIGFnYWluLlxyXG4gICAgLy8gNC4gRmluYWxseSB0aGUgcmVzdG9yZWQgc3RhdGUgaXMgY2hlY2tlZC5cclxuICAgIC8vXHJcbiAgICAvLyBJbiBlZmZlY3QgdGhlIElEIGNoYW5nZSBpcyBkb25lIHR3aWNlLiBUaGlzIGlzIHRvIGF2b2lkIGZhaWx1cmUgaW4gc3Vic2VxdWVudCB0ZXN0cyB3aGljaCBhdHRlbXB0XHJcbiAgICAvLyB0byBkZWxldGUgcmVjb3Jkcy4gU2luY2Ugd2UgbW9kaWZpZWQgdGhlIElEcyBieSB0d2Vha2luZyB0aGUgSFRUUCByZXNwb25zZSBkYXRhIGluIHRoZSBhamF4IGNhbGwsXHJcbiAgICAvLyB0aGUgYWN0dWFsIHNlcnZlciBkb2VzIG5vdCBrbm93IGFib3V0IHRoZSBJRCBjaGFuZ2VzLiBUaHVzLCBkZWxldGlvbnMgaW4gc3Vic2VxdWVudCB0ZXN0cyB3b3VsZFxyXG4gICAgLy8gZmFpbCwgaWYgd2UgZGlkIG5vdCBjaGFuZ2UgdGhlIElEIGJhY2sgYWdhaW4hXHJcbiAgICBpdCgnY2hhbmdlIHJlY29yZCBpZCcsIChkb25lKSA9PiB7XHJcbiAgICAgIHZhciBtb2RlbCA9IFRFU1QuVGVzdHMuZ2V0KFRFU1QuaWQpO1xyXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcclxuICAgICAgdmFyIG9sZElkID0gbW9kZWwuaWQ7XHJcbiAgICAgIHZhciBuZXdJZCA9ICc0NzExLScgKyBvbGRJZDtcclxuXHJcbiAgICAgIGNsYXNzIFRlc3RNb2RlbDUgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgdXJsUm9vdDogVEVTVC51cmxSb290LFxyXG4gICAgICAgIGlkQXR0cmlidXRlOiAnX2lkJyxcclxuICAgICAgICBlbnRpdHk6ICd0ZXN0J1xyXG4gICAgICB9KSB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoYXR0cnM6IGFueSkge1xyXG4gICAgICAgICAgc3VwZXIoYXR0cnMpO1xyXG4gICAgICAgICAgdGhpcy5hamF4ID0gdGhpcy5hamF4LmJpbmQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhamF4KG9wdGlvbnM/OiBhbnkpIHtcclxuICAgICAgICAgIC8vIGZvbGxvd2luZyBzaW11bGF0ZXMgc2VydmVyIHJlYXNzaWduaW5nIElEIHZhbHVlXHJcbiAgICAgICAgICByZXR1cm4gc3VwZXIuYWpheC5hcHBseSh0aGlzLCBhcmd1bWVudHMpLnRoZW4oKHJlc3BvbnNlOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaWQgPT09IG9sZElkKSB7XHJcbiAgICAgICAgICAgICAgcmVzcG9uc2UuX2lkID0gbmV3SWQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5pZCA9PT0gbmV3SWQpIHtcclxuICAgICAgICAgICAgICByZXNwb25zZS5faWQgPSBvbGRJZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHZhciB0ZXN0TW9kZWwgPSAoPFN5bmNTdG9yZT5URVNULnN0b3JlKS5jcmVhdGVNb2RlbChUZXN0TW9kZWw1LCBtb2RlbC5hdHRyaWJ1dGVzKTtcclxuXHJcbiAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgIHdhaXQ6IHRydWVcclxuICAgICAgfTtcclxuICAgICAgdmFyIHByb21pc2UgPSB0ZXN0TW9kZWwuc2F2ZSh1bmRlZmluZWQsIG9wdGlvbnMpO1xyXG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIGFzc2VydC5vayh0ZXN0TW9kZWwuaWQsICdyZWNvcmQgaGFzIGFuIGlkLicpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0TW9kZWwuaWQsIG5ld0lkLCAncmVjb3JkIGhhcyBuZXcgaWQuJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMuZ2V0KHRlc3RNb2RlbC5pZCksIG1vZGVsLCAnbW9kZWwgaXMgZm91bmQgaW4gY29sbGVjdGlvbiBieSBuZXcgaWQuJyk7XHJcbiAgICAgICAgYXNzZXJ0LmlzVW5kZWZpbmVkKFRFU1QuVGVzdHMuZ2V0KG9sZElkKSwgJ21vZGVsIGlzIG1pc3NpbmcgaW4gY29sbGVjdGlvbiBieSBvbGQgaWQuJyk7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgLy8gcmV2ZXJ0cyBsb2NhbCBjaGFuZ2VzXHJcbiAgICAgICAgb3B0aW9uc1sndXJsJ10gPSB0ZXN0TW9kZWwudXJsUm9vdCArIG9sZElkOyAvLyBtdXN0IGZpeCB1cCBVUkwgYXMgd2UgaGFja2VkIGl0XHJcbiAgICAgICAgcmV0dXJuIHRlc3RNb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucykudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGFzc2VydC5vayh0ZXN0TW9kZWwuaWQsICdyZWNvcmQgaGFzIGFuIGlkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RNb2RlbC5pZCwgb2xkSWQsICdyZWNvcmQgaGFzIG5ldyBpZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChURVNULlRlc3RzLmdldCh0ZXN0TW9kZWwuaWQpLCBtb2RlbCwgJ21vZGVsIGlzIGZvdW5kIGluIGNvbGxlY3Rpb24gYnkgb2xkIGlkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmlzVW5kZWZpbmVkKFRFU1QuVGVzdHMuZ2V0KG5ld0lkKSwgJ21vZGVsIGlzIG1pc3NpbmcgaW4gY29sbGVjdGlvbiBieSBuZXcgaWQuJyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLnRoZW4oZG9uZSwgYmFja2JvbmVfZXJyb3IoZG9uZSkpO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2RlbGV0ZSByZWNvcmQnLCAoZG9uZSkgPT4ge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcclxuXHJcbiAgICAgIGFzc2VydC5pc09iamVjdChtb2RlbCwgJ21vZGVsIGZvdW5kIGluIGNvbGxlY3Rpb24nKTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5pZCwgVEVTVC5pZCwgJ21vZGVsIGhhcyB0aGUgY29ycmVjdCBpZCcpO1xyXG5cclxuICAgICAgbW9kZWwuZGVzdHJveShcclxuICAgICAgICB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihtb2RlbDI6IGFueSkge1xyXG4gICAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ3JlY29yZCBoYXMgYmVlbiBkZWxldGVkLicpO1xyXG4gICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXHJcbiAgICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY2xlYW51cCByZWNvcmRzJywgKGRvbmUpID0+IHtcclxuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMubW9kZWxzLmxlbmd0aCwgVEVTVC5UZXN0cy5sZW5ndGgsICdiYWNrYm9uZSBhbmQgYXJyYXkgcmVwb3J0IHRoZSBzYW1lIGxlbmd0aCcpO1xyXG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBkb25lKCk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdmFyIGhhc0Vycm9yID0gZmFsc2UsIGlzRG9uZSA9IGZhbHNlO1xyXG4gICAgICAgIHZhciBjb3VudCA9IDA7XHJcbiAgICAgICAgVEVTVC5UZXN0cy5tb2RlbHMuZm9yRWFjaChmdW5jdGlvbihtb2RlbDogTW9kZWwpIHtcclxuICAgICAgICAgIGlmICghaGFzRXJyb3IpIHtcclxuICAgICAgICAgICAgKytjb3VudDtcclxuICAgICAgICAgICAgbW9kZWwuZGVzdHJveSh7XHJcbiAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMCAmJiAhaXNEb25lKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlzRG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChURVNULlRlc3RzLmxlbmd0aCwgMCwgJ2NvbGxlY3Rpb24gaXMgZW1wdHknKTtcclxuICAgICAgICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgaGFzRXJyb3IgPSBpc0RvbmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYmFja2JvbmVfZXJyb3IoZG9uZSkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChjb3VudCwgVEVTVC5UZXN0cy5sZW5ndGgsICdkZXN0cm95IGV4ZWN1dGVzIGFzeW5jaHJvbm91c2x5Jyk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=