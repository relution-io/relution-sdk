/*
 * @file web/http.ts
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
 * @module web
 */
/** */
"use strict";
var _ = require('lodash');
var Q = require('q');
var request = require('request');
var http = require('http');
var diag = require('../core/diag');
var init = require('../core/init');
var auth = require('../security/auth');
var server = require('../security/server');
var urls = require('./urls');
var offline = require('./offline');
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
 * - In case of a network Error the promise resolves to an HttpError object providing `requestUrl`
 *   but neither `statusCode` nor `statusMessage`.
 * - In case of HTTP failure the resulting promise is rejected to an HttpError-like object carrying
 *   the properties `requestUrl`, `statusCode` and `statusMessage`.
 * - If the server responds a JSON, it is parsed and assumed to be an HttpError-like object. The
 *   object is augmented by the properties as defined above.
 * - Otherwise the body is stored as `message` of an HttpError object created. Again, the properties
 *   above are provided.
 * - Finally, in case of HTTP failure with the server not providing any response body, the HttpError
 *   `message` is set to the `statusMessage`.
 *
 * Thus, to differentiate network failures from server-side failures the `statusCode` of the
 * HttpError rejection is to being used. For deeper inspection provide an
 * [[options.responseCallback]].
 *
 * ```javascript
 * Relution.init({
 *    serverUrl: 'http://localhost:8080',
 *    organization: 'myOrga'
 * });
 *
 * let httpOptions: HttpOptions = {method: 'GET', url: 'api/v1/posts'};
 *
 * //usage as Promise
 * Relution.web.ajax(httpOptions)
 *  .then((resp) => console.log('posts', resp);)
 *  .catch((e:Relution.web.HttpError) => console.error(e.message, e))
 *  .finally(() => console.log('loading complete!'));
 *
 * // as Observable
 * Observable.fromPromise(Relution.web.ajax(httpOptions)).subscribe(
 *  (resp: any) => console.log('posts', resp),
 *  (e:Relution.web.HttpError) => console.error(e.message, e);,
 *  () => console.log('loading complete!')
 * )
 * ```
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an HttpError object
 *    including `requestUrl`, `statusCode` and `statusMessage`.
 */
function ajax(options) {
    var serverUrl = urls.resolveServer(options.url, options);
    var serverObj = server.Server.getInstance(serverUrl);
    if (!serverObj.sessionUserUuid && serverObj.credentials) {
        // not logged in
        var credentials_1 = serverObj.credentials;
        serverObj.credentials = null;
        return login(credentials_1, {
            serverUrl: serverUrl
        }).then(function () {
            diag.debug.assert(function () { return !!serverObj.sessionUserUuid; });
            diag.debug.assert(function () { return serverObj.credentials == credentials_1; });
            return ajax(options); // repeat after login
        });
    }
    // process options
    var currentOptions = serverObj.applyOptions({
        serverUrl: serverUrl,
        agentOptions: options.agentOptions || init.initOptions.agentOptions,
        agentClass: options.agentClass || init.initOptions.agentClass,
        // options taking effect at request time
        application: options.application || init.initOptions.application,
        tenantOrga: options.tenantOrga || init.initOptions.tenantOrga
    });
    // resolve target url
    var url = urls.resolveUrl(options.url, currentOptions);
    diag.debug.debug(options.method + ' ' + url);
    diag.debug.assert(function () { return url.substr(0, serverUrl.length) === serverUrl; });
    var requestCallback = options.requestCallback || _.identity;
    var responseCallback = options.responseCallback || _.identity;
    options = _.clone(options);
    options.agentOptions = currentOptions.agentOptions;
    options.agentClass = currentOptions.agentClass;
    var headers = {};
    if (serverObj.sessionUserUuid) {
        // add X-Gofer-User header so that server may check we are running under correct identity
        headers['X-Gofer-User'] = serverObj.sessionUserUuid;
    }
    if (currentOptions.clientApp) {
        // add X-Relution-ClientApp for server-side analytics
        headers['X-Relution-ClientApp'] = currentOptions.clientApp;
    }
    if (!_.isEmpty(headers)) {
        options.headers = _.defaults(headers, options.headers);
    }
    return Q.Promise(function (resolveResult, rejectResult) {
        var promiseResponse = Q.Promise(function (resolveResponse, rejectResponse) {
            var resp;
            var req;
            try {
                if (options.clientCertificate) {
                    // apply certificate options
                    _.extend(options, options.clientCertificate);
                }
                req = requestWithDefaults(url, options, function (error, response, body) {
                    if (response === void 0) { response = resp; }
                    // node.js assigns status string as body for status codes not having body data
                    if (response && response.statusCode === 202) {
                        diag.debug.assert(body === http.STATUS_CODES[202], body);
                        body = undefined; // resolves promise to undefined below
                    }
                    // error processing
                    if (!error && response && response.statusCode >= 400) {
                        if (_.isError(body)) {
                            // correct but practically impossible
                            error = body;
                        }
                        else if (_.isString(body)) {
                            // use plain-text as Error message
                            error = new Error(body);
                        }
                        else if (_.isObjectLike(body)) {
                            // body is object representation of server-side error or exception,
                            // converting to true Error object here
                            error = new Error(response.statusMessage);
                            diag.debug.assert(function () { return !_.isArray(body); }, 'kicks in for array responses as well, not sure if this is desirable');
                            _.extend(error, body);
                        }
                        else {
                            // handles numbers, booleans, etc. assigning as cause of failure
                            error = new Error(response.statusMessage);
                            if (!_.isUndefined(body)) {
                                error.cause = body;
                            }
                        }
                    }
                    if (error) {
                        // completes HttpError construction
                        diag.debug.assertIsError(error, 'should operate true Error instances');
                        error.requestUrl = url;
                        if (response) {
                            error.statusCode = response.statusCode;
                            error.statusMessage = response.statusMessage;
                            Object.defineProperty(error, 'rawResponse', {
                                value: response,
                                enumerable: false
                            });
                        }
                        Object.defineProperty(error, 'rawRequest', {
                            value: req,
                            enumerable: false
                        });
                    }
                    if (!response) {
                        // network connectivity problem
                        diag.debug.assertIsError(error);
                        if (promiseResponse) {
                            rejectResponse(error); // will also rejectResult(error)
                        }
                        else {
                            rejectResult(error); // promiseResponse not constructed yet
                        }
                    }
                    else if (response.statusCode === 503 || response.statusCode === 500 &&
                        error.className === 'java.util.concurrent.TimeoutException') {
                        // 503 (service unavailable) indicates the server is temporarily overloaded, and unable
                        // handling the request. This happens when async delegation timed out on the Java side,
                        // usually after about 2 minutes. In this case retry the request until we are done...
                        diag.debug.info('server overloaded, retrying request.');
                        // here promiseResponse must have been resolved already,
                        // we chain anyways because of error propagation
                        promiseResponse.thenResolve(ajax(options)).done(resolveResult, rejectResult);
                        return; // early exit as result is handled by done call above
                    }
                    else {
                        // logon session processing
                        var sessionUserUuid = resp.headers['x-gofer-user'];
                        if (sessionUserUuid) {
                            serverObj.sessionUserUuid = sessionUserUuid;
                        }
                        else if (response.statusCode === 401) {
                            // apparently our session is lost!
                            serverObj.sessionUserUuid = null;
                            diag.debug.assert(function () { return !!error; });
                            diag.debug.warn('server session is lost!', error);
                            var credentials = serverObj.credentials;
                            if (credentials) {
                                // recover by attempting login,
                                // here promiseResponse must have been resolved already,
                                // we chain anyways because of error propagation
                                serverObj.credentials = null;
                                promiseResponse.thenResolve(login(credentials, {
                                    serverUrl: serverUrl
                                }).then(function () {
                                    diag.debug.assert(function () { return !!serverObj.sessionUserUuid; });
                                    diag.debug.info('server session recovered.');
                                    return ajax(options);
                                })).done(resolveResult, rejectResult);
                                return; // early exit as result is handled by done call above
                            }
                        }
                    }
                    // completes the chain propagating results, must be skipped when request is retried above
                    if (promiseResponse) {
                        promiseResponse.then(function (responseResult) {
                            diag.debug.assert(function () { return responseResult === resp; }, 'definition of behavior in case ' +
                                'of proxying the original response is reserved for future extension!');
                            if (error) {
                                rejectResult(error);
                            }
                            else {
                                resolveResult(body);
                            }
                        }, function (responseError) {
                            rejectResult(responseError);
                        }).done();
                    }
                });
            }
            catch (error) {
                // path taken when request.js throws
                return rejectResult(error);
            }
            // transport response
            try {
                Q(requestCallback(req)).then(function (request) {
                    if (request === void 0) { request = req; }
                    request.on('response', function (response) {
                        if (!resp) {
                            resp = response;
                            resolveResponse(responseCallback(resp));
                        }
                    });
                    return request;
                }).done();
            }
            catch (error) {
                // path taken when requestCallback throws
                return rejectResponse(error);
            }
        });
    });
}
exports.ajax = ajax;
/**
 * logs into a Relution server.
 *
 * Notice, specifying `offlineCapable=true` in the options will store the login response locally on
 * the device when online and the login succeeded. When offline, the option will reuse the stored
 * response. Data encryption is used guaranteeing both secrecy of login data and verification of
 * the credentials provided.
 *
 * @param credentials to use.
 * @param loginOptions overwriting [[init]] defaults.
 * @return {Q.Promise<LoginResponse>} of login response.
 *
 * @example
 * ```javascript
 *
 * import * as Relution from 'relution-sdk';
 * //config
 * Relution.init({
 *    serverUrl: 'http://localhost:8080'
 * });
 *
 * let credentials = {
 *    userName: 'myusername',
 *    password: 'mypassword'
 * };
 *
 * //usage
 *
 * // Promise
 * Relution.web.login(credentials)
 *  .then((resp) => console.log('resp', resp);)
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('complete'));
 *
 * //Observable
 * Observable.fromPromise(Relution.web.login(credentials)).subscribe(
 *  (resp: any) => console.log('resp', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('complete')
 * )
 * ```
 */
