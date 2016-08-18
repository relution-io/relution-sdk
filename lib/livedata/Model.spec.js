/*
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
/**
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
describe(module.filename || __filename, function () {
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
            chai_1.assert.isTrue(Model_1.isModel(new Model_1.Model()));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection));
            chai_1.assert.isFalse(Model_1.isModel(new Collection_1.Collection()));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store));
            chai_1.assert.isFalse(Model_1.isModel(new Store_1.Store()));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Model_1.Model);
            chai_1.assert.isFunction(Model_1.Model);
            var instance = new Model_1.Model();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Model');
        }),
        it('creating model', function () {
            chai_1.assert.typeOf(Model_1.Model, 'function', 'Model is defined.');
            var Person = (function (_super) {
                __extends(Person, _super);
                function Person() {
                    _super.apply(this, arguments);
                }
                return Person;
            }(Model_1.Model));
            ;
            Person.prototype.idAttribute = 'id';
            Person.prototype.defaults = {
                bmi: 0.0
            };
            Person.prototype.entity = 'person';
            chai_1.assert.typeOf(Person, 'function', 'person model could be extended.');
            chai_1.assert.typeOf(new Person(), 'object', 'empty person model could be created.');
            var p = new Person({
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