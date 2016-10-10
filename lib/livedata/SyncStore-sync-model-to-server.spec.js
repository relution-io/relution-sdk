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
var urls = require('../web/urls');
var http_spec_1 = require('../web/http.spec');
describe(module.filename || __filename, function () {
    this.timeout(8000);
    var model = null;
    var store = null;
    var modelType = null;
    var promise = null;
    beforeEach(function () {
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
                return ModelType;
            }(Model_1.Model.defaults({
                idAttribute: 'id',
                entity: 'User',
                store: store,
                urlRoot: urls.resolveUrl('api/v1/user/', {
                    serverUrl: http_spec_1.testServer.serverUrl,
                    application: 'relutionsdk'
                })
            })));
            modelType = ModelType;
            model = new modelType({ id: '12312' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLDRCQUEyQixlQUFlLENBQUMsQ0FBQTtBQUMzQyxJQUFZLElBQUksV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUNwQywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1QyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuQixJQUFJLEtBQUssR0FBVSxJQUFJLENBQUM7SUFDeEIsSUFBSSxLQUFLLEdBQWMsSUFBSSxDQUFDO0lBQzVCLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQztJQUNoQyxJQUFJLE9BQU8sR0FBcUIsSUFBSSxDQUFDO0lBRXJDLFVBQVUsQ0FBQztRQUNULE1BQU0sQ0FBQyxzQkFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO1lBQ2xDLEtBQUssR0FBRyxJQUFJLHFCQUFTLENBQUM7Z0JBQ3BCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixlQUFlLEVBQUUsS0FBSzthQUN2QixDQUFDLENBQUM7WUFFSDtnQkFBd0IsNkJBUXRCO2dCQVJGO29CQUF3Qiw4QkFRdEI7Z0JBQUUsQ0FBQztnQkFBRCxnQkFBQztZQUFELENBQUMsQUFSTCxDQUF3Qixh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QixDQUFDO2dDQUNILENBQUMsQ0FBQyxDQUFDOzRCQUNMLENBQUU7NEJBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDZixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7NEJBQ2hCLENBQUM7d0JBQ0gsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNiLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9TeW5jU3RvcmUtc3luYy1tb2RlbC10by1zZXJ2ZXIuc3BlYy50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBQYXNjYWwgQnJld2luZyBvbiAyOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XHJcblxyXG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3J9IGZyb20gJy4vTW9kZWwnO1xyXG5pbXBvcnQge1N5bmNTdG9yZX0gZnJvbSAnLi9TeW5jU3RvcmUnO1xyXG5pbXBvcnQge29wZW5EYXRhYmFzZX0gZnJvbSAnLi9XZWJTcWxTdG9yZSc7XHJcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi4vd2ViL3VybHMnO1xyXG5pbXBvcnQge3Rlc3RTZXJ2ZXJ9IGZyb20gJy4uL3dlYi9odHRwLnNwZWMnO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHRoaXMudGltZW91dCg4MDAwKTtcclxuXHJcbiAgdmFyIG1vZGVsOiBNb2RlbCA9IG51bGw7XHJcbiAgdmFyIHN0b3JlOiBTeW5jU3RvcmUgPSBudWxsO1xyXG4gIHZhciBtb2RlbFR5cGU6IE1vZGVsQ3RvciA9IG51bGw7XHJcbiAgdmFyIHByb21pc2U6IFEuUHJvbWlzZTxNb2RlbD4gPSBudWxsO1xyXG5cclxuICBiZWZvcmVFYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xyXG4gICAgICBzdG9yZSA9IG5ldyBTeW5jU3RvcmUoe1xyXG4gICAgICAgIHVzZUxvY2FsU3RvcmU6IHRydWUsXHJcbiAgICAgICAgdXNlU29ja2V0Tm90aWZ5OiBmYWxzZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNsYXNzIE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcclxuICAgICAgICBpZEF0dHJpYnV0ZTogJ2lkJyxcclxuICAgICAgICBlbnRpdHk6ICdVc2VyJyxcclxuICAgICAgICBzdG9yZTogc3RvcmUsXHJcbiAgICAgICAgdXJsUm9vdDogdXJscy5yZXNvbHZlVXJsKCdhcGkvdjEvdXNlci8nLCB7XHJcbiAgICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxyXG4gICAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaydcclxuICAgICAgICB9KVxyXG4gICAgICB9KSB7fVxyXG5cclxuICAgICAgbW9kZWxUeXBlID0gTW9kZWxUeXBlO1xyXG4gICAgICBtb2RlbCA9IG5ldyBtb2RlbFR5cGUoe2lkOiAnMTIzMTInfSk7XHJcbiAgICAgIHByb21pc2UgPSBRKG1vZGVsLmZldGNoKCkpLnRoZW5SZXNvbHZlKG1vZGVsKTtcclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnZmV0Y2ggbW9kZWwgc3luYyB0byBzZXJ2ZXInLCAoKSA9PiB7XHJcbiAgICAgIHZhciBoYXZlVG9iZSA9IHtcclxuICAgICAgICB1c2VybmFtZTogJ21lc3NhZ2Utb2ZmbGluZS10ZXN0JyxcclxuICAgICAgICBwYXNzd29yZDogJ2FkbWluJyxcclxuICAgICAgICBpZDogJzEyMzEyJ1xyXG4gICAgICB9O1xyXG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcclxuICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwobW9kZWwuZ2V0KGF0dHIpLCBoYXZlVG9iZVthdHRyXSwgJ21vZGVsIGhhcyBzYW1lICcgKyBhdHRyKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnb24gc3luYyBjaGVjayBfX21zZ19fIHRhYmxlJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJ19fbXNnX19cXCcgV0hFUkUgaWQgPSA/JztcclxuICAgICAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XHJcbiAgICAgICAgICBuYW1lOiAncmVsdXRpb24tbGl2ZWRhdGEnXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIFEuUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIHR4LmV4ZWN1dGVTcWwocXVlcnksIFttb2RlbC5lbnRpdHkgKyAnficgKyBtb2RlbC5nZXQoJ2lkJyldLCAodHgxLCB0YWJsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhYmxlLnJvd3MubGVuZ3RoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnZGVsZXRlIG1vZGVsIGZyb20gZGInLCAoKSA9PiB7XHJcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGNoYW5uZWwgPSAoPFN5bmNTdG9yZT5tb2RlbC5zdG9yZSkuZ2V0RW5kcG9pbnQobW9kZWwpLmNoYW5uZWw7XHJcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKS50aGVuUmVzb2x2ZShjaGFubmVsKTtcclxuICAgICAgfSkudGhlbigoY2hhbm5lbCkgPT4ge1xyXG4gICAgICAgIHZhciBxdWVyeSA9ICdTRUxFQ1QgKiBGUk9NIFxcJycgKyBjaGFubmVsICsgJ1xcJyBXSEVSRSBpZCA9Pyc7XHJcblxyXG4gICAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIG9wZW5EYXRhYmFzZSh7XHJcbiAgICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pLnRoZW4oKGRiKSA9PiB7XHJcbiAgICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgcmV0dXJuIGRiLnRyYW5zYWN0aW9uKCh0eCkgPT4ge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0LmVxdWFsKHRhYmxlLnJvd3MubGVuZ3RoLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgcmVqZWN0KTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9KTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=