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
import * as request from 'request';
import * as http from 'http';
import * as assert from 'assert';

import * as server from '../core/server';

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
export interface HttpOptions extends request.CoreOptions, request.UrlOptions {
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
export function http(options: HttpOptions): Q.Promise<any> {
  let url = server.resolveUrl(options.url);
  let responseCallback = options.responseCallback || _.identity;
  return Q.Promise((resolveResult, rejectResult) => {
    let promiseResponse = responseCallback(Q.Promise((resolveResponse, rejectResponse) => {
      request(url, options, (error: any, response: http.IncomingMessage, body: any) => {
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
