/**
 * @file security/Authorization.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
 * Copyright (c)
 * 2016
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
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