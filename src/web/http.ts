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
import * as assert from 'assert';

import * as init from '../core/init';
import * as auth from '../security/auth';
import * as server from '../security/server';

// require request.js to manage cookies for us
let requestDefaults = {
  json: true,
  jar: true
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
    init.ServerUrlOptions {
  /**
   * optional callback allowing to inspect the server response in more detail than provided by
   * default.
   */
  responseCallback?: HttpCallback<HttpResponse>;
}

/**
 * drives an HTTP request against the Relution server.
 *
 * @param options of request, including target `url`.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `statusCode` and `statusMessage`.
 */
export function ajax(options: HttpOptions): Q.Promise<any> {
  let url = server.resolveUrl(options.url, options.serverUrl);
  let responseCallback = options.responseCallback || _.identity;
  return Q.Promise((resolveResult, rejectResult) => {
    let promiseResponse = responseCallback(Q.Promise((resolveResponse, rejectResponse) => {
      console.log(url);
      requestWithDefaults(url, options, (error: any, response: http.IncomingMessage, body: any) => {
        resolveResponse(response);
        promiseResponse.then((responseResult: http.IncomingMessage) => {
          assert.equal(responseResult, response, 'definition of behavior in case of proxying the ' +
            'original response is reserved for future extension!');
          if (error) {
            error.statusCode = responseResult.statusCode;
            error.statusMessage = responseResult.statusMessage;
            rejectResult(error);
          } else {
            resolveResult(body);
          }
        }, (responseError) => {
          rejectResult(responseError);
        }).done();
      });
    }));
  });
}

/**
 * options for use by both [[login]] and [[logout]].
 */
export interface LogonOptions extends request.CoreOptions {

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
export interface LoginOptions extends LogonOptions, init.ServerUrlOptions {
};

/**
 * logs into a Relution server.
 *
 * @param credentials to use.
 * @param loginOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of login response.
 */
export function login(credentials: auth.Credentials,
                      loginOptions: LoginOptions = {}): Q.Promise<any> {
  let url = server.resolveUrl('/gofer/security/rest/auth/login', loginOptions.serverUrl);
  let serverUrl = server.resolveUrl('/', url);
  return ajax(_.defaults<HttpOptions>({
    url: url,
    method: 'POST',
    body: credentials,
    serverUrl: serverUrl
  }, loginOptions)).then((response) => {
    // switch current server
    let serverObj = server.Server.getInstance(serverUrl);
    serverObj.authorization = {
      name: response.user.uuid,
      roles: _.map(response.roles.roles, (role: any) => role.uuid)
    };
    serverObj.organization = response.organization;
    serverObj.user = response.user;
    serverObj.credentials = credentials;
    server.setCurrentServer(serverObj);
    console.log(init.initOptions.serverUrl);
    return response;
  });
}

/**
 * options specific to [[logout]] function.
 */
export interface LogoutOptions extends LogonOptions {
};

/**
 * logs out of a Relution server.
 *
 * @param logoutOptions overwriting [[init]] defaults.
 *
 * @return {Q.Promise<any>} of logout response.
 */
export function logout(logoutOptions: LogoutOptions = {}): Q.Promise<any> {
  let url = server.resolveUrl('/gofer/security/rest/auth/logout');
  let serverUrl = server.resolveUrl('/', url);
  return ajax(_.defaults<HttpOptions>({
    url: url,
    method: 'POST',
    body: {},
    serverUrl: serverUrl
  }, logoutOptions)).finally(() => {
    let serverObj = server.Server.getInstance(serverUrl);
    serverObj.credentials = null;
    serverObj.authorization = auth.ANONYMOUS_AUTHORIZATION;
    serverObj.organization = null;
    serverObj.user = null;
  });
}
