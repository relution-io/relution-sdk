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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Q = require('q');
var chai_1 = require('chai');
var diag_1 = require('../core/diag');
var Model_1 = require('./Model');
var SyncStore_1 = require('./SyncStore');
var WebSqlStore_1 = require('./WebSqlStore');
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var store = null;
    var modelType = null;
    var urlRoot = 'api/v1/user/';
    before(function () {
        return http_spec_1.testServer.login.then(function (result) {
            store = new SyncStore_1.SyncStore({
                application: 'relutionsdk',
                useLocalStore: true,
                useSocketNotify: false
            });
            var ModelType = (function (_super) {
                __extends(ModelType, _super);
                function ModelType() {
                    _super.apply(this, arguments);
                }
                ModelType.prototype.ajax = function () {
                    diag_1.debug.info('offline');
                    return Q.reject(new Error('Not Online'));
                };
                return ModelType;
            }(Model_1.Model.defaults({
                idAttribute: 'id',
                entity: 'User',
                urlRoot: urlRoot,
                defaults: {
                    username: 'admin',
                    password: 'admin'
                }
            })));
            modelType = ModelType;
            model = store.createModel(ModelType, { id: '12312' });
            return result;
        });
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
            return Q(model.save({ username: username })).then(function () {
                return WebSqlStore_1.openDatabase({
                    name: 'relution-livedata'
                });
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
            return Q(model.save({ username: username })).then(function () {
                return WebSqlStore_1.openDatabase({
                    name: 'relution-livedata'
                });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLW9mZmxpbmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jU3RvcmUtb2ZmbGluZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLENBQUMsV0FBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFDNUIscUJBQW9CLGNBQWMsQ0FBQyxDQUFBO0FBRW5DLHNCQUErQixTQUFTLENBQUMsQ0FBQTtBQUN6QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFDdEMsNEJBQTJCLGVBQWUsQ0FBQyxDQUFBO0FBQzNDLDBCQUF5QixrQkFBa0IsQ0FBQyxDQUFBO0FBRTVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5CLElBQUksS0FBSyxHQUFVLElBQUksQ0FBQztJQUN4QixJQUFJLEtBQUssR0FBYyxJQUFJLENBQUM7SUFDNUIsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDO0lBQ2hDLElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQztJQUU3QixNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxLQUFLLEdBQUcsSUFBSSxxQkFBUyxDQUFDO2dCQUNwQixXQUFXLEVBQUUsYUFBYTtnQkFDMUIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztZQUVIO2dCQUF3Qiw2QkFRdEI7Z0JBUkY7b0JBQXdCLDhCQVF0QjtnQkFLRixDQUFDO2dCQUpDLHdCQUFJLEdBQUo7b0JBQ0UsWUFBSyxDQUFDLElBQUksQ0FBQyxTQUFT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XHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFBhc2NhbCBCcmV3aW5nIG9uIDI4LjA2LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIGxpdmVkYXRhXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcclxuaW1wb3J0IHtkZWJ1Z30gZnJvbSAnLi4vY29yZS9kaWFnJztcclxuXHJcbmltcG9ydCB7TW9kZWwsIE1vZGVsQ3Rvcn0gZnJvbSAnLi9Nb2RlbCc7XHJcbmltcG9ydCB7U3luY1N0b3JlfSBmcm9tICcuL1N5bmNTdG9yZSc7XHJcbmltcG9ydCB7b3BlbkRhdGFiYXNlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcclxuaW1wb3J0IHt0ZXN0U2VydmVyfSBmcm9tICcuLi93ZWIvaHR0cC5zcGVjJztcclxuXHJcbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcclxuICB0aGlzLnRpbWVvdXQoODAwMCk7XHJcblxyXG4gIHZhciBtb2RlbDogTW9kZWwgPSBudWxsO1xyXG4gIHZhciBzdG9yZTogU3luY1N0b3JlID0gbnVsbDtcclxuICB2YXIgbW9kZWxUeXBlOiBNb2RlbEN0b3IgPSBudWxsO1xyXG4gIHZhciB1cmxSb290ID0gJ2FwaS92MS91c2VyLyc7XHJcblxyXG4gIGJlZm9yZShmdW5jdGlvbigpIHtcclxuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xyXG4gICAgICBzdG9yZSA9IG5ldyBTeW5jU3RvcmUoe1xyXG4gICAgICAgIGFwcGxpY2F0aW9uOiAncmVsdXRpb25zZGsnLFxyXG4gICAgICAgIHVzZUxvY2FsU3RvcmU6IHRydWUsXHJcbiAgICAgICAgdXNlU29ja2V0Tm90aWZ5OiBmYWxzZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNsYXNzIE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgICAgICBpZEF0dHJpYnV0ZTogJ2lkJyxcclxuICAgICAgICBlbnRpdHk6ICdVc2VyJyxcclxuICAgICAgICB1cmxSb290OiB1cmxSb290LFxyXG4gICAgICAgIGRlZmF1bHRzOiA8YW55PntcclxuICAgICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxyXG4gICAgICAgICAgcGFzc3dvcmQ6ICdhZG1pbidcclxuICAgICAgICB9XHJcbiAgICAgIH0pIHtcclxuICAgICAgICBhamF4KCkge1xyXG4gICAgICAgICAgZGVidWcuaW5mbygnb2ZmbGluZScpO1xyXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KG5ldyBFcnJvcignTm90IE9ubGluZScpKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgbW9kZWxUeXBlID0gTW9kZWxUeXBlO1xyXG5cclxuICAgICAgbW9kZWwgPSBzdG9yZS5jcmVhdGVNb2RlbChNb2RlbFR5cGUsIHsgaWQ6ICcxMjMxMicgfSk7XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiBbXHJcbiAgICBpdCgnY2hlY2sgbW9kZWwgaGFzIGF0dHJpYnV0ZXMnLCAoKSA9PiB7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5pZEF0dHJpYnV0ZSwgJ2lkJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ3VzZXJuYW1lJyksICdhZG1pbicpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdwYXNzd29yZCcpLCAnYWRtaW4nKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgnaWQnKSwgJzEyMzEyJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnbm90IHNhdmVkIG9uIFNlcnZlciBidXQgbXVzdCBiZSB3ZWJzcWwnLCAoKSA9PiB7XHJcbiAgICAgIHZhciB1c2VybmFtZSA9ICdvZmZsaW5lJztcclxuXHJcbiAgICAgIHJldHVybiBRKG1vZGVsLnNhdmUoeyB1c2VybmFtZTogdXNlcm5hbWUgfSkpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBvcGVuRGF0YWJhc2Uoe1xyXG4gICAgICAgICAgbmFtZTogJ3JlbHV0aW9uLWxpdmVkYXRhJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KS50aGVuKChkYikgPT4ge1xyXG4gICAgICAgIHZhciBjaGFubmVsID0gKDxTeW5jU3RvcmU+bW9kZWwuc3RvcmUpLmdldEVuZHBvaW50KG1vZGVsKS5jaGFubmVsO1xyXG4gICAgICAgIHZhciBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJycgKyBjaGFubmVsICsgJ1xcJyBXSEVSRSBpZCA9Pyc7XHJcbiAgICAgICAgZGVidWcudHJhY2UocXVlcnkpO1xyXG5cclxuICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgIHJldHVybiBkYi50cmFuc2FjdGlvbigodHgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFibGUucm93cy5sZW5ndGgsIDEpXHJcbiAgICAgICAgICAgICAgICAgIGRlYnVnLnRyYWNlKCdleGVjdXRlJywgdGFibGUucm93cy5pdGVtKDApLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICB2YXIgdGVtcE1vZGVsID0gSlNPTi5wYXJzZSh0YWJsZS5yb3dzLml0ZW0oMCkuZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwudXNlcm5hbWUsIHVzZXJuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRlbXBNb2RlbC51c2VybmFtZSwgbW9kZWwuZ2V0KCd1c2VybmFtZScpKTtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnbm90IHNhdmVkIG9uIFNlcnZlciBidXQgbXVzdCBiZSBpbiB3ZWJzcWwgbXNnLXRhYmxlJywgKCkgPT4ge1xyXG4gICAgICB2YXIgdXNlcm5hbWUgPSAnbWVzc2FnZS1vZmZsaW5lLXRlc3QnO1xyXG5cclxuICAgICAgcmV0dXJuIFEobW9kZWwuc2F2ZSh7IHVzZXJuYW1lOiB1c2VybmFtZSB9KSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XHJcbiAgICAgICAgICBuYW1lOiAncmVsdXRpb24tbGl2ZWRhdGEnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgdmFyIHF1ZXJ5ID0gJ1NFTEVDVCAqIEZST00gXFwnX19tc2dfX1xcJyBXSEVSRSBpZCA9Pyc7XHJcblxyXG4gICAgICAgIHJldHVybiBRLlByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIGRiLnRyYW5zYWN0aW9uKCh0eCkgPT4ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIHJldHVybiB0eC5leGVjdXRlU3FsKHF1ZXJ5LCBbbW9kZWwuZW50aXR5ICsgJ34nICsgbW9kZWwuZ2V0KCdpZCcpXSwgKHR4MSwgdGFibGUpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWJsZS5yb3dzLmxlbmd0aCwgMSlcclxuICAgICAgICAgICAgICAgICAgdmFyIHRlbXBNb2RlbCA9IEpTT04ucGFyc2UodGFibGUucm93cy5pdGVtKDApLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGVtcE1vZGVsLmRhdGEudXNlcm5hbWUsIHVzZXJuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRlbXBNb2RlbC5kYXRhLnVzZXJuYW1lLCBtb2RlbC5nZXQoJ3VzZXJuYW1lJykpO1xyXG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9LCByZWplY3QpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG5cclxuIl19