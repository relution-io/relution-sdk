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
"use strict";
var Q = require('q');
var chai_1 = require('chai');
var diag_1 = require('../core/diag');
var Model_1 = require('./Model');
var SyncStore_1 = require('./SyncStore');
var WebSqlStore_1 = require('./WebSqlStore');
var serverUrl = "http://localhost:8200";
describe(module.filename || __filename, function () {
    var model = null;
    var Store = null;
    var modelType = null;
    this.timeout(8000);
    before(function () {
        Store = new SyncStore_1.SyncStore({
            useLocalStore: true,
            useSocketNotify: false
        });
        modelType = Model_1.Model.extend({
            idAttribute: 'id',
            entity: 'User',
            store: Store,
            urlRoot: serverUrl + '/relution/livedata/user/',
            defaults: {
                username: 'admin',
                password: 'admin'
            },
            ajax: function (requ) {
                diag_1.debug.info('offline');
                return Q.reject(new Error('Not Online'));
            }
        });
        model = new modelType({ id: '12312' });
    });
    return [
        it('check model has attributes', function () {
            chai_1.assert.equal(model.idAttribute, 'id');
            chai_1.assert.equal(model.get('username'), 'admin');
            chai_1.assert.equal(model.get('password'), 'admin');
            chai_1.assert.equal(model.get('id'), '12312');
        }),
        it('not saved on Server but must be websql', function () {
            var username = 'offline';
            return model.save({ username: username }).then(function () {
                return WebSqlStore_1.openDatabase('relution-livedata', '', '', 1024 * 1024);
            }).then(function (db) {
                var channel = model.store.getEndpoint(model).channel;
                var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';
                diag_1.debug.trace(query);
                return Q.Promise(function (resolve, reject) {
                    return db.transaction(function (tx) {
                        try {
                            return tx.executeSql(query, [model.get('id')], function (tx1, table) {
                                try {
                                    chai_1.assert.equal(table.rows.length, 1);
                                    diag_1.debug.trace('execute', table.rows.item(0).data);
                                    var tempModel = JSON.parse(table.rows.item(0).data);
                                    chai_1.assert.equal(tempModel.username, username);
                                    chai_1.assert.equal(tempModel.username, model.get('username'));
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
        it('not saved on Server but must be in websql msg-table', function () {
            var username = 'message-offline-test';
            return model.save({ username: username }).then(function () {
                return WebSqlStore_1.openDatabase('relution-livedata', '', '', 1024 * 1024);
            }).then(function (db) {
                var query = 'SELECT * FROM \'__msg__\' WHERE id =?';
                return Q.Promise(function (resolve, reject) {
                    return db.transaction(function (tx) {
                        try {
                            return tx.executeSql(query, [model.entity + '~' + model.get('id')], function (tx1, table) {
                                try {
                                    chai_1.assert.equal(table.rows.length, 1);
                                    var tempModel = JSON.parse(table.rows.item(0).data);
                                    chai_1.assert.equal(tempModel.data.username, username);
                                    chai_1.assert.equal(tempModel.data.username, model.get('username'));
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
        })
    ];
});
//# sourceMappingURL=SyncStore-offline.spec.js.map