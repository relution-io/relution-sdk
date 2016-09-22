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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9odHRwLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFJTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUNqQyxJQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUNyQyxxQkFBb0IsY0FBYyxDQUFDLENBQUE7QUFFbkMsSUFBWSxRQUFRLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFFeEMsd0VBQXdFO0FBQ3hFO0lBQUE7SUEyQkEsQ0FBQztJQTFCUyxrQ0FBYSxHQUFyQixVQUE4QixHQUFXLEVBQUUsS0FBYTtRQUN0RCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELHNCQUFXLGlDQUFTO2FBQXBCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3RILENBQUM7OztPQUFBO0lBRUQsc0JBQVcsbUNBQVc7YUFBdEI7WUFDRSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLEVBQUU7Z0JBQ3ZDLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGFBQWE7Z0JBQzFFLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxJQUFJLGdCQUFnQjthQUM5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L2h0dHAuc3BlYy50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDIuMDUuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgd2ViXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XHJcblxyXG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcclxuaW1wb3J0ICogYXMgd2ViIGZyb20gJy4vaW5kZXgnO1xyXG5pbXBvcnQgKiBhcyBvZmZsaW5lIGZyb20gJy4vb2ZmbGluZSc7XHJcbmltcG9ydCB7ZGVidWd9IGZyb20gJy4uL2NvcmUvZGlhZyc7XHJcblxyXG5pbXBvcnQgKiBhcyBzZWN1cml0eSBmcm9tICcuLi9zZWN1cml0eSc7XHJcblxyXG4vLyBjb25uZWN0IHRvIHJlYWwgc2VydmVyIGZvciB0ZXN0aW5nIHB1cnBvc2VzLCB1c2VkIGJ5IGFsbCBvbmxpbmUgdGVzdHNcclxuZXhwb3J0IGNsYXNzIFRlc3RTZXJ2ZXIge1xyXG4gIHByaXZhdGUgcmVzZXRQcm9wZXJ0eTxWYWx1ZVQ+KGtleTogc3RyaW5nLCB2YWx1ZTogVmFsdWVUKTogVmFsdWVUIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBrZXksIHtcclxuICAgICAgdmFsdWU6IHZhbHVlXHJcbiAgICB9KTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXQgc2VydmVyVXJsKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdzZXJ2ZXJVcmwnLCBvZmZsaW5lLmxvY2FsU3RvcmFnZSgpLmdldEl0ZW0oJ3Rlc3Quc2VydmVyVXJsJykgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MCcpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldCBjcmVkZW50aWFscygpOiBzZWN1cml0eS5Mb2dpbk9iamVjdCB7XHJcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdjcmVkZW50aWFscycsIHtcclxuICAgICAgdXNlck5hbWU6IG9mZmxpbmUubG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSgndGVzdC51c2VyTmFtZScpIHx8ICdyZWx1dGlvbnNkaycsXHJcbiAgICAgIHBhc3N3b3JkOiBvZmZsaW5lLmxvY2FsU3RvcmFnZSgpLmdldEl0ZW0oJ3Rlc3QucGFzc3dvcmQnKSB8fCAncmVsdXRpb25zZGsxMjMnXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXQgbG9naW4oKTogUS5Qcm9taXNlPHdlYi5Mb2dpblJlc3BvbnNlPiB7XHJcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdsb2dpbicsIHdlYi5sb2dpbih0aGlzLmNyZWRlbnRpYWxzLCB7XHJcbiAgICAgIHNlcnZlclVybDogdGhpcy5zZXJ2ZXJVcmxcclxuICAgIH0pLmNhdGNoKChlOiBFcnJvcik6IHdlYi5Mb2dpblJlc3BvbnNlID0+IHtcclxuICAgICAgZS5tZXNzYWdlICs9ICcgKCcgKyB0aGlzLmNyZWRlbnRpYWxzLnVzZXJOYW1lICsgJyBAICcgKyB0aGlzLnNlcnZlclVybCArICcpJztcclxuICAgICAgdGhyb3cgZTtcclxuICAgIH0pKTtcclxuICB9XHJcbn1cclxuZXhwb3J0IGNvbnN0IHRlc3RTZXJ2ZXIgPSBuZXcgVGVzdFNlcnZlcigpO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ2xvZ2luL2xvZ291dCcsIChkb25lKSA9PiB7XHJcbiAgICAgIHJldHVybiB3ZWIubG9naW4odGVzdFNlcnZlci5jcmVkZW50aWFscywge1xyXG4gICAgICAgIHNlcnZlclVybDogdGVzdFNlcnZlci5zZXJ2ZXJVcmxcclxuICAgICAgfSkudGhlbigobG9naW5SZXNwKSA9PiB7XHJcbiAgICAgICAgLy8gbG9nZ2VkIGluXHJcbiAgICAgICAgYXNzZXJ0Lm5vdEVxdWFsKHNlY3VyaXR5LmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCksIHNlY3VyaXR5LkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OKTtcclxuICAgICAgICBjb25zdCB1c2VyID0gc2VjdXJpdHkuZ2V0Q3VycmVudFVzZXIoKTtcclxuICAgICAgICBhc3NlcnQoISF1c2VyKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwodXNlci5uYW1lLCB0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLnVzZXJOYW1lKTtcclxuICAgICAgICByZXR1cm4gd2ViLmdldDx3ZWIuTG9naW5SZXNwb25zZT4oJy9nb2Zlci9zeXN0ZW0vc2VjdXJpdHkvY3VycmVudEF1dGhvcml6YXRpb24nKS50aGVuKChjdXJyZW50QXV0aFJlc3ApID0+IHtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChjdXJyZW50QXV0aFJlc3AudXNlci51dWlkLCBsb2dpblJlc3AudXNlci51dWlkKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChjdXJyZW50QXV0aFJlc3Aub3JnYW5pemF0aW9uLnV1aWQsIGxvZ2luUmVzcC5vcmdhbml6YXRpb24udXVpZCk7XHJcbiAgICAgICAgICByZXR1cm4gY3VycmVudEF1dGhSZXNwO1xyXG4gICAgICAgIH0pLmZpbmFsbHkoKCkgPT4gd2ViLmxvZ291dCgpKS50aGVuKChyZXNwb25zZSkgPT4ge1xyXG4gICAgICAgICAgLy8gbG9nZ2VkIG91dCBhZ2FpblxyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHNlY3VyaXR5LmdldEN1cnJlbnRBdXRob3JpemF0aW9uKCksIHNlY3VyaXR5LkFOT05ZTU9VU19BVVRIT1JJWkFUSU9OKTtcclxuICAgICAgICAgIGFzc2VydCghc2VjdXJpdHkuZ2V0Q3VycmVudFVzZXIoKSk7XHJcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0pLmZpbmFsbHkoKCkgPT4ge1xyXG4gICAgICAgIC8vIGZvcmNlcyByZWxvZ2luIGFmdGVyIHRlc3QgZXhlY3V0aW9uXHJcbiAgICAgICAgcmV0dXJuIGRlbGV0ZSB0ZXN0U2VydmVyLmxvZ2luO1xyXG4gICAgICB9KS5kb25lKChyZXN1bHQpID0+IGRvbmUoKSwgKGVycm9yKSA9PiBkb25lKGVycm9yKSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY2FsbGJhY2sgb3JkZXInLCAoZG9uZSkgPT4ge1xyXG4gICAgICBsZXQgc3RhdGUgPSAwO1xyXG4gICAgICByZXR1cm4gd2ViLmdldCh7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0ZXN0U2VydmVyLnNlcnZlclVybCxcclxuICAgICAgICB1cmw6ICcvZ29mZXIvc3lzdGVtL3NlY3VyaXR5L2N1cnJlbnRBdXRob3JpemF0aW9uJyxcclxuICAgICAgICByZXF1ZXN0Q2FsbGJhY2s6IChyZXF1ZXN0KSA9PiB7XHJcbiAgICAgICAgICBkZWJ1Zy5kZWJ1ZygncmVxdWVzdCBjYWxsYmFjayBmaXJlZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAwLCAncmVxdWVzdCBtdXN0IGJlIHJlcG9ydGVkIGZpcnN0bHknKTtcclxuICAgICAgICAgIHJldHVybiByZXF1ZXN0O1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzcG9uc2VDYWxsYmFjazogKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICBkZWJ1Zy5kZWJ1ZygncmVzcG9uc2UgY2FsbGJhY2sgZmlyZWQuJyk7XHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdGUrKywgMSwgJ3Jlc3BvbnNlIG11c3QgYmUgcmVwb3J0ZWQgYWZ0ZXIgcmVxdWVzdCcpO1xyXG4gICAgICAgICAgcmV0dXJuIHJlc3BvbnNlO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLnRoZW4oKHJlc3VsdCkgPT4ge1xyXG4gICAgICAgIGRlYnVnLmRlYnVnKCdib2R5IGRhdGEgZmlyZWQuJyk7XHJcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXRlKyssIDIsICdib2R5IGRhdGEgbXVzdCBiZSByZXBvcnRlZCBsYXN0bHknKTtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICB9KS5kb25lKChyZXN1bHQpID0+IGRvbmUoKSwgKGVycm9yKSA9PiBkb25lKGVycm9yKSk7XHJcbiAgICB9KVxyXG5cclxuICBdO1xyXG59KTtcclxuIl19