function login(credentials, loginOptions) {
    if (loginOptions === void 0) { loginOptions = {}; }
    var wasOfflineLogin = false;
    var serverUrl = urls.resolveServer('/', loginOptions);
    var serverObj = server.Server.getInstance(serverUrl);
    if (serverObj.sessionUserUuid) {
        // logged in already
        return logout({
            serverUrl: serverUrl
        }).then(function () {
            diag.debug.assert(function () { return !serverObj.sessionUserUuid; });
            return login(credentials, loginOptions); // repeat after logout
        });
    }
    else if (serverObj.credentials) {
        // had credentials but no session, so we were logged in offline
        wasOfflineLogin = true;
    }
    // process options
    var currentOptions = serverObj.applyOptions({
        serverUrl: serverUrl,
        agentOptions: loginOptions.agentOptions || init.initOptions.agentOptions,
        agentClass: loginOptions.agentClass || init.initOptions.agentClass,
        // options taking effect at login time
        clientApp: loginOptions.clientApp || init.initOptions.clientApp,
        logonCallback: loginOptions.logonCallback || init.initOptions.logonCallback,
        clientCertificate: loginOptions.clientCertificate || init.initOptions.clientCertificate
    });
    var logonCallback = currentOptions.logonCallback || _.identity;
    return ajax(_.defaults({
        serverUrl: serverUrl,
        method: 'POST',
        url: '/gofer/security/rest/auth/login',
        body: credentials
    }, currentOptions)).then(function (response) {
        // real physical logon, ajax call sets sessionUserUuid
        if (!serverObj.sessionUserUuid) {
            diag.debug.warn('BUG: Relution did not set X-Gofer-User response header');
            serverObj.sessionUserUuid = response.user.uuid;
        }
        diag.debug.assert(function () { return serverObj.sessionUserUuid === response.user.uuid; });
        return response;
    }, function (error) {
        // offline login response
        if (!error.statusCode && loginOptions.offlineCapable) {
            // ajax timeout -> offline login attempt
            diag.debug.assert(function () { return !serverObj.sessionUserUuid; }, 'no physical login, as otherwise logonCallback would be executed');
            return offline.fetchOfflineLogin(credentials, currentOptions).then(function (loginResponse) {
                if (!loginResponse) {
                    // when there is no persistent data available, aka. this is the initial login attempt,
                    // keep saying the server is offline...
                    return Q.reject(error);
                }
                return loginResponse;
            }, function (offlineError) {
                // most likely the password entered was incorrect,
                // make sure the offlineError indicates the server is unavailable as well
                diag.debug.assert(function () { return !offlineError.statusCode; });
                diag.debug.assert(function () { return !offlineError.requestUrl; });
                offlineError.requestUrl = error.requestUrl;
                diag.debug.assert(function () { return !offlineError.cause; });
                offlineError.cause = error;
                // we rethrow the annotated error of decoding the stored response,
                // because the network error just indicates we are offline and does
                // not mention the credentials being incorrect as this one does...
                return Q.reject(offlineError);
            });
        }
        else if (error.statusCode && wasOfflineLogin) {
            // server side rejection, clear login data so that subsequent offline logins fail as well
            return offline.clearOfflineLogin(credentials, currentOptions).catch(function (offlineError) {
                // this is bad but we can not do much about it
                diag.debug.warn('failed erasing offline login data', offlineError);
                return Q.reject(error);
            });
        }
        return Q.reject(error);
    }).then(function (response) {
        // switch current server
        if ('roles' in response.roles) {
            // fixes a defect of Java implementation
            response.roles = response.roles['roles'];
        }
        serverObj.authorization = {
            name: response.user.uuid,
            roles: _.map(response.roles, function (role) { return role.uuid; })
        };
        serverObj.organization = response.organization;
        serverObj.user = response.user;
        serverObj.credentials = credentials;
        server.setCurrentServer(serverObj);
        return response;
    }).then(function (response) {
        // this is the earliest point at which library state reflects correct authorization, etc.
        // Thus, the logonCallback may execute here now, but only if we are online actually...
        if (!serverObj.sessionUserUuid) {
            return response; // offline
        }
        // we have a session logged into this user
        diag.debug.assert(function () { return serverObj.sessionUserUuid === server.getCurrentAuthorization().name; });
        // run logonCallback on response data and eventually store resultant object for offline login,
        // because this way the callback may add information to the response object that will also be
        // persisted and made available again when offline!
        return Q(logonCallback(response)).then(function (logonInfos) {
            if (logonInfos === void 0) { logonInfos = response; }
            if (logonInfos && logonInfos !== response) {
                // any data returned by the logonCallback may be stored here
                response.logonInfos = logonInfos;
            }
            // store offline login response
            if (loginOptions.offlineCapable || wasOfflineLogin) {
                // initial store or update of login data
                return offline.storeOfflineLogin(credentials, currentOptions, response).catch(function (offlineError) {
                    diag.debug.warn('offline login store failed', offlineError);
                    return response;
                });
            }
            return response;
        }, function (error) {
            // logon callback failed, must logout to avoid making ajax calls in an unknown backend state
            return logout({
                serverUrl: serverUrl
            }).catch(function (logoutError) {
                diag.debug.error('failed to logout after login failure', logoutError);
                return Q.reject(error);
            }).finally(function () {
                // logout processing must leave us with no user session
                diag.debug.assert(function () { return !serverObj.sessionUserUuid; });
            });
        });
    });
}
exports.login = login;
;
/**
 * logs out of a Relution server.
 *
 * For explicit logouts (trigger by app user pressing a logout button, for example) specifying
 * `offlineCapable = true` will drop any persisted offline login data for the server logging out
 * of.
 *
 * @param logoutOptions overwriting [[init]] defaults.
 * @return {Q.Promise<void>} of logout response.
 *
 * @example
 * ```javascript
 *
 * Relution.web.logout()
 *  .then((resp) => console.log('resp', resp);)
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('bye bye'));
 *
 * //Observable
 * Observable.fromPromise(Relution.web.logout()).subscribe(
 *  (resp: any) => console.log('resp', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('bye bye')
 * )
 * ```
 */
