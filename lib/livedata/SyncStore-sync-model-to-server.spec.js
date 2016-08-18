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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require('q');
var chai_1 = require('chai');
var Model_1 = require('./Model');
var SyncStore_1 = require('./SyncStore');
var WebSqlStore_1 = require('./WebSqlStore');
var serverUrl = 'http://localhost:8200';
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var store = null;
    var modelType = null;
    var promise = null;
    beforeEach(function () {
        store = new SyncStore_1.SyncStore({
            useLocalStore: true,
            useSocketNotify: false
        });
        var ModelType = (function (_super) {
            __extends(ModelType, _super);
            function ModelType() {
                _super.apply(this, arguments);
            }
            return ModelType;
        }(Model_1.Model));
        ModelType.prototype.idAttribute = 'id';
        ModelType.prototype.entity = 'User';
        ModelType.prototype.store = store;
        ModelType.prototype.urlRoot = serverUrl + '/relution/livedata/user/';
        modelType = ModelType;
        model = new modelType({ id: '12312' });
        promise = Q(model.fetch()).thenResolve(model);
    });
    return [
        it('fetch model sync to server', function () {
            var haveTobe = {
                username: 'message-offline-test',
                password: 'admin',
                id: '12312'
            };
            return promise.then(function () {
                Object.keys(model.attributes).forEach(function (attr) {
                    chai_1.assert.equal(model.get(attr), haveTobe[attr], 'model has same ' + attr);
                });
                return true;
            });
        }),
        it('on sync check __msg__ table', function () {
            var query = 'SELECT * FROM \'__msg__\' WHERE id = ?';
            return promise.then(function () {
                return WebSqlStore_1.openDatabase({
                    name: 'relution-livedata'
                });
            }).then(function (db) {
                return Q.Promise(function (resolve, reject) {
                    return db.transaction(function (tx) {
                        try {
                            return tx.executeSql(query, [model.entity + '~' + model.get('id')], function (tx1, table) {
                                try {
                                    chai_1.assert.equal(table.rows.length, 0);
                                    resolve(true);
                                }
                                catch (error) {
                                    reject(error);
                                }
                            });
                        }
                        catch (error) {
                            reject(error);
                        }
                    }, reject);
                });
            });
        }),
        it('delete model from db', function () {
            return promise.then(function () {
                var channel = model.store.getEndpoint(model).channel;
                return model.destroy().thenResolve(channel);
            }).then(function (channel) {
                var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';
                return promise.then(function () {
                    return WebSqlStore_1.openDatabase({
                        name: 'relution-livedata'
                    });
                }).then(function (db) {
                    return Q.Promise(function (resolve, reject) {
                        return db.transaction(function (tx) {
                            try {
                                return tx.executeSql(query, [model.entity + '~' + model.get('id')], function (tx1, table) {
                                    try {
                                        chai_1.assert.equal(table.rows.length, 0);
                                        resolve(true);
                                    }
                                    catch (error) {
                                        reject(error);
                                    }
                                });
                            }
                            catch (error) {
                                reject(error);
                            }
                        }, reject);
                    });
                });
            });
        })
    ];
});
//# sourceMappingURL=SyncStore-sync-model-to-server.spec.js.map