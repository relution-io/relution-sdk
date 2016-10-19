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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLElBQVksSUFBSSxXQUFNLE1BQU0sQ0FBQyxDQUFBO0FBRTdCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFekMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUVyQyw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNy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dEMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDakMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQzNFLFVBQUMsWUFBWTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgd2ViL2h0dHAudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIHdlYlxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcblxyXG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xyXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5pbXBvcnQgKiBhcyBpbml0IGZyb20gJy4uL2NvcmUvaW5pdCc7XHJcbmltcG9ydCAqIGFzIGF1dGggZnJvbSAnLi4vc2VjdXJpdHkvYXV0aCc7XHJcbmltcG9ydCAqIGFzIHJvbGVzIGZyb20gJy4uL3NlY3VyaXR5L3JvbGVzJztcclxuaW1wb3J0ICogYXMgc2VydmVyIGZyb20gJy4uL3NlY3VyaXR5L3NlcnZlcic7XHJcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi91cmxzJztcclxuaW1wb3J0ICogYXMgb2ZmbGluZSBmcm9tICcuL29mZmxpbmUnO1xyXG5cclxuLy8gcmVxdWlyZSByZXF1ZXN0LmpzIHRvIG1hbmFnZSBjb29raWVzIGZvciB1c1xyXG5sZXQgcmVxdWVzdERlZmF1bHRzID0ge1xyXG4gIGpzb246IHRydWUsXHJcbiAgamFyOiB0cnVlLFxyXG4gIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG59O1xyXG5sZXQgcmVxdWVzdFdpdGhEZWZhdWx0cyA9IHJlcXVlc3QuZGVmYXVsdHMocmVxdWVzdERlZmF1bHRzKTtcclxuXHJcbi8qKlxyXG4gKiBjYWxsYmFjayBhbGxvd2luZyBjdXN0b21pemluZyBhbiBvYmplY3Qgbm90IGltbWVkaWF0ZWx5IGF2YWlsYWJsZSBhdCB0aW1lIG9mIGNhbGwuXHJcbiAqXHJcbiAqIEBwYXJhbSBvYmplY3QgZm9yIGluc3BlY3Rpb24gb3IgY3VzdG9taXphdGlvbi5cclxuICogQHJldHVybiBwcm9taXNlIG9yIG9iamVjdCBvbiBzYW1lIGRlZmVycmVkIG9iamVjdC5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSHR0cENhbGxiYWNrPFQ+IHtcclxuICAodmFsdWU6IFQpOiBRLlByb21pc2U8VD4gfCBUO1xyXG59XHJcblxyXG4vKipcclxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVxdWVzdC5cclxuICovXHJcbmV4cG9ydCB0eXBlIEh0dHBSZXF1ZXN0ID0gcmVxdWVzdC5SZXF1ZXN0O1xyXG4vKipcclxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVzcG9uc2UuXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBIdHRwUmVzcG9uc2UgPSBodHRwLkluY29taW5nTWVzc2FnZTtcclxuXHJcbi8qKlxyXG4gKiBuYW1lZCBwYXJhbWV0ZXJzIG9mIHRoZSBbW2h0dHBdXSBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSHR0cE9wdGlvbnMgZXh0ZW5kcyByZXF1ZXN0LkNvcmVPcHRpb25zLCByZXF1ZXN0LlVybE9wdGlvbnMsXHJcbiAgICBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcclxuICAvKipcclxuICAgKiBvcHRpb25hbCBjYWxsYmFjayBhbGxvd2luZyB0byBjdXN0b21pemUgdGhlIGNsaWVudCByZXF1ZXN0IGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcclxuICAgKiBkZWZhdWx0LlxyXG4gICAqL1xyXG4gIHJlcXVlc3RDYWxsYmFjaz86IEh0dHBDYWxsYmFjazxIdHRwUmVxdWVzdD47XHJcbiAgLyoqXHJcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gaW5zcGVjdCB0aGUgc2VydmVyIHJlc3BvbnNlIGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcclxuICAgKiBkZWZhdWx0LlxyXG4gICAqL1xyXG4gIHJlc3BvbnNlQ2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlc3BvbnNlPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIGZhaWx1cmUgb2YgYW4gYWpheCByZXF1ZXN0LlxyXG4gKlxyXG4gKiBUaGlzIHR5cGUgY2FuIGJlIHVzZWQgYXMgdHlwZSBhbm5vdGF0aW9uIG9mIHRoZSBlcnJvciB0aGUgUHJvbWlzZSByZXR1cm5lZCBieSBhamF4IGlzIHJlamVjdGVkXHJcbiAqIHdpdGguXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgLyoqXHJcbiAgICogZnVsbHkgcmVzb2x2ZWQgdXJsIHRoZSByZXF1ZXN0IHdhcyBzZW50IHRvLlxyXG4gICAqL1xyXG4gIHJlcXVlc3RVcmw/OiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEhUVFAgc3RhdHVzIGNvZGUgb2YgZmFpbHVyZS5cclxuICAgKi9cclxuICBzdGF0dXNDb2RlPzogbnVtYmVyO1xyXG4gIC8qKlxyXG4gICAqIEhUVFAgc3RhdHVzIG1lc3NhZ2Ugb2YgZmFpbHVyZS5cclxuICAgKi9cclxuICBzdGF0dXNNZXNzYWdlPzogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBpbiBtYW55IGNhc2VzIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgcmVwb3J0cyBoZXJlIHRoZSBmdWxseSBxdWFsaWZpZWQgbmFtZSBvZiBhIEphdmEgRXhjZXB0aW9uXHJcbiAgICogdGhhdCBtYXkgYmUgdXNlZCB0byBmdXJ0aGVyIGRpZmZlcmVudGlhdGUgdGhlIGVycm9yLlxyXG4gICAqL1xyXG4gIGNsYXNzTmFtZT86IHN0cmluZztcclxuICAvKipcclxuICAgKiBtYXkgYmUgc2V0IHRvIHNvbWUgYXJiaXRyYXJ5IHZhbHVlIGRlc2NyaWJpbmcgdGhlIGNhdXNlIG9mIGZhaWx1cmUsIG1vc3RseSBwcmVzZW50IHdoZW5cclxuICAgKiB0cmFuc3BvcnRpbmcgSmF2YSBFeGNlcHRpb24gb2JqZWN0cy5cclxuICAgKi9cclxuICBjYXVzZT86IGFueTtcclxuXHJcbiAgLyoqXHJcbiAgICogZGV0YWlscyBvZiByZXF1ZXN0IGZhaWxlZC5cclxuICAgKlxyXG4gICAqIFRoaXMgaXMgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBhbmQgdGh1cyBub3QgcGFydCBvZiB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZmFpbHVyZS5cclxuICAgKiBJdCBpcyBwcm92aWRlZCBmb3IgaW5mb3JtYWwgcHVycG9zZXMgYXMgYSBkZWJ1Z2dpbmcgYWlkIG9ubHkuIENsaWVudCBjb2RlIHNob3VsZCBub3QgcmVseSBvblxyXG4gICAqIHRoaXMgdmFsdWUuXHJcbiAgICpcclxuICAgKiBAc2VlIHJlc3BvbnNlXHJcbiAgICovXHJcbiAgcmF3UmVxdWVzdD86IEh0dHBSZXF1ZXN0O1xyXG4gIC8qKlxyXG4gICAqIGRldGFpbHMgb2YgcmVzcG9uc2UgZmFpbGVkLlxyXG4gICAqXHJcbiAgICogVGhpcyBpcyBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IGFuZCB0aHVzIG5vdCBwYXJ0IG9mIHRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmYWlsdXJlLlxyXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXHJcbiAgICogdGhpcyB2YWx1ZS5cclxuICAgKlxyXG4gICAqIEBzZWUgcmVxdWVzdFxyXG4gICAqL1xyXG4gIHJhd1Jlc3BvbnNlPzogSHR0cFJlc3BvbnNlO1xyXG59XHJcblxyXG4vKipcclxuICogZHJpdmVzIGFuIEhUVFAgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIEJlaGF2aW9yIG9mIHRoaXMgbWV0aG9kIGlzIHNpbXBsaWZpZWQgZnJvbSBtb3N0IEhUVFAvQUpBWCBpbXBsZW1lbnRhdGlvbnM6XHJcbiAqIC0gV2hlbiB0aGUgSFRUUCByZXF1ZXN0IHN1Y2NlZWRzIHRoZSByZXN1bHRpbmcgcHJvbWlzZSByZXNvbHZlcyB0byB0aGUgcmVzcG9uc2UgYm9keS5cclxuICogLSBJbiBjYXNlIG9mIGEgbmV0d29yayBFcnJvciB0aGUgcHJvbWlzZSByZXNvbHZlcyB0byBhbiBIdHRwRXJyb3Igb2JqZWN0IHByb3ZpZGluZyBgcmVxdWVzdFVybGBcclxuICogICBidXQgbmVpdGhlciBgc3RhdHVzQ29kZWAgbm9yIGBzdGF0dXNNZXNzYWdlYC5cclxuICogLSBJbiBjYXNlIG9mIEhUVFAgZmFpbHVyZSB0aGUgcmVzdWx0aW5nIHByb21pc2UgaXMgcmVqZWN0ZWQgdG8gYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0IGNhcnJ5aW5nXHJcbiAqICAgdGhlIHByb3BlcnRpZXMgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICogLSBJZiB0aGUgc2VydmVyIHJlc3BvbmRzIGEgSlNPTiwgaXQgaXMgcGFyc2VkIGFuZCBhc3N1bWVkIHRvIGJlIGFuIEh0dHBFcnJvci1saWtlIG9iamVjdC4gVGhlXHJcbiAqICAgb2JqZWN0IGlzIGF1Z21lbnRlZCBieSB0aGUgcHJvcGVydGllcyBhcyBkZWZpbmVkIGFib3ZlLlxyXG4gKiAtIE90aGVyd2lzZSB0aGUgYm9keSBpcyBzdG9yZWQgYXMgYG1lc3NhZ2VgIG9mIGFuIEh0dHBFcnJvciBvYmplY3QgY3JlYXRlZC4gQWdhaW4sIHRoZSBwcm9wZXJ0aWVzXHJcbiAqICAgYWJvdmUgYXJlIHByb3ZpZGVkLlxyXG4gKiAtIEZpbmFsbHksIGluIGNhc2Ugb2YgSFRUUCBmYWlsdXJlIHdpdGggdGhlIHNlcnZlciBub3QgcHJvdmlkaW5nIGFueSByZXNwb25zZSBib2R5LCB0aGUgSHR0cEVycm9yXHJcbiAqICAgYG1lc3NhZ2VgIGlzIHNldCB0byB0aGUgYHN0YXR1c01lc3NhZ2VgLlxyXG4gKlxyXG4gKiBUaHVzLCB0byBkaWZmZXJlbnRpYXRlIG5ldHdvcmsgZmFpbHVyZXMgZnJvbSBzZXJ2ZXItc2lkZSBmYWlsdXJlcyB0aGUgYHN0YXR1c0NvZGVgIG9mIHRoZVxyXG4gKiBIdHRwRXJyb3IgcmVqZWN0aW9uIGlzIHRvIGJlaW5nIHVzZWQuIEZvciBkZWVwZXIgaW5zcGVjdGlvbiBwcm92aWRlIGFuXHJcbiAqIFtbb3B0aW9ucy5yZXNwb25zZUNhbGxiYWNrXV0uXHJcbiAqXHJcbiAqIGBgYGphdmFzY3JpcHRcclxuICogUmVsdXRpb24uaW5pdCh7XHJcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXHJcbiAqICAgIG9yZ2FuaXphdGlvbjogJ215T3JnYSdcclxuICogfSk7XHJcbiAqXHJcbiAqIGxldCBodHRwT3B0aW9uczogSHR0cE9wdGlvbnMgPSB7bWV0aG9kOiAnR0VUJywgdXJsOiAnYXBpL3YxL3Bvc3RzJ307XHJcbiAqXHJcbiAqIC8vdXNhZ2UgYXMgUHJvbWlzZVxyXG4gKiBSZWx1dGlvbi53ZWIuYWpheChodHRwT3B0aW9ucylcclxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKTspXHJcbiAqICAuY2F0Y2goKGU6UmVsdXRpb24ud2ViLkh0dHBFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxyXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2xvYWRpbmcgY29tcGxldGUhJykpO1xyXG4gKlxyXG4gKiAvLyBhcyBPYnNlcnZhYmxlXHJcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmFqYXgoaHR0cE9wdGlvbnMpKS5zdWJzY3JpYmUoXHJcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKSxcclxuICogIChlOlJlbHV0aW9uLndlYi5IdHRwRXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXHJcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnbG9hZGluZyBjb21wbGV0ZSEnKVxyXG4gKiApXHJcbiAqIGBgYFxyXG4gKiBAcGFyYW0gb3B0aW9ucyBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEh0dHBFcnJvciBvYmplY3RcclxuICogICAgaW5jbHVkaW5nIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWpheDxUPihvcHRpb25zOiBIdHRwT3B0aW9ucyk6IFEuUHJvbWlzZTxUPiB7XHJcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcihvcHRpb25zLnVybCwgb3B0aW9ucyk7XHJcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcclxuICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgJiYgc2VydmVyT2JqLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAvLyBub3QgbG9nZ2VkIGluXHJcbiAgICBsZXQgY3JlZGVudGlhbHMgPSBzZXJ2ZXJPYmouY3JlZGVudGlhbHM7XHJcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xyXG4gICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCB7XHJcbiAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXHJcbiAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLmNyZWRlbnRpYWxzID09IGNyZWRlbnRpYWxzKTtcclxuICAgICAgcmV0dXJuIGFqYXg8VD4ob3B0aW9ucyk7IC8vIHJlcGVhdCBhZnRlciBsb2dpblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBwcm9jZXNzIG9wdGlvbnNcclxuICBsZXQgY3VycmVudE9wdGlvbnMgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcclxuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxyXG4gICAgYWdlbnRPcHRpb25zOiBvcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcclxuICAgIGFnZW50Q2xhc3M6IG9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXHJcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgcmVxdWVzdCB0aW1lXHJcbiAgICBhcHBsaWNhdGlvbjogb3B0aW9ucy5hcHBsaWNhdGlvbiB8fCBpbml0LmluaXRPcHRpb25zLmFwcGxpY2F0aW9uLFxyXG4gICAgdGVuYW50T3JnYTogb3B0aW9ucy50ZW5hbnRPcmdhIHx8IGluaXQuaW5pdE9wdGlvbnMudGVuYW50T3JnYVxyXG4gIH0pO1xyXG5cclxuICAvLyByZXNvbHZlIHRhcmdldCB1cmxcclxuICBsZXQgdXJsID0gdXJscy5yZXNvbHZlVXJsKG9wdGlvbnMudXJsLCBjdXJyZW50T3B0aW9ucyk7XHJcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZyhvcHRpb25zLm1ldGhvZCArICcgJyArIHVybCk7XHJcbiAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gdXJsLnN1YnN0cigwLCBzZXJ2ZXJVcmwubGVuZ3RoKSA9PT0gc2VydmVyVXJsKTtcclxuXHJcbiAgbGV0IHJlcXVlc3RDYWxsYmFjayA9IG9wdGlvbnMucmVxdWVzdENhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XHJcbiAgbGV0IHJlc3BvbnNlQ2FsbGJhY2sgPSBvcHRpb25zLnJlc3BvbnNlQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcclxuICBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zKTtcclxuICBvcHRpb25zLmFnZW50T3B0aW9ucyA9IGN1cnJlbnRPcHRpb25zLmFnZW50T3B0aW9ucztcclxuICBvcHRpb25zLmFnZW50Q2xhc3MgPSBjdXJyZW50T3B0aW9ucy5hZ2VudENsYXNzO1xyXG4gIGxldCBoZWFkZXJzID0ge307XHJcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcclxuICAgIC8vIGFkZCBYLUdvZmVyLVVzZXIgaGVhZGVyIHNvIHRoYXQgc2VydmVyIG1heSBjaGVjayB3ZSBhcmUgcnVubmluZyB1bmRlciBjb3JyZWN0IGlkZW50aXR5XHJcbiAgICBoZWFkZXJzWydYLUdvZmVyLVVzZXInXSA9IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQ7XHJcbiAgfVxyXG4gIGlmIChjdXJyZW50T3B0aW9ucy5jbGllbnRBcHApIHtcclxuICAgIC8vIGFkZCBYLVJlbHV0aW9uLUNsaWVudEFwcCBmb3Igc2VydmVyLXNpZGUgYW5hbHl0aWNzXHJcbiAgICBoZWFkZXJzWydYLVJlbHV0aW9uLUNsaWVudEFwcCddID0gY3VycmVudE9wdGlvbnMuY2xpZW50QXBwO1xyXG4gIH1cclxuICBpZiAoIV8uaXNFbXB0eShoZWFkZXJzKSkge1xyXG4gICAgb3B0aW9ucy5oZWFkZXJzID0gXy5kZWZhdWx0cyhoZWFkZXJzLCBvcHRpb25zLmhlYWRlcnMpO1xyXG4gIH1cclxuICByZXR1cm4gUS5Qcm9taXNlPFQ+KChyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpID0+IHtcclxuICAgIGxldCBwcm9taXNlUmVzcG9uc2UgPSBRLlByb21pc2UoKHJlc29sdmVSZXNwb25zZSwgcmVqZWN0UmVzcG9uc2UpID0+IHtcclxuICAgICAgbGV0IHJlc3A6IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xyXG4gICAgICBsZXQgcmVxOiByZXF1ZXN0LlJlcXVlc3Q7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpIHtcclxuICAgICAgICAgIC8vIGFwcGx5IGNlcnRpZmljYXRlIG9wdGlvbnNcclxuICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXEgPSByZXF1ZXN0V2l0aERlZmF1bHRzKHVybCwgb3B0aW9ucywgKGVycm9yOiBIdHRwRXJyb3IsIHJlc3BvbnNlID0gcmVzcCwgYm9keT86IGFueSkgPT4ge1xyXG4gICAgICAgICAgLy8gbm9kZS5qcyBhc3NpZ25zIHN0YXR1cyBzdHJpbmcgYXMgYm9keSBmb3Igc3RhdHVzIGNvZGVzIG5vdCBoYXZpbmcgYm9keSBkYXRhXHJcbiAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAyKSB7XHJcbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KGJvZHkgPT09IGh0dHAuU1RBVFVTX0NPREVTWzIwMl0sIGJvZHkpO1xyXG4gICAgICAgICAgICBib2R5ID0gdW5kZWZpbmVkOyAvLyByZXNvbHZlcyBwcm9taXNlIHRvIHVuZGVmaW5lZCBiZWxvd1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIGVycm9yIHByb2Nlc3NpbmdcclxuICAgICAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSA0MDApIHtcclxuICAgICAgICAgICAgaWYgKF8uaXNFcnJvcihib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIGNvcnJlY3QgYnV0IHByYWN0aWNhbGx5IGltcG9zc2libGVcclxuICAgICAgICAgICAgICBlcnJvciA9IGJvZHk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIHVzZSBwbGFpbi10ZXh0IGFzIEVycm9yIG1lc3NhZ2VcclxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihib2R5KTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0TGlrZShib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIGJvZHkgaXMgb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHNlcnZlci1zaWRlIGVycm9yIG9yIGV4Y2VwdGlvbixcclxuICAgICAgICAgICAgICAvLyBjb252ZXJ0aW5nIHRvIHRydWUgRXJyb3Igb2JqZWN0IGhlcmVcclxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNNZXNzYWdlKTtcclxuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhXy5pc0FycmF5KGJvZHkpLFxyXG4gICAgICAgICAgICAgICAgJ2tpY2tzIGluIGZvciBhcnJheSByZXNwb25zZXMgYXMgd2VsbCwgbm90IHN1cmUgaWYgdGhpcyBpcyBkZXNpcmFibGUnKTtcclxuICAgICAgICAgICAgICBfLmV4dGVuZChlcnJvciwgYm9keSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaGFuZGxlcyBudW1iZXJzLCBib29sZWFucywgZXRjLiBhc3NpZ25pbmcgYXMgY2F1c2Ugb2YgZmFpbHVyZVxyXG4gICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c01lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgIGlmICghXy5pc1VuZGVmaW5lZChib2R5KSkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3IuY2F1c2UgPSBib2R5O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBhZGRpdGlvbmFsIEh0dHBFcnJvciBwcm9wZXJ0aWVzIGV2ZW50dWFsbHkgc2V0IGJlbG93XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgLy8gY29tcGxldGVzIEh0dHBFcnJvciBjb25zdHJ1Y3Rpb25cclxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yLCAnc2hvdWxkIG9wZXJhdGUgdHJ1ZSBFcnJvciBpbnN0YW5jZXMnKTtcclxuICAgICAgICAgICAgZXJyb3IucmVxdWVzdFVybCA9IHVybDtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzQ29kZSA9IHJlc3BvbnNlLnN0YXR1c0NvZGU7XHJcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVzcG9uc2UnLCB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzcG9uc2UsXHJcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlcnJvciwgJ3Jhd1JlcXVlc3QnLCB7XHJcbiAgICAgICAgICAgICAgdmFsdWU6IHJlcSxcclxuICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIG5ldHdvcmsgY29ubmVjdGl2aXR5IHByb2JsZW1cclxuICAgICAgICAgICAgc2VydmVyT2JqLnNlcnZlckluZm9zID0gbnVsbDtcclxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgaWYgKHByb21pc2VSZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIHJlamVjdFJlc3BvbnNlKGVycm9yKTsgLy8gd2lsbCBhbHNvIHJlamVjdFJlc3VsdChlcnJvcilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZWplY3RSZXN1bHQoZXJyb3IpOyAvLyBwcm9taXNlUmVzcG9uc2Ugbm90IGNvbnN0cnVjdGVkIHlldFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBzZXJ2ZXIgaW5mb3JtYXRpb25cclxuICAgICAgICAgICAgc2VydmVyT2JqLnNlcnZlckluZm9zID0ge1xyXG4gICAgICAgICAgICAgIHZlcnNpb246IHJlc3AuaGVhZGVyc1sneC1yZWx1dGlvbi12ZXJzaW9uJ10sXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IHJlc3AuaGVhZGVyc1sneC1zZXJ2ZXInXVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gNTAzIHx8XHJcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXNDb2RlID09PSA1MDAgJiYgZXJyb3IuY2xhc3NOYW1lID09PSAnamF2YS51dGlsLmNvbmN1cnJlbnQuVGltZW91dEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgICAvLyA1MDMgKHNlcnZpY2UgdW5hdmFpbGFibGUpIGluZGljYXRlcyB0aGUgc2VydmVyIGlzIHRlbXBvcmFyaWx5IG92ZXJsb2FkZWQsIGFuZCB1bmFibGVcclxuICAgICAgICAgICAgICAvLyBoYW5kbGluZyB0aGUgcmVxdWVzdC4gVGhpcyBoYXBwZW5zIHdoZW4gYXN5bmMgZGVsZWdhdGlvbiB0aW1lZCBvdXQgb24gdGhlIEphdmEgc2lkZSxcclxuICAgICAgICAgICAgICAvLyB1c3VhbGx5IGFmdGVyIGFib3V0IDIgbWludXRlcy4gSW4gdGhpcyBjYXNlIHJldHJ5IHRoZSByZXF1ZXN0IHVudGlsIHdlIGFyZSBkb25lLi4uXHJcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZXJ2ZXIgb3ZlcmxvYWRlZCwgcmV0cnlpbmcgcmVxdWVzdC4nKTtcclxuICAgICAgICAgICAgICAvLyBoZXJlIHByb21pc2VSZXNwb25zZSBtdXN0IGhhdmUgYmVlbiByZXNvbHZlZCBhbHJlYWR5LFxyXG4gICAgICAgICAgICAgIC8vIHdlIGNoYWluIGFueXdheXMgYmVjYXVzZSBvZiBlcnJvciBwcm9wYWdhdGlvblxyXG4gICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShhamF4PFQ+KG9wdGlvbnMpKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgcmV0dXJuOyAvLyBlYXJseSBleGl0IGFzIHJlc3VsdCBpcyBoYW5kbGVkIGJ5IGRvbmUgY2FsbCBhYm92ZVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGxvZ29uIHNlc3Npb24gcHJvY2Vzc2luZ1xyXG4gICAgICAgICAgICAgIGxldCBzZXNzaW9uVXNlclV1aWQgPSByZXNwLmhlYWRlcnNbJ3gtZ29mZXItdXNlciddO1xyXG4gICAgICAgICAgICAgIGlmIChzZXNzaW9uVXNlclV1aWQpIHtcclxuICAgICAgICAgICAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBzZXNzaW9uVXNlclV1aWQ7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSA0MDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIGFwcGFyZW50bHkgb3VyIHNlc3Npb24gaXMgbG9zdCFcclxuICAgICAgICAgICAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFlcnJvcik7XHJcbiAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3NlcnZlciBzZXNzaW9uIGlzIGxvc3QhJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3JlZGVudGlhbHMgPSBzZXJ2ZXJPYmouY3JlZGVudGlhbHM7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3JlZGVudGlhbHMpIHtcclxuICAgICAgICAgICAgICAgICAgLy8gcmVjb3ZlciBieSBhdHRlbXB0aW5nIGxvZ2luLFxyXG4gICAgICAgICAgICAgICAgICAvLyBoZXJlIHByb21pc2VSZXNwb25zZSBtdXN0IGhhdmUgYmVlbiByZXNvbHZlZCBhbHJlYWR5LFxyXG4gICAgICAgICAgICAgICAgICAvLyB3ZSBjaGFpbiBhbnl3YXlzIGJlY2F1c2Ugb2YgZXJyb3IgcHJvcGFnYXRpb25cclxuICAgICAgICAgICAgICAgICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gbnVsbDtcclxuICAgICAgICAgICAgICAgICAgcHJvbWlzZVJlc3BvbnNlLnRoZW5SZXNvbHZlKGxvZ2luKGNyZWRlbnRpYWxzLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcclxuICAgICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcclxuICAgICAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NlcnZlciBzZXNzaW9uIHJlY292ZXJlZC4nKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWpheDxUPihvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgICAgfSkpLmRvbmUocmVzb2x2ZVJlc3VsdCwgcmVqZWN0UmVzdWx0KTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBlYXJseSBleGl0IGFzIHJlc3VsdCBpcyBoYW5kbGVkIGJ5IGRvbmUgY2FsbCBhYm92ZVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIGNvbXBsZXRlcyB0aGUgY2hhaW4gcHJvcGFnYXRpbmcgcmVzdWx0cywgbXVzdCBiZSBza2lwcGVkIHdoZW4gcmVxdWVzdCBpcyByZXRyaWVkIGFib3ZlXHJcbiAgICAgICAgICBpZiAocHJvbWlzZVJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuKChyZXNwb25zZVJlc3VsdDogaHR0cC5JbmNvbWluZ01lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiByZXNwb25zZVJlc3VsdCA9PT0gcmVzcCwgJ2RlZmluaXRpb24gb2YgYmVoYXZpb3IgaW4gY2FzZSAnICtcclxuICAgICAgICAgICAgICAgICdvZiBwcm94eWluZyB0aGUgb3JpZ2luYWwgcmVzcG9uc2UgaXMgcmVzZXJ2ZWQgZm9yIGZ1dHVyZSBleHRlbnNpb24hJyk7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KGVycm9yKTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlc3VsdChib2R5KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIChyZXNwb25zZUVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KHJlc3BvbnNlRXJyb3IpO1xyXG4gICAgICAgICAgICB9KS5kb25lKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgLy8gcGF0aCB0YWtlbiB3aGVuIHJlcXVlc3QuanMgdGhyb3dzXHJcbiAgICAgICAgcmV0dXJuIHJlamVjdFJlc3VsdChlcnJvcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHRyYW5zcG9ydCByZXNwb25zZVxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIFEocmVxdWVzdENhbGxiYWNrKHJlcSkpLnRoZW4oKHJlcXVlc3QgPSByZXEpID0+IHtcclxuICAgICAgICAgIHJlcXVlc3Qub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlOiBodHRwLkluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoIXJlc3ApIHtcclxuICAgICAgICAgICAgICByZXNwID0gcmVzcG9uc2U7XHJcbiAgICAgICAgICAgICAgcmVzb2x2ZVJlc3BvbnNlKHJlc3BvbnNlQ2FsbGJhY2socmVzcCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIHJldHVybiByZXF1ZXN0O1xyXG4gICAgICAgIH0pLmRvbmUoKTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAvLyBwYXRoIHRha2VuIHdoZW4gcmVxdWVzdENhbGxiYWNrIHRocm93c1xyXG4gICAgICAgIHJldHVybiByZWplY3RSZXNwb25zZShlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogcmVzcG9uc2UgZGF0YSBvZiBsb2dpbiBlbmRwb2ludHMuXHJcbiAqXHJcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byBVc2VySW5mb1dyYXBwZXIgaW4gSmF2YSBjb2RlLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcclxuICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLlVzZXJJbmZvV3JhcHBlclxyXG4gIHVzZXI6IHJvbGVzLlVzZXI7XHJcbiAgcm9sZXM6IHJvbGVzLlJvbGVEdG9bXTtcclxuICBvcmdhbml6YXRpb246IHJvbGVzLk9yZ2FuaXphdGlvbjtcclxuXHJcbiAgbGljZW5zZUluZm9zOiB7XHJcbiAgICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLkxpY2Vuc2VJbmZvc1xyXG4gICAgbGljZW5zZU1vZGVsTmFtZTogc3RyaW5nO1xyXG4gICAgbGljZW5zZUluZm9zOiBfLkRpY3Rpb25hcnk8YW55PlxyXG4gIH07XHJcbiAgLyoqXHJcbiAgICogbGlzdHMgZXhwZXJpbWVudGFsIGZlYXR1cmVzIGVuYWJsZWQgb24gdGhlIHNlcnZlci5cclxuICAgKi9cclxuICBhY3RpdmVGZWF0dXJlVG9nZ2xlcz86IHN0cmluZ1tdO1xyXG5cclxuICAvKipcclxuICAgKiBldmVudHVhbGx5IHJldHVybmVkIGRhdGEgb2YgdGhlIExvZ29uQ2FsbGJhY2sgaXMgc3RvcmVkIGhlcmUuXHJcbiAgICovXHJcbiAgbG9nb25JbmZvcz86IGFueTtcclxufVxyXG5cclxuLyoqXHJcbiAqIG9wdGlvbnMgZm9yIHVzZSBieSBib3RoIFtbbG9naW5dXSBhbmQgW1tsb2dvdXRdXS5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9nb25PcHRpb25zIGV4dGVuZHMgaW5pdC5TZXJ2ZXJVcmxPcHRpb25zIHtcclxuXHJcbiAgLyoqXHJcbiAgICogc3BlY2lmaWVzIHdoZXRoZXIgbG9naW4gcmVzcG9uc2UgZGF0YSBpcyBwZXJzaXN0ZWQgc3VjaCB0aGF0IHN1YnNlcXVlbnQgbG9nb25zIGNhbiBiZVxyXG4gICAqIHByb2Nlc3NlZCBldmVuIGlmIGNvbW11bmljYXRpb24gd2l0aCB0aGUgUmVsdXRpb24gc2VydmVyIGlzIGltcG9zc2libGUgYXQgdGhhdCB0aW1lLlxyXG4gICAqXHJcbiAgICogT24gW1tsb2dpbl1dIHNldCB0byBgdHJ1ZWAgdG8gcGVyc2lzdCB0aGUgcmVzcG9uc2UgdG8gb2ZmbGluZSBzdG9yYWdlIHN1Y2ggdGhhdFxyXG4gICAqIHN1YnNlcXVlbnQgbG9nb24gdG8gdGhlIHNhbWUgc2VydmVyIHdpbGwgcmV1c2UgaXQgZXZlbiBhZnRlciB0aGUgY2xpZW50IGFwcCBpcyByZXN0YXJ0ZWQuXHJcbiAgICogVGhlIHJlc3BvbnNlIGRhdGEgaXMgc3RvcmVkIGluIGVuY3J5cHRlZCBmb3JtLiBPbmNlIHN0b3JlZCwgY2FsbGluZyBbW2xvZ2luXV0gd2l0aCB0aGVcclxuICAgKiBzYW1lIHNldCBvZiBjcmVkZW50aWFscyB3aWxsIHN1Y2NlZWQgZXZlbiBpZiB0aGUgUmVsdXRpb24gc2VydmVyIGNhbiBub3QgYmUgcmVhY2hlZC4gSW5cclxuICAgKiB0aGlzIGNhc2UsIGNyZWRlbnRpYWxzIGFyZSB2ZXJpZmllZCBieSBkZWNyeXB0aW9uIG9mIHRoZSBlbmNyeXB0ZWQgcmVzcG9uc2UgZGF0YS5cclxuICAgKlxyXG4gICAqIE9uIFtbbG9nb3V0XV0gc2V0IHRvIGB0cnVlYCB0byB1bHRpbWF0ZWx5IGVyYXNlIHRoZSByZXNwb25zZSBmcm9tIG9mZmxpbmUgc3RvcmFnZSBhcyB3ZWxsLFxyXG4gICAqIGFmdGVyIGhhdmluZyBpdCBzdG9yZWQgdXNpbmcgdGhlIG1lY2hhbmlzbSBkZXNjcmliZWQgYWJvdmUuXHJcbiAgICovXHJcbiAgb2ZmbGluZUNhcGFibGU/OiBib29sZWFuO1xyXG5cclxufVxyXG5cclxuLyoqXHJcbiAqIG9wdGlvbnMgc3BlY2lmaWMgdG8gW1tsb2dpbl1dIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMb2dpbk9wdGlvbnMgZXh0ZW5kcyBMb2dvbk9wdGlvbnMsIGluaXQuU2VydmVySW5pdE9wdGlvbnMge1xyXG59XHJcblxyXG4vKipcclxuICogbG9ncyBpbnRvIGEgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBOb3RpY2UsIHNwZWNpZnlpbmcgYG9mZmxpbmVDYXBhYmxlPXRydWVgIGluIHRoZSBvcHRpb25zIHdpbGwgc3RvcmUgdGhlIGxvZ2luIHJlc3BvbnNlIGxvY2FsbHkgb25cclxuICogdGhlIGRldmljZSB3aGVuIG9ubGluZSBhbmQgdGhlIGxvZ2luIHN1Y2NlZWRlZC4gV2hlbiBvZmZsaW5lLCB0aGUgb3B0aW9uIHdpbGwgcmV1c2UgdGhlIHN0b3JlZFxyXG4gKiByZXNwb25zZS4gRGF0YSBlbmNyeXB0aW9uIGlzIHVzZWQgZ3VhcmFudGVlaW5nIGJvdGggc2VjcmVjeSBvZiBsb2dpbiBkYXRhIGFuZCB2ZXJpZmljYXRpb24gb2ZcclxuICogdGhlIGNyZWRlbnRpYWxzIHByb3ZpZGVkLlxyXG4gKlxyXG4gKiBAcGFyYW0gY3JlZGVudGlhbHMgdG8gdXNlLlxyXG4gKiBAcGFyYW0gbG9naW5PcHRpb25zIG92ZXJ3cml0aW5nIFtbaW5pdF1dIGRlZmF1bHRzLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2U8TG9naW5SZXNwb25zZT59IG9mIGxvZ2luIHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBgYGBqYXZhc2NyaXB0XHJcbiAqXHJcbiAqIGltcG9ydCAqIGFzIFJlbHV0aW9uIGZyb20gJ3JlbHV0aW9uLXNkayc7XHJcbiAqIC8vY29uZmlnXHJcbiAqIFJlbHV0aW9uLmluaXQoe1xyXG4gKiAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vbG9jYWxob3N0OjgwODAnXHJcbiAqIH0pO1xyXG4gKlxyXG4gKiBsZXQgY3JlZGVudGlhbHMgPSB7XHJcbiAqICAgIHVzZXJOYW1lOiAnbXl1c2VybmFtZScsXHJcbiAqICAgIHBhc3N3b3JkOiAnbXlwYXNzd29yZCdcclxuICogfTtcclxuICpcclxuICogLy91c2FnZVxyXG4gKlxyXG4gKiAvLyBQcm9taXNlXHJcbiAqIFJlbHV0aW9uLndlYi5sb2dpbihjcmVkZW50aWFscylcclxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApOylcclxuICogIC5jYXRjaCgoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxyXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2NvbXBsZXRlJykpO1xyXG4gKlxyXG4gKiAvL09ic2VydmFibGVcclxuICogT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShSZWx1dGlvbi53ZWIubG9naW4oY3JlZGVudGlhbHMpKS5zdWJzY3JpYmUoXHJcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApLFxyXG4gKiAgKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXHJcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGUnKVxyXG4gKiApXHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGxvZ2luKGNyZWRlbnRpYWxzOiBhdXRoLkNyZWRlbnRpYWxzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgbG9naW5PcHRpb25zOiBMb2dpbk9wdGlvbnMgPSB7fSk6IFEuUHJvbWlzZTxMb2dpblJlc3BvbnNlPiB7XHJcbiAgbGV0IHdhc09mZmxpbmVMb2dpbiA9IGZhbHNlO1xyXG4gIGxldCBzZXJ2ZXJVcmwgPSB1cmxzLnJlc29sdmVTZXJ2ZXIoJy8nLCBsb2dpbk9wdGlvbnMpO1xyXG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XHJcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcclxuICAgIC8vIGxvZ2dlZCBpbiBhbHJlYWR5XHJcbiAgICByZXR1cm4gbG9nb3V0KHtcclxuICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcclxuICAgIH0pLnRoZW4oKCkgPT4ge1xyXG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XHJcbiAgICAgIHJldHVybiBsb2dpbihjcmVkZW50aWFscywgbG9naW5PcHRpb25zKTsgLy8gcmVwZWF0IGFmdGVyIGxvZ291dFxyXG4gICAgfSk7XHJcbiAgfSBlbHNlIGlmIChzZXJ2ZXJPYmouY3JlZGVudGlhbHMpIHtcclxuICAgIC8vIGhhZCBjcmVkZW50aWFscyBidXQgbm8gc2Vzc2lvbiwgc28gd2Ugd2VyZSBsb2dnZWQgaW4gb2ZmbGluZVxyXG4gICAgd2FzT2ZmbGluZUxvZ2luID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xyXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xyXG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXHJcbiAgICBhZ2VudE9wdGlvbnM6IGxvZ2luT3B0aW9ucy5hZ2VudE9wdGlvbnMgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudE9wdGlvbnMsXHJcbiAgICBhZ2VudENsYXNzOiBsb2dpbk9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXHJcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgbG9naW4gdGltZVxyXG4gICAgY2xpZW50QXBwOiBsb2dpbk9wdGlvbnMuY2xpZW50QXBwIHx8IGluaXQuaW5pdE9wdGlvbnMuY2xpZW50QXBwLFxyXG4gICAgbG9nb25DYWxsYmFjazogbG9naW5PcHRpb25zLmxvZ29uQ2FsbGJhY2sgfHwgaW5pdC5pbml0T3B0aW9ucy5sb2dvbkNhbGxiYWNrLFxyXG4gICAgY2xpZW50Q2VydGlmaWNhdGU6IGxvZ2luT3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZSB8fCBpbml0LmluaXRPcHRpb25zLmNsaWVudENlcnRpZmljYXRlXHJcbiAgfSk7XHJcbiAgbGV0IGxvZ29uQ2FsbGJhY2sgPSBjdXJyZW50T3B0aW9ucy5sb2dvbkNhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XHJcbiAgcmV0dXJuIGFqYXg8TG9naW5SZXNwb25zZT4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xyXG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXHJcbiAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgIHVybDogJy9nb2Zlci9zZWN1cml0eS9yZXN0L2F1dGgvbG9naW4nLFxyXG4gICAgYm9keTogY3JlZGVudGlhbHNcclxuICB9LCBjdXJyZW50T3B0aW9ucykpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAvLyByZWFsIHBoeXNpY2FsIGxvZ29uLCBhamF4IGNhbGwgc2V0cyBzZXNzaW9uVXNlclV1aWRcclxuICAgIGlmICghc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xyXG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ0JVRzogUmVsdXRpb24gZGlkIG5vdCBzZXQgWC1Hb2Zlci1Vc2VyIHJlc3BvbnNlIGhlYWRlcicpO1xyXG4gICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gcmVzcG9uc2UudXNlci51dWlkO1xyXG4gICAgfVxyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9PT0gcmVzcG9uc2UudXNlci51dWlkKTtcclxuICAgIHJldHVybiByZXNwb25zZTtcclxuICB9LCAoZXJyb3I6IEh0dHBFcnJvcikgPT4ge1xyXG4gICAgLy8gb2ZmbGluZSBsb2dpbiByZXNwb25zZVxyXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlICYmIGxvZ2luT3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSkge1xyXG4gICAgICAvLyBhamF4IHRpbWVvdXQgLT4gb2ZmbGluZSBsb2dpbiBhdHRlbXB0XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkLFxyXG4gICAgICAgICdubyBwaHlzaWNhbCBsb2dpbiwgYXMgb3RoZXJ3aXNlIGxvZ29uQ2FsbGJhY2sgd291bGQgYmUgZXhlY3V0ZWQnKTtcclxuICAgICAgcmV0dXJuIG9mZmxpbmUuZmV0Y2hPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zKS50aGVuKChsb2dpblJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgaWYgKCFsb2dpblJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAvLyB3aGVuIHRoZXJlIGlzIG5vIHBlcnNpc3RlbnQgZGF0YSBhdmFpbGFibGUsIGFrYS4gdGhpcyBpcyB0aGUgaW5pdGlhbCBsb2dpbiBhdHRlbXB0LFxyXG4gICAgICAgICAgLy8ga2VlcCBzYXlpbmcgdGhlIHNlcnZlciBpcyBvZmZsaW5lLi4uXHJcbiAgICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbG9naW5SZXNwb25zZTtcclxuICAgICAgfSwgKG9mZmxpbmVFcnJvcikgPT4ge1xyXG4gICAgICAgIC8vIG1vc3QgbGlrZWx5IHRoZSBwYXNzd29yZCBlbnRlcmVkIHdhcyBpbmNvcnJlY3QsXHJcbiAgICAgICAgLy8gbWFrZSBzdXJlIHRoZSBvZmZsaW5lRXJyb3IgaW5kaWNhdGVzIHRoZSBzZXJ2ZXIgaXMgdW5hdmFpbGFibGUgYXMgd2VsbFxyXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFvZmZsaW5lRXJyb3Iuc3RhdHVzQ29kZSk7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5yZXF1ZXN0VXJsKTtcclxuICAgICAgICBvZmZsaW5lRXJyb3IucmVxdWVzdFVybCA9IGVycm9yLnJlcXVlc3RVcmw7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5jYXVzZSk7XHJcbiAgICAgICAgb2ZmbGluZUVycm9yLmNhdXNlID0gZXJyb3I7XHJcbiAgICAgICAgLy8gd2UgcmV0aHJvdyB0aGUgYW5ub3RhdGVkIGVycm9yIG9mIGRlY29kaW5nIHRoZSBzdG9yZWQgcmVzcG9uc2UsXHJcbiAgICAgICAgLy8gYmVjYXVzZSB0aGUgbmV0d29yayBlcnJvciBqdXN0IGluZGljYXRlcyB3ZSBhcmUgb2ZmbGluZSBhbmQgZG9lc1xyXG4gICAgICAgIC8vIG5vdCBtZW50aW9uIHRoZSBjcmVkZW50aWFscyBiZWluZyBpbmNvcnJlY3QgYXMgdGhpcyBvbmUgZG9lcy4uLlxyXG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihvZmZsaW5lRXJyb3IpO1xyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RhdHVzQ29kZSAmJiB3YXNPZmZsaW5lTG9naW4pIHtcclxuICAgICAgLy8gc2VydmVyIHNpZGUgcmVqZWN0aW9uLCBjbGVhciBsb2dpbiBkYXRhIHNvIHRoYXQgc3Vic2VxdWVudCBvZmZsaW5lIGxvZ2lucyBmYWlsIGFzIHdlbGxcclxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zKS5jYXRjaCgob2ZmbGluZUVycm9yKSA9PiB7XHJcbiAgICAgICAgLy8gdGhpcyBpcyBiYWQgYnV0IHdlIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdFxyXG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcclxuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xyXG4gICAgICB9KTtcclxuICAgIH1cclxuICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XHJcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgIC8vIHN3aXRjaCBjdXJyZW50IHNlcnZlclxyXG4gICAgaWYgKCdyb2xlcycgaW4gcmVzcG9uc2Uucm9sZXMpIHtcclxuICAgICAgLy8gZml4ZXMgYSBkZWZlY3Qgb2YgSmF2YSBpbXBsZW1lbnRhdGlvblxyXG4gICAgICByZXNwb25zZS5yb2xlcyA9IHJlc3BvbnNlLnJvbGVzWydyb2xlcyddO1xyXG4gICAgfVxyXG4gICAgc2VydmVyT2JqLmF1dGhvcml6YXRpb24gPSB7XHJcbiAgICAgIG5hbWU6IHJlc3BvbnNlLnVzZXIudXVpZCxcclxuICAgICAgcm9sZXM6IF8ubWFwKHJlc3BvbnNlLnJvbGVzLCAocm9sZTogcm9sZXMuUm9sZUR0bykgPT4gcm9sZS51dWlkKVxyXG4gICAgfTtcclxuICAgIHNlcnZlck9iai5vcmdhbml6YXRpb24gPSByZXNwb25zZS5vcmdhbml6YXRpb247XHJcbiAgICBzZXJ2ZXJPYmoudXNlciA9IHJlc3BvbnNlLnVzZXI7XHJcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBjcmVkZW50aWFscztcclxuICAgIHNlcnZlci5zZXRDdXJyZW50U2VydmVyKHNlcnZlck9iaik7XHJcbiAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgIC8vIHRoaXMgaXMgdGhlIGVhcmxpZXN0IHBvaW50IGF0IHdoaWNoIGxpYnJhcnkgc3RhdGUgcmVmbGVjdHMgY29ycmVjdCBhdXRob3JpemF0aW9uLCBldGMuXHJcbiAgICAvLyBUaHVzLCB0aGUgbG9nb25DYWxsYmFjayBtYXkgZXhlY3V0ZSBoZXJlIG5vdywgYnV0IG9ubHkgaWYgd2UgYXJlIG9ubGluZSBhY3R1YWxseS4uLlxyXG4gICAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XHJcbiAgICAgIHJldHVybiByZXNwb25zZTsgLy8gb2ZmbGluZVxyXG4gICAgfVxyXG4gICAgLy8gd2UgaGF2ZSBhIHNlc3Npb24gbG9nZ2VkIGludG8gdGhpcyB1c2VyXHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID09PSBzZXJ2ZXIuZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKS5uYW1lKTtcclxuXHJcbiAgICAvLyBydW4gbG9nb25DYWxsYmFjayBvbiByZXNwb25zZSBkYXRhIGFuZCBldmVudHVhbGx5IHN0b3JlIHJlc3VsdGFudCBvYmplY3QgZm9yIG9mZmxpbmUgbG9naW4sXHJcbiAgICAvLyBiZWNhdXNlIHRoaXMgd2F5IHRoZSBjYWxsYmFjayBtYXkgYWRkIGluZm9ybWF0aW9uIHRvIHRoZSByZXNwb25zZSBvYmplY3QgdGhhdCB3aWxsIGFsc28gYmVcclxuICAgIC8vIHBlcnNpc3RlZCBhbmQgbWFkZSBhdmFpbGFibGUgYWdhaW4gd2hlbiBvZmZsaW5lIVxyXG4gICAgcmV0dXJuIFEobG9nb25DYWxsYmFjayhyZXNwb25zZSkpLnRoZW4oKGxvZ29uSW5mb3MgPSByZXNwb25zZSkgPT4ge1xyXG4gICAgICBpZiAobG9nb25JbmZvcyAmJiBsb2dvbkluZm9zICE9PSByZXNwb25zZSkge1xyXG4gICAgICAgIC8vIGFueSBkYXRhIHJldHVybmVkIGJ5IHRoZSBsb2dvbkNhbGxiYWNrIG1heSBiZSBzdG9yZWQgaGVyZVxyXG4gICAgICAgIHJlc3BvbnNlLmxvZ29uSW5mb3MgPSBsb2dvbkluZm9zO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBzdG9yZSBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXHJcbiAgICAgIGlmIChsb2dpbk9wdGlvbnMub2ZmbGluZUNhcGFibGUgfHwgd2FzT2ZmbGluZUxvZ2luKSB7XHJcbiAgICAgICAgLy8gaW5pdGlhbCBzdG9yZSBvciB1cGRhdGUgb2YgbG9naW4gZGF0YVxyXG4gICAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucywgcmVzcG9uc2UpLmNhdGNoKFxyXG4gICAgICAgICAgKG9mZmxpbmVFcnJvcikgPT4ge1xyXG4gICAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ29mZmxpbmUgbG9naW4gc3RvcmUgZmFpbGVkJywgb2ZmbGluZUVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfSwgKGVycm9yKSA9PiB7XHJcbiAgICAgIC8vIGxvZ29uIGNhbGxiYWNrIGZhaWxlZCwgbXVzdCBsb2dvdXQgdG8gYXZvaWQgbWFraW5nIGFqYXggY2FsbHMgaW4gYW4gdW5rbm93biBiYWNrZW5kIHN0YXRlXHJcbiAgICAgIHJldHVybiBsb2dvdXQoe1xyXG4gICAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXHJcbiAgICAgIH0pLmNhdGNoKChsb2dvdXRFcnJvcikgPT4ge1xyXG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ2ZhaWxlZCB0byBsb2dvdXQgYWZ0ZXIgbG9naW4gZmFpbHVyZScsIGxvZ291dEVycm9yKTtcclxuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xyXG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgICAvLyBsb2dvdXQgcHJvY2Vzc2luZyBtdXN0IGxlYXZlIHVzIHdpdGggbm8gdXNlciBzZXNzaW9uXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ291dF1dIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMb2dvdXRPcHRpb25zIGV4dGVuZHMgTG9nb25PcHRpb25zLCBpbml0Lkh0dHBBZ2VudE9wdGlvbnMge1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIGxvZ3Mgb3V0IG9mIGEgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBGb3IgZXhwbGljaXQgbG9nb3V0cyAodHJpZ2dlciBieSBhcHAgdXNlciBwcmVzc2luZyBhIGxvZ291dCBidXR0b24sIGZvciBleGFtcGxlKSBzcGVjaWZ5aW5nXHJcbiAqIGBvZmZsaW5lQ2FwYWJsZSA9IHRydWVgIHdpbGwgZHJvcCBhbnkgcGVyc2lzdGVkIG9mZmxpbmUgbG9naW4gZGF0YSBmb3IgdGhlIHNlcnZlciBsb2dnaW5nIG91dFxyXG4gKiBvZi5cclxuICpcclxuICogQHBhcmFtIGxvZ291dE9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXHJcbiAqIEByZXR1cm4ge1EuUHJvbWlzZTx2b2lkPn0gb2YgbG9nb3V0IHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBgYGBqYXZhc2NyaXB0XHJcbiAqXHJcbiAqIFJlbHV0aW9uLndlYi5sb2dvdXQoKVxyXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCk7KVxyXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXHJcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpKTtcclxuICpcclxuICogLy9PYnNlcnZhYmxlXHJcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmxvZ291dCgpKS5zdWJzY3JpYmUoXHJcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApLFxyXG4gKiAgKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXHJcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpXHJcbiAqIClcclxuICogYGBgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nb3V0KGxvZ291dE9wdGlvbnM6IExvZ291dE9wdGlvbnMgPSB7fSk6IFEuUHJvbWlzZTx2b2lkPiB7XHJcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcignLycsIGxvZ291dE9wdGlvbnMpO1xyXG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XHJcblxyXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xyXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xyXG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXHJcbiAgICBhZ2VudE9wdGlvbnM6IGxvZ291dE9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxyXG4gICAgYWdlbnRDbGFzczogbG9nb3V0T3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcclxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCBsb2dvdXQgdGltZVxyXG4gIH0pO1xyXG4gIHJldHVybiBhamF4PHZvaWQ+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcclxuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxyXG4gICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHkvcmVzdC9hdXRoL2xvZ291dCcsXHJcbiAgICBib2R5OiB7fVxyXG4gIH0sIGN1cnJlbnRPcHRpb25zKSkuY2F0Y2goKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcclxuICAgIGlmIChlcnJvci5zdGF0dXNDb2RlID09PSA0MjIpIHtcclxuICAgIC8vIFJFU1QtYmFzZWQgbG9nb3V0IFVSTCBjdXJyZW50bHkgaXMgYnJva2VuIHJlcG9ydGluZyBhIDQyMiBpbiBhbGwgY2FzZXNcclxuICAgICAgcmV0dXJuIGFqYXg8dm9pZD4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xyXG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcclxuICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5LWxvZ291dCdcclxuICAgIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdCVUc6IHJlc29ydGVkIHRvIGNsYXNzaWMgUEFUSC1iYXNlZCBsb2dvdXQgYXMgUkVTVC1iYXNlZCBsb2dvdXQgZmFpbGVkOicsXHJcbiAgICAgICAgICBlcnJvcik7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0sIChlcnJvcjI6IEh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcjIuc3RhdHVzQ29kZSA9PT0gNDIyID8gZXJyb3IgOiBlcnJvcjIpO1xyXG4gICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xyXG4gIH0pLmNhdGNoKChlcnJvcjogSHR0cEVycm9yKSA9PiB7XHJcbiAgICAvLyBpZ25vcmUgbmV0d29yayBmYWlsdXJlcyBvbiB0aW1lb3V0LCBzZXJ2ZXIgZm9yZ2V0cyBvbiBzZXNzaW9uIHRpbWVvdXQgYW55d2F5c1xyXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XHJcbiAgfSkuZmluYWxseSgoKSA9PiB7XHJcbiAgICAvLyBldmVudHVhbGx5IGVyYXNlIG9mZmxpbmUgbG9naW4gZGF0YVxyXG4gICAgaWYgKGxvZ291dE9wdGlvbnMub2ZmbGluZUNhcGFibGUpIHtcclxuICAgICAgLy8gcmVxdWVzdGVkIHRvIGVyYXNlIGxvZ2luIGRhdGFcclxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oc2VydmVyT2JqLmNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykuY2F0Y2goXHJcbiAgICAgICAgKG9mZmxpbmVFcnJvcikgPT4ge1xyXG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcclxuICAgICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgLy8gZm9yZ2V0IGV2ZXJ5dGhpbmcgYWJvdXQgaXRcclxuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XHJcbiAgICBzZXJ2ZXJPYmouYXV0aG9yaXphdGlvbiA9IGF1dGguQU5PTllNT1VTX0FVVEhPUklaQVRJT047XHJcbiAgICBzZXJ2ZXJPYmoub3JnYW5pemF0aW9uID0gbnVsbDtcclxuICAgIHNlcnZlck9iai51c2VyID0gbnVsbDtcclxuICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBudWxsO1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==