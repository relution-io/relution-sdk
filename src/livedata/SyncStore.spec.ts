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

import * as _ from 'lodash';
import {assert} from 'chai';

import {Model} from './Model';
import {Collection} from './Collection';
import {SyncStore} from './SyncStore';

import {testServer} from '../web/http.spec';

function backbone_error(done: Function) {
  return function (model: Model | Collection, error: any) {
    done(error instanceof Error ? error : new Error(JSON.stringify(error)));
  };
}

describe(module.filename || __filename, function() {
  this.timeout(5000 * 1000);

  var TEST: any;

  before(function() {
    return testServer.login.then((result) => {
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

    it('creating store', () => {
      assert.isString(testServer.serverUrl, 'Server url is defined.');

      assert.isFunction(SyncStore, 'SyncStore is defined');

      TEST.store = new SyncStore({
        application: 'relutionsdk',
        useLocalStore: true,
        useSocketNotify: false
      });
      assert.isObject(TEST.store, 'store successfully created.');
      assert.ok(TEST.store.useLocalStore);
      assert.ok(!TEST.store.useSocketNotify);
    }),

    it('creating collection', () => {
      assert.isFunction(Collection, 'Collection is defined');

      TEST.urlRoot = 'api/v1/test/';

      class TestModel extends Model.defaults({
        idAttribute: '_id',
        entity: 'test',
        urlRoot: TEST.urlRoot
      }) {}
      TEST.TestModel = TestModel;

      assert.isFunction(TEST.TestModel, 'TestModel model successfully extended.');

      class TestsModelCollection extends Collection.defaults({
        model: TEST.TestModel,
        options: {
          sort: { sureName: 1 },
          fields: { USERNAME: 1, sureName: 1, firstName: 1, age: 1 },
          query: { age: { $gte: 25 } }
        }
      }) {}
      TEST.TestsModelCollection = TestsModelCollection;

      assert.isFunction(TEST.TestsModelCollection, 'Test collection successfully extended.');

      TEST.Tests = (<SyncStore>TEST.store).createCollection(TestsModelCollection);

      assert.isObject(TEST.Tests, 'Test collection successfully created.');

      assert.equal(TEST.Tests.store, TEST.store, 'Test collection has the correct store.');

      var url = TEST.Tests.getUrl();

      assert.ok(url !== TEST.urlRoot, 'The base url has been extended.');

      assert.ok(url.indexOf(TEST.urlRoot) > 0, 'the new url has the set url as a part.');

      assert.ok(url.indexOf('query=') > 0, 'query is part of the url.');

      assert.ok(url.indexOf('fields=') > 0, 'fields is part of the url.');

      assert.ok(url.indexOf('sort=') > 0, 'sort is part of the url.');

      // try to clean everything
      TEST.store.clear(TEST.Tests);
    }),

    it('create record', (done) => {
      TEST.Tests.create(TEST.data,
        {
          success: function(model: Model) {
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

      assert.ok(model, 'record found');

      assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
      assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
      assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");

    }),

    it('fetching data with new model', (done) => {

      class TestModel2 extends Model.defaults({
        urlRoot: TEST.urlRoot,
        idAttribute: '_id',
        entity: 'test'
      }) {}
      TEST.TestModel2 = TestModel2;

      var data = { _id: TEST.id };
      var model = (<SyncStore>TEST.store).createModel(TestModel2, data);

      assert.isObject(model, 'new model created');

      assert.ok(_.isEqual(model.attributes, data), 'new model holds correct data attributes');

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
      class TestModel3 extends Model.defaults({
        urlRoot: TEST.urlRoot,
        idAttribute: '_id',
        entity: 'test'
      }) {}
      TEST.TestModel3 = TestModel3;

      var model = (<SyncStore>TEST.store).createModel(TestModel3, {});
      model.fetch({
        success: function(model2: Model) {
          backbone_error(done)(model2, new Error('this should have failed!'));
        },
        error: function() {
          done();
        }
      });
    }),

    it('fetching model with empty-string id using promises', (done) => {
      class TestModel4 extends Model.defaults({
        urlRoot: TEST.urlRoot,
        idAttribute: '_id',
        entity: 'test'
      }) {}
      TEST.TestModel4 = TestModel4;

      var model = (<SyncStore>TEST.store).createModel(TestModel4, {
        _id: ''
      });
      model.fetch().then(function() {
        throw new Error('this should have failed!');
      },
      function() {
        return model;
      }).then(function(model2: Model) {
        done();
        return model2;
      }, function(error: Error) {
        backbone_error(done)(model, error);
        return model;
      }).done();
    }),

    it('fetching collection', (done) => {
      TEST.Tests.reset();
      assert.equal(TEST.Tests.length, 0, 'reset has cleared the collection.');

      TEST.Tests.fetch({
        success: function(collection: Collection) {
          assert.isObject(TEST.Tests.get(TEST.id), 'The model is still there');
          done();
        },
        error: backbone_error(done)
      });
    }),

    it('get record', () => {
      var model = TEST.Tests.get(TEST.id);

      assert.ok(model, 'record found');

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

      class TestModel5 extends Model.defaults({
        urlRoot: TEST.urlRoot,
        idAttribute: '_id',
        entity: 'test'
      }) {
        constructor(attrs: any) {
          super(attrs);
          this.ajax = this.ajax.bind(this);
        }

        ajax(options?: any) {
          // following simulates server reassigning ID value
          return super.ajax.apply(this, arguments).then((response: any) => {
            if (this.id === oldId) {
              response._id = newId;
            } else if (this.id === newId) {
              response._id = oldId;
            }
            return response;
          });
        }
      }

      var testModel = (<SyncStore>TEST.store).createModel(TestModel5, model.attributes);

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
        options['url'] = testModel.urlRoot + oldId; // must fix up URL as we hacked it
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
          success: function(model2: any) {
            assert.ok(true, 'record has been deleted.');
            done();
          },
          error: backbone_error(done)
        });
    }),

    it('cleanup records', (done) => {
      assert.equal(TEST.Tests.models.length, TEST.Tests.length, 'backbone and array report the same length');
      if (TEST.Tests.length === 0) {
        done();
      } else {
        var hasError = false, isDone = false;
        var count = 0;
        TEST.Tests.models.forEach(function(model: Model) {
          if (!hasError) {
            ++count;
            model.destroy({
              success: function() {
                if (--count === 0 && !isDone) {
                  isDone = true;
                  assert.equal(TEST.Tests.length, 0, 'collection is empty');
                  done();
                }
              },
              error: function() {
                hasError = isDone = true;
                backbone_error(done).apply(this, arguments);
              }
            });
          }
        });
        assert.equal(count, TEST.Tests.length, 'destroy executes asynchronously');
      }
    })

  ];
});
