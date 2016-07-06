/**
 * @file core/q.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.06.2016
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

import {assert} from 'chai';

import * as Q from 'q';

describe(module.filename || __filename, function() {
  return [

    it('Q direct resolve', (done) => {
      Q.resolve(1).then((x) => {
        assert.equal(x, 1, 'one');
      }).then(done, done).done();
    }),

    it('Q indirect resolve', (done) => {
      Q.fcall(() => {
        return 1;
      }).then((x) => {
        assert.equal(x, 1, 'one');
      }).then(done, done).done();
    }),

    it('Q empty resolve', (done) => {
      Q.resolve(undefined).then((x) => {
        assert.equal(x, undefined, 'undefined');
      }).then(done, done).done();
    }),

    it('Q empty resolve all', (done) => {
      Q.all([]).then((x) => {
        assert.deepEqual(x, [], 'undefined');
      }).then(done, done).done();
    })

  ];
});