function logout(logoutOptions) {
    if (logoutOptions === void 0) { logoutOptions = {}; }
    var serverUrl = urls.resolveServer('/', logoutOptions);
    var serverObj = server.Server.getInstance(serverUrl);
    // process options
    var currentOptions = serverObj.applyOptions({
        serverUrl: serverUrl,
        agentOptions: logoutOptions.agentOptions || init.initOptions.agentOptions,
        agentClass: logoutOptions.agentClass || init.initOptions.agentClass,
    });
    return ajax(_.defaults({
        serverUrl: serverUrl,
        method: 'POST',
        url: '/gofer/security/rest/auth/logout',
        body: {}
    }, currentOptions)).catch(function (error) {
        if (error.statusCode === 422) {
            // REST-based logout URL currently is broken reporting a 422 in all cases
            return ajax(_.defaults({
                serverUrl: serverUrl,
                method: 'GET',
                url: '/gofer/security-logout'
            }, currentOptions)).then(function (result) {
                diag.debug.warn('BUG: resorted to classic PATH-based logout as REST-based logout failed:', error);
                return result;
            }, function (error2) {
                return Q.reject(error2.statusCode === 422 ? error : error2);
            });
        }
        return Q.reject(error);
    }).catch(function (error) {
        // ignore network failures on timeout, server forgets on session timeout anyways
        if (!error.statusCode) {
            return Q.resolve(undefined);
        }
        return Q.reject(error);
    }).finally(function () {
        // eventually erase offline login data
        if (logoutOptions.offlineCapable) {
            // requested to erase login data
            return offline.clearOfflineLogin(serverObj.credentials, currentOptions).catch(function (offlineError) {
                diag.debug.warn('failed erasing offline login data', offlineError);
                return Q.resolve(undefined);
            });
        }
    }).finally(function () {
        // forget everything about it
        serverObj.credentials = null;
        serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
        serverObj.organization = null;
        serverObj.user = null;
        serverObj.sessionUserUuid = null;
    });
}
exports.logout = logout;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLElBQVksSUFBSSxXQUFNLE1BQU0sQ0FBQyxDQUFBO0FBRTdCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBRXJDLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFekMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUVyQyw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNy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LENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHdlYi9odHRwLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgd2ViXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuXG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcblxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xuaW1wb3J0ICogYXMgaW5pdCBmcm9tICcuLi9jb3JlL2luaXQnO1xuaW1wb3J0ICogYXMgZG9tYWluIGZyb20gJy4uL2NvcmUvZG9tYWluJztcbmltcG9ydCAqIGFzIGF1dGggZnJvbSAnLi4vc2VjdXJpdHkvYXV0aCc7XG5pbXBvcnQgKiBhcyByb2xlcyBmcm9tICcuLi9zZWN1cml0eS9yb2xlcyc7XG5pbXBvcnQgKiBhcyBzZXJ2ZXIgZnJvbSAnLi4vc2VjdXJpdHkvc2VydmVyJztcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi91cmxzJztcbmltcG9ydCAqIGFzIG9mZmxpbmUgZnJvbSAnLi9vZmZsaW5lJztcblxuLy8gcmVxdWlyZSByZXF1ZXN0LmpzIHRvIG1hbmFnZSBjb29raWVzIGZvciB1c1xubGV0IHJlcXVlc3REZWZhdWx0cyA9IHtcbiAganNvbjogdHJ1ZSxcbiAgamFyOiB0cnVlLFxuICB3aXRoQ3JlZGVudGlhbHM6IHRydWVcbn07XG5sZXQgcmVxdWVzdFdpdGhEZWZhdWx0cyA9IHJlcXVlc3QuZGVmYXVsdHMocmVxdWVzdERlZmF1bHRzKTtcblxuLyoqXG4gKiBjYWxsYmFjayBhbGxvd2luZyBjdXN0b21pemluZyBhbiBvYmplY3Qgbm90IGltbWVkaWF0ZWx5IGF2YWlsYWJsZSBhdCB0aW1lIG9mIGNhbGwuXG4gKlxuICogQHBhcmFtIG9iamVjdCBmb3IgaW5zcGVjdGlvbiBvciBjdXN0b21pemF0aW9uLlxuICogQHJldHVybiBwcm9taXNlIG9yIG9iamVjdCBvbiBzYW1lIGRlZmVycmVkIG9iamVjdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwQ2FsbGJhY2s8VD4ge1xuICAodmFsdWU6IFQpOiBRLlByb21pc2U8VD4gfCBUO1xufVxuXG4vKipcbiAqIHR5cGUgcmVwcmVzZW50aW5nIGEgcmF3IHJlcXVlc3QuXG4gKi9cbmV4cG9ydCB0eXBlIEh0dHBSZXF1ZXN0ID0gcmVxdWVzdC5SZXF1ZXN0O1xuLyoqXG4gKiB0eXBlIHJlcHJlc2VudGluZyBhIHJhdyByZXNwb25zZS5cbiAqL1xuZXhwb3J0IHR5cGUgSHR0cFJlc3BvbnNlID0gaHR0cC5JbmNvbWluZ01lc3NhZ2U7XG5cbi8qKlxuICogbmFtZWQgcGFyYW1ldGVycyBvZiB0aGUgW1todHRwXV0gZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cE9wdGlvbnMgZXh0ZW5kcyByZXF1ZXN0LkNvcmVPcHRpb25zLCByZXF1ZXN0LlVybE9wdGlvbnMsXG4gICAgaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucyB7XG4gIC8qKlxuICAgKiBvcHRpb25hbCBjYWxsYmFjayBhbGxvd2luZyB0byBjdXN0b21pemUgdGhlIGNsaWVudCByZXF1ZXN0IGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcbiAgICogZGVmYXVsdC5cbiAgICovXG4gIHJlcXVlc3RDYWxsYmFjaz86IEh0dHBDYWxsYmFjazxIdHRwUmVxdWVzdD47XG4gIC8qKlxuICAgKiBvcHRpb25hbCBjYWxsYmFjayBhbGxvd2luZyB0byBpbnNwZWN0IHRoZSBzZXJ2ZXIgcmVzcG9uc2UgaW4gbW9yZSBkZXRhaWwgdGhhbiBwcm92aWRlZCBieVxuICAgKiBkZWZhdWx0LlxuICAgKi9cbiAgcmVzcG9uc2VDYWxsYmFjaz86IEh0dHBDYWxsYmFjazxIdHRwUmVzcG9uc2U+O1xufVxuXG4vKipcbiAqIGZhaWx1cmUgb2YgYW4gYWpheCByZXF1ZXN0LlxuICpcbiAqIFRoaXMgdHlwZSBjYW4gYmUgdXNlZCBhcyB0eXBlIGFubm90YXRpb24gb2YgdGhlIGVycm9yIHRoZSBQcm9taXNlIHJldHVybmVkIGJ5IGFqYXggaXMgcmVqZWN0ZWRcbiAqIHdpdGguXG4gKlxuICogQHNlZSBhamF4XG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cEVycm9yIGV4dGVuZHMgRXJyb3Ige1xuICAvKipcbiAgICogZnVsbHkgcmVzb2x2ZWQgdXJsIHRoZSByZXF1ZXN0IHdhcyBzZW50IHRvLlxuICAgKi9cbiAgcmVxdWVzdFVybD86IHN0cmluZztcblxuICAvKipcbiAgICogSFRUUCBzdGF0dXMgY29kZSBvZiBmYWlsdXJlLlxuICAgKi9cbiAgc3RhdHVzQ29kZT86IG51bWJlcjtcbiAgLyoqXG4gICAqIEhUVFAgc3RhdHVzIG1lc3NhZ2Ugb2YgZmFpbHVyZS5cbiAgICovXG4gIHN0YXR1c01lc3NhZ2U/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIGluIG1hbnkgY2FzZXMgdGhlIFJlbHV0aW9uIHNlcnZlciByZXBvcnRzIGhlcmUgdGhlIGZ1bGx5IHF1YWxpZmllZCBuYW1lIG9mIGEgSmF2YSBFeGNlcHRpb25cbiAgICogdGhhdCBtYXkgYmUgdXNlZCB0byBmdXJ0aGVyIGRpZmZlcmVudGlhdGUgdGhlIGVycm9yLlxuICAgKi9cbiAgY2xhc3NOYW1lPzogc3RyaW5nO1xuICAvKipcbiAgICogbWF5IGJlIHNldCB0byBzb21lIGFyYml0cmFyeSB2YWx1ZSBkZXNjcmliaW5nIHRoZSBjYXVzZSBvZiBmYWlsdXJlLCBtb3N0bHkgcHJlc2VudCB3aGVuXG4gICAqIHRyYW5zcG9ydGluZyBKYXZhIEV4Y2VwdGlvbiBvYmplY3RzLlxuICAgKi9cbiAgY2F1c2U/OiBhbnk7XG5cbiAgLyoqXG4gICAqIGRldGFpbHMgb2YgcmVxdWVzdCBmYWlsZWQuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBhbmQgdGh1cyBub3QgcGFydCBvZiB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZmFpbHVyZS5cbiAgICogSXQgaXMgcHJvdmlkZWQgZm9yIGluZm9ybWFsIHB1cnBvc2VzIGFzIGEgZGVidWdnaW5nIGFpZCBvbmx5LiBDbGllbnQgY29kZSBzaG91bGQgbm90IHJlbHkgb25cbiAgICogdGhpcyB2YWx1ZS5cbiAgICpcbiAgICogQHNlZSByZXNwb25zZVxuICAgKi9cbiAgcmF3UmVxdWVzdD86IEh0dHBSZXF1ZXN0O1xuICAvKipcbiAgICogZGV0YWlscyBvZiByZXNwb25zZSBmYWlsZWQuXG4gICAqXG4gICAqIFRoaXMgaXMgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBhbmQgdGh1cyBub3QgcGFydCBvZiB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZmFpbHVyZS5cbiAgICogSXQgaXMgcHJvdmlkZWQgZm9yIGluZm9ybWFsIHB1cnBvc2VzIGFzIGEgZGVidWdnaW5nIGFpZCBvbmx5LiBDbGllbnQgY29kZSBzaG91bGQgbm90IHJlbHkgb25cbiAgICogdGhpcyB2YWx1ZS5cbiAgICpcbiAgICogQHNlZSByZXF1ZXN0XG4gICAqL1xuICByYXdSZXNwb25zZT86IEh0dHBSZXNwb25zZTtcbn1cblxuLyoqXG4gKiBkcml2ZXMgYW4gSFRUUCByZXF1ZXN0IGFnYWluc3QgdGhlIFJlbHV0aW9uIHNlcnZlci5cbiAqXG4gKiBCZWhhdmlvciBvZiB0aGlzIG1ldGhvZCBpcyBzaW1wbGlmaWVkIGZyb20gbW9zdCBIVFRQL0FKQVggaW1wbGVtZW50YXRpb25zOlxuICogLSBXaGVuIHRoZSBIVFRQIHJlcXVlc3Qgc3VjY2VlZHMgdGhlIHJlc3VsdGluZyBwcm9taXNlIHJlc29sdmVzIHRvIHRoZSByZXNwb25zZSBib2R5LlxuICogLSBJbiBjYXNlIG9mIGEgbmV0d29yayBFcnJvciB0aGUgcHJvbWlzZSByZXNvbHZlcyB0byBhbiBIdHRwRXJyb3Igb2JqZWN0IHByb3ZpZGluZyBgcmVxdWVzdFVybGBcbiAqICAgYnV0IG5laXRoZXIgYHN0YXR1c0NvZGVgIG5vciBgc3RhdHVzTWVzc2FnZWAuXG4gKiAtIEluIGNhc2Ugb2YgSFRUUCBmYWlsdXJlIHRoZSByZXN1bHRpbmcgcHJvbWlzZSBpcyByZWplY3RlZCB0byBhbiBIdHRwRXJyb3ItbGlrZSBvYmplY3QgY2FycnlpbmdcbiAqICAgdGhlIHByb3BlcnRpZXMgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqIC0gSWYgdGhlIHNlcnZlciByZXNwb25kcyBhIEpTT04sIGl0IGlzIHBhcnNlZCBhbmQgYXNzdW1lZCB0byBiZSBhbiBIdHRwRXJyb3ItbGlrZSBvYmplY3QuIFRoZVxuICogICBvYmplY3QgaXMgYXVnbWVudGVkIGJ5IHRoZSBwcm9wZXJ0aWVzIGFzIGRlZmluZWQgYWJvdmUuXG4gKiAtIE90aGVyd2lzZSB0aGUgYm9keSBpcyBzdG9yZWQgYXMgYG1lc3NhZ2VgIG9mIGFuIEh0dHBFcnJvciBvYmplY3QgY3JlYXRlZC4gQWdhaW4sIHRoZSBwcm9wZXJ0aWVzXG4gKiAgIGFib3ZlIGFyZSBwcm92aWRlZC5cbiAqIC0gRmluYWxseSwgaW4gY2FzZSBvZiBIVFRQIGZhaWx1cmUgd2l0aCB0aGUgc2VydmVyIG5vdCBwcm92aWRpbmcgYW55IHJlc3BvbnNlIGJvZHksIHRoZSBIdHRwRXJyb3JcbiAqICAgYG1lc3NhZ2VgIGlzIHNldCB0byB0aGUgYHN0YXR1c01lc3NhZ2VgLlxuICpcbiAqIFRodXMsIHRvIGRpZmZlcmVudGlhdGUgbmV0d29yayBmYWlsdXJlcyBmcm9tIHNlcnZlci1zaWRlIGZhaWx1cmVzIHRoZSBgc3RhdHVzQ29kZWAgb2YgdGhlXG4gKiBIdHRwRXJyb3IgcmVqZWN0aW9uIGlzIHRvIGJlaW5nIHVzZWQuIEZvciBkZWVwZXIgaW5zcGVjdGlvbiBwcm92aWRlIGFuXG4gKiBbW29wdGlvbnMucmVzcG9uc2VDYWxsYmFja11dLlxuICpcbiAqIGBgYGphdmFzY3JpcHRcbiAqIFJlbHV0aW9uLmluaXQoe1xuICogICAgc2VydmVyVXJsOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJyxcbiAqICAgIG9yZ2FuaXphdGlvbjogJ215T3JnYSdcbiAqIH0pO1xuICpcbiAqIGxldCBodHRwT3B0aW9uczogSHR0cE9wdGlvbnMgPSB7bWV0aG9kOiAnR0VUJywgdXJsOiAnYXBpL3YxL3Bvc3RzJ307XG4gKlxuICogLy91c2FnZSBhcyBQcm9taXNlXG4gKiBSZWx1dGlvbi53ZWIuYWpheChodHRwT3B0aW9ucylcbiAqICAudGhlbigocmVzcCkgPT4gY29uc29sZS5sb2coJ3Bvc3RzJywgcmVzcCk7KVxuICogIC5jYXRjaCgoZTpSZWx1dGlvbi53ZWIuSHR0cEVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2xvYWRpbmcgY29tcGxldGUhJykpO1xuICpcbiAqIC8vIGFzIE9ic2VydmFibGVcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmFqYXgoaHR0cE9wdGlvbnMpKS5zdWJzY3JpYmUoXG4gKiAgKHJlc3A6IGFueSkgPT4gY29uc29sZS5sb2coJ3Bvc3RzJywgcmVzcCksXG4gKiAgKGU6UmVsdXRpb24ud2ViLkh0dHBFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnbG9hZGluZyBjb21wbGV0ZSEnKVxuICogKVxuICogYGBgXG4gKiBAcGFyYW0gb3B0aW9ucyBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLlxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBIdHRwRXJyb3Igb2JqZWN0XG4gKiAgICBpbmNsdWRpbmcgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFqYXg8VD4ob3B0aW9uczogSHR0cE9wdGlvbnMpOiBRLlByb21pc2U8VD4ge1xuICBsZXQgc2VydmVyVXJsID0gdXJscy5yZXNvbHZlU2VydmVyKG9wdGlvbnMudXJsLCBvcHRpb25zKTtcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkICYmIHNlcnZlck9iai5jcmVkZW50aWFscykge1xuICAgIC8vIG5vdCBsb2dnZWQgaW5cbiAgICBsZXQgY3JlZGVudGlhbHMgPSBzZXJ2ZXJPYmouY3JlZGVudGlhbHM7XG4gICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gbnVsbDtcbiAgICByZXR1cm4gbG9naW4oY3JlZGVudGlhbHMsIHtcbiAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLmNyZWRlbnRpYWxzID09IGNyZWRlbnRpYWxzKTtcbiAgICAgIHJldHVybiBhamF4PFQ+KG9wdGlvbnMpOyAvLyByZXBlYXQgYWZ0ZXIgbG9naW5cbiAgICB9KTtcbiAgfVxuXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xuICBsZXQgY3VycmVudE9wdGlvbnMgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBhZ2VudE9wdGlvbnM6IG9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxuICAgIGFnZW50Q2xhc3M6IG9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXG4gICAgLy8gb3B0aW9ucyB0YWtpbmcgZWZmZWN0IGF0IHJlcXVlc3QgdGltZVxuICAgIGFwcGxpY2F0aW9uOiBvcHRpb25zLmFwcGxpY2F0aW9uIHx8IGluaXQuaW5pdE9wdGlvbnMuYXBwbGljYXRpb24sXG4gICAgdGVuYW50T3JnYTogb3B0aW9ucy50ZW5hbnRPcmdhIHx8IGluaXQuaW5pdE9wdGlvbnMudGVuYW50T3JnYVxuICB9KTtcblxuICAvLyByZXNvbHZlIHRhcmdldCB1cmxcbiAgbGV0IHVybCA9IHVybHMucmVzb2x2ZVVybChvcHRpb25zLnVybCwgY3VycmVudE9wdGlvbnMpO1xuICBkaWFnLmRlYnVnLmRlYnVnKG9wdGlvbnMubWV0aG9kICsgJyAnICsgdXJsKTtcbiAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gdXJsLnN1YnN0cigwLCBzZXJ2ZXJVcmwubGVuZ3RoKSA9PT0gc2VydmVyVXJsKTtcblxuICBsZXQgcmVxdWVzdENhbGxiYWNrID0gb3B0aW9ucy5yZXF1ZXN0Q2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcbiAgbGV0IHJlc3BvbnNlQ2FsbGJhY2sgPSBvcHRpb25zLnJlc3BvbnNlQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcbiAgb3B0aW9ucyA9IF8uY2xvbmUob3B0aW9ucyk7XG4gIG9wdGlvbnMuYWdlbnRPcHRpb25zID0gY3VycmVudE9wdGlvbnMuYWdlbnRPcHRpb25zO1xuICBvcHRpb25zLmFnZW50Q2xhc3MgPSBjdXJyZW50T3B0aW9ucy5hZ2VudENsYXNzO1xuICBsZXQgaGVhZGVycyA9IHt9O1xuICBpZiAoc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xuICAgIC8vIGFkZCBYLUdvZmVyLVVzZXIgaGVhZGVyIHNvIHRoYXQgc2VydmVyIG1heSBjaGVjayB3ZSBhcmUgcnVubmluZyB1bmRlciBjb3JyZWN0IGlkZW50aXR5XG4gICAgaGVhZGVyc1snWC1Hb2Zlci1Vc2VyJ10gPSBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkO1xuICB9XG4gIGlmIChjdXJyZW50T3B0aW9ucy5jbGllbnRBcHApIHtcbiAgICAvLyBhZGQgWC1SZWx1dGlvbi1DbGllbnRBcHAgZm9yIHNlcnZlci1zaWRlIGFuYWx5dGljc1xuICAgIGhlYWRlcnNbJ1gtUmVsdXRpb24tQ2xpZW50QXBwJ10gPSBjdXJyZW50T3B0aW9ucy5jbGllbnRBcHA7XG4gIH1cbiAgaWYgKCFfLmlzRW1wdHkoaGVhZGVycykpIHtcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBfLmRlZmF1bHRzKGhlYWRlcnMsIG9wdGlvbnMuaGVhZGVycyk7XG4gIH1cbiAgcmV0dXJuIFEuUHJvbWlzZTxUPigocmVzb2x2ZVJlc3VsdCwgcmVqZWN0UmVzdWx0KSA9PiB7XG4gICAgbGV0IHByb21pc2VSZXNwb25zZSA9IFEuUHJvbWlzZSgocmVzb2x2ZVJlc3BvbnNlLCByZWplY3RSZXNwb25zZSkgPT4ge1xuICAgICAgbGV0IHJlc3A6IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xuICAgICAgbGV0IHJlcTogcmVxdWVzdC5SZXF1ZXN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpIHtcbiAgICAgICAgICAvLyBhcHBseSBjZXJ0aWZpY2F0ZSBvcHRpb25zXG4gICAgICAgICAgXy5leHRlbmQob3B0aW9ucywgb3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZSk7XG4gICAgICAgIH1cbiAgICAgICAgcmVxID0gcmVxdWVzdFdpdGhEZWZhdWx0cyh1cmwsIG9wdGlvbnMsIChlcnJvcjogSHR0cEVycm9yLCByZXNwb25zZSA9IHJlc3AsIGJvZHk/OiBhbnkpID0+IHtcbiAgICAgICAgICAvLyBub2RlLmpzIGFzc2lnbnMgc3RhdHVzIHN0cmluZyBhcyBib2R5IGZvciBzdGF0dXMgY29kZXMgbm90IGhhdmluZyBib2R5IGRhdGFcbiAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAyKSB7XG4gICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydChib2R5ID09PSBodHRwLlNUQVRVU19DT0RFU1syMDJdLCBib2R5KTtcbiAgICAgICAgICAgIGJvZHkgPSB1bmRlZmluZWQ7IC8vIHJlc29sdmVzIHByb21pc2UgdG8gdW5kZWZpbmVkIGJlbG93XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gZXJyb3IgcHJvY2Vzc2luZ1xuICAgICAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSA0MDApIHtcbiAgICAgICAgICAgIGlmIChfLmlzRXJyb3IoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gY29ycmVjdCBidXQgcHJhY3RpY2FsbHkgaW1wb3NzaWJsZVxuICAgICAgICAgICAgICBlcnJvciA9IGJvZHk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gdXNlIHBsYWluLXRleHQgYXMgRXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihib2R5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdExpa2UoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gYm9keSBpcyBvYmplY3QgcmVwcmVzZW50YXRpb24gb2Ygc2VydmVyLXNpZGUgZXJyb3Igb3IgZXhjZXB0aW9uLFxuICAgICAgICAgICAgICAvLyBjb252ZXJ0aW5nIHRvIHRydWUgRXJyb3Igb2JqZWN0IGhlcmVcbiAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzTWVzc2FnZSk7XG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFfLmlzQXJyYXkoYm9keSksXG4gICAgICAgICAgICAgICAgJ2tpY2tzIGluIGZvciBhcnJheSByZXNwb25zZXMgYXMgd2VsbCwgbm90IHN1cmUgaWYgdGhpcyBpcyBkZXNpcmFibGUnKTtcbiAgICAgICAgICAgICAgXy5leHRlbmQoZXJyb3IsIGJvZHkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gaGFuZGxlcyBudW1iZXJzLCBib29sZWFucywgZXRjLiBhc3NpZ25pbmcgYXMgY2F1c2Ugb2YgZmFpbHVyZVxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNNZXNzYWdlKTtcbiAgICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IuY2F1c2UgPSBib2R5O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZGRpdGlvbmFsIEh0dHBFcnJvciBwcm9wZXJ0aWVzIGV2ZW50dWFsbHkgc2V0IGJlbG93XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgLy8gY29tcGxldGVzIEh0dHBFcnJvciBjb25zdHJ1Y3Rpb25cbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0SXNFcnJvcihlcnJvciwgJ3Nob3VsZCBvcGVyYXRlIHRydWUgRXJyb3IgaW5zdGFuY2VzJyk7XG4gICAgICAgICAgICBlcnJvci5yZXF1ZXN0VXJsID0gdXJsO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIGVycm9yLnN0YXR1c0NvZGUgPSByZXNwb25zZS5zdGF0dXNDb2RlO1xuICAgICAgICAgICAgICBlcnJvci5zdGF0dXNNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzTWVzc2FnZTtcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVzcG9uc2UnLCB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVxdWVzdCcsIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHJlcSxcbiAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIG5ldHdvcmsgY29ubmVjdGl2aXR5IHByb2JsZW1cbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0SXNFcnJvcihlcnJvcik7XG4gICAgICAgICAgICBpZiAocHJvbWlzZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIHJlamVjdFJlc3BvbnNlKGVycm9yKTsgLy8gd2lsbCBhbHNvIHJlamVjdFJlc3VsdChlcnJvcilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlamVjdFJlc3VsdChlcnJvcik7IC8vIHByb21pc2VSZXNwb25zZSBub3QgY29uc3RydWN0ZWQgeWV0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSA1MDMgfHwgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gNTAwICYmXG4gICAgICAgICAgICBlcnJvci5jbGFzc05hbWUgPT09ICdqYXZhLnV0aWwuY29uY3VycmVudC5UaW1lb3V0RXhjZXB0aW9uJykge1xuICAgICAgICAgICAgLy8gNTAzIChzZXJ2aWNlIHVuYXZhaWxhYmxlKSBpbmRpY2F0ZXMgdGhlIHNlcnZlciBpcyB0ZW1wb3JhcmlseSBvdmVybG9hZGVkLCBhbmQgdW5hYmxlXG4gICAgICAgICAgICAvLyBoYW5kbGluZyB0aGUgcmVxdWVzdC4gVGhpcyBoYXBwZW5zIHdoZW4gYXN5bmMgZGVsZWdhdGlvbiB0aW1lZCBvdXQgb24gdGhlIEphdmEgc2lkZSxcbiAgICAgICAgICAgIC8vIHVzdWFsbHkgYWZ0ZXIgYWJvdXQgMiBtaW51dGVzLiBJbiB0aGlzIGNhc2UgcmV0cnkgdGhlIHJlcXVlc3QgdW50aWwgd2UgYXJlIGRvbmUuLi5cbiAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VydmVyIG92ZXJsb2FkZWQsIHJldHJ5aW5nIHJlcXVlc3QuJyk7XG4gICAgICAgICAgICAvLyBoZXJlIHByb21pc2VSZXNwb25zZSBtdXN0IGhhdmUgYmVlbiByZXNvbHZlZCBhbHJlYWR5LFxuICAgICAgICAgICAgLy8gd2UgY2hhaW4gYW55d2F5cyBiZWNhdXNlIG9mIGVycm9yIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlblJlc29sdmUoYWpheDxUPihvcHRpb25zKSkuZG9uZShyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpO1xuICAgICAgICAgICAgcmV0dXJuOyAvLyBlYXJseSBleGl0IGFzIHJlc3VsdCBpcyBoYW5kbGVkIGJ5IGRvbmUgY2FsbCBhYm92ZVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBsb2dvbiBzZXNzaW9uIHByb2Nlc3NpbmdcbiAgICAgICAgICAgIGxldCBzZXNzaW9uVXNlclV1aWQgPSByZXNwLmhlYWRlcnNbJ3gtZ29mZXItdXNlciddO1xuICAgICAgICAgICAgaWYgKHNlc3Npb25Vc2VyVXVpZCkge1xuICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gc2Vzc2lvblVzZXJVdWlkO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgLy8gYXBwYXJlbnRseSBvdXIgc2Vzc2lvbiBpcyBsb3N0IVxuICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gbnVsbDtcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFlcnJvcik7XG4gICAgICAgICAgICAgIGRpYWcuZGVidWcud2Fybignc2VydmVyIHNlc3Npb24gaXMgbG9zdCEnLCBlcnJvcik7XG4gICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gc2VydmVyT2JqLmNyZWRlbnRpYWxzO1xuICAgICAgICAgICAgICBpZiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgICAgICAvLyByZWNvdmVyIGJ5IGF0dGVtcHRpbmcgbG9naW4sXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBwcm9taXNlUmVzcG9uc2UgbXVzdCBoYXZlIGJlZW4gcmVzb2x2ZWQgYWxyZWFkeSxcbiAgICAgICAgICAgICAgICAvLyB3ZSBjaGFpbiBhbnl3YXlzIGJlY2F1c2Ugb2YgZXJyb3IgcHJvcGFnYXRpb25cbiAgICAgICAgICAgICAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xuICAgICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShsb2dpbihjcmVkZW50aWFscywge1xuICAgICAgICAgICAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICAgICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NlcnZlciBzZXNzaW9uIHJlY292ZXJlZC4nKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBhamF4PFQ+KG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgIH0pKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBlYXJseSBleGl0IGFzIHJlc3VsdCBpcyBoYW5kbGVkIGJ5IGRvbmUgY2FsbCBhYm92ZVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY29tcGxldGVzIHRoZSBjaGFpbiBwcm9wYWdhdGluZyByZXN1bHRzLCBtdXN0IGJlIHNraXBwZWQgd2hlbiByZXF1ZXN0IGlzIHJldHJpZWQgYWJvdmVcbiAgICAgICAgICBpZiAocHJvbWlzZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlbigocmVzcG9uc2VSZXN1bHQ6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHJlc3BvbnNlUmVzdWx0ID09PSByZXNwLCAnZGVmaW5pdGlvbiBvZiBiZWhhdmlvciBpbiBjYXNlICcgK1xuICAgICAgICAgICAgICAgICdvZiBwcm94eWluZyB0aGUgb3JpZ2luYWwgcmVzcG9uc2UgaXMgcmVzZXJ2ZWQgZm9yIGZ1dHVyZSBleHRlbnNpb24hJyk7XG5cbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KGVycm9yKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVzdWx0KGJvZHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAocmVzcG9uc2VFcnJvcikgPT4ge1xuICAgICAgICAgICAgICByZWplY3RSZXN1bHQocmVzcG9uc2VFcnJvcik7XG4gICAgICAgICAgICB9KS5kb25lKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIHBhdGggdGFrZW4gd2hlbiByZXF1ZXN0LmpzIHRocm93c1xuICAgICAgICByZXR1cm4gcmVqZWN0UmVzdWx0KGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gdHJhbnNwb3J0IHJlc3BvbnNlXG4gICAgICB0cnkge1xuICAgICAgICBRKHJlcXVlc3RDYWxsYmFjayhyZXEpKS50aGVuKChyZXF1ZXN0ID0gcmVxKSA9PiB7XG4gICAgICAgICAgcmVxdWVzdC5vbigncmVzcG9uc2UnLCAocmVzcG9uc2U6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3ApIHtcbiAgICAgICAgICAgICAgcmVzcCA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICByZXNvbHZlUmVzcG9uc2UocmVzcG9uc2VDYWxsYmFjayhyZXNwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgICAgIH0pLmRvbmUoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIHBhdGggdGFrZW4gd2hlbiByZXF1ZXN0Q2FsbGJhY2sgdGhyb3dzXG4gICAgICAgIHJldHVybiByZWplY3RSZXNwb25zZShlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIHJlc3BvbnNlIGRhdGEgb2YgbG9naW4gZW5kcG9pbnRzLlxuICpcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byBVc2VySW5mb1dyYXBwZXIgaW4gSmF2YSBjb2RlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luUmVzcG9uc2Uge1xuICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLlVzZXJJbmZvV3JhcHBlclxuICB1c2VyOiByb2xlcy5Vc2VyO1xuICByb2xlczogcm9sZXMuUm9sZUR0b1tdO1xuICBvcmdhbml6YXRpb246IHJvbGVzLk9yZ2FuaXphdGlvbjtcblxuICBsaWNlbnNlSW5mb3M6IHtcbiAgICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLkxpY2Vuc2VJbmZvc1xuICAgIGxpY2Vuc2VNb2RlbE5hbWU6IHN0cmluZztcbiAgICBsaWNlbnNlSW5mb3M6IF8uRGljdGlvbmFyeTxhbnk+XG4gIH07XG4gIC8qKlxuICAgKiBsaXN0cyBleHBlcmltZW50YWwgZmVhdHVyZXMgZW5hYmxlZCBvbiB0aGUgc2VydmVyLlxuICAgKi9cbiAgYWN0aXZlRmVhdHVyZVRvZ2dsZXM/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogZXZlbnR1YWxseSByZXR1cm5lZCBkYXRhIG9mIHRoZSBMb2dvbkNhbGxiYWNrIGlzIHN0b3JlZCBoZXJlLlxuICAgKi9cbiAgbG9nb25JbmZvcz86IGFueTtcbn1cblxuLyoqXG4gKiBvcHRpb25zIGZvciB1c2UgYnkgYm90aCBbW2xvZ2luXV0gYW5kIFtbbG9nb3V0XV0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nb25PcHRpb25zIGV4dGVuZHMgaW5pdC5TZXJ2ZXJVcmxPcHRpb25zIHtcblxuICAvKipcbiAgICogc3BlY2lmaWVzIHdoZXRoZXIgbG9naW4gcmVzcG9uc2UgZGF0YSBpcyBwZXJzaXN0ZWQgc3VjaCB0aGF0IHN1YnNlcXVlbnQgbG9nb25zIGNhbiBiZVxuICAgKiBwcm9jZXNzZWQgZXZlbiBpZiBjb21tdW5pY2F0aW9uIHdpdGggdGhlIFJlbHV0aW9uIHNlcnZlciBpcyBpbXBvc3NpYmxlIGF0IHRoYXQgdGltZS5cbiAgICpcbiAgICogT24gW1tsb2dpbl1dIHNldCB0byBgdHJ1ZWAgdG8gcGVyc2lzdCB0aGUgcmVzcG9uc2UgdG8gb2ZmbGluZSBzdG9yYWdlIHN1Y2ggdGhhdFxuICAgKiBzdWJzZXF1ZW50IGxvZ29uIHRvIHRoZSBzYW1lIHNlcnZlciB3aWxsIHJldXNlIGl0IGV2ZW4gYWZ0ZXIgdGhlIGNsaWVudCBhcHAgaXMgcmVzdGFydGVkLlxuICAgKiBUaGUgcmVzcG9uc2UgZGF0YSBpcyBzdG9yZWQgaW4gZW5jcnlwdGVkIGZvcm0uIE9uY2Ugc3RvcmVkLCBjYWxsaW5nIFtbbG9naW5dXSB3aXRoIHRoZVxuICAgKiBzYW1lIHNldCBvZiBjcmVkZW50aWFscyB3aWxsIHN1Y2NlZWQgZXZlbiBpZiB0aGUgUmVsdXRpb24gc2VydmVyIGNhbiBub3QgYmUgcmVhY2hlZC4gSW5cbiAgICogdGhpcyBjYXNlLCBjcmVkZW50aWFscyBhcmUgdmVyaWZpZWQgYnkgZGVjcnlwdGlvbiBvZiB0aGUgZW5jcnlwdGVkIHJlc3BvbnNlIGRhdGEuXG4gICAqXG4gICAqIE9uIFtbbG9nb3V0XV0gc2V0IHRvIGB0cnVlYCB0byB1bHRpbWF0ZWx5IGVyYXNlIHRoZSByZXNwb25zZSBmcm9tIG9mZmxpbmUgc3RvcmFnZSBhcyB3ZWxsLFxuICAgKiBhZnRlciBoYXZpbmcgaXQgc3RvcmVkIHVzaW5nIHRoZSBtZWNoYW5pc20gZGVzY3JpYmVkIGFib3ZlLlxuICAgKi9cbiAgb2ZmbGluZUNhcGFibGU/OiBib29sZWFuO1xuXG59XG5cbi8qKlxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ2luXV0gZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naW5PcHRpb25zIGV4dGVuZHMgTG9nb25PcHRpb25zLCBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcbn1cblxuLyoqXG4gKiBsb2dzIGludG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogTm90aWNlLCBzcGVjaWZ5aW5nIGBvZmZsaW5lQ2FwYWJsZT10cnVlYCBpbiB0aGUgb3B0aW9ucyB3aWxsIHN0b3JlIHRoZSBsb2dpbiByZXNwb25zZSBsb2NhbGx5IG9uXG4gKiB0aGUgZGV2aWNlIHdoZW4gb25saW5lIGFuZCB0aGUgbG9naW4gc3VjY2VlZGVkLiBXaGVuIG9mZmxpbmUsIHRoZSBvcHRpb24gd2lsbCByZXVzZSB0aGUgc3RvcmVkXG4gKiByZXNwb25zZS4gRGF0YSBlbmNyeXB0aW9uIGlzIHVzZWQgZ3VhcmFudGVlaW5nIGJvdGggc2VjcmVjeSBvZiBsb2dpbiBkYXRhIGFuZCB2ZXJpZmljYXRpb24gb2ZcbiAqIHRoZSBjcmVkZW50aWFscyBwcm92aWRlZC5cbiAqXG4gKiBAcGFyYW0gY3JlZGVudGlhbHMgdG8gdXNlLlxuICogQHBhcmFtIGxvZ2luT3B0aW9ucyBvdmVyd3JpdGluZyBbW2luaXRdXSBkZWZhdWx0cy5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZTxMb2dpblJlc3BvbnNlPn0gb2YgbG9naW4gcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGphdmFzY3JpcHRcbiAqXG4gKiBpbXBvcnQgKiBhcyBSZWx1dGlvbiBmcm9tICdyZWx1dGlvbi1zZGsnO1xuICogLy9jb25maWdcbiAqIFJlbHV0aW9uLmluaXQoe1xuICogICAgc2VydmVyVXJsOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJ1xuICogfSk7XG4gKlxuICogbGV0IGNyZWRlbnRpYWxzID0ge1xuICogICAgdXNlck5hbWU6ICdteXVzZXJuYW1lJyxcbiAqICAgIHBhc3N3b3JkOiAnbXlwYXNzd29yZCdcbiAqIH07XG4gKlxuICogLy91c2FnZVxuICpcbiAqIC8vIFByb21pc2VcbiAqIFJlbHV0aW9uLndlYi5sb2dpbihjcmVkZW50aWFscylcbiAqICAudGhlbigocmVzcCkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKTspXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2NvbXBsZXRlJykpO1xuICpcbiAqIC8vT2JzZXJ2YWJsZVxuICogT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShSZWx1dGlvbi53ZWIubG9naW4oY3JlZGVudGlhbHMpKS5zdWJzY3JpYmUoXG4gKiAgKHJlc3A6IGFueSkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKSxcbiAqICAoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGUnKVxuICogKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2dpbihjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscyxcbiAgICAgICAgICAgICAgICAgICAgICBsb2dpbk9wdGlvbnM6IExvZ2luT3B0aW9ucyA9IHt9KTogUS5Qcm9taXNlPExvZ2luUmVzcG9uc2U+IHtcbiAgbGV0IHdhc09mZmxpbmVMb2dpbiA9IGZhbHNlO1xuICBsZXQgc2VydmVyVXJsID0gdXJscy5yZXNvbHZlU2VydmVyKCcvJywgbG9naW5PcHRpb25zKTtcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAvLyBsb2dnZWQgaW4gYWxyZWFkeVxuICAgIHJldHVybiBsb2dvdXQoe1xuICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgIHJldHVybiBsb2dpbihjcmVkZW50aWFscywgbG9naW5PcHRpb25zKTsgLy8gcmVwZWF0IGFmdGVyIGxvZ291dFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKHNlcnZlck9iai5jcmVkZW50aWFscykge1xuICAgIC8vIGhhZCBjcmVkZW50aWFscyBidXQgbm8gc2Vzc2lvbiwgc28gd2Ugd2VyZSBsb2dnZWQgaW4gb2ZmbGluZVxuICAgIHdhc09mZmxpbmVMb2dpbiA9IHRydWU7XG4gIH1cblxuICAvLyBwcm9jZXNzIG9wdGlvbnNcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgYWdlbnRPcHRpb25zOiBsb2dpbk9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxuICAgIGFnZW50Q2xhc3M6IGxvZ2luT3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgbG9naW4gdGltZVxuICAgIGNsaWVudEFwcDogbG9naW5PcHRpb25zLmNsaWVudEFwcCB8fCBpbml0LmluaXRPcHRpb25zLmNsaWVudEFwcCxcbiAgICBsb2dvbkNhbGxiYWNrOiBsb2dpbk9wdGlvbnMubG9nb25DYWxsYmFjayB8fCBpbml0LmluaXRPcHRpb25zLmxvZ29uQ2FsbGJhY2ssXG4gICAgY2xpZW50Q2VydGlmaWNhdGU6IGxvZ2luT3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZSB8fCBpbml0LmluaXRPcHRpb25zLmNsaWVudENlcnRpZmljYXRlXG4gIH0pO1xuICBsZXQgbG9nb25DYWxsYmFjayA9IGN1cnJlbnRPcHRpb25zLmxvZ29uQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcbiAgcmV0dXJuIGFqYXg8TG9naW5SZXNwb25zZT4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIHVybDogJy9nb2Zlci9zZWN1cml0eS9yZXN0L2F1dGgvbG9naW4nLFxuICAgIGJvZHk6IGNyZWRlbnRpYWxzXG4gIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyByZWFsIHBoeXNpY2FsIGxvZ29uLCBhamF4IGNhbGwgc2V0cyBzZXNzaW9uVXNlclV1aWRcbiAgICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybignQlVHOiBSZWx1dGlvbiBkaWQgbm90IHNldCBYLUdvZmVyLVVzZXIgcmVzcG9uc2UgaGVhZGVyJyk7XG4gICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gcmVzcG9uc2UudXNlci51dWlkO1xuICAgIH1cbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID09PSByZXNwb25zZS51c2VyLnV1aWQpO1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSwgKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcbiAgICAvLyBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlICYmIGxvZ2luT3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSkge1xuICAgICAgLy8gYWpheCB0aW1lb3V0IC0+IG9mZmxpbmUgbG9naW4gYXR0ZW1wdFxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQsXG4gICAgICAgICdubyBwaHlzaWNhbCBsb2dpbiwgYXMgb3RoZXJ3aXNlIGxvZ29uQ2FsbGJhY2sgd291bGQgYmUgZXhlY3V0ZWQnKTtcbiAgICAgIHJldHVybiBvZmZsaW5lLmZldGNoT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykudGhlbigobG9naW5SZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIWxvZ2luUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyB3aGVuIHRoZXJlIGlzIG5vIHBlcnNpc3RlbnQgZGF0YSBhdmFpbGFibGUsIGFrYS4gdGhpcyBpcyB0aGUgaW5pdGlhbCBsb2dpbiBhdHRlbXB0LFxuICAgICAgICAgIC8vIGtlZXAgc2F5aW5nIHRoZSBzZXJ2ZXIgaXMgb2ZmbGluZS4uLlxuICAgICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvZ2luUmVzcG9uc2U7XG4gICAgICB9LCAob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgIC8vIG1vc3QgbGlrZWx5IHRoZSBwYXNzd29yZCBlbnRlcmVkIHdhcyBpbmNvcnJlY3QsXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgb2ZmbGluZUVycm9yIGluZGljYXRlcyB0aGUgc2VydmVyIGlzIHVuYXZhaWxhYmxlIGFzIHdlbGxcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5zdGF0dXNDb2RlKTtcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5yZXF1ZXN0VXJsKTtcbiAgICAgICAgb2ZmbGluZUVycm9yLnJlcXVlc3RVcmwgPSBlcnJvci5yZXF1ZXN0VXJsO1xuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLmNhdXNlKTtcbiAgICAgICAgb2ZmbGluZUVycm9yLmNhdXNlID0gZXJyb3I7XG4gICAgICAgIC8vIHdlIHJldGhyb3cgdGhlIGFubm90YXRlZCBlcnJvciBvZiBkZWNvZGluZyB0aGUgc3RvcmVkIHJlc3BvbnNlLFxuICAgICAgICAvLyBiZWNhdXNlIHRoZSBuZXR3b3JrIGVycm9yIGp1c3QgaW5kaWNhdGVzIHdlIGFyZSBvZmZsaW5lIGFuZCBkb2VzXG4gICAgICAgIC8vIG5vdCBtZW50aW9uIHRoZSBjcmVkZW50aWFscyBiZWluZyBpbmNvcnJlY3QgYXMgdGhpcyBvbmUgZG9lcy4uLlxuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4ob2ZmbGluZUVycm9yKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RhdHVzQ29kZSAmJiB3YXNPZmZsaW5lTG9naW4pIHtcbiAgICAgIC8vIHNlcnZlciBzaWRlIHJlamVjdGlvbiwgY2xlYXIgbG9naW4gZGF0YSBzbyB0aGF0IHN1YnNlcXVlbnQgb2ZmbGluZSBsb2dpbnMgZmFpbCBhcyB3ZWxsXG4gICAgICByZXR1cm4gb2ZmbGluZS5jbGVhck9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLmNhdGNoKChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgLy8gdGhpcyBpcyBiYWQgYnV0IHdlIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdFxuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ2ZhaWxlZCBlcmFzaW5nIG9mZmxpbmUgbG9naW4gZGF0YScsIG9mZmxpbmVFcnJvcik7XG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyBzd2l0Y2ggY3VycmVudCBzZXJ2ZXJcbiAgICBpZiAoJ3JvbGVzJyBpbiByZXNwb25zZS5yb2xlcykge1xuICAgICAgLy8gZml4ZXMgYSBkZWZlY3Qgb2YgSmF2YSBpbXBsZW1lbnRhdGlvblxuICAgICAgcmVzcG9uc2Uucm9sZXMgPSByZXNwb25zZS5yb2xlc1sncm9sZXMnXTtcbiAgICB9XG4gICAgc2VydmVyT2JqLmF1dGhvcml6YXRpb24gPSB7XG4gICAgICBuYW1lOiByZXNwb25zZS51c2VyLnV1aWQsXG4gICAgICByb2xlczogXy5tYXAocmVzcG9uc2Uucm9sZXMsIChyb2xlOiByb2xlcy5Sb2xlRHRvKSA9PiByb2xlLnV1aWQpXG4gICAgfTtcbiAgICBzZXJ2ZXJPYmoub3JnYW5pemF0aW9uID0gcmVzcG9uc2Uub3JnYW5pemF0aW9uO1xuICAgIHNlcnZlck9iai51c2VyID0gcmVzcG9uc2UudXNlcjtcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBjcmVkZW50aWFscztcbiAgICBzZXJ2ZXIuc2V0Q3VycmVudFNlcnZlcihzZXJ2ZXJPYmopO1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyB0aGlzIGlzIHRoZSBlYXJsaWVzdCBwb2ludCBhdCB3aGljaCBsaWJyYXJ5IHN0YXRlIHJlZmxlY3RzIGNvcnJlY3QgYXV0aG9yaXphdGlvbiwgZXRjLlxuICAgIC8vIFRodXMsIHRoZSBsb2dvbkNhbGxiYWNrIG1heSBleGVjdXRlIGhlcmUgbm93LCBidXQgb25seSBpZiB3ZSBhcmUgb25saW5lIGFjdHVhbGx5Li4uXG4gICAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7IC8vIG9mZmxpbmVcbiAgICB9XG4gICAgLy8gd2UgaGF2ZSBhIHNlc3Npb24gbG9nZ2VkIGludG8gdGhpcyB1c2VyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9PT0gc2VydmVyLmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCkubmFtZSk7XG5cbiAgICAvLyBydW4gbG9nb25DYWxsYmFjayBvbiByZXNwb25zZSBkYXRhIGFuZCBldmVudHVhbGx5IHN0b3JlIHJlc3VsdGFudCBvYmplY3QgZm9yIG9mZmxpbmUgbG9naW4sXG4gICAgLy8gYmVjYXVzZSB0aGlzIHdheSB0aGUgY2FsbGJhY2sgbWF5IGFkZCBpbmZvcm1hdGlvbiB0byB0aGUgcmVzcG9uc2Ugb2JqZWN0IHRoYXQgd2lsbCBhbHNvIGJlXG4gICAgLy8gcGVyc2lzdGVkIGFuZCBtYWRlIGF2YWlsYWJsZSBhZ2FpbiB3aGVuIG9mZmxpbmUhXG4gICAgcmV0dXJuIFEobG9nb25DYWxsYmFjayhyZXNwb25zZSkpLnRoZW4oKGxvZ29uSW5mb3MgPSByZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKGxvZ29uSW5mb3MgJiYgbG9nb25JbmZvcyAhPT0gcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gYW55IGRhdGEgcmV0dXJuZWQgYnkgdGhlIGxvZ29uQ2FsbGJhY2sgbWF5IGJlIHN0b3JlZCBoZXJlXG4gICAgICAgIHJlc3BvbnNlLmxvZ29uSW5mb3MgPSBsb2dvbkluZm9zO1xuICAgICAgfVxuXG4gICAgICAvLyBzdG9yZSBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXG4gICAgICBpZiAobG9naW5PcHRpb25zLm9mZmxpbmVDYXBhYmxlIHx8IHdhc09mZmxpbmVMb2dpbikge1xuICAgICAgICAvLyBpbml0aWFsIHN0b3JlIG9yIHVwZGF0ZSBvZiBsb2dpbiBkYXRhXG4gICAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucywgcmVzcG9uc2UpLmNhdGNoKFxuICAgICAgICAgIChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGRpYWcuZGVidWcud2Fybignb2ZmbGluZSBsb2dpbiBzdG9yZSBmYWlsZWQnLCBvZmZsaW5lRXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9LCAoZXJyb3IpID0+IHtcbiAgICAgIC8vIGxvZ29uIGNhbGxiYWNrIGZhaWxlZCwgbXVzdCBsb2dvdXQgdG8gYXZvaWQgbWFraW5nIGFqYXggY2FsbHMgaW4gYW4gdW5rbm93biBiYWNrZW5kIHN0YXRlXG4gICAgICByZXR1cm4gbG9nb3V0KHtcbiAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICAgIH0pLmNhdGNoKChsb2dvdXRFcnJvcikgPT4ge1xuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdmYWlsZWQgdG8gbG9nb3V0IGFmdGVyIGxvZ2luIGZhaWx1cmUnLCBsb2dvdXRFcnJvcik7XG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gbG9nb3V0IHByb2Nlc3NpbmcgbXVzdCBsZWF2ZSB1cyB3aXRoIG5vIHVzZXIgc2Vzc2lvblxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ291dF1dIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ291dE9wdGlvbnMgZXh0ZW5kcyBMb2dvbk9wdGlvbnMsIGluaXQuSHR0cEFnZW50T3B0aW9ucyB7XG59O1xuXG4vKipcbiAqIGxvZ3Mgb3V0IG9mIGEgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEZvciBleHBsaWNpdCBsb2dvdXRzICh0cmlnZ2VyIGJ5IGFwcCB1c2VyIHByZXNzaW5nIGEgbG9nb3V0IGJ1dHRvbiwgZm9yIGV4YW1wbGUpIHNwZWNpZnlpbmdcbiAqIGBvZmZsaW5lQ2FwYWJsZSA9IHRydWVgIHdpbGwgZHJvcCBhbnkgcGVyc2lzdGVkIG9mZmxpbmUgbG9naW4gZGF0YSBmb3IgdGhlIHNlcnZlciBsb2dnaW5nIG91dFxuICogb2YuXG4gKlxuICogQHBhcmFtIGxvZ291dE9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXG4gKiBAcmV0dXJuIHtRLlByb21pc2U8dm9pZD59IG9mIGxvZ291dCByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgamF2YXNjcmlwdFxuICpcbiAqIFJlbHV0aW9uLndlYi5sb2dvdXQoKVxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApOylcbiAqICAuY2F0Y2goKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKSlcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpKTtcbiAqXG4gKiAvL09ic2VydmFibGVcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmxvZ291dCgpKS5zdWJzY3JpYmUoXG4gKiAgKHJlc3A6IGFueSkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKSxcbiAqICAoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpXG4gKiApXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ291dChsb2dvdXRPcHRpb25zOiBMb2dvdXRPcHRpb25zID0ge30pOiBRLlByb21pc2U8dm9pZD4ge1xuICBsZXQgc2VydmVyVXJsID0gdXJscy5yZXNvbHZlU2VydmVyKCcvJywgbG9nb3V0T3B0aW9ucyk7XG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG5cbiAgLy8gcHJvY2VzcyBvcHRpb25zXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIGFnZW50T3B0aW9uczogbG9nb3V0T3B0aW9ucy5hZ2VudE9wdGlvbnMgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudE9wdGlvbnMsXG4gICAgYWdlbnRDbGFzczogbG9nb3V0T3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgbG9nb3V0IHRpbWVcbiAgfSk7XG4gIHJldHVybiBhamF4PHZvaWQ+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHkvcmVzdC9hdXRoL2xvZ291dCcsXG4gICAgYm9keToge31cbiAgfSwgY3VycmVudE9wdGlvbnMpKS5jYXRjaCgoZXJyb3I6IEh0dHBFcnJvcikgPT4ge1xuICAgIGlmIChlcnJvci5zdGF0dXNDb2RlID09PSA0MjIpIHtcbiAgICAvLyBSRVNULWJhc2VkIGxvZ291dCBVUkwgY3VycmVudGx5IGlzIGJyb2tlbiByZXBvcnRpbmcgYSA0MjIgaW4gYWxsIGNhc2VzXG4gICAgICByZXR1cm4gYWpheDx2b2lkPihfLmRlZmF1bHRzPEh0dHBPcHRpb25zPih7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHktbG9nb3V0J1xuICAgIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcud2FybignQlVHOiByZXNvcnRlZCB0byBjbGFzc2ljIFBBVEgtYmFzZWQgbG9nb3V0IGFzIFJFU1QtYmFzZWQgbG9nb3V0IGZhaWxlZDonLFxuICAgICAgICAgIGVycm9yKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9LCAoZXJyb3IyOiBIdHRwRXJyb3IpID0+IHtcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yMi5zdGF0dXNDb2RlID09PSA0MjIgPyBlcnJvciA6IGVycm9yMik7XG4gICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XG4gIH0pLmNhdGNoKChlcnJvcjogSHR0cEVycm9yKSA9PiB7XG4gICAgLy8gaWdub3JlIG5ldHdvcmsgZmFpbHVyZXMgb24gdGltZW91dCwgc2VydmVyIGZvcmdldHMgb24gc2Vzc2lvbiB0aW1lb3V0IGFueXdheXNcbiAgICBpZiAoIWVycm9yLnN0YXR1c0NvZGUpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcbiAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgLy8gZXZlbnR1YWxseSBlcmFzZSBvZmZsaW5lIGxvZ2luIGRhdGFcbiAgICBpZiAobG9nb3V0T3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSkge1xuICAgICAgLy8gcmVxdWVzdGVkIHRvIGVyYXNlIGxvZ2luIGRhdGFcbiAgICAgIHJldHVybiBvZmZsaW5lLmNsZWFyT2ZmbGluZUxvZ2luKHNlcnZlck9iai5jcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLmNhdGNoKFxuICAgICAgICAob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcbiAgICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAvLyBmb3JnZXQgZXZlcnl0aGluZyBhYm91dCBpdFxuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XG4gICAgc2VydmVyT2JqLmF1dGhvcml6YXRpb24gPSBhdXRoLkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OO1xuICAgIHNlcnZlck9iai5vcmdhbml6YXRpb24gPSBudWxsO1xuICAgIHNlcnZlck9iai51c2VyID0gbnVsbDtcbiAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gbnVsbDtcbiAgfSk7XG59XG4iXX0=