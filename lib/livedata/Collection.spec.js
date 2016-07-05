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
var TEST = {};
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
describe(module.filename || __filename, function () {
    return [
        it('isCollection', function () {
            chai_1.assert.isFalse(Collection_1.isCollection(undefined));
            chai_1.assert.isFalse(Collection_1.isCollection(null));
            chai_1.assert.isFalse(Collection_1.isCollection(''));
            chai_1.assert.isFalse(Collection_1.isCollection(0));
            chai_1.assert.isFalse(Collection_1.isCollection(1));
            chai_1.assert.isFalse(Collection_1.isCollection({}));
            chai_1.assert.isFalse(Collection_1.isCollection([]));
            chai_1.assert.isFalse(Collection_1.isCollection(Collection_1.Collection));
            chai_1.assert.isTrue(Collection_1.isCollection(Collection_1.Collection._create(undefined)));
            chai_1.assert.isFalse(Collection_1.isCollection(Model_1.Model));
            chai_1.assert.isFalse(Collection_1.isCollection(Model_1.Model._create(undefined)));
            chai_1.assert.isFalse(Collection_1.isCollection(Store_1.Store));
            chai_1.assert.isFalse(Collection_1.isCollection(Store_1.Store._create(undefined)));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Collection_1.Collection);
            chai_1.assert.isDefined(Collection_1.Collection._create);
            chai_1.assert.isFunction(Collection_1.Collection);
            chai_1.assert.isFunction(Collection_1.Collection._create);
            var instance = Collection_1.Collection._create(undefined);
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.LiveData.Collection');
        }),
        it('creating collection', function () {
            chai_1.assert.typeOf(Collection_1.Collection, 'function', 'Collection is defined');
            var Developer = (function (_super) {
                __extends(Developer, _super);
                function Developer() {
                    _super.apply(this, arguments);
                }
                return Developer;
            }(Model_1.Model));
            ;
            Developer.prototype.idAttribute = '_id';
            Developer.prototype.entity = 'Developer';
            TEST.Developer = Developer;
            chai_1.assert.ok(typeof TEST.Developer === 'function', 'Developer model successfully extended.');
            var DeveloperCollection = (function (_super) {
                __extends(DeveloperCollection, _super);
                function DeveloperCollection() {
                    _super.apply(this, arguments);
                }
                return DeveloperCollection;
            }(Collection_1.Collection));
            ;
            DeveloperCollection.prototype.url = TEST.url;
            DeveloperCollection.prototype.model = TEST.Developer;
            TEST.DeveloperCollection = DeveloperCollection;
            chai_1.assert.ok(typeof TEST.DeveloperCollection === 'function', 'Developer collection successfully extended.');
            TEST.Developers = new TEST.DeveloperCollection();
            chai_1.assert.ok(typeof TEST.Developers === 'object', 'Developer collection successfully created.');
        }),
        it('adding data', function () {
            TEST.Developers.add(TEST.data);
            chai_1.assert.equal(TEST.Developers.length, 5, 'All records were added.');
            chai_1.assert.equal(TEST.Developers.at(2).get('sureName'), TEST.data[2].sureName, 'sureName of 3. model has correct value');
            chai_1.assert.equal(TEST.Developers.at(3).get('firstName'), TEST.data[3].firstName, 'firstName of 4. model has correct value');
            chai_1.assert.equal(TEST.Developers.at(4).get('age'), TEST.data[4].age, 'age of 5. model has correct value');
            chai_1.assert.ok(TEST.Developer.prototype.isPrototypeOf(TEST.Developers.at(0)), 'Records successfully converted to model records.');
        }),
        it('sorting data', function () {
            TEST.Developers.comparator = function (m1, m2) {
                return m2.get('age') - m1.get('age');
            };
            TEST.Developers.sort();
            var p2 = TEST.Developers.at(0);
            chai_1.assert.ok(p2.get('sureName') === 'Stierle', 'Records correctly sorted by passed in sort function');
        }),
        it('filtering data', function () {
            // filter all devs older or equal to 26
            var a1 = TEST.Developers.filter(function (rec) {
                return rec.get('age') >= 26;
            });
            chai_1.assert.ok(a1.length === 5, 'Records successfully filtered. Everyone is 26 or older.');
            // filter all devs older than 26
            var a2 = TEST.Developers.filter(function (rec) {
                return rec.get('age') > 26;
            });
            chai_1.assert.ok(a2.length === 4, 'Records successfully filtered. One dev is younger than 27.');
        })
    ];
});
//# sourceMappingURL=Collection.spec.js.map