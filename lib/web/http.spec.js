/**
 * @file web/http.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 02.05.2016
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
"use strict";
var assert = require('assert');
var web = require('./index');
var diag_1 = require('../core/diag');
var security = require('../security');
var credentials = {
    userName: 't.beckmann',
    password: 'mcap'
};
describe(module.filename || __filename, function () {
    return [
        it('login/logout', function (done) {
            return web.login(credentials, {
                serverUrl: 'http://localhost:8080'
            }).then(function (loginResp) {
                // logged in
                assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                var user = security.getCurrentUser();
                assert(!!user);
                assert.equal(user.name, credentials.userName);
                return web.get('/gofer/system/security/currentAuthorization').then(function (currentAuthResp) {
                    assert.equal(currentAuthResp.user.uuid, loginResp.user.uuid);
                    assert.equal(currentAuthResp.organization.uuid, loginResp.organization.uuid);
                    return currentAuthResp;
                }).finally(function () { return web.logout(); }).then(function (response) {
                    // logged out again
                    assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                    assert(!security.getCurrentUser());
                    return response;
                });
            }).done(function (result) { return done(); }, function (error) { return done(error); });
        }),
        it('callback order', function (done) {
            assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
            var state = 0;
            return web.get({
                serverUrl: 'http://localhost:8080',
                url: '/gofer/system/security/currentAuthorization',
                requestCallback: function (request) {
                    diag_1.debug.debug('request callback fired.');
                    assert.equal(state++, 0, 'request must be reported firstly');
                    return request;
                },
                responseCallback: function (response) {
                    diag_1.debug.debug('response callback fired.');
                    assert.equal(state++, 1, 'response must be reported after request');
                    return response;
                },
            }).then(function (result) {
                diag_1.debug.debug('body data fired.');
                assert.equal(state++, 2, 'body data must be reported lastly');
                return result;
            }).done(function (result) { return done(); }, function (error) { return done(error); });
        })
    ];
});
//# sourceMappingURL=http.spec.js.map