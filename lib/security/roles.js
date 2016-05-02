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
//# sourceMappingURL=roles.js.map