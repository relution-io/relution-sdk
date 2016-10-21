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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsMkJBQXlCLGNBQWMsQ0FBQyxDQUFBO0FBQ3hDLDBCQUF3QixhQUFhLENBQUMsQ0FBQTtBQUV0QywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1Qyx3QkFBd0IsSUFBYztJQUNwQyxNQUFNLENBQUMsVUFBVSxLQUF5QixFQUFFLEtBQVU7UUFDcEQsSUFBSSxDQUFDLEtBQUssWUFBWSxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFFMUIsSUFBSSxJQUFTLENBQUM7SUFFZCxNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxJQUFJLEdBQUc7Z0JBQ0wsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxLQUFLO29CQUNoQixRQUFRLEVBQUUsWUFBWTtvQkFDdEIsR0FBRyxFQUFFLEVBQUU7aUJBQ1I7YUFDRixDQUFDO1lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztJQUNM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QzFELElBQUksRUFBRSxDQUFDO2dDQUNULENBQUM7NEJBQ0gsQ0FBQzs0QkFDRCxLQUFLLEVBQUU7Z0NBQ0wsUUFBUSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUM7Z0NBQ3pCLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFDOzRCQUM5QyxDQUFDO3lCQUNGLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNILGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7WUFDNUUsQ0FBQztRQUNILENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUuc3BlYy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5cbmltcG9ydCB7TW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcblxuaW1wb3J0IHt0ZXN0U2VydmVyfSBmcm9tICcuLi93ZWIvaHR0cC5zcGVjJztcblxuZnVuY3Rpb24gYmFja2JvbmVfZXJyb3IoZG9uZTogRnVuY3Rpb24pIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBlcnJvcjogYW55KSB7XG4gICAgZG9uZShlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoSlNPTi5zdHJpbmdpZnkoZXJyb3IpKSk7XG4gIH07XG59XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgdGhpcy50aW1lb3V0KDUwMDAgKiAxMDAwKTtcblxuICB2YXIgVEVTVDogYW55O1xuXG4gIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGVzdFNlcnZlci5sb2dpbi50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgIFRFU1QgPSB7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBmaXJzdE5hbWU6ICdNYXgnLFxuICAgICAgICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXG4gICAgICAgICAgYWdlOiAzM1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIFtcblxuICAgIGl0KCdjcmVhdGluZyBzdG9yZScsICgpID0+IHtcbiAgICAgIGFzc2VydC5pc1N0cmluZyh0ZXN0U2VydmVyLnNlcnZlclVybCwgJ1NlcnZlciB1cmwgaXMgZGVmaW5lZC4nKTtcblxuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oU3luY1N0b3JlLCAnU3luY1N0b3JlIGlzIGRlZmluZWQnKTtcblxuICAgICAgVEVTVC5zdG9yZSA9IG5ldyBTeW5jU3RvcmUoe1xuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJyxcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcbiAgICAgICAgdXNlU29ja2V0Tm90aWZ5OiBmYWxzZVxuICAgICAgfSk7XG4gICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5zdG9yZSwgJ3N0b3JlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xuICAgICAgYXNzZXJ0Lm9rKFRFU1Quc3RvcmUudXNlTG9jYWxTdG9yZSk7XG4gICAgICBhc3NlcnQub2soIVRFU1Quc3RvcmUudXNlU29ja2V0Tm90aWZ5KTtcbiAgICB9KSxcblxuICAgIGl0KCdjcmVhdGluZyBjb2xsZWN0aW9uJywgKCkgPT4ge1xuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oQ29sbGVjdGlvbiwgJ0NvbGxlY3Rpb24gaXMgZGVmaW5lZCcpO1xuXG4gICAgICBURVNULnVybFJvb3QgPSAnYXBpL3YxL3Rlc3QvJztcblxuICAgICAgY2xhc3MgVGVzdE1vZGVsIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnLFxuICAgICAgICB1cmxSb290OiBURVNULnVybFJvb3RcbiAgICAgIH0pIHt9XG4gICAgICBURVNULlRlc3RNb2RlbCA9IFRlc3RNb2RlbDtcblxuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oVEVTVC5UZXN0TW9kZWwsICdUZXN0TW9kZWwgbW9kZWwgc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xuXG4gICAgICBjbGFzcyBUZXN0c01vZGVsQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24uZGVmYXVsdHMoe1xuICAgICAgICBtb2RlbDogVEVTVC5UZXN0TW9kZWwsXG4gICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICBzb3J0OiB7IHN1cmVOYW1lOiAxIH0sXG4gICAgICAgICAgZmllbGRzOiB7IFVTRVJOQU1FOiAxLCBzdXJlTmFtZTogMSwgZmlyc3ROYW1lOiAxLCBhZ2U6IDEgfSxcbiAgICAgICAgICBxdWVyeTogeyBhZ2U6IHsgJGd0ZTogMjUgfSB9XG4gICAgICAgIH1cbiAgICAgIH0pIHt9XG4gICAgICBURVNULlRlc3RzTW9kZWxDb2xsZWN0aW9uID0gVGVzdHNNb2RlbENvbGxlY3Rpb247XG5cbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKFRFU1QuVGVzdHNNb2RlbENvbGxlY3Rpb24sICdUZXN0IGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xuXG4gICAgICBURVNULlRlc3RzID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlQ29sbGVjdGlvbihUZXN0c01vZGVsQ29sbGVjdGlvbik7XG5cbiAgICAgIGFzc2VydC5pc09iamVjdChURVNULlRlc3RzLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5UZXN0cy5zdG9yZSwgVEVTVC5zdG9yZSwgJ1Rlc3QgY29sbGVjdGlvbiBoYXMgdGhlIGNvcnJlY3Qgc3RvcmUuJyk7XG5cbiAgICAgIHZhciB1cmwgPSBURVNULlRlc3RzLmdldFVybCgpO1xuXG4gICAgICBhc3NlcnQub2sodXJsICE9PSBURVNULnVybFJvb3QsICdUaGUgYmFzZSB1cmwgaGFzIGJlZW4gZXh0ZW5kZWQuJyk7XG5cbiAgICAgIGFzc2VydC5vayh1cmwuaW5kZXhPZihURVNULnVybFJvb3QpID4gMCwgJ3RoZSBuZXcgdXJsIGhhcyB0aGUgc2V0IHVybCBhcyBhIHBhcnQuJyk7XG5cbiAgICAgIGFzc2VydC5vayh1cmwuaW5kZXhPZigncXVlcnk9JykgPiAwLCAncXVlcnkgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xuXG4gICAgICBhc3NlcnQub2sodXJsLmluZGV4T2YoJ2ZpZWxkcz0nKSA+IDAsICdmaWVsZHMgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xuXG4gICAgICBhc3NlcnQub2sodXJsLmluZGV4T2YoJ3NvcnQ9JykgPiAwLCAnc29ydCBpcyBwYXJ0IG9mIHRoZSB1cmwuJyk7XG5cbiAgICAgIC8vIHRyeSB0byBjbGVhbiBldmVyeXRoaW5nXG4gICAgICBURVNULnN0b3JlLmNsZWFyKFRFU1QuVGVzdHMpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2NyZWF0ZSByZWNvcmQnLCAoZG9uZSkgPT4ge1xuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxuICAgICAgICB7XG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24obW9kZWw6IE1vZGVsKSB7XG4gICAgICAgICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICduZXcgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LicpO1xuXG4gICAgICAgICAgICBURVNULmlkID0gbW9kZWwuaWQ7XG5cbiAgICAgICAgICAgIGFzc2VydC5vayhURVNULmlkLCAnbmV3IHJlY29yZCBoYXMgYW4gaWQuJyk7XG4gICAgICAgICAgICBkb25lKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KSxcblxuICAgIGl0KCdnZXQgcmVjb3JkJywgKCkgPT4ge1xuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCk7XG5cbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhLmZpcnN0TmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdmaXJzdG5hbWUnIHZhbHVlXCIpO1xuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XG5cbiAgICB9KSxcblxuICAgIGl0KCdmZXRjaGluZyBkYXRhIHdpdGggbmV3IG1vZGVsJywgKGRvbmUpID0+IHtcblxuICAgICAgY2xhc3MgVGVzdE1vZGVsMiBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgdXJsUm9vdDogVEVTVC51cmxSb290LFxuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5UZXN0TW9kZWwyID0gVGVzdE1vZGVsMjtcblxuICAgICAgdmFyIGRhdGEgPSB7IF9pZDogVEVTVC5pZCB9O1xuICAgICAgdmFyIG1vZGVsID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlTW9kZWwoVGVzdE1vZGVsMiwgZGF0YSk7XG5cbiAgICAgIGFzc2VydC5pc09iamVjdChtb2RlbCwgJ25ldyBtb2RlbCBjcmVhdGVkJyk7XG5cbiAgICAgIGFzc2VydC5vayhfLmlzRXF1YWwobW9kZWwuYXR0cmlidXRlcywgZGF0YSksICduZXcgbW9kZWwgaG9sZHMgY29ycmVjdCBkYXRhIGF0dHJpYnV0ZXMnKTtcblxuICAgICAgbW9kZWwuZmV0Y2goe1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ21vZGVsIGhhcyBiZWVuIGZldGNoZWQuJyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcbiAgICAgICAgICAvLyBmb2xsb3dpbmcgaXMgZGlmZmVyZW50IHRvIG90aGVyIHRlc3RzIGFzIFRFU1Quc3RvcmUgZG9lcyBub3QgcmVjcmVhdGUgbG9jYWxTdG9yZSBhbmQgdGh1cyBkb2VzIG5vdCBzZWUgZW50aXR5IGNoYW5nZVxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdVU0VSTkFNRScgdmFsdWVcIik7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgbW9kZWwgd2l0aCBubyBpZCB1c2luZyBjYWxsYmFja3MnLCAoZG9uZSkgPT4ge1xuICAgICAgY2xhc3MgVGVzdE1vZGVsMyBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgdXJsUm9vdDogVEVTVC51cmxSb290LFxuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5UZXN0TW9kZWwzID0gVGVzdE1vZGVsMztcblxuICAgICAgdmFyIG1vZGVsID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlTW9kZWwoVGVzdE1vZGVsMywge30pO1xuICAgICAgbW9kZWwuZmV0Y2goe1xuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihtb2RlbDI6IE1vZGVsKSB7XG4gICAgICAgICAgYmFja2JvbmVfZXJyb3IoZG9uZSkobW9kZWwyLCBuZXcgRXJyb3IoJ3RoaXMgc2hvdWxkIGhhdmUgZmFpbGVkIScpKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgbW9kZWwgd2l0aCBlbXB0eS1zdHJpbmcgaWQgdXNpbmcgcHJvbWlzZXMnLCAoZG9uZSkgPT4ge1xuICAgICAgY2xhc3MgVGVzdE1vZGVsNCBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgdXJsUm9vdDogVEVTVC51cmxSb290LFxuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXG4gICAgICAgIGVudGl0eTogJ3Rlc3QnXG4gICAgICB9KSB7fVxuICAgICAgVEVTVC5UZXN0TW9kZWw0ID0gVGVzdE1vZGVsNDtcblxuICAgICAgdmFyIG1vZGVsID0gKDxTeW5jU3RvcmU+VEVTVC5zdG9yZSkuY3JlYXRlTW9kZWwoVGVzdE1vZGVsNCwge1xuICAgICAgICBfaWQ6ICcnXG4gICAgICB9KTtcbiAgICAgIG1vZGVsLmZldGNoKCkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0aGlzIHNob3VsZCBoYXZlIGZhaWxlZCEnKTtcbiAgICAgIH0sXG4gICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZGVsO1xuICAgICAgfSkudGhlbihmdW5jdGlvbihtb2RlbDI6IE1vZGVsKSB7XG4gICAgICAgIGRvbmUoKTtcbiAgICAgICAgcmV0dXJuIG1vZGVsMjtcbiAgICAgIH0sIGZ1bmN0aW9uKGVycm9yOiBFcnJvcikge1xuICAgICAgICBiYWNrYm9uZV9lcnJvcihkb25lKShtb2RlbCwgZXJyb3IpO1xuICAgICAgICByZXR1cm4gbW9kZWw7XG4gICAgICB9KS5kb25lKCk7XG4gICAgfSksXG5cbiAgICBpdCgnZmV0Y2hpbmcgY29sbGVjdGlvbicsIChkb25lKSA9PiB7XG4gICAgICBURVNULlRlc3RzLnJlc2V0KCk7XG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5UZXN0cy5sZW5ndGgsIDAsICdyZXNldCBoYXMgY2xlYXJlZCB0aGUgY29sbGVjdGlvbi4nKTtcblxuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pIHtcbiAgICAgICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCksICdUaGUgbW9kZWwgaXMgc3RpbGwgdGhlcmUnKTtcbiAgICAgICAgICBkb25lKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZ2V0IHJlY29yZCcsICgpID0+IHtcbiAgICAgIHZhciBtb2RlbCA9IFRFU1QuVGVzdHMuZ2V0KFRFU1QuaWQpO1xuXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcblxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdhZ2UnKSwgVEVTVC5kYXRhLmFnZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdhZ2UnIHZhbHVlXCIpO1xuXG4gICAgfSksXG5cbiAgICAvLyBmb2xsb3dpbmcgdGVzdCBjaGVja3MgY2xpZW50LXNpZGUgYmVoYXZpb3IgaW4gY2FzZSBzZXJ2ZXItc2lkZSBhbHRlcnMgb2JqZWN0IElEIG9uIHVwZGF0ZTpcbiAgICAvL1xuICAgIC8vIDEuIFRoZSB0ZXN0IHRlbXBvcmFyaWx5IG92ZXJ3cml0ZXMgdGhlIGFqYXgoKSBtZXRob2QgdG8gbW9kaWZ5IHJlc3BvbnNlIGRhdGEsIHN1YnN0aXR1dGluZyBuZXdcbiAgICAvLyAgICBieSBvbGQgaWQuXG4gICAgLy8gMi4gVGhlbiB0aGUgc3luY2VkIGNvbGxlY3Rpb24gaXMgY2hlY2tlZCB0byBjb250YWluIGNvcnJlY3QgZGF0YSBhbmQgdGhhdCBsb29rdXAgYnkgaWRzIHdvcmtzXG4gICAgLy8gICAgc3VjaCB0aGF0IGFuIG9sZCBpZCBsb29rdXAgbm8gbG9uZ2VyIGZpbmRzIGRhdGEgYW5kIGEgbmV3IGlkIGxvb2t1cCB5aWVsZHMgdGhlIGV4aXN0aW5nIHJlY29yZC5cbiAgICAvLyAzLiBUaGUgdXBkYXRlIG9wZXJhdGlvbiBpcyByZXBlYXRlZCBzdWJzdGl0dXRpbmcgb2xkIGlkIGJ5IG5ldyBpZCB0byByZXZlcnQgaW50byBjb3JyZWN0IHN0YXRlIGFnYWluLlxuICAgIC8vIDQuIEZpbmFsbHkgdGhlIHJlc3RvcmVkIHN0YXRlIGlzIGNoZWNrZWQuXG4gICAgLy9cbiAgICAvLyBJbiBlZmZlY3QgdGhlIElEIGNoYW5nZSBpcyBkb25lIHR3aWNlLiBUaGlzIGlzIHRvIGF2b2lkIGZhaWx1cmUgaW4gc3Vic2VxdWVudCB0ZXN0cyB3aGljaCBhdHRlbXB0XG4gICAgLy8gdG8gZGVsZXRlIHJlY29yZHMuIFNpbmNlIHdlIG1vZGlmaWVkIHRoZSBJRHMgYnkgdHdlYWtpbmcgdGhlIEhUVFAgcmVzcG9uc2UgZGF0YSBpbiB0aGUgYWpheCBjYWxsLFxuICAgIC8vIHRoZSBhY3R1YWwgc2VydmVyIGRvZXMgbm90IGtub3cgYWJvdXQgdGhlIElEIGNoYW5nZXMuIFRodXMsIGRlbGV0aW9ucyBpbiBzdWJzZXF1ZW50IHRlc3RzIHdvdWxkXG4gICAgLy8gZmFpbCwgaWYgd2UgZGlkIG5vdCBjaGFuZ2UgdGhlIElEIGJhY2sgYWdhaW4hXG4gICAgaXQoJ2NoYW5nZSByZWNvcmQgaWQnLCAoZG9uZSkgPT4ge1xuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCk7XG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcbiAgICAgIHZhciBvbGRJZCA9IG1vZGVsLmlkO1xuICAgICAgdmFyIG5ld0lkID0gJzQ3MTEtJyArIG9sZElkO1xuXG4gICAgICBjbGFzcyBUZXN0TW9kZWw1IGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xuICAgICAgICB1cmxSb290OiBURVNULnVybFJvb3QsXG4gICAgICAgIGlkQXR0cmlidXRlOiAnX2lkJyxcbiAgICAgICAgZW50aXR5OiAndGVzdCdcbiAgICAgIH0pIHtcbiAgICAgICAgY29uc3RydWN0b3IoYXR0cnM6IGFueSkge1xuICAgICAgICAgIHN1cGVyKGF0dHJzKTtcbiAgICAgICAgICB0aGlzLmFqYXggPSB0aGlzLmFqYXguYmluZCh0aGlzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGFqYXgob3B0aW9ucz86IGFueSkge1xuICAgICAgICAgIC8vIGZvbGxvd2luZyBzaW11bGF0ZXMgc2VydmVyIHJlYXNzaWduaW5nIElEIHZhbHVlXG4gICAgICAgICAgcmV0dXJuIHN1cGVyLmFqYXguYXBwbHkodGhpcywgYXJndW1lbnRzKS50aGVuKChyZXNwb25zZTogYW55KSA9PiB7XG4gICAgICAgICAgICBpZiAodGhpcy5pZCA9PT0gb2xkSWQpIHtcbiAgICAgICAgICAgICAgcmVzcG9uc2UuX2lkID0gbmV3SWQ7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuaWQgPT09IG5ld0lkKSB7XG4gICAgICAgICAgICAgIHJlc3BvbnNlLl9pZCA9IG9sZElkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHZhciB0ZXN0TW9kZWwgPSAoPFN5bmNTdG9yZT5URVNULnN0b3JlKS5jcmVhdGVNb2RlbChUZXN0TW9kZWw1LCBtb2RlbC5hdHRyaWJ1dGVzKTtcblxuICAgICAgdmFyIG9wdGlvbnMgPSB7XG4gICAgICAgIHdhaXQ6IHRydWVcbiAgICAgIH07XG4gICAgICB2YXIgcHJvbWlzZSA9IHRlc3RNb2RlbC5zYXZlKHVuZGVmaW5lZCwgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICBhc3NlcnQub2sodGVzdE1vZGVsLmlkLCAncmVjb3JkIGhhcyBhbiBpZC4nKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHRlc3RNb2RlbC5pZCwgbmV3SWQsICdyZWNvcmQgaGFzIG5ldyBpZC4nKTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMuZ2V0KHRlc3RNb2RlbC5pZCksIG1vZGVsLCAnbW9kZWwgaXMgZm91bmQgaW4gY29sbGVjdGlvbiBieSBuZXcgaWQuJyk7XG4gICAgICAgIGFzc2VydC5pc1VuZGVmaW5lZChURVNULlRlc3RzLmdldChvbGRJZCksICdtb2RlbCBpcyBtaXNzaW5nIGluIGNvbGxlY3Rpb24gYnkgb2xkIGlkLicpO1xuICAgICAgfSkudGhlbihmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gcmV2ZXJ0cyBsb2NhbCBjaGFuZ2VzXG4gICAgICAgIG9wdGlvbnNbJ3VybCddID0gdGVzdE1vZGVsLnVybFJvb3QgKyBvbGRJZDsgLy8gbXVzdCBmaXggdXAgVVJMIGFzIHdlIGhhY2tlZCBpdFxuICAgICAgICByZXR1cm4gdGVzdE1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIGFzc2VydC5vayh0ZXN0TW9kZWwuaWQsICdyZWNvcmQgaGFzIGFuIGlkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0TW9kZWwuaWQsIG9sZElkLCAncmVjb3JkIGhhcyBuZXcgaWQuJyk7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMuZ2V0KHRlc3RNb2RlbC5pZCksIG1vZGVsLCAnbW9kZWwgaXMgZm91bmQgaW4gY29sbGVjdGlvbiBieSBvbGQgaWQuJyk7XG4gICAgICAgICAgYXNzZXJ0LmlzVW5kZWZpbmVkKFRFU1QuVGVzdHMuZ2V0KG5ld0lkKSwgJ21vZGVsIGlzIG1pc3NpbmcgaW4gY29sbGVjdGlvbiBieSBuZXcgaWQuJyk7XG4gICAgICAgIH0pO1xuICAgICAgfSkudGhlbihkb25lLCBiYWNrYm9uZV9lcnJvcihkb25lKSk7XG4gICAgfSksXG5cbiAgICBpdCgnZGVsZXRlIHJlY29yZCcsIChkb25lKSA9PiB7XG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcblxuICAgICAgYXNzZXJ0LmlzT2JqZWN0KG1vZGVsLCAnbW9kZWwgZm91bmQgaW4gY29sbGVjdGlvbicpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuaWQsIFRFU1QuaWQsICdtb2RlbCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcblxuICAgICAgbW9kZWwuZGVzdHJveShcbiAgICAgICAge1xuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKG1vZGVsMjogYW55KSB7XG4gICAgICAgICAgICBhc3NlcnQub2sodHJ1ZSwgJ3JlY29yZCBoYXMgYmVlbiBkZWxldGVkLicpO1xuICAgICAgICAgICAgZG9uZSgpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IGJhY2tib25lX2Vycm9yKGRvbmUpXG4gICAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2NsZWFudXAgcmVjb3JkcycsIChkb25lKSA9PiB7XG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5UZXN0cy5tb2RlbHMubGVuZ3RoLCBURVNULlRlc3RzLmxlbmd0aCwgJ2JhY2tib25lIGFuZCBhcnJheSByZXBvcnQgdGhlIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBpZiAoVEVTVC5UZXN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgZG9uZSgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGhhc0Vycm9yID0gZmFsc2UsIGlzRG9uZSA9IGZhbHNlO1xuICAgICAgICB2YXIgY291bnQgPSAwO1xuICAgICAgICBURVNULlRlc3RzLm1vZGVscy5mb3JFYWNoKGZ1bmN0aW9uKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICAgIGlmICghaGFzRXJyb3IpIHtcbiAgICAgICAgICAgICsrY291bnQ7XG4gICAgICAgICAgICBtb2RlbC5kZXN0cm95KHtcbiAgICAgICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaWYgKC0tY291bnQgPT09IDAgJiYgIWlzRG9uZSkge1xuICAgICAgICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbChURVNULlRlc3RzLmxlbmd0aCwgMCwgJ2NvbGxlY3Rpb24gaXMgZW1wdHknKTtcbiAgICAgICAgICAgICAgICAgIGRvbmUoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGVycm9yOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBoYXNFcnJvciA9IGlzRG9uZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYmFja2JvbmVfZXJyb3IoZG9uZSkuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGNvdW50LCBURVNULlRlc3RzLmxlbmd0aCwgJ2Rlc3Ryb3kgZXhlY3V0ZXMgYXN5bmNocm9ub3VzbHknKTtcbiAgICAgIH1cbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==