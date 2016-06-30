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
            'uuid': 'Thomas Beckmann',
            'version': 15,
            'provider': 'M-Way FreeIPA',
            'foreignKey': '02eab236-d4fc-11e3-a0db-525400d26f66',
            'aclEntries': [
                'bfbb22c5-c798-4885-931f-831afc93940a:r',
                'Thomas Beckmann:rw',
                '096f2587-d846-4faf-a5a8-461aec507a6e:rw'
            ],
            'name': 't.beckmann',
            'givenName': 'Thomas',
            'surname': 'Beckmann',
            'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
            'email': 't.beckmann@mwaysolutions.com',
            'lastLoggedTime': 1467282226244,
            'passwordExpires': 1477066704000,
            'locked': false,
            'activated': true,
            'effectivePermissions': '*',
            'sysRoles': [],
            'roles': ['products_de', 'gitlab', 'mway_devs', 'M-Way LDAP Users', 'ipausers'],
            'readonly': true,
            'rolesObjects': [{
                    'uuid': 'ipausers',
                    'type': 'GROUP',
                    'name': 'ipausers',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'M-Way LDAP Users',
                    'type': 'GROUP',
                    'name': 'M-Way LDAP Users',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'products_de',
                    'type': 'GROUP',
                    'name': 'products_de',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'mway_devs',
                    'type': 'GROUP',
                    'name': 'mway_devs',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'gitlab',
                    'type': 'GROUP',
                    'name': 'gitlab',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }
            ]
        },
        'organization': {
            'uuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
            'aclEntries': [
                'bfbb22c5-c798-4885-931f-831afc93940a:r',
                '80fde861-8986-498d-942a-12fb5b97541d:rw',
                'ab470d0e-d484-443d-b1ef-98095d1e6be9:r'
            ],
            'name': 'mway',
            'uniqueName': 'mway',
            'address': {
                'address': 'Leitzstr. 45',
                'postalCode': '70479',
                'city': 'Stuttgart',
                'country': 'Germany'
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
            'url': 'http://www.mwaysolutions.com/',
            'assetPath': '/organizations/mway',
            'reportLocaleString': 'de_DE',
            'version': 3,
            'effectivePermissions': '*',
            'propertyMap': {},
            'licenseOrganizationUuid': '695F64C1-C1CC-489E-BE75-5341B7DA66BC',
            'licenseModelUuid': '30E5CBB0-31EB-11E5-A2CB-0800200C9A66',
            'licenseModelName': 'Enterprise',
            'licenseSignature': 'MCwCFEdN4W8bH/T1Y5Gmxw/B7vXSze9wAhR3BqhqJEhDUPARNxuwMcsG73UfMg==',
            'licenseHandshakeDate': 1467281207000,
            'defaultRoles': ['bfbb22c5-c798-4885-931f-831afc93940a']
        },
        'roles': {
            'roles': [{
                    'uuid': '905f5e11-2a2b-41b2-b82a-e3f443c3073b',
                    'name': 'MWAY Developer',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': '98c355cc-224e-4353-8f41-8edb4cf38586',
                    'name': 'MWAY Appstore User',
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
                    'uuid': 'bfbb22c5-c798-4885-931f-831afc93940a',
                    'name': 'MWAY User',
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
                    'uuid': 'e2ddc0b3-9696-4545-b39d-87a9ac1ba066',
                    'name': 'MWAY Device User',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'ff4dc434-2511-4154-a309-54e1a2e6ba52',
                    'name': 'MWAY App Reviewer',
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
                    'uuid': 'messefrankfurt',
                    'name': 'messefrankfurt',
                    'type': 'GROUP',
                    'groupType': 'GROUP',
                    'systemPermission': false
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
                    'uuid': 'scm-bmw',
                    'name': 'scm-bmw',
                    'type': 'GROUP',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'scm-messefrankfurt',
                    'name': 'scm-messefrankfurt',
                    'type': 'GROUP',
                    'groupType': 'GROUP',
                    'systemPermission': false
                }, {
                    'uuid': 'USER_USER',
                    'name': 'USER_USER',
                    'type': 'GROUP',
                    'groupType': 'SYSTEM_PERMISSION',
                    'systemPermission': true
                }, {
                    'uuid': 'Thomas Beckmann',
                    'name': 't.beckmann',
                    'type': 'USER',
                    'systemPermission': false
                }, { 'uuid': 'mway_all', 'systemPermission': false }, {
                    'uuid': 'cd47d99c-18ac-441d-b254-e6811f31248a',
                    'systemPermission': false
                }, { 'uuid': 'scm-digi-zeiterfassung', 'systemPermission': false }, {
                    'uuid': 'nas-development',
                    'systemPermission': false
                }, { 'uuid': 'scm-hg2', 'systemPermission': false }, {
                    'uuid': 'products_de',
                    'systemPermission': false
                }, { 'uuid': 'scm-dekra-cmo', 'systemPermission': false }, {
                    'uuid': 'scm-mpa',
                    'systemPermission': false
                }, { 'uuid': 'nas-professional_services', 'systemPermission': false }, {
                    'uuid': 'scm-ssb',
                    'systemPermission': false
                }, { 'uuid': 'nas-marketing', 'systemPermission': false }, {
                    'uuid': 'scm-flinkster',
                    'systemPermission': false
                }, { 'uuid': 'scm-m3-vod', 'systemPermission': false }, {
                    'uuid': 'scm-mcap',
                    'systemPermission': false
                }, { 'uuid': 'scm-mtrust-app-center', 'systemPermission': false }, {
                    'uuid': 'scm-transbond',
                    'systemPermission': false
                }, { 'uuid': 'scm-automotive-prototypes', 'systemPermission': false }, {
                    'uuid': 'scm-schutzranzen',
                    'systemPermission': false
                }, { 'uuid': 'scm-westspiel', 'systemPermission': false }, {
                    'uuid': 'scm-dekra_geteiltergutachter',
                    'systemPermission': false
                }, { 'uuid': 'scm-openwallet', 'systemPermission': false }, {
                    'uuid': 'scm-messedd',
                    'systemPermission': false
                }, { 'uuid': 'M-Way LDAP Users', 'systemPermission': false }, {
                    'uuid': 'scm-mobilecrm',
                    'systemPermission': false
                }, { 'uuid': 'scm-t-banking', 'systemPermission': false }, {
                    'uuid': 'products',
                    'systemPermission': false
                }, { 'uuid': 'mway_devs', 'systemPermission': false }, {
                    'uuid': 'scm-dekra-ggp',
                    'systemPermission': false
                }, { 'uuid': 'scm-dekra-dpc2', 'systemPermission': false }, {
                    'uuid': 'scm-relution',
                    'systemPermission': false
                }, { 'uuid': 'nas-products', 'systemPermission': false }, {
                    'uuid': 'scm-android-lib',
                    'systemPermission': false
                }, { 'uuid': 'scm-endress_hauser', 'systemPermission': false }, {
                    'uuid': 'scm-bigbench',
                    'systemPermission': false
                }, { 'uuid': 'scm-bmw-nbt', 'systemPermission': false }, {
                    'uuid': 'ipausers',
                    'systemPermission': false
                }, { 'uuid': 'scm-devault', 'systemPermission': false }, {
                    'uuid': 'scm-panacoda',
                    'systemPermission': false
                }, { 'uuid': 'b6a1a50e-82de-4939-ab0b-2a99779bcbe1', 'systemPermission': false }, {
                    'uuid': 'scm-cupad',
                    'systemPermission': false
                }, { 'uuid': 'scm-get-neutral', 'systemPermission': false }, {
                    'uuid': 'scm-html5-framework-benchmark',
                    'systemPermission': false
                }, { 'uuid': 'scm-sew-eurodrive', 'systemPermission': false }, {
                    'uuid': 'scm-ios-passbook',
                    'systemPermission': false
                }, { 'uuid': 'scm-easybring', 'systemPermission': false }, {
                    'uuid': 'scm-mdm.io',
                    'systemPermission': false
                }, { 'uuid': 'nas-design', 'systemPermission': false }, {
                    'uuid': 'scm-mobileshop',
                    'systemPermission': false
                }, { 'uuid': 'scm-comparis', 'systemPermission': false }, {
                    'uuid': 'scm-suedkupfer',
                    'systemPermission': false
                }, { 'uuid': 'scm-point4more', 'systemPermission': false }, {
                    'uuid': 'scm-mac-tools',
                    'systemPermission': false
                }, { 'uuid': 'scm-bizerba', 'systemPermission': false }, {
                    'uuid': 'scm-auma',
                    'systemPermission': false
                }, { 'uuid': 'scm-confessio', 'systemPermission': false }, {
                    'uuid': 'scm-smartlimo',
                    'systemPermission': false
                }, { 'uuid': 'scm-meap', 'systemPermission': false }, {
                    'uuid': 'scm-reboard',
                    'systemPermission': false
                }, { 'uuid': 'scm-dekra-discovery', 'systemPermission': false }, {
                    'uuid': 'gitlab',
                    'systemPermission': false
                }, { 'uuid': 'scm-merck-enterprise', 'systemPermission': false }, {
                    'uuid': 'scm-oxdrive',
                    'systemPermission': false
                }, { 'uuid': 'scm-survey', 'systemPermission': false }, {
                    'uuid': 'scm-the-m-project',
                    'systemPermission': false
                }, { 'uuid': 'scm-m-way-internal', 'systemPermission': false }, {
                    'uuid': 'scm-spiralstudios',
                    'systemPermission': false
                }, { 'uuid': 'scm-merck', 'systemPermission': false }, {
                    'uuid': 'scm-catoo',
                    'systemPermission': false
                }, { 'uuid': 'scm-approval', 'systemPermission': false }, {
                    'uuid': 'scm-trainee',
                    'systemPermission': false
                }, { 'uuid': 'scm-bosch', 'systemPermission': false }, {
                    'uuid': 'a67a83bd-ec4a-4acd-860a-c5ce7113480d',
                    'systemPermission': false
                }, { 'uuid': 'scm-v3', 'systemPermission': false }, {
                    'uuid': 'scm-arc',
                    'systemPermission': false
                }, { 'uuid': 'scm-hildebrandt', 'systemPermission': false }, {
                    'uuid': 'scm-thesis',
                    'systemPermission': false
                }, { 'uuid': 'scm-hcm-workflow', 'systemPermission': false }, {
                    'uuid': 'scm-kdrs',
                    'systemPermission': false
                }, { 'uuid': 'scm-onventis', 'systemPermission': false }, {
                    'uuid': 'mway_de',
                    'systemPermission': false
                }, { 'uuid': 'scm-messeleipzig', 'systemPermission': false }, {
                    'uuid': 'scm-agero',
                    'systemPermission': false
                }, { 'uuid': 'scm-unitymediad-kabel-bw', 'systemPermission': false }, {
                    'uuid': 'scm-pdf-library',
                    'systemPermission': false
                }, { 'uuid': 'scm-workfield', 'systemPermission': false }, {
                    'uuid': 'scm-mycanteen',
                    'systemPermission': false
                }, { 'uuid': 'scm-dekra-software-distribution', 'systemPermission': false }, {
                    'uuid': 'scm-dragonfly',
                    'systemPermission': false
                }, { 'uuid': 'scm-tns', 'systemPermission': false }, {
                    'uuid': 'nas-automotive',
                    'systemPermission': false
                }, { 'uuid': 'scm-m-way-websites', 'systemPermission': false }]
        },
        'licenseInfos': {
            'licenseModelName': 'Enterprise',
            'licenseInfos': {
                'PUBLIC_APP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'PUBLIC_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 10
                },
                'USER_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'USER_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 299
                },
                'GROUP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'GROUP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 212
                },
                'NATIVE_APP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'NATIVE_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 203
                },
                'DEVICE_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'DEVICE_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 5
                },
                'WEBCLIP_APP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'WEBCLIP_APP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 4
                },
                'SECURE_MAIL_GATEWAY_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'SECURE_MAIL_GATEWAY_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 1
                },
                'LDAP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
                    'permissionUuid': 'LDAP_FEATURE',
                    'expirationDate': 1467886007000,
                    'validationState': 'VALID',
                    'metric': 1
                },
                'RELUTION_APP_FEATURE': {
                    'organizationUuid': 'b8cd6f82-d995-41df-8210-4ee86981ef5d',
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