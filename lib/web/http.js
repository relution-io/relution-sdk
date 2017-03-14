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
                        serverObj.serverInfos = null;
                        diag.debug.assertIsError(error);
                        if (promiseResponse) {
                            rejectResponse(error); // will also rejectResult(error)
                        }
                        else {
                            rejectResult(error); // promiseResponse not constructed yet
                        }
                    }
                    else {
                        // server information
                        serverObj.serverInfos = {
                            version: resp.headers['x-relution-version'],
                            description: resp.headers['x-server']
                        };
                        if (response.statusCode === 503 ||
                            response.statusCode === 500 && error.className === 'java.util.concurrent.TimeoutException') {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLElBQVksSUFBSSxXQUFNLE1BQU0sQ0FBQyxDQUFBO0FBRTdCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFekMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUVyQyw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNy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dEMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDakMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQzNFLFVBQUMsWUFBWTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHdlYi9odHRwLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgd2ViXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuXG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICdodHRwJztcblxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xuaW1wb3J0ICogYXMgaW5pdCBmcm9tICcuLi9jb3JlL2luaXQnO1xuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuLi9zZWN1cml0eS9hdXRoJztcbmltcG9ydCAqIGFzIHJvbGVzIGZyb20gJy4uL3NlY3VyaXR5L3JvbGVzJztcbmltcG9ydCAqIGFzIHNlcnZlciBmcm9tICcuLi9zZWN1cml0eS9zZXJ2ZXInO1xuaW1wb3J0ICogYXMgdXJscyBmcm9tICcuL3VybHMnO1xuaW1wb3J0ICogYXMgb2ZmbGluZSBmcm9tICcuL29mZmxpbmUnO1xuXG4vLyByZXF1aXJlIHJlcXVlc3QuanMgdG8gbWFuYWdlIGNvb2tpZXMgZm9yIHVzXG5sZXQgcmVxdWVzdERlZmF1bHRzID0ge1xuICBqc29uOiB0cnVlLFxuICBqYXI6IHRydWUsXG4gIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxufTtcbmxldCByZXF1ZXN0V2l0aERlZmF1bHRzID0gcmVxdWVzdC5kZWZhdWx0cyhyZXF1ZXN0RGVmYXVsdHMpO1xuXG4vKipcbiAqIGNhbGxiYWNrIGFsbG93aW5nIGN1c3RvbWl6aW5nIGFuIG9iamVjdCBub3QgaW1tZWRpYXRlbHkgYXZhaWxhYmxlIGF0IHRpbWUgb2YgY2FsbC5cbiAqXG4gKiBAcGFyYW0gb2JqZWN0IGZvciBpbnNwZWN0aW9uIG9yIGN1c3RvbWl6YXRpb24uXG4gKiBAcmV0dXJuIHByb21pc2Ugb3Igb2JqZWN0IG9uIHNhbWUgZGVmZXJyZWQgb2JqZWN0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBDYWxsYmFjazxUPiB7XG4gICh2YWx1ZTogVCk6IFEuUHJvbWlzZTxUPiB8IFQ7XG59XG5cbi8qKlxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVxdWVzdC5cbiAqL1xuZXhwb3J0IHR5cGUgSHR0cFJlcXVlc3QgPSByZXF1ZXN0LlJlcXVlc3Q7XG4vKipcbiAqIHR5cGUgcmVwcmVzZW50aW5nIGEgcmF3IHJlc3BvbnNlLlxuICovXG5leHBvcnQgdHlwZSBIdHRwUmVzcG9uc2UgPSBodHRwLkluY29taW5nTWVzc2FnZTtcblxuLyoqXG4gKiBuYW1lZCBwYXJhbWV0ZXJzIG9mIHRoZSBbW2h0dHBdXSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwT3B0aW9ucyBleHRlbmRzIHJlcXVlc3QuQ29yZU9wdGlvbnMsIHJlcXVlc3QuVXJsT3B0aW9ucyxcbiAgICBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcbiAgLyoqXG4gICAqIG9wdGlvbmFsIGNhbGxiYWNrIGFsbG93aW5nIHRvIGN1c3RvbWl6ZSB0aGUgY2xpZW50IHJlcXVlc3QgaW4gbW9yZSBkZXRhaWwgdGhhbiBwcm92aWRlZCBieVxuICAgKiBkZWZhdWx0LlxuICAgKi9cbiAgcmVxdWVzdENhbGxiYWNrPzogSHR0cENhbGxiYWNrPEh0dHBSZXF1ZXN0PjtcbiAgLyoqXG4gICAqIG9wdGlvbmFsIGNhbGxiYWNrIGFsbG93aW5nIHRvIGluc3BlY3QgdGhlIHNlcnZlciByZXNwb25zZSBpbiBtb3JlIGRldGFpbCB0aGFuIHByb3ZpZGVkIGJ5XG4gICAqIGRlZmF1bHQuXG4gICAqL1xuICByZXNwb25zZUNhbGxiYWNrPzogSHR0cENhbGxiYWNrPEh0dHBSZXNwb25zZT47XG59XG5cbi8qKlxuICogZmFpbHVyZSBvZiBhbiBhamF4IHJlcXVlc3QuXG4gKlxuICogVGhpcyB0eXBlIGNhbiBiZSB1c2VkIGFzIHR5cGUgYW5ub3RhdGlvbiBvZiB0aGUgZXJyb3IgdGhlIFByb21pc2UgcmV0dXJuZWQgYnkgYWpheCBpcyByZWplY3RlZFxuICogd2l0aC5cbiAqXG4gKiBAc2VlIGFqYXhcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBmdWxseSByZXNvbHZlZCB1cmwgdGhlIHJlcXVlc3Qgd2FzIHNlbnQgdG8uXG4gICAqL1xuICByZXF1ZXN0VXJsPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBIVFRQIHN0YXR1cyBjb2RlIG9mIGZhaWx1cmUuXG4gICAqL1xuICBzdGF0dXNDb2RlPzogbnVtYmVyO1xuICAvKipcbiAgICogSFRUUCBzdGF0dXMgbWVzc2FnZSBvZiBmYWlsdXJlLlxuICAgKi9cbiAgc3RhdHVzTWVzc2FnZT86IHN0cmluZztcblxuICAvKipcbiAgICogaW4gbWFueSBjYXNlcyB0aGUgUmVsdXRpb24gc2VydmVyIHJlcG9ydHMgaGVyZSB0aGUgZnVsbHkgcXVhbGlmaWVkIG5hbWUgb2YgYSBKYXZhIEV4Y2VwdGlvblxuICAgKiB0aGF0IG1heSBiZSB1c2VkIHRvIGZ1cnRoZXIgZGlmZmVyZW50aWF0ZSB0aGUgZXJyb3IuXG4gICAqL1xuICBjbGFzc05hbWU/OiBzdHJpbmc7XG4gIC8qKlxuICAgKiBtYXkgYmUgc2V0IHRvIHNvbWUgYXJiaXRyYXJ5IHZhbHVlIGRlc2NyaWJpbmcgdGhlIGNhdXNlIG9mIGZhaWx1cmUsIG1vc3RseSBwcmVzZW50IHdoZW5cbiAgICogdHJhbnNwb3J0aW5nIEphdmEgRXhjZXB0aW9uIG9iamVjdHMuXG4gICAqL1xuICBjYXVzZT86IGFueTtcblxuICAvKipcbiAgICogZGV0YWlscyBvZiByZXF1ZXN0IGZhaWxlZC5cbiAgICpcbiAgICogVGhpcyBpcyBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IGFuZCB0aHVzIG5vdCBwYXJ0IG9mIHRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmYWlsdXJlLlxuICAgKiBJdCBpcyBwcm92aWRlZCBmb3IgaW5mb3JtYWwgcHVycG9zZXMgYXMgYSBkZWJ1Z2dpbmcgYWlkIG9ubHkuIENsaWVudCBjb2RlIHNob3VsZCBub3QgcmVseSBvblxuICAgKiB0aGlzIHZhbHVlLlxuICAgKlxuICAgKiBAc2VlIHJlc3BvbnNlXG4gICAqL1xuICByYXdSZXF1ZXN0PzogSHR0cFJlcXVlc3Q7XG4gIC8qKlxuICAgKiBkZXRhaWxzIG9mIHJlc3BvbnNlIGZhaWxlZC5cbiAgICpcbiAgICogVGhpcyBpcyBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IGFuZCB0aHVzIG5vdCBwYXJ0IG9mIHRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmYWlsdXJlLlxuICAgKiBJdCBpcyBwcm92aWRlZCBmb3IgaW5mb3JtYWwgcHVycG9zZXMgYXMgYSBkZWJ1Z2dpbmcgYWlkIG9ubHkuIENsaWVudCBjb2RlIHNob3VsZCBub3QgcmVseSBvblxuICAgKiB0aGlzIHZhbHVlLlxuICAgKlxuICAgKiBAc2VlIHJlcXVlc3RcbiAgICovXG4gIHJhd1Jlc3BvbnNlPzogSHR0cFJlc3BvbnNlO1xufVxuXG4vKipcbiAqIGRyaXZlcyBhbiBIVFRQIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEJlaGF2aW9yIG9mIHRoaXMgbWV0aG9kIGlzIHNpbXBsaWZpZWQgZnJvbSBtb3N0IEhUVFAvQUpBWCBpbXBsZW1lbnRhdGlvbnM6XG4gKiAtIFdoZW4gdGhlIEhUVFAgcmVxdWVzdCBzdWNjZWVkcyB0aGUgcmVzdWx0aW5nIHByb21pc2UgcmVzb2x2ZXMgdG8gdGhlIHJlc3BvbnNlIGJvZHkuXG4gKiAtIEluIGNhc2Ugb2YgYSBuZXR3b3JrIEVycm9yIHRoZSBwcm9taXNlIHJlc29sdmVzIHRvIGFuIEh0dHBFcnJvciBvYmplY3QgcHJvdmlkaW5nIGByZXF1ZXN0VXJsYFxuICogICBidXQgbmVpdGhlciBgc3RhdHVzQ29kZWAgbm9yIGBzdGF0dXNNZXNzYWdlYC5cbiAqIC0gSW4gY2FzZSBvZiBIVFRQIGZhaWx1cmUgdGhlIHJlc3VsdGluZyBwcm9taXNlIGlzIHJlamVjdGVkIHRvIGFuIEh0dHBFcnJvci1saWtlIG9iamVjdCBjYXJyeWluZ1xuICogICB0aGUgcHJvcGVydGllcyBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxuICogLSBJZiB0aGUgc2VydmVyIHJlc3BvbmRzIGEgSlNPTiwgaXQgaXMgcGFyc2VkIGFuZCBhc3N1bWVkIHRvIGJlIGFuIEh0dHBFcnJvci1saWtlIG9iamVjdC4gVGhlXG4gKiAgIG9iamVjdCBpcyBhdWdtZW50ZWQgYnkgdGhlIHByb3BlcnRpZXMgYXMgZGVmaW5lZCBhYm92ZS5cbiAqIC0gT3RoZXJ3aXNlIHRoZSBib2R5IGlzIHN0b3JlZCBhcyBgbWVzc2FnZWAgb2YgYW4gSHR0cEVycm9yIG9iamVjdCBjcmVhdGVkLiBBZ2FpbiwgdGhlIHByb3BlcnRpZXNcbiAqICAgYWJvdmUgYXJlIHByb3ZpZGVkLlxuICogLSBGaW5hbGx5LCBpbiBjYXNlIG9mIEhUVFAgZmFpbHVyZSB3aXRoIHRoZSBzZXJ2ZXIgbm90IHByb3ZpZGluZyBhbnkgcmVzcG9uc2UgYm9keSwgdGhlIEh0dHBFcnJvclxuICogICBgbWVzc2FnZWAgaXMgc2V0IHRvIHRoZSBgc3RhdHVzTWVzc2FnZWAuXG4gKlxuICogVGh1cywgdG8gZGlmZmVyZW50aWF0ZSBuZXR3b3JrIGZhaWx1cmVzIGZyb20gc2VydmVyLXNpZGUgZmFpbHVyZXMgdGhlIGBzdGF0dXNDb2RlYCBvZiB0aGVcbiAqIEh0dHBFcnJvciByZWplY3Rpb24gaXMgdG8gYmVpbmcgdXNlZC4gRm9yIGRlZXBlciBpbnNwZWN0aW9uIHByb3ZpZGUgYW5cbiAqIFtbb3B0aW9ucy5yZXNwb25zZUNhbGxiYWNrXV0uXG4gKlxuICogYGBgamF2YXNjcmlwdFxuICogUmVsdXRpb24uaW5pdCh7XG4gKiAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnLFxuICogICAgb3JnYW5pemF0aW9uOiAnbXlPcmdhJ1xuICogfSk7XG4gKlxuICogbGV0IGh0dHBPcHRpb25zOiBIdHRwT3B0aW9ucyA9IHttZXRob2Q6ICdHRVQnLCB1cmw6ICdhcGkvdjEvcG9zdHMnfTtcbiAqXG4gKiAvL3VzYWdlIGFzIFByb21pc2VcbiAqIFJlbHV0aW9uLndlYi5hamF4KGh0dHBPcHRpb25zKVxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKTspXG4gKiAgLmNhdGNoKChlOlJlbHV0aW9uLndlYi5IdHRwRXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKSlcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnbG9hZGluZyBjb21wbGV0ZSEnKSk7XG4gKlxuICogLy8gYXMgT2JzZXJ2YWJsZVxuICogT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShSZWx1dGlvbi53ZWIuYWpheChodHRwT3B0aW9ucykpLnN1YnNjcmliZShcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKSxcbiAqICAoZTpSZWx1dGlvbi53ZWIuSHR0cEVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSk7LFxuICogICgpID0+IGNvbnNvbGUubG9nKCdsb2FkaW5nIGNvbXBsZXRlIScpXG4gKiApXG4gKiBgYGBcbiAqIEBwYXJhbSBvcHRpb25zIG9mIHJlcXVlc3QsIGluY2x1ZGluZyB0YXJnZXQgYHVybGAuXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEh0dHBFcnJvciBvYmplY3RcbiAqICAgIGluY2x1ZGluZyBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxuICovXG5leHBvcnQgZnVuY3Rpb24gYWpheDxUPihvcHRpb25zOiBIdHRwT3B0aW9ucyk6IFEuUHJvbWlzZTxUPiB7XG4gIGxldCBzZXJ2ZXJVcmwgPSB1cmxzLnJlc29sdmVTZXJ2ZXIob3B0aW9ucy51cmwsIG9wdGlvbnMpO1xuICBsZXQgc2VydmVyT2JqID0gc2VydmVyLlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xuICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgJiYgc2VydmVyT2JqLmNyZWRlbnRpYWxzKSB7XG4gICAgLy8gbm90IGxvZ2dlZCBpblxuICAgIGxldCBjcmVkZW50aWFscyA9IHNlcnZlck9iai5jcmVkZW50aWFscztcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xuICAgIHJldHVybiBsb2dpbihjcmVkZW50aWFscywge1xuICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPT0gY3JlZGVudGlhbHMpO1xuICAgICAgcmV0dXJuIGFqYXg8VD4ob3B0aW9ucyk7IC8vIHJlcGVhdCBhZnRlciBsb2dpblxuICAgIH0pO1xuICB9XG5cbiAgLy8gcHJvY2VzcyBvcHRpb25zXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIGFnZW50T3B0aW9uczogb3B0aW9ucy5hZ2VudE9wdGlvbnMgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudE9wdGlvbnMsXG4gICAgYWdlbnRDbGFzczogb3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgcmVxdWVzdCB0aW1lXG4gICAgYXBwbGljYXRpb246IG9wdGlvbnMuYXBwbGljYXRpb24gfHwgaW5pdC5pbml0T3B0aW9ucy5hcHBsaWNhdGlvbixcbiAgICB0ZW5hbnRPcmdhOiBvcHRpb25zLnRlbmFudE9yZ2EgfHwgaW5pdC5pbml0T3B0aW9ucy50ZW5hbnRPcmdhXG4gIH0pO1xuXG4gIC8vIHJlc29sdmUgdGFyZ2V0IHVybFxuICBsZXQgdXJsID0gdXJscy5yZXNvbHZlVXJsKG9wdGlvbnMudXJsLCBjdXJyZW50T3B0aW9ucyk7XG4gIGRpYWcuZGVidWcuZGVidWcob3B0aW9ucy5tZXRob2QgKyAnICcgKyB1cmwpO1xuICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiB1cmwuc3Vic3RyKDAsIHNlcnZlclVybC5sZW5ndGgpID09PSBzZXJ2ZXJVcmwpO1xuXG4gIGxldCByZXF1ZXN0Q2FsbGJhY2sgPSBvcHRpb25zLnJlcXVlc3RDYWxsYmFjayB8fCBfLmlkZW50aXR5O1xuICBsZXQgcmVzcG9uc2VDYWxsYmFjayA9IG9wdGlvbnMucmVzcG9uc2VDYWxsYmFjayB8fCBfLmlkZW50aXR5O1xuICBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zKTtcbiAgb3B0aW9ucy5hZ2VudE9wdGlvbnMgPSBjdXJyZW50T3B0aW9ucy5hZ2VudE9wdGlvbnM7XG4gIG9wdGlvbnMuYWdlbnRDbGFzcyA9IGN1cnJlbnRPcHRpb25zLmFnZW50Q2xhc3M7XG4gIGxldCBoZWFkZXJzID0ge307XG4gIGlmIChzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgLy8gYWRkIFgtR29mZXItVXNlciBoZWFkZXIgc28gdGhhdCBzZXJ2ZXIgbWF5IGNoZWNrIHdlIGFyZSBydW5uaW5nIHVuZGVyIGNvcnJlY3QgaWRlbnRpdHlcbiAgICBoZWFkZXJzWydYLUdvZmVyLVVzZXInXSA9IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQ7XG4gIH1cbiAgaWYgKGN1cnJlbnRPcHRpb25zLmNsaWVudEFwcCkge1xuICAgIC8vIGFkZCBYLVJlbHV0aW9uLUNsaWVudEFwcCBmb3Igc2VydmVyLXNpZGUgYW5hbHl0aWNzXG4gICAgaGVhZGVyc1snWC1SZWx1dGlvbi1DbGllbnRBcHAnXSA9IGN1cnJlbnRPcHRpb25zLmNsaWVudEFwcDtcbiAgfVxuICBpZiAoIV8uaXNFbXB0eShoZWFkZXJzKSkge1xuICAgIG9wdGlvbnMuaGVhZGVycyA9IF8uZGVmYXVsdHMoaGVhZGVycywgb3B0aW9ucy5oZWFkZXJzKTtcbiAgfVxuICByZXR1cm4gUS5Qcm9taXNlPFQ+KChyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpID0+IHtcbiAgICBsZXQgcHJvbWlzZVJlc3BvbnNlID0gUS5Qcm9taXNlKChyZXNvbHZlUmVzcG9uc2UsIHJlamVjdFJlc3BvbnNlKSA9PiB7XG4gICAgICBsZXQgcmVzcDogaHR0cC5JbmNvbWluZ01lc3NhZ2U7XG4gICAgICBsZXQgcmVxOiByZXF1ZXN0LlJlcXVlc3Q7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAob3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZSkge1xuICAgICAgICAgIC8vIGFwcGx5IGNlcnRpZmljYXRlIG9wdGlvbnNcbiAgICAgICAgICBfLmV4dGVuZChvcHRpb25zLCBvcHRpb25zLmNsaWVudENlcnRpZmljYXRlKTtcbiAgICAgICAgfVxuICAgICAgICByZXEgPSByZXF1ZXN0V2l0aERlZmF1bHRzKHVybCwgb3B0aW9ucywgKGVycm9yOiBIdHRwRXJyb3IsIHJlc3BvbnNlID0gcmVzcCwgYm9keT86IGFueSkgPT4ge1xuICAgICAgICAgIC8vIG5vZGUuanMgYXNzaWducyBzdGF0dXMgc3RyaW5nIGFzIGJvZHkgZm9yIHN0YXR1cyBjb2RlcyBub3QgaGF2aW5nIGJvZHkgZGF0YVxuICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5zdGF0dXNDb2RlID09PSAyMDIpIHtcbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KGJvZHkgPT09IGh0dHAuU1RBVFVTX0NPREVTWzIwMl0sIGJvZHkpO1xuICAgICAgICAgICAgYm9keSA9IHVuZGVmaW5lZDsgLy8gcmVzb2x2ZXMgcHJvbWlzZSB0byB1bmRlZmluZWQgYmVsb3dcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBlcnJvciBwcm9jZXNzaW5nXG4gICAgICAgICAgaWYgKCFlcnJvciAmJiByZXNwb25zZSAmJiByZXNwb25zZS5zdGF0dXNDb2RlID49IDQwMCkge1xuICAgICAgICAgICAgaWYgKF8uaXNFcnJvcihib2R5KSkge1xuICAgICAgICAgICAgICAvLyBjb3JyZWN0IGJ1dCBwcmFjdGljYWxseSBpbXBvc3NpYmxlXG4gICAgICAgICAgICAgIGVycm9yID0gYm9keTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhib2R5KSkge1xuICAgICAgICAgICAgICAvLyB1c2UgcGxhaW4tdGV4dCBhcyBFcnJvciBtZXNzYWdlXG4gICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKGJvZHkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0TGlrZShib2R5KSkge1xuICAgICAgICAgICAgICAvLyBib2R5IGlzIG9iamVjdCByZXByZXNlbnRhdGlvbiBvZiBzZXJ2ZXItc2lkZSBlcnJvciBvciBleGNlcHRpb24sXG4gICAgICAgICAgICAgIC8vIGNvbnZlcnRpbmcgdG8gdHJ1ZSBFcnJvciBvYmplY3QgaGVyZVxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNNZXNzYWdlKTtcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIV8uaXNBcnJheShib2R5KSxcbiAgICAgICAgICAgICAgICAna2lja3MgaW4gZm9yIGFycmF5IHJlc3BvbnNlcyBhcyB3ZWxsLCBub3Qgc3VyZSBpZiB0aGlzIGlzIGRlc2lyYWJsZScpO1xuICAgICAgICAgICAgICBfLmV4dGVuZChlcnJvciwgYm9keSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBoYW5kbGVzIG51bWJlcnMsIGJvb2xlYW5zLCBldGMuIGFzc2lnbmluZyBhcyBjYXVzZSBvZiBmYWlsdXJlXG4gICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c01lc3NhZ2UpO1xuICAgICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQoYm9keSkpIHtcbiAgICAgICAgICAgICAgICBlcnJvci5jYXVzZSA9IGJvZHk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIGFkZGl0aW9uYWwgSHR0cEVycm9yIHByb3BlcnRpZXMgZXZlbnR1YWxseSBzZXQgYmVsb3dcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAvLyBjb21wbGV0ZXMgSHR0cEVycm9yIGNvbnN0cnVjdGlvblxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yLCAnc2hvdWxkIG9wZXJhdGUgdHJ1ZSBFcnJvciBpbnN0YW5jZXMnKTtcbiAgICAgICAgICAgIGVycm9yLnJlcXVlc3RVcmwgPSB1cmw7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzQ29kZSA9IHJlc3BvbnNlLnN0YXR1c0NvZGU7XG4gICAgICAgICAgICAgIGVycm9yLnN0YXR1c01lc3NhZ2UgPSByZXNwb25zZS5zdGF0dXNNZXNzYWdlO1xuICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXJyb3IsICdyYXdSZXNwb25zZScsIHtcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzcG9uc2UsXG4gICAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXJyb3IsICdyYXdSZXF1ZXN0Jywge1xuICAgICAgICAgICAgICB2YWx1ZTogcmVxLFxuICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKCFyZXNwb25zZSkge1xuICAgICAgICAgICAgLy8gbmV0d29yayBjb25uZWN0aXZpdHkgcHJvYmxlbVxuICAgICAgICAgICAgc2VydmVyT2JqLnNlcnZlckluZm9zID0gbnVsbDtcbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0SXNFcnJvcihlcnJvcik7XG4gICAgICAgICAgICBpZiAocHJvbWlzZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIHJlamVjdFJlc3BvbnNlKGVycm9yKTsgLy8gd2lsbCBhbHNvIHJlamVjdFJlc3VsdChlcnJvcilcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHJlamVjdFJlc3VsdChlcnJvcik7IC8vIHByb21pc2VSZXNwb25zZSBub3QgY29uc3RydWN0ZWQgeWV0XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIHNlcnZlciBpbmZvcm1hdGlvblxuICAgICAgICAgICAgc2VydmVyT2JqLnNlcnZlckluZm9zID0ge1xuICAgICAgICAgICAgICB2ZXJzaW9uOiByZXNwLmhlYWRlcnNbJ3gtcmVsdXRpb24tdmVyc2lvbiddLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogcmVzcC5oZWFkZXJzWyd4LXNlcnZlciddXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDUwMyB8fFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDUwMCAmJiBlcnJvci5jbGFzc05hbWUgPT09ICdqYXZhLnV0aWwuY29uY3VycmVudC5UaW1lb3V0RXhjZXB0aW9uJykge1xuICAgICAgICAgICAgICAvLyA1MDMgKHNlcnZpY2UgdW5hdmFpbGFibGUpIGluZGljYXRlcyB0aGUgc2VydmVyIGlzIHRlbXBvcmFyaWx5IG92ZXJsb2FkZWQsIGFuZCB1bmFibGVcbiAgICAgICAgICAgICAgLy8gaGFuZGxpbmcgdGhlIHJlcXVlc3QuIFRoaXMgaGFwcGVucyB3aGVuIGFzeW5jIGRlbGVnYXRpb24gdGltZWQgb3V0IG9uIHRoZSBKYXZhIHNpZGUsXG4gICAgICAgICAgICAgIC8vIHVzdWFsbHkgYWZ0ZXIgYWJvdXQgMiBtaW51dGVzLiBJbiB0aGlzIGNhc2UgcmV0cnkgdGhlIHJlcXVlc3QgdW50aWwgd2UgYXJlIGRvbmUuLi5cbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZXJ2ZXIgb3ZlcmxvYWRlZCwgcmV0cnlpbmcgcmVxdWVzdC4nKTtcbiAgICAgICAgICAgICAgLy8gaGVyZSBwcm9taXNlUmVzcG9uc2UgbXVzdCBoYXZlIGJlZW4gcmVzb2x2ZWQgYWxyZWFkeSxcbiAgICAgICAgICAgICAgLy8gd2UgY2hhaW4gYW55d2F5cyBiZWNhdXNlIG9mIGVycm9yIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShhamF4PFQ+KG9wdGlvbnMpKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XG4gICAgICAgICAgICAgIHJldHVybjsgLy8gZWFybHkgZXhpdCBhcyByZXN1bHQgaXMgaGFuZGxlZCBieSBkb25lIGNhbGwgYWJvdmVcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGxvZ29uIHNlc3Npb24gcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICBsZXQgc2Vzc2lvblVzZXJVdWlkID0gcmVzcC5oZWFkZXJzWyd4LWdvZmVyLXVzZXInXTtcbiAgICAgICAgICAgICAgaWYgKHNlc3Npb25Vc2VyVXVpZCkge1xuICAgICAgICAgICAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBzZXNzaW9uVXNlclV1aWQ7XG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gNDAxKSB7XG4gICAgICAgICAgICAgICAgLy8gYXBwYXJlbnRseSBvdXIgc2Vzc2lvbiBpcyBsb3N0IVxuICAgICAgICAgICAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBudWxsO1xuICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhZXJyb3IpO1xuICAgICAgICAgICAgICAgIGRpYWcuZGVidWcud2Fybignc2VydmVyIHNlc3Npb24gaXMgbG9zdCEnLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSBzZXJ2ZXJPYmouY3JlZGVudGlhbHM7XG4gICAgICAgICAgICAgICAgaWYgKGNyZWRlbnRpYWxzKSB7XG4gICAgICAgICAgICAgICAgICAvLyByZWNvdmVyIGJ5IGF0dGVtcHRpbmcgbG9naW4sXG4gICAgICAgICAgICAgICAgICAvLyBoZXJlIHByb21pc2VSZXNwb25zZSBtdXN0IGhhdmUgYmVlbiByZXNvbHZlZCBhbHJlYWR5LFxuICAgICAgICAgICAgICAgICAgLy8gd2UgY2hhaW4gYW55d2F5cyBiZWNhdXNlIG9mIGVycm9yIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAgICAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xuICAgICAgICAgICAgICAgICAgcHJvbWlzZVJlc3BvbnNlLnRoZW5SZXNvbHZlKGxvZ2luKGNyZWRlbnRpYWxzLCB7XG4gICAgICAgICAgICAgICAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXG4gICAgICAgICAgICAgICAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZXJ2ZXIgc2Vzc2lvbiByZWNvdmVyZWQuJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBhamF4PFQ+KG9wdGlvbnMpO1xuICAgICAgICAgICAgICAgICAgfSkpLmRvbmUocmVzb2x2ZVJlc3VsdCwgcmVqZWN0UmVzdWx0KTtcbiAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gZWFybHkgZXhpdCBhcyByZXN1bHQgaXMgaGFuZGxlZCBieSBkb25lIGNhbGwgYWJvdmVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBjb21wbGV0ZXMgdGhlIGNoYWluIHByb3BhZ2F0aW5nIHJlc3VsdHMsIG11c3QgYmUgc2tpcHBlZCB3aGVuIHJlcXVlc3QgaXMgcmV0cmllZCBhYm92ZVxuICAgICAgICAgIGlmIChwcm9taXNlUmVzcG9uc2UpIHtcbiAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuKChyZXNwb25zZVJlc3VsdDogaHR0cC5JbmNvbWluZ01lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gcmVzcG9uc2VSZXN1bHQgPT09IHJlc3AsICdkZWZpbml0aW9uIG9mIGJlaGF2aW9yIGluIGNhc2UgJyArXG4gICAgICAgICAgICAgICAgJ29mIHByb3h5aW5nIHRoZSBvcmlnaW5hbCByZXNwb25zZSBpcyByZXNlcnZlZCBmb3IgZnV0dXJlIGV4dGVuc2lvbiEnKTtcblxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZWplY3RSZXN1bHQoZXJyb3IpO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc29sdmVSZXN1bHQoYm9keSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIChyZXNwb25zZUVycm9yKSA9PiB7XG4gICAgICAgICAgICAgIHJlamVjdFJlc3VsdChyZXNwb25zZUVycm9yKTtcbiAgICAgICAgICAgIH0pLmRvbmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gcGF0aCB0YWtlbiB3aGVuIHJlcXVlc3QuanMgdGhyb3dzXG4gICAgICAgIHJldHVybiByZWplY3RSZXN1bHQoZXJyb3IpO1xuICAgICAgfVxuXG4gICAgICAvLyB0cmFuc3BvcnQgcmVzcG9uc2VcbiAgICAgIHRyeSB7XG4gICAgICAgIFEocmVxdWVzdENhbGxiYWNrKHJlcSkpLnRoZW4oKHJlcXVlc3QgPSByZXEpID0+IHtcbiAgICAgICAgICByZXF1ZXN0Lm9uKCdyZXNwb25zZScsIChyZXNwb25zZTogaHR0cC5JbmNvbWluZ01lc3NhZ2UpID0+IHtcbiAgICAgICAgICAgIGlmICghcmVzcCkge1xuICAgICAgICAgICAgICByZXNwID0gcmVzcG9uc2U7XG4gICAgICAgICAgICAgIHJlc29sdmVSZXNwb25zZShyZXNwb25zZUNhbGxiYWNrKHJlc3ApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICAgICAgfSkuZG9uZSgpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgLy8gcGF0aCB0YWtlbiB3aGVuIHJlcXVlc3RDYWxsYmFjayB0aHJvd3NcbiAgICAgICAgcmV0dXJuIHJlamVjdFJlc3BvbnNlKGVycm9yKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogcmVzcG9uc2UgZGF0YSBvZiBsb2dpbiBlbmRwb2ludHMuXG4gKlxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIFVzZXJJbmZvV3JhcHBlciBpbiBKYXZhIGNvZGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naW5SZXNwb25zZSB7XG4gIC8vIGNvbS5td2F5c29sdXRpb25zLmdvZmVyMi5zZWN1cml0eS5kb21haW4uVXNlckluZm9XcmFwcGVyXG4gIHVzZXI6IHJvbGVzLlVzZXI7XG4gIHJvbGVzOiByb2xlcy5Sb2xlRHRvW107XG4gIG9yZ2FuaXphdGlvbjogcm9sZXMuT3JnYW5pemF0aW9uO1xuXG4gIGxpY2Vuc2VJbmZvczoge1xuICAgIC8vIGNvbS5td2F5c29sdXRpb25zLmdvZmVyMi5zZWN1cml0eS5kb21haW4uTGljZW5zZUluZm9zXG4gICAgbGljZW5zZU1vZGVsTmFtZTogc3RyaW5nO1xuICAgIGxpY2Vuc2VJbmZvczogXy5EaWN0aW9uYXJ5PGFueT5cbiAgfTtcbiAgLyoqXG4gICAqIGxpc3RzIGV4cGVyaW1lbnRhbCBmZWF0dXJlcyBlbmFibGVkIG9uIHRoZSBzZXJ2ZXIuXG4gICAqL1xuICBhY3RpdmVGZWF0dXJlVG9nZ2xlcz86IHN0cmluZ1tdO1xuXG4gIC8qKlxuICAgKiBldmVudHVhbGx5IHJldHVybmVkIGRhdGEgb2YgdGhlIExvZ29uQ2FsbGJhY2sgaXMgc3RvcmVkIGhlcmUuXG4gICAqL1xuICBsb2dvbkluZm9zPzogYW55O1xufVxuXG4vKipcbiAqIG9wdGlvbnMgZm9yIHVzZSBieSBib3RoIFtbbG9naW5dXSBhbmQgW1tsb2dvdXRdXS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dvbk9wdGlvbnMgZXh0ZW5kcyBpbml0LlNlcnZlclVybE9wdGlvbnMge1xuXG4gIC8qKlxuICAgKiBzcGVjaWZpZXMgd2hldGhlciBsb2dpbiByZXNwb25zZSBkYXRhIGlzIHBlcnNpc3RlZCBzdWNoIHRoYXQgc3Vic2VxdWVudCBsb2dvbnMgY2FuIGJlXG4gICAqIHByb2Nlc3NlZCBldmVuIGlmIGNvbW11bmljYXRpb24gd2l0aCB0aGUgUmVsdXRpb24gc2VydmVyIGlzIGltcG9zc2libGUgYXQgdGhhdCB0aW1lLlxuICAgKlxuICAgKiBPbiBbW2xvZ2luXV0gc2V0IHRvIGB0cnVlYCB0byBwZXJzaXN0IHRoZSByZXNwb25zZSB0byBvZmZsaW5lIHN0b3JhZ2Ugc3VjaCB0aGF0XG4gICAqIHN1YnNlcXVlbnQgbG9nb24gdG8gdGhlIHNhbWUgc2VydmVyIHdpbGwgcmV1c2UgaXQgZXZlbiBhZnRlciB0aGUgY2xpZW50IGFwcCBpcyByZXN0YXJ0ZWQuXG4gICAqIFRoZSByZXNwb25zZSBkYXRhIGlzIHN0b3JlZCBpbiBlbmNyeXB0ZWQgZm9ybS4gT25jZSBzdG9yZWQsIGNhbGxpbmcgW1tsb2dpbl1dIHdpdGggdGhlXG4gICAqIHNhbWUgc2V0IG9mIGNyZWRlbnRpYWxzIHdpbGwgc3VjY2VlZCBldmVuIGlmIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgY2FuIG5vdCBiZSByZWFjaGVkLiBJblxuICAgKiB0aGlzIGNhc2UsIGNyZWRlbnRpYWxzIGFyZSB2ZXJpZmllZCBieSBkZWNyeXB0aW9uIG9mIHRoZSBlbmNyeXB0ZWQgcmVzcG9uc2UgZGF0YS5cbiAgICpcbiAgICogT24gW1tsb2dvdXRdXSBzZXQgdG8gYHRydWVgIHRvIHVsdGltYXRlbHkgZXJhc2UgdGhlIHJlc3BvbnNlIGZyb20gb2ZmbGluZSBzdG9yYWdlIGFzIHdlbGwsXG4gICAqIGFmdGVyIGhhdmluZyBpdCBzdG9yZWQgdXNpbmcgdGhlIG1lY2hhbmlzbSBkZXNjcmliZWQgYWJvdmUuXG4gICAqL1xuICBvZmZsaW5lQ2FwYWJsZT86IGJvb2xlYW47XG5cbn1cblxuLyoqXG4gKiBvcHRpb25zIHNwZWNpZmljIHRvIFtbbG9naW5dXSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dpbk9wdGlvbnMgZXh0ZW5kcyBMb2dvbk9wdGlvbnMsIGluaXQuU2VydmVySW5pdE9wdGlvbnMge1xufVxuXG4vKipcbiAqIGxvZ3MgaW50byBhIFJlbHV0aW9uIHNlcnZlci5cbiAqXG4gKiBOb3RpY2UsIHNwZWNpZnlpbmcgYG9mZmxpbmVDYXBhYmxlPXRydWVgIGluIHRoZSBvcHRpb25zIHdpbGwgc3RvcmUgdGhlIGxvZ2luIHJlc3BvbnNlIGxvY2FsbHkgb25cbiAqIHRoZSBkZXZpY2Ugd2hlbiBvbmxpbmUgYW5kIHRoZSBsb2dpbiBzdWNjZWVkZWQuIFdoZW4gb2ZmbGluZSwgdGhlIG9wdGlvbiB3aWxsIHJldXNlIHRoZSBzdG9yZWRcbiAqIHJlc3BvbnNlLiBEYXRhIGVuY3J5cHRpb24gaXMgdXNlZCBndWFyYW50ZWVpbmcgYm90aCBzZWNyZWN5IG9mIGxvZ2luIGRhdGEgYW5kIHZlcmlmaWNhdGlvbiBvZlxuICogdGhlIGNyZWRlbnRpYWxzIHByb3ZpZGVkLlxuICpcbiAqIEBwYXJhbSBjcmVkZW50aWFscyB0byB1c2UuXG4gKiBAcGFyYW0gbG9naW5PcHRpb25zIG92ZXJ3cml0aW5nIFtbaW5pdF1dIGRlZmF1bHRzLlxuICogQHJldHVybiB7US5Qcm9taXNlPExvZ2luUmVzcG9uc2U+fSBvZiBsb2dpbiByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgamF2YXNjcmlwdFxuICpcbiAqIGltcG9ydCAqIGFzIFJlbHV0aW9uIGZyb20gJ3JlbHV0aW9uLXNkayc7XG4gKiAvL2NvbmZpZ1xuICogUmVsdXRpb24uaW5pdCh7XG4gKiAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnXG4gKiB9KTtcbiAqXG4gKiBsZXQgY3JlZGVudGlhbHMgPSB7XG4gKiAgICB1c2VyTmFtZTogJ215dXNlcm5hbWUnLFxuICogICAgcGFzc3dvcmQ6ICdteXBhc3N3b3JkJ1xuICogfTtcbiAqXG4gKiAvL3VzYWdlXG4gKlxuICogLy8gUHJvbWlzZVxuICogUmVsdXRpb24ud2ViLmxvZ2luKGNyZWRlbnRpYWxzKVxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApOylcbiAqICAuY2F0Y2goKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKSlcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGUnKSk7XG4gKlxuICogLy9PYnNlcnZhYmxlXG4gKiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFJlbHV0aW9uLndlYi5sb2dpbihjcmVkZW50aWFscykpLnN1YnNjcmliZShcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApLFxuICogIChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSk7LFxuICogICgpID0+IGNvbnNvbGUubG9nKCdjb21wbGV0ZScpXG4gKiApXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ2luKGNyZWRlbnRpYWxzOiBhdXRoLkNyZWRlbnRpYWxzLFxuICAgICAgICAgICAgICAgICAgICAgIGxvZ2luT3B0aW9uczogTG9naW5PcHRpb25zID0ge30pOiBRLlByb21pc2U8TG9naW5SZXNwb25zZT4ge1xuICBsZXQgd2FzT2ZmbGluZUxvZ2luID0gZmFsc2U7XG4gIGxldCBzZXJ2ZXJVcmwgPSB1cmxzLnJlc29sdmVTZXJ2ZXIoJy8nLCBsb2dpbk9wdGlvbnMpO1xuICBsZXQgc2VydmVyT2JqID0gc2VydmVyLlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xuICBpZiAoc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xuICAgIC8vIGxvZ2dlZCBpbiBhbHJlYWR5XG4gICAgcmV0dXJuIGxvZ291dCh7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xuICAgICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCBsb2dpbk9wdGlvbnMpOyAvLyByZXBlYXQgYWZ0ZXIgbG9nb3V0XG4gICAgfSk7XG4gIH0gZWxzZSBpZiAoc2VydmVyT2JqLmNyZWRlbnRpYWxzKSB7XG4gICAgLy8gaGFkIGNyZWRlbnRpYWxzIGJ1dCBubyBzZXNzaW9uLCBzbyB3ZSB3ZXJlIGxvZ2dlZCBpbiBvZmZsaW5lXG4gICAgd2FzT2ZmbGluZUxvZ2luID0gdHJ1ZTtcbiAgfVxuXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xuICBsZXQgY3VycmVudE9wdGlvbnMgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBhZ2VudE9wdGlvbnM6IGxvZ2luT3B0aW9ucy5hZ2VudE9wdGlvbnMgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudE9wdGlvbnMsXG4gICAgYWdlbnRDbGFzczogbG9naW5PcHRpb25zLmFnZW50Q2xhc3MgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudENsYXNzLFxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCBsb2dpbiB0aW1lXG4gICAgY2xpZW50QXBwOiBsb2dpbk9wdGlvbnMuY2xpZW50QXBwIHx8IGluaXQuaW5pdE9wdGlvbnMuY2xpZW50QXBwLFxuICAgIGxvZ29uQ2FsbGJhY2s6IGxvZ2luT3B0aW9ucy5sb2dvbkNhbGxiYWNrIHx8IGluaXQuaW5pdE9wdGlvbnMubG9nb25DYWxsYmFjayxcbiAgICBjbGllbnRDZXJ0aWZpY2F0ZTogbG9naW5PcHRpb25zLmNsaWVudENlcnRpZmljYXRlIHx8IGluaXQuaW5pdE9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGVcbiAgfSk7XG4gIGxldCBsb2dvbkNhbGxiYWNrID0gY3VycmVudE9wdGlvbnMubG9nb25DYWxsYmFjayB8fCBfLmlkZW50aXR5O1xuICByZXR1cm4gYWpheDxMb2dpblJlc3BvbnNlPihfLmRlZmF1bHRzPEh0dHBPcHRpb25zPih7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5L3Jlc3QvYXV0aC9sb2dpbicsXG4gICAgYm9keTogY3JlZGVudGlhbHNcbiAgfSwgY3VycmVudE9wdGlvbnMpKS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgIC8vIHJlYWwgcGh5c2ljYWwgbG9nb24sIGFqYXggY2FsbCBzZXRzIHNlc3Npb25Vc2VyVXVpZFxuICAgIGlmICghc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdCVUc6IFJlbHV0aW9uIGRpZCBub3Qgc2V0IFgtR29mZXItVXNlciByZXNwb25zZSBoZWFkZXInKTtcbiAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSByZXNwb25zZS51c2VyLnV1aWQ7XG4gICAgfVxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPT09IHJlc3BvbnNlLnVzZXIudXVpZCk7XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9LCAoZXJyb3I6IEh0dHBFcnJvcikgPT4ge1xuICAgIC8vIG9mZmxpbmUgbG9naW4gcmVzcG9uc2VcbiAgICBpZiAoIWVycm9yLnN0YXR1c0NvZGUgJiYgbG9naW5PcHRpb25zLm9mZmxpbmVDYXBhYmxlKSB7XG4gICAgICAvLyBhamF4IHRpbWVvdXQgLT4gb2ZmbGluZSBsb2dpbiBhdHRlbXB0XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCxcbiAgICAgICAgJ25vIHBoeXNpY2FsIGxvZ2luLCBhcyBvdGhlcndpc2UgbG9nb25DYWxsYmFjayB3b3VsZCBiZSBleGVjdXRlZCcpO1xuICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zKS50aGVuKChsb2dpblJlc3BvbnNlKSA9PiB7XG4gICAgICAgIGlmICghbG9naW5SZXNwb25zZSkge1xuICAgICAgICAgIC8vIHdoZW4gdGhlcmUgaXMgbm8gcGVyc2lzdGVudCBkYXRhIGF2YWlsYWJsZSwgYWthLiB0aGlzIGlzIHRoZSBpbml0aWFsIGxvZ2luIGF0dGVtcHQsXG4gICAgICAgICAgLy8ga2VlcCBzYXlpbmcgdGhlIHNlcnZlciBpcyBvZmZsaW5lLi4uXG4gICAgICAgICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbG9naW5SZXNwb25zZTtcbiAgICAgIH0sIChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgLy8gbW9zdCBsaWtlbHkgdGhlIHBhc3N3b3JkIGVudGVyZWQgd2FzIGluY29ycmVjdCxcbiAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBvZmZsaW5lRXJyb3IgaW5kaWNhdGVzIHRoZSBzZXJ2ZXIgaXMgdW5hdmFpbGFibGUgYXMgd2VsbFxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLnN0YXR1c0NvZGUpO1xuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLnJlcXVlc3RVcmwpO1xuICAgICAgICBvZmZsaW5lRXJyb3IucmVxdWVzdFVybCA9IGVycm9yLnJlcXVlc3RVcmw7XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFvZmZsaW5lRXJyb3IuY2F1c2UpO1xuICAgICAgICBvZmZsaW5lRXJyb3IuY2F1c2UgPSBlcnJvcjtcbiAgICAgICAgLy8gd2UgcmV0aHJvdyB0aGUgYW5ub3RhdGVkIGVycm9yIG9mIGRlY29kaW5nIHRoZSBzdG9yZWQgcmVzcG9uc2UsXG4gICAgICAgIC8vIGJlY2F1c2UgdGhlIG5ldHdvcmsgZXJyb3IganVzdCBpbmRpY2F0ZXMgd2UgYXJlIG9mZmxpbmUgYW5kIGRvZXNcbiAgICAgICAgLy8gbm90IG1lbnRpb24gdGhlIGNyZWRlbnRpYWxzIGJlaW5nIGluY29ycmVjdCBhcyB0aGlzIG9uZSBkb2VzLi4uXG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihvZmZsaW5lRXJyb3IpO1xuICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChlcnJvci5zdGF0dXNDb2RlICYmIHdhc09mZmxpbmVMb2dpbikge1xuICAgICAgLy8gc2VydmVyIHNpZGUgcmVqZWN0aW9uLCBjbGVhciBsb2dpbiBkYXRhIHNvIHRoYXQgc3Vic2VxdWVudCBvZmZsaW5lIGxvZ2lucyBmYWlsIGFzIHdlbGxcbiAgICAgIHJldHVybiBvZmZsaW5lLmNsZWFyT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykuY2F0Y2goKG9mZmxpbmVFcnJvcikgPT4ge1xuICAgICAgICAvLyB0aGlzIGlzIGJhZCBidXQgd2UgY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0XG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xuICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgIC8vIHN3aXRjaCBjdXJyZW50IHNlcnZlclxuICAgIGlmICgncm9sZXMnIGluIHJlc3BvbnNlLnJvbGVzKSB7XG4gICAgICAvLyBmaXhlcyBhIGRlZmVjdCBvZiBKYXZhIGltcGxlbWVudGF0aW9uXG4gICAgICByZXNwb25zZS5yb2xlcyA9IHJlc3BvbnNlLnJvbGVzWydyb2xlcyddO1xuICAgIH1cbiAgICBzZXJ2ZXJPYmouYXV0aG9yaXphdGlvbiA9IHtcbiAgICAgIG5hbWU6IHJlc3BvbnNlLnVzZXIudXVpZCxcbiAgICAgIHJvbGVzOiBfLm1hcChyZXNwb25zZS5yb2xlcywgKHJvbGU6IHJvbGVzLlJvbGVEdG8pID0+IHJvbGUudXVpZClcbiAgICB9O1xuICAgIHNlcnZlck9iai5vcmdhbml6YXRpb24gPSByZXNwb25zZS5vcmdhbml6YXRpb247XG4gICAgc2VydmVyT2JqLnVzZXIgPSByZXNwb25zZS51c2VyO1xuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IGNyZWRlbnRpYWxzO1xuICAgIHNlcnZlci5zZXRDdXJyZW50U2VydmVyKHNlcnZlck9iaik7XG4gICAgcmV0dXJuIHJlc3BvbnNlO1xuICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xuICAgIC8vIHRoaXMgaXMgdGhlIGVhcmxpZXN0IHBvaW50IGF0IHdoaWNoIGxpYnJhcnkgc3RhdGUgcmVmbGVjdHMgY29ycmVjdCBhdXRob3JpemF0aW9uLCBldGMuXG4gICAgLy8gVGh1cywgdGhlIGxvZ29uQ2FsbGJhY2sgbWF5IGV4ZWN1dGUgaGVyZSBub3csIGJ1dCBvbmx5IGlmIHdlIGFyZSBvbmxpbmUgYWN0dWFsbHkuLi5cbiAgICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAgIHJldHVybiByZXNwb25zZTsgLy8gb2ZmbGluZVxuICAgIH1cbiAgICAvLyB3ZSBoYXZlIGEgc2Vzc2lvbiBsb2dnZWQgaW50byB0aGlzIHVzZXJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID09PSBzZXJ2ZXIuZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKS5uYW1lKTtcblxuICAgIC8vIHJ1biBsb2dvbkNhbGxiYWNrIG9uIHJlc3BvbnNlIGRhdGEgYW5kIGV2ZW50dWFsbHkgc3RvcmUgcmVzdWx0YW50IG9iamVjdCBmb3Igb2ZmbGluZSBsb2dpbixcbiAgICAvLyBiZWNhdXNlIHRoaXMgd2F5IHRoZSBjYWxsYmFjayBtYXkgYWRkIGluZm9ybWF0aW9uIHRvIHRoZSByZXNwb25zZSBvYmplY3QgdGhhdCB3aWxsIGFsc28gYmVcbiAgICAvLyBwZXJzaXN0ZWQgYW5kIG1hZGUgYXZhaWxhYmxlIGFnYWluIHdoZW4gb2ZmbGluZSFcbiAgICByZXR1cm4gUShsb2dvbkNhbGxiYWNrKHJlc3BvbnNlKSkudGhlbigobG9nb25JbmZvcyA9IHJlc3BvbnNlKSA9PiB7XG4gICAgICBpZiAobG9nb25JbmZvcyAmJiBsb2dvbkluZm9zICE9PSByZXNwb25zZSkge1xuICAgICAgICAvLyBhbnkgZGF0YSByZXR1cm5lZCBieSB0aGUgbG9nb25DYWxsYmFjayBtYXkgYmUgc3RvcmVkIGhlcmVcbiAgICAgICAgcmVzcG9uc2UubG9nb25JbmZvcyA9IGxvZ29uSW5mb3M7XG4gICAgICB9XG5cbiAgICAgIC8vIHN0b3JlIG9mZmxpbmUgbG9naW4gcmVzcG9uc2VcbiAgICAgIGlmIChsb2dpbk9wdGlvbnMub2ZmbGluZUNhcGFibGUgfHwgd2FzT2ZmbGluZUxvZ2luKSB7XG4gICAgICAgIC8vIGluaXRpYWwgc3RvcmUgb3IgdXBkYXRlIG9mIGxvZ2luIGRhdGFcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuc3RvcmVPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zLCByZXNwb25zZSkuY2F0Y2goXG4gICAgICAgICAgKG9mZmxpbmVFcnJvcikgPT4ge1xuICAgICAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdvZmZsaW5lIGxvZ2luIHN0b3JlIGZhaWxlZCcsIG9mZmxpbmVFcnJvcik7XG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgfSwgKGVycm9yKSA9PiB7XG4gICAgICAvLyBsb2dvbiBjYWxsYmFjayBmYWlsZWQsIG11c3QgbG9nb3V0IHRvIGF2b2lkIG1ha2luZyBhamF4IGNhbGxzIGluIGFuIHVua25vd24gYmFja2VuZCBzdGF0ZVxuICAgICAgcmV0dXJuIGxvZ291dCh7XG4gICAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXG4gICAgICB9KS5jYXRjaCgobG9nb3V0RXJyb3IpID0+IHtcbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignZmFpbGVkIHRvIGxvZ291dCBhZnRlciBsb2dpbiBmYWlsdXJlJywgbG9nb3V0RXJyb3IpO1xuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIC8vIGxvZ291dCBwcm9jZXNzaW5nIG11c3QgbGVhdmUgdXMgd2l0aCBubyB1c2VyIHNlc3Npb25cbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIG9wdGlvbnMgc3BlY2lmaWMgdG8gW1tsb2dvdXRdXSBmdW5jdGlvbi5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dvdXRPcHRpb25zIGV4dGVuZHMgTG9nb25PcHRpb25zLCBpbml0Lkh0dHBBZ2VudE9wdGlvbnMge1xufTtcblxuLyoqXG4gKiBsb2dzIG91dCBvZiBhIFJlbHV0aW9uIHNlcnZlci5cbiAqXG4gKiBGb3IgZXhwbGljaXQgbG9nb3V0cyAodHJpZ2dlciBieSBhcHAgdXNlciBwcmVzc2luZyBhIGxvZ291dCBidXR0b24sIGZvciBleGFtcGxlKSBzcGVjaWZ5aW5nXG4gKiBgb2ZmbGluZUNhcGFibGUgPSB0cnVlYCB3aWxsIGRyb3AgYW55IHBlcnNpc3RlZCBvZmZsaW5lIGxvZ2luIGRhdGEgZm9yIHRoZSBzZXJ2ZXIgbG9nZ2luZyBvdXRcbiAqIG9mLlxuICpcbiAqIEBwYXJhbSBsb2dvdXRPcHRpb25zIG92ZXJ3cml0aW5nIFtbaW5pdF1dIGRlZmF1bHRzLlxuICogQHJldHVybiB7US5Qcm9taXNlPHZvaWQ+fSBvZiBsb2dvdXQgcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGphdmFzY3JpcHRcbiAqXG4gKiBSZWx1dGlvbi53ZWIubG9nb3V0KClcbiAqICAudGhlbigocmVzcCkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKTspXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2J5ZSBieWUnKSk7XG4gKlxuICogLy9PYnNlcnZhYmxlXG4gKiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFJlbHV0aW9uLndlYi5sb2dvdXQoKSkuc3Vic2NyaWJlKFxuICogIChyZXNwOiBhbnkpID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCksXG4gKiAgKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXG4gKiAgKCkgPT4gY29uc29sZS5sb2coJ2J5ZSBieWUnKVxuICogKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2dvdXQobG9nb3V0T3B0aW9uczogTG9nb3V0T3B0aW9ucyA9IHt9KTogUS5Qcm9taXNlPHZvaWQ+IHtcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcignLycsIGxvZ291dE9wdGlvbnMpO1xuICBsZXQgc2VydmVyT2JqID0gc2VydmVyLlNlcnZlci5nZXRJbnN0YW5jZShzZXJ2ZXJVcmwpO1xuXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xuICBsZXQgY3VycmVudE9wdGlvbnMgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBhZ2VudE9wdGlvbnM6IGxvZ291dE9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxuICAgIGFnZW50Q2xhc3M6IGxvZ291dE9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXG4gICAgLy8gb3B0aW9ucyB0YWtpbmcgZWZmZWN0IGF0IGxvZ291dCB0aW1lXG4gIH0pO1xuICByZXR1cm4gYWpheDx2b2lkPihfLmRlZmF1bHRzPEh0dHBPcHRpb25zPih7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5L3Jlc3QvYXV0aC9sb2dvdXQnLFxuICAgIGJvZHk6IHt9XG4gIH0sIGN1cnJlbnRPcHRpb25zKSkuY2F0Y2goKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcbiAgICBpZiAoZXJyb3Iuc3RhdHVzQ29kZSA9PT0gNDIyKSB7XG4gICAgLy8gUkVTVC1iYXNlZCBsb2dvdXQgVVJMIGN1cnJlbnRseSBpcyBicm9rZW4gcmVwb3J0aW5nIGEgNDIyIGluIGFsbCBjYXNlc1xuICAgICAgcmV0dXJuIGFqYXg8dm9pZD4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xuICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgICBtZXRob2Q6ICdHRVQnLFxuICAgICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5LWxvZ291dCdcbiAgICB9LCBjdXJyZW50T3B0aW9ucykpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ0JVRzogcmVzb3J0ZWQgdG8gY2xhc3NpYyBQQVRILWJhc2VkIGxvZ291dCBhcyBSRVNULWJhc2VkIGxvZ291dCBmYWlsZWQ6JyxcbiAgICAgICAgICBlcnJvcik7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgfSwgKGVycm9yMjogSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcjIuc3RhdHVzQ29kZSA9PT0gNDIyID8gZXJyb3IgOiBlcnJvcjIpO1xuICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xuICB9KS5jYXRjaCgoZXJyb3I6IEh0dHBFcnJvcikgPT4ge1xuICAgIC8vIGlnbm9yZSBuZXR3b3JrIGZhaWx1cmVzIG9uIHRpbWVvdXQsIHNlcnZlciBmb3JnZXRzIG9uIHNlc3Npb24gdGltZW91dCBhbnl3YXlzXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlKSB7XG4gICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XG4gICAgfVxuICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XG4gIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgIC8vIGV2ZW50dWFsbHkgZXJhc2Ugb2ZmbGluZSBsb2dpbiBkYXRhXG4gICAgaWYgKGxvZ291dE9wdGlvbnMub2ZmbGluZUNhcGFibGUpIHtcbiAgICAgIC8vIHJlcXVlc3RlZCB0byBlcmFzZSBsb2dpbiBkYXRhXG4gICAgICByZXR1cm4gb2ZmbGluZS5jbGVhck9mZmxpbmVMb2dpbihzZXJ2ZXJPYmouY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zKS5jYXRjaChcbiAgICAgICAgKG9mZmxpbmVFcnJvcikgPT4ge1xuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ2ZhaWxlZCBlcmFzaW5nIG9mZmxpbmUgbG9naW4gZGF0YScsIG9mZmxpbmVFcnJvcik7XG4gICAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgLy8gZm9yZ2V0IGV2ZXJ5dGhpbmcgYWJvdXQgaXRcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xuICAgIHNlcnZlck9iai5hdXRob3JpemF0aW9uID0gYXV0aC5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTjtcbiAgICBzZXJ2ZXJPYmoub3JnYW5pemF0aW9uID0gbnVsbDtcbiAgICBzZXJ2ZXJPYmoudXNlciA9IG51bGw7XG4gICAgc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9IG51bGw7XG4gIH0pO1xufVxuIl19