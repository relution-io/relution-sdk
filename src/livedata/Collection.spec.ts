/**
 * @file livedata/Collection.spec.ts
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

import {Model} from './Model';
import {Collection, isCollection} from './Collection';
import {Store} from './Store';

var TEST: any = {};
TEST.url = (global['serverUrl'] || '') + '/relution/livedata/developers';
TEST.data = [
  {
    sureName: 'Laubach',
    firstName: 'Dominik',
    age: 27
  },
  {
    sureName: 'Hanowski',
    firstName: 'Marco',
    age: 27
  },
  {
    sureName: 'Stierle',
    firstName: 'Frank',
    age: 43
  },
  {
    sureName: 'Werler',
    firstName: 'Sebastian',
    age: 30
  },
  {
    sureName: 'Buck',
    firstName: 'Stefan',
    age: 26
  }
];

describe(module.filename || __filename, function() {
  return [

    it('isCollection', () => {
      assert.isFalse(isCollection(undefined));
      assert.isFalse(isCollection(null));
      assert.isFalse(isCollection(''));
      assert.isFalse(isCollection(0));
      assert.isFalse(isCollection(1));
      assert.isFalse(isCollection({}));
      assert.isFalse(isCollection([]));
      assert.isFalse(isCollection(Collection));
      assert.isFalse(isCollection(Model));
      assert.isFalse(isCollection(Store));
    }),

    it('basic', function () {
      assert.isDefined(Collection);
      assert.isFunction(Collection);

      var instance = new Collection();
      assert.isDefined(instance);
      assert.isObject(instance);
      assert.isDefined(instance._type);
      assert.isString(instance._type);
      assert.equal(instance._type, 'Relution.livedata.Collection');
    }),

    it('creating collection', function () {
      assert.typeOf(Collection, 'function', 'Collection is defined');

      class Developer extends Model {};
      Developer.prototype.idAttribute = '_id';
      Developer.prototype.entity = 'Developer';
      TEST.Developer = Developer;

      assert.ok(typeof TEST.Developer === 'function', 'Developer model successfully extended.');

      class DeveloperCollection extends Collection {};
      DeveloperCollection.prototype.url = TEST.url;
      DeveloperCollection.prototype.model = TEST.Developer;
      TEST.DeveloperCollection = DeveloperCollection;

      assert.ok(typeof TEST.DeveloperCollection === 'function', 'Developer collection successfully extended.');

      TEST.Developers = new TEST.DeveloperCollection();

      assert.ok(typeof TEST.Developers === 'object', 'Developer collection successfully created.');
    }),

    it('adding data', function () {
      TEST.Developers.add(TEST.data);

      assert.equal(TEST.Developers.length, 5, 'All records were added.');

      assert.equal(TEST.Developers.at(2).get('sureName'), TEST.data[2].sureName, 'sureName of 3. model has correct value');
      assert.equal(TEST.Developers.at(3).get('firstName'), TEST.data[3].firstName, 'firstName of 4. model has correct value');
      assert.equal(TEST.Developers.at(4).get('age'), TEST.data[4].age, 'age of 5. model has correct value');

      assert.ok(TEST.Developer.prototype.isPrototypeOf(TEST.Developers.at(0)), 'Records successfully converted to model records.');

    }),

    it('sorting data', function () {

      TEST.Developers.comparator = function (m1: Model, m2: Model) {
        return m2.get('age') - m1.get('age');
      };
      TEST.Developers.sort();

      var p2 = TEST.Developers.at(0);
      assert.ok(p2.get('sureName') === 'Stierle', 'Records correctly sorted by passed in sort function');

    }),

    it('filtering data', function () {
      // filter all devs older or equal to 26
      var a1 = TEST.Developers.filter(function (rec: Model) {
        return rec.get('age') >= 26;
      });

      assert.ok(a1.length === 5, 'Records successfully filtered. Everyone is 26 or older.');

      // filter all devs older than 26
      var a2 = TEST.Developers.filter(function (rec: Model) {
        return rec.get('age') > 26;
      });

      assert.ok(a2.length === 4, 'Records successfully filtered. One dev is younger than 27.');

    })

  ];
});
