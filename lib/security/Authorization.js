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
var _ = require('lodash');
var assert = require('assert');
;
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
    return Object.freeze(this);
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
/**
 * explicit class allowing to provide additional management capability.
 *
 * @internal intended for library extensibility only.
 */
var AuthorizationImpl = (function () {
    /**
     * @internal overloaded constructor.
     */
    function AuthorizationImpl(jsonOrName) {
        var roles = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            roles[_i - 1] = arguments[_i];
        }
        this.authorization = {
            name: exports.ANONYMOUS_AUTHORIZATION.name,
            roles: exports.ANONYMOUS_AUTHORIZATION.roles
        };
        var authorization = this.authorization;
        authorization.roles = roles; // never null thanks to TypeScript
        if (_.isString(jsonOrName)) {
            authorization.name = jsonOrName;
        }
        else if (jsonOrName) {
            _.assign(authorization, jsonOrName);
            assert.equal(roles.length, 0, 'roles argument can not be used with json');
            assert(_.isArray(authorization.roles), 'roles literal must be an array');
        }
        this.authorization = freezeAuthorization(authorization);
    }
    /**
     * when stringifying all management data must be erased!
     *
     * @return {{name: string, roles: string[]}} minimal information only.
     */
    AuthorizationImpl.prototype.toJSON = function () {
        return this.authorization;
    };
    return AuthorizationImpl;
}());
/**
 * storage of [[Authorization]] in effect.
 *
 * @type {Authorization} in effect, never null.
 */
var currentAuthorization = new AuthorizationImpl(null);
/**
 * gets the [[currentAuthorization]] in effect.
 *
 * @return {Authorization} in effect, never null.
 */
function getCurrentAuthorization() {
    return currentAuthorization.toJSON();
}
exports.getCurrentAuthorization = getCurrentAuthorization;
/**
 * sets the [[currentAuthorization]].
 *
 * @param authorization to set.
 *
 * @internal for library use only!
 */
function setCurrentAuthorization(authorization) {
    if (authorization instanceof AuthorizationImpl) {
        currentAuthorization = authorization;
    }
    else {
        currentAuthorization = new AuthorizationImpl(authorization);
    }
}
exports.setCurrentAuthorization = setCurrentAuthorization;
//# sourceMappingURL=Authorization.js.map