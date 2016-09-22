/*
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
/**
 * @module core
 */
/** */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZy5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvZGlhZy5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFL0IsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxTQUFTLEVBQUU7WUFDWixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1lBQy9DLDhEQUE4RDtZQUM5RCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUM7WUFDN0MsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUN2RCxDQUFDLENBQUM7UUFFRixFQUFFLENBQUMsWUFBWSxFQUFFO1lBQ2YsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsY0FBTSxPQUFBLENBQUMsR0FBRyxDQUFDLEVBQUwsQ0FBSyxFQUFFLDBCQUEwQixDQUFDLENBQUM7WUFDM0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgY29yZS9kaWFnLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAzLjA1LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBjb3JlXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBkaWFnIGZyb20gJy4vZGlhZyc7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdsb2dnaW5nJywgKCkgPT4ge1xuICAgICAgZGlhZy5kZWJ1Zy5sb2coJ1RoaXMgaXMgYSBsb2cgbGV2ZWwgbWVzc2FnZS4nKTtcbiAgICAgIC8vIGRpYWcuZGVidWcudHJhY2UoJ1RyYWNlIG1lc3NhZ2Ugd2l0aCBsZW5ndGggc3RhY2sgdHJhY2UuJyk7XG4gICAgICBkaWFnLmRlYnVnLmRlYnVnKCdEZWJ1ZyBvdXRwdXQgb2YgYSB2YXJpYWJsZTonLCAxMCk7XG4gICAgICBkaWFnLmRlYnVnLmluZm8oJ0ZvciB5b3VyIGluZm9ybWF0aW9uLi4uJyk7XG4gICAgICBkaWFnLmRlYnVnLndhcm4oJ1RoaXMgc3R1ZmYgaXMgdW5kZXIgdGVzdC4nKTtcbiAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ1RoZSBlcnJvciBjYW4gYmUgaWdub3JlZCBzYWZlbHkuJyk7XG4gICAgfSksXG5cbiAgICBpdCgnYXNzZXJ0aW9ucycsICgpID0+IHtcbiAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IDEgPiAwLCAnb25lIGlzIGdyZWF0ZXIgdGhhbiB6ZXJvJyk7XG4gICAgICBkaWFnLmRlYnVnLmFzc2VydElzRXJyb3IobmV3IEVycm9yKCdzb21lIGVycm9yJykpO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19