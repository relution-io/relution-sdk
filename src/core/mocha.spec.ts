/*
 * @file core/mocha.spec.ts
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
/**
 * @module core
 */
/** */

import {assert, expect} from 'chai';

describe(module.filename || __filename, function() {
  return [

    it('assert samples', () => {
      var x = {};
      // assert.valueOf(x, 'object', 'x is an object.');
      assert.isObject(x, 'x is an object.');
      assert.ok(<number>1 !== <number>2, '1 is not 2');
      assert.equal(-1, [1, 2, 3].indexOf(5));
      assert.equal(-1, [1, 2, 3].indexOf(0));
    }),

    it('expect samples', () => {
      var foo = 'bar'
      var beverages = {tea: ['chai', 'matcha', 'oolong']};
      expect(foo).to.be.a('string');
      expect(foo).to.equal('bar');
      expect(foo).to.have.length(3);
      expect(beverages).to.have.property('tea').with.length(3);
    })

  ];
});
