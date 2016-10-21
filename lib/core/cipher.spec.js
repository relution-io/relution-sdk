/*
 * @file web/cipher.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.07.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @module core
 */
/** */
"use strict";
var Q = require('q');
var assert = require('assert');
var cipher = require('./cipher');
describe(module.filename || __filename, function () {
    return [
        it('encryption correct password', function () {
            var password = 'test123#!';
            var someData = {
                a: 1,
                b: 2,
                c: null
            };
            return cipher.encryptJson(password, someData).then(function (encryptedData) {
                return cipher.decryptJson(password, encryptedData);
            }).then(function (decrytedData) {
                assert.deepEqual(decrytedData, someData, 'decryption yields same data');
                return true;
            });
        }),
        it('encryption incorrect password', function () {
            var password = 'test123#!';
            var someData = {
                a: 1,
                b: 2,
                c: null
            };
            return cipher.encryptJson(password, someData).then(function (encryptedData) {
                return cipher.decryptJson('Test123#!', encryptedData);
            }).then(function () {
                assert(false, 'decryption succeeded although passwords differ!');
                throw new Error('never reached');
            }, function () {
                return true; // expected failure
            });
        }),
        it('hash nilly border cases', function () {
            return Q.all([
                cipher.hashJson({}, 'sha256').then(function (buffer) {
                    assert.equal(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
                    return true;
                }),
                cipher.hashJson({
                    value: undefined
                }, 'sha256').then(function (buffer) {
                    assert.equal(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
                    return true;
                }),
                cipher.hashJson({
                    value: null
                }, 'sha256').then(function (buffer) {
                    assert.notEqual(buffer.toString('base64'), '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=');
                    return true;
                })
            ]);
        }),
        it('hash order invariant', function () {
            // if the following actually tests anything depends on whether the JavaScript engine
            // enumerates properties in declaration order...
            return Q.all([
                cipher.hashJson({
                    abc: 'jhfepioapwe',
                    def: 'hq839rew432',
                    0: 'jfirewjtgerjwp',
                    gjire: {
                        ghiore: 6795432,
                        poqeiq: 'tgdrqage',
                        12: 84239,
                        gsdajk: 1940
                    }
                }, 'sha256'),
                cipher.hashJson({
                    def: 'hq839rew432',
                    gjire: {
                        12: 84239,
                        poqeiq: 'tgdrqage',
                        gsdajk: 1940,
                        ghiore: 6795432
                    },
                    0: 'jfirewjtgerjwp',
                    abc: 'jhfepioapwe'
                }, 'sha256')
            ]).spread(function (a, b) {
                assert.equal(a.toString('base64'), b.toString('base64'));
                return true;
            });
        }),
        it('hash Q library', function () {
            return cipher.hashJson(Q, 'sha256').then(function () {
                assert(false, 'hashing functions should not really work!');
                return false; // never reached
            }, function () {
                return true; // absolutely acceptable
            });
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lwaGVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29yZS9jaXBoZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLElBQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRWpDLElBQVksTUFBTSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBRW5DLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsNkJBQTZCLEVBQUU7WUFDaEMsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDO1lBQzdCLElBQU0sUUFBUSxHQUFHO2dCQUNmLENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBTyxJQUFJO2FBQ2IsQ0FBQztZQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxhQUFhO2dCQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsWUFBWTtnQkFDbkIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLDZCQUE2QixDQUFDLENBQUM7Z0JBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQywrQkFBK0IsRUFBRTtZQUNsQyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUM7WUFDN0IsSUFBTSxRQUFRLEdBQUc7Z0JBQ2YsQ0FBQyxFQUFFLENBQUM7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Q3pELE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUN2QyxNQUFNLENBQUMsS0FBSyxFQUFFLDJDQUEyQyxDQUFDLENBQUM7Z0JBQzNELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0I7WUFDaEMsQ0FBQyxFQUFFO2dCQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyx3QkFBd0I7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgd2ViL2NpcGhlci5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMS4wNy4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSAnTGljZW5zZScpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBjb3JlXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5cbmltcG9ydCAqIGFzIGNpcGhlciBmcm9tICcuL2NpcGhlcic7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdlbmNyeXB0aW9uIGNvcnJlY3QgcGFzc3dvcmQnLCAoKSA9PiB7XG4gICAgICBjb25zdCBwYXNzd29yZCA9ICd0ZXN0MTIzIyEnO1xuICAgICAgY29uc3Qgc29tZURhdGEgPSB7XG4gICAgICAgIGE6IDEsXG4gICAgICAgIGI6IDIsXG4gICAgICAgIGM6IDxhbnk+bnVsbFxuICAgICAgfTtcbiAgICAgIHJldHVybiBjaXBoZXIuZW5jcnlwdEpzb24ocGFzc3dvcmQsIHNvbWVEYXRhKS50aGVuKChlbmNyeXB0ZWREYXRhKSA9PiB7XG4gICAgICAgIHJldHVybiBjaXBoZXIuZGVjcnlwdEpzb24ocGFzc3dvcmQsIGVuY3J5cHRlZERhdGEpO1xuICAgICAgfSkudGhlbigoZGVjcnl0ZWREYXRhKSA9PiB7XG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZGVjcnl0ZWREYXRhLCBzb21lRGF0YSwgJ2RlY3J5cHRpb24geWllbGRzIHNhbWUgZGF0YScpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2VuY3J5cHRpb24gaW5jb3JyZWN0IHBhc3N3b3JkJywgKCkgPT4ge1xuICAgICAgY29uc3QgcGFzc3dvcmQgPSAndGVzdDEyMyMhJztcbiAgICAgIGNvbnN0IHNvbWVEYXRhID0ge1xuICAgICAgICBhOiAxLFxuICAgICAgICBiOiAyLFxuICAgICAgICBjOiA8YW55Pm51bGxcbiAgICAgIH07XG4gICAgICByZXR1cm4gY2lwaGVyLmVuY3J5cHRKc29uKHBhc3N3b3JkLCBzb21lRGF0YSkudGhlbigoZW5jcnlwdGVkRGF0YSkgPT4ge1xuICAgICAgICByZXR1cm4gY2lwaGVyLmRlY3J5cHRKc29uKCdUZXN0MTIzIyEnLCBlbmNyeXB0ZWREYXRhKTtcbiAgICAgIH0pLnRoZW4oKCk6IGJvb2xlYW4gPT4ge1xuICAgICAgICBhc3NlcnQoZmFsc2UsICdkZWNyeXB0aW9uIHN1Y2NlZWRlZCBhbHRob3VnaCBwYXNzd29yZHMgZGlmZmVyIScpO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ25ldmVyIHJlYWNoZWQnKTtcbiAgICAgIH0sICgpID0+IHtcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGV4cGVjdGVkIGZhaWx1cmVcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2hhc2ggbmlsbHkgYm9yZGVyIGNhc2VzJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIFEuYWxsKFtcbiAgICAgICAgY2lwaGVyLmhhc2hKc29uKHtcbiAgICAgICAgICAvLyBlbXB0eVxuICAgICAgICB9LCAnc2hhMjU2JykudGhlbigoYnVmZmVyKSA9PiB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksICc0N0RFUXBqOEhCU2ErL1RJbVcrNUpDZXVRZVJrbTVOTXBKV1pHM2hTdUZVPScpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KSxcblxuICAgICAgICBjaXBoZXIuaGFzaEpzb24oe1xuICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWRcbiAgICAgICAgfSwgJ3NoYTI1NicpLnRoZW4oKGJ1ZmZlcikgPT4ge1xuICAgICAgICAgIGFzc2VydC5lcXVhbChidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpLCAnNDdERVFwajhIQlNhKy9USW1XKzVKQ2V1UWVSa201Tk1wSldaRzNoU3VGVT0nKTtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSksXG5cbiAgICAgICAgY2lwaGVyLmhhc2hKc29uKHtcbiAgICAgICAgICB2YWx1ZTogbnVsbFxuICAgICAgICB9LCAnc2hhMjU2JykudGhlbigoYnVmZmVyKSA9PiB7XG4gICAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKGJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksICc0N0RFUXBqOEhCU2ErL1RJbVcrNUpDZXVRZVJrbTVOTXBKV1pHM2hTdUZVPScpO1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9KVxuXG4gICAgICBdKTtcbiAgICB9KSxcblxuICAgIGl0KCdoYXNoIG9yZGVyIGludmFyaWFudCcsICgpID0+IHtcbiAgICAgIC8vIGlmIHRoZSBmb2xsb3dpbmcgYWN0dWFsbHkgdGVzdHMgYW55dGhpbmcgZGVwZW5kcyBvbiB3aGV0aGVyIHRoZSBKYXZhU2NyaXB0IGVuZ2luZVxuICAgICAgLy8gZW51bWVyYXRlcyBwcm9wZXJ0aWVzIGluIGRlY2xhcmF0aW9uIG9yZGVyLi4uXG4gICAgICByZXR1cm4gUS5hbGwoW1xuICAgICAgICBjaXBoZXIuaGFzaEpzb24oe1xuICAgICAgICAgIGFiYzogJ2poZmVwaW9hcHdlJyxcbiAgICAgICAgICBkZWY6ICdocTgzOXJldzQzMicsXG4gICAgICAgICAgMDogJ2pmaXJld2p0Z2VyandwJyxcbiAgICAgICAgICBnamlyZToge1xuICAgICAgICAgICAgZ2hpb3JlOiA2Nzk1NDMyLFxuICAgICAgICAgICAgcG9xZWlxOiAndGdkcnFhZ2UnLFxuICAgICAgICAgICAgMTI6IDg0MjM5LFxuICAgICAgICAgICAgZ3NkYWprOiAxOTQwXG4gICAgICAgICAgfVxuICAgICAgICB9LCAnc2hhMjU2JyksXG4gICAgICAgIGNpcGhlci5oYXNoSnNvbih7XG4gICAgICAgICAgZGVmOiAnaHE4MzlyZXc0MzInLFxuICAgICAgICAgIGdqaXJlOiB7XG4gICAgICAgICAgICAxMjogODQyMzksXG4gICAgICAgICAgICBwb3FlaXE6ICd0Z2RycWFnZScsXG4gICAgICAgICAgICBnc2Rhams6IDE5NDAsXG4gICAgICAgICAgICBnaGlvcmU6IDY3OTU0MzJcbiAgICAgICAgICB9LFxuICAgICAgICAgIDA6ICdqZmlyZXdqdGdlcmp3cCcsXG4gICAgICAgICAgYWJjOiAnamhmZXBpb2Fwd2UnXG4gICAgICAgIH0sICdzaGEyNTYnKVxuICAgICAgXSkuc3ByZWFkKChhLCBiKSA9PiB7XG4gICAgICAgIGFzc2VydC5lcXVhbChhLnRvU3RyaW5nKCdiYXNlNjQnKSwgYi50b1N0cmluZygnYmFzZTY0JykpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ2hhc2ggUSBsaWJyYXJ5JywgKCkgPT4ge1xuICAgICAgcmV0dXJuIGNpcGhlci5oYXNoSnNvbihRLCAnc2hhMjU2JykudGhlbigoKSA9PiB7XG4gICAgICAgIGFzc2VydChmYWxzZSwgJ2hhc2hpbmcgZnVuY3Rpb25zIHNob3VsZCBub3QgcmVhbGx5IHdvcmshJyk7XG4gICAgICAgIHJldHVybiBmYWxzZTsgLy8gbmV2ZXIgcmVhY2hlZFxuICAgICAgfSwgKCkgPT4ge1xuICAgICAgICByZXR1cm4gdHJ1ZTsgLy8gYWJzb2x1dGVseSBhY2NlcHRhYmxlXG4gICAgICB9KTtcbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==