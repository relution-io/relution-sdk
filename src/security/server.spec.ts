/**
 * @file security/server.spec.ts
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

import * as assert from 'assert';

import * as core from '../core';
import * as server from './server';

describe(module.filename, () => {
  return it('resolveUrl', () => {
    core.init({
      serverUrl: 'http://192.168.0.10:8080',
      application: 'myapp',
      tenantorga: 'mway'
    });

    assert.equal(server.resolveUrl('http://localhost:8090/mway/myapp/api/v1/some_endpoint?A'),
      'http://localhost:8090/mway/myapp/api/v1/some_endpoint?A');
    assert.equal(server.resolveUrl('/mway/myapp/api/v1/some_endpoint?B'),
      'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?B');
    assert.equal(server.resolveUrl('api/v1/some_endpoint?C'),
      'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?C');
  });
});
