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

import {assert} from 'chai';

import {Model} from './Model';
import {Collection} from './Collection';
import {WebSqlStore} from './WebSqlStore';

function backbone_error(done: Function) {
  return function (model: Model | Collection, error: any) {
    done(error instanceof Error ? error : new Error(JSON.stringify(error)));
  };
}

var TEST: any = {
  data: {
    firstName: 'Max',
    sureName: 'Mustermann',
    age: 33
  }
};

TEST.dropTableTest = function (done: Function) {
  TEST.store.drop({
    entity: 'test',
    success: function () {
      assert.ok(true, 'drop table test');
      done();
    },
    error: backbone_error(done)
  });
};

describe(module.filename || __filename, function() {
  return [

    it('creating websql store', function () {

      assert.typeOf(WebSqlStore, 'function', 'WebSqlStore is defined');

      TEST.store = new WebSqlStore();

      assert.typeOf(TEST.store, 'object', 'store successfully created.');

    }),

    it('drop table', TEST.dropTableTest),

    it('simple websql store', function (done) {

      class SimpleModel extends Model.defaults({
        idAttribute: 'key'
      }) {}
      TEST.SimpleModel = SimpleModel;

      assert.typeOf(TEST.SimpleModel, 'function', 'SimpleModel model successfully extended.');

      class SimpleModelCollection extends Collection.defaults({
        model: TEST.SimpleModel,
        store: new WebSqlStore(),
        entity: 'test'
      }) {}
      TEST.SimpleModelCollection = SimpleModelCollection;

      assert.typeOf(TEST.SimpleModelCollection, 'function', 'Simple collection successfully extended.');

      TEST.Simple = new TEST.SimpleModelCollection();

      assert.typeOf(TEST.Simple, 'object', 'Simple collection successfully created.');

      TEST.Simple.create(TEST.data,
        {
          success: function (model: Model) {
            assert.ok(model, 'new record exists.');

            TEST.key = model.id;

            assert.ok(TEST.key, 'new record has an id.');

            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('drop table', TEST.dropTableTest),


    it('creating collection', function () {

      assert.typeOf(Collection, 'function', 'Collection is defined');

      class TestModel extends Model.defaults({
        idAttribute: 'key',
        entity: 'test'
      }) {}
      TEST.TestModel = TestModel;

      assert.typeOf(TEST.TestModel, 'function', 'TestModel model successfully extended.');

      class TestModelCollection extends Collection.defaults({
        model: TEST.TestModel,
        store: TEST.store
      }) {}
      TEST.TestModelCollection = TestModelCollection;

      assert.typeOf(TEST.TestModelCollection, 'function', 'Test collection successfully extended.');

      TEST.Tests = new TEST.TestModelCollection();

      assert.typeOf(TEST.Tests, 'object', 'Test collection successfully created.');

      assert.ok(TEST.Tests.store === TEST.store, 'Test collection has the correct store.');

    }),

    it('create record 1', function (done) {

      TEST.Tests.create(TEST.data,
        {
          success: function (model: Model) {
            assert.ok(model, 'new record exists.');

            TEST.key = model.id;

            assert.ok(TEST.key, 'new record has an id.');

            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('create record 2', function (done) {

      TEST.Tests.create(TEST.data,
        {
          success: function (model: Model) {
            assert.ok(model, 'new record exists.');

            TEST.key = model.id;

            assert.ok(TEST.key, 'new record has an id.');

            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('read record', function () {
      var model = TEST.Tests.get(TEST.key);

      assert.ok(model, 'record found');

      assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
      assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
      assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");

    }),

    it('fetching data with new model', function (done) {

      class TestModel2 extends Model.defaults({
        idAttribute: 'key',
        store: TEST.store,
        entity: 'test'
      }) {}
      TEST.TestModel2 = TestModel2;

      var model = new TEST.TestModel2({
        key: TEST.key
      });

      assert.isObject(model, 'new model created');

      model.fetch({
        success: function () {
          assert.ok(true, 'model has been fetched.');
          assert.equal(model.id, TEST.key, 'found record has the correct id');
          assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
          assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
          assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");
          done();
        },
        error: backbone_error(done)
      });
    }),

    it('delete record', function (done) {
      TEST.Tests.get(TEST.key).destroy(
        {
          success: function (model: any) {
            assert.ok(true, 'record has been deleted.');
            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('fetching collection', function (done) {
      TEST.Tests.fetch({
        success: function (collection: any) {
          assert.ok(true, 'Test collection fetched successfully.');
          TEST.count = TEST.Tests.length;
          done();
        },
        error: backbone_error(done)
      });
    }),

    it('cleanup records websql', function (done) {

      if (TEST.Tests.length === 0) {
        done();
      } else {
        TEST.Tests.on('all', function (event: string) {
          if (event === 'destroy' && TEST.Tests.length == 0) {
            done();
          }
        });
        var model: Model;
        while (model = TEST.Tests.first()) {
          model.destroy();
        }
      }
    }),

    it('drop table', TEST.dropTableTest),

    it('create record (no schema)', function (done) {

      // recreate store type to drop schema information
      TEST.store = new WebSqlStore(undefined);

      class TestModel2 extends Model.defaults({
        idAttribute: 'key',
        store: TEST.store,
        entity: 'test'
      }) {}
      TEST.TestModel2 = TestModel2;
      
      TEST.Tests2 = new Collection(undefined, {
        model: TEST.TestModel2,
        store: TEST.store
      });
      assert.isObject(TEST.Tests2, 'Collection created');

      TEST.data = {
        firstName: 'Max',
        sureName: 'Mustermann',
        age: 33
      };

      TEST.Tests2.create(TEST.data,
        {
          success: function (model: Model) {
            assert.ok(model, 'new record exists.');

            TEST.key = model.id;

            assert.ok(TEST.key, 'new record has an id.');

            done();
          },
          error: backbone_error(done)
        }
      );
    }),

    it('read record', function () {
      var model = TEST.Tests2.get(TEST.key);

      assert.ok(model, 'record found');

      assert.equal(model.get('firstName'), TEST.data.firstName, "found record has the correct 'firstname' value");
      assert.equal(model.get('sureName'), TEST.data.sureName, "found record has the correct 'sureName' value");
      assert.equal(model.get('age'), TEST.data.age, "found record has the correct 'age' value");

    }),

    it('drop table', TEST.dropTableTest)

  ];
});
