/*
 * @file web/http.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 02.05.2016
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

import * as assert from 'assert';
import * as web from './index';
import * as offline from './offline';
import {debug} from '../core/diag';

import * as security from '../security';

// connect to real server for testing purposes, used by all online tests
export class TestServer {
  private resetProperty<ValueT>(key: string, value: ValueT): ValueT {
    Object.defineProperty(this, key, {
      value: value
    });
    return value;
  }

  public get serverUrl(): string {
    return this.resetProperty('serverUrl', offline.localStorage().getItem('test.serverUrl') || 'http://localhost:8080');
  }

  public get credentials(): security.LoginObject {
    return this.resetProperty('credentials', {
      userName: offline.localStorage().getItem('test.userName') || 'relutionsdk',
      password: offline.localStorage().getItem('test.password') || 'relutionsdk'
    });
  }

  public get login(): Q.Promise<web.LoginResponse> {
    return this.resetProperty('login', web.login(this.credentials, {
      serverUrl: this.serverUrl
    }).catch((e: Error): web.LoginResponse => {
      e.message += ' (' + this.credentials.userName + ' @ ' + this.serverUrl + ')';
      throw e;
    }));
  }
}
export const testServer = new TestServer();

describe(module.filename || __filename, function() {
  return [

    it('login/logout', (done) => {
      return web.login(testServer.credentials, {
        serverUrl: testServer.serverUrl
      }).then((loginResp) => {
        // logged in
        assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
        const user = security.getCurrentUser();
        assert(!!user);
        assert.equal(user.name, testServer.credentials.userName);
        return web.get<web.LoginResponse>('/gofer/system/security/currentAuthorization').then((currentAuthResp) => {
          assert.equal(currentAuthResp.user.uuid, loginResp.user.uuid);
          assert.equal(currentAuthResp.organization.uuid, loginResp.organization.uuid);
          return currentAuthResp;
        }).finally(() => web.logout()).then((response) => {
          // logged out again
          assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
          assert(!security.getCurrentUser());
          return response;
        });
      }).finally(() => {
        // forces relogin after test execution
        return delete testServer.login;
      }).done((result) => done(), (error) => done(error));
    }),

    it('callback order', (done) => {
      let state = 0;
      return web.get({
        serverUrl: testServer.serverUrl,
        url: '/gofer/system/security/currentAuthorization',
        requestCallback: (request) => {
          debug.debug('request callback fired.');
          assert.equal(state++, 0, 'request must be reported firstly');
          return request;
        },
        responseCallback: (response) => {
          debug.debug('response callback fired.');
          assert.equal(state++, 1, 'response must be reported after request');
          return response;
        },
      }).then((result) => {
        debug.debug('body data fired.');
        assert.equal(state++, 2, 'body data must be reported lastly');
        return result;
      }).done((result) => done(), (error) => done(error));
    })

  ];
});
