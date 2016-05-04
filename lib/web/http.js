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
    jar: true,
    withCredentials: true
};
var requestWithDefaults = request.defaults(requestDefaults);
/**
 * drives an HTTP request against the Relution server.
 *
 * Behavior of this method is simplified from most HTTP/AJAX implementations:
 * - When the HTTP request succeeds the resulting promise resolves to the response body.
 * - In case of a network Error the promise resolves to an Error object providing `requestUrl`
 *   but neither `statusCode` nor `statusMessage`.
 * - In case of HTTP failure the resulting promise is rejected to an Error-like object carrying
 *   the properties `requestUrl`, `statusCode` and `statusMessage`.
 * - If the server responds a JSON, it is parsed and assumed to be an Error-like object. The object
 *   is augmented by the properties as defined above.
 * - Otherwise the body is stored as `message` of an Error object created. Again, the properties
 *   above are provided.
 * - Finally, in case of HTTP failure with the server not providing any response body, the Error
 *   `message` is set to the `statusMessage`.
 *
 * Thus, to differentiate network failures from server-side failures the `statusCode` of the Error
 * rejection is to being used. For deeper inspection provide an [[options.responseCallback]].
 *
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 */
function ajax(options) {
    var url = server.resolveUrl(options.url, options.serverUrl);
    var serverUrl = server.resolveUrl('/', url);
    var serverObj = server.Server.getInstance(serverUrl);
    if (!serverObj.sessionUserUuid && serverObj.credentials) {
        // not logged in
        var credentials_1 = serverObj.credentials;
        serverObj.credentials = null;
        return login(credentials_1, options).then(function () {
            diag.debug.assert(function () { return !!serverObj.sessionUserUuid; });
            diag.debug.assert(function () { return serverObj.credentials == credentials_1; });
            return ajax(options); // repeat after login
        });
    }
    var responseCallback = options.responseCallback || _.identity;
    return Q.Promise(function (resolveResult, rejectResult) {
        var promiseResponse = responseCallback(Q.Promise(function (resolveResponse, rejectResponse) {
            diag.debug.debug(options.method + ' ' + url);
            requestWithDefaults(url, options, function (error, response, body) {
                // error processing
                if (!error && response) {
                    if (response.statusCode >= 400) {
                        if (!body) {
                            error = new Error(response.statusMessage);
                        }
                        else if (_.isString(body)) {
                            error = new Error(body);
                        }
                        else {
                            error = body;
                        }
                    }
                }
                if (error) {
                    error.requestUrl = url;
                    if (response) {
                        error.statusCode = response.statusCode;
                        error.statusMessage = response.statusMessage;
                    }
                }
                // logon session processing
                if (response) {
                    var sessionUserUuid = response.headers['x-gofer-user'];
                    if (sessionUserUuid) {
                        serverObj.sessionUserUuid = sessionUserUuid;
                    }
                    else if (response.statusCode === 401) {
                        // apparently our session is lost!
                        serverObj.sessionUserUuid = null;
                        diag.debug.assert(function () { return error; });
                        diag.debug.warn('server session is lost!', error);
                        if (serverObj.credentials) {
                        }
                    }
                }
                if (response) {
                    // transport response
                    // Notice, we might have an error object never the less here
                    resolveResponse(response);
                }
                else {
                    // network connectivity problem
                    diag.debug.assertIsError(error);
                    rejectResponse(error);
                }
                promiseResponse.then(function (responseResult) {
                    assert.equal(responseResult, response, 'definition of behavior in case of proxying the ' +
                        'original response is reserved for future extension!');
                    if (error) {
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
 * ```javascript
 * import * as Relution from 'relution-sdk';
 *
 * Relution.init({
 *    serverUrl: 'http://localhost:8080'
 * });
 *
 * let credentials: security.LoginObject = {
 *    userName: 'myusername',
 *    password: 'mypassword'
 * };
 * Relution.web.login(credentials).then(...);
 * ```
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
    var serverObj = server.Server.getInstance(serverUrl);
    if (serverObj.sessionUserUuid) {
        // logged in already
        return logout(loginOptions).then(function () {
            diag.debug.assert(function () { return !serverObj.sessionUserUuid; });
            return login(credentials, loginOptions); // repeat after logout
        });
    }
    return ajax(_.defaults({
        method: 'POST',
        url: url,
        body: credentials,
        serverUrl: serverUrl
    }, loginOptions)).then(function (response) {
        // switch current server
        if (!serverObj.sessionUserUuid) {
            diag.debug.warn('BUG: Relution did not set X-Gofer-User response header');
            serverObj.sessionUserUuid = response.user.uuid;
        }
        serverObj.authorization = {
            name: response.user.uuid,
            roles: _.map(response.roles.roles, function (role) { return role.uuid; })
        };
        serverObj.organization = response.organization;
        serverObj.user = response.user;
        serverObj.credentials = credentials;
        diag.debug.assert(function () { return serverObj.sessionUserUuid === serverObj.authorization.name; });
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
        method: 'POST',
        url: url,
        body: {},
        serverUrl: serverUrl
    }, logoutOptions)).catch(function (error) {
        // REST-based logout URL currently is broken reporting a 422 in all cases
        return ajax(_.defaults({
            method: 'GET',
            url: '/gofer/security-logout',
            serverUrl: serverUrl
        }, logoutOptions)).then(function (result) {
            diag.debug.warn('BUG: resorted to classic PATH-based logout as REST-based logout failed: ', error);
            return result;
        }, function (error2) {
            error.suppressed = error.suppressed || [];
            error.suppressed.push(error2);
            throw error;
        });
    }).finally(function () {
        var serverObj = server.Server.getInstance(serverUrl);
        serverObj.credentials = null;
        serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
        serverObj.organization = null;
        serverObj.user = null;
        serverObj.sessionUserUuid = null;
    });
}
exports.logout = logout;
//# sourceMappingURL=http.js.map