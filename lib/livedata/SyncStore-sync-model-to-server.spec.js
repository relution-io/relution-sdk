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
"use strict";
var chai_1 = require('chai');
var Model_1 = require('./Model');
var SyncStore_1 = require('./SyncStore');
var localStorage = global['localStorage'] || (global['localStorage'] = new (require('node-localstorage').LocalStorage)('localStorage'));
var openDatabase = global['openDatabase'] || (global['openDatabase'] = require('websql'));
var io = global['io'] || (global['io'] = require('socket.io-client'));
var serverUrl = "http://localhost:8200";
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var Store = null;
    var modelType = null;
    var db = null;
    var promise = null;
    beforeEach(function () {
        Store = new SyncStore_1.SyncStore({
            useLocalStore: true,
            useSocketNotify: false
        });
        modelType = Model_1.Model.extend({
            idAttribute: 'id',
            entity: 'User',
            store: Store,
            urlRoot: serverUrl + '/relution/livedata/user/'
        });
        model = new modelType({ id: '12312' });
        promise = model.fetch();
    });
    return [
        it('fetch model sync to server', function (done) {
            var haveTobe = {
                username: 'message-offline-test',
                password: 'admin',
                id: '12312'
            };
            promise.then(function () {
                Object.keys(model.attributes).forEach(function (attr) {
                    chai_1.assert.ok(chai_1.assert.equal(model.get(attr), haveTobe[attr]), 'model has same ' + attr);
                });
            }).finally(done);
        }),
        it('on sync check __msg__ table', function (done) {
            promise.then(function () {
                var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
                var query = 'SELECT * FROM \'__msg__\' WHERE id = ?';
                db.transaction(function (tx) {
                    tx.executeSql(query, [model.entity + '~' + model.get('id')], function (tx, table) {
                        chai_1.assert.equal(table.rows.length, 0);
                        done();
                    });
                }, function (error) {
                    done(new Error(error.message));
                });
            });
        }),
        it('delete model from db', function (done) {
            model.destroy().then(function () {
                var db = openDatabase('relution-livedata', '', '', 1024 * 1024);
                var channel = model.store.getEndpoint(model).channel;
                var query = 'SELECT * FROM \'' + channel + '\' WHERE id =?';
                db.transaction(function (tx) {
                    tx.executeSql(query, [model.get('id')], function (tx, table) {
                        chai_1.assert.equal(table.rows.length, 0);
                        done();
                    });
                }, function (error) {
                    done(new Error(error.message));
                });
            });
        })
    ];
});
//# sourceMappingURL=SyncStore-sync-model-to-server.spec.js.map