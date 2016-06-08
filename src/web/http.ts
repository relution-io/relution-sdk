/**
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

import * as _ from 'lodash';
import * as Q from 'q';

import * as request from 'request';
import * as http from 'http';

import * as diag from '../core/diag';
import * as init from '../core/init';
import * as auth from '../security/auth';
import * as server from '../security/server';
import * as urls from './urls';

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
 * @param object for inspection or customization.
 * @return promise or object on same deferred object.
 */
export interface HttpCallback<T> {
  (value: T): Q.Promise<T> | T;
}

/**
 * type representing a raw request.
 */
export type HttpRequest = request.Request;
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
   * optional callback allowing to customize the client request in more detail than provided by
   * default.
   */
  requestCallback?: HttpCallback<HttpRequest>;
  /**
   * optional callback allowing to inspect the server response in more detail than provided by
   * default.
   */
  responseCallback?: HttpCallback<HttpResponse>;
}

/**
 * failure of an ajax request.
 *
 * This type can be used as type annotation of the error the Promise returned by ajax is rejected
 * with.
 *
 * @see ajax
 */
export interface HttpError extends Error {
  /**
   * fully resolved url the request was sent to.
   */
  requestUrl?: string;

  /**
   * HTTP status code of failure.
   */
  statusCode?: number;
  /**
   * HTTP status message of failure.
   */
  statusMessage?: string;

  /**
   * details of request failed.
   *
   * This is a non-enumerable property and thus not part of the JSON representation of the failure.
   * It is provided for informal purposes as a debugging aid only. Client code should not rely on
   * this value.
   *
   * @see response
   */
  rawRequest?: HttpRequest;
  /**
   * details of response failed.
   *
   * This is a non-enumerable property and thus not part of the JSON representation of the failure.
   * It is provided for informal purposes as a debugging aid only. Client code should not rely on
   * this value.
   *
   * @see request
   */
  rawResponse?: HttpResponse;
}

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
export function ajax(options: HttpOptions): Q.Promise<any> {
  let serverUrl = urls.resolveUrl('/', options);
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
  let url = urls.resolveUrl(options.url, currentOptions);
  diag.debug.debug(options.method + ' ' + url);

  let requestCallback = options.requestCallback || _.identity;
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
    let promiseResponse = Q.Promise((resolveResponse, rejectResponse) => {
      let resp: http.IncomingMessage;
      let req: request.Request;
      try {
        req = requestWithDefaults(url, options, (error: HttpError, response = resp, body?: any) => {
          // node.js assigns response object as body for status codes not having body data
          if (response.statusCode === 202) {
            diag.debug.assert(body === http.STATUS_CODES[202], body);
            body = undefined;
          }

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
            rejectResponse(error); // will also rejectResult(error)
          } else {
            // logon session processing
            let sessionUserUuid = resp.headers['x-gofer-user'];
            if (sessionUserUuid) {
              serverObj.sessionUserUuid = sessionUserUuid;
            } else if (response.statusCode === 401) {
              // apparently our session is lost!
              serverObj.sessionUserUuid = null;
              diag.debug.assert(() => !!error);
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
      } catch (error) {
        // path taken when request.js throws
        return rejectResult(error);
      }

      // transport response
      try {
        Q(requestCallback(req)).then((request = req) => {
          request.on('response', (response: http.IncomingMessage) => {
            if (!resp) {
              resp = response;
              resolveResponse(responseCallback(resp));
            }
          });
          return request;
        }).done();
      } catch (error) {
        // path taken when requestCallback throws
        return rejectResponse(error);
      }
    });
  });
}

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
  let serverUrl = urls.resolveUrl('/', loginOptions);
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
  let serverUrl = urls.resolveUrl('/', logoutOptions);
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
