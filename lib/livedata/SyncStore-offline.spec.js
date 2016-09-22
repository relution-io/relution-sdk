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
var urls = require('../web/urls');
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var store = null;
    var modelType = null;
    before(function () {
        return http_spec_1.testServer.login.then(function (result) {
            store = new SyncStore_1.SyncStore({
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
            }(Model_1.Model));
            ModelType.prototype.idAttribute = 'id';
            ModelType.prototype.entity = 'User';
            ModelType.prototype.store = store;
            ModelType.prototype.urlRoot = urls.resolveUrl('api/v1/user/', {
                serverUrl: http_spec_1.testServer.serverUrl,
                application: 'relutionsdk'
            });
            ModelType.prototype.defaults = {
                username: 'admin',
                password: 'admin'
            };
            modelType = ModelType;
            model = new modelType({ id: '12312' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLW9mZmxpbmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TeW5jU3RvcmUtb2ZmbGluZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixJQUFZLENBQUMsV0FBTSxHQUFHLENBQUMsQ0FBQTtBQUN2QixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFDNUIscUJBQW9CLGNBQWMsQ0FBQyxDQUFBO0FBRW5DLHNCQUErQixTQUFTLENBQUMsQ0FBQTtBQUN6QywwQkFBd0IsYUFBYSxDQUFDLENBQUE7QUFDdEMsNEJBQTJCLGVBQWUsQ0FBQyxDQUFBO0FBQzNDLElBQVksSUFBSSxXQUFNLGFBQWEsQ0FBQyxDQUFBO0FBQ3BDLDBCQUF5QixrQkFBa0IsQ0FBQyxDQUFBO0FBRTVDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRW5CLElBQUksS0FBSyxHQUFVLElBQUksQ0FBQztJQUN4QixJQUFJLEtBQUssR0FBYyxJQUFJLENBQUM7SUFDNUIsSUFBSSxTQUFTLEdBQWMsSUFBSSxDQUFDO0lBRWhDLE1BQU0sQ0FBQztRQUNMLE1BQU0sQ0FBQyxzQkFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO1lBQ2xDLEtBQUssR0FBRyxJQUFJLHFCQUFTLENBQUM7Z0JBQ3BCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixlQUFlLEVBQUUsS0FBSzthQUN2QixDQUFDLENBQUM7WUFFSDtnQkFBd0IsNkJBQUs7Z0JBQTdCO29CQUF3Qiw4QkFBSztnQkFLN0IsQ0FBQztnQkFKQyx3QkFBSSxHQUFKO29CQUNFLFlBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3RC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LEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNTdG9yZS1vZmZsaW5lLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgUGFzY2FsIEJyZXdpbmcgb24gMjguMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xyXG5pbXBvcnQge2RlYnVnfSBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5cclxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcclxuaW1wb3J0IHtvcGVuRGF0YWJhc2V9IGZyb20gJy4vV2ViU3FsU3RvcmUnO1xyXG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4uL3dlYi91cmxzJztcclxuaW1wb3J0IHt0ZXN0U2VydmVyfSBmcm9tICcuLi93ZWIvaHR0cC5zcGVjJztcclxuXHJcbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcclxuICB0aGlzLnRpbWVvdXQoODAwMCk7XHJcblxyXG4gIHZhciBtb2RlbDogTW9kZWwgPSBudWxsO1xyXG4gIHZhciBzdG9yZTogU3luY1N0b3JlID0gbnVsbDtcclxuICB2YXIgbW9kZWxUeXBlOiBNb2RlbEN0b3IgPSBudWxsO1xyXG5cclxuICBiZWZvcmUoZnVuY3Rpb24oKSB7XHJcbiAgICByZXR1cm4gdGVzdFNlcnZlci5sb2dpbi50aGVuKChyZXN1bHQpID0+IHtcclxuICAgICAgc3RvcmUgPSBuZXcgU3luY1N0b3JlKHtcclxuICAgICAgICB1c2VMb2NhbFN0b3JlOiB0cnVlLFxyXG4gICAgICAgIHVzZVNvY2tldE5vdGlmeTogZmFsc2VcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjbGFzcyBNb2RlbFR5cGUgZXh0ZW5kcyBNb2RlbCB7XHJcbiAgICAgICAgYWpheCgpIHtcclxuICAgICAgICAgIGRlYnVnLmluZm8oJ29mZmxpbmUnKTtcclxuICAgICAgICAgIHJldHVybiBRLnJlamVjdChuZXcgRXJyb3IoJ05vdCBPbmxpbmUnKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIE1vZGVsVHlwZS5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAnaWQnO1xyXG4gICAgICBNb2RlbFR5cGUucHJvdG90eXBlLmVudGl0eSA9ICdVc2VyJztcclxuICAgICAgTW9kZWxUeXBlLnByb3RvdHlwZS5zdG9yZSA9IHN0b3JlO1xyXG4gICAgICBNb2RlbFR5cGUucHJvdG90eXBlLnVybFJvb3QgPSAgdXJscy5yZXNvbHZlVXJsKCdhcGkvdjEvdXNlci8nLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0ZXN0U2VydmVyLnNlcnZlclVybCxcclxuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJ1xyXG4gICAgICB9KTtcclxuICAgICAgTW9kZWxUeXBlLnByb3RvdHlwZS5kZWZhdWx0cyA9IDxhbnk+e1xyXG4gICAgICAgIHVzZXJuYW1lOiAnYWRtaW4nLFxyXG4gICAgICAgIHBhc3N3b3JkOiAnYWRtaW4nXHJcbiAgICAgIH07XHJcbiAgICAgIG1vZGVsVHlwZSA9IE1vZGVsVHlwZTtcclxuXHJcbiAgICAgIG1vZGVsID0gbmV3IG1vZGVsVHlwZSh7IGlkOiAnMTIzMTInIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICByZXR1cm4gW1xyXG4gICAgaXQoJ2NoZWNrIG1vZGVsIGhhcyBhdHRyaWJ1dGVzJywgKCkgPT4ge1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuaWRBdHRyaWJ1dGUsICdpZCcpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KCd1c2VybmFtZScpLCAnYWRtaW4nKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldCgncGFzc3dvcmQnKSwgJ2FkbWluJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbChtb2RlbC5nZXQoJ2lkJyksICcxMjMxMicpO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ25vdCBzYXZlZCBvbiBTZXJ2ZXIgYnV0IG11c3QgYmUgd2Vic3FsJywgKCkgPT4ge1xyXG4gICAgICB2YXIgdXNlcm5hbWUgPSAnb2ZmbGluZSc7XHJcblxyXG4gICAgICByZXR1cm4gUShtb2RlbC5zYXZlKHsgdXNlcm5hbWU6IHVzZXJuYW1lIH0pKS50aGVuKCgpID0+IHtcclxuICAgICAgICByZXR1cm4gb3BlbkRhdGFiYXNlKHtcclxuICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcclxuICAgICAgICB9KTtcclxuICAgICAgfSkudGhlbigoZGIpID0+IHtcclxuICAgICAgICB2YXIgY2hhbm5lbCA9ICg8U3luY1N0b3JlPm1vZGVsLnN0b3JlKS5nZXRFbmRwb2ludChtb2RlbCkuY2hhbm5lbDtcclxuICAgICAgICB2YXIgcXVlcnkgPSAnU0VMRUNUICogRlJPTSBcXCcnICsgY2hhbm5lbCArICdcXCcgV0hFUkUgaWQgPT8nO1xyXG4gICAgICAgIGRlYnVnLnRyYWNlKHF1ZXJ5KTtcclxuXHJcbiAgICAgICAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHR4LmV4ZWN1dGVTcWwocXVlcnksIFttb2RlbC5nZXQoJ2lkJyldLCAodHgxLCB0YWJsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhYmxlLnJvd3MubGVuZ3RoLCAxKVxyXG4gICAgICAgICAgICAgICAgICBkZWJ1Zy50cmFjZSgnZXhlY3V0ZScsIHRhYmxlLnJvd3MuaXRlbSgwKS5kYXRhKTtcclxuICAgICAgICAgICAgICAgICAgdmFyIHRlbXBNb2RlbCA9IEpTT04ucGFyc2UodGFibGUucm93cy5pdGVtKDApLmRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGVtcE1vZGVsLnVzZXJuYW1lLCB1c2VybmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwudXNlcm5hbWUsIG1vZGVsLmdldCgndXNlcm5hbWUnKSk7XHJcbiAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0sIHJlamVjdCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pO1xyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ25vdCBzYXZlZCBvbiBTZXJ2ZXIgYnV0IG11c3QgYmUgaW4gd2Vic3FsIG1zZy10YWJsZScsICgpID0+IHtcclxuICAgICAgdmFyIHVzZXJuYW1lID0gJ21lc3NhZ2Utb2ZmbGluZS10ZXN0JztcclxuXHJcbiAgICAgIHJldHVybiBRKG1vZGVsLnNhdmUoeyB1c2VybmFtZTogdXNlcm5hbWUgfSkpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBvcGVuRGF0YWJhc2Uoe1xyXG4gICAgICAgICAgbmFtZTogJ3JlbHV0aW9uLWxpdmVkYXRhJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KS50aGVuKChkYikgPT4ge1xyXG4gICAgICAgIHZhciBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJ19fbXNnX19cXCcgV0hFUkUgaWQgPT8nO1xyXG5cclxuICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgIHJldHVybiBkYi50cmFuc2FjdGlvbigodHgpID0+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFibGUucm93cy5sZW5ndGgsIDEpXHJcbiAgICAgICAgICAgICAgICAgIHZhciB0ZW1wTW9kZWwgPSBKU09OLnBhcnNlKHRhYmxlLnJvd3MuaXRlbSgwKS5kYXRhKTtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRlbXBNb2RlbC5kYXRhLnVzZXJuYW1lLCB1c2VybmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0ZW1wTW9kZWwuZGF0YS51c2VybmFtZSwgbW9kZWwuZ2V0KCd1c2VybmFtZScpKTtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxuICBdO1xyXG59KTtcclxuXHJcbiJdfQ==