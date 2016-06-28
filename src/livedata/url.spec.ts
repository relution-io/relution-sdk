/**
 * @file livedata/url.spec.ts
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

import * as URLUtil from './url';

describe(module.filename, () => {
  return [

    it('URLUtil', () => {
      assert.equal(URLUtil.hashCode('api/dataSync/Todo'), 1108439963);
      var a = URLUtil.getLocation('api/dataSync/Todo');
      assert.equal(typeof a, 'object');
      assert.equal(typeof a.host, 'string');
      assert.equal(typeof a.toString(), 'string');
      var url = URLUtil.resolveLocation('api/dataSync/Todo');
      assert.equal(typeof url, 'string');
      var hash = URLUtil.hashLocation('api/dataSync/Todo');
      assert.equal(typeof hash, 'number');
    })

  ];
});