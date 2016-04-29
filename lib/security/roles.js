/**
 * @file security/roles.ts
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
var domain = require('../core/domain');
/**
 * turns the object deeply immutable.
 *
 * @param organization to freeze.
 * @return {Organization} organization for convenience.
 *
 * @internal for library use only.
 */
function freezeOrganization(organization) {
    if (organization.propertyMap) {
        organization.propertyMap = Object.freeze(organization.propertyMap);
    }
    return domain.freeze(organization);
}
exports.freezeOrganization = freezeOrganization;
/**
 * storage of [[Organization]] in effect.
 *
 * Uses null instead of {} for empty value so you can test using if statement via cohersion to
 * boolean.
 *
 * @type {Organization} in effect, may be null.
 */
var currentOrganization = null;
/**
 * gets the [[currentOrganization]] in effect.
 *
 * @param fields of interest.
 * @return {Organization} in effect, may be null.
 */
function getCurrentOrganization() {
    var fields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i - 0] = arguments[_i];
    }
    return currentOrganization;
}
exports.getCurrentOrganization = getCurrentOrganization;
/**
 * sets the [[currentOrganization]].
 *
 * @param organization to set.
 *
 * @internal for library use only!
 */
function setCurrentOrganization(organization) {
    if (organization) {
        currentOrganization = freezeOrganization(organization);
    }
    else {
        currentOrganization = null;
    }
}
exports.setCurrentOrganization = setCurrentOrganization;
/**
 * turns the object deeply immutable.
 *
 * @param user to freeze.
 * @return {User} user for convenience.
 *
 * @internal for library use only.
 */
function freezeUser(user) {
    if (user.lastLoggedTime) {
        user.lastLoggedTime = Object.freeze(new Date(+user.lastLoggedTime));
    }
    if (user.passwordExpires) {
        user.passwordExpires = Object.freeze(new Date(+user.passwordExpires));
    }
    if (user.confirmationTokenValidTo) {
        user.confirmationTokenValidTo = Object.freeze(new Date(+user.confirmationTokenValidTo));
    }
    if (user.preferences) {
        user.preferences = Object.freeze(user.preferences);
    }
    return domain.freeze(user);
}
exports.freezeUser = freezeUser;
/**
 * storage of [[User]] in effect.
 *
 * Uses null instead of {} for empty value so you can test using if statement via cohersion to
 * boolean.
 *
 * @type {User} in effect, may be null.
 */
var currentUser = null;
/**
 * gets the [[currentUser]] in effect.
 *
 * @param fields of interest.
 *
 * @return {User} in effect, may be null.
 */
function getCurrentUser() {
    var fields = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fields[_i - 0] = arguments[_i];
    }
    return currentUser;
}
exports.getCurrentUser = getCurrentUser;
/**
 * sets the [[currentUser]].
 *
 * @param user to set.
 *
 * @internal for library use only!
 */
function setCurrentUser(user) {
    if (user) {
        currentUser = freezeUser(user);
    }
    else {
        currentUser = null;
    }
}
exports.setCurrentUser = setCurrentUser;
//# sourceMappingURL=roles.js.map