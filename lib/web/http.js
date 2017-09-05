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
    if (currentOptions.clientCertificate) {
        // apply certificate options (must copy options.agentOptions)
        options.agentOptions = _.defaults({}, currentOptions.clientCertificate, options.agentOptions);
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvaHR0cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksSUFBSSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFDekMsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxJQUFJLFdBQU0sTUFBTSxDQUFDLENBQUE7QUFDN0IsSUFBWSxJQUFJLFdBQU0sY0FBYyxDQUFDLENBQUE7QUFDckMsSUFBWSxPQUFPLFdBQU0sV0FBVyxDQUFDLENBQUE7QUFDckMsSUFBWSxPQUFPLFdBQU0sU0FBUyxDQUFDLENBQUE7QUFFbkMsSUFBWSxNQUFNLFdBQU0sb0JBQW9CLENBQUMsQ0FBQTtBQUM3QyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUUvQiw4Q0FBOEM7QUFDOUMsSUFBSSxlQUFlLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUk7SUFDVixHQUFHLEVBQUUsSUFBSTtJQUNULGVBQWUsRUFBRSxJQUFJO0NBQ3RCLENBQUM7QUFDRixJQUFJLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUM7QUE4RjVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQTRDRztBQUNILGNBQXdCLE9BQW9CO0lBQzFDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6RCxJQUFJLFNBQVMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNyRCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7UUFDeEQsZ0JBQWdCO1FBQ2hCLElBQUksYUFBVyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDeEMsU0FBUyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDN0IsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFXLEVBQUU7WUFDeEIsU0FBUyxFQUFFLFNBQVM7U0FDckIsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNOLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxTQUFTLENBQUMsV0FBVyxJQUFJLGFBQVcsRUFBcEMsQ0FBb0MsQ0FBQyxDQUFDO1lBQzlELE1BQU0sQ0FBQyxJQUFJLENBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7UUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLElBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7UUFDMUMsU0FBUyxFQUFFLFNBQVM7UUFDcEIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO1FBQ25FLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtRQUM3RCx3Q0FBd0M7UUFDeEMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXO1FBQ2hFLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtLQUM5RCxDQUFDLENBQUM7SUFFSCxxQkFBcUI7SUFDckIsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxDQUFDO0lBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0lBQzdDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssU0FBUyxFQUE3QyxDQUE2QyxDQUFDLENBQUM7SUFFdkUsSUFBSSxlQUFlLEdBQUcsT0FBTyxDQUFDLGVBQWUsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDO0lBQzVELElBQUksZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7SUFDOUQsT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0IsT0FBTyxDQUFDLFlBQVksR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDO0lBQ25ELE9BQU8sQ0FBQyxVQUFVLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQztJQUMvQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLDZEQUE2RDtRQUM3RCxPQUFPLENBQUMsWUFBWSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDaEcsQ0FBQztJQUNELElBQUksT0FBTyxHQUFHLEVBQUUsQ0FBQztJQUNqQixFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUM5Qix5RkFBeUY7UUFDekYsT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxlQUFlLENBQUM7SUFDdEQsQ0FBQztJQUNELEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQzdCLHFEQUFxRDtRQUNyRCxPQUFPLENBQUMsc0JBQXNCLENBQUMsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO0lBQzdELENBQUM7SUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBSSxVQUFDLGFBQWEsRUFBRSxZQUFZO1FBQzlDLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxlQUFlLEVBQUUsY0FBYztZQUM5RCxJQUFJLElBQTBCLENBQUM7WUFDL0IsSUFBSSxHQUFvQixDQUFDO1lBQ3pCLElBQUksQ0FBQztnQkFDSCxHQUFHLEdBQUcsbUJBQW1CLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxVQUFDLEtBQWdCLEVBQUUsUUFBZSxFQUFFLElBQVU7b0JBQTNCLHdCQUFlLEdBQWYsZUFBZTtvQkFDeEUsOEVBQThFO29CQUM5RSxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO3dCQUM1QyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQzt3QkFDekQsSUFBSSxHQUFHLFNBQVMsQ0FBQyxDQUFDLHNDQUFzQztvQkFDMUQsQ0FBQztvQkFFRCxtQkFBbUI7b0JBQ25CLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUM7d0JBQ3JELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNwQixxQ0FBcUM7NEJBQ3JDLEtBQUssR0FBRyxJQUFJLENBQUM7d0JBQ2YsQ0FBQzt3QkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzVCLGtDQUFrQzs0QkFDbEMsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO3dCQUMxQixDQUFDO3dCQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsbUVBQW1FOzRCQUNuRSx1Q0FBdUM7NEJBQ3ZDLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUM7NEJBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQWhCLENBQWdCLEVBQ3RDLHFFQUFxRSxDQUFDLENBQUM7NEJBQ3pFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO3dCQUN4QixDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNOLGdFQUFnRTs0QkFDaEUsS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQzs0QkFDMUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDekIsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7NEJBQ3JCLENBQUM7d0JBQ0gsQ0FBQztvQkFFSCxDQUFDO29CQUNELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7d0JBQ1YsbUNBQW1DO3dCQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUscUNBQXFDLENBQUMsQ0FBQzt3QkFDdkUsS0FBSyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7d0JBQ3ZCLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7NEJBQ2IsS0FBSyxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDOzRCQUN2QyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUM7NEJBQzdDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRTtnQ0FDMUMsS0FBSyxFQUFFLFFBQVE7Z0NBQ2YsVUFBVSxFQUFFLEtBQUs7NkJBQ2xCLENBQUMsQ0FBQzt3QkFDTCxDQUFDO3dCQUNELE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLFlBQVksRUFBRTs0QkFDekMsS0FBSyxFQUFFLEdBQUc7NEJBQ1YsVUFBVSxFQUFFLEtBQUs7eUJBQ2xCLENBQUMsQ0FBQztvQkFDTCxDQUFDO29CQUVELEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQzt3QkFDZCwrQkFBK0I7d0JBQy9CLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO3dCQUM3QixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQzt3QkFDaEMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQzs0QkFDcEIsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZ0NBQWdDO3dCQUN6RCxDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNOLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLHNDQUFzQzt3QkFDN0QsQ0FBQztvQkFDSCxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDO3dCQUNOLHFCQUFxQjt3QkFDckIsU0FBUyxDQUFDLFdBQVcsR0FBRzs0QkFDdEIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsb0JBQW9CLENBQUM7NEJBQy9DLFdBQVcsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzt5QkFDMUMsQ0FBQzt3QkFDRixFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxLQUFLLEdBQUc7NEJBQzNCLFFBQVEsQ0FBQyxVQUFVLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxTQUFTLEtBQUssdUNBQXVDLENBQUMsQ0FBQyxDQUFDOzRCQUMvRix1RkFBdUY7NEJBQ3ZGLHVGQUF1Rjs0QkFDdkYscUZBQXFGOzRCQUNyRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDOzRCQUN4RCx3REFBd0Q7NEJBQ3hELGdEQUFnRDs0QkFDaEQsZUFBZSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDOzRCQUNoRixNQUFNLENBQUMsQ0FBQyxxREFBcUQ7d0JBQy9ELENBQUM7d0JBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ04sMkJBQTJCOzRCQUMzQixJQUFJLGVBQWUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDOzRCQUN2RCxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO2dDQUNwQixTQUFTLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQzs0QkFDOUMsQ0FBQzs0QkFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dDQUN2QyxrQ0FBa0M7Z0NBQ2xDLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO2dDQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsQ0FBQyxDQUFDLEtBQUssRUFBUCxDQUFPLENBQUMsQ0FBQztnQ0FDakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0NBQ2xELElBQU0sV0FBVyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7Z0NBQzFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7b0NBQ2hCLCtCQUErQjtvQ0FDL0Isd0RBQXdEO29DQUN4RCxnREFBZ0Q7b0NBQ2hELFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO29DQUM3QixlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUU7d0NBQzdDLFNBQVMsRUFBRSxTQUFTO3FDQUNyQixDQUFDLENBQUMsSUFBSSxDQUFDO3dDQUNOLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBM0IsQ0FBMkIsQ0FBQyxDQUFDO3dDQUNyRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO3dDQUM3QyxNQUFNLENBQUMsSUFBSSxDQUFJLE9BQU8sQ0FBQyxDQUFDO29DQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsWUFBWSxDQUFDLENBQUM7b0NBQ3RDLE1BQU0sQ0FBQyxDQUFDLHFEQUFxRDtnQ0FDL0QsQ0FBQzs0QkFDSCxDQUFDO3dCQUNILENBQUM7b0JBQ0gsQ0FBQztvQkFFRCx5RkFBeUY7b0JBQ3pGLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7d0JBQ3BCLGVBQWUsQ0FBQyxJQUFJLENBQUMsVUFBQyxjQUFvQzs0QkFDeEQsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLGNBQWMsS0FBSyxJQUFJLEVBQXZCLENBQXVCLEVBQUUsaUNBQWlDO2dDQUNoRixxRUFBcUUsQ0FBQyxDQUFDOzRCQUV6RSxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dDQUNWLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQzs0QkFDdEIsQ0FBQzs0QkFBQyxJQUFJLENBQUMsQ0FBQztnQ0FDTixhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ3RCLENBQUM7d0JBQ0gsQ0FBQyxFQUFFLFVBQUMsYUFBYTs0QkFDZixZQUFZLENBQUMsYUFBYSxDQUFDLENBQUM7d0JBQzlCLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNaLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFFO1lBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDZixvQ0FBb0M7Z0JBQ3BDLE1BQU0sQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDN0IsQ0FBQztZQUVELHFCQUFxQjtZQUNyQixJQUFJLENBQUM7Z0JBQ0gsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE9BQWE7b0JBQWIsdUJBQWEsR0FBYixhQUFhO29CQUN6QyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFDLFFBQThCO3dCQUNwRCxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7NEJBQ1YsSUFBSSxHQUFHLFFBQVEsQ0FBQzs0QkFDaEIsZUFBZSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQzFDLENBQUM7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsTUFBTSxDQUFDLE9BQU8sQ0FBQztnQkFDakIsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDWixDQUFFO1lBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDZix5Q0FBeUM7Z0JBQ3pDLE1BQU0sQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDL0IsQ0FBQztRQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBdE1lLFlBQUksT0FzTW5CLENBQUE7QUF5REQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUNHO0FBQ0gsZUFBc0IsV0FBNkIsRUFDN0IsWUFBK0I7SUFBL0IsNEJBQStCLEdBQS9CLGlCQUErQjtJQUNuRCxJQUFJLGVBQWUsR0FBRyxLQUFLLENBQUM7SUFDNUIsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDdEQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDckQsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDOUIsb0JBQW9CO1FBQ3BCLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDWixTQUFTLEVBQUUsU0FBUztTQUNyQixDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ04sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLENBQUMsU0FBUyxDQUFDLGVBQWUsRUFBMUIsQ0FBMEIsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLENBQUMsc0JBQXNCO1FBQ2pFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNqQywrREFBK0Q7UUFDL0QsZUFBZSxHQUFHLElBQUksQ0FBQztJQUN6QixDQUFDO0lBRUQsa0JBQWtCO0lBQ2xCLElBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7UUFDMUMsU0FBUyxFQUFFLFNBQVM7UUFDcEIsWUFBWSxFQUFFLFlBQVksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO1FBQ3hFLFVBQVUsRUFBRSxZQUFZLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtRQUNsRSxzQ0FBc0M7UUFDdEMsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTO1FBQy9ELGFBQWEsRUFBRSxZQUFZLENBQUMsYUFBYSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYTtRQUMzRSxpQkFBaUIsRUFBRSxZQUFZLENBQUMsaUJBQWlCLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUI7S0FDeEYsQ0FBQyxDQUFDO0lBQ0gsSUFBSSxhQUFhLEdBQUcsY0FBYyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDO0lBQy9ELE1BQU0sQ0FBQyxJQUFJLENBQWdCLENBQUMsQ0FBQyxRQUFRLENBQWM7UUFDakQsU0FBUyxFQUFFLFNBQVM7UUFDcEIsTUFBTSxFQUFFLE1BQU07UUFDZCxHQUFHLEVBQUUsaUNBQWlDO1FBQ3RDLElBQUksRUFBRSxXQUFXO0tBQ2xCLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxRQUFRO1FBQ2hDLHNEQUFzRDtRQUN0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLHdEQUF3RCxDQUFDLENBQUM7WUFDMUUsU0FBUyxDQUFDLGVBQWUsR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztRQUNqRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLFNBQVMsQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQWhELENBQWdELENBQUMsQ0FBQztRQUMxRSxNQUFNLENBQUMsUUFBUSxDQUFDO0lBQ2xCLENBQUMsRUFBRSxVQUFDLEtBQWdCO1FBQ2xCLHlCQUF5QjtRQUN6QixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDckQsd0NBQXdDO1lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQTFCLENBQTBCLEVBQ2hELGlFQUFpRSxDQUFDLENBQUM7WUFDckUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsYUFBYTtnQkFDL0UsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO29CQUNuQixzRkFBc0Y7b0JBQ3RGLHVDQUF1QztvQkFDdkMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQWdCLEtBQUssQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO2dCQUNELE1BQU0sQ0FBQyxhQUFhLENBQUM7WUFDdkIsQ0FBQyxFQUFFLFVBQUMsWUFBWTtnQkFDZCxrREFBa0Q7Z0JBQ2xELHlFQUF5RTtnQkFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBeEIsQ0FBd0IsQ0FBQyxDQUFDO2dCQUNsRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUF4QixDQUF3QixDQUFDLENBQUM7Z0JBQ2xELFlBQVksQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBbkIsQ0FBbUIsQ0FBQyxDQUFDO2dCQUM3QyxZQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDM0Isa0VBQWtFO2dCQUNsRSxtRUFBbUU7Z0JBQ25FLGtFQUFrRTtnQkFDbEUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQWdCLFlBQVksQ0FBQyxDQUFDO1lBQy9DLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUM7WUFDL0MseUZBQXlGO1lBQ3pGLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLFlBQVk7Z0JBQy9FLDhDQUE4QztnQkFDOUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsbUNBQW1DLEVBQUUsWUFBWSxDQUFDLENBQUM7Z0JBQ25FLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFnQixLQUFLLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBZ0IsS0FBSyxDQUFDLENBQUM7SUFDeEMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsUUFBUTtRQUNmLHdCQUF3QjtRQUN4QixFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDOUIsd0NBQXdDO1lBQ3hDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQyxDQUFDO1FBQ0QsU0FBUyxDQUFDLGFBQWEsR0FBRztZQUN4QixJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJO1lBQ3hCLEtBQUssRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsVUFBQyxJQUFtQixJQUFLLE9BQUEsSUFBSSxDQUFDLElBQUksRUFBVCxDQUFTLENBQUM7U0FDakUsQ0FBQztRQUNGLFNBQVMsQ0FBQyxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQztRQUMvQyxTQUFTLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDL0IsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDcEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsUUFBUTtRQUNmLHlGQUF5RjtRQUN6RixzRkFBc0Y7UUFDdEYsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVTtRQUM3QixDQUFDO1FBQ0QsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxTQUFTLENBQUMsZUFBZSxLQUFLLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxDQUFDLElBQUksRUFBbkUsQ0FBbUUsQ0FBQyxDQUFDO1FBRTdGLDhGQUE4RjtRQUM5Riw2RkFBNkY7UUFDN0YsbURBQW1EO1FBQ25ELE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsVUFBcUI7WUFBckIsMEJBQXFCLEdBQXJCLHFCQUFxQjtZQUMzRCxFQUFFLENBQUMsQ0FBQyxVQUFVLElBQUksVUFBVSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzFDLDREQUE0RDtnQkFDNUQsUUFBUSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDbkMsQ0FBQztZQUVELCtCQUErQjtZQUMvQixFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsY0FBYyxJQUFJLGVBQWUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELHdDQUF3QztnQkFDeEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLEVBQUUsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FDM0UsVUFBQyxZQUFZO29CQUNYLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUM1RCxNQUFNLENBQUMsUUFBUSxDQUFDO2dCQUNsQixDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFDRCxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQ2xCLENBQUMsRUFBRSxVQUFDLEtBQUs7WUFDUCw0RkFBNEY7WUFDNUYsTUFBTSxDQUFDLE1BQU0sQ0FBQztnQkFDWixTQUFTLEVBQUUsU0FBUzthQUNyQixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQUMsV0FBVztnQkFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ3RFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFnQixLQUFLLENBQUMsQ0FBQztZQUN4QyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQ1QsdURBQXVEO2dCQUN2RCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUExQixDQUEwQixDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXJJZSxhQUFLLFFBcUlwQixDQUFBO0FBTUEsQ0FBQztBQUVGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0gsZ0JBQXVCLGFBQWlDO0lBQWpDLDZCQUFpQyxHQUFqQyxrQkFBaUM7SUFDdEQsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDdkQsSUFBSSxTQUFTLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFckQsa0JBQWtCO0lBQ2xCLElBQUksY0FBYyxHQUFHLFNBQVMsQ0FBQyxZQUFZLENBQUM7UUFDMUMsU0FBUyxFQUFFLFNBQVM7UUFDcEIsWUFBWSxFQUFFLGFBQWEsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZO1FBQ3pFLFVBQVUsRUFBRSxhQUFhLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVTtLQUVwRSxDQUFDLENBQUM7SUFDSCxNQUFNLENBQUMsSUFBSSxDQUFPLENBQUMsQ0FBQyxRQUFRLENBQWM7UUFDeEMsU0FBUyxFQUFFLFNBQVM7UUFDcEIsTUFBTSxFQUFFLE1BQU07UUFDZCxHQUFHLEVBQUUsa0NBQWtDO1FBQ3ZDLElBQUksRUFBRSxFQUFFO0tBQ1QsRUFBRSxjQUFjLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEtBQWdCO1FBQ3pDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQztZQUMvQix5RUFBeUU7WUFDdkUsTUFBTSxDQUFDLElBQUksQ0FBTyxDQUFDLENBQUMsUUFBUSxDQUFjO2dCQUMxQyxTQUFTLEVBQUUsU0FBUztnQkFDcEIsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsR0FBRyxFQUFFLHdCQUF3QjthQUM5QixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtnQkFDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMseUVBQXlFLEVBQ3ZGLEtBQUssQ0FBQyxDQUFDO2dCQUNYLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDZCxDQUFDLEVBQUUsVUFBQyxNQUFpQjtnQkFDbkIsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQU8sTUFBTSxDQUFDLFVBQVUsS0FBSyxHQUFHLEdBQUcsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDO1lBQ3RFLENBQUMsQ0FBQyxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFPLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFDLEtBQWdCO1FBQ3hCLGdGQUFnRjtRQUNoRixFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3RCLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFPLFNBQVMsQ0FBQyxDQUFDO1FBQ3BDLENBQUM7UUFDRCxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBTyxLQUFLLENBQUMsQ0FBQztJQUMvQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7UUFDVCxzQ0FBc0M7UUFDdEMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDakMsZ0NBQWdDO1lBQ2hDLE1BQU0sQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQzNFLFVBQUMsWUFBWTtnQkFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDbkUsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQU8sU0FBUyxDQUFDLENBQUM7WUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBQ1QsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzdCLFNBQVMsQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQ3ZELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzlCLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLFNBQVMsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO0lBQ25DLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQXhEZSxjQUFNLFNBd0RyQixDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHdlYi9odHRwLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgd2ViXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgYXV0aCBmcm9tICcuLi9zZWN1cml0eS9hdXRoJztcbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIGh0dHAgZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBpbml0IGZyb20gJy4uL2NvcmUvaW5pdCc7XG5pbXBvcnQgKiBhcyBvZmZsaW5lIGZyb20gJy4vb2ZmbGluZSc7XG5pbXBvcnQgKiBhcyByZXF1ZXN0IGZyb20gJ3JlcXVlc3QnO1xuaW1wb3J0ICogYXMgcm9sZXMgZnJvbSAnLi4vc2VjdXJpdHkvcm9sZXMnO1xuaW1wb3J0ICogYXMgc2VydmVyIGZyb20gJy4uL3NlY3VyaXR5L3NlcnZlcic7XG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4vdXJscyc7XG5cbi8vIHJlcXVpcmUgcmVxdWVzdC5qcyB0byBtYW5hZ2UgY29va2llcyBmb3IgdXNcbmxldCByZXF1ZXN0RGVmYXVsdHMgPSB7XG4gIGpzb246IHRydWUsXG4gIGphcjogdHJ1ZSxcbiAgd2l0aENyZWRlbnRpYWxzOiB0cnVlXG59O1xubGV0IHJlcXVlc3RXaXRoRGVmYXVsdHMgPSByZXF1ZXN0LmRlZmF1bHRzKHJlcXVlc3REZWZhdWx0cyk7XG5cbi8qKlxuICogY2FsbGJhY2sgYWxsb3dpbmcgY3VzdG9taXppbmcgYW4gb2JqZWN0IG5vdCBpbW1lZGlhdGVseSBhdmFpbGFibGUgYXQgdGltZSBvZiBjYWxsLlxuICpcbiAqIEBwYXJhbSBvYmplY3QgZm9yIGluc3BlY3Rpb24gb3IgY3VzdG9taXphdGlvbi5cbiAqIEByZXR1cm4gcHJvbWlzZSBvciBvYmplY3Qgb24gc2FtZSBkZWZlcnJlZCBvYmplY3QuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgSHR0cENhbGxiYWNrPFQ+IHtcbiAgKHZhbHVlOiBUKTogUS5Qcm9taXNlPFQ+IHwgVDtcbn1cblxuLyoqXG4gKiB0eXBlIHJlcHJlc2VudGluZyBhIHJhdyByZXF1ZXN0LlxuICovXG5leHBvcnQgdHlwZSBIdHRwUmVxdWVzdCA9IHJlcXVlc3QuUmVxdWVzdDtcbi8qKlxuICogdHlwZSByZXByZXNlbnRpbmcgYSByYXcgcmVzcG9uc2UuXG4gKi9cbmV4cG9ydCB0eXBlIEh0dHBSZXNwb25zZSA9IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xuXG4vKipcbiAqIG5hbWVkIHBhcmFtZXRlcnMgb2YgdGhlIFtbaHR0cF1dIGZ1bmN0aW9uLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBPcHRpb25zIGV4dGVuZHMgcmVxdWVzdC5Db3JlT3B0aW9ucywgcmVxdWVzdC5VcmxPcHRpb25zLFxuICAgIGluaXQuU2VydmVySW5pdE9wdGlvbnMge1xuICAvKipcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gY3VzdG9taXplIHRoZSBjbGllbnQgcmVxdWVzdCBpbiBtb3JlIGRldGFpbCB0aGFuIHByb3ZpZGVkIGJ5XG4gICAqIGRlZmF1bHQuXG4gICAqL1xuICByZXF1ZXN0Q2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlcXVlc3Q+O1xuICAvKipcbiAgICogb3B0aW9uYWwgY2FsbGJhY2sgYWxsb3dpbmcgdG8gaW5zcGVjdCB0aGUgc2VydmVyIHJlc3BvbnNlIGluIG1vcmUgZGV0YWlsIHRoYW4gcHJvdmlkZWQgYnlcbiAgICogZGVmYXVsdC5cbiAgICovXG4gIHJlc3BvbnNlQ2FsbGJhY2s/OiBIdHRwQ2FsbGJhY2s8SHR0cFJlc3BvbnNlPjtcbn1cblxuLyoqXG4gKiBmYWlsdXJlIG9mIGFuIGFqYXggcmVxdWVzdC5cbiAqXG4gKiBUaGlzIHR5cGUgY2FuIGJlIHVzZWQgYXMgdHlwZSBhbm5vdGF0aW9uIG9mIHRoZSBlcnJvciB0aGUgUHJvbWlzZSByZXR1cm5lZCBieSBhamF4IGlzIHJlamVjdGVkXG4gKiB3aXRoLlxuICpcbiAqIEBzZWUgYWpheFxuICovXG5leHBvcnQgaW50ZXJmYWNlIEh0dHBFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIGZ1bGx5IHJlc29sdmVkIHVybCB0aGUgcmVxdWVzdCB3YXMgc2VudCB0by5cbiAgICovXG4gIHJlcXVlc3RVcmw/OiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEhUVFAgc3RhdHVzIGNvZGUgb2YgZmFpbHVyZS5cbiAgICovXG4gIHN0YXR1c0NvZGU/OiBudW1iZXI7XG4gIC8qKlxuICAgKiBIVFRQIHN0YXR1cyBtZXNzYWdlIG9mIGZhaWx1cmUuXG4gICAqL1xuICBzdGF0dXNNZXNzYWdlPzogc3RyaW5nO1xuXG4gIC8qKlxuICAgKiBpbiBtYW55IGNhc2VzIHRoZSBSZWx1dGlvbiBzZXJ2ZXIgcmVwb3J0cyBoZXJlIHRoZSBmdWxseSBxdWFsaWZpZWQgbmFtZSBvZiBhIEphdmEgRXhjZXB0aW9uXG4gICAqIHRoYXQgbWF5IGJlIHVzZWQgdG8gZnVydGhlciBkaWZmZXJlbnRpYXRlIHRoZSBlcnJvci5cbiAgICovXG4gIGNsYXNzTmFtZT86IHN0cmluZztcbiAgLyoqXG4gICAqIG1heSBiZSBzZXQgdG8gc29tZSBhcmJpdHJhcnkgdmFsdWUgZGVzY3JpYmluZyB0aGUgY2F1c2Ugb2YgZmFpbHVyZSwgbW9zdGx5IHByZXNlbnQgd2hlblxuICAgKiB0cmFuc3BvcnRpbmcgSmF2YSBFeGNlcHRpb24gb2JqZWN0cy5cbiAgICovXG4gIGNhdXNlPzogYW55O1xuXG4gIC8qKlxuICAgKiBkZXRhaWxzIG9mIHJlcXVlc3QgZmFpbGVkLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgYW5kIHRodXMgbm90IHBhcnQgb2YgdGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGZhaWx1cmUuXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXG4gICAqIHRoaXMgdmFsdWUuXG4gICAqXG4gICAqIEBzZWUgcmVzcG9uc2VcbiAgICovXG4gIHJhd1JlcXVlc3Q/OiBIdHRwUmVxdWVzdDtcbiAgLyoqXG4gICAqIGRldGFpbHMgb2YgcmVzcG9uc2UgZmFpbGVkLlxuICAgKlxuICAgKiBUaGlzIGlzIGEgbm9uLWVudW1lcmFibGUgcHJvcGVydHkgYW5kIHRodXMgbm90IHBhcnQgb2YgdGhlIEpTT04gcmVwcmVzZW50YXRpb24gb2YgdGhlIGZhaWx1cmUuXG4gICAqIEl0IGlzIHByb3ZpZGVkIGZvciBpbmZvcm1hbCBwdXJwb3NlcyBhcyBhIGRlYnVnZ2luZyBhaWQgb25seS4gQ2xpZW50IGNvZGUgc2hvdWxkIG5vdCByZWx5IG9uXG4gICAqIHRoaXMgdmFsdWUuXG4gICAqXG4gICAqIEBzZWUgcmVxdWVzdFxuICAgKi9cbiAgcmF3UmVzcG9uc2U/OiBIdHRwUmVzcG9uc2U7XG59XG5cbi8qKlxuICogZHJpdmVzIGFuIEhUVFAgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogQmVoYXZpb3Igb2YgdGhpcyBtZXRob2QgaXMgc2ltcGxpZmllZCBmcm9tIG1vc3QgSFRUUC9BSkFYIGltcGxlbWVudGF0aW9uczpcbiAqIC0gV2hlbiB0aGUgSFRUUCByZXF1ZXN0IHN1Y2NlZWRzIHRoZSByZXN1bHRpbmcgcHJvbWlzZSByZXNvbHZlcyB0byB0aGUgcmVzcG9uc2UgYm9keS5cbiAqIC0gSW4gY2FzZSBvZiBhIG5ldHdvcmsgRXJyb3IgdGhlIHByb21pc2UgcmVzb2x2ZXMgdG8gYW4gSHR0cEVycm9yIG9iamVjdCBwcm92aWRpbmcgYHJlcXVlc3RVcmxgXG4gKiAgIGJ1dCBuZWl0aGVyIGBzdGF0dXNDb2RlYCBub3IgYHN0YXR1c01lc3NhZ2VgLlxuICogLSBJbiBjYXNlIG9mIEhUVFAgZmFpbHVyZSB0aGUgcmVzdWx0aW5nIHByb21pc2UgaXMgcmVqZWN0ZWQgdG8gYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0IGNhcnJ5aW5nXG4gKiAgIHRoZSBwcm9wZXJ0aWVzIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXG4gKiAtIElmIHRoZSBzZXJ2ZXIgcmVzcG9uZHMgYSBKU09OLCBpdCBpcyBwYXJzZWQgYW5kIGFzc3VtZWQgdG8gYmUgYW4gSHR0cEVycm9yLWxpa2Ugb2JqZWN0LiBUaGVcbiAqICAgb2JqZWN0IGlzIGF1Z21lbnRlZCBieSB0aGUgcHJvcGVydGllcyBhcyBkZWZpbmVkIGFib3ZlLlxuICogLSBPdGhlcndpc2UgdGhlIGJvZHkgaXMgc3RvcmVkIGFzIGBtZXNzYWdlYCBvZiBhbiBIdHRwRXJyb3Igb2JqZWN0IGNyZWF0ZWQuIEFnYWluLCB0aGUgcHJvcGVydGllc1xuICogICBhYm92ZSBhcmUgcHJvdmlkZWQuXG4gKiAtIEZpbmFsbHksIGluIGNhc2Ugb2YgSFRUUCBmYWlsdXJlIHdpdGggdGhlIHNlcnZlciBub3QgcHJvdmlkaW5nIGFueSByZXNwb25zZSBib2R5LCB0aGUgSHR0cEVycm9yXG4gKiAgIGBtZXNzYWdlYCBpcyBzZXQgdG8gdGhlIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBUaHVzLCB0byBkaWZmZXJlbnRpYXRlIG5ldHdvcmsgZmFpbHVyZXMgZnJvbSBzZXJ2ZXItc2lkZSBmYWlsdXJlcyB0aGUgYHN0YXR1c0NvZGVgIG9mIHRoZVxuICogSHR0cEVycm9yIHJlamVjdGlvbiBpcyB0byBiZWluZyB1c2VkLiBGb3IgZGVlcGVyIGluc3BlY3Rpb24gcHJvdmlkZSBhblxuICogW1tvcHRpb25zLnJlc3BvbnNlQ2FsbGJhY2tdXS5cbiAqXG4gKiBgYGBqYXZhc2NyaXB0XG4gKiBSZWx1dGlvbi5pbml0KHtcbiAqICAgIHNlcnZlclVybDogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcsXG4gKiAgICBvcmdhbml6YXRpb246ICdteU9yZ2EnXG4gKiB9KTtcbiAqXG4gKiBsZXQgaHR0cE9wdGlvbnM6IEh0dHBPcHRpb25zID0ge21ldGhvZDogJ0dFVCcsIHVybDogJ2FwaS92MS9wb3N0cyd9O1xuICpcbiAqIC8vdXNhZ2UgYXMgUHJvbWlzZVxuICogUmVsdXRpb24ud2ViLmFqYXgoaHR0cE9wdGlvbnMpXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdwb3N0cycsIHJlc3ApOylcbiAqICAuY2F0Y2goKGU6UmVsdXRpb24ud2ViLkh0dHBFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxuICogIC5maW5hbGx5KCgpID0+IGNvbnNvbGUubG9nKCdsb2FkaW5nIGNvbXBsZXRlIScpKTtcbiAqXG4gKiAvLyBhcyBPYnNlcnZhYmxlXG4gKiBPYnNlcnZhYmxlLmZyb21Qcm9taXNlKFJlbHV0aW9uLndlYi5hamF4KGh0dHBPcHRpb25zKSkuc3Vic2NyaWJlKFxuICogIChyZXNwOiBhbnkpID0+IGNvbnNvbGUubG9nKCdwb3N0cycsIHJlc3ApLFxuICogIChlOlJlbHV0aW9uLndlYi5IdHRwRXJyb3IpID0+IGNvbnNvbGUuZXJyb3IoZS5tZXNzYWdlLCBlKTssXG4gKiAgKCkgPT4gY29uc29sZS5sb2coJ2xvYWRpbmcgY29tcGxldGUhJylcbiAqIClcbiAqIGBgYFxuICogQHBhcmFtIG9wdGlvbnMgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gSHR0cEVycm9yIG9iamVjdFxuICogICAgaW5jbHVkaW5nIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhamF4PFQ+KG9wdGlvbnM6IEh0dHBPcHRpb25zKTogUS5Qcm9taXNlPFQ+IHtcbiAgbGV0IHNlcnZlclVybCA9IHVybHMucmVzb2x2ZVNlcnZlcihvcHRpb25zLnVybCwgb3B0aW9ucyk7XG4gIGxldCBzZXJ2ZXJPYmogPSBzZXJ2ZXIuU2VydmVyLmdldEluc3RhbmNlKHNlcnZlclVybCk7XG4gIGlmICghc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCAmJiBzZXJ2ZXJPYmouY3JlZGVudGlhbHMpIHtcbiAgICAvLyBub3QgbG9nZ2VkIGluXG4gICAgbGV0IGNyZWRlbnRpYWxzID0gc2VydmVyT2JqLmNyZWRlbnRpYWxzO1xuICAgIHNlcnZlck9iai5jcmVkZW50aWFscyA9IG51bGw7XG4gICAgcmV0dXJuIGxvZ2luKGNyZWRlbnRpYWxzLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxuICAgIH0pLnRoZW4oKCkgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gISFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHNlcnZlck9iai5jcmVkZW50aWFscyA9PSBjcmVkZW50aWFscyk7XG4gICAgICByZXR1cm4gYWpheDxUPihvcHRpb25zKTsgLy8gcmVwZWF0IGFmdGVyIGxvZ2luXG4gICAgfSk7XG4gIH1cblxuICAvLyBwcm9jZXNzIG9wdGlvbnNcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgYWdlbnRPcHRpb25zOiBvcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcbiAgICBhZ2VudENsYXNzOiBvcHRpb25zLmFnZW50Q2xhc3MgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudENsYXNzLFxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCByZXF1ZXN0IHRpbWVcbiAgICBhcHBsaWNhdGlvbjogb3B0aW9ucy5hcHBsaWNhdGlvbiB8fCBpbml0LmluaXRPcHRpb25zLmFwcGxpY2F0aW9uLFxuICAgIHRlbmFudE9yZ2E6IG9wdGlvbnMudGVuYW50T3JnYSB8fCBpbml0LmluaXRPcHRpb25zLnRlbmFudE9yZ2FcbiAgfSk7XG5cbiAgLy8gcmVzb2x2ZSB0YXJnZXQgdXJsXG4gIGxldCB1cmwgPSB1cmxzLnJlc29sdmVVcmwob3B0aW9ucy51cmwsIGN1cnJlbnRPcHRpb25zKTtcbiAgZGlhZy5kZWJ1Zy5kZWJ1ZyhvcHRpb25zLm1ldGhvZCArICcgJyArIHVybCk7XG4gIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHVybC5zdWJzdHIoMCwgc2VydmVyVXJsLmxlbmd0aCkgPT09IHNlcnZlclVybCk7XG5cbiAgbGV0IHJlcXVlc3RDYWxsYmFjayA9IG9wdGlvbnMucmVxdWVzdENhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XG4gIGxldCByZXNwb25zZUNhbGxiYWNrID0gb3B0aW9ucy5yZXNwb25zZUNhbGxiYWNrIHx8IF8uaWRlbnRpdHk7XG4gIG9wdGlvbnMgPSBfLmNsb25lKG9wdGlvbnMpO1xuICBvcHRpb25zLmFnZW50T3B0aW9ucyA9IGN1cnJlbnRPcHRpb25zLmFnZW50T3B0aW9ucztcbiAgb3B0aW9ucy5hZ2VudENsYXNzID0gY3VycmVudE9wdGlvbnMuYWdlbnRDbGFzcztcbiAgaWYgKGN1cnJlbnRPcHRpb25zLmNsaWVudENlcnRpZmljYXRlKSB7XG4gICAgLy8gYXBwbHkgY2VydGlmaWNhdGUgb3B0aW9ucyAobXVzdCBjb3B5IG9wdGlvbnMuYWdlbnRPcHRpb25zKVxuICAgIG9wdGlvbnMuYWdlbnRPcHRpb25zID0gXy5kZWZhdWx0cyh7fSwgY3VycmVudE9wdGlvbnMuY2xpZW50Q2VydGlmaWNhdGUsIG9wdGlvbnMuYWdlbnRPcHRpb25zKTtcbiAgfVxuICBsZXQgaGVhZGVycyA9IHt9O1xuICBpZiAoc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCkge1xuICAgIC8vIGFkZCBYLUdvZmVyLVVzZXIgaGVhZGVyIHNvIHRoYXQgc2VydmVyIG1heSBjaGVjayB3ZSBhcmUgcnVubmluZyB1bmRlciBjb3JyZWN0IGlkZW50aXR5XG4gICAgaGVhZGVyc1snWC1Hb2Zlci1Vc2VyJ10gPSBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkO1xuICB9XG4gIGlmIChjdXJyZW50T3B0aW9ucy5jbGllbnRBcHApIHtcbiAgICAvLyBhZGQgWC1SZWx1dGlvbi1DbGllbnRBcHAgZm9yIHNlcnZlci1zaWRlIGFuYWx5dGljc1xuICAgIGhlYWRlcnNbJ1gtUmVsdXRpb24tQ2xpZW50QXBwJ10gPSBjdXJyZW50T3B0aW9ucy5jbGllbnRBcHA7XG4gIH1cbiAgaWYgKCFfLmlzRW1wdHkoaGVhZGVycykpIHtcbiAgICBvcHRpb25zLmhlYWRlcnMgPSBfLmRlZmF1bHRzKGhlYWRlcnMsIG9wdGlvbnMuaGVhZGVycyk7XG4gIH1cbiAgcmV0dXJuIFEuUHJvbWlzZTxUPigocmVzb2x2ZVJlc3VsdCwgcmVqZWN0UmVzdWx0KSA9PiB7XG4gICAgbGV0IHByb21pc2VSZXNwb25zZSA9IFEuUHJvbWlzZSgocmVzb2x2ZVJlc3BvbnNlLCByZWplY3RSZXNwb25zZSkgPT4ge1xuICAgICAgbGV0IHJlc3A6IGh0dHAuSW5jb21pbmdNZXNzYWdlO1xuICAgICAgbGV0IHJlcTogcmVxdWVzdC5SZXF1ZXN0O1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxID0gcmVxdWVzdFdpdGhEZWZhdWx0cyh1cmwsIG9wdGlvbnMsIChlcnJvcjogSHR0cEVycm9yLCByZXNwb25zZSA9IHJlc3AsIGJvZHk/OiBhbnkpID0+IHtcbiAgICAgICAgICAvLyBub2RlLmpzIGFzc2lnbnMgc3RhdHVzIHN0cmluZyBhcyBib2R5IGZvciBzdGF0dXMgY29kZXMgbm90IGhhdmluZyBib2R5IGRhdGFcbiAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9PT0gMjAyKSB7XG4gICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydChib2R5ID09PSBodHRwLlNUQVRVU19DT0RFU1syMDJdLCBib2R5KTtcbiAgICAgICAgICAgIGJvZHkgPSB1bmRlZmluZWQ7IC8vIHJlc29sdmVzIHByb21pc2UgdG8gdW5kZWZpbmVkIGJlbG93XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gZXJyb3IgcHJvY2Vzc2luZ1xuICAgICAgICAgIGlmICghZXJyb3IgJiYgcmVzcG9uc2UgJiYgcmVzcG9uc2Uuc3RhdHVzQ29kZSA+PSA0MDApIHtcbiAgICAgICAgICAgIGlmIChfLmlzRXJyb3IoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gY29ycmVjdCBidXQgcHJhY3RpY2FsbHkgaW1wb3NzaWJsZVxuICAgICAgICAgICAgICBlcnJvciA9IGJvZHk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNTdHJpbmcoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gdXNlIHBsYWluLXRleHQgYXMgRXJyb3IgbWVzc2FnZVxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihib2R5KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdExpa2UoYm9keSkpIHtcbiAgICAgICAgICAgICAgLy8gYm9keSBpcyBvYmplY3QgcmVwcmVzZW50YXRpb24gb2Ygc2VydmVyLXNpZGUgZXJyb3Igb3IgZXhjZXB0aW9uLFxuICAgICAgICAgICAgICAvLyBjb252ZXJ0aW5nIHRvIHRydWUgRXJyb3Igb2JqZWN0IGhlcmVcbiAgICAgICAgICAgICAgZXJyb3IgPSBuZXcgRXJyb3IocmVzcG9uc2Uuc3RhdHVzTWVzc2FnZSk7XG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFfLmlzQXJyYXkoYm9keSksXG4gICAgICAgICAgICAgICAgJ2tpY2tzIGluIGZvciBhcnJheSByZXNwb25zZXMgYXMgd2VsbCwgbm90IHN1cmUgaWYgdGhpcyBpcyBkZXNpcmFibGUnKTtcbiAgICAgICAgICAgICAgXy5leHRlbmQoZXJyb3IsIGJvZHkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgLy8gaGFuZGxlcyBudW1iZXJzLCBib29sZWFucywgZXRjLiBhc3NpZ25pbmcgYXMgY2F1c2Ugb2YgZmFpbHVyZVxuICAgICAgICAgICAgICBlcnJvciA9IG5ldyBFcnJvcihyZXNwb25zZS5zdGF0dXNNZXNzYWdlKTtcbiAgICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKGJvZHkpKSB7XG4gICAgICAgICAgICAgICAgZXJyb3IuY2F1c2UgPSBib2R5O1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBhZGRpdGlvbmFsIEh0dHBFcnJvciBwcm9wZXJ0aWVzIGV2ZW50dWFsbHkgc2V0IGJlbG93XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgLy8gY29tcGxldGVzIEh0dHBFcnJvciBjb25zdHJ1Y3Rpb25cbiAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0SXNFcnJvcihlcnJvciwgJ3Nob3VsZCBvcGVyYXRlIHRydWUgRXJyb3IgaW5zdGFuY2VzJyk7XG4gICAgICAgICAgICBlcnJvci5yZXF1ZXN0VXJsID0gdXJsO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgIGVycm9yLnN0YXR1c0NvZGUgPSByZXNwb25zZS5zdGF0dXNDb2RlO1xuICAgICAgICAgICAgICBlcnJvci5zdGF0dXNNZXNzYWdlID0gcmVzcG9uc2Uuc3RhdHVzTWVzc2FnZTtcbiAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVzcG9uc2UnLCB7XG4gICAgICAgICAgICAgICAgdmFsdWU6IHJlc3BvbnNlLFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IGZhbHNlXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGVycm9yLCAncmF3UmVxdWVzdCcsIHtcbiAgICAgICAgICAgICAgdmFsdWU6IHJlcSxcbiAgICAgICAgICAgICAgZW51bWVyYWJsZTogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIC8vIG5ldHdvcmsgY29ubmVjdGl2aXR5IHByb2JsZW1cbiAgICAgICAgICAgIHNlcnZlck9iai5zZXJ2ZXJJbmZvcyA9IG51bGw7XG4gICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydElzRXJyb3IoZXJyb3IpO1xuICAgICAgICAgICAgaWYgKHByb21pc2VSZXNwb25zZSkge1xuICAgICAgICAgICAgICByZWplY3RSZXNwb25zZShlcnJvcik7IC8vIHdpbGwgYWxzbyByZWplY3RSZXN1bHQoZXJyb3IpXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZWplY3RSZXN1bHQoZXJyb3IpOyAvLyBwcm9taXNlUmVzcG9uc2Ugbm90IGNvbnN0cnVjdGVkIHlldFxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBzZXJ2ZXIgaW5mb3JtYXRpb25cbiAgICAgICAgICAgIHNlcnZlck9iai5zZXJ2ZXJJbmZvcyA9IHtcbiAgICAgICAgICAgICAgdmVyc2lvbjogcmVzcG9uc2UuaGVhZGVyc1sneC1yZWx1dGlvbi12ZXJzaW9uJ10sXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiByZXNwb25zZS5oZWFkZXJzWyd4LXNlcnZlciddXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDUwMyB8fFxuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDUwMCAmJiBlcnJvci5jbGFzc05hbWUgPT09ICdqYXZhLnV0aWwuY29uY3VycmVudC5UaW1lb3V0RXhjZXB0aW9uJykge1xuICAgICAgICAgICAgICAvLyA1MDMgKHNlcnZpY2UgdW5hdmFpbGFibGUpIGluZGljYXRlcyB0aGUgc2VydmVyIGlzIHRlbXBvcmFyaWx5IG92ZXJsb2FkZWQsIGFuZCB1bmFibGVcbiAgICAgICAgICAgICAgLy8gaGFuZGxpbmcgdGhlIHJlcXVlc3QuIFRoaXMgaGFwcGVucyB3aGVuIGFzeW5jIGRlbGVnYXRpb24gdGltZWQgb3V0IG9uIHRoZSBKYXZhIHNpZGUsXG4gICAgICAgICAgICAgIC8vIHVzdWFsbHkgYWZ0ZXIgYWJvdXQgMiBtaW51dGVzLiBJbiB0aGlzIGNhc2UgcmV0cnkgdGhlIHJlcXVlc3QgdW50aWwgd2UgYXJlIGRvbmUuLi5cbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzZXJ2ZXIgb3ZlcmxvYWRlZCwgcmV0cnlpbmcgcmVxdWVzdC4nKTtcbiAgICAgICAgICAgICAgLy8gaGVyZSBwcm9taXNlUmVzcG9uc2UgbXVzdCBoYXZlIGJlZW4gcmVzb2x2ZWQgYWxyZWFkeSxcbiAgICAgICAgICAgICAgLy8gd2UgY2hhaW4gYW55d2F5cyBiZWNhdXNlIG9mIGVycm9yIHByb3BhZ2F0aW9uXG4gICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShhamF4PFQ+KG9wdGlvbnMpKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XG4gICAgICAgICAgICAgIHJldHVybjsgLy8gZWFybHkgZXhpdCBhcyByZXN1bHQgaXMgaGFuZGxlZCBieSBkb25lIGNhbGwgYWJvdmVcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIGxvZ29uIHNlc3Npb24gcHJvY2Vzc2luZ1xuICAgICAgICAgICAgICBsZXQgc2Vzc2lvblVzZXJVdWlkID0gcmVzcG9uc2UuaGVhZGVyc1sneC1nb2Zlci11c2VyJ107XG4gICAgICAgICAgICAgIGlmIChzZXNzaW9uVXNlclV1aWQpIHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gc2Vzc2lvblVzZXJVdWlkO1xuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1c0NvZGUgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgIC8vIGFwcGFyZW50bHkgb3VyIHNlc3Npb24gaXMgbG9zdCFcbiAgICAgICAgICAgICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gbnVsbDtcbiAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhIWVycm9yKTtcbiAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ3NlcnZlciBzZXNzaW9uIGlzIGxvc3QhJywgZXJyb3IpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGNyZWRlbnRpYWxzID0gc2VydmVyT2JqLmNyZWRlbnRpYWxzO1xuICAgICAgICAgICAgICAgIGlmIChjcmVkZW50aWFscykge1xuICAgICAgICAgICAgICAgICAgLy8gcmVjb3ZlciBieSBhdHRlbXB0aW5nIGxvZ2luLFxuICAgICAgICAgICAgICAgICAgLy8gaGVyZSBwcm9taXNlUmVzcG9uc2UgbXVzdCBoYXZlIGJlZW4gcmVzb2x2ZWQgYWxyZWFkeSxcbiAgICAgICAgICAgICAgICAgIC8vIHdlIGNoYWluIGFueXdheXMgYmVjYXVzZSBvZiBlcnJvciBwcm9wYWdhdGlvblxuICAgICAgICAgICAgICAgICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gbnVsbDtcbiAgICAgICAgICAgICAgICAgIHByb21pc2VSZXNwb25zZS50aGVuUmVzb2x2ZShsb2dpbihjcmVkZW50aWFscywge1xuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxuICAgICAgICAgICAgICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICEhc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc2VydmVyIHNlc3Npb24gcmVjb3ZlcmVkLicpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWpheDxUPihvcHRpb25zKTtcbiAgICAgICAgICAgICAgICAgIH0pKS5kb25lKHJlc29sdmVSZXN1bHQsIHJlamVjdFJlc3VsdCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm47IC8vIGVhcmx5IGV4aXQgYXMgcmVzdWx0IGlzIGhhbmRsZWQgYnkgZG9uZSBjYWxsIGFib3ZlXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gY29tcGxldGVzIHRoZSBjaGFpbiBwcm9wYWdhdGluZyByZXN1bHRzLCBtdXN0IGJlIHNraXBwZWQgd2hlbiByZXF1ZXN0IGlzIHJldHJpZWQgYWJvdmVcbiAgICAgICAgICBpZiAocHJvbWlzZVJlc3BvbnNlKSB7XG4gICAgICAgICAgICBwcm9taXNlUmVzcG9uc2UudGhlbigocmVzcG9uc2VSZXN1bHQ6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHJlc3BvbnNlUmVzdWx0ID09PSByZXNwLCAnZGVmaW5pdGlvbiBvZiBiZWhhdmlvciBpbiBjYXNlICcgK1xuICAgICAgICAgICAgICAgICdvZiBwcm94eWluZyB0aGUgb3JpZ2luYWwgcmVzcG9uc2UgaXMgcmVzZXJ2ZWQgZm9yIGZ1dHVyZSBleHRlbnNpb24hJyk7XG5cbiAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0UmVzdWx0KGVycm9yKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlUmVzdWx0KGJvZHkpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LCAocmVzcG9uc2VFcnJvcikgPT4ge1xuICAgICAgICAgICAgICByZWplY3RSZXN1bHQocmVzcG9uc2VFcnJvcik7XG4gICAgICAgICAgICB9KS5kb25lKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIHBhdGggdGFrZW4gd2hlbiByZXF1ZXN0LmpzIHRocm93c1xuICAgICAgICByZXR1cm4gcmVqZWN0UmVzdWx0KGVycm9yKTtcbiAgICAgIH1cblxuICAgICAgLy8gdHJhbnNwb3J0IHJlc3BvbnNlXG4gICAgICB0cnkge1xuICAgICAgICBRKHJlcXVlc3RDYWxsYmFjayhyZXEpKS50aGVuKChyZXF1ZXN0ID0gcmVxKSA9PiB7XG4gICAgICAgICAgcmVxdWVzdC5vbigncmVzcG9uc2UnLCAocmVzcG9uc2U6IGh0dHAuSW5jb21pbmdNZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlc3ApIHtcbiAgICAgICAgICAgICAgcmVzcCA9IHJlc3BvbnNlO1xuICAgICAgICAgICAgICByZXNvbHZlUmVzcG9uc2UocmVzcG9uc2VDYWxsYmFjayhyZXNwKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XG4gICAgICAgIH0pLmRvbmUoKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIC8vIHBhdGggdGFrZW4gd2hlbiByZXF1ZXN0Q2FsbGJhY2sgdGhyb3dzXG4gICAgICAgIHJldHVybiByZWplY3RSZXNwb25zZShlcnJvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG4vKipcbiAqIHJlc3BvbnNlIGRhdGEgb2YgbG9naW4gZW5kcG9pbnRzLlxuICpcbiAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byBVc2VySW5mb1dyYXBwZXIgaW4gSmF2YSBjb2RlLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIExvZ2luUmVzcG9uc2Uge1xuICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLlVzZXJJbmZvV3JhcHBlclxuICB1c2VyOiByb2xlcy5Vc2VyO1xuICByb2xlczogcm9sZXMuUm9sZUR0b1tdO1xuICBvcmdhbml6YXRpb246IHJvbGVzLk9yZ2FuaXphdGlvbjtcblxuICBsaWNlbnNlSW5mb3M6IHtcbiAgICAvLyBjb20ubXdheXNvbHV0aW9ucy5nb2ZlcjIuc2VjdXJpdHkuZG9tYWluLkxpY2Vuc2VJbmZvc1xuICAgIGxpY2Vuc2VNb2RlbE5hbWU6IHN0cmluZztcbiAgICBsaWNlbnNlSW5mb3M6IF8uRGljdGlvbmFyeTxhbnk+XG4gIH07XG4gIC8qKlxuICAgKiBsaXN0cyBleHBlcmltZW50YWwgZmVhdHVyZXMgZW5hYmxlZCBvbiB0aGUgc2VydmVyLlxuICAgKi9cbiAgYWN0aXZlRmVhdHVyZVRvZ2dsZXM/OiBzdHJpbmdbXTtcblxuICAvKipcbiAgICogZXZlbnR1YWxseSByZXR1cm5lZCBkYXRhIG9mIHRoZSBMb2dvbkNhbGxiYWNrIGlzIHN0b3JlZCBoZXJlLlxuICAgKi9cbiAgbG9nb25JbmZvcz86IGFueTtcbn1cblxuLyoqXG4gKiBvcHRpb25zIGZvciB1c2UgYnkgYm90aCBbW2xvZ2luXV0gYW5kIFtbbG9nb3V0XV0uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nb25PcHRpb25zIGV4dGVuZHMgaW5pdC5TZXJ2ZXJVcmxPcHRpb25zIHtcblxuICAvKipcbiAgICogc3BlY2lmaWVzIHdoZXRoZXIgbG9naW4gcmVzcG9uc2UgZGF0YSBpcyBwZXJzaXN0ZWQgc3VjaCB0aGF0IHN1YnNlcXVlbnQgbG9nb25zIGNhbiBiZVxuICAgKiBwcm9jZXNzZWQgZXZlbiBpZiBjb21tdW5pY2F0aW9uIHdpdGggdGhlIFJlbHV0aW9uIHNlcnZlciBpcyBpbXBvc3NpYmxlIGF0IHRoYXQgdGltZS5cbiAgICpcbiAgICogT24gW1tsb2dpbl1dIHNldCB0byBgdHJ1ZWAgdG8gcGVyc2lzdCB0aGUgcmVzcG9uc2UgdG8gb2ZmbGluZSBzdG9yYWdlIHN1Y2ggdGhhdFxuICAgKiBzdWJzZXF1ZW50IGxvZ29uIHRvIHRoZSBzYW1lIHNlcnZlciB3aWxsIHJldXNlIGl0IGV2ZW4gYWZ0ZXIgdGhlIGNsaWVudCBhcHAgaXMgcmVzdGFydGVkLlxuICAgKiBUaGUgcmVzcG9uc2UgZGF0YSBpcyBzdG9yZWQgaW4gZW5jcnlwdGVkIGZvcm0uIE9uY2Ugc3RvcmVkLCBjYWxsaW5nIFtbbG9naW5dXSB3aXRoIHRoZVxuICAgKiBzYW1lIHNldCBvZiBjcmVkZW50aWFscyB3aWxsIHN1Y2NlZWQgZXZlbiBpZiB0aGUgUmVsdXRpb24gc2VydmVyIGNhbiBub3QgYmUgcmVhY2hlZC4gSW5cbiAgICogdGhpcyBjYXNlLCBjcmVkZW50aWFscyBhcmUgdmVyaWZpZWQgYnkgZGVjcnlwdGlvbiBvZiB0aGUgZW5jcnlwdGVkIHJlc3BvbnNlIGRhdGEuXG4gICAqXG4gICAqIE9uIFtbbG9nb3V0XV0gc2V0IHRvIGB0cnVlYCB0byB1bHRpbWF0ZWx5IGVyYXNlIHRoZSByZXNwb25zZSBmcm9tIG9mZmxpbmUgc3RvcmFnZSBhcyB3ZWxsLFxuICAgKiBhZnRlciBoYXZpbmcgaXQgc3RvcmVkIHVzaW5nIHRoZSBtZWNoYW5pc20gZGVzY3JpYmVkIGFib3ZlLlxuICAgKi9cbiAgb2ZmbGluZUNhcGFibGU/OiBib29sZWFuO1xuXG59XG5cbi8qKlxuICogb3B0aW9ucyBzcGVjaWZpYyB0byBbW2xvZ2luXV0gZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9naW5PcHRpb25zIGV4dGVuZHMgTG9nb25PcHRpb25zLCBpbml0LlNlcnZlckluaXRPcHRpb25zIHtcbn1cblxuLyoqXG4gKiBsb2dzIGludG8gYSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogTm90aWNlLCBzcGVjaWZ5aW5nIGBvZmZsaW5lQ2FwYWJsZT10cnVlYCBpbiB0aGUgb3B0aW9ucyB3aWxsIHN0b3JlIHRoZSBsb2dpbiByZXNwb25zZSBsb2NhbGx5IG9uXG4gKiB0aGUgZGV2aWNlIHdoZW4gb25saW5lIGFuZCB0aGUgbG9naW4gc3VjY2VlZGVkLiBXaGVuIG9mZmxpbmUsIHRoZSBvcHRpb24gd2lsbCByZXVzZSB0aGUgc3RvcmVkXG4gKiByZXNwb25zZS4gRGF0YSBlbmNyeXB0aW9uIGlzIHVzZWQgZ3VhcmFudGVlaW5nIGJvdGggc2VjcmVjeSBvZiBsb2dpbiBkYXRhIGFuZCB2ZXJpZmljYXRpb24gb2ZcbiAqIHRoZSBjcmVkZW50aWFscyBwcm92aWRlZC5cbiAqXG4gKiBAcGFyYW0gY3JlZGVudGlhbHMgdG8gdXNlLlxuICogQHBhcmFtIGxvZ2luT3B0aW9ucyBvdmVyd3JpdGluZyBbW2luaXRdXSBkZWZhdWx0cy5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZTxMb2dpblJlc3BvbnNlPn0gb2YgbG9naW4gcmVzcG9uc2UuXG4gKlxuICogQGV4YW1wbGVcbiAqIGBgYGphdmFzY3JpcHRcbiAqXG4gKiBpbXBvcnQgKiBhcyBSZWx1dGlvbiBmcm9tICdyZWx1dGlvbi1zZGsnO1xuICogLy9jb25maWdcbiAqIFJlbHV0aW9uLmluaXQoe1xuICogICAgc2VydmVyVXJsOiAnaHR0cDovL2xvY2FsaG9zdDo4MDgwJ1xuICogfSk7XG4gKlxuICogbGV0IGNyZWRlbnRpYWxzID0ge1xuICogICAgdXNlck5hbWU6ICdteXVzZXJuYW1lJyxcbiAqICAgIHBhc3N3b3JkOiAnbXlwYXNzd29yZCdcbiAqIH07XG4gKlxuICogLy91c2FnZVxuICpcbiAqIC8vIFByb21pc2VcbiAqIFJlbHV0aW9uLndlYi5sb2dpbihjcmVkZW50aWFscylcbiAqICAudGhlbigocmVzcCkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKTspXG4gKiAgLmNhdGNoKChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSkpXG4gKiAgLmZpbmFsbHkoKCkgPT4gY29uc29sZS5sb2coJ2NvbXBsZXRlJykpO1xuICpcbiAqIC8vT2JzZXJ2YWJsZVxuICogT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShSZWx1dGlvbi53ZWIubG9naW4oY3JlZGVudGlhbHMpKS5zdWJzY3JpYmUoXG4gKiAgKHJlc3A6IGFueSkgPT4gY29uc29sZS5sb2coJ3Jlc3AnLCByZXNwKSxcbiAqICAoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpOyxcbiAqICAoKSA9PiBjb25zb2xlLmxvZygnY29tcGxldGUnKVxuICogKVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsb2dpbihjcmVkZW50aWFsczogYXV0aC5DcmVkZW50aWFscyxcbiAgICAgICAgICAgICAgICAgICAgICBsb2dpbk9wdGlvbnM6IExvZ2luT3B0aW9ucyA9IHt9KTogUS5Qcm9taXNlPExvZ2luUmVzcG9uc2U+IHtcbiAgbGV0IHdhc09mZmxpbmVMb2dpbiA9IGZhbHNlO1xuICBsZXQgc2VydmVyVXJsID0gdXJscy5yZXNvbHZlU2VydmVyKCcvJywgbG9naW5PcHRpb25zKTtcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcbiAgaWYgKHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAvLyBsb2dnZWQgaW4gYWxyZWFkeVxuICAgIHJldHVybiBsb2dvdXQoe1xuICAgICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmxcbiAgICB9KS50aGVuKCgpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgIHJldHVybiBsb2dpbihjcmVkZW50aWFscywgbG9naW5PcHRpb25zKTsgLy8gcmVwZWF0IGFmdGVyIGxvZ291dFxuICAgIH0pO1xuICB9IGVsc2UgaWYgKHNlcnZlck9iai5jcmVkZW50aWFscykge1xuICAgIC8vIGhhZCBjcmVkZW50aWFscyBidXQgbm8gc2Vzc2lvbiwgc28gd2Ugd2VyZSBsb2dnZWQgaW4gb2ZmbGluZVxuICAgIHdhc09mZmxpbmVMb2dpbiA9IHRydWU7XG4gIH1cblxuICAvLyBwcm9jZXNzIG9wdGlvbnNcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgYWdlbnRPcHRpb25zOiBsb2dpbk9wdGlvbnMuYWdlbnRPcHRpb25zIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRPcHRpb25zLFxuICAgIGFnZW50Q2xhc3M6IGxvZ2luT3B0aW9ucy5hZ2VudENsYXNzIHx8IGluaXQuaW5pdE9wdGlvbnMuYWdlbnRDbGFzcyxcbiAgICAvLyBvcHRpb25zIHRha2luZyBlZmZlY3QgYXQgbG9naW4gdGltZVxuICAgIGNsaWVudEFwcDogbG9naW5PcHRpb25zLmNsaWVudEFwcCB8fCBpbml0LmluaXRPcHRpb25zLmNsaWVudEFwcCxcbiAgICBsb2dvbkNhbGxiYWNrOiBsb2dpbk9wdGlvbnMubG9nb25DYWxsYmFjayB8fCBpbml0LmluaXRPcHRpb25zLmxvZ29uQ2FsbGJhY2ssXG4gICAgY2xpZW50Q2VydGlmaWNhdGU6IGxvZ2luT3B0aW9ucy5jbGllbnRDZXJ0aWZpY2F0ZSB8fCBpbml0LmluaXRPcHRpb25zLmNsaWVudENlcnRpZmljYXRlXG4gIH0pO1xuICBsZXQgbG9nb25DYWxsYmFjayA9IGN1cnJlbnRPcHRpb25zLmxvZ29uQ2FsbGJhY2sgfHwgXy5pZGVudGl0eTtcbiAgcmV0dXJuIGFqYXg8TG9naW5SZXNwb25zZT4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIHVybDogJy9nb2Zlci9zZWN1cml0eS9yZXN0L2F1dGgvbG9naW4nLFxuICAgIGJvZHk6IGNyZWRlbnRpYWxzXG4gIH0sIGN1cnJlbnRPcHRpb25zKSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyByZWFsIHBoeXNpY2FsIGxvZ29uLCBhamF4IGNhbGwgc2V0cyBzZXNzaW9uVXNlclV1aWRcbiAgICBpZiAoIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQpIHtcbiAgICAgIGRpYWcuZGVidWcud2FybignQlVHOiBSZWx1dGlvbiBkaWQgbm90IHNldCBYLUdvZmVyLVVzZXIgcmVzcG9uc2UgaGVhZGVyJyk7XG4gICAgICBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID0gcmVzcG9uc2UudXNlci51dWlkO1xuICAgIH1cbiAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiBzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkID09PSByZXNwb25zZS51c2VyLnV1aWQpO1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSwgKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcbiAgICAvLyBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXG4gICAgaWYgKCFlcnJvci5zdGF0dXNDb2RlICYmIGxvZ2luT3B0aW9ucy5vZmZsaW5lQ2FwYWJsZSkge1xuICAgICAgLy8gYWpheCB0aW1lb3V0IC0+IG9mZmxpbmUgbG9naW4gYXR0ZW1wdFxuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIXNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQsXG4gICAgICAgICdubyBwaHlzaWNhbCBsb2dpbiwgYXMgb3RoZXJ3aXNlIGxvZ29uQ2FsbGJhY2sgd291bGQgYmUgZXhlY3V0ZWQnKTtcbiAgICAgIHJldHVybiBvZmZsaW5lLmZldGNoT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykudGhlbigobG9naW5SZXNwb25zZSkgPT4ge1xuICAgICAgICBpZiAoIWxvZ2luUmVzcG9uc2UpIHtcbiAgICAgICAgICAvLyB3aGVuIHRoZXJlIGlzIG5vIHBlcnNpc3RlbnQgZGF0YSBhdmFpbGFibGUsIGFrYS4gdGhpcyBpcyB0aGUgaW5pdGlhbCBsb2dpbiBhdHRlbXB0LFxuICAgICAgICAgIC8vIGtlZXAgc2F5aW5nIHRoZSBzZXJ2ZXIgaXMgb2ZmbGluZS4uLlxuICAgICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxvZ2luUmVzcG9uc2U7XG4gICAgICB9LCAob2ZmbGluZUVycm9yKSA9PiB7XG4gICAgICAgIC8vIG1vc3QgbGlrZWx5IHRoZSBwYXNzd29yZCBlbnRlcmVkIHdhcyBpbmNvcnJlY3QsXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB0aGUgb2ZmbGluZUVycm9yIGluZGljYXRlcyB0aGUgc2VydmVyIGlzIHVuYXZhaWxhYmxlIGFzIHdlbGxcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5zdGF0dXNDb2RlKTtcbiAgICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gIW9mZmxpbmVFcnJvci5yZXF1ZXN0VXJsKTtcbiAgICAgICAgb2ZmbGluZUVycm9yLnJlcXVlc3RVcmwgPSBlcnJvci5yZXF1ZXN0VXJsO1xuICAgICAgICBkaWFnLmRlYnVnLmFzc2VydCgoKSA9PiAhb2ZmbGluZUVycm9yLmNhdXNlKTtcbiAgICAgICAgb2ZmbGluZUVycm9yLmNhdXNlID0gZXJyb3I7XG4gICAgICAgIC8vIHdlIHJldGhyb3cgdGhlIGFubm90YXRlZCBlcnJvciBvZiBkZWNvZGluZyB0aGUgc3RvcmVkIHJlc3BvbnNlLFxuICAgICAgICAvLyBiZWNhdXNlIHRoZSBuZXR3b3JrIGVycm9yIGp1c3QgaW5kaWNhdGVzIHdlIGFyZSBvZmZsaW5lIGFuZCBkb2VzXG4gICAgICAgIC8vIG5vdCBtZW50aW9uIHRoZSBjcmVkZW50aWFscyBiZWluZyBpbmNvcnJlY3QgYXMgdGhpcyBvbmUgZG9lcy4uLlxuICAgICAgICByZXR1cm4gUS5yZWplY3Q8TG9naW5SZXNwb25zZT4ob2ZmbGluZUVycm9yKTtcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoZXJyb3Iuc3RhdHVzQ29kZSAmJiB3YXNPZmZsaW5lTG9naW4pIHtcbiAgICAgIC8vIHNlcnZlciBzaWRlIHJlamVjdGlvbiwgY2xlYXIgbG9naW4gZGF0YSBzbyB0aGF0IHN1YnNlcXVlbnQgb2ZmbGluZSBsb2dpbnMgZmFpbCBhcyB3ZWxsXG4gICAgICByZXR1cm4gb2ZmbGluZS5jbGVhck9mZmxpbmVMb2dpbihjcmVkZW50aWFscywgY3VycmVudE9wdGlvbnMpLmNhdGNoKChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgLy8gdGhpcyBpcyBiYWQgYnV0IHdlIGNhbiBub3QgZG8gbXVjaCBhYm91dCBpdFxuICAgICAgICBkaWFnLmRlYnVnLndhcm4oJ2ZhaWxlZCBlcmFzaW5nIG9mZmxpbmUgbG9naW4gZGF0YScsIG9mZmxpbmVFcnJvcik7XG4gICAgICAgIHJldHVybiBRLnJlamVjdDxMb2dpblJlc3BvbnNlPihlcnJvcik7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyBzd2l0Y2ggY3VycmVudCBzZXJ2ZXJcbiAgICBpZiAoJ3JvbGVzJyBpbiByZXNwb25zZS5yb2xlcykge1xuICAgICAgLy8gZml4ZXMgYSBkZWZlY3Qgb2YgSmF2YSBpbXBsZW1lbnRhdGlvblxuICAgICAgcmVzcG9uc2Uucm9sZXMgPSByZXNwb25zZS5yb2xlc1sncm9sZXMnXTtcbiAgICB9XG4gICAgc2VydmVyT2JqLmF1dGhvcml6YXRpb24gPSB7XG4gICAgICBuYW1lOiByZXNwb25zZS51c2VyLnV1aWQsXG4gICAgICByb2xlczogXy5tYXAocmVzcG9uc2Uucm9sZXMsIChyb2xlOiByb2xlcy5Sb2xlRHRvKSA9PiByb2xlLnV1aWQpXG4gICAgfTtcbiAgICBzZXJ2ZXJPYmoub3JnYW5pemF0aW9uID0gcmVzcG9uc2Uub3JnYW5pemF0aW9uO1xuICAgIHNlcnZlck9iai51c2VyID0gcmVzcG9uc2UudXNlcjtcbiAgICBzZXJ2ZXJPYmouY3JlZGVudGlhbHMgPSBjcmVkZW50aWFscztcbiAgICBzZXJ2ZXIuc2V0Q3VycmVudFNlcnZlcihzZXJ2ZXJPYmopO1xuICAgIHJldHVybiByZXNwb25zZTtcbiAgfSkudGhlbigocmVzcG9uc2UpID0+IHtcbiAgICAvLyB0aGlzIGlzIHRoZSBlYXJsaWVzdCBwb2ludCBhdCB3aGljaCBsaWJyYXJ5IHN0YXRlIHJlZmxlY3RzIGNvcnJlY3QgYXV0aG9yaXphdGlvbiwgZXRjLlxuICAgIC8vIFRodXMsIHRoZSBsb2dvbkNhbGxiYWNrIG1heSBleGVjdXRlIGhlcmUgbm93LCBidXQgb25seSBpZiB3ZSBhcmUgb25saW5lIGFjdHVhbGx5Li4uXG4gICAgaWYgKCFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKSB7XG4gICAgICByZXR1cm4gcmVzcG9uc2U7IC8vIG9mZmxpbmVcbiAgICB9XG4gICAgLy8gd2UgaGF2ZSBhIHNlc3Npb24gbG9nZ2VkIGludG8gdGhpcyB1c2VyXG4gICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gc2VydmVyT2JqLnNlc3Npb25Vc2VyVXVpZCA9PT0gc2VydmVyLmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCkubmFtZSk7XG5cbiAgICAvLyBydW4gbG9nb25DYWxsYmFjayBvbiByZXNwb25zZSBkYXRhIGFuZCBldmVudHVhbGx5IHN0b3JlIHJlc3VsdGFudCBvYmplY3QgZm9yIG9mZmxpbmUgbG9naW4sXG4gICAgLy8gYmVjYXVzZSB0aGlzIHdheSB0aGUgY2FsbGJhY2sgbWF5IGFkZCBpbmZvcm1hdGlvbiB0byB0aGUgcmVzcG9uc2Ugb2JqZWN0IHRoYXQgd2lsbCBhbHNvIGJlXG4gICAgLy8gcGVyc2lzdGVkIGFuZCBtYWRlIGF2YWlsYWJsZSBhZ2FpbiB3aGVuIG9mZmxpbmUhXG4gICAgcmV0dXJuIFEobG9nb25DYWxsYmFjayhyZXNwb25zZSkpLnRoZW4oKGxvZ29uSW5mb3MgPSByZXNwb25zZSkgPT4ge1xuICAgICAgaWYgKGxvZ29uSW5mb3MgJiYgbG9nb25JbmZvcyAhPT0gcmVzcG9uc2UpIHtcbiAgICAgICAgLy8gYW55IGRhdGEgcmV0dXJuZWQgYnkgdGhlIGxvZ29uQ2FsbGJhY2sgbWF5IGJlIHN0b3JlZCBoZXJlXG4gICAgICAgIHJlc3BvbnNlLmxvZ29uSW5mb3MgPSBsb2dvbkluZm9zO1xuICAgICAgfVxuXG4gICAgICAvLyBzdG9yZSBvZmZsaW5lIGxvZ2luIHJlc3BvbnNlXG4gICAgICBpZiAobG9naW5PcHRpb25zLm9mZmxpbmVDYXBhYmxlIHx8IHdhc09mZmxpbmVMb2dpbikge1xuICAgICAgICAvLyBpbml0aWFsIHN0b3JlIG9yIHVwZGF0ZSBvZiBsb2dpbiBkYXRhXG4gICAgICAgIHJldHVybiBvZmZsaW5lLnN0b3JlT2ZmbGluZUxvZ2luKGNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucywgcmVzcG9uc2UpLmNhdGNoKFxuICAgICAgICAgIChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgICAgIGRpYWcuZGVidWcud2Fybignb2ZmbGluZSBsb2dpbiBzdG9yZSBmYWlsZWQnLCBvZmZsaW5lRXJyb3IpO1xuICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgIH0sIChlcnJvcikgPT4ge1xuICAgICAgLy8gbG9nb24gY2FsbGJhY2sgZmFpbGVkLCBtdXN0IGxvZ291dCB0byBhdm9pZCBtYWtpbmcgYWpheCBjYWxscyBpbiBhbiB1bmtub3duIGJhY2tlbmQgc3RhdGVcbiAgICAgIHJldHVybiBsb2dvdXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6IHNlcnZlclVybFxuICAgICAgfSkuY2F0Y2goKGxvZ291dEVycm9yKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ2ZhaWxlZCB0byBsb2dvdXQgYWZ0ZXIgbG9naW4gZmFpbHVyZScsIGxvZ291dEVycm9yKTtcbiAgICAgICAgcmV0dXJuIFEucmVqZWN0PExvZ2luUmVzcG9uc2U+KGVycm9yKTtcbiAgICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgICAgICAvLyBsb2dvdXQgcHJvY2Vzc2luZyBtdXN0IGxlYXZlIHVzIHdpdGggbm8gdXNlciBzZXNzaW9uXG4gICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+ICFzZXJ2ZXJPYmouc2Vzc2lvblVzZXJVdWlkKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqXG4gKiBvcHRpb25zIHNwZWNpZmljIHRvIFtbbG9nb3V0XV0gZnVuY3Rpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTG9nb3V0T3B0aW9ucyBleHRlbmRzIExvZ29uT3B0aW9ucywgaW5pdC5IdHRwQWdlbnRPcHRpb25zIHtcbn07XG5cbi8qKlxuICogbG9ncyBvdXQgb2YgYSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogRm9yIGV4cGxpY2l0IGxvZ291dHMgKHRyaWdnZXIgYnkgYXBwIHVzZXIgcHJlc3NpbmcgYSBsb2dvdXQgYnV0dG9uLCBmb3IgZXhhbXBsZSkgc3BlY2lmeWluZ1xuICogYG9mZmxpbmVDYXBhYmxlID0gdHJ1ZWAgd2lsbCBkcm9wIGFueSBwZXJzaXN0ZWQgb2ZmbGluZSBsb2dpbiBkYXRhIGZvciB0aGUgc2VydmVyIGxvZ2dpbmcgb3V0XG4gKiBvZi5cbiAqXG4gKiBAcGFyYW0gbG9nb3V0T3B0aW9ucyBvdmVyd3JpdGluZyBbW2luaXRdXSBkZWZhdWx0cy5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZTx2b2lkPn0gb2YgbG9nb3V0IHJlc3BvbnNlLlxuICpcbiAqIEBleGFtcGxlXG4gKiBgYGBqYXZhc2NyaXB0XG4gKlxuICogUmVsdXRpb24ud2ViLmxvZ291dCgpXG4gKiAgLnRoZW4oKHJlc3ApID0+IGNvbnNvbGUubG9nKCdyZXNwJywgcmVzcCk7KVxuICogIC5jYXRjaCgoZTpFcnJvcikgPT4gY29uc29sZS5lcnJvcihlLm1lc3NhZ2UsIGUpKVxuICogIC5maW5hbGx5KCgpID0+IGNvbnNvbGUubG9nKCdieWUgYnllJykpO1xuICpcbiAqIC8vT2JzZXJ2YWJsZVxuICogT2JzZXJ2YWJsZS5mcm9tUHJvbWlzZShSZWx1dGlvbi53ZWIubG9nb3V0KCkpLnN1YnNjcmliZShcbiAqICAocmVzcDogYW55KSA9PiBjb25zb2xlLmxvZygncmVzcCcsIHJlc3ApLFxuICogIChlOkVycm9yKSA9PiBjb25zb2xlLmVycm9yKGUubWVzc2FnZSwgZSk7LFxuICogICgpID0+IGNvbnNvbGUubG9nKCdieWUgYnllJylcbiAqIClcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gbG9nb3V0KGxvZ291dE9wdGlvbnM6IExvZ291dE9wdGlvbnMgPSB7fSk6IFEuUHJvbWlzZTx2b2lkPiB7XG4gIGxldCBzZXJ2ZXJVcmwgPSB1cmxzLnJlc29sdmVTZXJ2ZXIoJy8nLCBsb2dvdXRPcHRpb25zKTtcbiAgbGV0IHNlcnZlck9iaiA9IHNlcnZlci5TZXJ2ZXIuZ2V0SW5zdGFuY2Uoc2VydmVyVXJsKTtcblxuICAvLyBwcm9jZXNzIG9wdGlvbnNcbiAgbGV0IGN1cnJlbnRPcHRpb25zID0gc2VydmVyT2JqLmFwcGx5T3B0aW9ucyh7XG4gICAgc2VydmVyVXJsOiBzZXJ2ZXJVcmwsXG4gICAgYWdlbnRPcHRpb25zOiBsb2dvdXRPcHRpb25zLmFnZW50T3B0aW9ucyB8fCBpbml0LmluaXRPcHRpb25zLmFnZW50T3B0aW9ucyxcbiAgICBhZ2VudENsYXNzOiBsb2dvdXRPcHRpb25zLmFnZW50Q2xhc3MgfHwgaW5pdC5pbml0T3B0aW9ucy5hZ2VudENsYXNzLFxuICAgIC8vIG9wdGlvbnMgdGFraW5nIGVmZmVjdCBhdCBsb2dvdXQgdGltZVxuICB9KTtcbiAgcmV0dXJuIGFqYXg8dm9pZD4oXy5kZWZhdWx0czxIdHRwT3B0aW9ucz4oe1xuICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgIHVybDogJy9nb2Zlci9zZWN1cml0eS9yZXN0L2F1dGgvbG9nb3V0JyxcbiAgICBib2R5OiB7fVxuICB9LCBjdXJyZW50T3B0aW9ucykpLmNhdGNoKChlcnJvcjogSHR0cEVycm9yKSA9PiB7XG4gICAgaWYgKGVycm9yLnN0YXR1c0NvZGUgPT09IDQyMikge1xuICAgIC8vIFJFU1QtYmFzZWQgbG9nb3V0IFVSTCBjdXJyZW50bHkgaXMgYnJva2VuIHJlcG9ydGluZyBhIDQyMiBpbiBhbGwgY2FzZXNcbiAgICAgIHJldHVybiBhamF4PHZvaWQ+KF8uZGVmYXVsdHM8SHR0cE9wdGlvbnM+KHtcbiAgICAgIHNlcnZlclVybDogc2VydmVyVXJsLFxuICAgICAgbWV0aG9kOiAnR0VUJyxcbiAgICAgIHVybDogJy9nb2Zlci9zZWN1cml0eS1sb2dvdXQnXG4gICAgfSwgY3VycmVudE9wdGlvbnMpKS50aGVuKChyZXN1bHQpID0+IHtcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdCVUc6IHJlc29ydGVkIHRvIGNsYXNzaWMgUEFUSC1iYXNlZCBsb2dvdXQgYXMgUkVTVC1iYXNlZCBsb2dvdXQgZmFpbGVkOicsXG4gICAgICAgICAgZXJyb3IpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sIChlcnJvcjI6IEh0dHBFcnJvcikgPT4ge1xuICAgICAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IyLnN0YXR1c0NvZGUgPT09IDQyMiA/IGVycm9yIDogZXJyb3IyKTtcbiAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIFEucmVqZWN0PHZvaWQ+KGVycm9yKTtcbiAgfSkuY2F0Y2goKGVycm9yOiBIdHRwRXJyb3IpID0+IHtcbiAgICAvLyBpZ25vcmUgbmV0d29yayBmYWlsdXJlcyBvbiB0aW1lb3V0LCBzZXJ2ZXIgZm9yZ2V0cyBvbiBzZXNzaW9uIHRpbWVvdXQgYW55d2F5c1xuICAgIGlmICghZXJyb3Iuc3RhdHVzQ29kZSkge1xuICAgICAgcmV0dXJuIFEucmVzb2x2ZTx2b2lkPih1bmRlZmluZWQpO1xuICAgIH1cbiAgICByZXR1cm4gUS5yZWplY3Q8dm9pZD4oZXJyb3IpO1xuICB9KS5maW5hbGx5KCgpID0+IHtcbiAgICAvLyBldmVudHVhbGx5IGVyYXNlIG9mZmxpbmUgbG9naW4gZGF0YVxuICAgIGlmIChsb2dvdXRPcHRpb25zLm9mZmxpbmVDYXBhYmxlKSB7XG4gICAgICAvLyByZXF1ZXN0ZWQgdG8gZXJhc2UgbG9naW4gZGF0YVxuICAgICAgcmV0dXJuIG9mZmxpbmUuY2xlYXJPZmZsaW5lTG9naW4oc2VydmVyT2JqLmNyZWRlbnRpYWxzLCBjdXJyZW50T3B0aW9ucykuY2F0Y2goXG4gICAgICAgIChvZmZsaW5lRXJyb3IpID0+IHtcbiAgICAgICAgZGlhZy5kZWJ1Zy53YXJuKCdmYWlsZWQgZXJhc2luZyBvZmZsaW5lIGxvZ2luIGRhdGEnLCBvZmZsaW5lRXJyb3IpO1xuICAgICAgICByZXR1cm4gUS5yZXNvbHZlPHZvaWQ+KHVuZGVmaW5lZCk7XG4gICAgICB9KTtcbiAgICB9XG4gIH0pLmZpbmFsbHkoKCkgPT4ge1xuICAgIC8vIGZvcmdldCBldmVyeXRoaW5nIGFib3V0IGl0XG4gICAgc2VydmVyT2JqLmNyZWRlbnRpYWxzID0gbnVsbDtcbiAgICBzZXJ2ZXJPYmouYXV0aG9yaXphdGlvbiA9IGF1dGguQU5PTllNT1VTX0FVVEhPUklaQVRJT047XG4gICAgc2VydmVyT2JqLm9yZ2FuaXphdGlvbiA9IG51bGw7XG4gICAgc2VydmVyT2JqLnVzZXIgPSBudWxsO1xuICAgIHNlcnZlck9iai5zZXNzaW9uVXNlclV1aWQgPSBudWxsO1xuICB9KTtcbn1cbiJdfQ==