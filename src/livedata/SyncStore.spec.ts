/**
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

import * as _ from 'lodash';
import {assert} from 'chai';

import {Model} from './Model';
import {Collection} from './Collection';
import {SyncStore} from './SyncStore';

var serverUrl = "http://localhost:8200";

function backbone_error(done) {
  return function (model, error) {
    done(error instanceof Error ? error : new Error(JSON.stringify(error)));
  };
}

describe(module.filename || __filename, function() {
  this.timeout(5000 * 1000);

  var TEST: any = {
    data: {
      firstName: 'Max',
      sureName: 'Mustermann',
      age: 33
    }
  };

  return [

    it('creating store', () => {
      assert.isString(serverUrl, 'Server url is defined.');

      assert.isFunction(SyncStore, 'SyncStore is defined');

      TEST.store = new SyncStore({
        useLocalStore: true,
        useSocketNotify: false
      });
      assert.isObject(TEST.store, 'store successfully created.');
      assert.ok(TEST.store.useLocalStore);
      assert.ok(!TEST.store.useSocketNotify);
    }),

    it('creating collection', () => {
      assert.isFunction(Collection, 'Collection is defined');

      class TestModel extends Model {};
      TestModel.prototype.idAttribute = '_id';
      TestModel.prototype.entity = 'test';
      TEST.TestModel = TestModel;

      assert.isFunction(TEST.TestModel, 'TestModel model successfully extended.');

      TEST.url = serverUrl + '/relution/livedata/test/';

      class TestsModelCollection extends Collection {};
      TestsModelCollection.prototype.model = TEST.TestModel;
      TestsModelCollection.prototype.url = TEST.url;
      TestsModelCollection.prototype.store = TEST.store;
      TestsModelCollection.prototype.options = {
        sort: { sureName: 1 },
        fields: { USERNAME: 1, sureName: 1, firstName: 1, age: 1 },
        query: { age: { $gte: 25 } }
      };
      TEST.TestsModelCollection = TestsModelCollection;

      assert.isFunction(TEST.TestsModelCollection, 'Test collection successfully extended.');

      TEST.Tests = TEST.TestsModelCollection._create();

      assert.isObject(TEST.Tests, 'Test collection successfully created.');

      assert.equal(TEST.Tests.store, TEST.store, 'Test collection has the correct store.');

      var url = TEST.Tests.getUrl();

      assert.ok(url !== TEST.url, 'The base url has been extended.');

      assert.equal(url.indexOf(TEST.url), 0, 'the new url starts with the set url.');

      assert.ok(url.indexOf('query=') > 0, 'query is part of the url.');

      assert.ok(url.indexOf('fields=') > 0, 'fields is part of the url.');

      assert.ok(url.indexOf('sort=') > 0, 'sort is part of the url.');

      // try to clean everything
      TEST.store.clear(TEST.Tests);
    }),

    it('create record', (done) => {
      TEST.Tests.create(TEST.data,
        {
          success: function(model) {
            assert.isObject(model, 'new record created successfully.');

            TEST.id = model.id;

            assert.ok(TEST.id, 'new record has an id.');
            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('get record', () => {
      var model = TEST.Tests.get(TEST.id);

      assert.ok(model, "record found");

      assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
      assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
      assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");

    }),

    it('fetching data with new model', (done) => {

      class TestModel2 extends Model {};
      TestModel2.prototype.url = TEST.url;
      TestModel2.prototype.idAttribute = '_id';
      TestModel2.prototype.store = TEST.store;
      TestModel2.prototype.entity = 'test';
      TEST.TestModel2 = TestModel2;

      var data = { _id: TEST.id };
      var model = TEST.TestModel2._create(data);

      assert.isObject(model, "new model created");

      assert.ok(_.isEqual(model.attributes, data), "new model holds correct data attributes");

      model.fetch({
        success: function() {
          assert.ok(true, 'model has been fetched.');
          assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
          // following is different to other tests as TEST.store does not recreate localStore and thus does not see entity change
          assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'USERNAME' value");
          assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
          done();
        },
        error: backbone_error(done)
      });
    }),

    it('fetching model with no id using callbacks', (done) => {
      class TestModel2 extends Model {};
      TestModel2.prototype.url = TEST.url;
      TestModel2.prototype.idAttribute = '_id';
      TestModel2.prototype.store = TEST.store;
      TestModel2.prototype.entity = 'test';
      TEST.TestModel2 = TestModel2;

      var model = TEST.TestModel2._create({});
      model.fetch({
        success: function(model) {
          backbone_error(done)(model, new Error('this should have failed!'));
        },
        error: function() {
          done();
        }
      });
    }),

    it('fetching model with empty-string id using promises', (done) => {
      class TestModel2 extends Model {};
      TestModel2.prototype.url = TEST.url;
      TestModel2.prototype.idAttribute = '_id';
      TestModel2.prototype.store = TEST.store;
      TestModel2.prototype.entity =  'test';
      TEST.TestModel2 = TestModel2;

      var model = TEST.TestModel2._create({
        _id: ''
      });
      model.fetch().then(function() {
        throw new Error('this should have failed!');
      },
        function() {
          return model;
        }).then(function(model) {
          done();
          return model;
        }, function(error) {
          backbone_error(done)(model, error);
          return model;
        }).done();
    }),

    it('fetching collection', (done) => {
      TEST.Tests.reset();
      assert.equal(TEST.Tests.length, 0, 'reset has cleared the collection.');

      TEST.Tests.fetch({
        success: function(collection) {
          assert.isObject(TEST.Tests.get(TEST.id), 'The model is still there');
          done();
        },
        error: backbone_error(done)
      });
    }),

    it('get record', () => {
      var model = TEST.Tests.get(TEST.id);

      assert.ok(model, "record found");

      assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
      assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
      assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");

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
    it('change record id', (done) => {
      var model = TEST.Tests.get(TEST.id);
      assert.ok(model, 'record found');
      var oldId = model.id;
      var newId = '4711-' + oldId;

      class TestModel extends Model {
        ajax(options) {
          // following simulates server reassigning ID value
          return Model.prototype.ajax.apply(this, arguments).then(function(response) {
            if (response._id === oldId) {
              response._id = newId;
            } else if (response._id === newId) {
              response._id = oldId;
            }
            return response;
          });
        }
      };
      TestModel.prototype.url = TEST.url;
      TestModel.prototype.idAttribute = '_id';
      TestModel.prototype.store = TEST.store;
      TestModel.prototype.entity = 'test';

      var testModel = new TestModel(model.attributes);

      var options = {
        wait: true
      };
      var promise = testModel.save(undefined, options);
      return promise.then(function() {
        assert.ok(testModel.id, 'record has an id.');
        assert.equal(testModel.id, newId, 'record has new id.');
        assert.equal(TEST.Tests.get(testModel.id), model, 'model is found in collection by new id.');
        assert.isUndefined(TEST.Tests.get(oldId), 'model is missing in collection by old id.');
      }).then(function() {
        // reverts local changes
        return testModel.save(undefined, options).then(function() {
          assert.ok(testModel.id, 'record has an id.');
          assert.equal(testModel.id, oldId, 'record has new id.');
          assert.equal(TEST.Tests.get(testModel.id), model, 'model is found in collection by old id.');
          assert.isUndefined(TEST.Tests.get(newId), 'model is missing in collection by new id.');
        });
      }).then(done, backbone_error(done));
    }),

    it('delete record', (done) => {
      var model = TEST.Tests.get(TEST.id);

      assert.isObject(model, 'model found in collection');

      assert.equal(model.id, TEST.id, 'model has the correct id');

      model.destroy(
        {
          success: function(model) {
            assert.ok(true, 'record has been deleted.');
            done();
          },
          error: backbone_error(done)
        });
    }),

    it('cleanup records', (done) => {
      if (TEST.Tests.length === 0) {
        done();
      } else {
        var model, hasError = false, isDone = false;
        TEST.Tests.models.forEach(function(model) {
          if (!hasError) {
            model.destroy({
              success: function() {
                if (TEST.Tests.length == 0 && !isDone) {
                  isDone = true;
                  assert.equal(TEST.Tests.length, 0, 'collection is empty');
                  done();
                }
              },
              error: function(model, error) {
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

