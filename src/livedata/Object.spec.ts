/**
 * @file livedata/Model.spec.ts
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

import {_Object} from './Object';

describe(module.filename || __filename, function() {
  return [

    it('basic', () => {
      assert.isDefined(_Object);
      assert.isDefined(_Object.prototype._type);

      assert.isObject(_Object.prototype);
      assert.isString(_Object.prototype._type);
      assert.equal(_Object.prototype._type, 'Relution.LiveData._Object');
    }),

    it('methods', () => {
      assert.isDefined(_Object.prototype.bindToCaller);
      assert.isDefined(_Object.prototype.handleCallback);

      assert.isFunction(_Object.prototype.bindToCaller);
      assert.isFunction(_Object.prototype.handleCallback);
    })

  ];
});
