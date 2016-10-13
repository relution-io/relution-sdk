/*
 * @file livedata/SyncContext.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.07.2015
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

import * as Q from 'q';

import {Model} from './Model';
import {Collection} from './Collection';
import {SyncStore} from './SyncStore';

import {makeApprovals} from './approvals.data';
import * as urls from '../web/urls';
import {testServer} from '../web/http.spec';

describe(module.filename || __filename, function() {
  this.timeout(60000);
  var urlRoot = 'api/v1/approvals/';
  var store: SyncStore;

  // prepare model/collection types
  class TestModel extends Model.defaults({
    idAttribute: 'id',
    entity: 'approval',
    urlRoot: urlRoot
  }) {}

  class TestCollection extends Collection.defaults({
    model: TestModel
  }) {}

  before(function() {
    return testServer.login.then((result) => {
      store = new SyncStore({
        application: 'relutionsdk'
      });
      return result;
    });
  });

  // loads data using collection, returns promise on collection, collection is empty afterwards
  function loadCollection(collection: Collection, data: any[]): Q.Promise<Collection> {
    return Q(collection.fetch()).then(function () {
      // delete all before running tests
      return Q.all(collection.models.slice().map(function (model) {
        return model.destroy();
      })).then(function () {
        assert.equal(collection.models.length, 0, 'collection must be empty initially after destroy');
        return collection;
      });
    }).then(function (collection2) {
      // load sample data into fresh database
      assert.equal(collection2, collection, 'same collection object');
      return Q.all(data.map(function (attrs) {
        return new TestModel(attrs, {
          collection: collection2
        }).save();
      })).then(function () {
        assert.equal(collection2.models.length, data.length, 'collection was updated by async events');
        return collection2;
      });
    });
  }

  var qApprovals: Q.Promise<any[]>;

  function loadApprovals() {
    if (!qApprovals) {
      var approvals = makeApprovals();
      var collection = store.createCollection(TestCollection);
      qApprovals = loadCollection(collection, approvals).then(function () {
        collection.stopListening(); // no longer live
        return approvals.sort(function (a, b) {
          return a.id.localeCompare(b.id);
        });
      });
    }
    return qApprovals;
  }

  return [

    it('preloads sample data', () => {
      return loadApprovals();
    }),

    it('infinite scrolling', () => {
      var approvals: any[];
      var collection = store.createCollection(TestCollection);
      var counter = 10;
      return loadApprovals().then(function (data) {
        approvals = data;
        var options: any = {
          limit: counter,
          sortOrder: [ 'id' ]
        };
        return Q(collection.fetch(options)).thenResolve(options);
      }).then(function scroll(options): PromiseLike<any> {
        assert.equal(collection.models.length, counter, 'number of models retrieved so far');
        assert.deepEqual(collection.models.map(function (x) {
          delete x.attributes._time; // server adds this, we don't want it
          return x.attributes;
        }), approvals.slice(0, counter), 'elements are fetched properly');
        if (options.end) {
          return Q.resolve(options);
        }
        return collection.fetchMore(options).then(function (results) {
          if (results.length === 0) {
            assert.equal(options.end, true, 'at end of scrolling');
          } else {
            var oldCounter = counter;
            counter = Math.min(approvals.length, counter + 10);
            assert.equal(results.length, counter - oldCounter, 'number of results returned');
            assert.equal(options.more, true, 'can scroll more');
          }
          return options;
        }).then(scroll);
      });
    }),

    it('next/prev paging', () => {
      var approvals: any[];
      var collection = store.createCollection(TestCollection);
      var i = 0;
      return loadApprovals().then(function (data) {
        approvals = data;
        var options = {
          limit: 1,
          sortOrder: [ 'id' ]
        };
        return (<any>collection.fetch(options)).thenResolve(options);
      }).then(function next(options): PromiseLike<any> {
        assert.equal(collection.models.length, 1, 'number of models retrieved so far');
        assert.deepEqual(collection.models.map(function (x) {
          delete x.attributes._time; // server adds this, we don't want it
          return x.attributes;
        }), approvals.slice(i, i + 1), 'element fetched properly');
        if (!options.next && i > 1) {
          return Q.resolve(options);
        }
        ++i;
        return collection.fetchNext(options).then(function (results) {
          assert.equal(options.prev, true, 'can page prev');
          assert.equal(results.length, 1, 'number of results returned');
          assert.equal(options.next, i + 1 < approvals.length, 'can page next');
          return options;
        }).then(next);
      }).then(function prev(options): PromiseLike<any> {
        assert.equal(options.prev, i > 0, 'can page prev');
        assert.equal(options.next, i + 1 < approvals.length, 'can page next');
        if (!options.prev) {
          return Q.resolve(options);
        }
        return collection.fetchPrev(options).then(function (results) {
          assert.equal(results.length, 1, 'number of results returned');
          assert.equal(collection.models.length, 1, 'number of models retrieved so far');
          assert.deepEqual(collection.models.map(function (x) {
            delete x.attributes._time; // server adds this, we don't want it
            return x.attributes;
          }), approvals.slice(i - 1, i), 'element fetched properly');
          --i;
          return options;
        }).then(prev);
      });
    })

  ];
});
