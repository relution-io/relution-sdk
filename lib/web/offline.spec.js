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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2ZmbGluZS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9vZmZsaW5lLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUdyQyxJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQztJQUNFLE1BQU0sQ0FBQztRQUNMLE1BQU0sRUFBRTtZQUNOLE1BQU0sRUFBRSxNQUFNO1lBQ2QsTUFBTSxFQUFFLGNBQWM7WUFDdEIsU0FBUyxFQUFFLEVBQUU7WUFDYixZQUFZLEVBQUU7Z0JBQ1osd0NBQXdDO2dCQUN4QyxpQkFBaUI7Z0JBQ2pCLHlDQUF5QzthQUMxQztZQUNELE1BQU0sRUFBRSxXQUFXO1lBQ25CLFdBQVcsRUFBRSxPQUFPO1lBQ3BCLFNBQVMsRUFBRSxRQUFRO1lBQ25CLGtCQUFrQixFQUFFLHNDQUFzQztZQUMxRCxPQUFPLEVBQUUsdUJBQXVCO1lBQ2hDLGdCQUFnQixFQUFFLGFBQWE7WUFDL0IsaUJBQWlCLEVBQUUsYUFBYTtZQUNoQyxRQUFRLEVBQUUsS0FBSztZQUNmLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLHNCQUFzQixFQUFFLEdBQUc7WUFDM0IsVUFBVSxFQUFFLEVBQUU7WUFDZCxPQUFPLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFDbEIsVUFBVSxFQUFFLElBQUk7WUFDaEIsY0FBYyxFQUFFLENBQUM7b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsTUFBTSxFQUFFLE9BQU87b0JBQ2YsV0FBVyxFQUFFLE9BQU87b0JBQ3BCLGtCQUFrQixFQUFFLEtBQUs7aUJBQzFCO2FBQ0E7U0FDRjtRQUNELGNBQWMsRUFBRTtZQUNkLE1BQU0sRUFBRSxzQ0FBc0M7WUFDOUMsWUFBWSxFQUFFO2dCQUNaLHdD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WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSB3ZWIvb2ZmbGluZS5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAzMC4wNi4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSAnTGljZW5zZScpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSB3ZWJcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIG9mZmxpbmUgZnJvbSAnLi9vZmZsaW5lJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnLi9odHRwJztcblxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5cbmZ1bmN0aW9uIG1ha2VMb2dpblJlc3BvbnNlKCk6IGh0dHAuTG9naW5SZXNwb25zZSB7XG4gIHJldHVybiB7XG4gICAgJ3VzZXInOiB7XG4gICAgICAndHlwZSc6ICdVU0VSJyxcbiAgICAgICd1dWlkJzogJ0hvcnN0IE3DvGxsZXInLFxuICAgICAgJ3ZlcnNpb24nOiAxNSxcbiAgICAgICdhY2xFbnRyaWVzJzogW1xuICAgICAgICAnY2ZiYjIyYzUtYzcwOC00NzExLTkzMWYtODMxYWZjOTM5NDBhOnInLFxuICAgICAgICAnSG9yc3QgTcO8bGxlcjpydycsXG4gICAgICAgICcwMjZmMzU4OS1kODQ2LTQ3MTEtYTZhOC00NjFhZWM1OTdhNmU6cncnXG4gICAgICBdLFxuICAgICAgJ25hbWUnOiAnaC5tdWVsbGVyJyxcbiAgICAgICdnaXZlbk5hbWUnOiAnSG9yc3QnLFxuICAgICAgJ3N1cm5hbWUnOiAnTcO8bGxlcicsXG4gICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxuICAgICAgJ2VtYWlsJzogJ2gubXVlbGxlckByZWx1dGlvbi5pbycsXG4gICAgICAnbGFzdExvZ2dlZFRpbWUnOiAxNDY3MjgyMjI2MjQ0LFxuICAgICAgJ3Bhc3N3b3JkRXhwaXJlcyc6IDE0NzcwNjY3MDQwMDAsXG4gICAgICAnbG9ja2VkJzogZmFsc2UsXG4gICAgICAnYWN0aXZhdGVkJzogdHJ1ZSxcbiAgICAgICdlZmZlY3RpdmVQZXJtaXNzaW9ucyc6ICcqJyxcbiAgICAgICdzeXNSb2xlcyc6IFtdLFxuICAgICAgJ3JvbGVzJzogWyd1c2VycyddLFxuICAgICAgJ3JlYWRvbmx5JzogdHJ1ZSxcbiAgICAgICdyb2xlc09iamVjdHMnOiBbe1xuICAgICAgICAndXVpZCc6ICd1c2VycycsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ25hbWUnOiAndXNlcnMnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiBmYWxzZVxuICAgICAgfVxuICAgICAgXVxuICAgIH0sXG4gICAgJ29yZ2FuaXphdGlvbic6IHtcbiAgICAgICd1dWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXG4gICAgICAnYWNsRW50cmllcyc6IFtcbiAgICAgICAgJ2NmYmIyMmM1LWM3MDgtNDcxMS05MzFmLTgzMWFmYzkzOTQwYTpyJyxcbiAgICAgICAgJzgwZmRlODYxLTg5ODYtNDcxMS05NDJhLTEyZmI1Yjk3NTQxZDpydycsXG4gICAgICAgICdhYjQ3MGQwZS1kNDg0LTQ3MTEtYjFlZi05ODA5NWQxZTZiZTk6cidcbiAgICAgIF0sXG4gICAgICAnbmFtZSc6ICdzYW1wbGUnLFxuICAgICAgJ3VuaXF1ZU5hbWUnOiAnc2FtcGxlJyxcbiAgICAgICdhZGRyZXNzJzoge1xuICAgICAgICAnYWRkcmVzcyc6ICdBQkMgNDcxMScsXG4gICAgICAgICdwb3N0YWxDb2RlJzogJzAxMjM0JyxcbiAgICAgICAgJ2NpdHknOiAnSW4gdGhlJyxcbiAgICAgICAgJ2NvdW50cnknOiAnTWlkZGxlIG9mIE5vd2hlcmUnXG4gICAgICB9LFxuICAgICAgJ2JpbGxpbmdTZXR0aW5ncyc6IHtcbiAgICAgICAgJ2JpbGxpbmdBZGRyZXNzJzoge1xuICAgICAgICAgICdhZGRyZXNzJzogJ0xlaXR6c3RyLiA0NScsXG4gICAgICAgICAgJ3Bvc3RhbENvZGUnOiAnNzA0NzknLFxuICAgICAgICAgICdjaXR5JzogJ1N0dXR0Z2FydCcsXG4gICAgICAgICAgJ2NvdW50cnknOiAnR2VybWFueSdcbiAgICAgICAgfSwgJ2JpbGxpbmdQZXJzb24nOiB7fSwgJ2N1cnJlbmN5JzogJ0VVUidcbiAgICAgIH0sXG4gICAgICAncGFzc3dvcmRQb2xpY3knOiB7XG4gICAgICAgICdhbGxvd1NpbXBsZVBhc3N3b3JkJzogZmFsc2UsXG4gICAgICAgICdtaW5pbXVtUGFzc3dvcmRMZW5ndGgnOiA4LFxuICAgICAgICAnbWluaW11bU51bWJlcnNPZkxvd2VyQ2FzZUxldHRlcnMnOiAwLFxuICAgICAgICAnbWluaW11bU51bWJlcnNPZlVwcGVyQ2FzZUxldHRlcnMnOiAwLFxuICAgICAgICAnbWluaW11bU51bWJlcnNPZkRpZ2l0cyc6IDAsXG4gICAgICAgICdyZXF1aXJlZE51bWJlcnNPZlN5bWJvbHMnOiAwLFxuICAgICAgICAnbWF4aW11bVBhc3N3b3JkQWdlJzogMFxuICAgICAgfSxcbiAgICAgICd0ZWNobmljYWxQZXJzb24nOiB7fSxcbiAgICAgICd1cmwnOiAnaHR0cDovL3d3dy5yZWx1dGlvbi5pby8nLFxuICAgICAgJ2Fzc2V0UGF0aCc6ICcvb3JnYW5pemF0aW9ucy9taW5lJyxcbiAgICAgICdyZXBvcnRMb2NhbGVTdHJpbmcnOiAnZGVfREUnLFxuICAgICAgJ3ZlcnNpb24nOiAzLFxuICAgICAgJ2VmZmVjdGl2ZVBlcm1pc3Npb25zJzogJyonLFxuICAgICAgJ3Byb3BlcnR5TWFwJzoge30sXG4gICAgICAnZGVmYXVsdFJvbGVzJzogWydjZmJiMjJjNS1jNzA4LTQ3MTEtOTMxZi04MzFhZmM5Mzk0MGEnXVxuICAgIH0sXG4gICAgJ3JvbGVzJzogLyp7XG4gICAgICAncm9sZXMnOiovIFt7XG4gICAgICAgICd1dWlkJzogJzkwNWY1ZTExLTJhMmItNDcxMS1iODJhLWUzZjQ0M2MzMDczYicsXG4gICAgICAgICduYW1lJzogJ0RldmVsb3BlcicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJzk4YzM1NWNjLTIyNGUtNDcxMS04ZjQxLThlZGI0Y2YzODU4NicsXG4gICAgICAgICduYW1lJzogJ0FwcHN0b3JlIFVzZXInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX0dST1VQJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiBmYWxzZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdBUFBMSUNBVElPTl9DUkVBVE9SJyxcbiAgICAgICAgJ25hbWUnOiAnQVBQTElDQVRJT05fQ1JFQVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdBUFBMSUNBVElPTl9FRElUT1InLFxuICAgICAgICAnbmFtZSc6ICdBUFBMSUNBVElPTl9FRElUT1InLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnQVBQTElDQVRJT05fVVNFUicsXG4gICAgICAgICduYW1lJzogJ0FQUExJQ0FUSU9OX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnQVBQU1RPUkVfVVNFUicsXG4gICAgICAgICduYW1lJzogJ0FQUFNUT1JFX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnQVBQX0NSRUFUT1InLFxuICAgICAgICAnbmFtZSc6ICdBUFBfQ1JFQVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdBUFBfUkVWSUVXRVInLFxuICAgICAgICAnbmFtZSc6ICdBUFBfUkVWSUVXRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnY2ZiYjIyYzUtYzcwOC00NzExLTkzMWYtODMxYWZjOTM5NDBhJyxcbiAgICAgICAgJ25hbWUnOiAnVXNlcicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ0NPTk5FQ1RJT05fQ1JFQVRPUicsXG4gICAgICAgICduYW1lJzogJ0NPTk5FQ1RJT05fQ1JFQVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdDT05ORUNUSU9OX0VESVRPUicsXG4gICAgICAgICduYW1lJzogJ0NPTk5FQ1RJT05fRURJVE9SJyxcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ0NPTk5FQ1RJT05fVVNFUicsXG4gICAgICAgICduYW1lJzogJ0NPTk5FQ1RJT05fVVNFUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdlMmRkYzBiMy05Njk2LTQ3MTEtYjM5ZC04N2E5YWMxYmEwNjYnLFxuICAgICAgICAnbmFtZSc6ICdEZXZpY2UgVXNlcicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ2ZmNGRjNDM0LTI1MTEtNDcxMS1hMzA5LTU0ZTFhMmU2YmE1MicsXG4gICAgICAgICduYW1lJzogJ0FwcCBSZXZpZXdlcicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fR1JPVVAnLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ0ZJTFRFUl9VU0VSJyxcbiAgICAgICAgJ25hbWUnOiAnRklMVEVSX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnR1JPVVBfVVNFUicsXG4gICAgICAgICduYW1lJzogJ0dST1VQX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnTE9HX1ZJRVdFUicsXG4gICAgICAgICduYW1lJzogJ0xPR19WSUVXRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnTURNX1VTRVInLFxuICAgICAgICAnbmFtZSc6ICdNRE1fVVNFUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdNRVRBTU9ERUxfQ1JFQVRPUicsXG4gICAgICAgICduYW1lJzogJ01FVEFNT0RFTF9DUkVBVE9SJyxcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ01FVEFNT0RFTF9FRElUT1InLFxuICAgICAgICAnbmFtZSc6ICdNRVRBTU9ERUxfRURJVE9SJyxcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ01FVEFNT0RFTF9VU0VSJyxcbiAgICAgICAgJ25hbWUnOiAnTUVUQU1PREVMX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnT1JHQU5JWkFUSU9OX1VTRVInLFxuICAgICAgICAnbmFtZSc6ICdPUkdBTklaQVRJT05fVVNFUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdQSVBFTElORV9DUkVBVE9SJyxcbiAgICAgICAgJ25hbWUnOiAnUElQRUxJTkVfQ1JFQVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdQSVBFTElORV9FRElUT1InLFxuICAgICAgICAnbmFtZSc6ICdQSVBFTElORV9FRElUT1InLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnUElQRUxJTkVfVVNFUicsXG4gICAgICAgICduYW1lJzogJ1BJUEVMSU5FX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnUFVTSF9TRVJWSUNFX0NSRUFUT1InLFxuICAgICAgICAnbmFtZSc6ICdQVVNIX1NFUlZJQ0VfQ1JFQVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdQVVNIX1NFUlZJQ0VfRURJVE9SJyxcbiAgICAgICAgJ25hbWUnOiAnUFVTSF9TRVJWSUNFX0VESVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdQVVNIX1NFUlZJQ0VfVVNFUicsXG4gICAgICAgICduYW1lJzogJ1BVU0hfU0VSVklDRV9VU0VSJyxcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ1NDSEVEVUxFRF9UQVNLX0NSRUFUT1InLFxuICAgICAgICAnbmFtZSc6ICdTQ0hFRFVMRURfVEFTS19DUkVBVE9SJyxcbiAgICAgICAgJ3R5cGUnOiAnR1JPVVAnLFxuICAgICAgICAnZ3JvdXBUeXBlJzogJ1NZU1RFTV9QRVJNSVNTSU9OJyxcbiAgICAgICAgJ3N5c3RlbVBlcm1pc3Npb24nOiB0cnVlXG4gICAgICB9LCB7XG4gICAgICAgICd1dWlkJzogJ1NDSEVEVUxFRF9UQVNLX0VESVRPUicsXG4gICAgICAgICduYW1lJzogJ1NDSEVEVUxFRF9UQVNLX0VESVRPUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdTQ0hFRFVMRURfVEFTS19VU0VSJyxcbiAgICAgICAgJ25hbWUnOiAnU0NIRURVTEVEX1RBU0tfVVNFUicsXG4gICAgICAgICd0eXBlJzogJ0dST1VQJyxcbiAgICAgICAgJ2dyb3VwVHlwZSc6ICdTWVNURU1fUEVSTUlTU0lPTicsXG4gICAgICAgICdzeXN0ZW1QZXJtaXNzaW9uJzogdHJ1ZVxuICAgICAgfSwge1xuICAgICAgICAndXVpZCc6ICdVU0VSX1VTRVInLFxuICAgICAgICAnbmFtZSc6ICdVU0VSX1VTRVInLFxuICAgICAgICAndHlwZSc6ICdHUk9VUCcsXG4gICAgICAgICdncm91cFR5cGUnOiAnU1lTVEVNX1BFUk1JU1NJT04nLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IHRydWVcbiAgICAgIH0sIHtcbiAgICAgICAgJ3V1aWQnOiAnSG9yc3QgTcO8bGxlcicsXG4gICAgICAgICduYW1lJzogJ2gubXVlbGxlcicsXG4gICAgICAgICd0eXBlJzogJ1VTRVInLFxuICAgICAgICAnc3lzdGVtUGVybWlzc2lvbic6IGZhbHNlXG4gICAgICB9XVxuICAgIC8qfSovLFxuICAgICdsaWNlbnNlSW5mb3MnOiB7XG4gICAgICAnbGljZW5zZU1vZGVsTmFtZSc6ICdFbnRlcnByaXNlJyxcbiAgICAgICdsaWNlbnNlSW5mb3MnOiB7XG4gICAgICAgICdQVUJMSUNfQVBQX0ZFQVRVUkUnOiB7XG4gICAgICAgICAgJ29yZ2FuaXphdGlvblV1aWQnOiAnYjhjZDVmODItZDg5NS00NzExLTgyMTAtNGVlODYwODFlZjVkJyxcbiAgICAgICAgICAncGVybWlzc2lvblV1aWQnOiAnUFVCTElDX0FQUF9GRUFUVVJFJyxcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxuICAgICAgICAgICdtZXRyaWMnOiAxMFxuICAgICAgICB9LFxuICAgICAgICAnVVNFUl9GRUFUVVJFJzoge1xuICAgICAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ1VTRVJfRkVBVFVSRScsXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcbiAgICAgICAgICAnbWV0cmljJzogMjk5XG4gICAgICAgIH0sXG4gICAgICAgICdHUk9VUF9GRUFUVVJFJzoge1xuICAgICAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ0dST1VQX0ZFQVRVUkUnLFxuICAgICAgICAgICdleHBpcmF0aW9uRGF0ZSc6IDE0Njc4ODYwMDcwMDAsXG4gICAgICAgICAgJ3ZhbGlkYXRpb25TdGF0ZSc6ICdWQUxJRCcsXG4gICAgICAgICAgJ21ldHJpYyc6IDIxMlxuICAgICAgICB9LFxuICAgICAgICAnTkFUSVZFX0FQUF9GRUFUVVJFJzoge1xuICAgICAgICAgICdvcmdhbml6YXRpb25VdWlkJzogJ2I4Y2Q1ZjgyLWQ4OTUtNDcxMS04MjEwLTRlZTg2MDgxZWY1ZCcsXG4gICAgICAgICAgJ3Blcm1pc3Npb25VdWlkJzogJ05BVElWRV9BUFBfRkVBVFVSRScsXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcbiAgICAgICAgICAnbWV0cmljJzogMjAzXG4gICAgICAgIH0sXG4gICAgICAgICdERVZJQ0VfRkVBVFVSRSc6IHtcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxuICAgICAgICAgICdwZXJtaXNzaW9uVXVpZCc6ICdERVZJQ0VfRkVBVFVSRScsXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcbiAgICAgICAgICAnbWV0cmljJzogNVxuICAgICAgICB9LFxuICAgICAgICAnV0VCQ0xJUF9BUFBfRkVBVFVSRSc6IHtcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxuICAgICAgICAgICdwZXJtaXNzaW9uVXVpZCc6ICdXRUJDTElQX0FQUF9GRUFUVVJFJyxcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxuICAgICAgICAgICdtZXRyaWMnOiA0XG4gICAgICAgIH0sXG4gICAgICAgICdTRUNVUkVfTUFJTF9HQVRFV0FZX0ZFQVRVUkUnOiB7XG4gICAgICAgICAgJ29yZ2FuaXphdGlvblV1aWQnOiAnYjhjZDVmODItZDg5NS00NzExLTgyMTAtNGVlODYwODFlZjVkJyxcbiAgICAgICAgICAncGVybWlzc2lvblV1aWQnOiAnU0VDVVJFX01BSUxfR0FURVdBWV9GRUFUVVJFJyxcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxuICAgICAgICAgICdtZXRyaWMnOiAxXG4gICAgICAgIH0sXG4gICAgICAgICdMREFQX0ZFQVRVUkUnOiB7XG4gICAgICAgICAgJ29yZ2FuaXphdGlvblV1aWQnOiAnYjhjZDVmODItZDg5NS00NzExLTgyMTAtNGVlODYwODFlZjVkJyxcbiAgICAgICAgICAncGVybWlzc2lvblV1aWQnOiAnTERBUF9GRUFUVVJFJyxcbiAgICAgICAgICAnZXhwaXJhdGlvbkRhdGUnOiAxNDY3ODg2MDA3MDAwLFxuICAgICAgICAgICd2YWxpZGF0aW9uU3RhdGUnOiAnVkFMSUQnLFxuICAgICAgICAgICdtZXRyaWMnOiAxXG4gICAgICAgIH0sXG4gICAgICAgICdSRUxVVElPTl9BUFBfRkVBVFVSRSc6IHtcbiAgICAgICAgICAnb3JnYW5pemF0aW9uVXVpZCc6ICdiOGNkNWY4Mi1kODk1LTQ3MTEtODIxMC00ZWU4NjA4MWVmNWQnLFxuICAgICAgICAgICdwZXJtaXNzaW9uVXVpZCc6ICdSRUxVVElPTl9BUFBfRkVBVFVSRScsXG4gICAgICAgICAgJ2V4cGlyYXRpb25EYXRlJzogMTQ2Nzg4NjAwNzAwMCxcbiAgICAgICAgICAndmFsaWRhdGlvblN0YXRlJzogJ1ZBTElEJyxcbiAgICAgICAgICAnbWV0cmljJzogOFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgKCkgPT4ge1xuICByZXR1cm4gW1xuXG4gICAgaXQoJ3BlcnNpc3RlbmNlIGNvcnJlY3QgcGFzc3dvcmQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBsb2dpblJlc3BvbnNlID0gbWFrZUxvZ2luUmVzcG9uc2UoKTtcbiAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0ge1xuICAgICAgICB1c2VyTmFtZTogbG9naW5SZXNwb25zZS51c2VyLm5hbWUsXG4gICAgICAgIHBhc3N3b3JkOiAndGVzdDEyMyMhJ1xuICAgICAgfTtcbiAgICAgIGNvbnN0IHNlcnZlck9wdGlvbnMgPSB7XG4gICAgICAgIHNlcnZlclVybDogJ2h0dHBzOi8vbGl2ZS5yZWx1dGlvbi5pby8nXG4gICAgICB9O1xuICAgICAgcmV0dXJuIG9mZmxpbmUuc3RvcmVPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMsIGxvZ2luUmVzcG9uc2UpLnRoZW4oXG4gICAgICAgIChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UpID0+IHtcbiAgICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHBhc3N0aHJvdWdoTG9naW5SZXNwb25zZSwgbG9naW5SZXNwb25zZSwgJ3Jlc3BvbnNlIHdhcyBub3QgYWx0ZXJlZCcpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICApLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gb2ZmbGluZS5mZXRjaE9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgc2VydmVyT3B0aW9ucyk7XG4gICAgICB9KS50aGVuKChmZXRjaGVkTG9naW5SZXNwb25zZSkgPT4ge1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKGZldGNoZWRMb2dpblJlc3BvbnNlLCBsb2dpblJlc3BvbnNlLCAncmVzcG9uc2Ugd2FzIGZldGNoZWQgY29ycmVjdGx5Jyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgfSksXG5cbiAgICBpdCgncGVyc2lzdGVuY2UgaW5jb3JyZWN0IHBhc3N3b3JkJywgKCkgPT4ge1xuICAgICAgY29uc3QgbG9naW5SZXNwb25zZSA9IG1ha2VMb2dpblJlc3BvbnNlKCk7XG4gICAgICBjb25zdCBjcmVkZW50aWFscyA9IHtcbiAgICAgICAgdXNlck5hbWU6IGxvZ2luUmVzcG9uc2UudXNlci5uYW1lLFxuICAgICAgICBwYXNzd29yZDogJ3Rlc3QxMjMjISdcbiAgICAgIH07XG4gICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwczovL2xpdmUucmVsdXRpb24uaW8vJ1xuICAgICAgfTtcbiAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zLCBsb2dpblJlc3BvbnNlKS50aGVuKFxuICAgICAgICAocGFzc3Rocm91Z2hMb2dpblJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UsIGxvZ2luUmVzcG9uc2UsICdyZXNwb25zZSB3YXMgbm90IGFsdGVyZWQnKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgKS50aGVuKCgpID0+IHtcbiAgICAgICAgY3JlZGVudGlhbHMucGFzc3dvcmQgPSAnVGVzdDEyMyMhJztcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpO1xuICAgICAgfSkudGhlbigoKTogYm9vbGVhbiA9PiB7XG4gICAgICAgIGFzc2VydChmYWxzZSwgJ2ZldGNoIHN1Y2NlZWRlZCBhbHRob3VnaCBwYXNzd29yZHMgZGlmZmVyIScpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25ldmVyIHJlYWNoZWQnKTtcbiAgICAgIH0sICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGV4cGVjdGVkIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ3BlcnNpc3RlbmNlIGNsZWFyIHN0b3JlJywgKCkgPT4ge1xuICAgICAgY29uc3QgbG9naW5SZXNwb25zZSA9IG1ha2VMb2dpblJlc3BvbnNlKCk7XG4gICAgICBjb25zdCBjcmVkZW50aWFscyA9IHtcbiAgICAgICAgdXNlck5hbWU6IGxvZ2luUmVzcG9uc2UudXNlci5uYW1lLFxuICAgICAgICBwYXNzd29yZDogJ3Rlc3QxMjMjISdcbiAgICAgIH07XG4gICAgICBjb25zdCBzZXJ2ZXJPcHRpb25zID0ge1xuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwczovL2xpdmUucmVsdXRpb24uaW8vJ1xuICAgICAgfTtcbiAgICAgIHJldHVybiBvZmZsaW5lLmNsZWFyT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zKS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpO1xuICAgICAgfSkudGhlbigoZGF0YSkgPT4ge1xuICAgICAgICBhc3NlcnQub2soIWRhdGEsICdub3cgdGhlcmUgaXMgbm8gZGF0YSB0byBmZXRjaCcpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gb2ZmbGluZS5zdG9yZU9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgc2VydmVyT3B0aW9ucywgbG9naW5SZXNwb25zZSk7XG4gICAgICB9KS50aGVuKChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UpID0+IHtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChwYXNzdGhyb3VnaExvZ2luUmVzcG9uc2UsIGxvZ2luUmVzcG9uc2UsICdyZXNwb25zZSB3YXMgbm90IGFsdGVyZWQnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIHNlcnZlck9wdGlvbnMpO1xuICAgICAgfSkudGhlbigoZmV0Y2hlZExvZ2luUmVzcG9uc2UpID0+IHtcbiAgICAgICAgYXNzZXJ0LmRlZXBFcXVhbChmZXRjaGVkTG9naW5SZXNwb25zZSwgbG9naW5SZXNwb25zZSwgJ25vdyB0aGVyZSBpcyBkYXRhIHRvIGZldGNoJyk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiBvZmZsaW5lLmNsZWFyT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBzZXJ2ZXJPcHRpb25zKTtcbiAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICByZXR1cm4gb2ZmbGluZS5mZXRjaE9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgc2VydmVyT3B0aW9ucyk7XG4gICAgICB9KS50aGVuKChkYXRhKSA9PiB7XG4gICAgICAgIGFzc2VydC5vayghZGF0YSwgJ2FnYWluIG5vIGRhdGEgdG8gZmV0Y2gnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9KTtcbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==