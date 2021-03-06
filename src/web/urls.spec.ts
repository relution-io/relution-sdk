/*
 * @file web/urls.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 08.06.2016
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

import * as core from '../core';
import * as urls from './urls';

describe(module.filename || __filename, function() {
  after(() => {
    core.init({
      tenantOrga: null,
      application: null
    });
  });
  return [

    it('resolveServer', () => {
      core.init({
        serverUrl: 'http://default:8080',
      });

      assert.equal(urls.resolveServer('http://localhost:8090/mway/myapp/api/v1/some_endpoint?A'),
        'http://localhost:8090/');
      assert.equal(urls.resolveServer('/mway/myapp/api/v1/some_endpoint?B'),
        'http://default:8080/');
      assert.equal(urls.resolveServer('api/v1/some_endpoint?C'),
        'http://default:8080/');
      assert.equal(urls.resolveServer('/'),
        'http://default:8080/');
      assert.equal(urls.resolveServer(''),
        'http://default:8080/');
      assert.equal(urls.resolveServer(null),
        'http://default:8080/');
      assert.equal(urls.resolveServer(undefined),
        'http://default:8080/');
    }),

    it('resolveUrl', () => {
      core.init({
        serverUrl: 'http://192.168.0.10:8080',
        application: 'myapp',
        tenantOrga: 'mway'
      });

      assert.equal(urls.resolveUrl('http://localhost:8090/mway/myapp/api/v1/some_endpoint?A'),
        'http://localhost:8090/mway/myapp/api/v1/some_endpoint?A');
      assert.equal(urls.resolveUrl('/mway/myapp/api/v1/some_endpoint?B'),
        'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?B');
      assert.equal(urls.resolveUrl('api/v1/some_endpoint?C'),
        'http://192.168.0.10:8080/mway/myapp/api/v1/some_endpoint?C');
    }),

    it('resolveApp', () => {
      core.init({
        serverUrl: 'http://myhost:8080',
        tenantOrga: 'tenant',
        application: 'anyapp'
      });

      // following resolves using an alternative tenantOrga
      assert.equal(urls.resolveApp('app1', {
        tenantOrga: 'abc'
      }), 'http://myhost:8080/abc/app1/');
      assert.equal(urls.resolveApp('app2', {
        tenantOrga: 'abc'
      }), 'http://myhost:8080/abc/app2/');

      // following resolves using tenantOrga initialized previously
      assert.equal(urls.resolveApp('app3'), 'http://myhost:8080/tenant/app3/');
      assert.equal(urls.resolveApp('/app4'), 'http://myhost:8080/tenant/app4/');
    })

  ];
});
