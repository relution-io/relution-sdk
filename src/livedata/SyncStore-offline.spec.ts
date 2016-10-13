/*
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
/**
 * @module livedata
 */
/** */

import * as Q from 'q';
import {assert} from 'chai';
import {debug} from '../core/diag';

import {Model, ModelCtor} from './Model';
import {SyncStore} from './SyncStore';
import {openDatabase} from './WebSqlStore';
import {testServer} from '../web/http.spec';

describe(module.filename || __filename, function() {
  this.timeout(8000);

  var model: Model = null;
  var store: SyncStore = null;
  var modelType: ModelCtor = null;
  var urlRoot = 'api/v1/user/';

  before(function() {
    return testServer.login.then((result) => {
      store = new SyncStore({
        application: 'relutionsdk',
        useLocalStore: true,
        useSocketNotify: false
      });

      class ModelType extends Model.defaults({
        idAttribute: 'id',
        entity: 'User',
        urlRoot: urlRoot,
        defaults: <any>{
          username: 'admin',
          password: 'admin'
        }
      }) {
        ajax() {
          debug.info('offline');
          return Q.reject(new Error('Not Online'));
        }
      }
      modelType = ModelType;

      model = store.createModel(ModelType, { id: '12312' });

      return result;
    });
  });

  return [
    it('check model has attributes', () => {
      assert.equal(model.idAttribute, 'id');
      assert.equal(model.get('username'), 'admin');
      assert.equal(model.get('password'), 'admin');
      assert.equal(model.get('id'), '12312');
    }),

    it('not saved on Server but must be websql', () => {
      var username = 'offline';

      return Q(model.save({ username: username })).then(() => {
        return openDatabase({
          name: 'relution-livedata'
        });
      }).then((db) => {
        var channel = (<SyncStore>model.store).getEndpoint(model).channel;
        var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';
        debug.trace(query);

        return Q.Promise((resolve, reject) => {
          return db.transaction((tx) => {
            try {
              return tx.executeSql(query, [model.get('id')], (tx1, table) => {
                try {
                  assert.equal(table.rows.length, 1)
                  debug.trace('execute', table.rows.item(0).data);
                  var tempModel = JSON.parse(table.rows.item(0).data);
                  assert.equal(tempModel.username, username);
                  assert.equal(tempModel.username, model.get('username'));
                  resolve(true);
                } catch (error) {
                  reject(error);
                }
              });
            } catch (error) {
              reject(error);
            }
          }, reject);
        });
      });
    }),

    it('not saved on Server but must be in websql msg-table', () => {
      var username = 'message-offline-test';

      return Q(model.save({ username: username })).then(() => {
        return openDatabase({
          name: 'relution-livedata'
        });
      }).then((db) => {
        var query = 'SELECT * FROM \'__msg__\' WHERE id =?';

        return Q.Promise((resolve, reject) => {
          return db.transaction((tx) => {
            try {
              return tx.executeSql(query, [model.entity + '~' + model.get('id')], (tx1, table) => {
                try {
                  assert.equal(table.rows.length, 1)
                  var tempModel = JSON.parse(table.rows.item(0).data);
                  assert.equal(tempModel.data.username, username);
                  assert.equal(tempModel.data.username, model.get('username'));
                  resolve(true);
                } catch (error) {
                  reject(error);
                }
              });
            } catch (error) {
              reject(error);
            }
          }, reject);
        });
      });
    })

  ];
});

