/**
 * @file web/http.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 02.05.2016
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

import * as assert from 'assert';
import * as http from './http';

import * as _ from 'lodash';

import * as security from '../security';

let credentials: security.LoginObject = {
  userName: 't.beckmann',
  password: 'mcap'
};

describe(module.filename, () => {
  return it('login/logout', (done) => {
    return http.login(credentials, {
      serverUrl: 'http://localhost:8080'
    }).then((loginResp) => {
      // logged in
      assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
      let user = security.getCurrentUser();
      assert(!!user);
      assert.equal(user.name, credentials.userName);
      return http.get('/gofer/system/security/currentAuthorization').then((currentAuthResp) => {
        assert.equal(currentAuthResp.user.uuid, loginResp.user.uuid);
        assert.equal(currentAuthResp.organization.uuid, loginResp.organization.uuid);
        return currentAuthResp;
      }).finally(() => http.logout()).then((response) => {
        // logged out again
        assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
        assert(!security.getCurrentUser());
        return response;
      });
    }).done((result) => done(), (error) => done(error));
  });
});
