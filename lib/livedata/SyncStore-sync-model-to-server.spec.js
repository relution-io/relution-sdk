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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLHFCQUFxQixNQUFNLENBQUMsQ0FBQTtBQUU1QixzQkFBK0IsU0FBUyxDQUFDLENBQUE7QUFDekMsMEJBQXdCLGFBQWEsQ0FBQyxDQUFBO0FBQ3RDLDRCQUEyQixlQUFlLENBQUMsQ0FBQTtBQUMzQyxJQUFZLElBQUksV0FBTSxhQUFhLENBQUMsQ0FBQTtBQUNwQywwQkFBeUIsa0JBQWtCLENBQUMsQ0FBQTtBQUU1QyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUVuQixJQUFJLEtBQUssR0FBVSxJQUFJLENBQUM7SUFDeEIsSUFBSSxLQUFLLEdBQWMsSUFBSSxDQUFDO0lBQzVCLElBQUksU0FBUyxHQUFjLElBQUksQ0FBQztJQUNoQyxJQUFJLE9BQU8sR0FBcUIsSUFBSSxDQUFDO0lBRXJDLFVBQVUsQ0FBQztRQUNULE1BQU0sQ0FBQyxzQkFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUFNO1lBQ2xDLEtBQUssR0FBRyxJQUFJLHFCQUFTLENBQUM7Z0JBQ3BCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixlQUFlLEVBQUUsS0FBSzthQUN2QixDQUFDLENBQUM7WUFFSDtnQkFBd0IsNkJBUXRCO2dCQVJGO29CQUF3Qiw4QkFRdEI7Z0JBQUUsQ0FBQztnQkFBRCxnQkFBQztZQUFELENBQUMsQUFSTCxDQUF3Qixh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QixDQUFDO2dDQUNILENBQUMsQ0FBQyxDQUFDOzRCQUNMLENBQUU7NEJBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQ0FDZixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7NEJBQ2hCLENBQUM7d0JBQ0gsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNiLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvU3luY1N0b3JlLXN5bmMtbW9kZWwtdG8tc2VydmVyLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgUGFzY2FsIEJyZXdpbmcgb24gMjguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQge01vZGVsLCBNb2RlbEN0b3J9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtTeW5jU3RvcmV9IGZyb20gJy4vU3luY1N0b3JlJztcbmltcG9ydCB7b3BlbkRhdGFiYXNlfSBmcm9tICcuL1dlYlNxbFN0b3JlJztcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi4vd2ViL3VybHMnO1xuaW1wb3J0IHt0ZXN0U2VydmVyfSBmcm9tICcuLi93ZWIvaHR0cC5zcGVjJztcblxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xuICB0aGlzLnRpbWVvdXQoODAwMCk7XG5cbiAgdmFyIG1vZGVsOiBNb2RlbCA9IG51bGw7XG4gIHZhciBzdG9yZTogU3luY1N0b3JlID0gbnVsbDtcbiAgdmFyIG1vZGVsVHlwZTogTW9kZWxDdG9yID0gbnVsbDtcbiAgdmFyIHByb21pc2U6IFEuUHJvbWlzZTxNb2RlbD4gPSBudWxsO1xuXG4gIGJlZm9yZUVhY2goZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0ZXN0U2VydmVyLmxvZ2luLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgc3RvcmUgPSBuZXcgU3luY1N0b3JlKHtcbiAgICAgICAgdXNlTG9jYWxTdG9yZTogdHJ1ZSxcbiAgICAgICAgdXNlU29ja2V0Tm90aWZ5OiBmYWxzZVxuICAgICAgfSk7XG5cbiAgICAgIGNsYXNzIE1vZGVsVHlwZSBleHRlbmRzIE1vZGVsLmRlZmF1bHRzKHtcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdpZCcsXG4gICAgICAgIGVudGl0eTogJ1VzZXInLFxuICAgICAgICBzdG9yZTogc3RvcmUsXG4gICAgICAgIHVybFJvb3Q6IHVybHMucmVzb2x2ZVVybCgnYXBpL3YxL3VzZXIvJywge1xuICAgICAgICAgIHNlcnZlclVybDogdGVzdFNlcnZlci5zZXJ2ZXJVcmwsXG4gICAgICAgICAgYXBwbGljYXRpb246ICdyZWx1dGlvbnNkaydcbiAgICAgICAgfSlcbiAgICAgIH0pIHt9XG5cbiAgICAgIG1vZGVsVHlwZSA9IE1vZGVsVHlwZTtcbiAgICAgIG1vZGVsID0gbmV3IG1vZGVsVHlwZSh7aWQ6ICcxMjMxMid9KTtcbiAgICAgIHByb21pc2UgPSBRKG1vZGVsLmZldGNoKCkpLnRoZW5SZXNvbHZlKG1vZGVsKTtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KTtcbiAgfSk7XG5cbiAgcmV0dXJuIFtcblxuICAgIGl0KCdmZXRjaCBtb2RlbCBzeW5jIHRvIHNlcnZlcicsICgpID0+IHtcbiAgICAgIHZhciBoYXZlVG9iZSA9IHtcbiAgICAgICAgdXNlcm5hbWU6ICdtZXNzYWdlLW9mZmxpbmUtdGVzdCcsXG4gICAgICAgIHBhc3N3b3JkOiAnYWRtaW4nLFxuICAgICAgICBpZDogJzEyMzEyJ1xuICAgICAgfTtcbiAgICAgIHJldHVybiBwcm9taXNlLnRoZW4oKCkgPT4ge1xuICAgICAgICBPYmplY3Qua2V5cyhtb2RlbC5hdHRyaWJ1dGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChhdHRyKSB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKG1vZGVsLmdldChhdHRyKSwgaGF2ZVRvYmVbYXR0cl0sICdtb2RlbCBoYXMgc2FtZSAnICsgYXR0cik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ29uIHN5bmMgY2hlY2sgX19tc2dfXyB0YWJsZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHF1ZXJ5ID0gJ1NFTEVDVCAqIEZST00gXFwnX19tc2dfX1xcJyBXSEVSRSBpZCA9ID8nO1xuICAgICAgcmV0dXJuIHByb21pc2UudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiBvcGVuRGF0YWJhc2Uoe1xuICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcbiAgICAgICAgfSk7XG4gICAgICB9KS50aGVuKChkYikgPT4ge1xuICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICByZXR1cm4gZGIudHJhbnNhY3Rpb24oKHR4KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgIGFzc2VydC5lcXVhbCh0YWJsZS5yb3dzLmxlbmd0aCwgMCk7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sIHJlamVjdCk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgnZGVsZXRlIG1vZGVsIGZyb20gZGInLCAoKSA9PiB7XG4gICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgY29uc3QgY2hhbm5lbCA9ICg8U3luY1N0b3JlPm1vZGVsLnN0b3JlKS5nZXRFbmRwb2ludChtb2RlbCkuY2hhbm5lbDtcbiAgICAgICAgcmV0dXJuIG1vZGVsLmRlc3Ryb3koKS50aGVuUmVzb2x2ZShjaGFubmVsKTtcbiAgICAgIH0pLnRoZW4oKGNoYW5uZWwpID0+IHtcbiAgICAgICAgdmFyIHF1ZXJ5ID0gJ1NFTEVDVCAqIEZST00gXFwnJyArIGNoYW5uZWwgKyAnXFwnIFdIRVJFIGlkID0/JztcblxuICAgICAgICByZXR1cm4gcHJvbWlzZS50aGVuKCgpID0+IHtcbiAgICAgICAgICByZXR1cm4gb3BlbkRhdGFiYXNlKHtcbiAgICAgICAgICAgIG5hbWU6ICdyZWx1dGlvbi1saXZlZGF0YSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkudGhlbigoZGIpID0+IHtcbiAgICAgICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgICAgIHJldHVybiBkYi50cmFuc2FjdGlvbigodHgpID0+IHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHguZXhlY3V0ZVNxbChxdWVyeSwgW21vZGVsLmVudGl0eSArICd+JyArIG1vZGVsLmdldCgnaWQnKV0sICh0eDEsIHRhYmxlKSA9PiB7XG4gICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnQuZXF1YWwodGFibGUucm93cy5sZW5ndGgsIDApO1xuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycm9yKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCByZWplY3QpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19