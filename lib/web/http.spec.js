/**
 * @file web/http.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 02.05.2016
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
var assert = require('assert');
var http = require('./http');
var security = require('../security');
var credentials = {
    userName: 't.beckmann',
    password: 'mcap'
};
describe(module.filename, function () {
    return it('login/logout', function (done) {
        return http.login(credentials, {
            serverUrl: 'http://localhost:8080'
        }).then(function (loginResp) {
            // logged in
            assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
            var user = security.getCurrentUser();
            assert(!!user);
            assert.equal(user.name, credentials.userName);
            return http.get('/gofer/system/security/currentAuthorization').then(function (currentAuthResp) {
                assert.equal(currentAuthResp.user.uuid, loginResp.user.uuid);
                assert.equal(currentAuthResp.organization.uuid, loginResp.organization.uuid);
                return currentAuthResp;
            }).finally(function () { return http.logout(); }).then(function (response) {
                // logged out again
                assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                assert(!security.getCurrentUser());
                return response;
            });
        }).done(function (result) { return done(); }, function (error) { return done(error); });
    });
});
//# sourceMappingURL=http.spec.js.map