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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLW9mZmxpbmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jU3RvcmUtb2ZmbGluZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLENBQUMsV0FBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFDNUIscUJBQW9CLGNBQWMsQ0FBQyxDQUFBO0FBRW5DLHNCQUErQixTQUFTLENBQUMsQ0FBQTtBQUN6QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFDdEMsNEJBQTJCLGVBQWUsQ0FBQyxDQUFBO0FBQzNDLDBCQUF5QixrQkFBa0IsQ0FBQyxDQUFBO0FBRTVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5CLElBQUksS0FBSyxHQUFVLElBQUksQ0FBQztJQUN4QixJQUFJLEtBQUssR0FBYyxJQUFJLENBQUM7SUFDNUIsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDO0lBQ2hDLElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQztJQUU3QixNQUFNLENBQUM7UUFDTCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxLQUFLLEdBQUcsSUFBSSxxQkFBUyxDQUFDO2dCQUNwQixXQUFXLEVBQUUsYUFBYTtnQkFDMUIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztZQUVIO2dCQUF3Qiw2QkFRdEI7Z0JBUkY7b0JBQXdCLDhCQVF0QjtnQkFLRixDQUFDO2dCQUpDLHdCQUFJLEdBQUo7b0JBQ0UsWUFBSyxDQUFDLElBQUksQ0FBQyxTQUFT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ICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBQYXNjYWwgQnJld2luZyBvbiAyOC4wNi4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQge2RlYnVnfSBmcm9tICcuLi9jb3JlL2RpYWcnO1xuXG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3J9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcbmltcG9ydCB7b3BlbkRhdGFiYXNlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcbmltcG9ydCB7dGVzdFNlcnZlcn0gZnJvbSAnLi4vd2ViL2h0dHAuc3BlYyc7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgdGhpcy50aW1lb3V0KDgwMDApO1xuXG4gIHZhciBtb2RlbDogTW9kZWwgPSBudWxsO1xuICB2YXIgc3RvcmU6IFN5bmNTdG9yZSA9IG51bGw7XG4gIHZhciBtb2RlbFR5cGU6IE1vZGVsQ3RvciA9IG51bGw7XG4gIHZhciB1cmxSb290ID0gJ2FwaS92MS91c2VyLyc7XG5cbiAgYmVmb3JlKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgc3RvcmUgPSBuZXcgU3luY1N0b3JlKHtcbiAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaycsXG4gICAgICAgIHVzZUxvY2FsU3RvcmU6IHRydWUsXG4gICAgICAgIHVzZVNvY2tldE5vdGlmeTogZmFsc2VcbiAgICAgIH0pO1xuXG4gICAgICBjbGFzcyBNb2RlbFR5cGUgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XG4gICAgICAgIGlkQXR0cmlidXRlOiAnaWQnLFxuICAgICAgICBlbnRpdHk6ICdVc2VyJyxcbiAgICAgICAgdXJsUm9vdDogdXJsUm9vdCxcbiAgICAgICAgZGVmYXVsdHM6IDxhbnk+e1xuICAgICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxuICAgICAgICAgIHBhc3N3b3JkOiAnYWRtaW4nXG4gICAgICAgIH1cbiAgICAgIH0pIHtcbiAgICAgICAgYWpheCgpIHtcbiAgICAgICAgICBkZWJ1Zy5pbmZvKCdvZmZsaW5lJyk7XG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0KG5ldyBFcnJvcignTm90IE9ubGluZScpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbW9kZWxUeXBlID0gTW9kZWxUeXBlO1xuXG4gICAgICBtb2RlbCA9IHN0b3JlLmNyZWF0ZU1vZGVsKE1vZGVsVHlwZSwgeyBpZDogJzEyMzEyJyB9KTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIFtcbiAgICBpdCgnY2hlY2sgbW9kZWwgaGFzIGF0dHJpYnV0ZXMnLCAoKSA9PiB7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuaWRBdHRyaWJ1dGUsICdpZCcpO1xuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgndXNlcm5hbWUnKSwgJ2FkbWluJyk7XG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCdwYXNzd29yZCcpLCAnYWRtaW4nKTtcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2lkJyksICcxMjMxMicpO1xuICAgIH0pLFxuXG4gICAgaXQoJ25vdCBzYXZlZCBvbiBTZXJ2ZXIgYnV0IG11c3QgYmUgd2Vic3FsJywgKCkgPT4ge1xuICAgICAgdmFyIHVzZXJuYW1lID0gJ29mZmxpbmUnO1xuXG4gICAgICByZXR1cm4gUShtb2RlbC5zYXZlKHsgdXNlcm5hbWU6IHVzZXJuYW1lIH0pKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XG4gICAgICAgICAgbmFtZTogJ3JlbHV0aW9uLWxpdmVkYXRhJ1xuICAgICAgICB9KTtcbiAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XG4gICAgICAgIHZhciBjaGFubmVsID0gKDxTeW5jU3RvcmU+bW9kZWwuc3RvcmUpLmdldEVuZHBvaW50KG1vZGVsKS5jaGFubmVsO1xuICAgICAgICB2YXIgcXVlcnkgPSAnU0VMRUNUICogRlJPTSBcXCcnICsgY2hhbm5lbCArICdcXCcgV0hFUkUgaWQgPT8nO1xuICAgICAgICBkZWJ1Zy50cmFjZShxdWVyeSk7XG5cbiAgICAgICAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRiLnRyYW5zYWN0aW9uKCh0eCkgPT4ge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHR4LmV4ZWN1dGVTcWwocXVlcnksIFttb2RlbC5nZXQoJ2lkJyldLCAodHgxLCB0YWJsZSkgPT4ge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFibGUucm93cy5sZW5ndGgsIDEpXG4gICAgICAgICAgICAgICAgICBkZWJ1Zy50cmFjZSgnZXhlY3V0ZScsIHRhYmxlLnJvd3MuaXRlbSgwKS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgIHZhciB0ZW1wTW9kZWwgPSBKU09OLnBhcnNlKHRhYmxlLnJvd3MuaXRlbSgwKS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwudXNlcm5hbWUsIHVzZXJuYW1lKTtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwudXNlcm5hbWUsIG1vZGVsLmdldCgndXNlcm5hbWUnKSk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnbm90IHNhdmVkIG9uIFNlcnZlciBidXQgbXVzdCBiZSBpbiB3ZWJzcWwgbXNnLXRhYmxlJywgKCkgPT4ge1xuICAgICAgdmFyIHVzZXJuYW1lID0gJ21lc3NhZ2Utb2ZmbGluZS10ZXN0JztcblxuICAgICAgcmV0dXJuIFEobW9kZWwuc2F2ZSh7IHVzZXJuYW1lOiB1c2VybmFtZSB9KSkudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiBvcGVuRGF0YWJhc2Uoe1xuICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcbiAgICAgICAgfSk7XG4gICAgICB9KS50aGVuKChkYikgPT4ge1xuICAgICAgICB2YXIgcXVlcnkgPSAnU0VMRUNUICogRlJPTSBcXCdfX21zZ19fXFwnIFdIRVJFIGlkID0/JztcblxuICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWJsZS5yb3dzLmxlbmd0aCwgMSlcbiAgICAgICAgICAgICAgICAgIHZhciB0ZW1wTW9kZWwgPSBKU09OLnBhcnNlKHRhYmxlLnJvd3MuaXRlbSgwKS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwuZGF0YS51c2VybmFtZSwgdXNlcm5hbWUpO1xuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRlbXBNb2RlbC5kYXRhLnVzZXJuYW1lLCBtb2RlbC5nZXQoJ3VzZXJuYW1lJykpO1xuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuXG4iXX0=