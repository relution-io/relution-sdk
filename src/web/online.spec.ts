/*
 * @file web/online.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 14.10.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @module web
 */
/** */

import * as _ from 'lodash';

import * as online from './online';
import * as verb from './verb';
import * as http from './http';

import * as assert from 'assert';

import { testServer } from './http.spec';

describe(module.filename || __filename, function() {
  return [

    it('online status', () => {
      return verb.get({
        serverUrl: testServer.serverUrl,
        url: '/gofer/gui/index.html'
      }).then((resp) => {
        assert(resp);
        return online.getOnlineStatus(testServer.serverUrl);
      }).then((serverInfos) => {
        assert(!!serverInfos);
        assert(_.isString(serverInfos.version));
        assert(_.isString(serverInfos.description));
        return serverInfos;
      });
    }),

    it('online status no answer', () => {
      return verb.get('http://127.0.0.1:32767/does-not-exist').then((resp) => {
        throw new assert.AssertionError('timeout expected');
      }, (error: http.HttpError) => {
        assert(!error.statusCode, error.message || 'timeout expected');
        return online.getOnlineStatus({
          serverUrl: 'http://127.0.0.1:32767/'
        });
      }).then((serverInfos) => {
        assert(!serverInfos);
        return serverInfos;
      });
    })

  ];
});
