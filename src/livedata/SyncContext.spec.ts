/**
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

import {assert} from 'chai';
import {debug} from '../core/diag';

import {Model} from './Model';
import {Collection} from './Collection';
import {SyncStore} from './SyncStore';

import {makeApprovals} from './approvals.data';

const localStorage = global['localStorage'] || (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));
const openDatabase = global['openDatabase'] || (global['openDatabase'] = require('websql'));
const io = global['io'] || (global['io'] = require('socket.io-client'));

var serverUrl = "http://localhost:8200";

describe(module.filename || __filename, function() {
  this.timeout(60000);

  // prepare model/collection types
  var store = new SyncStore({
  });
  var TestModel = Model.extend({
    idAttribute: 'id',
    entity: 'approval'
  });
  var TestCollection = Collection.extend({
    model: TestModel,
    store: store,
    url: serverUrl + '/relution/livedata/approvals/'
  });

  // loads data using collection, returns promise on collection, collection is empty afterwards
  function loadCollection(collection, data) {
    debug.info('A', collection);
    return collection.fetch().then(function () {
      // delete all before running tests
      debug.info('B');
      return Q.all(collection.models.slice().map(function (model) {
        debug.info('C');
        return model.destroy();
      })).then(function () {
        debug.info('D');
        assert.equal(collection.models.length, 0, 'collection must be empty initially after destroy');
        return collection;
      });
    }).then(function (collection2) {
      // load sample data into fresh database
      debug.info('E');
      return Q.all(data.map(function (attrs) {
        debug.info('F');
        return new TestModel(attrs, {
          collection: collection2
        }).save();
      })).then(function () {
        debug.info('G');
        assert.equal(collection2.models.length, data.length, 'collection was updated by async events');
        return collection2;
      });
    });
  }

  // chains async done callback completing promise chain
  function chainDone(promise, done) {
    return promise.then(function () {
      return done();
    }, function (error) {
      return done(error || new Error('no error given'));
    }).done();
  }

  var qApprovals;

  function loadApprovals() {
    if (!qApprovals) {
      var approvals = makeApprovals();
      var collection = new TestCollection();
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

    it('preloads sample data', (done) => {
      return chainDone(loadApprovals(), done);
    }),

    it('infinite scrolling', (done) => {
      var approvals;
      var collection = new TestCollection();
      var counter = 10;
      return chainDone(loadApprovals().then(function (data) {
        approvals = data;
        var options = {
          limit: counter,
          sortOrder: [ 'id' ]
        };
        return collection.fetch(options).thenResolve(options);
      }).then(function scroll(options) {
        assert.equal(collection.models.length, counter, 'number of models retrieved so far');
        assert.deepEqual(collection.models.map(function (x) {
          delete x.attributes._time; // server adds this, we don't want it
          return x.attributes;
        }), approvals.slice(0, counter), 'elements are fetched properly');
        if (options.end) {
          return options;
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
      }), done);
    }),

    it('next/prev paging', (done) => {
      var approvals;
      var collection = new TestCollection();
      var i = 0;
      return chainDone(loadApprovals().then(function (data) {
        approvals = data;
        var options = {
          limit: 1,
          sortOrder: [ 'id' ]
        };
        return collection.fetch(options).thenResolve(options);
      }).then(function next(options) {
        assert.equal(collection.models.length, 1, 'number of models retrieved so far');
        assert.deepEqual(collection.models.map(function (x) {
          delete x.attributes._time; // server adds this, we don't want it
          return x.attributes;
        }), approvals.slice(i, i + 1), 'element fetched properly');
        if (!options.next && i > 1) {
          return options;
        }
        ++i;
        return collection.fetchNext(options).then(function (results) {
          assert.equal(options.prev, true, 'can page prev');
          assert.equal(results.length, 1, 'number of results returned');
          assert.equal(options.next, i + 1 < approvals.length, 'can page next');
          return options;
        }).then(next);
      }).then(function prev(options) {
        assert.equal(options.prev, i > 0, 'can page prev');
        assert.equal(options.next, i + 1 < approvals.length, 'can page next');
        if (!options.prev) {
          return options;
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
      }), done);
    })

  ];
});
