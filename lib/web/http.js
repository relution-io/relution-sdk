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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksT0FBTyxXQUFNLFNBQVMsQ0FBQyxDQUFBO0FBQ25DLElBQVksSUFBSSxXQUFNLE1BQU0sQ0FBQyxDQUFBO0FBRTdCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBRXJDLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFFekMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUVyQyw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNy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LENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgd2ViL2h0dHAudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIHdlYlxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcblxyXG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xyXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJ2h0dHAnO1xyXG5cclxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xyXG5pbXBvcnQgKiBhcyBpbml0IGZyb20gJy4uL2NvcmUvaW5pdCc7XHJcbmltcG9ydCAqIGFzIGRvbWFpbiBmcm9tICcuLi9jb3JlL2RvbWFpbic7XHJcbmltcG9ydCAqIGFzIGF1dGggZnJvbSAnLi4vc2VjdXJpdHkvYXV0aCc7XHJcbmltcG9ydCAqIGFzIHJvbGVzIGZyb20gJy4uL3NlY3VyaXR5L3JvbGVzJztcclxuaW1wb3J0ICogYXMgc2VydmVyIGZyb20gJy4uL3NlY3VyaXR5L3NlcnZlcic7XHJcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi91cmxzJztcclxuaW1wb3J0ICogYXMgb2ZmbGluZSBmcm9tICcuL29mZmxpbmUnO1xyXG5cclxuLy8gcmVxdWlyZSByZXF1ZXN0LmpzIHRvIG1hbmFnZSBjb29raWVzIGZvciB1c1xyXG5sZXQgcmVxdWVzdERlZmF1bHRzID0ge1xyXG4gIGpzb246IHRydWUsXHJcbiAgamFyOiB0cnVlLFxyXG4gIHdpdGhDcmVkZW50aWFsczogdHJ1ZVxyXG59O1xyXG5sZXQgcmVxdWVzdFdpdGhEZWZhdWx0cyA9IHJlcXVlc3QuZGVmYXVsdHMocmVxdWVzdERlZmF1bHRzKTtcclxuXHJcbi8qKlxyXG4gKiBjYWxsYmFjayBhbGxvd2luZyBjdXN0b21pemluZyBhbiBvYmplY3Qgbm90IGltbWVkaWF0ZWx5IGF2YWlsYWJsZSBhdCB0aW1lIG9mIGNhbGwuXHJcbiAqXHJcbiAqIEBwYXJhbSBvYmplY3QgZm9yIGluc3BlY3Rpb24gb3IgY3VzdG9taXphdGlvbi5cclxuICogQHJldHVybiBwcm9taXNlIG9yIG9iamVjdCBvbiBzYW1lIGRlZmVycmVkIG9iamVjdC5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSHR0cENhbGxiYWNrPFQ+IHtcclxuICAodmFsdWU6IFQpOiBRLlByb21pc2U8VD4gfCBUO1xyXG59XHJcblxyXG4vKipcclxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVxdWVzdC5cclxuICovXHJcbmV4cG9ydCB0eXBlIEh0dHBSZXF1ZXN0ID0gcmVxdWVzdC5SZXF1ZXN0O1xyXG4vKipcclxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVzcG9uc2UuXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBIdHRwUmVzcG9uc2UgPSBodHRwLkluY29taW5nTWVzc2FnZTtcclxuXHJcbi8qKlxyXG4gKiBuYW1lZCBwYXJhbWV0ZXJzIG9mIHRoZSBbW2h0dHBdXSBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgSHR0cE9wdGlvbnMgZXh0ZW5kcyByZXF1ZXN0LkNvcmVPcHRpb25zLCByZXF1ZXN0LlVybE9wdGlvbnMsXHJcbiAgICBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcclxuICAvKipcclxuICAgKiBvcHRpb25hbCBjYWxsYmFjayBhbGxvd2luZyB0byBjdXN0b21pemUgdGhlIGNsaWVudCByZXF1ZXN0IGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcclxuICAgKiBkZWZhdWx0LlxyXG4gICAqL1xyXG4gIHJlcXVlc3RDYWxsYmFjaz86IEh0dHBDYWxsYmFjazxIdHRwUmVxdWVzdD47XHJcbiAgLyoqXHJcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gaW5zcGVjdCB0aGUgc2VydmVyIHJlc3BvbnNlIGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcclxuICAgKiBkZWZhdWx0LlxyXG4gICAqL1xyXG4gIHJlc3BvbnNlQ2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlc3BvbnNlPjtcclxufVxyXG5cclxuLyoqXHJcbiAqIGZhaWx1cmUgb2YgYW4gYWpheCByZXF1ZXN0LlxyXG4gKlxyXG4gKiBUaGlzIHR5cGUgY2FuIGJlIHVzZWQgYXMgdHlwZSBhbm5vdGF0aW9uIG9mIHRoZSBlcnJvciB0aGUgUHJvbWlzZSByZXR1cm5lZCBieSBhamF4IGlzIHJlamVjdGVkXHJcbiAqIHdpdGguXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBIdHRwRXJyb3IgZXh0ZW5kcyBFcnJvciB7XHJcbiAgLyoqXHJcbiAgICogZnVsbHkgcmVzb2x2ZWQgdXJsIHRoZSByZXF1ZXN0IHdhcyBzZW50IHRvLlxyXG4gICAqL1xyXG4gIHJlcXVlc3RVcmw/OiBzdHJpbmc7XHJcblxyXG4gIC8qKlxyXG4gICAqIEhUVFAgc3RhdHVzIGNvZGUgb2YgZmFpbHVyZS5cclxuICAgKi9cclxuICBzdGF0dXNDb2RlPzogbnVtYmVyO1xyXG4gIC8qKlxyXG4gICAqIEhUVFAgc3RhdHVzIG1lc3NhZ2Ugb2YgZmFpbHVyZS5cclxuICAgKi9cclxuICBzdGF0dXNNZXNzYWdlPzogc3RyaW5nO1xyXG5cclxuICAvKipcclxuICAgKiBpbiBtYW55IGNhc2VzIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgcmVwb3J0cyBoZXJlIHRoZSBmdWxseSBxdWFsaWZpZWQgbmFtZSBvZiBhIEphdmEgRXhjZXB0aW9uXHJcbiAgICogdGhhdCBtYXkgYmUgdXNlZCB0byBmdXJ0aGVyIGRpZmZlcmVudGlhdGUgdGhlIGVycm9yLlxyXG4gICAqL1xyXG4gIGNsYXNzTmFtZT86IHN0cmluZztcclxuICAvKipcclxuICAgKiBtYXkgYmUgc2V0IHRvIHNvbWUgYXJiaXRyYXJ5IHZhbHVlIGRlc2NyaWJpbmcgdGhlIGNhdXNlIG9mIGZhaWx1cmUsIG1vc3RseSBwcmVzZW50IHdoZW5cclxuICAgKiB0cmFuc3BvcnRpbmcgSmF2YSBFeGNlcHRpb24gb2JqZWN0cy5cclxuICAgKi9cclxuICBjYXVzZT86IGFueTtcclxuXHJcbiAgLyoqXHJcbiAgICogZGV0YWlscyBvZiByZXF1ZXN0IGZhaWxlZC5cclxuICAgKlxyXG4gICAqIFRoaXMgaXMgYSBub24tZW51bWVyYWJsZSBwcm9wZXJ0eSBhbmQgdGh1cyBub3QgcGFydCBvZiB0aGUgSlNPTiByZXByZXNlbnRhdGlvbiBvZiB0aGUgZmFpbHVyZS5cclxuICAgKiBJdCBpcyBwcm92aWRlZCBmb3IgaW5mb3JtYWwgcHVycG9zZXMgYXMgYSBkZWJ1Z2dpbmcgYWlkIG9ubHkuIENsaWVudCBjb2RlIHNob3VsZCBub3QgcmVseSBvblxyXG4gICAqIHRoaXMgdmFsdWUuXHJcbiAgICpcclxuICAgKiBAc2VlIHJlc3BvbnNlXHJcbiAgICovXHJcbiAgcmF3UmVxdWVzdD86IEh0dHBSZXF1ZXN0O1xyXG4gIC8qKlxyXG4gICAqIGRldGFpbHMgb2YgcmVzcG9uc2UgZmFpbGVkLlxyXG4gICAqXHJcbiAgICogVGhpcyBpcyBhIG5vbi1lbnVtZXJhYmxlIHByb3BlcnR5IGFuZCB0aHVzIG5vdCBwYXJ0IG9mIHRoZSBKU09OIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBmYWlsdXJlLlxyXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXHJcbiAgICogdGhpcyB2YWx1ZS5cclxuICAgKlxyXG4gICAqIEBzZWUgcmVxdWVzdFxyXG4gICAqL1xyXG4gIHJhd1Jlc3BvbnNlPzogSHR0cFJlc3BvbnNlO1xyXG59XHJcblxyXG4vKipcclxuICogZHJpdmVzIGFuIEhUVFAgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIEJlaGF2aW9yIG9mIHRoaXMgbWV0aG9kIGlzIHNpbXBsaWZpZWQgZnJvbSBtb3N0IEhUVFAvQUpBWCBpbXBsZW1lbnRhdGlvbnM6XHJcbiAqIC0gV2hlbiB0aGUgSFRUUCByZXF1ZXN0IHN1Y2NlZWRzIHRoZSByZXN1bHRpbmcgcHJvbWlzZSByZXNvbHZlcyB0byB0aGUgcmVzcG9uc2UgYm9keS5cclxuICogLSBJbiBjYXNlIG9mIGEgbmV0d29yayBFcnJvciB0aGUgcHJvbWlzZSByZXNvbHZlcyB0byBhbiBIdHRwRXJyb3Igb2JqZWN0IHByb3ZpZGluZyBgcmVxdWVzdFVybGBcclxuICogICBidXQgbmVpdGhlciBgc3RhdHVzQ29kZWAgbm9yIGBzdGF0dXNNZXNzYWdlYC5cclxuICogLSBJbiBjYXNlIG9mIEhUVFAgZmFpbHVyZSB0aGUgcmVzdWx0aW5nIHByb21pc2UgaXMgcmVqZWN0ZWQgdG8gYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0IGNhcnJ5aW5nXHJcbiAqICAgdGhlIHByb3BlcnRpZXMgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICogLSBJZiB0aGUgc2VydmVyIHJlc3BvbmRzIGEgSlNPTiwgaXQgaXMgcGFyc2VkIGFuZCBhc3N1bWVkIHRvIGJlIGFuIEh0dHBFcnJvci1saWtlIG9iamVjdC4gVGhlXHJcbiAqICAgb2JqZWN0IGlzIGF1Z21lbnRlZCBieSB0aGUgcHJvcGVydGllcyBhcyBkZWZpbmVkIGFib3ZlLlxyXG4gKiAtIE90aGVyd2lzZSB0aGUgYm9keSBpcyBzdG9yZWQgYXMgYG1lc3NhZ2VgIG9mIGFuIEh0dHBFcnJvciBvYmplY3QgY3JlYXRlZC4gQWdhaW4sIHRoZSBwcm9wZXJ0aWVzXHJcbiAqICAgYWJvdmUgYXJlIHByb3ZpZGVkLlxyXG4gKiAtIEZpbmFsbHksIGluIGNhc2Ugb2YgSFRUUCBmYWlsdXJlIHdpdGggdGhlIHNlcnZlciBub3QgcHJvdmlkaW5nIGFueSByZXNwb25zZSBib2R5LCB0aGUgSHR0cEVycm9yXHJcbiAqICAgYG1lc3NhZ2VgIGlzIHNldCB0byB0aGUgYHN0YXR1c01lc3NhZ2VgLlxyXG4gKlxyXG4gKiBUaHVzLCB0byBkaWZmZXJlbnRpYXRlIG5ldHdvcmsgZmFpbHVyZXMgZnJvbSBzZXJ2ZXItc2lkZSBmYWlsdXJlcyB0aGUgYHN0YXR1c0NvZGVgIG9mIHRoZVxyXG4gKiBIdHRwRXJyb3IgcmVqZWN0aW9uIGlzIHRvIGJlaW5nIHVzZWQuIEZvciBkZWVwZXIgaW5zcGVjdGlvbiBwcm92aWRlIGFuXHJcbiAqIFtbb3B0aW9ucy5yZXNwb25zZUNhbGxiYWNrXV0uXHJcbiAqXHJcbiAqIGBgYGphdmFzY3JpcHRcclxuICogUmVsdXRpb24uaW5pdCh7XHJcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXHJcbiAqICAgIG9yZ2FuaXphdGlvbjogJ215T3JnYSdcclxuICogfSk7XHJcbiAqXHJcbiAqIGxldCBodHRwT3B0aW9uczogSHR0cE9wdGlvbnMgPSB7bWV0aG9kOiAnR0VUJywgdXJsOiAnYXBpL3YxL3Bvc3RzJ307XHJcbiAqXHJcbiAqIC8vdXNhZ2UgYXMgUHJvbWlzZVxyXG4gKiBSZWx1dGlvbi53ZWIuYWpheChodHRwT3B0aW9ucylcclxuICogIC50aGVuKChyZXNwKSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKTspXHJcbiAqICAuY2F0Y2goKGU6UmVsdXRpb24ud2ViLkh0dHBFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxyXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2xvYWRpbmcgY29tcGxldGUhJykpO1xyXG4gKlxyXG4gKiAvLyBhcyBPYnNlcnZhYmxlXHJcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmFqYXgoaHR0cE9wdGlvbnMpKS5zdWJzY3JpYmUoXHJcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncG9zdHMnLCByZXNwKSxcclxuICogIChlOlJlbHV0aW9uLndlYi5IdHRwRXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXHJcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnbG9hZGluZyBjb21wbGV0ZSEnKVxyXG4gKiApXHJcbiAqIGBgYFxyXG4gKiBAcGFyYW0gb3B0aW9ucyBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEh0dHBFcnJvciBvYmplY3RcclxuICogICAgaW5jbHVkaW5nIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYWpheDxUPihvcHRpb25zOiBIdHRwT3B0aW9ucyk6IFEuUHJvbWlzZTxUPiB7XHJcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcihvcHRpb25zLnVybCwgb3B0aW9ucyk7XHJcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcclxuICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgJiYgc2VydmVyT2JqLmNyZWRlbnRpYWxzKSB7XHJcbiAgICAvLyBub3QgbG9nZ2VkIGluXHJcbiAgICBsZXQgY3JlZGVudGlhbHMgPSBzZXJ2ZXJPYmouY3JlZGVudGlhbHM7XHJcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBudWxsO1xyXG4gICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCB7XHJcbiAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXHJcbiAgICB9KS50aGVuKCgpID0+IHtcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLmNyZWRlbnRpYWxzID09IGNyZWRlbnRpYWxzKTtcclxuICAgICAgcmV0dXJuIGFqYXg8VD4ob3B0aW9ucyk7IC8vIHJlcGVhdCBhZnRlciBsb2dpblxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvLyBwcm9jZXNzIG9wdGlvbnNcclxuICBsZXQgY3VycmVudE9wdGlvbnMgPSBzZXJ2ZXJPYmouYXBwbHlPcHRpb25zKHtcclxuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxyXG4gICAgYWdlbnRPcHRpb25zOiBvcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcclxuICAgIGFnZW50Q2xhc3M6IG9wdGlvbnMuYWdlbnRDbGFzcyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50Q2xhc3MsXHJcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgcmVxdWVzdCB0aW1lXHJcbiAgICBhcHBsaWNhdGlvbjogb3B0aW9ucy5hcHBsaWNhdGlvbiB8fCBpbml0LmluaXRPcHRpb25zLmFwcGxpY2F0aW9uLFxyXG4gICAgdGVuYW50T3JnYTogb3B0aW9ucy50ZW5hbnRPcmdhIHx8IGluaXQuaW5pdE9wdGlvbnMudGVuYW50T3JnYVxyXG4gIH0pO1xyXG5cclxuICAvLyByZXNvbHZlIHRhcmdldCB1cmxcclxuICBsZXQgdXJsID0gdXJscy5yZXNvbHZlVXJsKG9wdGlvbnMudXJsLCBjdXJyZW50T3B0aW9ucyk7XHJcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZyhvcHRpb25zLm1ldGhvZCArICcgJyArIHVybCk7XHJcbiAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gdXJsLnN1YnN0cigwLCBzZXJ2ZXJVcmwubGVuZ3RoKSA9PT0gc2VydmVyVXJsKTtcclxuXHJcbiAgbGV0IHJlcXVlc3RDYWxsYmFjayA9IG9wdGlvbnMucmVxdWVzdENhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XHJcbiAgbGV0IHJlc3BvbnNlQ2FsbGJhY2sgPSBvcHRpb25zLnJlc3BvbnNlQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcclxuICBvcHRpb25zID0gXy5jbG9uZShvcHRpb25zKTtcclxuICBvcHRpb25zLmFnZW50T3B0aW9ucyA9IGN1cnJlbnRPcHRpb25zLmFnZW50T3B0aW9ucztcclxuICBvcHRpb25zLmFnZW50Q2xhc3MgPSBjdXJyZW50T3B0aW9ucy5hZ2VudENsYXNzO1xyXG4gIGxldCBoZWFkZXJzID0ge307XHJcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcclxuICAgIC8vIGFkZCBYLUdvZmVyLVVzZXIgaGVhZGVyIHNvIHRoYXQgc2VydmVyIG1heSBjaGVjayB3ZSBhcmUgcnVubmluZyB1bmRlciBjb3JyZWN0IGlkZW50aXR5XHJcbiAgICBoZWFkZXJzWydYLUdvZmVyLVVzZXInXSA9IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQ7XHJcbiAgfVxyXG4gIGlmIChjdXJyZW50T3B0aW9ucy5jbGllbnRBcHApIHtcclxuICAgIC8vIGFkZCBYLVJlbHV0aW9uLUNsaWVudEFwcCBmb3Igc2VydmVyLXNpZGUgYW5hbHl0aWNzXHJcbiAgICBoZWFkZXJzWydYLVJlbHV0aW9uLUNsaWVudEFwcCddID0gY3VycmVudE9wdGlvbnMuY2xpZW50QXBwO1xyXG4gIH1cclxuICBpZiAoIV8uaXNFbXB0eShoZWFkZXJzKSkge1xyXG4gICAgb3B0aW9ucy5oZWFkZXJzID0gXy5kZWZhdWx0cyhoZWFkZXJzLCBvcHRpb25zLmhlYWRlcnMpO1xyXG4gIH1cclxuICByZXR1cm4gUS5Qcm9taXNlPFQ+KChyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpID0+IHtcclxuICAgIGxldCBwcm9taXNlUmVzcG9uc2UgPSBRLlByb21pc2UoKHJlc29sdmVSZXNwb25zZSwgcmVqZWN0UmVzcG9uc2UpID0+IHtcclxuICAgICAgbGV0IHJlc3A6IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xyXG4gICAgICBsZXQgcmVxOiByZXF1ZXN0LlJlcXVlc3Q7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgaWYgKG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpIHtcclxuICAgICAgICAgIC8vIGFwcGx5IGNlcnRpZmljYXRlIG9wdGlvbnNcclxuICAgICAgICAgIF8uZXh0ZW5kKG9wdGlvbnMsIG9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXEgPSByZXF1ZXN0V2l0aERlZmF1bHRzKHVybCwgb3B0aW9ucywgKGVycm9yOiBIdHRwRXJyb3IsIHJlc3BvbnNlID0gcmVzcCwgYm9keT86IGFueSkgPT4ge1xyXG4gICAgICAgICAgLy8gbm9kZS5qcyBhc3NpZ25zIHN0YXR1cyBzdHJpbmcgYXMgYm9keSBmb3Igc3RhdHVzIGNvZGVzIG5vdCBoYXZpbmcgYm9keSBkYXRhXHJcbiAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAyKSB7XHJcbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KGJvZHkgPT09IGh0dHAuU1RBVFVTX0NPREVTWzIwMl0sIGJvZHkpO1xyXG4gICAgICAgICAgICBib2R5ID0gdW5kZWZpbmVkOyAvLyByZXNvbHZlcyBwcm9taXNlIHRvIHVuZGVmaW5lZCBiZWxvd1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIGVycm9yIHByb2Nlc3NpbmdcclxuICAgICAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSA0MDApIHtcclxuICAgICAgICAgICAgaWYgKF8uaXNFcnJvcihib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIGNvcnJlY3QgYnV0IHByYWN0aWNhbGx5IGltcG9zc2libGVcclxuICAgICAgICAgICAgICBlcnJvciA9IGJvZHk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIHVzZSBwbGFpbi10ZXh0IGFzIEVycm9yIG1lc3NhZ2VcclxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihib2R5KTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0TGlrZShib2R5KSkge1xyXG4gICAgICAgICAgICAgIC8vIGJvZHkgaXMgb2JqZWN0IHJlcHJlc2VudGF0aW9uIG9mIHNlcnZlci1zaWRlIGVycm9yIG9yIGV4Y2VwdGlvbixcclxuICAgICAgICAgICAgICAvLyBjb252ZXJ0aW5nIHRvIHRydWUgRXJyb3Igb2JqZWN0IGhlcmVcclxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNNZXNzYWdlKTtcclxuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhXy5pc0FycmF5KGJvZHkpLFxyXG4gICAgICAgICAgICAgICAgJ2tpY2tzIGluIGZvciBhcnJheSByZXNwb25zZXMgYXMgd2VsbCwgbm90IHN1cmUgaWYgdGhpcyBpcyBkZXNpcmFibGUnKTtcclxuICAgICAgICAgICAgICBfLmV4dGVuZChlcnJvciwgYm9keSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgLy8gaGFuZGxlcyBudW1iZXJzLCBib29sZWFucywgZXRjLiBhc3NpZ25pbmcgYXMgY2F1c2Ugb2YgZmFpbHVyZVxyXG4gICAgICAgICAgICAgIGVycm9yID0gbmV3IEVycm9yKHJlc3BvbnNlLnN0YXR1c01lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgIGlmICghXy5pc1VuZGVmaW5lZChib2R5KSkge1xyXG4gICAgICAgICAgICAgICAgZXJyb3IuY2F1c2UgPSBib2R5O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBhZGRpdGlvbmFsIEh0dHBFcnJvciBwcm9wZXJ0aWVzIGV2ZW50dWFsbHkgc2V0IGJlbG93XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgLy8gY29tcGxldGVzIEh0dHBFcnJvciBjb25zdHJ1Y3Rpb25cclxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yLCAnc2hvdWxkIG9wZXJhdGUgdHJ1ZSBFcnJvciBpbnN0YW5jZXMnKTtcclxuICAgICAgICAgICAgZXJyb3IucmVxdWVzdFVybCA9IHVybDtcclxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzQ29kZSA9IHJlc3BvbnNlLnN0YXR1c0NvZGU7XHJcbiAgICAgICAgICAgICAgZXJyb3Iuc3RhdHVzTWVzc2FnZSA9IHJlc3BvbnNlLnN0YXR1c01lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVzcG9uc2UnLCB7XHJcbiAgICAgICAgICAgICAgICB2YWx1ZTogcmVzcG9uc2UsXHJcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlcnJvciwgJ3Jhd1JlcXVlc3QnLCB7XHJcbiAgICAgICAgICAgICAgdmFsdWU6IHJlcSxcclxuICAgICAgICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoIXJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgIC8vIG5ldHdvcmsgY29ubmVjdGl2aXR5IHByb2JsZW1cclxuICAgICAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnRJc0Vycm9yKGVycm9yKTtcclxuICAgICAgICAgICAgaWYgKHByb21pc2VSZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIHJlamVjdFJlc3BvbnNlKGVycm9yKTsgLy8gd2lsbCBhbHNvIHJlamVjdFJlc3VsdChlcnJvcilcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICByZWplY3RSZXN1bHQoZXJyb3IpOyAvLyBwcm9taXNlUmVzcG9uc2Ugbm90IGNvbnN0cnVjdGVkIHlldFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDUwMyB8fCByZXNwb25zZS5zdGF0dXNDb2RlID09PSA1MDAgJiZcclxuICAgICAgICAgICAgZXJyb3IuY2xhc3NOYW1lID09PSAnamF2YS51dGlsLmNvbmN1cnJlbnQuVGltZW91dEV4Y2VwdGlvbicpIHtcclxuICAgICAgICAgICAgLy8gNTAzIChzZXJ2aWNlIHVuYXZhaWxhYmxlKSBpbmRpY2F0ZXMgdGhlIHNlcnZlciBpcyB0ZW1wb3JhcmlseSBvdmVybG9hZGVkLCBhbmQgdW5hYmxlXHJcbiAgICAgICAgICAgIC8vIGhhbmRsaW5nIHRoZSByZXF1ZXN0LiBUaGlzIGhhcHBlbnMgd2hlbiBhc3luYyBkZWxlZ2F0aW9uIHRpbWVkIG91dCBvbiB0aGUgSmF2YSBzaWRlLFxyXG4gICAgICAgICAgICAvLyB1c3VhbGx5IGFmdGVyIGFib3V0IDIgbWludXRlcy4gSW4gdGhpcyBjYXNlIHJldHJ5IHRoZSByZXF1ZXN0IHVudGlsIHdlIGFyZSBkb25lLi4uXHJcbiAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VydmVyIG92ZXJsb2FkZWQsIHJldHJ5aW5nIHJlcXVlc3QuJyk7XHJcbiAgICAgICAgICAgIC8vIGhlcmUgcHJvbWlzZVJlc3BvbnNlIG11c3QgaGF2ZSBiZWVuIHJlc29sdmVkIGFscmVhZHksXHJcbiAgICAgICAgICAgIC8vIHdlIGNoYWluIGFueXdheXMgYmVjYXVzZSBvZiBlcnJvciBwcm9wYWdhdGlvblxyXG4gICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlblJlc29sdmUoYWpheDxUPihvcHRpb25zKSkuZG9uZShyZXNvbHZlUmVzdWx0LCByZWplY3RSZXN1bHQpO1xyXG4gICAgICAgICAgICByZXR1cm47IC8vIGVhcmx5IGV4aXQgYXMgcmVzdWx0IGlzIGhhbmRsZWQgYnkgZG9uZSBjYWxsIGFib3ZlXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBsb2dvbiBzZXNzaW9uIHByb2Nlc3NpbmdcclxuICAgICAgICAgICAgbGV0IHNlc3Npb25Vc2VyVXVpZCA9IHJlc3AuaGVhZGVyc1sneC1nb2Zlci11c2VyJ107XHJcbiAgICAgICAgICAgIGlmIChzZXNzaW9uVXNlclV1aWQpIHtcclxuICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gc2Vzc2lvblVzZXJVdWlkO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDQwMSkge1xyXG4gICAgICAgICAgICAgIC8vIGFwcGFyZW50bHkgb3VyIHNlc3Npb24gaXMgbG9zdCFcclxuICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gbnVsbDtcclxuICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhIWVycm9yKTtcclxuICAgICAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3NlcnZlciBzZXNzaW9uIGlzIGxvc3QhJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gc2VydmVyT2JqLmNyZWRlbnRpYWxzO1xyXG4gICAgICAgICAgICAgIGlmIChjcmVkZW50aWFscykge1xyXG4gICAgICAgICAgICAgICAgLy8gcmVjb3ZlciBieSBhdHRlbXB0aW5nIGxvZ2luLFxyXG4gICAgICAgICAgICAgICAgLy8gaGVyZSBwcm9taXNlUmVzcG9uc2UgbXVzdCBoYXZlIGJlZW4gcmVzb2x2ZWQgYWxyZWFkeSxcclxuICAgICAgICAgICAgICAgIC8vIHdlIGNoYWluIGFueXdheXMgYmVjYXVzZSBvZiBlcnJvciBwcm9wYWdhdGlvblxyXG4gICAgICAgICAgICAgICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShsb2dpbihjcmVkZW50aWFscywge1xyXG4gICAgICAgICAgICAgICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxyXG4gICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XHJcbiAgICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VydmVyIHNlc3Npb24gcmVjb3ZlcmVkLicpO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm4gYWpheDxUPihvcHRpb25zKTtcclxuICAgICAgICAgICAgICAgIH0pKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIGVhcmx5IGV4aXQgYXMgcmVzdWx0IGlzIGhhbmRsZWQgYnkgZG9uZSBjYWxsIGFib3ZlXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gY29tcGxldGVzIHRoZSBjaGFpbiBwcm9wYWdhdGluZyByZXN1bHRzLCBtdXN0IGJlIHNraXBwZWQgd2hlbiByZXF1ZXN0IGlzIHJldHJpZWQgYWJvdmVcclxuICAgICAgICAgIGlmIChwcm9taXNlUmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgcHJvbWlzZVJlc3BvbnNlLnRoZW4oKHJlc3BvbnNlUmVzdWx0OiBodHRwLkluY29taW5nTWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHJlc3BvbnNlUmVzdWx0ID09PSByZXNwLCAnZGVmaW5pdGlvbiBvZiBiZWhhdmlvciBpbiBjYXNlICcgK1xyXG4gICAgICAgICAgICAgICAgJ29mIHByb3h5aW5nIHRoZSBvcmlnaW5hbCByZXNwb25zZSBpcyByZXNlcnZlZCBmb3IgZnV0dXJlIGV4dGVuc2lvbiEnKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICByZWplY3RSZXN1bHQoZXJyb3IpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVzdWx0KGJvZHkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgKHJlc3BvbnNlRXJyb3IpID0+IHtcclxuICAgICAgICAgICAgICByZWplY3RSZXN1bHQocmVzcG9uc2VFcnJvcik7XHJcbiAgICAgICAgICAgIH0pLmRvbmUoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAvLyBwYXRoIHRha2VuIHdoZW4gcmVxdWVzdC5qcyB0aHJvd3NcclxuICAgICAgICByZXR1cm4gcmVqZWN0UmVzdWx0KGVycm9yKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gdHJhbnNwb3J0IHJlc3BvbnNlXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgUShyZXF1ZXN0Q2FsbGJhY2socmVxKSkudGhlbigocmVxdWVzdCA9IHJlcSkgPT4ge1xyXG4gICAgICAgICAgcmVxdWVzdC5vbigncmVzcG9uc2UnLCAocmVzcG9uc2U6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICghcmVzcCkge1xyXG4gICAgICAgICAgICAgIHJlc3AgPSByZXNwb25zZTtcclxuICAgICAgICAgICAgICByZXNvbHZlUmVzcG9uc2UocmVzcG9uc2VDYWxsYmFjayhyZXNwKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XHJcbiAgICAgICAgfSkuZG9uZSgpO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIC8vIHBhdGggdGFrZW4gd2hlbiByZXF1ZXN0Q2FsbGJhY2sgdGhyb3dzXHJcbiAgICAgICAgcmV0dXJuIHJlamVjdFJlc3BvbnNlKGVycm9yKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiByZXNwb25zZSBkYXRhIG9mIGxvZ2luIGVuZHBvaW50cy5cclxuICpcclxuICogVGhpcyBpcyBlcXVpdmFsZW50IHRvIFVzZXJJbmZvV3JhcHBlciBpbiBKYXZhIGNvZGUuXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luUmVzcG9uc2Uge1xyXG4gIC8vIGNvbS5td2F5c29sdXRpb25zLmdvZmVyMi5zZWN1cml0eS5kb21haW4uVXNlckluZm9XcmFwcGVyXHJcbiAgdXNlcjogcm9sZXMuVXNlcjtcclxuICByb2xlczogcm9sZXMuUm9sZUR0b1tdO1xyXG4gIG9yZ2FuaXphdGlvbjogcm9sZXMuT3JnYW5pemF0aW9uO1xyXG5cclxuICBsaWNlbnNlSW5mb3M6IHtcclxuICAgIC8vIGNvbS5td2F5c29sdXRpb25zLmdvZmVyMi5zZWN1cml0eS5kb21haW4uTGljZW5zZUluZm9zXHJcbiAgICBsaWNlbnNlTW9kZWxOYW1lOiBzdHJpbmc7XHJcbiAgICBsaWNlbnNlSW5mb3M6IF8uRGljdGlvbmFyeTxhbnk+XHJcbiAgfTtcclxuICAvKipcclxuICAgKiBsaXN0cyBleHBlcmltZW50YWwgZmVhdHVyZXMgZW5hYmxlZCBvbiB0aGUgc2VydmVyLlxyXG4gICAqL1xyXG4gIGFjdGl2ZUZlYXR1cmVUb2dnbGVzPzogc3RyaW5nW107XHJcblxyXG4gIC8qKlxyXG4gICAqIGV2ZW50dWFsbHkgcmV0dXJuZWQgZGF0YSBvZiB0aGUgTG9nb25DYWxsYmFjayBpcyBzdG9yZWQgaGVyZS5cclxuICAgKi9cclxuICBsb2dvbkluZm9zPzogYW55O1xyXG59XHJcblxyXG4vKipcclxuICogb3B0aW9ucyBmb3IgdXNlIGJ5IGJvdGggW1tsb2dpbl1dIGFuZCBbW2xvZ291dF1dLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMb2dvbk9wdGlvbnMgZXh0ZW5kcyBpbml0LlNlcnZlclVybE9wdGlvbnMge1xyXG5cclxuICAvKipcclxuICAgKiBzcGVjaWZpZXMgd2hldGhlciBsb2dpbiByZXNwb25zZSBkYXRhIGlzIHBlcnNpc3RlZCBzdWNoIHRoYXQgc3Vic2VxdWVudCBsb2dvbnMgY2FuIGJlXHJcbiAgICogcHJvY2Vzc2VkIGV2ZW4gaWYgY29tbXVuaWNhdGlvbiB3aXRoIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgaXMgaW1wb3NzaWJsZSBhdCB0aGF0IHRpbWUuXHJcbiAgICpcclxuICAgKiBPbiBbW2xvZ2luXV0gc2V0IHRvIGB0cnVlYCB0byBwZXJzaXN0IHRoZSByZXNwb25zZSB0byBvZmZsaW5lIHN0b3JhZ2Ugc3VjaCB0aGF0XHJcbiAgICogc3Vic2VxdWVudCBsb2dvbiB0byB0aGUgc2FtZSBzZXJ2ZXIgd2lsbCByZXVzZSBpdCBldmVuIGFmdGVyIHRoZSBjbGllbnQgYXBwIGlzIHJlc3RhcnRlZC5cclxuICAgKiBUaGUgcmVzcG9uc2UgZGF0YSBpcyBzdG9yZWQgaW4gZW5jcnlwdGVkIGZvcm0uIE9uY2Ugc3RvcmVkLCBjYWxsaW5nIFtbbG9naW5dXSB3aXRoIHRoZVxyXG4gICAqIHNhbWUgc2V0IG9mIGNyZWRlbnRpYWxzIHdpbGwgc3VjY2VlZCBldmVuIGlmIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgY2FuIG5vdCBiZSByZWFjaGVkLiBJblxyXG4gICAqIHRoaXMgY2FzZSwgY3JlZGVudGlhbHMgYXJlIHZlcmlmaWVkIGJ5IGRlY3J5cHRpb24gb2YgdGhlIGVuY3J5cHRlZCByZXNwb25zZSBkYXRhLlxyXG4gICAqXHJcbiAgICogT24gW1tsb2dvdXRdXSBzZXQgdG8gYHRydWVgIHRvIHVsdGltYXRlbHkgZXJhc2UgdGhlIHJlc3BvbnNlIGZyb20gb2ZmbGluZSBzdG9yYWdlIGFzIHdlbGwsXHJcbiAgICogYWZ0ZXIgaGF2aW5nIGl0IHN0b3JlZCB1c2luZyB0aGUgbWVjaGFuaXNtIGRlc2NyaWJlZCBhYm92ZS5cclxuICAgKi9cclxuICBvZmZsaW5lQ2FwYWJsZT86IGJvb2xlYW47XHJcblxyXG59XHJcblxyXG4vKipcclxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ2luXV0gZnVuY3Rpb24uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luT3B0aW9ucyBleHRlbmRzIExvZ29uT3B0aW9ucywgaW5pdC5TZXJ2ZXJJbml0T3B0aW9ucyB7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBsb2dzIGludG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIE5vdGljZSwgc3BlY2lmeWluZyBgb2ZmbGluZUNhcGFibGU9dHJ1ZWAgaW4gdGhlIG9wdGlvbnMgd2lsbCBzdG9yZSB0aGUgbG9naW4gcmVzcG9uc2UgbG9jYWxseSBvblxyXG4gKiB0aGUgZGV2aWNlIHdoZW4gb25saW5lIGFuZCB0aGUgbG9naW4gc3VjY2VlZGVkLiBXaGVuIG9mZmxpbmUsIHRoZSBvcHRpb24gd2lsbCByZXVzZSB0aGUgc3RvcmVkXHJcbiAqIHJlc3BvbnNlLiBEYXRhIGVuY3J5cHRpb24gaXMgdXNlZCBndWFyYW50ZWVpbmcgYm90aCBzZWNyZWN5IG9mIGxvZ2luIGRhdGEgYW5kIHZlcmlmaWNhdGlvbiBvZlxyXG4gKiB0aGUgY3JlZGVudGlhbHMgcHJvdmlkZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSBjcmVkZW50aWFscyB0byB1c2UuXHJcbiAqIEBwYXJhbSBsb2dpbk9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXHJcbiAqIEByZXR1cm4ge1EuUHJvbWlzZTxMb2dpblJlc3BvbnNlPn0gb2YgbG9naW4gcmVzcG9uc2UuXHJcbiAqXHJcbiAqIEBleGFtcGxlXHJcbiAqIGBgYGphdmFzY3JpcHRcclxuICpcclxuICogaW1wb3J0ICogYXMgUmVsdXRpb24gZnJvbSAncmVsdXRpb24tc2RrJztcclxuICogLy9jb25maWdcclxuICogUmVsdXRpb24uaW5pdCh7XHJcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCdcclxuICogfSk7XHJcbiAqXHJcbiAqIGxldCBjcmVkZW50aWFscyA9IHtcclxuICogICAgdXNlck5hbWU6ICdteXVzZXJuYW1lJyxcclxuICogICAgcGFzc3dvcmQ6ICdteXBhc3N3b3JkJ1xyXG4gKiB9O1xyXG4gKlxyXG4gKiAvL3VzYWdlXHJcbiAqXHJcbiAqIC8vIFByb21pc2VcclxuICogUmVsdXRpb24ud2ViLmxvZ2luKGNyZWRlbnRpYWxzKVxyXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCk7KVxyXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXHJcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGUnKSk7XHJcbiAqXHJcbiAqIC8vT2JzZXJ2YWJsZVxyXG4gKiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFJlbHV0aW9uLndlYi5sb2dpbihjcmVkZW50aWFscykpLnN1YnNjcmliZShcclxuICogIChyZXNwOiBhbnkpID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCksXHJcbiAqICAoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcclxuICogICgpID0+IGNvbnNvbGUubG9nKCdjb21wbGV0ZScpXHJcbiAqIClcclxuICogYGBgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9naW4oY3JlZGVudGlhbHM6IGF1dGguQ3JlZGVudGlhbHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICBsb2dpbk9wdGlvbnM6IExvZ2luT3B0aW9ucyA9IHt9KTogUS5Qcm9taXNlPExvZ2luUmVzcG9uc2U+IHtcclxuICBsZXQgd2FzT2ZmbGluZUxvZ2luID0gZmFsc2U7XHJcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcignLycsIGxvZ2luT3B0aW9ucyk7XHJcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcclxuICBpZiAoc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xyXG4gICAgLy8gbG9nZ2VkIGluIGFscmVhZHlcclxuICAgIHJldHVybiBsb2dvdXQoe1xyXG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxyXG4gICAgfSkudGhlbigoKSA9PiB7XHJcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcclxuICAgICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCBsb2dpbk9wdGlvbnMpOyAvLyByZXBlYXQgYWZ0ZXIgbG9nb3V0XHJcbiAgICB9KTtcclxuICB9IGVsc2UgaWYgKHNlcnZlck9iai5jcmVkZW50aWFscykge1xyXG4gICAgLy8gaGFkIGNyZWRlbnRpYWxzIGJ1dCBubyBzZXNzaW9uLCBzbyB3ZSB3ZXJlIGxvZ2dlZCBpbiBvZmZsaW5lXHJcbiAgICB3YXNPZmZsaW5lTG9naW4gPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gcHJvY2VzcyBvcHRpb25zXHJcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XHJcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcclxuICAgIGFnZW50T3B0aW9uczogbG9naW5PcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcclxuICAgIGFnZW50Q2xhc3M6IGxvZ2luT3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcclxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCBsb2dpbiB0aW1lXHJcbiAgICBjbGllbnRBcHA6IGxvZ2luT3B0aW9ucy5jbGllbnRBcHAgfHwgaW5pdC5pbml0T3B0aW9ucy5jbGllbnRBcHAsXHJcbiAgICBsb2dvbkNhbGxiYWNrOiBsb2dpbk9wdGlvbnMubG9nb25DYWxsYmFjayB8fCBpbml0LmluaXRPcHRpb25zLmxvZ29uQ2FsbGJhY2ssXHJcbiAgICBjbGllbnRDZXJ0aWZpY2F0ZTogbG9naW5PcHRpb25zLmNsaWVudENlcnRpZmljYXRlIHx8IGluaXQuaW5pdE9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGVcclxuICB9KTtcclxuICBsZXQgbG9nb25DYWxsYmFjayA9IGN1cnJlbnRPcHRpb25zLmxvZ29uQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcclxuICByZXR1cm4gYWpheDxMb2dpblJlc3BvbnNlPihfLmRlZmF1bHRzPEh0dHBPcHRpb25zPih7XHJcbiAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcclxuICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5L3Jlc3QvYXV0aC9sb2dpbicsXHJcbiAgICBib2R5OiBjcmVkZW50aWFsc1xyXG4gIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzcG9uc2UpID0+IHtcclxuICAgIC8vIHJlYWwgcGh5c2ljYWwgbG9nb24sIGFqYXggY2FsbCBzZXRzIHNlc3Npb25Vc2VyVXVpZFxyXG4gICAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XHJcbiAgICAgIGRpYWcuZGVidWcud2FybignQlVHOiBSZWx1dGlvbiBkaWQgbm90IHNldCBYLUdvZmVyLVVzZXIgcmVzcG9uc2UgaGVhZGVyJyk7XHJcbiAgICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSByZXNwb25zZS51c2VyLnV1aWQ7XHJcbiAgICB9XHJcbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID09PSByZXNwb25zZS51c2VyLnV1aWQpO1xyXG4gICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gIH0sIChlcnJvcjogSHR0cEVycm9yKSA9PiB7XHJcbiAgICAvLyBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXHJcbiAgICBpZiAoIWVycm9yLnN0YXR1c0NvZGUgJiYgbG9naW5PcHRpb25zLm9mZmxpbmVDYXBhYmxlKSB7XHJcbiAgICAgIC8vIGFqYXggdGltZW91dCAtPiBvZmZsaW5lIGxvZ2luIGF0dGVtcHRcclxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQsXHJcbiAgICAgICAgJ25vIHBoeXNpY2FsIGxvZ2luLCBhcyBvdGhlcndpc2UgbG9nb25DYWxsYmFjayB3b3VsZCBiZSBleGVjdXRlZCcpO1xyXG4gICAgICByZXR1cm4gb2ZmbGluZS5mZXRjaE9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLnRoZW4oKGxvZ2luUmVzcG9uc2UpID0+IHtcclxuICAgICAgICBpZiAoIWxvZ2luUmVzcG9uc2UpIHtcclxuICAgICAgICAgIC8vIHdoZW4gdGhlcmUgaXMgbm8gcGVyc2lzdGVudCBkYXRhIGF2YWlsYWJsZSwgYWthLiB0aGlzIGlzIHRoZSBpbml0aWFsIGxvZ2luIGF0dGVtcHQsXHJcbiAgICAgICAgICAvLyBrZWVwIHNheWluZyB0aGUgc2VydmVyIGlzIG9mZmxpbmUuLi5cclxuICAgICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsb2dpblJlc3BvbnNlO1xyXG4gICAgICB9LCAob2ZmbGluZUVycm9yKSA9PiB7XHJcbiAgICAgICAgLy8gbW9zdCBsaWtlbHkgdGhlIHBhc3N3b3JkIGVudGVyZWQgd2FzIGluY29ycmVjdCxcclxuICAgICAgICAvLyBtYWtlIHN1cmUgdGhlIG9mZmxpbmVFcnJvciBpbmRpY2F0ZXMgdGhlIHNlcnZlciBpcyB1bmF2YWlsYWJsZSBhcyB3ZWxsXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5zdGF0dXNDb2RlKTtcclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLnJlcXVlc3RVcmwpO1xyXG4gICAgICAgIG9mZmxpbmVFcnJvci5yZXF1ZXN0VXJsID0gZXJyb3IucmVxdWVzdFVybDtcclxuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLmNhdXNlKTtcclxuICAgICAgICBvZmZsaW5lRXJyb3IuY2F1c2UgPSBlcnJvcjtcclxuICAgICAgICAvLyB3ZSByZXRocm93IHRoZSBhbm5vdGF0ZWQgZXJyb3Igb2YgZGVjb2RpbmcgdGhlIHN0b3JlZCByZXNwb25zZSxcclxuICAgICAgICAvLyBiZWNhdXNlIHRoZSBuZXR3b3JrIGVycm9yIGp1c3QgaW5kaWNhdGVzIHdlIGFyZSBvZmZsaW5lIGFuZCBkb2VzXHJcbiAgICAgICAgLy8gbm90IG1lbnRpb24gdGhlIGNyZWRlbnRpYWxzIGJlaW5nIGluY29ycmVjdCBhcyB0aGlzIG9uZSBkb2VzLi4uXHJcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KG9mZmxpbmVFcnJvcik7XHJcbiAgICAgIH0pO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvci5zdGF0dXNDb2RlICYmIHdhc09mZmxpbmVMb2dpbikge1xyXG4gICAgICAvLyBzZXJ2ZXIgc2lkZSByZWplY3Rpb24sIGNsZWFyIGxvZ2luIGRhdGEgc28gdGhhdCBzdWJzZXF1ZW50IG9mZmxpbmUgbG9naW5zIGZhaWwgYXMgd2VsbFxyXG4gICAgICByZXR1cm4gb2ZmbGluZS5jbGVhck9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLmNhdGNoKChvZmZsaW5lRXJyb3IpID0+IHtcclxuICAgICAgICAvLyB0aGlzIGlzIGJhZCBidXQgd2UgY2FuIG5vdCBkbyBtdWNoIGFib3V0IGl0XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdmYWlsZWQgZXJhc2luZyBvZmZsaW5lIGxvZ2luIGRhdGEnLCBvZmZsaW5lRXJyb3IpO1xyXG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcclxuICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgLy8gc3dpdGNoIGN1cnJlbnQgc2VydmVyXHJcbiAgICBpZiAoJ3JvbGVzJyBpbiByZXNwb25zZS5yb2xlcykge1xyXG4gICAgICAvLyBmaXhlcyBhIGRlZmVjdCBvZiBKYXZhIGltcGxlbWVudGF0aW9uXHJcbiAgICAgIHJlc3BvbnNlLnJvbGVzID0gcmVzcG9uc2Uucm9sZXNbJ3JvbGVzJ107XHJcbiAgICB9XHJcbiAgICBzZXJ2ZXJPYmouYXV0aG9yaXphdGlvbiA9IHtcclxuICAgICAgbmFtZTogcmVzcG9uc2UudXNlci51dWlkLFxyXG4gICAgICByb2xlczogXy5tYXAocmVzcG9uc2Uucm9sZXMsIChyb2xlOiByb2xlcy5Sb2xlRHRvKSA9PiByb2xlLnV1aWQpXHJcbiAgICB9O1xyXG4gICAgc2VydmVyT2JqLm9yZ2FuaXphdGlvbiA9IHJlc3BvbnNlLm9yZ2FuaXphdGlvbjtcclxuICAgIHNlcnZlck9iai51c2VyID0gcmVzcG9uc2UudXNlcjtcclxuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IGNyZWRlbnRpYWxzO1xyXG4gICAgc2VydmVyLnNldEN1cnJlbnRTZXJ2ZXIoc2VydmVyT2JqKTtcclxuICAgIHJldHVybiByZXNwb25zZTtcclxuICB9KS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgLy8gdGhpcyBpcyB0aGUgZWFybGllc3QgcG9pbnQgYXQgd2hpY2ggbGlicmFyeSBzdGF0ZSByZWZsZWN0cyBjb3JyZWN0IGF1dGhvcml6YXRpb24sIGV0Yy5cclxuICAgIC8vIFRodXMsIHRoZSBsb2dvbkNhbGxiYWNrIG1heSBleGVjdXRlIGhlcmUgbm93LCBidXQgb25seSBpZiB3ZSBhcmUgb25saW5lIGFjdHVhbGx5Li4uXHJcbiAgICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcclxuICAgICAgcmV0dXJuIHJlc3BvbnNlOyAvLyBvZmZsaW5lXHJcbiAgICB9XHJcbiAgICAvLyB3ZSBoYXZlIGEgc2Vzc2lvbiBsb2dnZWQgaW50byB0aGlzIHVzZXJcclxuICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPT09IHNlcnZlci5nZXRDdXJyZW50QXV0aG9yaXphdGlvbigpLm5hbWUpO1xyXG5cclxuICAgIC8vIHJ1biBsb2dvbkNhbGxiYWNrIG9uIHJlc3BvbnNlIGRhdGEgYW5kIGV2ZW50dWFsbHkgc3RvcmUgcmVzdWx0YW50IG9iamVjdCBmb3Igb2ZmbGluZSBsb2dpbixcclxuICAgIC8vIGJlY2F1c2UgdGhpcyB3YXkgdGhlIGNhbGxiYWNrIG1heSBhZGQgaW5mb3JtYXRpb24gdG8gdGhlIHJlc3BvbnNlIG9iamVjdCB0aGF0IHdpbGwgYWxzbyBiZVxyXG4gICAgLy8gcGVyc2lzdGVkIGFuZCBtYWRlIGF2YWlsYWJsZSBhZ2FpbiB3aGVuIG9mZmxpbmUhXHJcbiAgICByZXR1cm4gUShsb2dvbkNhbGxiYWNrKHJlc3BvbnNlKSkudGhlbigobG9nb25JbmZvcyA9IHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgIGlmIChsb2dvbkluZm9zICYmIGxvZ29uSW5mb3MgIT09IHJlc3BvbnNlKSB7XHJcbiAgICAgICAgLy8gYW55IGRhdGEgcmV0dXJuZWQgYnkgdGhlIGxvZ29uQ2FsbGJhY2sgbWF5IGJlIHN0b3JlZCBoZXJlXHJcbiAgICAgICAgcmVzcG9uc2UubG9nb25JbmZvcyA9IGxvZ29uSW5mb3M7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIHN0b3JlIG9mZmxpbmUgbG9naW4gcmVzcG9uc2VcclxuICAgICAgaWYgKGxvZ2luT3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSB8fCB3YXNPZmZsaW5lTG9naW4pIHtcclxuICAgICAgICAvLyBpbml0aWFsIHN0b3JlIG9yIHVwZGF0ZSBvZiBsb2dpbiBkYXRhXHJcbiAgICAgICAgcmV0dXJuIG9mZmxpbmUuc3RvcmVPZmZsaW5lTG9naW4oY3JlZGVudGlhbHMsIGN1cnJlbnRPcHRpb25zLCByZXNwb25zZSkuY2F0Y2goXHJcbiAgICAgICAgICAob2ZmbGluZUVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgIGRpYWcuZGVidWcud2Fybignb2ZmbGluZSBsb2dpbiBzdG9yZSBmYWlsZWQnLCBvZmZsaW5lRXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgfSk7XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgfSwgKGVycm9yKSA9PiB7XHJcbiAgICAgIC8vIGxvZ29uIGNhbGxiYWNrIGZhaWxlZCwgbXVzdCBsb2dvdXQgdG8gYXZvaWQgbWFraW5nIGFqYXggY2FsbHMgaW4gYW4gdW5rbm93biBiYWNrZW5kIHN0YXRlXHJcbiAgICAgIHJldHVybiBsb2dvdXQoe1xyXG4gICAgICAgIHNlcnZlclVybDogc2VydmVyVXJsXHJcbiAgICAgIH0pLmNhdGNoKChsb2dvdXRFcnJvcikgPT4ge1xyXG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ2ZhaWxlZCB0byBsb2dvdXQgYWZ0ZXIgbG9naW4gZmFpbHVyZScsIGxvZ291dEVycm9yKTtcclxuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4oZXJyb3IpO1xyXG4gICAgICB9KS5maW5hbGx5KCgpID0+IHtcclxuICAgICAgICAvLyBsb2dvdXQgcHJvY2Vzc2luZyBtdXN0IGxlYXZlIHVzIHdpdGggbm8gdXNlciBzZXNzaW9uXHJcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpO1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ291dF1dIGZ1bmN0aW9uLlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBMb2dvdXRPcHRpb25zIGV4dGVuZHMgTG9nb25PcHRpb25zLCBpbml0Lkh0dHBBZ2VudE9wdGlvbnMge1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIGxvZ3Mgb3V0IG9mIGEgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBGb3IgZXhwbGljaXQgbG9nb3V0cyAodHJpZ2dlciBieSBhcHAgdXNlciBwcmVzc2luZyBhIGxvZ291dCBidXR0b24sIGZvciBleGFtcGxlKSBzcGVjaWZ5aW5nXHJcbiAqIGBvZmZsaW5lQ2FwYWJsZSA9IHRydWVgIHdpbGwgZHJvcCBhbnkgcGVyc2lzdGVkIG9mZmxpbmUgbG9naW4gZGF0YSBmb3IgdGhlIHNlcnZlciBsb2dnaW5nIG91dFxyXG4gKiBvZi5cclxuICpcclxuICogQHBhcmFtIGxvZ291dE9wdGlvbnMgb3ZlcndyaXRpbmcgW1tpbml0XV0gZGVmYXVsdHMuXHJcbiAqIEByZXR1cm4ge1EuUHJvbWlzZTx2b2lkPn0gb2YgbG9nb3V0IHJlc3BvbnNlLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBgYGBqYXZhc2NyaXB0XHJcbiAqXHJcbiAqIFJlbHV0aW9uLndlYi5sb2dvdXQoKVxyXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCk7KVxyXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXHJcbiAqICAuZmluYWxseSgoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpKTtcclxuICpcclxuICogLy9PYnNlcnZhYmxlXHJcbiAqIE9ic2VydmFibGUuZnJvbVByb21pc2UoUmVsdXRpb24ud2ViLmxvZ291dCgpKS5zdWJzY3JpYmUoXHJcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApLFxyXG4gKiAgKGU6RXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXHJcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnYnllIGJ5ZScpXHJcbiAqIClcclxuICogYGBgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbG9nb3V0KGxvZ291dE9wdGlvbnM6IExvZ291dE9wdGlvbnMgPSB7fSk6IFEuUHJvbWlzZTx2b2lkPiB7XHJcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcignLycsIGxvZ291dE9wdGlvbnMpO1xyXG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XHJcblxyXG4gIC8vIHByb2Nlc3Mgb3B0aW9uc1xyXG4gIGxldCBjdXJyZW50T3B0aW9ucyA9IHNlcnZlck9iai5hcHBseU9wdGlvbnMoe1xyXG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXHJcbiAgICBhZ2VudE9wdGlvbnM6IGxvZ291dE9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxyXG4gICAgYWdlbnRDbGFzczogbG9nb3V0T3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcclxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCBsb2dvdXQgdGltZVxyXG4gIH0pO1xyXG4gIHJldHVybiBhamF4PHZvaWQ+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcclxuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxyXG4gICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICB1cmw6ICcvZ29mZXIvc2VjdXJpdHkvcmVzdC9hdXRoL2xvZ291dCcsXHJcbiAgICBib2R5OiB7fVxyXG4gIH0sIGN1cnJlbnRPcHRpb25zKSkuY2F0Y2goKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcclxuICAgIGlmIChlcnJvci5zdGF0dXNDb2RlID09PSA0MjIpIHtcclxuICAgIC8vIFJFU1QtYmFzZWQgbG9nb3V0IFVSTCBjdXJyZW50bHkgaXMgYnJva2VuIHJlcG9ydGluZyBhIDQyMiBpbiBhbGwgY2FzZXNcclxuICAgICAgcmV0dXJuIGFqYXg8dm9pZD4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xyXG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybCxcclxuICAgICAgbWV0aG9kOiAnR0VUJyxcclxuICAgICAgdXJsOiAnL2dvZmVyL3NlY3VyaXR5LWxvZ291dCdcclxuICAgIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdCVUc6IHJlc29ydGVkIHRvIGNsYXNzaWMgUEFUSC1iYXNlZCBsb2dvdXQgYXMgUkVTVC1iYXNlZCBsb2dvdXQgZmFpbGVkOicsXHJcbiAgICAgICAgICBlcnJvcik7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0sIChlcnJvcjI6IEh0dHBFcnJvcikgPT4ge1xyXG4gICAgICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcjIuc3RhdHVzQ29kZSA9PT0gNDIyID8gZXJyb3IgOiBlcnJvcjIpO1xyXG4gICAgfSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xyXG4gIH0pLmNhdGNoKChlcnJvcjogSHR0cEVycm9yKSA9PiB7XHJcbiAgICAvLyBpZ25vcmUgbmV0d29yayBmYWlsdXJlcyBvbiB0aW1lb3V0LCBzZXJ2ZXIgZm9yZ2V0cyBvbiBzZXNzaW9uIHRpbWVvdXQgYW55d2F5c1xyXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlKSB7XHJcbiAgICAgIHJldHVybiBRLnJlc29sdmU8dm9pZD4odW5kZWZpbmVkKTtcclxuICAgIH1cclxuICAgIHJldHVybiBRLnJlamVjdDx2b2lkPihlcnJvcik7XHJcbiAgfSkuZmluYWxseSgoKSA9PiB7XHJcbiAgICAvLyBldmVudHVhbGx5IGVyYXNlIG9mZmxpbmUgbG9naW4gZGF0YVxyXG4gICAgaWYgKGxvZ291dE9wdGlvbnMub2ZmbGluZUNhcGFibGUpIHtcclxuICAgICAgLy8gcmVxdWVzdGVkIHRvIGVyYXNlIGxvZ2luIGRhdGFcclxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oc2VydmVyT2JqLmNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykuY2F0Y2goXHJcbiAgICAgICAgKG9mZmxpbmVFcnJvcikgPT4ge1xyXG4gICAgICAgIGRpYWcuZGVidWcud2FybignZmFpbGVkIGVyYXNpbmcgb2ZmbGluZSBsb2dpbiBkYXRhJywgb2ZmbGluZUVycm9yKTtcclxuICAgICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH0pLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgLy8gZm9yZ2V0IGV2ZXJ5dGhpbmcgYWJvdXQgaXRcclxuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XHJcbiAgICBzZXJ2ZXJPYmouYXV0aG9yaXphdGlvbiA9IGF1dGguQU5PTllNT1VTX0FVVEhPUklaQVRJT047XHJcbiAgICBzZXJ2ZXJPYmoub3JnYW5pemF0aW9uID0gbnVsbDtcclxuICAgIHNlcnZlck9iai51c2VyID0gbnVsbDtcclxuICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBudWxsO1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==