/*
 * @file security/Authorization.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
 * @module security
 */
/** */
"use strict";
;
function cloneCredentials(credentials) {
    return JSON.parse(JSON.stringify(credentials));
}
exports.cloneCredentials = cloneCredentials;
function freezeCredentials(credentials) {
    return Object.freeze(credentials);
}
exports.freezeCredentials = freezeCredentials;
/**
 * turns the object deeply immutable.
 *
 * @param authorization to freeze.
 * @return {Authorization} authorization for convenience.
 *
 * @internal for library use only.
 */
function freezeAuthorization(authorization) {
    authorization.roles = Object.freeze(authorization.roles);
    return Object.freeze(authorization);
}
exports.freezeAuthorization = freezeAuthorization;
/**
 * Virtual role for all authenticated users.
 */
exports.ROLE_AUTHENTICATED = 'user.authenticated';
/**
 * Administrator's role name. Users in this role should have full access to
 * all services in the system.
 */
exports.ROLE_ADMIN = 'ADMIN';
/**
 * The name of the predefined role, user.anyone, that all users and groups
 * belong to.
 */
exports.USER_ANYONE = 'user.anyone';
/**
 * immutable [[Authorization]] representing the anonymous user.
 *
 * @type {Authorization}
 */
exports.ANONYMOUS_AUTHORIZATION = freezeAuthorization({
    name: void 0,
    roles: [
        exports.USER_ANYONE
    ]
});
//# sourceMappingURL=auth.js.map