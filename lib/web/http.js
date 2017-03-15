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
var Q = require('q');
var _ = require('lodash');
var auth = require('../security/auth');
var diag = require('../core/diag');
var http = require('http');
var init = require('../core/init');
var offline = require('./offline');
var request = require('request');
var server = require('../security/server');
var urls = require('./urls');
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
                            version: response.headers['x-relution-version'],
                            description: response.headers['x-server']
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
                            var sessionUserUuid = response.headers['x-gofer-user'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFDekMsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxJQUFJLFdBQU0sTUFBTSxDQUFDLENBQUE7QUFDN0IsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxPQUFPLFdBQU0sV0FBVyxDQUFDLENBQUE7QUFDckMsSUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFFbkMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUUvQiw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNy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dEMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDakMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQzNFLFVBQUMsWUFBWTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHdlYi9odHRwLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgd2ViXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuLi9zZWN1cml0eS9hdXRoJztcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBpbml0IGZyb20gJy4uL2NvcmUvaW5pdCc7XG5pbXBvcnQgKiBhcyBvZmZsaW5lIGZyb20gJy4vb2ZmbGluZSc7XG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgcm9sZXMgZnJvbSAnLi4vc2VjdXJpdHkvcm9sZXMnO1xuaW1wb3J0ICogYXMgc2VydmVyIGZyb20gJy4uL3NlY3VyaXR5L3NlcnZlcic7XG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4vdXJscyc7XG5cbi8vIHJlcXVpcmUgcmVxdWVzdC5qcyB0byBtYW5hZ2UgY29va2llcyBmb3IgdXNcbmxldCByZXF1ZXN0RGVmYXVsdHMgPSB7XG4gIGpzb246IHRydWUsXG4gIGphcjogdHJ1ZSxcbiAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG59O1xubGV0IHJlcXVlc3RXaXRoRGVmYXVsdHMgPSByZXF1ZXN0LmRlZmF1bHRzKHJlcXVlc3REZWZhdWx0cyk7XG5cbi8qKlxuICogY2FsbGJhY2sgYWxsb3dpbmcgY3VzdG9taXppbmcgYW4gb2JqZWN0IG5vdCBpbW1lZGlhdGVseSBhdmFpbGFibGUgYXQgdGltZSBvZiBjYWxsLlxuICpcbiAqIEBwYXJhbSBvYmplY3QgZm9yIGluc3BlY3Rpb24gb3IgY3VzdG9taXphdGlvbi5cbiAqIEByZXR1cm4gcHJvbWlzZSBvciBvYmplY3Qgb24gc2FtZSBkZWZlcnJlZCBvYmplY3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cENhbGxiYWNrPFQ+IHtcbiAgKHZhbHVlOiBUKTogUS5Qcm9taXNlPFQ+IHwgVDtcbn1cblxuLyoqXG4gKiB0eXBlIHJlcHJlc2VudGluZyBhIHJhdyByZXF1ZXN0LlxuICovXG5leHBvcnQgdHlwZSBIdHRwUmVxdWVzdCA9IHJlcXVlc3QuUmVxdWVzdDtcbi8qKlxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVzcG9uc2UuXG4gKi9cbmV4cG9ydCB0eXBlIEh0dHBSZXNwb25zZSA9IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xuXG4vKipcbiAqIG5hbWVkIHBhcmFtZXRlcnMgb2YgdGhlIFtbaHR0cF1dIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBPcHRpb25zIGV4dGVuZHMgcmVxdWVzdC5Db3JlT3B0aW9ucywgcmVxdWVzdC5VcmxPcHRpb25zLFxuICAgIGluaXQuU2VydmVySW5pdE9wdGlvbnMge1xuICAvKipcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gY3VzdG9taXplIHRoZSBjbGllbnQgcmVxdWVzdCBpbiBtb3JlIGRldGFpbCB0aGFuIHByb3ZpZGVkIGJ5XG4gICAqIGRlZmF1bHQuXG4gICAqL1xuICByZXF1ZXN0Q2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlcXVlc3Q+O1xuICAvKipcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gaW5zcGVjdCB0aGUgc2VydmVyIHJlc3BvbnNlIGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcbiAgICogZGVmYXVsdC5cbiAgICovXG4gIHJlc3BvbnNlQ2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlc3BvbnNlPjtcbn1cblxuLyoqXG4gKiBmYWlsdXJlIG9mIGFuIGFqYXggcmVxdWVzdC5cbiAqXG4gKiBUaGlzIHR5cGUgY2FuIGJlIHVzZWQgYXMgdHlwZSBhbm5vdGF0aW9uIG9mIHRoZSBlcnJvciB0aGUgUHJvbWlzZSByZXR1cm5lZCBieSBhamF4IGlzIHJlamVjdGVkXG4gKiB3aXRoLlxuICpcbiAqIEBzZWUgYWpheFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIGZ1bGx5IHJlc29sdmVkIHVybCB0aGUgcmVxdWVzdCB3YXMgc2VudCB0by5cbiAgICovXG4gIHJlcXVlc3RVcmw/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhUVFAgc3RhdHVzIGNvZGUgb2YgZmFpbHVyZS5cbiAgICovXG4gIHN0YXR1c0NvZGU/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBIVFRQIHN0YXR1cyBtZXNzYWdlIG9mIGZhaWx1cmUuXG4gICAqL1xuICBzdGF0dXNNZXNzYWdlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBpbiBtYW55IGNhc2VzIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgcmVwb3J0cyBoZXJlIHRoZSBmdWxseSBxdWFsaWZpZWQgbmFtZSBvZiBhIEphdmEgRXhjZXB0aW9uXG4gICAqIHRoYXQgbWF5IGJlIHVzZWQgdG8gZnVydGhlciBkaWZmZXJlbnRpYXRlIHRoZSBlcnJvci5cbiAgICovXG4gIGNsYXNzTmFtZT86IHN0cmluZztcbiAgLyoqXG4gICAqIG1heSBiZSBzZXQgdG8gc29tZSBhcmJpdHJhcnkgdmFsdWUgZGVzY3JpYmluZyB0aGUgY2F1c2Ugb2YgZmFpbHVyZSwgbW9zdGx5IHByZXNlbnQgd2hlblxuICAgKiB0cmFuc3BvcnRpbmcgSmF2YSBFeGNlcHRpb24gb2JqZWN0cy5cbiAgICovXG4gIGNhdXNlPzogYW55O1xuXG4gIC8qKlxuICAgKiBkZXRhaWxzIG9mIHJlcXVlc3QgZmFpbGVkLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgYW5kIHRodXMgbm90IHBhcnQgb2YgdGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGZhaWx1cmUuXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXG4gICAqIHRoaXMgdmFsdWUuXG4gICAqXG4gICAqIEBzZWUgcmVzcG9uc2VcbiAgICovXG4gIHJhd1JlcXVlc3Q/OiBIdHRwUmVxdWVzdDtcbiAgLyoqXG4gICAqIGRldGFpbHMgb2YgcmVzcG9uc2UgZmFpbGVkLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgYW5kIHRodXMgbm90IHBhcnQgb2YgdGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGZhaWx1cmUuXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXG4gICAqIHRoaXMgdmFsdWUuXG4gICAqXG4gICAqIEBzZWUgcmVxdWVzdFxuICAgKi9cbiAgcmF3UmVzcG9uc2U/OiBIdHRwUmVzcG9uc2U7XG59XG5cbi8qKlxuICogZHJpdmVzIGFuIEhUVFAgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogQmVoYXZpb3Igb2YgdGhpcyBtZXRob2QgaXMgc2ltcGxpZmllZCBmcm9tIG1vc3QgSFRUUC9BSkFYIGltcGxlbWVudGF0aW9uczpcbiAqIC0gV2hlbiB0aGUgSFRUUCByZXF1ZXN0IHN1Y2NlZWRzIHRoZSByZXN1bHRpbmcgcHJvbWlzZSByZXNvbHZlcyB0byB0aGUgcmVzcG9uc2UgYm9keS5cbiAqIC0gSW4gY2FzZSBvZiBhIG5ldHdvcmsgRXJyb3IgdGhlIHByb21pc2UgcmVzb2x2ZXMgdG8gYW4gSHR0cEVycm9yIG9iamVjdCBwcm92aWRpbmcgYHJlcXVlc3RVcmxgXG4gKiAgIGJ1dCBuZWl0aGVyIGBzdGF0dXNDb2RlYCBub3IgYHN0YXR1c01lc3NhZ2VgLlxuICogLSBJbiBjYXNlIG9mIEhUVFAgZmFpbHVyZSB0aGUgcmVzdWx0aW5nIHByb21pc2UgaXMgcmVqZWN0ZWQgdG8gYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0IGNhcnJ5aW5nXG4gKiAgIHRoZSBwcm9wZXJ0aWVzIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXG4gKiAtIElmIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgYSBKU09OLCBpdCBpcyBwYXJzZWQgYW5kIGFzc3VtZWQgdG8gYmUgYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0LiBUaGVcbiAqICAgb2JqZWN0IGlzIGF1Z21lbnRlZCBieSB0aGUgcHJvcGVydGllcyBhcyBkZWZpbmVkIGFib3ZlLlxuICogLSBPdGhlcndpc2UgdGhlIGJvZHkgaXMgc3RvcmVkIGFzIGBtZXNzYWdlYCBvZiBhbiBIdHRwRXJyb3Igb2JqZWN0IGNyZWF0ZWQuIEFnYWluLCB0aGUgcHJvcGVydGllc1xuICogICBhYm92ZSBhcmUgcHJvdmlkZWQuXG4gKiAtIEZpbmFsbHksIGluIGNhc2Ugb2YgSFRUUCBmYWlsdXJlIHdpdGggdGhlIHNlcnZlciBub3QgcHJvdmlkaW5nIGFueSByZXNwb25zZSBib2R5LCB0aGUgSHR0cEVycm9yXG4gKiAgIGBtZXNzYWdlYCBpcyBzZXQgdG8gdGhlIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBUaHVzLCB0byBkaWZmZXJlbnRpYXRlIG5ldHdvcmsgZmFpbHVyZXMgZnJvbSBzZXJ2ZXItc2lkZSBmYWlsdXJlcyB0aGUgYHN0YXR1c0NvZGVgIG9mIHRoZVxuICogSHR0cEVycm9yIHJlamVjdGlvbiBpcyB0byBiZWluZyB1c2VkLiBGb3IgZGVlcGVyIGluc3BlY3Rpb24gcHJvdmlkZSBhblxuICogW1tvcHRpb25zLnJlc3BvbnNlQ2FsbGJhY2tdXS5cbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiBSZWx1dGlvbi5pbml0KHtcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXG4gKiAgICBvcmdhbml6YXRpb246ICdteU9yZ2EnXG4gKiB9KTtcbiAqXG4gKiBsZXQgaHR0cE9wdGlvbnM6IEh0dHBPcHRpb25zID0ge21ldGhvZDogJ0dFVCcsIHVybDogJ2FwaS92MS9wb3N0cyd9O1xuICpcbiAqIC8vdXNhZ2UgYXMgUHJvbWlzZVxuICogUmVsdXRpb24ud2ViLmFqYXgoaHR0cE9wdGlvbnMpXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdwb3N0cycsIHJlc3ApOylcbiAqICAuY2F0Y2goKGU6UmVsdXRpb24ud2ViLkh0dHBFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxuICogIC5maW5hbGx5KCgpID0+IGNvbnNvbGUubG9nKCdsb2FkaW5nIGNvbXBsZXRlIScpKTtcbiAqXG4gKiAvLyBhcyBPYnNlcnZhYmxlXG4gKiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFJlbHV0aW9uLndlYi5hamF4KGh0dHBPcHRpb25zKSkuc3Vic2NyaWJlKFxuICogIChyZXNwOiBhbnkpID0+IGNvbnNvbGUubG9nKCdwb3N0cycsIHJlc3ApLFxuICogIChlOlJlbHV0aW9uLndlYi5IdHRwRXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXG4gKiAgKCkgPT4gY29uc29sZS5sb2coJ2xvYWRpbmcgY29tcGxldGUhJylcbiAqIClcbiAqIGBgYFxuICogQHBhcmFtIG9wdGlvbnMgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gSHR0cEVycm9yIG9iamVjdFxuICogICAgaW5jbHVkaW5nIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhamF4PFQ+KG9wdGlvbnM6IEh0dHBPcHRpb25zKTogUS5Qcm9taXNlPFQ+IHtcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcihvcHRpb25zLnVybCwgb3B0aW9ucyk7XG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG4gIGlmICghc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCAmJiBzZXJ2ZXJPYmouY3JlZGVudGlhbHMpIHtcbiAgICAvLyBub3QgbG9nZ2VkIGluXG4gICAgbGV0IGNyZWRlbnRpYWxzID0gc2VydmVyT2JqLmNyZWRlbnRpYWxzO1xuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XG4gICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlck9iai5jcmVkZW50aWFscyA9PSBjcmVkZW50aWFscyk7XG4gICAgICByZXR1cm4gYWpheDxUPihvcHRpb25zKTsgLy8gcmVwZWF0IGFmdGVyIGxvZ2luXG4gICAgfSk7XG4gIH1cblxuICAvLyBwcm9jZXNzIG9wdGlvbnNcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgYWdlbnRPcHRpb25zOiBvcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcbiAgICBhZ2VudENsYXNzOiBvcHRpb25zLmFnZW50Q2xhc3MgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudENsYXNzLFxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCByZXF1ZXN0IHRpbWVcbiAgICBhcHBsaWNhdGlvbjogb3B0aW9ucy5hcHBsaWNhdGlvbiB8fCBpbml0LmluaXRPcHRpb25zLmFwcGxpY2F0aW9uLFxuICAgIHRlbmFudE9yZ2E6IG9wdGlvbnMudGVuYW50T3JnYSB8fCBpbml0LmluaXRPcHRpb25zLnRlbmFudE9yZ2FcbiAgfSk7XG5cbiAgLy8gcmVzb2x2ZSB0YXJnZXQgdXJsXG4gIGxldCB1cmwgPSB1cmxzLnJlc29sdmVVcmwob3B0aW9ucy51cmwsIGN1cnJlbnRPcHRpb25zKTtcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZyhvcHRpb25zLm1ldGhvZCArICcgJyArIHVybCk7XG4gIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHVybC5zdWJzdHIoMCwgc2VydmVyVXJsLmxlbmd0aCkgPT09IHNlcnZlclVybCk7XG5cbiAgbGV0IHJlcXVlc3RDYWxsYmFjayA9IG9wdGlvbnMucmVxdWVzdENhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XG4gIGxldCByZXNwb25zZUNhbGxiYWNrID0gb3B0aW9ucy5yZXNwb25zZUNhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XG4gIG9wdGlvbnMgPSBfLmNsb25lKG9wdGlvbnMpO1xuICBvcHRpb25zLmFnZW50T3B0aW9ucyA9IGN1cnJlbnRPcHRpb25zLmFnZW50T3B0aW9ucztcbiAgb3B0aW9ucy5hZ2VudENsYXNzID0gY3VycmVudE9wdGlvbnMuYWdlbnRDbGFzcztcbiAgbGV0IGhlYWRlcnMgPSB7fTtcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAvLyBhZGQgWC1Hb2Zlci1Vc2VyIGhlYWRlciBzbyB0aGF0IHNlcnZlciBtYXkgY2hlY2sgd2UgYXJlIHJ1bm5pbmcgdW5kZXIgY29ycmVjdCBpZGVudGl0eVxuICAgIGhlYWRlcnNbJ1gtR29mZXItVXNlciddID0gc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZDtcbiAgfVxuICBpZiAoY3VycmVudE9wdGlvbnMuY2xpZW50QXBwKSB7XG4gICAgLy8gYWRkIFgtUmVsdXRpb24tQ2xpZW50QXBwIGZvciBzZXJ2ZXItc2lkZSBhbmFseXRpY3NcbiAgICBoZWFkZXJzWydYLVJlbHV0aW9uLUNsaWVudEFwcCddID0gY3VycmVudE9wdGlvbnMuY2xpZW50QXBwO1xuICB9XG4gIGlmICghXy5pc0VtcHR5KGhlYWRlcnMpKSB7XG4gICAgb3B0aW9ucy5oZWFkZXJzID0gXy5kZWZhdWx0cyhoZWFkZXJzLCBvcHRpb25zLmhlYWRlcnMpO1xuICB9XG4gIHJldHVybiBRLlByb21pc2U8VD4oKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCkgPT4ge1xuICAgIGxldCBwcm9taXNlUmVzcG9uc2UgPSBRLlByb21pc2UoKHJlc29sdmVSZXNwb25zZSwgcmVqZWN0UmVzcG9uc2UpID0+IHtcbiAgICAgIGxldCByZXNwOiBodHRwLkluY29taW5nTWVzc2FnZTtcbiAgICAgIGxldCByZXE6IHJlcXVlc3QuUmVxdWVzdDtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChvcHRpb25zLmNsaWVudENlcnRpZmljYXRlKSB7XG4gICAgICAgICAgLy8gYXBwbHkgY2VydGlmaWNhdGUgb3B0aW9uc1xuICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpO1xuICAgICAgICB9XG4gICAgICAgIHJlcSA9IHJlcXVlc3RXaXRoRGVmYXVsdHModXJsLCBvcHRpb25zLCAoZXJyb3I6IEh0dHBFcnJvciwgcmVzcG9uc2UgPSByZXNwLCBib2R5PzogYW55KSA9PiB7XG4gICAgICAgICAgLy8gbm9kZS5qcyBhc3NpZ25zIHN0YXR1cyBzdHJpbmcgYXMgYm9keSBmb3Igc3RhdHVzIGNvZGVzIG5vdCBoYXZpbmcgYm9keSBkYXRhXG4gICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDIwMikge1xuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoYm9keSA9PT0gaHR0cC5TVEFUVVNfQ09ERVNbMjAyXSwgYm9keSk7XG4gICAgICAgICAgICBib2R5ID0gdW5kZWZpbmVkOyAvLyByZXNvbHZlcyBwcm9taXNlIHRvIHVuZGVmaW5lZCBiZWxvd1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGVycm9yIHByb2Nlc3NpbmdcbiAgICAgICAgICBpZiAoIWVycm9yICYmIHJlc3BvbnNlICYmIHJlc3BvbnNlLnN0YXR1c0NvZGUgPj0gNDAwKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Vycm9yKGJvZHkpKSB7XG4gICAgICAgICAgICAgIC8vIGNvcnJlY3QgYnV0IHByYWN0aWNhbGx5IGltcG9zc2libGVcbiAgICAgICAgICAgICAgZXJyb3IgPSBib2R5O1xuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKGJvZHkpKSB7XG4gICAgICAgICAgICAgIC8vIHVzZSBwbGFpbi10ZXh0IGFzIEVycm9yIG1lc3NhZ2VcbiAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IoYm9keSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3RMaWtlKGJvZHkpKSB7XG4gICAgICAgICAgICAgIC8vIGJvZHkgaXMgb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHNlcnZlci1zaWRlIGVycm9yIG9yIGV4Y2VwdGlvbixcbiAgICAgICAgICAgICAgLy8gY29udmVydGluZyB0byB0cnVlIEVycm9yIG9iamVjdCBoZXJlXG4gICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c01lc3NhZ2UpO1xuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhXy5pc0FycmF5KGJvZHkpLFxuICAgICAgICAgICAgICAgICdraWNrcyBpbiBmb3IgYXJyYXkgcmVzcG9uc2VzIGFzIHdlbGwsIG5vdCBzdXJlIGlmIHRoaXMgaXMgZGVzaXJhYmxlJyk7XG4gICAgICAgICAgICAgIF8uZXh0ZW5kKGVycm9yLCBib2R5KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGhhbmRsZXMgbnVtYmVycywgYm9vbGVhbnMsIGV0Yy4gYXNzaWduaW5nIGFzIGNhdXNlIG9mIGZhaWx1cmVcbiAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzTWVzc2FnZSk7XG4gICAgICAgICAgICAgIGlmICghXy5pc1VuZGVmaW5lZChib2R5KSkge1xuICAgICAgICAgICAgICAgIGVycm9yLmNhdXNlID0gYm9keTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gYWRkaXRpb25hbCBIdHRwRXJyb3IgcHJvcGVydGllcyBldmVudHVhbGx5IHNldCBiZWxvd1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgIC8vIGNvbXBsZXRlcyBIdHRwRXJyb3IgY29uc3RydWN0aW9uXG4gICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydElzRXJyb3IoZXJyb3IsICdzaG91bGQgb3BlcmF0ZSB0cnVlIEVycm9yIGluc3RhbmNlcycpO1xuICAgICAgICAgICAgZXJyb3IucmVxdWVzdFVybCA9IHVybDtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSkge1xuICAgICAgICAgICAgICBlcnJvci5zdGF0dXNDb2RlID0gcmVzcG9uc2Uuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c01lc3NhZ2U7XG4gICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlcnJvciwgJ3Jhd1Jlc3BvbnNlJywge1xuICAgICAgICAgICAgICAgIHZhbHVlOiByZXNwb25zZSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlcnJvciwgJ3Jhd1JlcXVlc3QnLCB7XG4gICAgICAgICAgICAgIHZhbHVlOiByZXEsXG4gICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICAvLyBuZXR3b3JrIGNvbm5lY3Rpdml0eSBwcm9ibGVtXG4gICAgICAgICAgICBzZXJ2ZXJPYmouc2VydmVySW5mb3MgPSBudWxsO1xuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yKTtcbiAgICAgICAgICAgIGlmIChwcm9taXNlUmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgcmVqZWN0UmVzcG9uc2UoZXJyb3IpOyAvLyB3aWxsIGFsc28gcmVqZWN0UmVzdWx0KGVycm9yKVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KGVycm9yKTsgLy8gcHJvbWlzZVJlc3BvbnNlIG5vdCBjb25zdHJ1Y3RlZCB5ZXRcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gc2VydmVyIGluZm9ybWF0aW9uXG4gICAgICAgICAgICBzZXJ2ZXJPYmouc2VydmVySW5mb3MgPSB7XG4gICAgICAgICAgICAgIHZlcnNpb246IHJlc3BvbnNlLmhlYWRlcnNbJ3gtcmVsdXRpb24tdmVyc2lvbiddLFxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogcmVzcG9uc2UuaGVhZGVyc1sneC1zZXJ2ZXInXVxuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSA1MDMgfHxcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zdGF0dXNDb2RlID09PSA1MDAgJiYgZXJyb3IuY2xhc3NOYW1lID09PSAnamF2YS51dGlsLmNvbmN1cnJlbnQuVGltZW91dEV4Y2VwdGlvbicpIHtcbiAgICAgICAgICAgICAgLy8gNTAzIChzZXJ2aWNlIHVuYXZhaWxhYmxlKSBpbmRpY2F0ZXMgdGhlIHNlcnZlciBpcyB0ZW1wb3JhcmlseSBvdmVybG9hZGVkLCBhbmQgdW5hYmxlXG4gICAgICAgICAgICAgIC8vIGhhbmRsaW5nIHRoZSByZXF1ZXN0LiBUaGlzIGhhcHBlbnMgd2hlbiBhc3luYyBkZWxlZ2F0aW9uIHRpbWVkIG91dCBvbiB0aGUgSmF2YSBzaWRlLFxuICAgICAgICAgICAgICAvLyB1c3VhbGx5IGFmdGVyIGFib3V0IDIgbWludXRlcy4gSW4gdGhpcyBjYXNlIHJldHJ5IHRoZSByZXF1ZXN0IHVudGlsIHdlIGFyZSBkb25lLi4uXG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VydmVyIG92ZXJsb2FkZWQsIHJldHJ5aW5nIHJlcXVlc3QuJyk7XG4gICAgICAgICAgICAgIC8vIGhlcmUgcHJvbWlzZVJlc3BvbnNlIG11c3QgaGF2ZSBiZWVuIHJlc29sdmVkIGFscmVhZHksXG4gICAgICAgICAgICAgIC8vIHdlIGNoYWluIGFueXdheXMgYmVjYXVzZSBvZiBlcnJvciBwcm9wYWdhdGlvblxuICAgICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlblJlc29sdmUoYWpheDxUPihvcHRpb25zKSkuZG9uZShyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpO1xuICAgICAgICAgICAgICByZXR1cm47IC8vIGVhcmx5IGV4aXQgYXMgcmVzdWx0IGlzIGhhbmRsZWQgYnkgZG9uZSBjYWxsIGFib3ZlXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAvLyBsb2dvbiBzZXNzaW9uIHByb2Nlc3NpbmdcbiAgICAgICAgICAgICAgbGV0IHNlc3Npb25Vc2VyVXVpZCA9IHJlc3BvbnNlLmhlYWRlcnNbJ3gtZ29mZXItdXNlciddO1xuICAgICAgICAgICAgICBpZiAoc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgICAgICAgICAgICAgc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9IHNlc3Npb25Vc2VyVXVpZDtcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXNDb2RlID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAvLyBhcHBhcmVudGx5IG91ciBzZXNzaW9uIGlzIGxvc3QhXG4gICAgICAgICAgICAgICAgc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9IG51bGw7XG4gICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFlcnJvcik7XG4gICAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdzZXJ2ZXIgc2Vzc2lvbiBpcyBsb3N0IScsIGVycm9yKTtcbiAgICAgICAgICAgICAgICBjb25zdCBjcmVkZW50aWFscyA9IHNlcnZlck9iai5jcmVkZW50aWFscztcbiAgICAgICAgICAgICAgICBpZiAoY3JlZGVudGlhbHMpIHtcbiAgICAgICAgICAgICAgICAgIC8vIHJlY292ZXIgYnkgYXR0ZW1wdGluZyBsb2dpbixcbiAgICAgICAgICAgICAgICAgIC8vIGhlcmUgcHJvbWlzZVJlc3BvbnNlIG11c3QgaGF2ZSBiZWVuIHJlc29sdmVkIGFscmVhZHksXG4gICAgICAgICAgICAgICAgICAvLyB3ZSBjaGFpbiBhbnl3YXlzIGJlY2F1c2Ugb2YgZXJyb3IgcHJvcGFnYXRpb25cbiAgICAgICAgICAgICAgICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XG4gICAgICAgICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlblJlc29sdmUobG9naW4oY3JlZGVudGlhbHMsIHtcbiAgICAgICAgICAgICAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICAgICAgICAgICAgICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xuICAgICAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NlcnZlciBzZXNzaW9uIHJlY292ZXJlZC4nKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGFqYXg8VD4ob3B0aW9ucyk7XG4gICAgICAgICAgICAgICAgICB9KSkuZG9uZShyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBlYXJseSBleGl0IGFzIHJlc3VsdCBpcyBoYW5kbGVkIGJ5IGRvbmUgY2FsbCBhYm92ZVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIGNvbXBsZXRlcyB0aGUgY2hhaW4gcHJvcGFnYXRpbmcgcmVzdWx0cywgbXVzdCBiZSBza2lwcGVkIHdoZW4gcmVxdWVzdCBpcyByZXRyaWVkIGFib3ZlXG4gICAgICAgICAgaWYgKHByb21pc2VSZXNwb25zZSkge1xuICAgICAgICAgICAgcHJvbWlzZVJlc3BvbnNlLnRoZW4oKHJlc3BvbnNlUmVzdWx0OiBodHRwLkluY29taW5nTWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiByZXNwb25zZVJlc3VsdCA9PT0gcmVzcCwgJ2RlZmluaXRpb24gb2YgYmVoYXZpb3IgaW4gY2FzZSAnICtcbiAgICAgICAgICAgICAgICAnb2YgcHJveHlpbmcgdGhlIG9yaWdpbmFsIHJlc3BvbnNlIGlzIHJlc2VydmVkIGZvciBmdXR1cmUgZXh0ZW5zaW9uIScpO1xuXG4gICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlamVjdFJlc3VsdChlcnJvcik7XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZVJlc3VsdChib2R5KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgKHJlc3BvbnNlRXJyb3IpID0+IHtcbiAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KHJlc3BvbnNlRXJyb3IpO1xuICAgICAgICAgICAgfSkuZG9uZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBwYXRoIHRha2VuIHdoZW4gcmVxdWVzdC5qcyB0aHJvd3NcbiAgICAgICAgcmV0dXJuIHJlamVjdFJlc3VsdChlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIHRyYW5zcG9ydCByZXNwb25zZVxuICAgICAgdHJ5IHtcbiAgICAgICAgUShyZXF1ZXN0Q2FsbGJhY2socmVxKSkudGhlbigocmVxdWVzdCA9IHJlcSkgPT4ge1xuICAgICAgICAgIHJlcXVlc3Qub24oJ3Jlc3BvbnNlJywgKHJlc3BvbnNlOiBodHRwLkluY29taW5nTWVzc2FnZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZXNwKSB7XG4gICAgICAgICAgICAgIHJlc3AgPSByZXNwb25zZTtcbiAgICAgICAgICAgICAgcmVzb2x2ZVJlc3BvbnNlKHJlc3BvbnNlQ2FsbGJhY2socmVzcCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiByZXF1ZXN0O1xuICAgICAgICB9KS5kb25lKCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAvLyBwYXRoIHRha2VuIHdoZW4gcmVxdWVzdENhbGxiYWNrIHRocm93c1xuICAgICAgICByZXR1cm4gcmVqZWN0UmVzcG9uc2UoZXJyb3IpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiByZXNwb25zZSBkYXRhIG9mIGxvZ2luIGVuZHBvaW50cy5cbiAqXG4gKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gVXNlckluZm9XcmFwcGVyIGluIEphdmEgY29kZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcbiAgLy8gY29tLm13YXlzb2x1dGlvbnMuZ29mZXIyLnNlY3VyaXR5LmRvbWFpbi5Vc2VySW5mb1dyYXBwZXJcbiAgdXNlcjogcm9sZXMuVXNlcjtcbiAgcm9sZXM6IHJvbGVzLlJvbGVEdG9bXTtcbiAgb3JnYW5pemF0aW9uOiByb2xlcy5Pcmdhbml6YXRpb247XG5cbiAgbGljZW5zZUluZm9zOiB7XG4gICAgLy8gY29tLm13YXlzb2x1dGlvbnMuZ29mZXIyLnNlY3VyaXR5LmRvbWFpbi5MaWNlbnNlSW5mb3NcbiAgICBsaWNlbnNlTW9kZWxOYW1lOiBzdHJpbmc7XG4gICAgbGljZW5zZUluZm9zOiBfLkRpY3Rpb25hcnk8YW55PlxuICB9O1xuICAvKipcbiAgICogbGlzdHMgZXhwZXJpbWVudGFsIGZlYXR1cmVzIGVuYWJsZWQgb24gdGhlIHNlcnZlci5cbiAgICovXG4gIGFjdGl2ZUZlYXR1cmVUb2dnbGVzPzogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIGV2ZW50dWFsbHkgcmV0dXJuZWQgZGF0YSBvZiB0aGUgTG9nb25DYWxsYmFjayBpcyBzdG9yZWQgaGVyZS5cbiAgICovXG4gIGxvZ29uSW5mb3M/OiBhbnk7XG59XG5cbi8qKlxuICogb3B0aW9ucyBmb3IgdXNlIGJ5IGJvdGggW1tsb2dpbl1dIGFuZCBbW2xvZ291dF1dLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ29uT3B0aW9ucyBleHRlbmRzIGluaXQuU2VydmVyVXJsT3B0aW9ucyB7XG5cbiAgLyoqXG4gICAqIHNwZWNpZmllcyB3aGV0aGVyIGxvZ2luIHJlc3BvbnNlIGRhdGEgaXMgcGVyc2lzdGVkIHN1Y2ggdGhhdCBzdWJzZXF1ZW50IGxvZ29ucyBjYW4gYmVcbiAgICogcHJvY2Vzc2VkIGV2ZW4gaWYgY29tbXVuaWNhdGlvbiB3aXRoIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgaXMgaW1wb3NzaWJsZSBhdCB0aGF0IHRpbWUuXG4gICAqXG4gICAqIE9uIFtbbG9naW5dXSBzZXQgdG8gYHRydWVgIHRvIHBlcnNpc3QgdGhlIHJlc3BvbnNlIHRvIG9mZmxpbmUgc3RvcmFnZSBzdWNoIHRoYXRcbiAgICogc3Vic2VxdWVudCBsb2dvbiB0byB0aGUgc2FtZSBzZXJ2ZXIgd2lsbCByZXVzZSBpdCBldmVuIGFmdGVyIHRoZSBjbGllbnQgYXBwIGlzIHJlc3RhcnRlZC5cbiAgICogVGhlIHJlc3BvbnNlIGRhdGEgaXMgc3RvcmVkIGluIGVuY3J5cHRlZCBmb3JtLiBPbmNlIHN0b3JlZCwgY2FsbGluZyBbW2xvZ2luXV0gd2l0aCB0aGVcbiAgICogc2FtZSBzZXQgb2YgY3JlZGVudGlhbHMgd2lsbCBzdWNjZWVkIGV2ZW4gaWYgdGhlIFJlbHV0aW9uIHNlcnZlciBjYW4gbm90IGJlIHJlYWNoZWQuIEluXG4gICAqIHRoaXMgY2FzZSwgY3JlZGVudGlhbHMgYXJlIHZlcmlmaWVkIGJ5IGRlY3J5cHRpb24gb2YgdGhlIGVuY3J5cHRlZCByZXNwb25zZSBkYXRhLlxuICAgKlxuICAgKiBPbiBbW2xvZ291dF1dIHNldCB0byBgdHJ1ZWAgdG8gdWx0aW1hdGVseSBlcmFzZSB0aGUgcmVzcG9uc2UgZnJvbSBvZmZsaW5lIHN0b3JhZ2UgYXMgd2VsbCxcbiAgICogYWZ0ZXIgaGF2aW5nIGl0IHN0b3JlZCB1c2luZyB0aGUgbWVjaGFuaXNtIGRlc2NyaWJlZCBhYm92ZS5cbiAgICovXG4gIG9mZmxpbmVDYXBhYmxlPzogYm9vbGVhbjtcblxufVxuXG4vKipcbiAqIG9wdGlvbnMgc3BlY2lmaWMgdG8gW1tsb2dpbl1dIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luT3B0aW9ucyBleHRlbmRzIExvZ29uT3B0aW9ucywgaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucyB7XG59XG5cbi8qKlxuICogbG9ncyBpbnRvIGEgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIE5vdGljZSwgc3BlY2lmeWluZyBgb2ZmbGluZUNhcGFibGU9dHJ1ZWAgaW4gdGhlIG9wdGlvbnMgd2lsbCBzdG9yZSB0aGUgbG9naW4gcmVzcG9uc2UgbG9jYWxseSBvblxuICogdGhlIGRldmljZSB3aGVuIG9ubGluZSBhbmQgdGhlIGxvZ2luIHN1Y2NlZWRlZC4gV2hlbiBvZmZsaW5lLCB0aGUgb3B0aW9uIHdpbGwgcmV1c2UgdGhlIHN0b3JlZFxuICogcmVzcG9uc2UuIERhdGEgZW5jcnlwdGlvbiBpcyB1c2VkIGd1YXJhbnRlZWluZyBib3RoIHNlY3JlY3kgb2YgbG9naW4gZGF0YSBhbmQgdmVyaWZpY2F0aW9uIG9mXG4gKiB0aGUgY3JlZGVudGlhbHMgcHJvdmlkZWQuXG4gKlxuICogQHBhcmFtIGNyZWRlbnRpYWxzIHRvIHVzZS5cbiAqIEBwYXJhbSBsb2dpbk9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXG4gKiBAcmV0dXJuIHtRLlByb21pc2U8TG9naW5SZXNwb25zZT59IG9mIGxvZ2luIHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBqYXZhc2NyaXB0XG4gKlxuICogaW1wb3J0ICogYXMgUmVsdXRpb24gZnJvbSAncmVsdXRpb24tc2RrJztcbiAqIC8vY29uZmlnXG4gKiBSZWx1dGlvbi5pbml0KHtcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCdcbiAqIH0pO1xuICpcbiAqIGxldCBjcmVkZW50aWFscyA9IHtcbiAqICAgIHVzZXJOYW1lOiAnbXl1c2VybmFtZScsXG4gKiAgICBwYXNzd29yZDogJ215cGFzc3dvcmQnXG4gKiB9O1xuICpcbiAqIC8vdXNhZ2VcbiAqXG4gKiAvLyBQcm9taXNlXG4gKiBSZWx1dGlvbi53ZWIubG9naW4oY3JlZGVudGlhbHMpXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCk7KVxuICogIC5jYXRjaCgoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxuICogIC5maW5hbGx5KCgpID0+IGNvbnNvbGUubG9nKCdjb21wbGV0ZScpKTtcbiAqXG4gKiAvL09ic2VydmFibGVcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmxvZ2luKGNyZWRlbnRpYWxzKSkuc3Vic2NyaWJlKFxuICogIChyZXNwOiBhbnkpID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCksXG4gKiAgKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXG4gKiAgKCkgPT4gY29uc29sZS5sb2coJ2NvbXBsZXRlJylcbiAqIClcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9naW4oY3JlZGVudGlhbHM6IGF1dGguQ3JlZGVudGlhbHMsXG4gICAgICAgICAgICAgICAgICAgICAgbG9naW5PcHRpb25zOiBMb2dpbk9wdGlvbnMgPSB7fSk6IFEuUHJvbWlzZTxMb2dpblJlc3BvbnNlPiB7XG4gIGxldCB3YXNPZmZsaW5lTG9naW4gPSBmYWxzZTtcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcignLycsIGxvZ2luT3B0aW9ucyk7XG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG4gIGlmIChzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgLy8gbG9nZ2VkIGluIGFscmVhZHlcbiAgICByZXR1cm4gbG9nb3V0KHtcbiAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXG4gICAgfSkudGhlbigoKSA9PiB7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICByZXR1cm4gbG9naW4oY3JlZGVudGlhbHMsIGxvZ2luT3B0aW9ucyk7IC8vIHJlcGVhdCBhZnRlciBsb2dvdXRcbiAgICB9KTtcbiAgfSBlbHNlIGlmIChzZXJ2ZXJPYmouY3JlZGVudGlhbHMpIHtcbiAgICAvLyBoYWQgY3JlZGVudGlhbHMgYnV0IG5vIHNlc3Npb24sIHNvIHdlIHdlcmUgbG9nZ2VkIGluIG9mZmxpbmVcbiAgICB3YXNPZmZsaW5lTG9naW4gPSB0cnVlO1xuICB9XG5cbiAgLy8gcHJvY2VzcyBvcHRpb25zXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIGFnZW50T3B0aW9uczogbG9naW5PcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcbiAgICBhZ2VudENsYXNzOiBsb2dpbk9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXG4gICAgLy8gb3B0aW9ucyB0YWtpbmcgZWZmZWN0IGF0IGxvZ2luIHRpbWVcbiAgICBjbGllbnRBcHA6IGxvZ2luT3B0aW9ucy5jbGllbnRBcHAgfHwgaW5pdC5pbml0T3B0aW9ucy5jbGllbnRBcHAsXG4gICAgbG9nb25DYWxsYmFjazogbG9naW5PcHRpb25zLmxvZ29uQ2FsbGJhY2sgfHwgaW5pdC5pbml0T3B0aW9ucy5sb2dvbkNhbGxiYWNrLFxuICAgIGNsaWVudENlcnRpZmljYXRlOiBsb2dpbk9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUgfHwgaW5pdC5pbml0T3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZVxuICB9KTtcbiAgbGV0IGxvZ29uQ2FsbGJhY2sgPSBjdXJyZW50T3B0aW9ucy5sb2dvbkNhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XG4gIHJldHVybiBhamF4PExvZ2luUmVzcG9uc2U+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHkvcmVzdC9hdXRoL2xvZ2luJyxcbiAgICBib2R5OiBjcmVkZW50aWFsc1xuICB9LCBjdXJyZW50T3B0aW9ucykpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgLy8gcmVhbCBwaHlzaWNhbCBsb2dvbiwgYWpheCBjYWxsIHNldHMgc2Vzc2lvblVzZXJVdWlkXG4gICAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ0JVRzogUmVsdXRpb24gZGlkIG5vdCBzZXQgWC1Hb2Zlci1Vc2VyIHJlc3BvbnNlIGhlYWRlcicpO1xuICAgICAgc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9IHJlc3BvbnNlLnVzZXIudXVpZDtcbiAgICB9XG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9PT0gcmVzcG9uc2UudXNlci51dWlkKTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0sIChlcnJvcjogSHR0cEVycm9yKSA9PiB7XG4gICAgLy8gb2ZmbGluZSBsb2dpbiByZXNwb25zZVxuICAgIGlmICghZXJyb3Iuc3RhdHVzQ29kZSAmJiBsb2dpbk9wdGlvbnMub2ZmbGluZUNhcGFibGUpIHtcbiAgICAgIC8vIGFqYXggdGltZW91dCAtPiBvZmZsaW5lIGxvZ2luIGF0dGVtcHRcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkLFxuICAgICAgICAnbm8gcGh5c2ljYWwgbG9naW4sIGFzIG90aGVyd2lzZSBsb2dvbkNhbGxiYWNrIHdvdWxkIGJlIGV4ZWN1dGVkJyk7XG4gICAgICByZXR1cm4gb2ZmbGluZS5mZXRjaE9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLnRoZW4oKGxvZ2luUmVzcG9uc2UpID0+IHtcbiAgICAgICAgaWYgKCFsb2dpblJlc3BvbnNlKSB7XG4gICAgICAgICAgLy8gd2hlbiB0aGVyZSBpcyBubyBwZXJzaXN0ZW50IGRhdGEgYXZhaWxhYmxlLCBha2EuIHRoaXMgaXMgdGhlIGluaXRpYWwgbG9naW4gYXR0ZW1wdCxcbiAgICAgICAgICAvLyBrZWVwIHNheWluZyB0aGUgc2VydmVyIGlzIG9mZmxpbmUuLi5cbiAgICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBsb2dpblJlc3BvbnNlO1xuICAgICAgfSwgKG9mZmxpbmVFcnJvcikgPT4ge1xuICAgICAgICAvLyBtb3N0IGxpa2VseSB0aGUgcGFzc3dvcmQgZW50ZXJlZCB3YXMgaW5jb3JyZWN0LFxuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIG9mZmxpbmVFcnJvciBpbmRpY2F0ZXMgdGhlIHNlcnZlciBpcyB1bmF2YWlsYWJsZSBhcyB3ZWxsXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFvZmZsaW5lRXJyb3Iuc3RhdHVzQ29kZSk7XG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFvZmZsaW5lRXJyb3IucmVxdWVzdFVybCk7XG4gICAgICAgIG9mZmxpbmVFcnJvci5yZXF1ZXN0VXJsID0gZXJyb3IucmVxdWVzdFVybDtcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5jYXVzZSk7XG4gICAgICAgIG9mZmxpbmVFcnJvci5jYXVzZSA9IGVycm9yO1xuICAgICAgICAvLyB3ZSByZXRocm93IHRoZSBhbm5vdGF0ZWQgZXJyb3Igb2YgZGVjb2RpbmcgdGhlIHN0b3JlZCByZXNwb25zZSxcbiAgICAgICAgLy8gYmVjYXVzZSB0aGUgbmV0d29yayBlcnJvciBqdXN0IGluZGljYXRlcyB3ZSBhcmUgb2ZmbGluZSBhbmQgZG9lc1xuICAgICAgICAvLyBub3QgbWVudGlvbiB0aGUgY3JlZGVudGlhbHMgYmVpbmcgaW5jb3JyZWN0IGFzIHRoaXMgb25lIGRvZXMuLi5cbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KG9mZmxpbmVFcnJvcik7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGVycm9yLnN0YXR1c0NvZGUgJiYgd2FzT2ZmbGluZUxvZ2luKSB7XG4gICAgICAvLyBzZXJ2ZXIgc2lkZSByZWplY3Rpb24sIGNsZWFyIGxvZ2luIGRhdGEgc28gdGhhdCBzdWJzZXF1ZW50IG9mZmxpbmUgbG9naW5zIGZhaWwgYXMgd2VsbFxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zKS5jYXRjaCgob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgIC8vIHRoaXMgaXMgYmFkIGJ1dCB3ZSBjYW4gbm90IGRvIG11Y2ggYWJvdXQgaXRcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdmYWlsZWQgZXJhc2luZyBvZmZsaW5lIGxvZ2luIGRhdGEnLCBvZmZsaW5lRXJyb3IpO1xuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgLy8gc3dpdGNoIGN1cnJlbnQgc2VydmVyXG4gICAgaWYgKCdyb2xlcycgaW4gcmVzcG9uc2Uucm9sZXMpIHtcbiAgICAgIC8vIGZpeGVzIGEgZGVmZWN0IG9mIEphdmEgaW1wbGVtZW50YXRpb25cbiAgICAgIHJlc3BvbnNlLnJvbGVzID0gcmVzcG9uc2Uucm9sZXNbJ3JvbGVzJ107XG4gICAgfVxuICAgIHNlcnZlck9iai5hdXRob3JpemF0aW9uID0ge1xuICAgICAgbmFtZTogcmVzcG9uc2UudXNlci51dWlkLFxuICAgICAgcm9sZXM6IF8ubWFwKHJlc3BvbnNlLnJvbGVzLCAocm9sZTogcm9sZXMuUm9sZUR0bykgPT4gcm9sZS51dWlkKVxuICAgIH07XG4gICAgc2VydmVyT2JqLm9yZ2FuaXphdGlvbiA9IHJlc3BvbnNlLm9yZ2FuaXphdGlvbjtcbiAgICBzZXJ2ZXJPYmoudXNlciA9IHJlc3BvbnNlLnVzZXI7XG4gICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gY3JlZGVudGlhbHM7XG4gICAgc2VydmVyLnNldEN1cnJlbnRTZXJ2ZXIoc2VydmVyT2JqKTtcbiAgICByZXR1cm4gcmVzcG9uc2U7XG4gIH0pLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgLy8gdGhpcyBpcyB0aGUgZWFybGllc3QgcG9pbnQgYXQgd2hpY2ggbGlicmFyeSBzdGF0ZSByZWZsZWN0cyBjb3JyZWN0IGF1dGhvcml6YXRpb24sIGV0Yy5cbiAgICAvLyBUaHVzLCB0aGUgbG9nb25DYWxsYmFjayBtYXkgZXhlY3V0ZSBoZXJlIG5vdywgYnV0IG9ubHkgaWYgd2UgYXJlIG9ubGluZSBhY3R1YWxseS4uLlxuICAgIGlmICghc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xuICAgICAgcmV0dXJuIHJlc3BvbnNlOyAvLyBvZmZsaW5lXG4gICAgfVxuICAgIC8vIHdlIGhhdmUgYSBzZXNzaW9uIGxvZ2dlZCBpbnRvIHRoaXMgdXNlclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPT09IHNlcnZlci5nZXRDdXJyZW50QXV0aG9yaXphdGlvbigpLm5hbWUpO1xuXG4gICAgLy8gcnVuIGxvZ29uQ2FsbGJhY2sgb24gcmVzcG9uc2UgZGF0YSBhbmQgZXZlbnR1YWxseSBzdG9yZSByZXN1bHRhbnQgb2JqZWN0IGZvciBvZmZsaW5lIGxvZ2luLFxuICAgIC8vIGJlY2F1c2UgdGhpcyB3YXkgdGhlIGNhbGxiYWNrIG1heSBhZGQgaW5mb3JtYXRpb24gdG8gdGhlIHJlc3BvbnNlIG9iamVjdCB0aGF0IHdpbGwgYWxzbyBiZVxuICAgIC8vIHBlcnNpc3RlZCBhbmQgbWFkZSBhdmFpbGFibGUgYWdhaW4gd2hlbiBvZmZsaW5lIVxuICAgIHJldHVybiBRKGxvZ29uQ2FsbGJhY2socmVzcG9uc2UpKS50aGVuKChsb2dvbkluZm9zID0gcmVzcG9uc2UpID0+IHtcbiAgICAgIGlmIChsb2dvbkluZm9zICYmIGxvZ29uSW5mb3MgIT09IHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIGFueSBkYXRhIHJldHVybmVkIGJ5IHRoZSBsb2dvbkNhbGxiYWNrIG1heSBiZSBzdG9yZWQgaGVyZVxuICAgICAgICByZXNwb25zZS5sb2dvbkluZm9zID0gbG9nb25JbmZvcztcbiAgICAgIH1cblxuICAgICAgLy8gc3RvcmUgb2ZmbGluZSBsb2dpbiByZXNwb25zZVxuICAgICAgaWYgKGxvZ2luT3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSB8fCB3YXNPZmZsaW5lTG9naW4pIHtcbiAgICAgICAgLy8gaW5pdGlhbCBzdG9yZSBvciB1cGRhdGUgb2YgbG9naW4gZGF0YVxuICAgICAgICByZXR1cm4gb2ZmbGluZS5zdG9yZU9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMsIHJlc3BvbnNlKS5jYXRjaChcbiAgICAgICAgICAob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ29mZmxpbmUgbG9naW4gc3RvcmUgZmFpbGVkJywgb2ZmbGluZUVycm9yKTtcbiAgICAgICAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXNwb25zZTtcbiAgICB9LCAoZXJyb3IpID0+IHtcbiAgICAgIC8vIGxvZ29uIGNhbGxiYWNrIGZhaWxlZCwgbXVzdCBsb2dvdXQgdG8gYXZvaWQgbWFraW5nIGFqYXggY2FsbHMgaW4gYW4gdW5rbm93biBiYWNrZW5kIHN0YXRlXG4gICAgICByZXR1cm4gbG9nb3V0KHtcbiAgICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICAgIH0pLmNhdGNoKChsb2dvdXRFcnJvcikgPT4ge1xuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCdmYWlsZWQgdG8gbG9nb3V0IGFmdGVyIGxvZ2luIGZhaWx1cmUnLCBsb2dvdXRFcnJvcik7XG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAgICAgLy8gbG9nb3V0IHByb2Nlc3NpbmcgbXVzdCBsZWF2ZSB1cyB3aXRoIG5vIHVzZXIgc2Vzc2lvblxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbi8qKlxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ291dF1dIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ291dE9wdGlvbnMgZXh0ZW5kcyBMb2dvbk9wdGlvbnMsIGluaXQuSHR0cEFnZW50T3B0aW9ucyB7XG59O1xuXG4vKipcbiAqIGxvZ3Mgb3V0IG9mIGEgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEZvciBleHBsaWNpdCBsb2dvdXRzICh0cmlnZ2VyIGJ5IGFwcCB1c2VyIHByZXNzaW5nIGEgbG9nb3V0IGJ1dHRvbiwgZm9yIGV4YW1wbGUpIHNwZWNpZnlpbmdcbiAqIGBvZmZsaW5lQ2FwYWJsZSA9IHRydWVgIHdpbGwgZHJvcCBhbnkgcGVyc2lzdGVkIG9mZmxpbmUgbG9naW4gZGF0YSBmb3IgdGhlIHNlcnZlciBsb2dnaW5nIG91dFxuICogb2YuXG4gKlxuICogQHBhcmFtIGxvZ291dE9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXG4gKiBAcmV0dXJuIHtRLlByb21pc2U8dm9pZD59IG9mIGxvZ291dCByZXNwb25zZS5cbiAqXG4gKiBAZXhhbXBsZVxuICogYGBgamF2YXNjcmlwdFxuICpcbiAqIFJlbHV0aW9uLndlYi5sb2dvdXQoKVxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApOylcbiAqICAuY2F0Y2goKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKSlcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpKTtcbiAqXG4gKiAvL09ic2VydmFibGVcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmxvZ291dCgpKS5zdWJzY3JpYmUoXG4gKiAgKHJlc3A6IGFueSkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKSxcbiAqICAoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpXG4gKiApXG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGxvZ291dChsb2dvdXRPcHRpb25zOiBMb2dvdXRPcHRpb25zID0ge30pOiBRLlByb21pc2U8dm9pZD4ge1xuICBsZXQgc2VydmVyVXJsID0gdXJscy5yZXNvbHZlU2VydmVyKCcvJywgbG9nb3V0T3B0aW9ucyk7XG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG5cbiAgLy8gcHJvY2VzcyBvcHRpb25zXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIGFnZW50T3B0aW9uczogbG9nb3V0T3B0aW9ucy5hZ2VudE9wdGlvbnMgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudE9wdGlvbnMsXG4gICAgYWdlbnRDbGFzczogbG9nb3V0T3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgbG9nb3V0IHRpbWVcbiAgfSk7XG4gIHJldHVybiBhamF4PHZvaWQ+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHkvcmVzdC9hdXRoL2xvZ291dCcsXG4gICAgYm9keToge31cbiAgfSwgY3VycmVudE9wdGlvbnMpKS5jYXRjaCgoZXJyb3I6IEh0dHBFcnJvcikgPT4ge1xuICAgIGlmIChlcnJvci5zdGF0dXNDb2RlID09PSA0MjIpIHtcbiAgICAvLyBSRVNULWJhc2VkIGxvZ291dCBVUkwgY3VycmVudGx5IGlzIGJyb2tlbiByZXBvcnRpbmcgYSA0MjIgaW4gYWxsIGNhc2VzXG4gICAgICByZXR1cm4gYWpheDx2b2lkPihfLmRlZmF1bHRzPEh0dHBPcHRpb25zPih7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcbiAgICAgIG1ldGhvZDogJ0dFVCcsXG4gICAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHktbG9nb3V0J1xuICAgIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcud2FybignQlVHOiByZXNvcnRlZCB0byBjbGFzc2ljIFBBVEgtYmFzZWQgbG9nb3V0IGFzIFJFU1QtYmFzZWQgbG9nb3V0IGZhaWxlZDonLFxuICAgICAgICAgIGVycm9yKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9LCAoZXJyb3IyOiBIdHRwRXJyb3IpID0+IHtcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yMi5zdGF0dXNDb2RlID09PSA0MjIgPyBlcnJvciA6IGVycm9yMik7XG4gICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XG4gIH0pLmNhdGNoKChlcnJvcjogSHR0cEVycm9yKSA9PiB7XG4gICAgLy8gaWdub3JlIG5ldHdvcmsgZmFpbHVyZXMgb24gdGltZW91dCwgc2VydmVyIGZvcmdldHMgb24gc2Vzc2lvbiB0aW1lb3V0IGFueXdheXNcbiAgICBpZiAoIWVycm9yLnN0YXR1c0NvZGUpIHtcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcbiAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgLy8gZXZlbnR1YWxseSBlcmFzZSBvZmZsaW5lIGxvZ2luIGRhdGFcbiAgICBpZiAobG9nb3V0T3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSkge1xuICAgICAgLy8gcmVxdWVzdGVkIHRvIGVyYXNlIGxvZ2luIGRhdGFcbiAgICAgIHJldHVybiBvZmZsaW5lLmNsZWFyT2ZmbGluZUxvZ2luKHNlcnZlck9iai5jcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLmNhdGNoKFxuICAgICAgICAob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcbiAgICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xuICAgICAgfSk7XG4gICAgfVxuICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAvLyBmb3JnZXQgZXZlcnl0aGluZyBhYm91dCBpdFxuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XG4gICAgc2VydmVyT2JqLmF1dGhvcml6YXRpb24gPSBhdXRoLkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OO1xuICAgIHNlcnZlck9iai5vcmdhbml6YXRpb24gPSBudWxsO1xuICAgIHNlcnZlck9iai51c2VyID0gbnVsbDtcbiAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gbnVsbDtcbiAgfSk7XG59XG4iXX0=