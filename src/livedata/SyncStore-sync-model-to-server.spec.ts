/*
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
/**
 * @module livedata
 */
/** */

import * as Q from 'q';
import {assert} from 'chai';

import {Model, ModelCtor} from './Model';
import {SyncStore} from './SyncStore';
import {openDatabase} from './WebSqlStore';
import * as urls from '../web/urls';
import {testServer} from '../web/http.spec';

describe(module.filename || __filename, function() {
  this.timeout(8000);

  var model: Model = null;
  var store: SyncStore = null;
  var modelType: ModelCtor = null;
  var promise: Q.Promise<Model> = null;

  beforeEach(function () {
    return testServer.login.then((result) => {
      store = new SyncStore({
        useLocalStore: true,
        useSocketNotify: false
      });

      class ModelType extends Model {
      }
      ModelType.prototype.idAttribute = 'id';
      ModelType.prototype.entity = 'User';
      ModelType.prototype.store = store;
      ModelType.prototype.urlRoot = urls.resolveUrl('api/v1/user/', {
        serverUrl: testServer.serverUrl,
        application: 'relutionsdk'
      });
      modelType = ModelType;
      model = new modelType({id: '12312'});
      promise = Q(model.fetch()).thenResolve(model);

      return result;
    });
  });

  return [

    it('fetch model sync to server', () => {
      var haveTobe = {
        username: 'message-offline-test',
        password: 'admin',
        id: '12312'
      };
      return promise.then(() => {
        Object.keys(model.attributes).forEach(function (attr) {
          assert.equal(model.get(attr), haveTobe[attr], 'model has same ' + attr);
        });
        return true;
      });
    }),

    it('on sync check __msg__ table', () => {
      const query = 'SELECT * FROM \'__msg__\' WHERE id = ?';
      return promise.then(() => {
        return openDatabase({
          name: 'relution-livedata'
        });
      }).then((db) => {
        return Q.Promise((resolve, reject) => {
          return db.transaction((tx) => {
            try {
              return tx.executeSql(query, [model.entity + '~' + model.get('id')], (tx1, table) => {
                try {
                  assert.equal(table.rows.length, 0);
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

    it('delete model from db', () => {
      return promise.then(() => {
        const channel = (<SyncStore>model.store).getEndpoint(model).channel;
        return model.destroy().thenResolve(channel);
      }).then((channel) => {
        var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';

        return promise.then(() => {
          return openDatabase({
            name: 'relution-livedata'
          });
        }).then((db) => {
          return Q.Promise((resolve, reject) => {
            return db.transaction((tx) => {
              try {
                return tx.executeSql(query, [model.entity + '~' + model.get('id')], (tx1, table) => {
                  try {
                    assert.equal(table.rows.length, 0);
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
      });
    })

  ];
});
