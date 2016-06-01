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

import * as _ from 'lodash';
import * as Q from 'q';

import * as request from 'request';
import * as http from 'http';

import * as diag from '../core/diag';
import * as init from '../core/init';
import * as auth from '../security/auth';
import * as server from '../security/server';

// require request.js to manage cookies for us
let requestDefaults = {
  json: true,
  jar: true,
  withCredentials: true
};
let requestWithDefaults = request.defaults(requestDefaults);

/**
 * callback allowing customizing an object not immediately available at time of call.
 *
 * @param promise of deferred object for inspection or customization.
 * @return promise on same deferred object.
 */
export interface HttpCallback<T> {
  (promise: Q.Promise<T>): Q.Promise<T>;
}

/**
 * type representing a raw response.
 */
export type HttpResponse = http.IncomingMessage;

/**
 * named parameters of the [[http]] function.
 */
export interface HttpOptions extends request.CoreOptions, request.UrlOptions,
    init.ServerInitOptions {
  /**
   * optional callback allowing to inspect the server response in more detail than provided by
   * default.
   */
  responseCallback?: HttpCallback<HttpResponse>;
}

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
 *  .catch((e:Error) => console.error(e.message, e))
 *  .finally(() => console.log('loading complete!'));
 *
 * // as Observable
 * Observable.fromPromise(Relution.web.ajax(httpOptions)).subscribe(
 *  (resp: any) => console.log('posts', resp),
 *  (e:Error) => console.error(e.message, e);,
 *  () => console.log('loading complete!')
 * )
 * ```
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 */
export function ajax(options: HttpOptions): Q.Promise<any> {
  let serverUrl = server.resolveUrl('/', options);
  let serverObj = server.Server.getInstance(serverUrl);
  if (!serverObj.sessionUserUuid && serverObj.credentials) {
    // not logged in
    let credentials = serverObj.credentials;
    serverObj.credentials = null;
    return login(credentials, {
      serverUrl: serverUrl
    }).then(() => {
      diag.debug.assert(() => !!serverObj.sessionUserUuid);
      diag.debug.assert(() => serverObj.credentials == credentials);
      return ajax(options); // repeat after login
    });
  }

  // process options
  let currentOptions = serverObj.applyOptions({
    serverUrl: serverUrl,
    agentOptions: options.agentOptions || init.initOptions.agentOptions,
    agentClass: options.agentClass || init.initOptions.agentClass,
    // options taking effect at request time
    application: options.application || init.initOptions.application,
    tenantOrga: options.tenantOrga || init.initOptions.tenantOrga
  });

  // resolve target url
  let url = server.resolveUrl(options.url, currentOptions);
  diag.debug.debug(options.method + ' ' + url);

  let responseCallback = options.responseCallback || _.identity;
  options = _.clone(options);
  options.agentOptions = currentOptions.agentOptions;
  options.agentClass = currentOptions.agentClass;
  let headers = {};
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
  return Q.Promise((resolveResult, rejectResult) => {
    let promiseResponse = responseCallback(Q.Promise((resolveResponse, rejectResponse) => {
      let resp: http.IncomingMessage;
      let req = requestWithDefaults(url, options, (error: any, response = resp, body?: any) => {

        // error processing
        if (!error && response && response.statusCode >= 400) {
          if (!body) {
            error = new Error(response.statusMessage);
          } else if (_.isString(body)) {
            error = new Error(body);
          } else {
            error = body;
          }
        }
        if (error) {
          error.requestUrl = url;
          if (response) {
            error.statusCode = response.statusCode;
            error.statusMessage = response.statusMessage;
          }
        }

        if (!response) {
          // network connectivity problem
          diag.debug.assertIsError(error);
          rejectResponse(error); // will also rejectResult(error)
        } else {
          // logon session processing
          let sessionUserUuid = resp.headers['x-gofer-user'];
          if (sessionUserUuid) {
            serverObj.sessionUserUuid = sessionUserUuid;
          } else if (response.statusCode === 401) {
            // apparently our session is lost!
            serverObj.sessionUserUuid = null;
            diag.debug.assert(() => error);
            diag.debug.warn('server session is lost!', error);
            if (serverObj.credentials) {
              // recover by attempting login,
              // here promiseResponse must have been resolved already,
              // we chain anyways because of error propagation
              promiseResponse.thenResolve(login(serverObj.credentials, {
                serverUrl: serverUrl
              }).then(() => {
                diag.debug.assert(() => !!serverObj.sessionUserUuid);
                diag.debug.info('server session recovered.');
                return ajax(options);
              })).done(resolveResult, rejectResult);
              return; // early exit
            }
          }
        }

        // completing the chain
        promiseResponse.then((responseResult: http.IncomingMessage) => {
          diag.debug.assert(() => responseResult === resp, 'definition of behavior in case of ' +
            'proxying the original response is reserved for future extension!');

          if (error) {
            rejectResult(error);
          } else {
            resolveResult(body);
          }
        }, (responseError) => {
          rejectResult(responseError);
        }).done();
      });

      // transport response
      req.on('response', (response: http.IncomingMessage) => {
        if (!resp) {
          resp = response;
          resolveResponse(resp);
        }
      });
    }));
  });
}

/**
 * issues an http/ajax request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 *
 * @internal Implements verb methods.
 */
function verb(method: string, optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any> {
  const options: any = {
    method: method
  };
  if (_.isString(optionsOrUrl)) {
    options.url = optionsOrUrl;
  } else {
    _.defaults(options, optionsOrUrl);
  }
  if (!_.isUndefined(body)) {
    options.body = body;
  }
  return ajax(options);
}

/**
 * issues an http/ajax HEAD request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export function head(optionsOrUrl: HttpOptions | string): Q.Promise<any> {
  return verb('HEAD', optionsOrUrl);
}

/**
 * issues an http/ajax GET request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export function get(optionsOrUrl: HttpOptions | string): Q.Promise<any> {
  return verb('GET', optionsOrUrl);
}

/**
 * issues an http/ajax PUT request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export function put(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any> {
  return verb('PUT', optionsOrUrl, body);
}

/**
 * issues an http/ajax POST request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export function post(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any> {
  return verb('POST', optionsOrUrl, body);
}

/**
 * issues an http/ajax PATCH request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see delete
 *
 * @see ajax
 */
export function patch(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any> {
  return verb('PATCH', optionsOrUrl, body);
}

/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * <p>
 * Please consider this export as an implementation detail of the library and use delete instead.
 * </p>
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
export function del(optionsOrUrl: HttpOptions | string, body?: any): Q.Promise<any> {
  return verb('DELETE', optionsOrUrl, body);
}

/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 *
 * @see ajax
 */
export { del as delete };

/**
 * options for use by both [[login]] and [[logout]].
 */
export interface LogonOptions extends init.ServerUrlOptions {

  /**
   * specifies whether login response data is persisted such that subsequent logons can be
   * processed even if communication with the Relution server is impossible at that time.
   *
   * On [[login]] set to `true` to persist the response to offline storage such that
   * subsequent logon to the same server will reuse it even after the client app is restarted.
   * The response data is stored in encrypted form. Once stored, calling [[login]] with the
   * same set of credentials will succeed even if the Relution server can not be reached. In
   * this case, credentials are verified by decryption of the encrypted response data.
   *
   * On [[logout]] set to `true` to ultimately erase the response from offline storage as well,
   * after having it stored using the mechanism described above.
   */
  offlineCapable?: boolean; // future extension not implemented yet

};

/**
 * options specific to [[login]] function.
 */
export interface LoginOptions extends LogonOptions, init.ServerInitOptions {
};

/**
 * logs into a Relution server.
 *
 * ```javascript
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
 *
 * @param credentials to use.
 * @param loginOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of login response.
 */
