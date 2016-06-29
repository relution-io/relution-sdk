/**
 * @file livedata/SyncStore-sync-model-to-server.spec.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 28.06.2016
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

import {Model} from './Model';
import {SyncStore} from './SyncStore';

const localStorage = global['localStorage'] || (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));
const openDatabase = global['openDatabase'] || (global['openDatabase'] = require('websql'));
const io = global['io'] || (global['io'] = require('socket.io-client'));

var serverUrl = "http://localhost:8200";

describe(module.filename || __filename, function() {
  this.timeout(8000);
  var model = null;
  var Store = null
  var modelType = null;
  var db = null;
  var promise = null;

  beforeEach(function () {
    Store = new SyncStore({
      useLocalStore: true,
      useSocketNotify: false
    });

    modelType = Model.extend({
      idAttribute: 'id',
      entity: 'User',
      store: Store,
      urlRoot: serverUrl + '/relution/livedata/user/'
    });
    model = new modelType({ id: '12312' });
    promise = model.fetch();
  });

  return [

    it('fetch model sync to server', (done) => {
      var haveTobe = {
        username: 'message-offline-test',
        password: 'admin',
        id: '12312'
      };
      promise.then(function () {
        Object.keys(model.attributes).forEach(function (attr) {
          assert.ok(assert.equal(model.get(attr), haveTobe[attr]), 'model has same ' + attr);
        });
      }).finally(done);
    }),

    it('on sync check __msg__ table', (done) => {
      promise.then(function () {
        var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
        var query = 'SELECT * FROM \'__msg__\' WHERE id = ?';
        db.transaction (
          function (tx) {
            tx.executeSql(query, [model.entity + '~' + model.get('id')], function (tx, table) {
              assert.equal(table.rows.length, 0);
              done();
            });
          },
          function (error) {
            done(new Error(error.message));
          }
        );
      });
    }),

    it('delete model from db', (done) => {
      model.destroy().then(function () {
        var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
        var channel = model.store.getEndpoint(model).channel;
        var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';

        db.transaction (
          function (tx) {
            tx.executeSql(query, [model.get('id')], function (tx, table) {
              assert.equal(table.rows.length, 0);
              done();
            });
          },
          function (error) {
            done(new Error(error.message));
          }
        );
      });
    })

  ];
});
