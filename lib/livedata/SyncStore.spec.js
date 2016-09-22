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
var urls = require('../web/urls');
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
            TEST.url = urls.resolveUrl('api/v1/test/', {
                serverUrl: http_spec_1.testServer.serverUrl,
                application: 'relutionsdk'
            });
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
            var TestModel3 = (function (_super) {
                __extends(TestModel3, _super);
                function TestModel3() {
                    _super.apply(this, arguments);
                }
                return TestModel3;
            }(Model_1.Model));
            TestModel3.prototype.url = TEST.url;
            TestModel3.prototype.idAttribute = '_id';
            TestModel3.prototype.store = TEST.store;
            TestModel3.prototype.entity = 'test';
            TEST.TestModel3 = TestModel3;
            var model = new TEST.TestModel3({});
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
            }(Model_1.Model));
            TestModel4.prototype.url = TEST.url;
            TestModel4.prototype.idAttribute = '_id';
            TestModel4.prototype.store = TEST.store;
            TestModel4.prototype.entity = 'test';
            TEST.TestModel4 = TestModel4;
            var model = new TEST.TestModel4({
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
                    return Model_1.Model.prototype.ajax.apply(this, arguments).then(function (response) {
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
            }(Model_1.Model));
            TestModel5.prototype.url = TEST.url;
            TestModel5.prototype.idAttribute = '_id';
            TestModel5.prototype.store = TEST.store;
            TestModel5.prototype.entity = 'test';
            var testModel = new TestModel5(model.attributes);
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
                options['url'] = TEST.url + oldId; // must fix up URL as we hacked it
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
            }
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsMkJBQXlCLGNBQWMsQ0FBQyxDQUFBO0FBQ3hDLDBCQUF3QixhQUFhLENBQUMsQ0FBQTtBQUV0QyxJQUFZLElBQUksV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUNwQywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1Qyx3QkFBd0IsSUFBYztJQUNwQyxNQUFNLENBQUMsVUFBVSxLQUF5QixFQUFFLEtBQVU7UUFDcEQsSUFBSSxDQUFDLEtBQUssWUFBWSxLQUFLLEdBQUcsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFFMUIsSUFBSSxJQUFTLENBQUM7SUFFZCxNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxJQUFJLEdBQUc7Z0JBQ0wsSUFBSSxFQUFFO29CQUNKLFNBQVMsRUFBRSxLQUFLO29CQUNoQixRQUFRLEVBQUUsWUFBWTtvQkFDdEIsR0FBRyxFQUFFLEVBQUU7aUJBQ1I7YUFDRixDQUFDO1lBQ0YsTUFBTSxDQUFD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O1lBQ1QsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLElBQUksUUFBUSxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUcsS0FBSyxDQUFDO2dCQUNyQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7Z0JBQ2QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVMsS0FBWTtvQkFDN0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO3dCQUNkLEVBQUUsS0FBSyxDQUFDO3dCQUNSLEtBQUssQ0FBQyxPQUFPLENBQUM7NEJBQ1osT0FBTyxFQUFFO2dDQUNQLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0NBQzdCLE1BQU0sR0FBRyxJQUFJLENBQUM7b0NBQ2QsYUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUscUJBQXFCLENBQUMsQ0FBQztvQ0FDMUQsSUFBSSxFQUFFLENBQUM7Z0NBQ1QsQ0FBQzs0QkFDSCxDQUFDOzRCQUNELEtBQUssRUFBRTtnQ0FDTCxRQUFRLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztnQ0FDekIsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7NEJBQzlDLENBQUM7eUJBQ0YsQ0FBQyxDQUFDO29CQUNMLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcclxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xyXG5cclxuaW1wb3J0IHtNb2RlbH0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcclxuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcclxuXHJcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi4vd2ViL3VybHMnO1xyXG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xyXG5cclxuZnVuY3Rpb24gYmFja2JvbmVfZXJyb3IoZG9uZTogRnVuY3Rpb24pIHtcclxuICByZXR1cm4gZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIGVycm9yOiBhbnkpIHtcclxuICAgIGRvbmUoZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKEpTT04uc3RyaW5naWZ5KGVycm9yKSkpO1xyXG4gIH07XHJcbn1cclxuXHJcbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcclxuICB0aGlzLnRpbWVvdXQoNTAwMCAqIDEwMDApO1xyXG5cclxuICB2YXIgVEVTVDogYW55O1xyXG5cclxuICBiZWZvcmUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGVzdFNlcnZlci5sb2dpbi50aGVuKChyZXN1bHQpID0+IHtcclxuICAgICAgVEVTVCA9IHtcclxuICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICBmaXJzdE5hbWU6ICdNYXgnLFxyXG4gICAgICAgICAgc3VyZU5hbWU6ICdNdXN0ZXJtYW5uJyxcclxuICAgICAgICAgIGFnZTogMzNcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgc3RvcmUnLCAoKSA9PiB7XHJcbiAgICAgIGFzc2VydC5pc1N0cmluZyh0ZXN0U2VydmVyLnNlcnZlclVybCwgJ1NlcnZlciB1cmwgaXMgZGVmaW5lZC4nKTtcclxuXHJcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKFN5bmNTdG9yZSwgJ1N5bmNTdG9yZSBpcyBkZWZpbmVkJyk7XHJcblxyXG4gICAgICBURVNULnN0b3JlID0gbmV3IFN5bmNTdG9yZSh7XHJcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcclxuICAgICAgICB1c2VTb2NrZXROb3RpZnk6IGZhbHNlXHJcbiAgICAgIH0pO1xyXG4gICAgICBhc3NlcnQuaXNPYmplY3QoVEVTVC5zdG9yZSwgJ3N0b3JlIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xyXG4gICAgICBhc3NlcnQub2soVEVTVC5zdG9yZS51c2VMb2NhbFN0b3JlKTtcclxuICAgICAgYXNzZXJ0Lm9rKCFURVNULnN0b3JlLnVzZVNvY2tldE5vdGlmeSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgY29sbGVjdGlvbicsICgpID0+IHtcclxuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oQ29sbGVjdGlvbiwgJ0NvbGxlY3Rpb24gaXMgZGVmaW5lZCcpO1xyXG5cclxuICAgICAgY2xhc3MgVGVzdE1vZGVsIGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgVGVzdE1vZGVsLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdfaWQnO1xyXG4gICAgICBUZXN0TW9kZWwucHJvdG90eXBlLmVudGl0eSA9ICd0ZXN0JztcclxuICAgICAgVEVTVC5UZXN0TW9kZWwgPSBUZXN0TW9kZWw7XHJcblxyXG4gICAgICBhc3NlcnQuaXNGdW5jdGlvbihURVNULlRlc3RNb2RlbCwgJ1Rlc3RNb2RlbCBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XHJcblxyXG4gICAgICBURVNULnVybCA9IHVybHMucmVzb2x2ZVVybCgnYXBpL3YxL3Rlc3QvJywge1xyXG4gICAgICAgIHNlcnZlclVybDogdGVzdFNlcnZlci5zZXJ2ZXJVcmwsXHJcbiAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0c01vZGVsQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24ge31cclxuICAgICAgVGVzdHNNb2RlbENvbGxlY3Rpb24ucHJvdG90eXBlLm1vZGVsID0gVEVTVC5UZXN0TW9kZWw7XHJcbiAgICAgIFRlc3RzTW9kZWxDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSBURVNULnVybDtcclxuICAgICAgVGVzdHNNb2RlbENvbGxlY3Rpb24ucHJvdG90eXBlLnN0b3JlID0gVEVTVC5zdG9yZTtcclxuICAgICAgVGVzdHNNb2RlbENvbGxlY3Rpb24ucHJvdG90eXBlLm9wdGlvbnMgPSB7XHJcbiAgICAgICAgc29ydDogeyBzdXJlTmFtZTogMSB9LFxyXG4gICAgICAgIGZpZWxkczogeyBVU0VSTkFNRTogMSwgc3VyZU5hbWU6IDEsIGZpcnN0TmFtZTogMSwgYWdlOiAxIH0sXHJcbiAgICAgICAgcXVlcnk6IHsgYWdlOiB7ICRndGU6IDI1IH0gfVxyXG4gICAgICB9O1xyXG4gICAgICBURVNULlRlc3RzTW9kZWxDb2xsZWN0aW9uID0gVGVzdHNNb2RlbENvbGxlY3Rpb247XHJcblxyXG4gICAgICBhc3NlcnQuaXNGdW5jdGlvbihURVNULlRlc3RzTW9kZWxDb2xsZWN0aW9uLCAnVGVzdCBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIFRFU1QuVGVzdHMgPSBuZXcgVEVTVC5UZXN0c01vZGVsQ29sbGVjdGlvbigpO1xyXG5cclxuICAgICAgYXNzZXJ0LmlzT2JqZWN0KFRFU1QuVGVzdHMsICdUZXN0IGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQuJyk7XHJcblxyXG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5UZXN0cy5zdG9yZSwgVEVTVC5zdG9yZSwgJ1Rlc3QgY29sbGVjdGlvbiBoYXMgdGhlIGNvcnJlY3Qgc3RvcmUuJyk7XHJcblxyXG4gICAgICB2YXIgdXJsID0gVEVTVC5UZXN0cy5nZXRVcmwoKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayh1cmwgIT09IFRFU1QudXJsLCAnVGhlIGJhc2UgdXJsIGhhcyBiZWVuIGV4dGVuZGVkLicpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKHVybC5pbmRleE9mKFRFU1QudXJsKSwgMCwgJ3RoZSBuZXcgdXJsIHN0YXJ0cyB3aXRoIHRoZSBzZXQgdXJsLicpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKHVybC5pbmRleE9mKCdxdWVyeT0nKSA+IDAsICdxdWVyeSBpcyBwYXJ0IG9mIHRoZSB1cmwuJyk7XHJcblxyXG4gICAgICBhc3NlcnQub2sodXJsLmluZGV4T2YoJ2ZpZWxkcz0nKSA+IDAsICdmaWVsZHMgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKHVybC5pbmRleE9mKCdzb3J0PScpID4gMCwgJ3NvcnQgaXMgcGFydCBvZiB0aGUgdXJsLicpO1xyXG5cclxuICAgICAgLy8gdHJ5IHRvIGNsZWFuIGV2ZXJ5dGhpbmdcclxuICAgICAgVEVTVC5zdG9yZS5jbGVhcihURVNULlRlc3RzKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdjcmVhdGUgcmVjb3JkJywgKGRvbmUpID0+IHtcclxuICAgICAgVEVTVC5UZXN0cy5jcmVhdGUoVEVTVC5kYXRhLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICduZXcgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LicpO1xyXG5cclxuICAgICAgICAgICAgVEVTVC5pZCA9IG1vZGVsLmlkO1xyXG5cclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKFRFU1QuaWQsICduZXcgcmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdnZXQgcmVjb3JkJywgKCkgPT4ge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhtb2RlbCwgJ3JlY29yZCBmb3VuZCcpO1xyXG5cclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YS5maXJzdE5hbWUsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnZmlyc3RuYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ3N1cmVOYW1lJyB2YWx1ZVwiKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnYWdlJyksIFRFU1QuZGF0YS5hZ2UsIFwiZm91bmQgcmVjb3JkIGhhcyB0aGUgY29ycmVjdCAnYWdlJyB2YWx1ZVwiKTtcclxuXHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgZGF0YSB3aXRoIG5ldyBtb2RlbCcsIChkb25lKSA9PiB7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwyIGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgVGVzdE1vZGVsMi5wcm90b3R5cGUudXJsID0gVEVTVC51cmw7XHJcbiAgICAgIFRlc3RNb2RlbDIucHJvdG90eXBlLmlkQXR0cmlidXRlID0gJ19pZCc7XHJcbiAgICAgIFRlc3RNb2RlbDIucHJvdG90eXBlLnN0b3JlID0gVEVTVC5zdG9yZTtcclxuICAgICAgVGVzdE1vZGVsMi5wcm90b3R5cGUuZW50aXR5ID0gJ3Rlc3QnO1xyXG4gICAgICBURVNULlRlc3RNb2RlbDIgPSBUZXN0TW9kZWwyO1xyXG5cclxuICAgICAgdmFyIGRhdGEgPSB7IF9pZDogVEVTVC5pZCB9O1xyXG4gICAgICB2YXIgbW9kZWwgPSBuZXcgVEVTVC5UZXN0TW9kZWwyKGRhdGEpO1xyXG5cclxuICAgICAgYXNzZXJ0LmlzT2JqZWN0KG1vZGVsLCAnbmV3IG1vZGVsIGNyZWF0ZWQnKTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhfLmlzRXF1YWwobW9kZWwuYXR0cmlidXRlcywgZGF0YSksICduZXcgbW9kZWwgaG9sZHMgY29ycmVjdCBkYXRhIGF0dHJpYnV0ZXMnKTtcclxuXHJcbiAgICAgIG1vZGVsLmZldGNoKHtcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgIGFzc2VydC5vayh0cnVlLCAnbW9kZWwgaGFzIGJlZW4gZmV0Y2hlZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgICAgICAvLyBmb2xsb3dpbmcgaXMgZGlmZmVyZW50IHRvIG90aGVyIHRlc3RzIGFzIFRFU1Quc3RvcmUgZG9lcyBub3QgcmVjcmVhdGUgbG9jYWxTdG9yZSBhbmQgdGh1cyBkb2VzIG5vdCBzZWUgZW50aXR5IGNoYW5nZVxyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhLnN1cmVOYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ1VTRVJOQU1FJyB2YWx1ZVwiKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XHJcbiAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgbW9kZWwgd2l0aCBubyBpZCB1c2luZyBjYWxsYmFja3MnLCAoZG9uZSkgPT4ge1xyXG4gICAgICBjbGFzcyBUZXN0TW9kZWwzIGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgVGVzdE1vZGVsMy5wcm90b3R5cGUudXJsID0gVEVTVC51cmw7XHJcbiAgICAgIFRlc3RNb2RlbDMucHJvdG90eXBlLmlkQXR0cmlidXRlID0gJ19pZCc7XHJcbiAgICAgIFRlc3RNb2RlbDMucHJvdG90eXBlLnN0b3JlID0gVEVTVC5zdG9yZTtcclxuICAgICAgVGVzdE1vZGVsMy5wcm90b3R5cGUuZW50aXR5ID0gJ3Rlc3QnO1xyXG4gICAgICBURVNULlRlc3RNb2RlbDMgPSBUZXN0TW9kZWwzO1xyXG5cclxuICAgICAgdmFyIG1vZGVsID0gbmV3IFRFU1QuVGVzdE1vZGVsMyh7fSk7XHJcbiAgICAgIG1vZGVsLmZldGNoKHtcclxuICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbihtb2RlbDI6IE1vZGVsKSB7XHJcbiAgICAgICAgICBiYWNrYm9uZV9lcnJvcihkb25lKShtb2RlbDIsIG5ldyBFcnJvcigndGhpcyBzaG91bGQgaGF2ZSBmYWlsZWQhJykpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZmV0Y2hpbmcgbW9kZWwgd2l0aCBlbXB0eS1zdHJpbmcgaWQgdXNpbmcgcHJvbWlzZXMnLCAoZG9uZSkgPT4ge1xyXG4gICAgICBjbGFzcyBUZXN0TW9kZWw0IGV4dGVuZHMgTW9kZWwge31cclxuICAgICAgVGVzdE1vZGVsNC5wcm90b3R5cGUudXJsID0gVEVTVC51cmw7XHJcbiAgICAgIFRlc3RNb2RlbDQucHJvdG90eXBlLmlkQXR0cmlidXRlID0gJ19pZCc7XHJcbiAgICAgIFRlc3RNb2RlbDQucHJvdG90eXBlLnN0b3JlID0gVEVTVC5zdG9yZTtcclxuICAgICAgVGVzdE1vZGVsNC5wcm90b3R5cGUuZW50aXR5ID0gICd0ZXN0JztcclxuICAgICAgVEVTVC5UZXN0TW9kZWw0ID0gVGVzdE1vZGVsNDtcclxuXHJcbiAgICAgIHZhciBtb2RlbCA9IG5ldyBURVNULlRlc3RNb2RlbDQoe1xyXG4gICAgICAgIF9pZDogJydcclxuICAgICAgfSk7XHJcbiAgICAgIG1vZGVsLmZldGNoKCkudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3RoaXMgc2hvdWxkIGhhdmUgZmFpbGVkIScpO1xyXG4gICAgICB9LFxyXG4gICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICByZXR1cm4gbW9kZWw7XHJcbiAgICAgIH0pLnRoZW4oZnVuY3Rpb24obW9kZWwyOiBNb2RlbCkge1xyXG4gICAgICAgIGRvbmUoKTtcclxuICAgICAgICByZXR1cm4gbW9kZWwyO1xyXG4gICAgICB9LCBmdW5jdGlvbihlcnJvcjogRXJyb3IpIHtcclxuICAgICAgICBiYWNrYm9uZV9lcnJvcihkb25lKShtb2RlbCwgZXJyb3IpO1xyXG4gICAgICAgIHJldHVybiBtb2RlbDtcclxuICAgICAgfSkuZG9uZSgpO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2ZldGNoaW5nIGNvbGxlY3Rpb24nLCAoZG9uZSkgPT4ge1xyXG4gICAgICBURVNULlRlc3RzLnJlc2V0KCk7XHJcbiAgICAgIGFzc2VydC5lcXVhbChURVNULlRlc3RzLmxlbmd0aCwgMCwgJ3Jlc2V0IGhhcyBjbGVhcmVkIHRoZSBjb2xsZWN0aW9uLicpO1xyXG5cclxuICAgICAgVEVTVC5UZXN0cy5mZXRjaCh7XHJcbiAgICAgICAgc3VjY2VzczogZnVuY3Rpb24oY29sbGVjdGlvbjogQ29sbGVjdGlvbikge1xyXG4gICAgICAgICAgYXNzZXJ0LmlzT2JqZWN0KFRFU1QuVGVzdHMuZ2V0KFRFU1QuaWQpLCAnVGhlIG1vZGVsIGlzIHN0aWxsIHRoZXJlJyk7XHJcbiAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlcnJvcjogYmFja2JvbmVfZXJyb3IoZG9uZSlcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZ2V0IHJlY29yZCcsICgpID0+IHtcclxuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCk7XHJcblxyXG4gICAgICBhc3NlcnQub2sobW9kZWwsICdyZWNvcmQgZm91bmQnKTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGEuZmlyc3ROYW1lLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2ZpcnN0bmFtZScgdmFsdWVcIik7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3N1cmVOYW1lJyksIFRFU1QuZGF0YS5zdXJlTmFtZSwgXCJmb3VuZCByZWNvcmQgaGFzIHRoZSBjb3JyZWN0ICdzdXJlTmFtZScgdmFsdWVcIik7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2FnZScpLCBURVNULmRhdGEuYWdlLCBcImZvdW5kIHJlY29yZCBoYXMgdGhlIGNvcnJlY3QgJ2FnZScgdmFsdWVcIik7XHJcblxyXG4gICAgfSksXHJcblxyXG4gICAgLy8gZm9sbG93aW5nIHRlc3QgY2hlY2tzIGNsaWVudC1zaWRlIGJlaGF2aW9yIGluIGNhc2Ugc2VydmVyLXNpZGUgYWx0ZXJzIG9iamVjdCBJRCBvbiB1cGRhdGU6XHJcbiAgICAvL1xyXG4gICAgLy8gMS4gVGhlIHRlc3QgdGVtcG9yYXJpbHkgb3ZlcndyaXRlcyB0aGUgYWpheCgpIG1ldGhvZCB0byBtb2RpZnkgcmVzcG9uc2UgZGF0YSwgc3Vic3RpdHV0aW5nIG5ld1xyXG4gICAgLy8gICAgYnkgb2xkIGlkLlxyXG4gICAgLy8gMi4gVGhlbiB0aGUgc3luY2VkIGNvbGxlY3Rpb24gaXMgY2hlY2tlZCB0byBjb250YWluIGNvcnJlY3QgZGF0YSBhbmQgdGhhdCBsb29rdXAgYnkgaWRzIHdvcmtzXHJcbiAgICAvLyAgICBzdWNoIHRoYXQgYW4gb2xkIGlkIGxvb2t1cCBubyBsb25nZXIgZmluZHMgZGF0YSBhbmQgYSBuZXcgaWQgbG9va3VwIHlpZWxkcyB0aGUgZXhpc3RpbmcgcmVjb3JkLlxyXG4gICAgLy8gMy4gVGhlIHVwZGF0ZSBvcGVyYXRpb24gaXMgcmVwZWF0ZWQgc3Vic3RpdHV0aW5nIG9sZCBpZCBieSBuZXcgaWQgdG8gcmV2ZXJ0IGludG8gY29ycmVjdCBzdGF0ZSBhZ2Fpbi5cclxuICAgIC8vIDQuIEZpbmFsbHkgdGhlIHJlc3RvcmVkIHN0YXRlIGlzIGNoZWNrZWQuXHJcbiAgICAvL1xyXG4gICAgLy8gSW4gZWZmZWN0IHRoZSBJRCBjaGFuZ2UgaXMgZG9uZSB0d2ljZS4gVGhpcyBpcyB0byBhdm9pZCBmYWlsdXJlIGluIHN1YnNlcXVlbnQgdGVzdHMgd2hpY2ggYXR0ZW1wdFxyXG4gICAgLy8gdG8gZGVsZXRlIHJlY29yZHMuIFNpbmNlIHdlIG1vZGlmaWVkIHRoZSBJRHMgYnkgdHdlYWtpbmcgdGhlIEhUVFAgcmVzcG9uc2UgZGF0YSBpbiB0aGUgYWpheCBjYWxsLFxyXG4gICAgLy8gdGhlIGFjdHVhbCBzZXJ2ZXIgZG9lcyBub3Qga25vdyBhYm91dCB0aGUgSUQgY2hhbmdlcy4gVGh1cywgZGVsZXRpb25zIGluIHN1YnNlcXVlbnQgdGVzdHMgd291bGRcclxuICAgIC8vIGZhaWwsIGlmIHdlIGRpZCBub3QgY2hhbmdlIHRoZSBJRCBiYWNrIGFnYWluIVxyXG4gICAgaXQoJ2NoYW5nZSByZWNvcmQgaWQnLCAoZG9uZSkgPT4ge1xyXG4gICAgICB2YXIgbW9kZWwgPSBURVNULlRlc3RzLmdldChURVNULmlkKTtcclxuICAgICAgYXNzZXJ0Lm9rKG1vZGVsLCAncmVjb3JkIGZvdW5kJyk7XHJcbiAgICAgIHZhciBvbGRJZCA9IG1vZGVsLmlkO1xyXG4gICAgICB2YXIgbmV3SWQgPSAnNDcxMS0nICsgb2xkSWQ7XHJcblxyXG4gICAgICBjbGFzcyBUZXN0TW9kZWw1IGV4dGVuZHMgTW9kZWwge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKGF0dHJzOiBhbnkpIHtcclxuICAgICAgICAgIHN1cGVyKGF0dHJzKTtcclxuICAgICAgICAgIHRoaXMuYWpheCA9IHRoaXMuYWpheC5iaW5kKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWpheChvcHRpb25zPzogYW55KSB7XHJcbiAgICAgICAgICAvLyBmb2xsb3dpbmcgc2ltdWxhdGVzIHNlcnZlciByZWFzc2lnbmluZyBJRCB2YWx1ZVxyXG4gICAgICAgICAgcmV0dXJuIE1vZGVsLnByb3RvdHlwZS5hamF4LmFwcGx5KHRoaXMsIGFyZ3VtZW50cykudGhlbigocmVzcG9uc2U6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pZCA9PT0gb2xkSWQpIHtcclxuICAgICAgICAgICAgICByZXNwb25zZS5faWQgPSBuZXdJZDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmlkID09PSBuZXdJZCkge1xyXG4gICAgICAgICAgICAgIHJlc3BvbnNlLl9pZCA9IG9sZElkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBUZXN0TW9kZWw1LnByb3RvdHlwZS51cmwgPSBURVNULnVybDtcclxuICAgICAgVGVzdE1vZGVsNS5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAnX2lkJztcclxuICAgICAgVGVzdE1vZGVsNS5wcm90b3R5cGUuc3RvcmUgPSBURVNULnN0b3JlO1xyXG4gICAgICBUZXN0TW9kZWw1LnByb3RvdHlwZS5lbnRpdHkgPSAndGVzdCc7XHJcblxyXG4gICAgICB2YXIgdGVzdE1vZGVsID0gbmV3IFRlc3RNb2RlbDUobW9kZWwuYXR0cmlidXRlcyk7XHJcblxyXG4gICAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgICB3YWl0OiB0cnVlXHJcbiAgICAgIH07XHJcbiAgICAgIHZhciBwcm9taXNlID0gdGVzdE1vZGVsLnNhdmUodW5kZWZpbmVkLCBvcHRpb25zKTtcclxuICAgICAgcmV0dXJuIHByb21pc2UudGhlbihmdW5jdGlvbigpIHtcclxuICAgICAgICBhc3NlcnQub2sodGVzdE1vZGVsLmlkLCAncmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodGVzdE1vZGVsLmlkLCBuZXdJZCwgJ3JlY29yZCBoYXMgbmV3IGlkLicpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChURVNULlRlc3RzLmdldCh0ZXN0TW9kZWwuaWQpLCBtb2RlbCwgJ21vZGVsIGlzIGZvdW5kIGluIGNvbGxlY3Rpb24gYnkgbmV3IGlkLicpO1xyXG4gICAgICAgIGFzc2VydC5pc1VuZGVmaW5lZChURVNULlRlc3RzLmdldChvbGRJZCksICdtb2RlbCBpcyBtaXNzaW5nIGluIGNvbGxlY3Rpb24gYnkgb2xkIGlkLicpO1xyXG4gICAgICB9KS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIHJldmVydHMgbG9jYWwgY2hhbmdlc1xyXG4gICAgICAgIG9wdGlvbnNbJ3VybCddID0gVEVTVC51cmwgKyBvbGRJZDsgLy8gbXVzdCBmaXggdXAgVVJMIGFzIHdlIGhhY2tlZCBpdFxyXG4gICAgICAgIHJldHVybiB0ZXN0TW9kZWwuc2F2ZSh1bmRlZmluZWQsIG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBhc3NlcnQub2sodGVzdE1vZGVsLmlkLCAncmVjb3JkIGhhcyBhbiBpZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZXN0TW9kZWwuaWQsIG9sZElkLCAncmVjb3JkIGhhcyBuZXcgaWQuJyk7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoVEVTVC5UZXN0cy5nZXQodGVzdE1vZGVsLmlkKSwgbW9kZWwsICdtb2RlbCBpcyBmb3VuZCBpbiBjb2xsZWN0aW9uIGJ5IG9sZCBpZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5pc1VuZGVmaW5lZChURVNULlRlc3RzLmdldChuZXdJZCksICdtb2RlbCBpcyBtaXNzaW5nIGluIGNvbGxlY3Rpb24gYnkgbmV3IGlkLicpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KS50aGVuKGRvbmUsIGJhY2tib25lX2Vycm9yKGRvbmUpKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdkZWxldGUgcmVjb3JkJywgKGRvbmUpID0+IHtcclxuICAgICAgdmFyIG1vZGVsID0gVEVTVC5UZXN0cy5nZXQoVEVTVC5pZCk7XHJcblxyXG4gICAgICBhc3NlcnQuaXNPYmplY3QobW9kZWwsICdtb2RlbCBmb3VuZCBpbiBjb2xsZWN0aW9uJyk7XHJcblxyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuaWQsIFRFU1QuaWQsICdtb2RlbCBoYXMgdGhlIGNvcnJlY3QgaWQnKTtcclxuXHJcbiAgICAgIG1vZGVsLmRlc3Ryb3koXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgc3VjY2VzczogZnVuY3Rpb24obW9kZWwyOiBhbnkpIHtcclxuICAgICAgICAgICAgYXNzZXJ0Lm9rKHRydWUsICdyZWNvcmQgaGFzIGJlZW4gZGVsZXRlZC4nKTtcclxuICAgICAgICAgICAgZG9uZSgpO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGVycm9yOiBiYWNrYm9uZV9lcnJvcihkb25lKVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2NsZWFudXAgcmVjb3JkcycsIChkb25lKSA9PiB7XHJcbiAgICAgIGlmIChURVNULlRlc3RzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGRvbmUoKTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB2YXIgaGFzRXJyb3IgPSBmYWxzZSwgaXNEb25lID0gZmFsc2U7XHJcbiAgICAgICAgdmFyIGNvdW50ID0gMDtcclxuICAgICAgICBURVNULlRlc3RzLm1vZGVscy5mb3JFYWNoKGZ1bmN0aW9uKG1vZGVsOiBNb2RlbCkge1xyXG4gICAgICAgICAgaWYgKCFoYXNFcnJvcikge1xyXG4gICAgICAgICAgICArK2NvdW50O1xyXG4gICAgICAgICAgICBtb2RlbC5kZXN0cm95KHtcclxuICAgICAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIGlmICgtLWNvdW50ID09PSAwICYmICFpc0RvbmUpIHtcclxuICAgICAgICAgICAgICAgICAgaXNEb25lID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuVGVzdHMubGVuZ3RoLCAwLCAnY29sbGVjdGlvbiBpcyBlbXB0eScpO1xyXG4gICAgICAgICAgICAgICAgICBkb25lKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBlcnJvcjogZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBoYXNFcnJvciA9IGlzRG9uZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBiYWNrYm9uZV9lcnJvcihkb25lKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=