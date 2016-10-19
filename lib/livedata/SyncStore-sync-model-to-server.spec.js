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
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var store = null;
    var modelType = null;
    var promise = null;
    var urlRoot = 'api/v1/user/';
    beforeEach(function () {
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
                return ModelType;
            }(Model_1.Model.defaults({
                idAttribute: 'id',
                entity: 'User',
                urlRoot: urlRoot
            })));
            modelType = ModelType;
            model = store.createModel(ModelType, { id: '12312' });
            promise = Q(model.fetch()).thenResolve(model);
            return result;
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLDRCQUEyQixlQUFlLENBQUMsQ0FBQTtBQUMzQywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1QyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuQixJQUFJLEtBQUssR0FBVSxJQUFJLENBQUM7SUFDeEIsSUFBSSxLQUFLLEdBQWMsSUFBSSxDQUFDO0lBQzVCLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQztJQUNoQyxJQUFJLE9BQU8sR0FBcUIsSUFBSSxDQUFDO0lBQ3JDLElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQztJQUU3QixVQUFVLENBQUM7UUFDVCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxLQUFLLEdBQUcsSUFBSSxxQkFBUyxDQUFDO2dCQUNwQixXQUFXLEVBQUUsYUFBYTtnQkFDMUIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztZQUVIO2dCQUF3Qiw2QkFJdEI7Z0JBSkY7b0JBQXdCLDhCQUl0QjtnQkFBRSxDQUFDO2dCQUFELGdCQUFDO1lBQUQs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Z0NBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNoQixDQUFDO3dCQUNILENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDYixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgUGFzY2FsIEJyZXdpbmcgb24gMjguMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcclxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xyXG5cclxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcclxuaW1wb3J0IHtvcGVuRGF0YWJhc2V9IGZyb20gJy4vV2ViU3FsU3RvcmUnO1xyXG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMudGltZW91dCg4MDAwKTtcclxuXHJcbiAgdmFyIG1vZGVsOiBNb2RlbCA9IG51bGw7XHJcbiAgdmFyIHN0b3JlOiBTeW5jU3RvcmUgPSBudWxsO1xyXG4gIHZhciBtb2RlbFR5cGU6IE1vZGVsQ3RvciA9IG51bGw7XHJcbiAgdmFyIHByb21pc2U6IFEuUHJvbWlzZTxNb2RlbD4gPSBudWxsO1xyXG4gIHZhciB1cmxSb290ID0gJ2FwaS92MS91c2VyLyc7XHJcblxyXG4gIGJlZm9yZUVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHRlc3RTZXJ2ZXIubG9naW4udGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgIHN0b3JlID0gbmV3IFN5bmNTdG9yZSh7XHJcbiAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaycsXHJcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcclxuICAgICAgICB1c2VTb2NrZXROb3RpZnk6IGZhbHNlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY2xhc3MgTW9kZWxUeXBlIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xyXG4gICAgICAgIGlkQXR0cmlidXRlOiAnaWQnLFxyXG4gICAgICAgIGVudGl0eTogJ1VzZXInLFxyXG4gICAgICAgIHVybFJvb3Q6IHVybFJvb3RcclxuICAgICAgfSkge31cclxuXHJcbiAgICAgIG1vZGVsVHlwZSA9IE1vZGVsVHlwZTtcclxuICAgICAgbW9kZWwgPSBzdG9yZS5jcmVhdGVNb2RlbChNb2RlbFR5cGUsIHsgaWQ6ICcxMjMxMicgfSk7XHJcbiAgICAgIHByb21pc2UgPSBRKG1vZGVsLmZldGNoKCkpLnRoZW5SZXNvbHZlKG1vZGVsKTtcclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnZmV0Y2ggbW9kZWwgc3luYyB0byBzZXJ2ZXInLCAoKSA9PiB7XHJcbiAgICAgIHZhciBoYXZlVG9iZSA9IHtcclxuICAgICAgICB1c2VybmFtZTogJ21lc3NhZ2Utb2ZmbGluZS10ZXN0JyxcclxuICAgICAgICBwYXNzd29yZDogJ2FkbWluJyxcclxuICAgICAgICBpZDogJzEyMzEyJ1xyXG4gICAgICB9O1xyXG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KGF0dHIpLCBoYXZlVG9iZVthdHRyXSwgJ21vZGVsIGhhcyBzYW1lICcgKyBhdHRyKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnb24gc3luYyBjaGVjayBfX21zZ19fIHRhYmxlJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJ19fbXNnX19cXCcgV0hFUkUgaWQgPSA/JztcclxuICAgICAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XHJcbiAgICAgICAgICBuYW1lOiAncmVsdXRpb24tbGl2ZWRhdGEnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHR4LmV4ZWN1dGVTcWwocXVlcnksIFttb2RlbC5lbnRpdHkgKyAnficgKyBtb2RlbC5nZXQoJ2lkJyldLCAodHgxLCB0YWJsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhYmxlLnJvd3MubGVuZ3RoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZGVsZXRlIG1vZGVsIGZyb20gZGInLCAoKSA9PiB7XHJcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNoYW5uZWwgPSAoPFN5bmNTdG9yZT5tb2RlbC5zdG9yZSkuZ2V0RW5kcG9pbnQobW9kZWwpLmNoYW5uZWw7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKS50aGVuUmVzb2x2ZShjaGFubmVsKTtcclxuICAgICAgfSkudGhlbigoY2hhbm5lbCkgPT4ge1xyXG4gICAgICAgIHZhciBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJycgKyBjaGFubmVsICsgJ1xcJyBXSEVSRSBpZCA9Pyc7XHJcblxyXG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XHJcbiAgICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIGRiLnRyYW5zYWN0aW9uKCh0eCkgPT4ge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhYmxlLnJvd3MubGVuZ3RoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=