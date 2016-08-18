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
"use strict";
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
describe(module.filename || __filename, function () {
    return [
        it('isStore', function () {
            chai_1.assert.isFalse(Store_1.isStore(undefined));
            chai_1.assert.isFalse(Store_1.isStore(null));
            chai_1.assert.isFalse(Store_1.isStore(''));
            chai_1.assert.isFalse(Store_1.isStore(0));
            chai_1.assert.isFalse(Store_1.isStore(1));
            chai_1.assert.isFalse(Store_1.isStore({}));
            chai_1.assert.isFalse(Store_1.isStore([]));
            chai_1.assert.isFalse(Store_1.isStore(Model_1.Model));
            chai_1.assert.isFalse(Store_1.isStore(new Model_1.Model()));
            chai_1.assert.isFalse(Store_1.isStore(Collection_1.Collection));
            chai_1.assert.isFalse(Store_1.isStore(new Collection_1.Collection()));
            chai_1.assert.isFalse(Store_1.isStore(Store_1.Store));
            chai_1.assert.isTrue(Store_1.isStore(new Store_1.Store()));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Store_1.Store);
            chai_1.assert.isFunction(Store_1.Store);
            var instance = new Store_1.Store();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Store');
        })
    ];
});
//# sourceMappingURL=Store.spec.js.map