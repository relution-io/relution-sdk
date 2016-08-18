/*
 * @file core/init.spec.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 27.07.2016
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
"use strict";
var chai_1 = require('chai');
var Relution = require('./init');
describe(module.filename || __filename, function () {
    it('if serverUrl is incorrect', function () {
        var options = {
            serverUrl: 'ashdhasdasd/gsdvhasd',
            debug: false
        };
        return Relution.init(options)
            .then(function () {
            throw new Error('expected to fail!');
        })
            .catch(function (e) {
            chai_1.assert(e.message.indexOf(options.serverUrl) !== -1, "Url fails " + e.message);
            return true;
        });
    });
    it('if serverUrl is set', function () {
        var options = {
            serverUrl: 'https://mwaysolutions.com',
            debug: false
        };
        return Relution.init(options).then(function (info) {
            chai_1.assert(info, 'Url not fails');
            return true;
        });
    });
    it('if serverUrl is not set', function () {
        return Relution.init({ debug: false }).then(function (info) {
            chai_1.assert(info.platform.id !== undefined, "Platform has a id " + info.platform.id);
            return true;
        });
    });
});
//# sourceMappingURL=init.spec.js.map