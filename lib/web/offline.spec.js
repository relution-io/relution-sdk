/**
 * @file web/offline.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 30.06.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var offline = require('./offline');
var assert = require('assert');
function makeLoginResponse() {
    return {
        'user': {
            'type': 'USER',
            'uuid': 'Horst Müller',
            'version': 15,
            'aclEntries': [
                'cfbb22c5-c708-4711-931f-831afc93940a:r',
                'Horst Müller:rw',
                '026f3589-d846-4711-a6a8-461aec597a6e:rw'
            ],
            'name': 'h.mueller',
            'givenName': 'Horst',
            'surname': 'Müller',
            'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
            'email': 'h.mueller@relution.io',
            'lastLoggedTime': 1467282226244,
            'passwordExpires': 1477066704000,
            'locked': false,
            'activated': true,
            'effectivePermissions': '*',
            'sysRoles': [],
            'roles': ['users'],
            'readonly': true,
            'rolesObjects': [{
                    'uuid': 'users',
                    'type': 'GROUP',
                    'name': 'users',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }
            ]
        },
        'organization': {
            'uuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
            'aclEntries': [
                'cfbb22c5-c708-4711-931f-831afc93940a:r',
                '80fde861-8986-4711-942a-12fb5b97541d:rw',
                'ab470d0e-d484-4711-b1ef-98095d1e6be9:r'
            ],
            'name': 'sample',
            'uniqueName': 'sample',
            'address': {
                'address': 'ABC 4711',
                'postalCode': '01234',
                'city': 'In the',
                'country': 'Middle of Nowhere'
            },
            'billingSettings': {
                'billingAddress': {
                    'address': 'Leitzstr. 45',
                    'postalCode': '70479',
                    'city': 'Stuttgart',
                    'country': 'Germany'
                }, 'billingPerson': {}, 'currency': 'EUR'
            },
            'passwordPolicy': {
                'allowSimplePassword': false,
                'minimumPasswordLength': 8,
                'minimumNumbersOfLowerCaseLetters': 0,
                'minimumNumbersOfUpperCaseLetters': 0,
                'minimumNumbersOfDigits': 0,
                'requiredNumbersOfSymbols': 0,
                'maximumPasswordAge': 0
            },
            'technicalPerson': {},
            'url': 'http://www.relution.io/',
            'assetPath': '/organizations/mine',
            'reportLocaleString': 'de_DE',
            'version': 3,
            'effectivePermissions': '*',
            'propertyMap': {},
            'defaultRoles': ['cfbb22c5-c708-4711-931f-831afc93940a']
        },
        'roles': {
            'roles': [{
                    'uuid': '905f5e11-2a2b-4711-b82a-e3f443c3073b',
                    'name': 'Developer',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': '98c355cc-224e-4711-8f41-8edb4cf38586',
                    'name': 'Appstore User',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'APPLICATION_CREATOR',
                    'name': 'APPLICATION_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'APPLICATION_EDITOR',
                    'name': 'APPLICATION_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'APPLICATION_USER',
                    'name': 'APPLICATION_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'APPSTORE_USER',
                    'name': 'APPSTORE_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'APP_CREATOR',
                    'name': 'APP_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'APP_REVIEWER',
                    'name': 'APP_REVIEWER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'cfbb22c5-c708-4711-931f-831afc93940a',
                    'name': 'User',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'CONNECTION_CREATOR',
                    'name': 'CONNECTION_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'CONNECTION_EDITOR',
                    'name': 'CONNECTION_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'CONNECTION_USER',
                    'name': 'CONNECTION_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'e2ddc0b3-9696-4711-b39d-87a9ac1ba066',
                    'name': 'Device User',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'ff4dc434-2511-4711-a309-54e1a2e6ba52',
                    'name': 'App Reviewer',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'FILTER_USER',
                    'name': 'FILTER_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'GROUP_USER',
                    'name': 'GROUP_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'LOG_VIEWER',
                    'name': 'LOG_VIEWER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'MDM_USER',
                    'name': 'MDM_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'METAMODEL_CREATOR',
                    'name': 'METAMODEL_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'METAMODEL_EDITOR',
                    'name': 'METAMODEL_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'METAMODEL_USER',
                    'name': 'METAMODEL_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'ORGANIZATION_USER',
                    'name': 'ORGANIZATION_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PIPELINE_CREATOR',
                    'name': 'PIPELINE_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PIPELINE_EDITOR',
                    'name': 'PIPELINE_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PIPELINE_USER',
                    'name': 'PIPELINE_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PUSH_SERVICE_CREATOR',
                    'name': 'PUSH_SERVICE_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PUSH_SERVICE_EDITOR',
                    'name': 'PUSH_SERVICE_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'PUSH_SERVICE_USER',
                    'name': 'PUSH_SERVICE_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'SCHEDULED_TASK_CREATOR',
                    'name': 'SCHEDULED_TASK_CREATOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'SCHEDULED_TASK_EDITOR',
                    'name': 'SCHEDULED_TASK_EDITOR',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'SCHEDULED_TASK_USER',
                    'name': 'SCHEDULED_TASK_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'USER_USER',
                    'name': 'USER_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'Horst Müller',
                    'name': 'h.mueller',
                    'type': 'USER',
                    'systemPermission': false
                }]
        },
        'licenseInfos': {
            'licenseModelName': 'Enterprise',
            'licenseInfos': {
                'PUBLIC_APP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'PUBLIC_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 10
                },
                'USER_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'USER_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 299
                },
                'GROUP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'GROUP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 212
                },
                'NATIVE_APP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'NATIVE_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 203
                },
                'DEVICE_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'DEVICE_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 5
                },
                'WEBCLIP_APP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'WEBCLIP_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 4
                },
                'SECURE_MAIL_GATEWAY_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'SECURE_MAIL_GATEWAY_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 1
                },
                'LDAP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'LDAP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 1
                },
                'RELUTION_APP_FEATURE': {
                    'organizationUuid': 'b8cd5f82-d895-4711-8210-4ee86081ef5d',
                    'permissionUuid': 'RELUTION_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 8
                }
            }
        }
    };
}
describe(module.filename || __filename, function () {
    return [
        it('encryption correct password', function () {
            var password = 'test123#!';
            var someData = {
                a: 1,
                b: 2,
                c: null
            };
            return offline.encryptJson(password, someData).then(function (encryptedData) {
                return offline.decryptJson(password, encryptedData);
            }).then(function (decrytedData) {
                assert.deepEqual(decrytedData, someData, 'decryption yields same data');
            });
        }),
        it('encryption incorrect password', function () {
            var password = 'test123#!';
            var someData = {
                a: 1,
                b: 2,
                c: null
            };
            return offline.encryptJson(password, someData).then(function (encryptedData) {
                return offline.decryptJson('Test123#!', encryptedData);
            }).then(function () {
                assert.fail('decryption succeeded although passwords differ!');
                throw new Error('never reached');
            }, function () {
                return true; // expected failure
            });
        }),
        it('persistence correct password', function () {
            var loginResponse = makeLoginResponse();
            var credentials = {
                userName: loginResponse.user.name,
                password: 'test123#!'
            };
            var serverOptions = {
                serverUrl: 'https://live.relution.io/'
            };
            return offline.storeOfflineLogin(credentials, serverOptions, loginResponse).then(function (passthroughLoginResponse) {
                assert.deepEqual(passthroughLoginResponse, loginResponse, 'response was not altered');
                return true;
            }).then(function () {
                return offline.fetchOfflineLogin(credentials, serverOptions);
            }).then(function (fetchedLoginResponse) {
                assert.deepEqual(fetchedLoginResponse, loginResponse, 'response was fetched correctly');
                return true;
            });
        }),
        it('persistence incorrect password', function () {
            var loginResponse = makeLoginResponse();
            var credentials = {
                userName: loginResponse.user.name,
                password: 'test123#!'
            };
            var serverOptions = {
                serverUrl: 'https://live.relution.io/'
            };
            return offline.storeOfflineLogin(credentials, serverOptions, loginResponse).then(function (passthroughLoginResponse) {
                assert.deepEqual(passthroughLoginResponse, loginResponse, 'response was not altered');
                return true;
            }).then(function () {
                credentials.password = 'Test123#!';
                return offline.fetchOfflineLogin(credentials, serverOptions);
            }).then(function () {
                assert.fail('fetch succeeded although passwords differ!');
                throw new Error('never reached');
            }, function () {
                return true; // expected failure
            });
        }),
        it('persistence clear store', function () {
            var loginResponse = makeLoginResponse();
            var credentials = {
                userName: loginResponse.user.name,
                password: 'test123#!'
            };
            var serverOptions = {
                serverUrl: 'https://live.relution.io/'
            };
            return offline.clearOfflineLogin(credentials, serverOptions).then(function () {
                return offline.fetchOfflineLogin(credentials, serverOptions);
            }).then(function (data) {
                assert.ok(!data, 'now there is no data to fetch');
                return true;
            }).then(function () {
                return offline.storeOfflineLogin(credentials, serverOptions, loginResponse);
            }).then(function (passthroughLoginResponse) {
                assert.deepEqual(passthroughLoginResponse, loginResponse, 'response was not altered');
                return true;
            }).then(function () {
                return offline.fetchOfflineLogin(credentials, serverOptions);
            }).then(function (fetchedLoginResponse) {
                assert.deepEqual(fetchedLoginResponse, loginResponse, 'now there is data to fetch');
                return true;
            }).then(function () {
                return offline.clearOfflineLogin(credentials, serverOptions);
            }).then(function () {
                return offline.fetchOfflineLogin(credentials, serverOptions);
            }).then(function (data) {
                assert.ok(!data, 'again no data to fetch');
                return true;
            });
        })
    ];
});
//# sourceMappingURL=offline.spec.js.map