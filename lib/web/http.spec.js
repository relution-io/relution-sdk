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
var urls = require('./urls');
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
            return this.resetProperty('serverUrl', urls.resolveServer(offline.localStorage().getItem('test.serverUrl') || 'http://localhost:8080'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9odHRwLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFJTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUNqQyxJQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUNyQyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixxQkFBb0IsY0FBYyxDQUFDLENBQUE7QUFFbkMsSUFBWSxRQUFRLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFFeEMsd0VBQXdFO0FBQ3hFO0lBQUE7SUEyQkEsQ0FBQztJQTFCUyxrQ0FBYSxHQUFyQixVQUE4QixHQUFXLEVBQUUsS0FBYTtRQUN0RCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELHNCQUFXLGlDQUFTO2FBQXBCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUMxSSxDQUFDOzs7T0FBQTtJQUVELHNCQUFXLG1DQUFXO2FBQXRCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFO2dCQUN2QyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxhQUFhO2dCQUMxRSxRQUFRLEVBQUUs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QUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSB3ZWIvaHR0cC5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMi4wNS4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgd2ViXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xuXG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcbmltcG9ydCAqIGFzIHdlYiBmcm9tICcuL2luZGV4JztcbmltcG9ydCAqIGFzIG9mZmxpbmUgZnJvbSAnLi9vZmZsaW5lJztcbmltcG9ydCAqIGFzIHVybHMgZnJvbSAnLi91cmxzJztcbmltcG9ydCB7ZGVidWd9IGZyb20gJy4uL2NvcmUvZGlhZyc7XG5cbmltcG9ydCAqIGFzIHNlY3VyaXR5IGZyb20gJy4uL3NlY3VyaXR5JztcblxuLy8gY29ubmVjdCB0byByZWFsIHNlcnZlciBmb3IgdGVzdGluZyBwdXJwb3NlcywgdXNlZCBieSBhbGwgb25saW5lIHRlc3RzXG5leHBvcnQgY2xhc3MgVGVzdFNlcnZlciB7XG4gIHByaXZhdGUgcmVzZXRQcm9wZXJ0eTxWYWx1ZVQ+KGtleTogc3RyaW5nLCB2YWx1ZTogVmFsdWVUKTogVmFsdWVUIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcywga2V5LCB7XG4gICAgICB2YWx1ZTogdmFsdWVcbiAgICB9KTtcbiAgICByZXR1cm4gdmFsdWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IHNlcnZlclVybCgpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvcGVydHkoJ3NlcnZlclVybCcsIHVybHMucmVzb2x2ZVNlcnZlcihvZmZsaW5lLmxvY2FsU3RvcmFnZSgpLmdldEl0ZW0oJ3Rlc3Quc2VydmVyVXJsJykgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcpKTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgY3JlZGVudGlhbHMoKTogc2VjdXJpdHkuTG9naW5PYmplY3Qge1xuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvcGVydHkoJ2NyZWRlbnRpYWxzJywge1xuICAgICAgdXNlck5hbWU6IG9mZmxpbmUubG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSgndGVzdC51c2VyTmFtZScpIHx8ICdyZWx1dGlvbnNkaycsXG4gICAgICBwYXNzd29yZDogb2ZmbGluZS5sb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCd0ZXN0LnBhc3N3b3JkJykgfHwgJ3JlbHV0aW9uc2RrMTIzJ1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGdldCBsb2dpbigpOiBRLlByb21pc2U8d2ViLkxvZ2luUmVzcG9uc2U+IHtcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdsb2dpbicsIHdlYi5sb2dpbih0aGlzLmNyZWRlbnRpYWxzLCB7XG4gICAgICBzZXJ2ZXJVcmw6IHRoaXMuc2VydmVyVXJsXG4gICAgfSkuY2F0Y2goKGU6IEVycm9yKTogd2ViLkxvZ2luUmVzcG9uc2UgPT4ge1xuICAgICAgZS5tZXNzYWdlICs9ICcgKCcgKyB0aGlzLmNyZWRlbnRpYWxzLnVzZXJOYW1lICsgJyBAICcgKyB0aGlzLnNlcnZlclVybCArICcpJztcbiAgICAgIHRocm93IGU7XG4gICAgfSkpO1xuICB9XG59XG5leHBvcnQgY29uc3QgdGVzdFNlcnZlciA9IG5ldyBUZXN0U2VydmVyKCk7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdsb2dpbi9sb2dvdXQnLCAoZG9uZSkgPT4ge1xuICAgICAgcmV0dXJuIHdlYi5sb2dpbih0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLCB7XG4gICAgICAgIHNlcnZlclVybDogdGVzdFNlcnZlci5zZXJ2ZXJVcmxcbiAgICAgIH0pLnRoZW4oKGxvZ2luUmVzcCkgPT4ge1xuICAgICAgICAvLyBsb2dnZWQgaW5cbiAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHNlY3VyaXR5LmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCksIHNlY3VyaXR5LkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OKTtcbiAgICAgICAgY29uc3QgdXNlciA9IHNlY3VyaXR5LmdldEN1cnJlbnRVc2VyKCk7XG4gICAgICAgIGFzc2VydCghIXVzZXIpO1xuICAgICAgICBhc3NlcnQuZXF1YWwodXNlci5uYW1lLCB0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLnVzZXJOYW1lKTtcbiAgICAgICAgcmV0dXJuIHdlYi5nZXQ8d2ViLkxvZ2luUmVzcG9uc2U+KCcvZ29mZXIvc3lzdGVtL3NlY3VyaXR5L2N1cnJlbnRBdXRob3JpemF0aW9uJykudGhlbigoY3VycmVudEF1dGhSZXNwKSA9PiB7XG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGN1cnJlbnRBdXRoUmVzcC51c2VyLnV1aWQsIGxvZ2luUmVzcC51c2VyLnV1aWQpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChjdXJyZW50QXV0aFJlc3Aub3JnYW5pemF0aW9uLnV1aWQsIGxvZ2luUmVzcC5vcmdhbml6YXRpb24udXVpZCk7XG4gICAgICAgICAgcmV0dXJuIGN1cnJlbnRBdXRoUmVzcDtcbiAgICAgICAgfSkuZmluYWxseSgoKSA9PiB3ZWIubG9nb3V0KCkpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgLy8gbG9nZ2VkIG91dCBhZ2FpblxuICAgICAgICAgIGFzc2VydC5lcXVhbChzZWN1cml0eS5nZXRDdXJyZW50QXV0aG9yaXphdGlvbigpLCBzZWN1cml0eS5BTk9OWU1PVVNfQVVUSE9SSVpBVElPTik7XG4gICAgICAgICAgYXNzZXJ0KCFzZWN1cml0eS5nZXRDdXJyZW50VXNlcigpKTtcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XG4gICAgICAgIH0pO1xuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XG4gICAgICAgIC8vIGZvcmNlcyByZWxvZ2luIGFmdGVyIHRlc3QgZXhlY3V0aW9uXG4gICAgICAgIHJldHVybiBkZWxldGUgdGVzdFNlcnZlci5sb2dpbjtcbiAgICAgIH0pLmRvbmUoKHJlc3VsdCkgPT4gZG9uZSgpLCAoZXJyb3IpID0+IGRvbmUoZXJyb3IpKTtcbiAgICB9KSxcblxuICAgIGl0KCdjYWxsYmFjayBvcmRlcicsIChkb25lKSA9PiB7XG4gICAgICBsZXQgc3RhdGUgPSAwO1xuICAgICAgcmV0dXJuIHdlYi5nZXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxuICAgICAgICB1cmw6ICcvZ29mZXIvc3lzdGVtL3NlY3VyaXR5L2N1cnJlbnRBdXRob3JpemF0aW9uJyxcbiAgICAgICAgcmVxdWVzdENhbGxiYWNrOiAocmVxdWVzdCkgPT4ge1xuICAgICAgICAgIGRlYnVnLmRlYnVnKCdyZXF1ZXN0IGNhbGxiYWNrIGZpcmVkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAwLCAncmVxdWVzdCBtdXN0IGJlIHJlcG9ydGVkIGZpcnN0bHknKTtcbiAgICAgICAgICByZXR1cm4gcmVxdWVzdDtcbiAgICAgICAgfSxcbiAgICAgICAgcmVzcG9uc2VDYWxsYmFjazogKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgZGVidWcuZGVidWcoJ3Jlc3BvbnNlIGNhbGxiYWNrIGZpcmVkLicpO1xuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAxLCAncmVzcG9uc2UgbXVzdCBiZSByZXBvcnRlZCBhZnRlciByZXF1ZXN0Jyk7XG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xuICAgICAgICB9LFxuICAgICAgfSkudGhlbigocmVzdWx0KSA9PiB7XG4gICAgICAgIGRlYnVnLmRlYnVnKCdib2R5IGRhdGEgZmlyZWQuJyk7XG4gICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAyLCAnYm9keSBkYXRhIG11c3QgYmUgcmVwb3J0ZWQgbGFzdGx5Jyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9KS5kb25lKChyZXN1bHQpID0+IGRvbmUoKSwgKGVycm9yKSA9PiBkb25lKGVycm9yKSk7XG4gICAgfSlcblxuICBdO1xufSk7XG4iXX0=