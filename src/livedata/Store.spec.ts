/*
 * @file livedata/Store.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 05.07.2016
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
 * @module livedata
 */
/** */

import {assert} from 'chai';

import {Model} from './Model';
import {Collection} from './Collection';
import {Store, isStore} from './Store';

describe(module.filename || __filename, function() {
  return [

    it('isStore', () => {
      assert.isFalse(isStore(undefined));
      assert.isFalse(isStore(null));
      assert.isFalse(isStore(''));
      assert.isFalse(isStore(0));
      assert.isFalse(isStore(1));
      assert.isFalse(isStore({}));
      assert.isFalse(isStore([]));
      assert.isFalse(isStore(Model));
      assert.isFalse(isStore(new Model()));
      assert.isFalse(isStore(Collection));
      assert.isFalse(isStore(new Collection()));
      assert.isFalse(isStore(Store));
      assert.isTrue(isStore(new Store()));
    }),

    it('basic', function () {
      assert.isDefined(Store);
      assert.isFunction(Store);

      var instance = new Store();
      assert.isDefined(instance);
      assert.isObject(instance);
      assert.isDefined(instance._type);
      assert.isString(instance._type);
      assert.equal(instance._type, 'Relution.livedata.Store');
    })

  ];
});
