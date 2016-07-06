/**
 * @file core/diag.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 03.05.2016
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
var diag = require('./diag');
describe(module.filename || __filename, function () {
    return [
        it('logging', function () {
            diag.debug.log('This is a log level message.');
            // diag.debug.trace('Trace message with length stack trace.');
            diag.debug.debug('Debug output of a variable:', 10);
            diag.debug.info('For your information...');
            diag.debug.warn('This stuff is under test.');
            diag.debug.error('The error can be ignored safely.');
        }),
        it('assertions', function () {
            diag.debug.assert(function () { return 1 > 0; }, 'one is greater than zero');
            diag.debug.assertIsError(new Error('some error'));
        })
    ];
});
//# sourceMappingURL=diag.spec.js.map