/**
 * @file web/http.ts
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
var Q = require('q');
var request = require('request');
var assert = require('assert');
var diag = require('../core/diag');
var auth = require('../security/auth');
var server = require('../security/server');
// require request.js to manage cookies for us
var requestDefaults = {
    json: true,
    jar: true
};
var requestWithDefaults = request.defaults(requestDefaults);
/**
 * drives an HTTP request against the Relution server.
 *
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `statusCode` and `statusMessage`.
 */
function ajax(options) {
    var url = server.resolveUrl(options.url, options.serverUrl);
    var responseCallback = options.responseCallback || _.identity;
    return Q.Promise(function (resolveResult, rejectResult) {
        var promiseResponse = responseCallback(Q.Promise(function (resolveResponse, rejectResponse) {
            diag.debug.debug(options.method + ' ' + url);
            requestWithDefaults(url, options, function (error, response, body) {
                resolveResponse(response);
                promiseResponse.then(function (responseResult) {
                    assert.equal(responseResult, response, 'definition of behavior in case of proxying the ' +
                        'original response is reserved for future extension!');
                    if (error) {
                        error.statusCode = responseResult.statusCode;
                        error.statusMessage = responseResult.statusMessage;
                        rejectResult(error);
                    }
                    else {
                        resolveResult(body);
                    }
                }, function (responseError) {
                    rejectResult(responseError);
                }).done();
            });
        }));
    });
}
exports.ajax = ajax;
;
;
/**
 * logs into a Relution server.
 *
 * @param credentials to use.
 * @param loginOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of login response.
 */
function login(credentials, loginOptions) {
    if (loginOptions === void 0) { loginOptions = {}; }
    var url = server.resolveUrl('/gofer/security/rest/auth/login', loginOptions.serverUrl);
    var serverUrl = server.resolveUrl('/', url);
    return ajax(_.defaults({
        url: url,
        method: 'POST',
        body: credentials,
        serverUrl: serverUrl
    }, loginOptions)).then(function (response) {
        // switch current server
        var serverObj = server.Server.getInstance(serverUrl);
        serverObj.authorization = {
            name: response.user.uuid,
            roles: _.map(response.roles.roles, function (role) { return role.uuid; })
        };
        serverObj.organization = response.organization;
        serverObj.user = response.user;
        serverObj.credentials = credentials;
        server.setCurrentServer(serverObj);
        return response;
    });
}
exports.login = login;
;
/**
 * logs out of a Relution server.
 *
 * @param logoutOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of logout response.
 */
function logout(logoutOptions) {
    if (logoutOptions === void 0) { logoutOptions = {}; }
    var url = server.resolveUrl('/gofer/security/rest/auth/logout');
    var serverUrl = server.resolveUrl('/', url);
    return ajax(_.defaults({
        url: url,
        method: 'POST',
        body: {},
        serverUrl: serverUrl
    }, logoutOptions)).finally(function () {
        var serverObj = server.Server.getInstance(serverUrl);
        serverObj.credentials = null;
        serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
        serverObj.organization = null;
        serverObj.user = null;
    });
}
exports.logout = logout;
//# sourceMappingURL=http.js.map