/*
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
/**
 * @module web
 */
/** */
"use strict";
var assert = require('assert');
var web = require('./index');
var offline = require('./offline');
var diag_1 = require('../core/diag');
var security = require('../security');
// connect to real server for testing purposes, used by all online tests
var TestServer = (function () {
    function TestServer() {
    }
    TestServer.prototype.resetProperty = function (key, value) {
        Object.defineProperty(this, key, {
            value: value
        });
        return value;
    };
    Object.defineProperty(TestServer.prototype, "serverUrl", {
        get: function () {
            return this.resetProperty('serverUrl', offline.localStorage().getItem('test.serverUrl') || 'http://localhost:8080');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestServer.prototype, "credentials", {
        get: function () {
            return this.resetProperty('credentials', {
                userName: offline.localStorage().getItem('test.userName') || 'relutionsdk',
                password: offline.localStorage().getItem('test.password') || 'relutionsdk123'
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestServer.prototype, "login", {
        get: function () {
            var _this = this;
            return this.resetProperty('login', web.login(this.credentials, {
                serverUrl: this.serverUrl
            }).catch(function (e) {
                e.message += ' (' + _this.credentials.userName + ' @ ' + _this.serverUrl + ')';
                throw e;
            }));
        },
        enumerable: true,
        configurable: true
    });
    return TestServer;
}());
exports.TestServer = TestServer;
exports.testServer = new TestServer();
describe(module.filename || __filename, function () {
    return [
        it('login/logout', function (done) {
            return web.login(exports.testServer.credentials, {
                serverUrl: exports.testServer.serverUrl
            }).then(function (loginResp) {
                // logged in
                assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                var user = security.getCurrentUser();
                assert(!!user);
                assert.equal(user.name, exports.testServer.credentials.userName);
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
            }).finally(function () {
                // forces relogin after test execution
                return delete exports.testServer.login;
            }).done(function (result) { return done(); }, function (error) { return done(error); });
        }),
        it('callback order', function (done) {
            var state = 0;
            return web.get({
                serverUrl: exports.testServer.serverUrl,
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