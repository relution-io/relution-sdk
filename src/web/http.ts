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

import * as _ from 'lodash';
import * as Q from 'q';

import * as request from 'request';
import * as http from 'http';

import * as diag from '../core/diag';
import * as init from '../core/init';
import * as auth from '../security/auth';
import * as roles from '../security/roles';
import * as server from '../security/server';
import * as urls from './urls';
import * as offline from './offline';

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
   * in many cases the Relution server reports here the fully qualified name of a Java Exception
   * that may be used to further differentiate the error.
   */
  className?: string;
  /**
   * may be set to some arbitrary value describing the cause of failure, mostly present when
   * transporting Java Exception objects.
   */
  cause?: any;

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
export function ajax<T>(options: HttpOptions): Q.Promise<T> {
  let serverUrl = urls.resolveServer(options.url, options);
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
      return ajax<T>(options); // repeat after login
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
  diag.debug.assert(() => url.substr(0, serverUrl.length) === serverUrl);

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
  return Q.Promise<T>((resolveResult, rejectResult) => {
    let promiseResponse = Q.Promise((resolveResponse, rejectResponse) => {
      let resp: http.IncomingMessage;
      let req: request.Request;
      try {
        if (options.clientCertificate) {
          // apply certificate options
          _.extend(options, options.clientCertificate);
        }
        req = requestWithDefaults(url, options, (error: HttpError, response = resp, body?: any) => {
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
            } else if (_.isString(body)) {
              // use plain-text as Error message
              error = new Error(body);
            } else if (_.isObjectLike(body)) {
              // body is object representation of server-side error or exception,
              // converting to true Error object here
              error = new Error(response.statusMessage);
              diag.debug.assert(() => !_.isArray(body),
                'kicks in for array responses as well, not sure if this is desirable');
              _.extend(error, body);
            } else {
              // handles numbers, booleans, etc. assigning as cause of failure
              error = new Error(response.statusMessage);
              if (!_.isUndefined(body)) {
                error.cause = body;
              }
            }
            // additional HttpError properties eventually set below
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
            } else {
              rejectResult(error); // promiseResponse not constructed yet
            }
          } else {
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
              promiseResponse.thenResolve(ajax<T>(options)).done(resolveResult, rejectResult);
              return; // early exit as result is handled by done call above
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
                const credentials = serverObj.credentials;
                if (credentials) {
                  // recover by attempting login,
                  // here promiseResponse must have been resolved already,
                  // we chain anyways because of error propagation
                  serverObj.credentials = null;
                  promiseResponse.thenResolve(login(credentials, {
                    serverUrl: serverUrl
                  }).then(() => {
                    diag.debug.assert(() => !!serverObj.sessionUserUuid);
                    diag.debug.info('server session recovered.');
                    return ajax<T>(options);
                  })).done(resolveResult, rejectResult);
                  return; // early exit as result is handled by done call above
                }
              }
            }
          }

          // completes the chain propagating results, must be skipped when request is retried above
          if (promiseResponse) {
            promiseResponse.then((responseResult: http.IncomingMessage) => {
              diag.debug.assert(() => responseResult === resp, 'definition of behavior in case ' +
                'of proxying the original response is reserved for future extension!');

              if (error) {
                rejectResult(error);
              } else {
                resolveResult(body);
              }
            }, (responseError) => {
              rejectResult(responseError);
            }).done();
          }
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
 * response data of login endpoints.
 *
 * This is equivalent to UserInfoWrapper in Java code.
 */
export interface LoginResponse {
  // com.mwaysolutions.gofer2.security.domain.UserInfoWrapper
  user: roles.User;
  roles: roles.RoleDto[];
  organization: roles.Organization;

  licenseInfos: {
    // com.mwaysolutions.gofer2.security.domain.LicenseInfos
    licenseModelName: string;
    licenseInfos: _.Dictionary<any>
  };
  /**
   * lists experimental features enabled on the server.
   */
  activeFeatureToggles?: string[];

  /**
   * eventually returned data of the LogonCallback is stored here.
   */
  logonInfos?: any;
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
  offlineCapable?: boolean;

}

/**
 * options specific to [[login]] function.
 */
export interface LoginOptions extends LogonOptions, init.ServerInitOptions {
}

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
export function login(credentials: auth.Credentials,
                      loginOptions: LoginOptions = {}): Q.Promise<LoginResponse> {
  let wasOfflineLogin = false;
  let serverUrl = urls.resolveServer('/', loginOptions);
  let serverObj = server.Server.getInstance(serverUrl);
  if (serverObj.sessionUserUuid) {
    // logged in already
    return logout({
      serverUrl: serverUrl
    }).then(() => {
      diag.debug.assert(() => !serverObj.sessionUserUuid);
      return login(credentials, loginOptions); // repeat after logout
    });
  } else if (serverObj.credentials) {
    // had credentials but no session, so we were logged in offline
    wasOfflineLogin = true;
  }

  // process options
  let currentOptions = serverObj.applyOptions({
    serverUrl: serverUrl,
    agentOptions: loginOptions.agentOptions || init.initOptions.agentOptions,
    agentClass: loginOptions.agentClass || init.initOptions.agentClass,
    // options taking effect at login time
    clientApp: loginOptions.clientApp || init.initOptions.clientApp,
    logonCallback: loginOptions.logonCallback || init.initOptions.logonCallback,
    clientCertificate: loginOptions.clientCertificate || init.initOptions.clientCertificate
  });
  let logonCallback = currentOptions.logonCallback || _.identity;
  return ajax<LoginResponse>(_.defaults<HttpOptions>({
    serverUrl: serverUrl,
    method: 'POST',
    url: '/gofer/security/rest/auth/login',
    body: credentials
  }, currentOptions)).then((response) => {
    // real physical logon, ajax call sets sessionUserUuid
    if (!serverObj.sessionUserUuid) {
      diag.debug.warn('BUG: Relution did not set X-Gofer-User response header');
      serverObj.sessionUserUuid = response.user.uuid;
    }
    diag.debug.assert(() => serverObj.sessionUserUuid === response.user.uuid);
    return response;
  }, (error: HttpError) => {
    // offline login response
    if (!error.statusCode && loginOptions.offlineCapable) {
      // ajax timeout -> offline login attempt
      diag.debug.assert(() => !serverObj.sessionUserUuid,
        'no physical login, as otherwise logonCallback would be executed');
      return offline.fetchOfflineLogin(credentials, currentOptions).then((loginResponse) => {
        if (!loginResponse) {
          // when there is no persistent data available, aka. this is the initial login attempt,
          // keep saying the server is offline...
          return Q.reject<LoginResponse>(error);
        }
        return loginResponse;
      }, (offlineError) => {
        // most likely the password entered was incorrect,
        // make sure the offlineError indicates the server is unavailable as well
        diag.debug.assert(() => !offlineError.statusCode);
        diag.debug.assert(() => !offlineError.requestUrl);
        offlineError.requestUrl = error.requestUrl;
        diag.debug.assert(() => !offlineError.cause);
        offlineError.cause = error;
        // we rethrow the annotated error of decoding the stored response,
        // because the network error just indicates we are offline and does
        // not mention the credentials being incorrect as this one does...
        return Q.reject<LoginResponse>(offlineError);
      });
    } else if (error.statusCode && wasOfflineLogin) {
      // server side rejection, clear login data so that subsequent offline logins fail as well
      return offline.clearOfflineLogin(credentials, currentOptions).catch((offlineError) => {
        // this is bad but we can not do much about it
        diag.debug.warn('failed erasing offline login data', offlineError);
        return Q.reject<LoginResponse>(error);
      });
    }
    return Q.reject<LoginResponse>(error);
  }).then((response) => {
    // switch current server
    if ('roles' in response.roles) {
      // fixes a defect of Java implementation
      response.roles = response.roles['roles'];
    }
    serverObj.authorization = {
      name: response.user.uuid,
      roles: _.map(response.roles, (role: roles.RoleDto) => role.uuid)
    };
    serverObj.organization = response.organization;
    serverObj.user = response.user;
    serverObj.credentials = credentials;
    server.setCurrentServer(serverObj);
    return response;
  }).then((response) => {
    // this is the earliest point at which library state reflects correct authorization, etc.
    // Thus, the logonCallback may execute here now, but only if we are online actually...
    if (!serverObj.sessionUserUuid) {
      return response; // offline
    }
    // we have a session logged into this user
    diag.debug.assert(() => serverObj.sessionUserUuid === server.getCurrentAuthorization().name);

    // run logonCallback on response data and eventually store resultant object for offline login,
    // because this way the callback may add information to the response object that will also be
    // persisted and made available again when offline!
    return Q(logonCallback(response)).then((logonInfos = response) => {
      if (logonInfos && logonInfos !== response) {
        // any data returned by the logonCallback may be stored here
        response.logonInfos = logonInfos;
      }

      // store offline login response
      if (loginOptions.offlineCapable || wasOfflineLogin) {
        // initial store or update of login data
        return offline.storeOfflineLogin(credentials, currentOptions, response).catch(
          (offlineError) => {
            diag.debug.warn('offline login store failed', offlineError);
            return response;
          });
      }
      return response;
    }, (error) => {
      // logon callback failed, must logout to avoid making ajax calls in an unknown backend state
      return logout({
        serverUrl: serverUrl
      }).catch((logoutError) => {
        diag.debug.error('failed to logout after login failure', logoutError);
        return Q.reject<LoginResponse>(error);
      }).finally(() => {
        // logout processing must leave us with no user session
        diag.debug.assert(() => !serverObj.sessionUserUuid);
      });
    });
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
export function logout(logoutOptions: LogoutOptions = {}): Q.Promise<void> {
  let serverUrl = urls.resolveServer('/', logoutOptions);
  let serverObj = server.Server.getInstance(serverUrl);

  // process options
  let currentOptions = serverObj.applyOptions({
    serverUrl: serverUrl,
    agentOptions: logoutOptions.agentOptions || init.initOptions.agentOptions,
    agentClass: logoutOptions.agentClass || init.initOptions.agentClass,
    // options taking effect at logout time
  });
  return ajax<void>(_.defaults<HttpOptions>({
    serverUrl: serverUrl,
    method: 'POST',
    url: '/gofer/security/rest/auth/logout',
    body: {}
  }, currentOptions)).catch((error: HttpError) => {
    if (error.statusCode === 422) {
    // REST-based logout URL currently is broken reporting a 422 in all cases
      return ajax<void>(_.defaults<HttpOptions>({
      serverUrl: serverUrl,
      method: 'GET',
      url: '/gofer/security-logout'
    }, currentOptions)).then((result) => {
        diag.debug.warn('BUG: resorted to classic PATH-based logout as REST-based logout failed:',
          error);
      return result;
      }, (error2: HttpError) => {
        return Q.reject<void>(error2.statusCode === 422 ? error : error2);
    });
    }
    return Q.reject<void>(error);
  }).catch((error: HttpError) => {
    // ignore network failures on timeout, server forgets on session timeout anyways
    if (!error.statusCode) {
      return Q.resolve<void>(undefined);
    }
    return Q.reject<void>(error);
  }).finally(() => {
    // eventually erase offline login data
    if (logoutOptions.offlineCapable) {
      // requested to erase login data
      return offline.clearOfflineLogin(serverObj.credentials, currentOptions).catch(
        (offlineError) => {
        diag.debug.warn('failed erasing offline login data', offlineError);
        return Q.resolve<void>(undefined);
      });
    }
  }).finally(() => {
    // forget everything about it
    serverObj.credentials = null;
    serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
    serverObj.organization = null;
    serverObj.user = null;
    serverObj.sessionUserUuid = null;
  });
}
