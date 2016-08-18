/*
 * @file livedata/SyncEndpoint.spec.ts
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
var chai_1 = require('chai');
var SyncEndpoint_1 = require('./SyncEndpoint');
var Model_1 = require('./Model');
describe(module.filename || __filename, function () {
    return [
        it('hashing', function () {
            chai_1.assert.equal(SyncEndpoint_1.hashCode('api/dataSync/Todo'), 1108439963);
        }),
        it('creation', function () {
            var syncEndpoint = new SyncEndpoint_1.SyncEndpoint({
                entity: 'todo',
                modelType: Model_1.Model,
                urlRoot: 'https://127.0.0.1/api/dataSync/Todo',
                socketPath: '/api/dataSync/Todo/live',
                userUuid: '1249bb40-41ca-11e6-bdf4-0800200c9a66'
            });
            chai_1.assert.equal(syncEndpoint.host, 'https://127.0.0.1:443');
            chai_1.assert.equal(syncEndpoint.channel, '1249bb40-41ca-11e6-bdf4-0800200c9a66/todo/' +
                SyncEndpoint_1.hashCode('https://127.0.0.1:443'));
        })
    ];
});
//# sourceMappingURL=SyncEndpoint.spec.js.map