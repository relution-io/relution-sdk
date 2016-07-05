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
var Object_1 = require('./Object');
describe(module.filename || __filename, function () {
    return [
        it('basic', function () {
            chai_1.assert.isDefined(Object_1._Object);
            chai_1.assert.isDefined(Object_1._Object.prototype._type);
            chai_1.assert.isObject(Object_1._Object.prototype);
            chai_1.assert.isString(Object_1._Object.prototype._type);
            chai_1.assert.equal(Object_1._Object.prototype._type, 'Relution.LiveData._Object');
        }),
        it('methods', function () {
            chai_1.assert.isDefined(Object_1._Object.prototype._create);
            chai_1.assert.isDefined(Object_1._Object.prototype.bindToCaller);
            chai_1.assert.isDefined(Object_1._Object.prototype.handleCallback);
            chai_1.assert.isFunction(Object_1._Object.prototype._create);
            chai_1.assert.isFunction(Object_1._Object.prototype.bindToCaller);
            chai_1.assert.isFunction(Object_1._Object.prototype.handleCallback);
        })
    ];
});
//# sourceMappingURL=Object.spec.js.map