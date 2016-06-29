/**
 * @file livedata/SyncStore-offline.spec.ts
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
import {debug} from '../core/diag';

import {Model} from './Model';
import {SyncStore} from './SyncStore';

const localStorage = global['localStorage'] || (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));
const openDatabase = global['openDatabase'] || (global['openDatabase'] = require('websql'));
const io = global['io'] || (global['io'] = require('socket.io-client'));

var serverUrl = "http://localhost:8200";

describe(module.filename || __filename, function() {
  var model = null;
  var Store = null
  var modelType = null;
  var db = null;
  this.timeout(8000);

  before(function() {
    Store = new SyncStore({
      useLocalStore: true,
      useSocketNotify: false
    });

    modelType = Model.extend({
      idAttribute: 'id',
      entity: 'User',
      store: Store,
      urlRoot: serverUrl + '/relution/livedata/user/',
      defaults: {
        username: 'admin',
        password: 'admin'
      },
      ajax: function(requ) {
        return Q.reject({
          status: -1,
          error: {
            stack: 'Not Online'
          }
        });
      }
    });

    model = new modelType({ id: '12312' });
  });

  return [
    it('check model has attributes', (done) => {
      assert.equal(model.idAttribute, 'id');
      assert.equal(model.get('username'), 'admin');
      assert.equal(model.get('password'), 'admin');
      assert.equal(model.get('id'), '12312');
      done();
    }),

    it('not saved on Server but must be websql', (done) => {
      var username = 'offline';

      model.save({ username: username }).then(function() {
        var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
        var channel = model.store.getEndpoint(model).channel;
        var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';

        debug.trace(query);

        db.transaction(
          function(tx) {
            tx.executeSql(query, [model.get('id')], function(tx, table) {
              debug.trace('execute', table.rows[0].data);
              assert.equal(table.rows.length, 1)
              var tempModel = JSON.parse(table.rows[0].data);
              assert.equal(tempModel.username, username);
              assert.equal(tempModel.username, model.get('username'));
              done();
            }, function(foo, error) {
              done(error);
            });
          },
          function(foo, error) {
            done(error);
          }
        );
      });
    }),

    it('not saved on Server but must be in websql msg-table', (done) => {
      var username = 'message-offline-test';

      model.save({ username: username }).then(function() {

        var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
        var query = 'SELECT * FROM \'__msg__\' WHERE id =?';
        db.transaction(
          function(tx) {
            tx.executeSql(query, [model.entity + '~' + model.get('id')], function(tx, table) {
              assert.equal(table.rows.length, 1)
              var tempModel = JSON.parse(table.rows[0].data);
              assert.equal(tempModel.data.username, username);
              assert.equal(tempModel.data.username, model.get('username'));

              done();
            }, function(foo, error) {
              done(error);
            });
          },
          function(foo, error) {
            done(error);
          }
        );
      });
    })

  ];
});

