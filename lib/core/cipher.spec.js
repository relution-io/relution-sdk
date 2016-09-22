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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lwaGVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29yZS9jaXBoZXIuc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBQ3ZCLElBQVksTUFBTSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRWpDLElBQVksTUFBTSxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBRW5DLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsNkJBQTZCLEVBQUU7WUFDaEMsSUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDO1lBQzdCLElBQU0sUUFBUSxHQUFHO2dCQUNmLENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBRSxDQUFDO2dCQUNKLENBQUMsRUFBTyxJQUFJO2FBQ2IsQ0FBQztZQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxhQUFhO2dCQUMvRCxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7WUFDckQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsWUFBWTtnQkFDbkIsTUFBTSxDQUFDLFNBQVMsQ0FBQyxZQUFZLEVBQUUsUUFBUSxFQUFFLDZCQUE2QixDQUFDLENBQUM7Z0JBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQywrQkFBK0IsRUFBRTtZQUNsQyxJQUFNLFFBQVEsR0FBRyxXQUFXLENBQUM7WUFDN0IsSUFBTSxRQUFRLEdBQUc7Z0JBQ2YsQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFFLENBQUM7Z0JBQ0osQ0FBQyxFQUFPLElBQUk7YUFDYixDQUFDO1lBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLGFBQWE7Z0JBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN4RCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ04sTUFBTSxDQUFDLEtBQUssRUFBRSxpREFBaUQsQ0FBQyxDQUFDO2dCQUNqRSxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ25DLENBQUMsRUFBRTtnQkFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsbUJBQW1CO1lBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLHlCQUF5QixFQUFFO1lBQzVCLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO2dCQUNYLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFFZixFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07b0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO29CQUN4RixNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNkLENBQUMsQ0FBQztnQkFFRixNQUFNLENBQUMsUUFBUSxDQUFDO29CQUNkLEtBQUssRUFBRSxTQUFTO2lCQUNqQixFQUFFLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU07b0JBQ3ZCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSw4Q0FBOEMsQ0FBQyxDQUFDO29CQUN4RixNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNkLENBQUMsQ0FBQztnQkFFRixNQUFNLENBQUMsUUFBUSxDQUFDO29CQUNkLEtBQUssRUFBRSxJQUFJO2lCQUNaLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTTtvQkFDdkIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLDhDQUE4QyxDQUFDLENBQUM7b0JBQzNGLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ2QsQ0FBQyxDQUFDO2FBRUgsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLHNCQUFzQixFQUFFO1lBQ3pCLG9GQUFvRjtZQUNwRixnREFBZ0Q7WUFDaEQsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7Z0JBQ1gsTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDZCxHQUFHLEVBQUUsYUFBYTtvQkFDbEIsR0FBRyxFQUFFLGFBQWE7b0JBQ2xCLENBQUMsRUFBRSxnQkFBZ0I7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxNQUFNLEVBQUUsT0FBTzt3QkFDZixNQUFNLEVBQUUsVUFBVTt3QkFDbEIsRUFBRSxFQUFFLEtBQUs7d0JBQ1QsTUFBTSxFQUFFLElBQUk7cUJBQ2I7aUJBQ0YsRUFBRSxRQUFRLENBQUM7Z0JBQ1osTUFBTSxDQUFDLFFBQVEsQ0FBQztvQkFDZCxHQUFHLEVBQUUsYUFBYTtvQkFDbEIsS0FBSyxFQUFFO3dCQUNMLEVBQUUsRUFBRSxLQUFLO3dCQUNULE1BQU0sRUFBRSxVQUFVO3dCQUNsQixNQUFNLEVBQUUsSUFBSTt3QkFDWixNQUFNLEVBQUUsT0FBTztxQkFDaEI7b0JBQ0QsQ0FBQyxFQUFFLGdCQUFnQjtvQkFDbkIsR0FBRyxFQUFFLGFBQWE7aUJBQ25CLEVBQUUsUUFBUSxDQUFDO2FBQ2IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDZCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUN2QyxNQUFNLENBQUMsS0FBSyxFQUFFLDJDQUEyQyxDQUFDLENBQUM7Z0JBQzNELE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxnQkFBZ0I7WUFDaEMsQ0FBQyxFQUFFO2dCQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyx3QkFBd0I7WUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSB3ZWIvY2lwaGVyLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAxLjA3LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlICdMaWNlbnNlJyk7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuICdBUyBJUycgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgY29yZVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcclxuXHJcbmltcG9ydCAqIGFzIGNpcGhlciBmcm9tICcuL2NpcGhlcic7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnZW5jcnlwdGlvbiBjb3JyZWN0IHBhc3N3b3JkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBwYXNzd29yZCA9ICd0ZXN0MTIzIyEnO1xyXG4gICAgICBjb25zdCBzb21lRGF0YSA9IHtcclxuICAgICAgICBhOiAxLFxyXG4gICAgICAgIGI6IDIsXHJcbiAgICAgICAgYzogPGFueT5udWxsXHJcbiAgICAgIH07XHJcbiAgICAgIHJldHVybiBjaXBoZXIuZW5jcnlwdEpzb24ocGFzc3dvcmQsIHNvbWVEYXRhKS50aGVuKChlbmNyeXB0ZWREYXRhKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIGNpcGhlci5kZWNyeXB0SnNvbihwYXNzd29yZCwgZW5jcnlwdGVkRGF0YSk7XHJcbiAgICAgIH0pLnRoZW4oKGRlY3J5dGVkRGF0YSkgPT4ge1xyXG4gICAgICAgIGFzc2VydC5kZWVwRXF1YWwoZGVjcnl0ZWREYXRhLCBzb21lRGF0YSwgJ2RlY3J5cHRpb24geWllbGRzIHNhbWUgZGF0YScpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdlbmNyeXB0aW9uIGluY29ycmVjdCBwYXNzd29yZCcsICgpID0+IHtcclxuICAgICAgY29uc3QgcGFzc3dvcmQgPSAndGVzdDEyMyMhJztcclxuICAgICAgY29uc3Qgc29tZURhdGEgPSB7XHJcbiAgICAgICAgYTogMSxcclxuICAgICAgICBiOiAyLFxyXG4gICAgICAgIGM6IDxhbnk+bnVsbFxyXG4gICAgICB9O1xyXG4gICAgICByZXR1cm4gY2lwaGVyLmVuY3J5cHRKc29uKHBhc3N3b3JkLCBzb21lRGF0YSkudGhlbigoZW5jcnlwdGVkRGF0YSkgPT4ge1xyXG4gICAgICAgIHJldHVybiBjaXBoZXIuZGVjcnlwdEpzb24oJ1Rlc3QxMjMjIScsIGVuY3J5cHRlZERhdGEpO1xyXG4gICAgICB9KS50aGVuKCgpOiBib29sZWFuID0+IHtcclxuICAgICAgICBhc3NlcnQoZmFsc2UsICdkZWNyeXB0aW9uIHN1Y2NlZWRlZCBhbHRob3VnaCBwYXNzd29yZHMgZGlmZmVyIScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbmV2ZXIgcmVhY2hlZCcpO1xyXG4gICAgICB9LCAoKSA9PiB7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7IC8vIGV4cGVjdGVkIGZhaWx1cmVcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnaGFzaCBuaWxseSBib3JkZXIgY2FzZXMnLCAoKSA9PiB7XHJcbiAgICAgIHJldHVybiBRLmFsbChbXHJcbiAgICAgICAgY2lwaGVyLmhhc2hKc29uKHtcclxuICAgICAgICAgIC8vIGVtcHR5XHJcbiAgICAgICAgfSwgJ3NoYTI1NicpLnRoZW4oKGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksICc0N0RFUXBqOEhCU2ErL1RJbVcrNUpDZXVRZVJrbTVOTXBKV1pHM2hTdUZVPScpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIGNpcGhlci5oYXNoSnNvbih7XHJcbiAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkXHJcbiAgICAgICAgfSwgJ3NoYTI1NicpLnRoZW4oKGJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksICc0N0RFUXBqOEhCU2ErL1RJbVcrNUpDZXVRZVJrbTVOTXBKV1pHM2hTdUZVPScpO1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSksXHJcblxyXG4gICAgICAgIGNpcGhlci5oYXNoSnNvbih7XHJcbiAgICAgICAgICB2YWx1ZTogbnVsbFxyXG4gICAgICAgIH0sICdzaGEyNTYnKS50aGVuKChidWZmZXIpID0+IHtcclxuICAgICAgICAgIGFzc2VydC5ub3RFcXVhbChidWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpLCAnNDdERVFwajhIQlNhKy9USW1XKzVKQ2V1UWVSa201Tk1wSldaRzNoU3VGVT0nKTtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICBdKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdoYXNoIG9yZGVyIGludmFyaWFudCcsICgpID0+IHtcclxuICAgICAgLy8gaWYgdGhlIGZvbGxvd2luZyBhY3R1YWxseSB0ZXN0cyBhbnl0aGluZyBkZXBlbmRzIG9uIHdoZXRoZXIgdGhlIEphdmFTY3JpcHQgZW5naW5lXHJcbiAgICAgIC8vIGVudW1lcmF0ZXMgcHJvcGVydGllcyBpbiBkZWNsYXJhdGlvbiBvcmRlci4uLlxyXG4gICAgICByZXR1cm4gUS5hbGwoW1xyXG4gICAgICAgIGNpcGhlci5oYXNoSnNvbih7XHJcbiAgICAgICAgICBhYmM6ICdqaGZlcGlvYXB3ZScsXHJcbiAgICAgICAgICBkZWY6ICdocTgzOXJldzQzMicsXHJcbiAgICAgICAgICAwOiAnamZpcmV3anRnZXJqd3AnLFxyXG4gICAgICAgICAgZ2ppcmU6IHtcclxuICAgICAgICAgICAgZ2hpb3JlOiA2Nzk1NDMyLFxyXG4gICAgICAgICAgICBwb3FlaXE6ICd0Z2RycWFnZScsXHJcbiAgICAgICAgICAgIDEyOiA4NDIzOSxcclxuICAgICAgICAgICAgZ3NkYWprOiAxOTQwXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSwgJ3NoYTI1NicpLFxyXG4gICAgICAgIGNpcGhlci5oYXNoSnNvbih7XHJcbiAgICAgICAgICBkZWY6ICdocTgzOXJldzQzMicsXHJcbiAgICAgICAgICBnamlyZToge1xyXG4gICAgICAgICAgICAxMjogODQyMzksXHJcbiAgICAgICAgICAgIHBvcWVpcTogJ3RnZHJxYWdlJyxcclxuICAgICAgICAgICAgZ3NkYWprOiAxOTQwLFxyXG4gICAgICAgICAgICBnaGlvcmU6IDY3OTU0MzJcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICAwOiAnamZpcmV3anRnZXJqd3AnLFxyXG4gICAgICAgICAgYWJjOiAnamhmZXBpb2Fwd2UnXHJcbiAgICAgICAgfSwgJ3NoYTI1NicpXHJcbiAgICAgIF0pLnNwcmVhZCgoYSwgYikgPT4ge1xyXG4gICAgICAgIGFzc2VydC5lcXVhbChhLnRvU3RyaW5nKCdiYXNlNjQnKSwgYi50b1N0cmluZygnYmFzZTY0JykpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICB9KTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdoYXNoIFEgbGlicmFyeScsICgpID0+IHtcclxuICAgICAgcmV0dXJuIGNpcGhlci5oYXNoSnNvbihRLCAnc2hhMjU2JykudGhlbigoKSA9PiB7XHJcbiAgICAgICAgYXNzZXJ0KGZhbHNlLCAnaGFzaGluZyBmdW5jdGlvbnMgc2hvdWxkIG5vdCByZWFsbHkgd29yayEnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7IC8vIG5ldmVyIHJlYWNoZWRcclxuICAgICAgfSwgKCkgPT4ge1xyXG4gICAgICAgIHJldHVybiB0cnVlOyAvLyBhYnNvbHV0ZWx5IGFjY2VwdGFibGVcclxuICAgICAgfSk7XHJcbiAgICB9KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19