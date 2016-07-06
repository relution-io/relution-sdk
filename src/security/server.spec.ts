/**
 * @file security/server.spec.ts
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

import * as assert from 'assert';

import * as core from '../core';
import * as server from './server';

describe(module.filename || __filename, function() {
  return [
    it('serverUrl', () => {
      core.init({
        serverUrl: 'http://47.11.28.13'
      });
      const serverA: server.Server = server.getCurrentServer();

      core.init({
        serverUrl: 'http://47.11.28.13/'
      });
      const serverB: server.Server = server.getCurrentServer();
      assert.strictEqual(serverB, serverA, 'http://47.11.28.13 === http://47.11.28.13/');

      core.init({
        serverUrl: 'http://47.11.28.12'
      });
      const serverC: server.Server = server.getCurrentServer();
      assert.notStrictEqual(serverC, serverA, 'http://47.11.28.12 !== http://47.11.28.13');

      core.init({
        serverUrl: 'http://47.11.28.13'
      });
      const serverD: server.Server = server.getCurrentServer();
      assert.strictEqual(serverD, serverA, 'http://47.11.28.13 === http://47.11.28.13');
    })
  ];
});
