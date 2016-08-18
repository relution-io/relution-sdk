/*
 * @file core/q.spec.ts
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
"use strict";
var chai_1 = require('chai');
var Q = require('q');
describe(module.filename || __filename, function () {
    return [
        it('Q direct resolve', function (done) {
            Q.resolve(1).then(function (x) {
                chai_1.assert.equal(x, 1, 'one');
            }).then(done, done).done();
        }),
        it('Q indirect resolve', function (done) {
            Q.fcall(function () {
                return 1;
            }).then(function (x) {
                chai_1.assert.equal(x, 1, 'one');
            }).then(done, done).done();
        }),
        it('Q empty resolve', function (done) {
            Q.resolve(undefined).then(function (x) {
                chai_1.assert.equal(x, undefined, 'undefined');
            }).then(done, done).done();
        }),
        it('Q empty resolve all', function (done) {
            Q.all([]).then(function (x) {
                chai_1.assert.deepEqual(x, [], 'undefined');
            }).then(done, done).done();
        })
    ];
});
//# sourceMappingURL=q.spec.js.map