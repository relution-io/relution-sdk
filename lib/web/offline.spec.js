/*
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
/**
 * @module web
 */
/** */
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
        'roles': /*{
          'roles':*/ [{
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
            }],
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
                assert(false, 'fetch succeeded although passwords differ!');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmbGluZS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9vZmZsaW5lLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUdyQyxJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQztJQUNFLE1BQU0sQ0FBQztRQUNMLE1BQU0sRUFBRTtZQUNOLE1BQU0sRUFBRSxNQUFNO1lBQ2QsTUFBTSxFQUFFLGNBQWM7WUFDdEIsU0FBUyxFQUFFLEVBQUU7WUFDYixZQUFZLEVBQUU7Z0JBQ1osd0NBQXdDO2dCQUN4QyxpQkFBaUI7Z0JBQ2pCLHlDQUF5QzthQUMxQztZQUNELE1BQU0sRUFBRSxXQUFXO1lBQ25CLFdBQVcsRUFBRSxPQUFPO1lBQ3BCLFNBQVMsRUFBRSxRQUFRO1lBQ25CLGtCQUFrQixFQUFFLHNDQUFzQztZQUMxRCxPQUFPLEVBQUUsdUJBQXVCO1lBQ2hDLGdCQUFnQixFQUFFLGFBQWE7WUFDL0IsaUJBQWlCLEVBQUUsYUFBYTtZQUNoQyxRQUFRLEVBQUUsS0FBSztZQUNmLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLHNCQUFzQixFQUFFLEdBQUc7WUFDM0IsVUFBVSxFQUFFLEVBQUU7WUFDZCxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFDbEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsY0FBYyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsV0FBVyxFQUFFLE9BQU87b0JBQ3BCLGtCQUFrQixFQUFFLEtBQUs7aUJBQzFCO2FBQ0E7U0FDRjtRQUNELGNBQWMsRUFBRTtZQUNkLE1BQU0sRUFBRSxzQ0FBc0M7WUFDOUMsWUFBWSxFQUFFO2dCQUNaLHdD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WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIHdlYi9vZmZsaW5lLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDMwLjA2LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlICdMaWNlbnNlJyk7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgd2ViXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIG9mZmxpbmUgZnJvbSAnLi9vZmZsaW5lJztcclxuaW1wb3J0ICogYXMgaHR0cCBmcm9tICcuL2h0dHAnO1xyXG5cclxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XHJcblxyXG5mdW5jdGlvbiBtYWtlTG9naW5SZXNwb25zZSgpOiBodHRwLkxvZ2luUmVzcG9uc2Uge1xyXG4gIHJldHVybiB7XHJcbiAgICAndXNlcic6IHtcclxuICAgICAgJ3R5cGUnOiAnVVNFUicsXHJcbiAgICAgICd1dWlkJzogJ0hvcnN0IE3DvGxsZXInLFxyXG4gICAgICAndmVyc2lvbic6IDE1LFxyXG4gICAgICAnYWNsRW50cmllcyc6IFtcclxuICAgICAgICAnY2ZiYjIyYzUtYzcwOC00NzExLTkzMWYtODMxYWZjOTM5NDBhOnInLFxyXG4gICAgICAgICdIb3JzdCBNw7xsbGVyOnJ3JyxcclxuICAgICAgICAnMDI2ZjM1ODktZDg0Ni00NzExLWE2YTgtNDYxYWVjNTk3YTZlOnJ3J1xyXG4gICAgICBdLFxyXG4gICAgICAnbmFtZSc6ICdoLm11ZWxsZXInLFxyXG4gICAgICAnZ2l2ZW5OYW1lJzogJ0hvcnN0JyxcclxuICAgICAgJ3N1cm5hbWUnOiAnTcO8bGxlcicsXHJcbiAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXHJcbiAgICAgICdlbWFpbCc6ICdoLm11ZWxsZXJAcmVsdXRpb24uaW8nLFxyXG4gICAgICAnbGFzdExvZ2dlZFRpbWUnOiAxNDY3MjgyMjI2MjQ0LFxyXG4gICAgICAncGFzc3dvcmRFeHBpcmVzJzogMTQ3NzA2NjcwNDAwMCxcclxuICAgICAgJ2xvY2tlZCc6IGZhbHNlLFxyXG4gICAgICAnYWN0aXZhdGVkJzogdHJ1ZSxcclxuICAgICAgJ2VmZmVjdGl2ZVBlcm1pc3Npb25zJzogJyonLFxyXG4gICAgICAnc3lzUm9sZXMnOiBbXSxcclxuICAgICAgJ3JvbGVzJzogWyd1c2VycyddLFxyXG4gICAgICAncmVhZG9ubHknOiB0cnVlLFxyXG4gICAgICAncm9sZXNPYmplY3RzJzogW3tcclxuICAgICAgICAndXVpZCc6ICd1c2VycycsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICduYW1lJzogJ3VzZXJzJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXHJcbiAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgICdvcmdhbml6YXRpb24nOiB7XHJcbiAgICAgICd1dWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXHJcbiAgICAgICdhY2xFbnRyaWVzJzogW1xyXG4gICAgICAgICdjZmJiMjJjNS1jNzA4LTQ3MTEtOTMxZi04MzFhZmM5Mzk0MGE6cicsXHJcbiAgICAgICAgJzgwZmRlODYxLTg5ODYtNDcxMS05NDJhLTEyZmI1Yjk3NTQxZDpydycsXHJcbiAgICAgICAgJ2FiNDcwZDBlLWQ0ODQtNDcxMS1iMWVmLTk4MDk1ZDFlNmJlOTpyJ1xyXG4gICAgICBdLFxyXG4gICAgICAnbmFtZSc6ICdzYW1wbGUnLFxyXG4gICAgICAndW5pcXVlTmFtZSc6ICdzYW1wbGUnLFxyXG4gICAgICAnYWRkcmVzcyc6IHtcclxuICAgICAgICAnYWRkcmVzcyc6ICdBQkMgNDcxMScsXHJcbiAgICAgICAgJ3Bvc3RhbENvZGUnOiAnMDEyMzQnLFxyXG4gICAgICAgICdjaXR5JzogJ0luIHRoZScsXHJcbiAgICAgICAgJ2NvdW50cnknOiAnTWlkZGxlIG9mIE5vd2hlcmUnXHJcbiAgICAgIH0sXHJcbiAgICAgICdiaWxsaW5nU2V0dGluZ3MnOiB7XHJcbiAgICAgICAgJ2JpbGxpbmdBZGRyZXNzJzoge1xyXG4gICAgICAgICAgJ2FkZHJlc3MnOiAnTGVpdHpzdHIuIDQ1JyxcclxuICAgICAgICAgICdwb3N0YWxDb2RlJzogJzcwNDc5JyxcclxuICAgICAgICAgICdjaXR5JzogJ1N0dXR0Z2FydCcsXHJcbiAgICAgICAgICAnY291bnRyeSc6ICdHZXJtYW55J1xyXG4gICAgICAgIH0sICdiaWxsaW5nUGVyc29uJzoge30sICdjdXJyZW5jeSc6ICdFVVInXHJcbiAgICAgIH0sXHJcbiAgICAgICdwYXNzd29yZFBvbGljeSc6IHtcclxuICAgICAgICAnYWxsb3dTaW1wbGVQYXNzd29yZCc6IGZhbHNlLFxyXG4gICAgICAgICdtaW5pbXVtUGFzc3dvcmRMZW5ndGgnOiA4LFxyXG4gICAgICAgICdtaW5pbXVtTnVtYmVyc09mTG93ZXJDYXNlTGV0dGVycyc6IDAsXHJcbiAgICAgICAgJ21pbmltdW1OdW1iZXJzT2ZVcHBlckNhc2VMZXR0ZXJzJzogMCxcclxuICAgICAgICAnbWluaW11bU51bWJlcnNPZkRpZ2l0cyc6IDAsXHJcbiAgICAgICAgJ3JlcXVpcmVkTnVtYmVyc09mU3ltYm9scyc6IDAsXHJcbiAgICAgICAgJ21heGltdW1QYXNzd29yZEFnZSc6IDBcclxuICAgICAgfSxcclxuICAgICAgJ3RlY2huaWNhbFBlcnNvbic6IHt9LFxyXG4gICAgICAndXJsJzogJ2h0dHA6Ly93d3cucmVsdXRpb24uaW8vJyxcclxuICAgICAgJ2Fzc2V0UGF0aCc6ICcvb3JnYW5pemF0aW9ucy9taW5lJyxcclxuICAgICAgJ3JlcG9ydExvY2FsZVN0cmluZyc6ICdkZV9ERScsXHJcbiAgICAgICd2ZXJzaW9uJzogMyxcclxuICAgICAgJ2VmZmVjdGl2ZVBlcm1pc3Npb25zJzogJyonLFxyXG4gICAgICAncHJvcGVydHlNYXAnOiB7fSxcclxuICAgICAgJ2RlZmF1bHRSb2xlcyc6IFsnY2ZiYjIyYzUtYzcwOC00NzExLTkzMWYtODMxYWZjOTM5NDBhJ11cclxuICAgIH0sXHJcbiAgICAncm9sZXMnOiAvKntcclxuICAgICAgJ3JvbGVzJzoqLyBbe1xyXG4gICAgICAgICd1dWlkJzogJzkwNWY1ZTExLTJhMmItNDcxMS1iODJhLWUzZjQ0M2MzMDczYicsXHJcbiAgICAgICAgJ25hbWUnOiAnRGV2ZWxvcGVyJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogZmFsc2VcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJzk4YzM1NWNjLTIyNGUtNDcxMS04ZjQxLThlZGI0Y2YzODU4NicsXHJcbiAgICAgICAgJ25hbWUnOiAnQXBwc3RvcmUgVXNlcicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX0dST1VQJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdBUFBMSUNBVElPTl9DUkVBVE9SJyxcclxuICAgICAgICAnbmFtZSc6ICdBUFBMSUNBVElPTl9DUkVBVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdBUFBMSUNBVElPTl9FRElUT1InLFxyXG4gICAgICAgICduYW1lJzogJ0FQUExJQ0FUSU9OX0VESVRPUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnQVBQTElDQVRJT05fVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnQVBQTElDQVRJT05fVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnQVBQU1RPUkVfVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnQVBQU1RPUkVfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnQVBQX0NSRUFUT1InLFxyXG4gICAgICAgICduYW1lJzogJ0FQUF9DUkVBVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdBUFBfUkVWSUVXRVInLFxyXG4gICAgICAgICduYW1lJzogJ0FQUF9SRVZJRVdFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnY2ZiYjIyYzUtYzcwOC00NzExLTkzMWYtODMxYWZjOTM5NDBhJyxcclxuICAgICAgICAnbmFtZSc6ICdVc2VyJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogZmFsc2VcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ0NPTk5FQ1RJT05fQ1JFQVRPUicsXHJcbiAgICAgICAgJ25hbWUnOiAnQ09OTkVDVElPTl9DUkVBVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdDT05ORUNUSU9OX0VESVRPUicsXHJcbiAgICAgICAgJ25hbWUnOiAnQ09OTkVDVElPTl9FRElUT1InLFxyXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ0NPTk5FQ1RJT05fVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnQ09OTkVDVElPTl9VU0VSJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdlMmRkYzBiMy05Njk2LTQ3MTEtYjM5ZC04N2E5YWMxYmEwNjYnLFxyXG4gICAgICAgICduYW1lJzogJ0RldmljZSBVc2VyJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogZmFsc2VcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ2ZmNGRjNDM0LTI1MTEtNDcxMS1hMzA5LTU0ZTFhMmU2YmE1MicsXHJcbiAgICAgICAgJ25hbWUnOiAnQXBwIFJldmlld2VyJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogZmFsc2VcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ0ZJTFRFUl9VU0VSJyxcclxuICAgICAgICAnbmFtZSc6ICdGSUxURVJfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnR1JPVVBfVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnR1JPVVBfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnTE9HX1ZJRVdFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnTE9HX1ZJRVdFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnTURNX1VTRVInLFxyXG4gICAgICAgICduYW1lJzogJ01ETV9VU0VSJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdNRVRBTU9ERUxfQ1JFQVRPUicsXHJcbiAgICAgICAgJ25hbWUnOiAnTUVUQU1PREVMX0NSRUFUT1InLFxyXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ01FVEFNT0RFTF9FRElUT1InLFxyXG4gICAgICAgICduYW1lJzogJ01FVEFNT0RFTF9FRElUT1InLFxyXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ01FVEFNT0RFTF9VU0VSJyxcclxuICAgICAgICAnbmFtZSc6ICdNRVRBTU9ERUxfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnT1JHQU5JWkFUSU9OX1VTRVInLFxyXG4gICAgICAgICduYW1lJzogJ09SR0FOSVpBVElPTl9VU0VSJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdQSVBFTElORV9DUkVBVE9SJyxcclxuICAgICAgICAnbmFtZSc6ICdQSVBFTElORV9DUkVBVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdQSVBFTElORV9FRElUT1InLFxyXG4gICAgICAgICduYW1lJzogJ1BJUEVMSU5FX0VESVRPUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnUElQRUxJTkVfVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnUElQRUxJTkVfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnUFVTSF9TRVJWSUNFX0NSRUFUT1InLFxyXG4gICAgICAgICduYW1lJzogJ1BVU0hfU0VSVklDRV9DUkVBVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdQVVNIX1NFUlZJQ0VfRURJVE9SJyxcclxuICAgICAgICAnbmFtZSc6ICdQVVNIX1NFUlZJQ0VfRURJVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdQVVNIX1NFUlZJQ0VfVVNFUicsXHJcbiAgICAgICAgJ25hbWUnOiAnUFVTSF9TRVJWSUNFX1VTRVInLFxyXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ1NDSEVEVUxFRF9UQVNLX0NSRUFUT1InLFxyXG4gICAgICAgICduYW1lJzogJ1NDSEVEVUxFRF9UQVNLX0NSRUFUT1InLFxyXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcclxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcclxuICAgICAgfSwge1xyXG4gICAgICAgICd1dWlkJzogJ1NDSEVEVUxFRF9UQVNLX0VESVRPUicsXHJcbiAgICAgICAgJ25hbWUnOiAnU0NIRURVTEVEX1RBU0tfRURJVE9SJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdTQ0hFRFVMRURfVEFTS19VU0VSJyxcclxuICAgICAgICAnbmFtZSc6ICdTQ0hFRFVMRURfVEFTS19VU0VSJyxcclxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXHJcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXHJcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXHJcbiAgICAgIH0sIHtcclxuICAgICAgICAndXVpZCc6ICdVU0VSX1VTRVInLFxyXG4gICAgICAgICduYW1lJzogJ1VTRVJfVVNFUicsXHJcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxyXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxyXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgJ3V1aWQnOiAnSG9yc3QgTcO8bGxlcicsXHJcbiAgICAgICAgJ25hbWUnOiAnaC5tdWVsbGVyJyxcclxuICAgICAgICAndHlwZSc6ICdVU0VSJyxcclxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXHJcbiAgICAgIH1dXHJcbiAgICAvKn0qLyxcclxuICAgICdsaWNlbnNlSW5mb3MnOiB7XHJcbiAgICAgICdsaWNlbnNlTW9kZWxOYW1lJzogJ0VudGVycHJpc2UnLFxyXG4gICAgICAnbGljZW5zZUluZm9zJzoge1xyXG4gICAgICAgICdQVUJMSUNfQVBQX0ZFQVRVUkUnOiB7XHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxyXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1BVQkxJQ19BUFBfRkVBVFVSRScsXHJcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxyXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXHJcbiAgICAgICAgICAnbWV0cmljJzogMTBcclxuICAgICAgICB9LFxyXG4gICAgICAgICdVU0VSX0ZFQVRVUkUnOiB7XHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxyXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1VTRVJfRkVBVFVSRScsXHJcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxyXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXHJcbiAgICAgICAgICAnbWV0cmljJzogMjk5XHJcbiAgICAgICAgfSxcclxuICAgICAgICAnR1JPVVBfRkVBVFVSRSc6IHtcclxuICAgICAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXHJcbiAgICAgICAgICAncGVybWlzc2lvblV1aWQnOiAnR1JPVVBfRkVBVFVSRScsXHJcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxyXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXHJcbiAgICAgICAgICAnbWV0cmljJzogMjEyXHJcbiAgICAgICAgfSxcclxuICAgICAgICAnTkFUSVZFX0FQUF9GRUFUVVJFJzoge1xyXG4gICAgICAgICAgJ29yZ2FuaXphdGlvblV1aWQnOiAnYjhjZDVmODItZDg5NS00NzExLTgyMTAtNGVlODYwODFlZjVkJyxcclxuICAgICAgICAgICdwZXJtaXNzaW9uVXVpZCc6ICdOQVRJVkVfQVBQX0ZFQVRVUkUnLFxyXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcclxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxyXG4gICAgICAgICAgJ21ldHJpYyc6IDIwM1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ0RFVklDRV9GRUFUVVJFJzoge1xyXG4gICAgICAgICAgJ29yZ2FuaXphdGlvblV1aWQnOiAnYjhjZDVmODItZDg5NS00NzExLTgyMTAtNGVlODYwODFlZjVkJyxcclxuICAgICAgICAgICdwZXJtaXNzaW9uVXVpZCc6ICdERVZJQ0VfRkVBVFVSRScsXHJcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxyXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXHJcbiAgICAgICAgICAnbWV0cmljJzogNVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ1dFQkNMSVBfQVBQX0ZFQVRVUkUnOiB7XHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxyXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1dFQkNMSVBfQVBQX0ZFQVRVUkUnLFxyXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcclxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxyXG4gICAgICAgICAgJ21ldHJpYyc6IDRcclxuICAgICAgICB9LFxyXG4gICAgICAgICdTRUNVUkVfTUFJTF9HQVRFV0FZX0ZFQVRVUkUnOiB7XHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxyXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1NFQ1VSRV9NQUlMX0dBVEVXQVlfRkVBVFVSRScsXHJcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxyXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXHJcbiAgICAgICAgICAnbWV0cmljJzogMVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJ0xEQVBfRkVBVFVSRSc6IHtcclxuICAgICAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXHJcbiAgICAgICAgICAncGVybWlzc2lvblV1aWQnOiAnTERBUF9GRUFUVVJFJyxcclxuICAgICAgICAgICdleHBpcmF0aW9uRGF0ZSc6IDE0Njc4ODYwMDcwMDAsXHJcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcclxuICAgICAgICAgICdtZXRyaWMnOiAxXHJcbiAgICAgICAgfSxcclxuICAgICAgICAnUkVMVVRJT05fQVBQX0ZFQVRVUkUnOiB7XHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxyXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1JFTFVUSU9OX0FQUF9GRUFUVVJFJyxcclxuICAgICAgICAgICdleHBpcmF0aW9uRGF0ZSc6IDE0Njc4ODYwMDcwMDAsXHJcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcclxuICAgICAgICAgICdtZXRyaWMnOiA4XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfTtcclxufVxyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsICgpID0+IHtcclxuICByZXR1cm4gW1xyXG5cclxuICAgIGl0KCdwZXJzaXN0ZW5jZSBjb3JyZWN0IHBhc3N3b3JkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBsb2dpblJlc3BvbnNlID0gbWFrZUxvZ2luUmVzcG9uc2UoKTtcclxuICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSB7XHJcbiAgICAgICAgdXNlck5hbWU6IGxvZ2luUmVzcG9uc2UudXNlci5uYW1lLFxyXG4gICAgICAgIHBhc3N3b3JkOiAndGVzdDEyMyMhJ1xyXG4gICAgICB9O1xyXG4gICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xyXG4gICAgICAgIHNlcnZlclVybDogJ2h0dHBzOi8vbGl2ZS5yZWx1dGlvbi5pby8nXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zLCBsb2dpblJlc3BvbnNlKS50aGVuKFxyXG4gICAgICAgIChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwocGFzc3Rocm91Z2hMb2dpblJlc3BvbnNlLCBsb2dpblJlc3BvbnNlLCAncmVzcG9uc2Ugd2FzIG5vdCBhbHRlcmVkJyk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpO1xyXG4gICAgICB9KS50aGVuKChmZXRjaGVkTG9naW5SZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZmV0Y2hlZExvZ2luUmVzcG9uc2UsIGxvZ2luUmVzcG9uc2UsICdyZXNwb25zZSB3YXMgZmV0Y2hlZCBjb3JyZWN0bHknKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgncGVyc2lzdGVuY2UgaW5jb3JyZWN0IHBhc3N3b3JkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBsb2dpblJlc3BvbnNlID0gbWFrZUxvZ2luUmVzcG9uc2UoKTtcclxuICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSB7XHJcbiAgICAgICAgdXNlck5hbWU6IGxvZ2luUmVzcG9uc2UudXNlci5uYW1lLFxyXG4gICAgICAgIHBhc3N3b3JkOiAndGVzdDEyMyMhJ1xyXG4gICAgICB9O1xyXG4gICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xyXG4gICAgICAgIHNlcnZlclVybDogJ2h0dHBzOi8vbGl2ZS5yZWx1dGlvbi5pby8nXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zLCBsb2dpblJlc3BvbnNlKS50aGVuKFxyXG4gICAgICAgIChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgIGFzc2VydC5kZWVwRXF1YWwocGFzc3Rocm91Z2hMb2dpblJlc3BvbnNlLCBsb2dpblJlc3BvbnNlLCAncmVzcG9uc2Ugd2FzIG5vdCBhbHRlcmVkJyk7XHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgY3JlZGVudGlhbHMucGFzc3dvcmQgPSAnVGVzdDEyMyMhJztcclxuICAgICAgICByZXR1cm4gb2ZmbGluZS5mZXRjaE9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgc2VydmVyT3B0aW9ucyk7XHJcbiAgICAgIH0pLnRoZW4oKCk6IGJvb2xlYW4gPT4ge1xyXG4gICAgICAgIGFzc2VydChmYWxzZSwgJ2ZldGNoIHN1Y2NlZWRlZCBhbHRob3VnaCBwYXNzd29yZHMgZGlmZmVyIScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbmV2ZXIgcmVhY2hlZCcpO1xyXG4gICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGV4cGVjdGVkIGZhaWx1cmVcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgncGVyc2lzdGVuY2UgY2xlYXIgc3RvcmUnLCAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxvZ2luUmVzcG9uc2UgPSBtYWtlTG9naW5SZXNwb25zZSgpO1xyXG4gICAgICBjb25zdCBjcmVkZW50aWFscyA9IHtcclxuICAgICAgICB1c2VyTmFtZTogbG9naW5SZXNwb25zZS51c2VyLm5hbWUsXHJcbiAgICAgICAgcGFzc3dvcmQ6ICd0ZXN0MTIzIyEnXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnN0IHNlcnZlck9wdGlvbnMgPSB7XHJcbiAgICAgICAgc2VydmVyVXJsOiAnaHR0cHM6Ly9saXZlLnJlbHV0aW9uLmlvLydcclxuICAgICAgfTtcclxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBvZmZsaW5lLmZldGNoT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zKTtcclxuICAgICAgfSkudGhlbigoZGF0YSkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5vayghZGF0YSwgJ25vdyB0aGVyZSBpcyBubyBkYXRhIHRvIGZldGNoJyk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zLCBsb2dpblJlc3BvbnNlKTtcclxuICAgICAgfSkudGhlbigocGFzc3Rocm91Z2hMb2dpblJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UsIGxvZ2luUmVzcG9uc2UsICdyZXNwb25zZSB3YXMgbm90IGFsdGVyZWQnKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpO1xyXG4gICAgICB9KS50aGVuKChmZXRjaGVkTG9naW5SZXNwb25zZSkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZmV0Y2hlZExvZ2luUmVzcG9uc2UsIGxvZ2luUmVzcG9uc2UsICdub3cgdGhlcmUgaXMgZGF0YSB0byBmZXRjaCcpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgICByZXR1cm4gb2ZmbGluZS5jbGVhck9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgc2VydmVyT3B0aW9ucyk7XHJcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiBvZmZsaW5lLmZldGNoT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zKTtcclxuICAgICAgfSkudGhlbigoZGF0YSkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5vayghZGF0YSwgJ2FnYWluIG5vIGRhdGEgdG8gZmV0Y2gnKTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19