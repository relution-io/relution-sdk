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

import {Model, isModel} from './Model';
import {Collection} from './Collection';
import {Store} from './Store';

describe(module.filename, () => {
  return [

    it('isModel', () => {
      assert.isFalse(isModel(undefined));
      assert.isFalse(isModel(null));
      assert.isFalse(isModel(''));
      assert.isFalse(isModel(0));
      assert.isFalse(isModel(1));
      assert.isFalse(isModel({}));
      assert.isFalse(isModel([]));
      assert.isFalse(isModel(Model));
      assert.isTrue(isModel(Model.create(undefined)));
      assert.isTrue(isModel(Model.extend(undefined).create(undefined)));
      assert.isFalse(isModel(Collection));
      assert.isFalse(isModel(Collection.create(undefined)));
      assert.isFalse(isModel(Collection.extend(undefined).create(undefined)));
      assert.isFalse(isModel(Store));
      assert.isFalse(isModel(Store.create(undefined)));
      assert.isFalse(isModel(Store.extend(undefined).create(undefined)));
    }),

    it('basic', function () {
      assert.isDefined(Model);
      assert.isDefined(Model.design);
      assert.isDefined(Model.create);
      assert.isDefined(Model.extend);

      assert.isFunction(Model.design);
      assert.isFunction(Model.create);
      assert.isFunction(Model.extend);

      var instance = Model.create(undefined);
      assert.isDefined(instance);
      assert.isObject(instance);
      assert.isDefined(instance._type);
      assert.isString(instance._type);
      assert.equal(instance._type, 'Relution.LiveData.Model');
    }),

    it('creating model', function () {
      assert.typeOf(Model, 'function', 'Model is defined.');
      var Person = Model.extend({
        idAttribute: 'id',
        defaults: {bmi: 0.0},
        entity: 'person'
      });
      assert.typeOf(Person, 'function', 'person model could be extended.');
      assert.typeOf(Person.create(), 'object', 'empty person model could be created.');

      var p = Person.create({
        firstName: 'Max',
        sureName: 'Mustermann',
        notes: 'Notes to this person',
        address: {street: 'Leitzstraße', house_nr: 45, zip: '70469', city: 'Stuttgart'}
      });
      assert.ok(typeof p === 'object', 'person record could be created.');
      assert.ok(p.get('firstName') === 'Max', 'Field "firstName" is set.');
      assert.ok(p.get('sureName') === 'Mustermann', 'Field "sureName" is set.');
      assert.ok(p.get('bmi') === 0.0, 'Field "bmi" has correct default value.');
      assert.ok(p.get('notes') === 'Notes to this person', 'Field "note" has correct value.');
      assert.ok(typeof p.get('id') === 'undefined', 'Field "id" is undefined, as expected.');
      assert.ok(p.get('address').street === 'Leitzstraße', 'Field "address" has correct value.');
    })

  ];
});
