/**
 * @file livedata/LiveDataMessage.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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
var Model_1 = require('./Model');
var diag = require('../core/diag');
/**
 * message packed into a Model.
 *
 * @module Relution.LiveData.LiveDataMessage
 *
 * @type {*}
 */
var LiveDataMessageModel = (function (_super) {
    __extends(LiveDataMessageModel, _super);
    function LiveDataMessageModel() {
        _super.apply(this, arguments);
    }
    return LiveDataMessageModel;
}(Model_1.Model));
exports.LiveDataMessageModel = LiveDataMessageModel;
// mixins
var msgmodel = _.extend(LiveDataMessageModel.prototype, {
    _type: 'Relution.LiveData.LiveDataMessageModel',
    entity: '__msg__',
    idAttribute: '_id'
});
diag.debug.assert(function () { return LiveDataMessageModel.prototype.isPrototypeOf(Object.create(msgmodel)); });
diag.debug.assert(function () { return new LiveDataMessageModel({ _id: 'check' }).id === 'check'; });
//# sourceMappingURL=LiveDataMessage.js.map