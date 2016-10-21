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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLDRCQUEyQixlQUFlLENBQUMsQ0FBQTtBQUMzQywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1QyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuQixJQUFJLEtBQUssR0FBVSxJQUFJLENBQUM7SUFDeEIsSUFBSSxLQUFLLEdBQWMsSUFBSSxDQUFDO0lBQzVCLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQztJQUNoQyxJQUFJLE9BQU8sR0FBcUIsSUFBSSxDQUFDO0lBQ3JDLElBQUksT0FBTyxHQUFHLGNBQWMsQ0FBQztJQUU3QixVQUFVLENBQUM7UUFDVCxNQUFNLENBQUMsc0JBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtZQUNsQyxLQUFLLEdBQUcsSUFBSSxxQkFBUyxDQUFDO2dCQUNwQixXQUFXLEVBQUUsYUFBYTtnQkFDMUIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGVBQWUsRUFBRSxLQUFLO2FBQ3ZCLENBQUMsQ0FBQztZQUVIO2dCQUF3Qiw2QkFJdEI7Z0JBSkY7b0JBQXdCLDhCQUl0QjtnQkFBRSxDQUFDO2dCQUFELGdCQUFDO1lBQUQsQ0FBQyxBQUpMLENBQXdCLGFBQUssQ0FBQyxRQUFRLENBQUM7Z0JBQ3JDLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixNQUFNLEVBQUUsTUFBTTtnQkFDZCxPQUFPLEVBQUUsT0FBTzthQUNqQixDQUFDLEdBQUc7WUFFTCxTQUFTLEdBQUcsU0FBUyxDQUFDO1lBQ3RCLEtBQUssR0FBRyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELE9BQU8sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTlDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyw0QkFBNEIsRUFBRTtZQUMvQixJQUFJLFFBQVEsR0FBRztnQkFDYixRQUFRLEVBQUUsc0JBQXNCO2dCQUNoQyxRQUFRLEVBQUUsT0FBTztnQkFDakIsRUFBRSxFQUFFLE9BQU87YUFDWixDQUFDO1lBQ0YsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Z0JBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUk7b0JBQ2xELGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQzFFLENBQUMsQ0FBQyxDQUFDO2dCQUNILE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyw2QkFBNkIsRUFBRTtZQUNoQyxJQUFNLEtBQUssR0FBRyx3Q0FBd0MsQ0FBQztZQUN2RCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDbEIsTUFBTSxDQUFDLDBCQUFZLENBQUM7b0JBQ2xCLElBQUksRUFBRSxtQkFBbUI7aUJBQzFCLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLEVBQUU7Z0JBQ1QsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtvQkFDL0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBQyxFQUFFO3dCQUN2QixJQUFJLENBQUM7NEJBQ0gsTUFBTSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxHQUFHLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFVBQUMsR0FBRyxFQUFFLEtBQUs7Z0NBQzdFLElBQUksQ0FBQztvQ0FDSCxhQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO29DQUNuQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ2hCLENBQUU7Z0NBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQ0FDZixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0NBQ2hCLENBQUM7NEJBQ0gsQ0FBQyxDQUFDLENBQUM7d0JBQ0wsQ0FBRTt3QkFBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDOzRCQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEIsQ0FBQztvQkFDSCxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRTtZQUN6QixNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFDbEIsSUFBTSxPQUFPLEdBQWUsS0FBSyxDQUFDLEtBQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUNwRSxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM5QyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxPQUFPO2dCQUNkLElBQUksS0FBSyxHQUFHLGtCQUFrQixHQUFHLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQztnQkFFNUQsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7b0JBQ2xCLE1BQU0sQ0FBQywwQkFBWSxDQUFDO3dCQUNsQixJQUFJLEVBQUUsbUJBQW1CO3FCQUMxQixDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsRUFBRTtvQkFDVCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBRSxNQUFNO3dCQUMvQixNQUFNLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxVQUFDLEVBQUU7NEJBQ3ZCLElBQUksQ0FBQztnQ0FDSCxNQUFNLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsVUFBQyxHQUFHLEVBQUUsS0FBSztvQ0FDN0UsSUFBSSxDQUFDO3dDQUNILGFBQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0NBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztvQ0FDaEIsQ0FBRTtvQ0FBQSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO3dDQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztvQ0FDaEIsQ0FBQztnQ0FDSCxDQUFDLENBQUMsQ0FBQzs0QkFDTCxDQUFFOzRCQUFBLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0NBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNoQixDQUFDO3dCQUNILENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztvQkFDYixDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNTdG9yZS1zeW5jLW1vZGVsLXRvLXNlcnZlci5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFBhc2NhbCBCcmV3aW5nIG9uIDI4LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcblxuaW1wb3J0IHtNb2RlbCwgTW9kZWxDdG9yfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7U3luY1N0b3JlfSBmcm9tICcuL1N5bmNTdG9yZSc7XG5pbXBvcnQge29wZW5EYXRhYmFzZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHRoaXMudGltZW91dCg4MDAwKTtcblxuICB2YXIgbW9kZWw6IE1vZGVsID0gbnVsbDtcbiAgdmFyIHN0b3JlOiBTeW5jU3RvcmUgPSBudWxsO1xuICB2YXIgbW9kZWxUeXBlOiBNb2RlbEN0b3IgPSBudWxsO1xuICB2YXIgcHJvbWlzZTogUS5Qcm9taXNlPE1vZGVsPiA9IG51bGw7XG4gIHZhciB1cmxSb290ID0gJ2FwaS92MS91c2VyLyc7XG5cbiAgYmVmb3JlRWFjaChmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRlc3RTZXJ2ZXIubG9naW4udGhlbigocmVzdWx0KSA9PiB7XG4gICAgICBzdG9yZSA9IG5ldyBTeW5jU3RvcmUoe1xuICAgICAgICBhcHBsaWNhdGlvbjogJ3JlbHV0aW9uc2RrJyxcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcbiAgICAgICAgdXNlU29ja2V0Tm90aWZ5OiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgIGNsYXNzIE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdpZCcsXG4gICAgICAgIGVudGl0eTogJ1VzZXInLFxuICAgICAgICB1cmxSb290OiB1cmxSb290XG4gICAgICB9KSB7fVxuXG4gICAgICBtb2RlbFR5cGUgPSBNb2RlbFR5cGU7XG4gICAgICBtb2RlbCA9IHN0b3JlLmNyZWF0ZU1vZGVsKE1vZGVsVHlwZSwgeyBpZDogJzEyMzEyJyB9KTtcbiAgICAgIHByb21pc2UgPSBRKG1vZGVsLmZldGNoKCkpLnRoZW5SZXNvbHZlKG1vZGVsKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIFtcblxuICAgIGl0KCdmZXRjaCBtb2RlbCBzeW5jIHRvIHNlcnZlcicsICgpID0+IHtcbiAgICAgIHZhciBoYXZlVG9iZSA9IHtcbiAgICAgICAgdXNlcm5hbWU6ICdtZXNzYWdlLW9mZmxpbmUtdGVzdCcsXG4gICAgICAgIHBhc3N3b3JkOiAnYWRtaW4nLFxuICAgICAgICBpZDogJzEyMzEyJ1xuICAgICAgfTtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldChhdHRyKSwgaGF2ZVRvYmVbYXR0cl0sICdtb2RlbCBoYXMgc2FtZSAnICsgYXR0cik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ29uIHN5bmMgY2hlY2sgX19tc2dfXyB0YWJsZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gJ1NFTEVDVCAqIEZST00gXFwnX19tc2dfX1xcJyBXSEVSRSBpZCA9ID8nO1xuICAgICAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiBvcGVuRGF0YWJhc2Uoe1xuICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcbiAgICAgICAgfSk7XG4gICAgICB9KS50aGVuKChkYikgPT4ge1xuICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWJsZS5yb3dzLmxlbmd0aCwgMCk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZGVsZXRlIG1vZGVsIGZyb20gZGInLCAoKSA9PiB7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbm5lbCA9ICg8U3luY1N0b3JlPm1vZGVsLnN0b3JlKS5nZXRFbmRwb2ludChtb2RlbCkuY2hhbm5lbDtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKS50aGVuUmVzb2x2ZShjaGFubmVsKTtcbiAgICAgIH0pLnRoZW4oKGNoYW5uZWwpID0+IHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gJ1NFTEVDVCAqIEZST00gXFwnJyArIGNoYW5uZWwgKyAnXFwnIFdIRVJFIGlkID0/JztcblxuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICByZXR1cm4gb3BlbkRhdGFiYXNlKHtcbiAgICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbigoZGIpID0+IHtcbiAgICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBkYi50cmFuc2FjdGlvbigodHgpID0+IHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFibGUucm93cy5sZW5ndGgsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19