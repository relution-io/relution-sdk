/*
 * @file web/http.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 02.05.2016
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
 * @module web
 */
/** */
"use strict";
var assert = require('assert');
var web = require('./index');
var offline = require('./offline');
var diag_1 = require('../core/diag');
var security = require('../security');
// connect to real server for testing purposes, used by all online tests
var TestServer = (function () {
    function TestServer() {
    }
    TestServer.prototype.resetProperty = function (key, value) {
        Object.defineProperty(this, key, {
            value: value
        });
        return value;
    };
    Object.defineProperty(TestServer.prototype, "serverUrl", {
        get: function () {
            return this.resetProperty('serverUrl', offline.localStorage().getItem('test.serverUrl') || 'http://localhost:8080');
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestServer.prototype, "credentials", {
        get: function () {
            return this.resetProperty('credentials', {
                userName: offline.localStorage().getItem('test.userName') || 'relutionsdk',
                password: offline.localStorage().getItem('test.password') || 'relutionsdk123'
            });
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TestServer.prototype, "login", {
        get: function () {
            var _this = this;
            return this.resetProperty('login', web.login(this.credentials, {
                serverUrl: this.serverUrl
            }).catch(function (e) {
                e.message += ' (' + _this.credentials.userName + ' @ ' + _this.serverUrl + ')';
                throw e;
            }));
        },
        enumerable: true,
        configurable: true
    });
    return TestServer;
}());
exports.TestServer = TestServer;
exports.testServer = new TestServer();
describe(module.filename || __filename, function () {
    return [
        it('login/logout', function (done) {
            return web.login(exports.testServer.credentials, {
                serverUrl: exports.testServer.serverUrl
            }).then(function (loginResp) {
                // logged in
                assert.notEqual(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                var user = security.getCurrentUser();
                assert(!!user);
                assert.equal(user.name, exports.testServer.credentials.userName);
                return web.get('/gofer/system/security/currentAuthorization').then(function (currentAuthResp) {
                    assert.equal(currentAuthResp.user.uuid, loginResp.user.uuid);
                    assert.equal(currentAuthResp.organization.uuid, loginResp.organization.uuid);
                    return currentAuthResp;
                }).finally(function () { return web.logout(); }).then(function (response) {
                    // logged out again
                    assert.equal(security.getCurrentAuthorization(), security.ANONYMOUS_AUTHORIZATION);
                    assert(!security.getCurrentUser());
                    return response;
                });
            }).finally(function () {
                // forces relogin after test execution
                return delete exports.testServer.login;
            }).done(function (result) { return done(); }, function (error) { return done(error); });
        }),
        it('callback order', function (done) {
            var state = 0;
            return web.get({
                serverUrl: exports.testServer.serverUrl,
                url: '/gofer/system/security/currentAuthorization',
                requestCallback: function (request) {
                    diag_1.debug.debug('request callback fired.');
                    assert.equal(state++, 0, 'request must be reported firstly');
                    return request;
                },
                responseCallback: function (response) {
                    diag_1.debug.debug('response callback fired.');
                    assert.equal(state++, 1, 'response must be reported after request');
                    return response;
                },
            }).then(function (result) {
                diag_1.debug.debug('body data fired.');
                assert.equal(state++, 2, 'body data must be reported lastly');
                return result;
            }).done(function (result) { return done(); }, function (error) { return done(error); });
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9odHRwLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFJTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUNqQyxJQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUNyQyxxQkFBb0IsY0FBYyxDQUFDLENBQUE7QUFFbkMsSUFBWSxRQUFRLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFFeEMsd0VBQXdFO0FBQ3hFO0lBQUE7SUEyQkEsQ0FBQztJQTFCUyxrQ0FBYSxHQUFyQixVQUE4QixHQUFXLEVBQUUsS0FBYTtRQUN0RCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELHNCQUFXLGlDQUFTO2FBQXBCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RILENBQUM7OztPQUFBO0lBRUQsc0JBQVcsbUNBQVc7YUFBdEI7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3ZDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGFBQWE7Z0JBQzFFLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGdCQUFnQjthQUM5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dHRwLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAyLjA1LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSB3ZWJcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5cbmltcG9ydCAqIGFzIGFzc2VydCBmcm9tICdhc3NlcnQnO1xuaW1wb3J0ICogYXMgd2ViIGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0ICogYXMgb2ZmbGluZSBmcm9tICcuL29mZmxpbmUnO1xuaW1wb3J0IHtkZWJ1Z30gZnJvbSAnLi4vY29yZS9kaWFnJztcblxuaW1wb3J0ICogYXMgc2VjdXJpdHkgZnJvbSAnLi4vc2VjdXJpdHknO1xuXG4vLyBjb25uZWN0IHRvIHJlYWwgc2VydmVyIGZvciB0ZXN0aW5nIHB1cnBvc2VzLCB1c2VkIGJ5IGFsbCBvbmxpbmUgdGVzdHNcbmV4cG9ydCBjbGFzcyBUZXN0U2VydmVyIHtcbiAgcHJpdmF0ZSByZXNldFByb3BlcnR5PFZhbHVlVD4oa2V5OiBzdHJpbmcsIHZhbHVlOiBWYWx1ZVQpOiBWYWx1ZVQge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBrZXksIHtcbiAgICAgIHZhbHVlOiB2YWx1ZVxuICAgIH0pO1xuICAgIHJldHVybiB2YWx1ZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc2VydmVyVXJsKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucmVzZXRQcm9wZXJ0eSgnc2VydmVyVXJsJywgb2ZmbGluZS5sb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCd0ZXN0LnNlcnZlclVybCcpIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwODAnKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgY3JlZGVudGlhbHMoKTogc2VjdXJpdHkuTG9naW5PYmplY3Qge1xuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvcGVydHkoJ2NyZWRlbnRpYWxzJywge1xuICAgICAgdXNlck5hbWU6IG9mZmxpbmUubG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSgndGVzdC51c2VyTmFtZScpIHx8ICdyZWx1dGlvbnNkaycsXG4gICAgICBwYXNzd29yZDogb2ZmbGluZS5sb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCd0ZXN0LnBhc3N3b3JkJykgfHwgJ3JlbHV0aW9uc2RrMTIzJ1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGdldCBsb2dpbigpOiBRLlByb21pc2U8d2ViLkxvZ2luUmVzcG9uc2U+IHtcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdsb2dpbicsIHdlYi5sb2dpbih0aGlzLmNyZWRlbnRpYWxzLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkuY2F0Y2goKGU6IEVycm9yKTogd2ViLkxvZ2luUmVzcG9uc2UgPT4ge1xuICAgICAgZS5tZXNzYWdlICs9ICcgKCcgKyB0aGlzLmNyZWRlbnRpYWxzLnVzZXJOYW1lICsgJyBAICcgKyB0aGlzLnNlcnZlclVybCArICcpJztcbiAgICAgIHRocm93IGU7XG4gICAgfSkpO1xuICB9XG59XG5leHBvcnQgY29uc3QgdGVzdFNlcnZlciA9IG5ldyBUZXN0U2VydmVyKCk7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdsb2dpbi9sb2dvdXQnLCAoZG9uZSkgPT4ge1xuICAgICAgcmV0dXJuIHdlYi5sb2dpbih0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLCB7XG4gICAgICAgIHNlcnZlclVybDogdGVzdFNlcnZlci5zZXJ2ZXJVcmxcbiAgICAgIH0pLnRoZW4oKGxvZ2luUmVzcCkgPT4ge1xuICAgICAgICAvLyBsb2dnZWQgaW5cbiAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHNlY3VyaXR5LmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCksIHNlY3VyaXR5LkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OKTtcbiAgICAgICAgY29uc3QgdXNlciA9IHNlY3VyaXR5LmdldEN1cnJlbnRVc2VyKCk7XG4gICAgICAgIGFzc2VydCghIXVzZXIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodXNlci5uYW1lLCB0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLnVzZXJOYW1lKTtcbiAgICAgICAgcmV0dXJuIHdlYi5nZXQ8d2ViLkxvZ2luUmVzcG9uc2U+KCcvZ29mZXIvc3lzdGVtL3NlY3VyaXR5L2N1cnJlbnRBdXRob3JpemF0aW9uJykudGhlbigoY3VycmVudEF1dGhSZXNwKSA9PiB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGN1cnJlbnRBdXRoUmVzcC51c2VyLnV1aWQsIGxvZ2luUmVzcC51c2VyLnV1aWQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChjdXJyZW50QXV0aFJlc3Aub3JnYW5pemF0aW9uLnV1aWQsIGxvZ2luUmVzcC5vcmdhbml6YXRpb24udXVpZCk7XG4gICAgICAgICAgcmV0dXJuIGN1cnJlbnRBdXRoUmVzcDtcbiAgICAgICAgfSkuZmluYWxseSgoKSA9PiB3ZWIubG9nb3V0KCkpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgLy8gbG9nZ2VkIG91dCBhZ2FpblxuICAgICAgICAgIGFzc2VydC5lcXVhbChzZWN1cml0eS5nZXRDdXJyZW50QXV0aG9yaXphdGlvbigpLCBzZWN1cml0eS5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTik7XG4gICAgICAgICAgYXNzZXJ0KCFzZWN1cml0eS5nZXRDdXJyZW50VXNlcigpKTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgIH0pO1xuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIC8vIGZvcmNlcyByZWxvZ2luIGFmdGVyIHRlc3QgZXhlY3V0aW9uXG4gICAgICAgIHJldHVybiBkZWxldGUgdGVzdFNlcnZlci5sb2dpbjtcbiAgICAgIH0pLmRvbmUoKHJlc3VsdCkgPT4gZG9uZSgpLCAoZXJyb3IpID0+IGRvbmUoZXJyb3IpKTtcbiAgICB9KSxcblxuICAgIGl0KCdjYWxsYmFjayBvcmRlcicsIChkb25lKSA9PiB7XG4gICAgICBsZXQgc3RhdGUgPSAwO1xuICAgICAgcmV0dXJuIHdlYi5nZXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxuICAgICAgICB1cmw6ICcvZ29mZXIvc3lzdGVtL3NlY3VyaXR5L2N1cnJlbnRBdXRob3JpemF0aW9uJyxcbiAgICAgICAgcmVxdWVzdENhbGxiYWNrOiAocmVxdWVzdCkgPT4ge1xuICAgICAgICAgIGRlYnVnLmRlYnVnKCdyZXF1ZXN0IGNhbGxiYWNrIGZpcmVkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAwLCAncmVxdWVzdCBtdXN0IGJlIHJlcG9ydGVkIGZpcnN0bHknKTtcbiAgICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2VDYWxsYmFjazogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgZGVidWcuZGVidWcoJ3Jlc3BvbnNlIGNhbGxiYWNrIGZpcmVkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAxLCAncmVzcG9uc2UgbXVzdCBiZSByZXBvcnRlZCBhZnRlciByZXF1ZXN0Jyk7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICB9LFxuICAgICAgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGRlYnVnLmRlYnVnKCdib2R5IGRhdGEgZmlyZWQuJyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAyLCAnYm9keSBkYXRhIG11c3QgYmUgcmVwb3J0ZWQgbGFzdGx5Jyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KS5kb25lKChyZXN1bHQpID0+IGRvbmUoKSwgKGVycm9yKSA9PiBkb25lKGVycm9yKSk7XG4gICAgfSlcblxuICBdO1xufSk7XG4iXX0=