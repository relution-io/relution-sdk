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
"use strict";
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
describe(module.filename, function () {
    return [
        it('isModel', function () {
            chai_1.assert.isFalse(Model_1.isModel(undefined));
            chai_1.assert.isFalse(Model_1.isModel(null));
            chai_1.assert.isFalse(Model_1.isModel(''));
            chai_1.assert.isFalse(Model_1.isModel(0));
            chai_1.assert.isFalse(Model_1.isModel(1));
            chai_1.assert.isFalse(Model_1.isModel({}));
            chai_1.assert.isFalse(Model_1.isModel([]));
            chai_1.assert.isFalse(Model_1.isModel(Model_1.Model));
            chai_1.assert.isTrue(Model_1.isModel(Model_1.Model.create(undefined)));
            chai_1.assert.isTrue(Model_1.isModel(Model_1.Model.extend(undefined).create(undefined)));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection.create(undefined)));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection.extend(undefined).create(undefined)));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store.create(undefined)));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store.extend(undefined).create(undefined)));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Model_1.Model);
            chai_1.assert.isDefined(Model_1.Model.design);
            chai_1.assert.isDefined(Model_1.Model.create);
            chai_1.assert.isDefined(Model_1.Model.extend);
            chai_1.assert.isFunction(Model_1.Model.design);
            chai_1.assert.isFunction(Model_1.Model.create);
            chai_1.assert.isFunction(Model_1.Model.extend);
            var instance = Model_1.Model.create(undefined);
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.LiveData.Model');
        }),
        it('creating model', function () {
            chai_1.assert.typeOf(Model_1.Model, 'function', 'Model is defined.');
            var Person = Model_1.Model.extend({
                idAttribute: 'id',
                defaults: { bmi: 0.0 },
                entity: 'person'
            });
            chai_1.assert.typeOf(Person, 'function', 'person model could be extended.');
            chai_1.assert.typeOf(Person.create(), 'object', 'empty person model could be created.');
            var p = Person.create({
                firstName: 'Max',
                sureName: 'Mustermann',
                notes: 'Notes to this person',
                address: { street: 'Leitzstraße', house_nr: 45, zip: '70469', city: 'Stuttgart' }
            });
            chai_1.assert.ok(typeof p === 'object', 'person record could be created.');
            chai_1.assert.ok(p.get('firstName') === 'Max', 'Field "firstName" is set.');
            chai_1.assert.ok(p.get('sureName') === 'Mustermann', 'Field "sureName" is set.');
            chai_1.assert.ok(p.get('bmi') === 0.0, 'Field "bmi" has correct default value.');
            chai_1.assert.ok(p.get('notes') === 'Notes to this person', 'Field "note" has correct value.');
            chai_1.assert.ok(typeof p.get('id') === 'undefined', 'Field "id" is undefined, as expected.');
            chai_1.assert.ok(p.get('address').street === 'Leitzstraße', 'Field "address" has correct value.');
        })
    ];
});
//# sourceMappingURL=Model.spec.js.map