export function login(credentials: auth.Credentials,
                      loginOptions: LoginOptions = {}): Q.Promise<any> {
  let serverUrl = server.resolveUrl('/', loginOptions);
  let serverObj = server.Server.getInstance(serverUrl);
  if (serverObj.sessionUserUuid) {
    // logged in already
    return logout({
      serverUrl: serverUrl
    }).then(() => {
      diag.debug.assert(() => !serverObj.sessionUserUuid);
      return login(credentials, loginOptions); // repeat after logout
    });
  }

  // process options
  let currentOptions = serverObj.applyOptions({
    serverUrl: serverUrl,
    agentOptions: loginOptions.agentOptions || init.initOptions.agentOptions,
    agentClass: loginOptions.agentClass || init.initOptions.agentClass,
    // options taking effect at login time
    clientApp: loginOptions.clientApp || init.initOptions.clientApp,
    logonCallback: loginOptions.logonCallback || init.initOptions.logonCallback,
    clientCertificate: loginOptions.clientCertificate || init.initOptions.clientCertificate,
  });
  return ajax(_.defaults<HttpOptions>({
    serverUrl: serverUrl,
    method: 'POST',
    url: '/gofer/security/rest/auth/login',
    body: credentials
  }, currentOptions)).then((response) => {
    // switch current server
    if (!serverObj.sessionUserUuid) {
      diag.debug.warn('BUG: Relution did not set X-Gofer-User response header');
      serverObj.sessionUserUuid = response.user.uuid;
    }
    serverObj.authorization = {
      name: response.user.uuid,
      roles: _.map(response.roles.roles, (role: any) => role.uuid)
    };
    serverObj.organization = response.organization;
    serverObj.user = response.user;
    serverObj.credentials = credentials;
    diag.debug.assert(() => serverObj.sessionUserUuid === serverObj.authorization.name);
    server.setCurrentServer(serverObj);
    return response;
  });
}

/**
 * options specific to [[logout]] function.
 */
export interface LogoutOptions extends LogonOptions, init.HttpAgentOptions {
};

/**
 * logs out of a Relution server.
 *
 * @param logoutOptions overwriting [[init]] defaults.
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
 * @return {Q.Promise<any>} of logout response.
 */
export function logout(logoutOptions: LogoutOptions = {}): Q.Promise<any> {
  let serverUrl = server.resolveUrl('/', logoutOptions);
  let serverObj = server.Server.getInstance(serverUrl);

  // process options
  let currentOptions = serverObj.applyOptions({
    serverUrl: serverUrl,
    agentOptions: logoutOptions.agentOptions || init.initOptions.agentOptions,
    agentClass: logoutOptions.agentClass || init.initOptions.agentClass,
    // options taking effect at logout time
  });
  return ajax(_.defaults<HttpOptions>({
    serverUrl: serverUrl,
    method: 'POST',
    url: '/gofer/security/rest/auth/logout',
    body: {}
  }, currentOptions)).catch((error) => {
    // REST-based logout URL currently is broken reporting a 422 in all cases
    return ajax(_.defaults<HttpOptions>({
      serverUrl: serverUrl,
      method: 'GET',
      url: '/gofer/security-logout'
    }, currentOptions)).then((result) => {
      diag.debug.warn('BUG: resorted to classic PATH-based logout as REST-based logout failed: ', error);
      return result;
    }, (error2) => {
      error.suppressed = error.suppressed || [];
      error.suppressed.push(error2);
      throw error;
    });
  }).finally(() => {
    serverObj.credentials = null;
    serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
    serverObj.organization = null;
    serverObj.user = null;
    serverObj.sessionUserUuid = null;
  });
}
