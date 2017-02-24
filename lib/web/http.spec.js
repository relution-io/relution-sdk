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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaHR0cC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3dlYi9odHRwLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFJTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUNqQyxJQUFZLEdBQUcsV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUMvQixJQUFZLE9BQU8sV0FBTSxXQUFXLENBQUMsQ0FBQTtBQUNyQyxJQUFZLElBQUksV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUMvQixxQkFBb0IsY0FBYyxDQUFDLENBQUE7QUFFbkMsSUFBWSxRQUFRLFdBQU0sYUFBYSxDQUFDLENBQUE7QUFFeEMsd0VBQXdFO0FBQ3hFO0lBQUE7SUEyQkEsQ0FBQztJQTFCUyxrQ0FBYSxHQUFyQixVQUE4QixHQUFXLEVBQUUsS0FBYTtRQUN0RCxNQUFNLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUU7WUFDL0IsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7UUFDSCxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUVELHNCQUFXLGlDQUFTO2FBQXBCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUMxSSxDQUFDOzs7T0FBQTtJQUVELHNCQUFXLG1DQUFXO2FBQXRCO1lBQ0UsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFO2dCQUN2QyxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsSUFBSSxhQUFhO2dCQUMxRSxRQUFRLEVBQUUs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QUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIHdlYi9odHRwLnNwZWMudHNcclxuICogUmVsdXRpb24gU0RLXHJcbiAqXHJcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDAyLjA1LjIwMTZcclxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAbW9kdWxlIHdlYlxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5cclxuaW1wb3J0ICogYXMgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XHJcbmltcG9ydCAqIGFzIHdlYiBmcm9tICcuL2luZGV4JztcclxuaW1wb3J0ICogYXMgb2ZmbGluZSBmcm9tICcuL29mZmxpbmUnO1xyXG5pbXBvcnQgKiBhcyB1cmxzIGZyb20gJy4vdXJscyc7XHJcbmltcG9ydCB7ZGVidWd9IGZyb20gJy4uL2NvcmUvZGlhZyc7XHJcblxyXG5pbXBvcnQgKiBhcyBzZWN1cml0eSBmcm9tICcuLi9zZWN1cml0eSc7XHJcblxyXG4vLyBjb25uZWN0IHRvIHJlYWwgc2VydmVyIGZvciB0ZXN0aW5nIHB1cnBvc2VzLCB1c2VkIGJ5IGFsbCBvbmxpbmUgdGVzdHNcclxuZXhwb3J0IGNsYXNzIFRlc3RTZXJ2ZXIge1xyXG4gIHByaXZhdGUgcmVzZXRQcm9wZXJ0eTxWYWx1ZVQ+KGtleTogc3RyaW5nLCB2YWx1ZTogVmFsdWVUKTogVmFsdWVUIHtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBrZXksIHtcclxuICAgICAgdmFsdWU6IHZhbHVlXHJcbiAgICB9KTtcclxuICAgIHJldHVybiB2YWx1ZTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBnZXQgc2VydmVyVXJsKCk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gdGhpcy5yZXNldFByb3BlcnR5KCdzZXJ2ZXJVcmwnLCB1cmxzLnJlc29sdmVTZXJ2ZXIob2ZmbGluZS5sb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCd0ZXN0LnNlcnZlclVybCcpIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwODAnKSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0IGNyZWRlbnRpYWxzKCk6IHNlY3VyaXR5LkxvZ2luT2JqZWN0IHtcclxuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvcGVydHkoJ2NyZWRlbnRpYWxzJywge1xyXG4gICAgICB1c2VyTmFtZTogb2ZmbGluZS5sb2NhbFN0b3JhZ2UoKS5nZXRJdGVtKCd0ZXN0LnVzZXJOYW1lJykgfHwgJ3JlbHV0aW9uc2RrJyxcclxuICAgICAgcGFzc3dvcmQ6IG9mZmxpbmUubG9jYWxTdG9yYWdlKCkuZ2V0SXRlbSgndGVzdC5wYXNzd29yZCcpIHx8ICdyZWx1dGlvbnNkazEyMydcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdldCBsb2dpbigpOiBRLlByb21pc2U8d2ViLkxvZ2luUmVzcG9uc2U+IHtcclxuICAgIHJldHVybiB0aGlzLnJlc2V0UHJvcGVydHkoJ2xvZ2luJywgd2ViLmxvZ2luKHRoaXMuY3JlZGVudGlhbHMsIHtcclxuICAgICAgc2VydmVyVXJsOiB0aGlzLnNlcnZlclVybFxyXG4gICAgfSkuY2F0Y2goKGU6IEVycm9yKTogd2ViLkxvZ2luUmVzcG9uc2UgPT4ge1xyXG4gICAgICBlLm1lc3NhZ2UgKz0gJyAoJyArIHRoaXMuY3JlZGVudGlhbHMudXNlck5hbWUgKyAnIEAgJyArIHRoaXMuc2VydmVyVXJsICsgJyknO1xyXG4gICAgICB0aHJvdyBlO1xyXG4gICAgfSkpO1xyXG4gIH1cclxufVxyXG5leHBvcnQgY29uc3QgdGVzdFNlcnZlciA9IG5ldyBUZXN0U2VydmVyKCk7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnbG9naW4vbG9nb3V0JywgKGRvbmUpID0+IHtcclxuICAgICAgcmV0dXJuIHdlYi5sb2dpbih0ZXN0U2VydmVyLmNyZWRlbnRpYWxzLCB7XHJcbiAgICAgICAgc2VydmVyVXJsOiB0ZXN0U2VydmVyLnNlcnZlclVybFxyXG4gICAgICB9KS50aGVuKChsb2dpblJlc3ApID0+IHtcclxuICAgICAgICAvLyBsb2dnZWQgaW5cclxuICAgICAgICBhc3NlcnQubm90RXF1YWwoc2VjdXJpdHkuZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKSwgc2VjdXJpdHkuQU5PTllNT1VTX0FVVEhPUklaQVRJT04pO1xyXG4gICAgICAgIGNvbnN0IHVzZXIgPSBzZWN1cml0eS5nZXRDdXJyZW50VXNlcigpO1xyXG4gICAgICAgIGFzc2VydCghIXVzZXIpO1xyXG4gICAgICAgIGFzc2VydC5lcXVhbCh1c2VyLm5hbWUsIHRlc3RTZXJ2ZXIuY3JlZGVudGlhbHMudXNlck5hbWUpO1xyXG4gICAgICAgIHJldHVybiB3ZWIuZ2V0PHdlYi5Mb2dpblJlc3BvbnNlPignL2dvZmVyL3N5c3RlbS9zZWN1cml0eS9jdXJyZW50QXV0aG9yaXphdGlvbicpLnRoZW4oKGN1cnJlbnRBdXRoUmVzcCkgPT4ge1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGN1cnJlbnRBdXRoUmVzcC51c2VyLnV1aWQsIGxvZ2luUmVzcC51c2VyLnV1aWQpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKGN1cnJlbnRBdXRoUmVzcC5vcmdhbml6YXRpb24udXVpZCwgbG9naW5SZXNwLm9yZ2FuaXphdGlvbi51dWlkKTtcclxuICAgICAgICAgIHJldHVybiBjdXJyZW50QXV0aFJlc3A7XHJcbiAgICAgICAgfSkuZmluYWxseSgoKSA9PiB3ZWIubG9nb3V0KCkpLnRoZW4oKHJlc3BvbnNlKSA9PiB7XHJcbiAgICAgICAgICAvLyBsb2dnZWQgb3V0IGFnYWluXHJcbiAgICAgICAgICBhc3NlcnQuZXF1YWwoc2VjdXJpdHkuZ2V0Q3VycmVudEF1dGhvcml6YXRpb24oKSwgc2VjdXJpdHkuQU5PTllNT1VTX0FVVEhPUklaQVRJT04pO1xyXG4gICAgICAgICAgYXNzZXJ0KCFzZWN1cml0eS5nZXRDdXJyZW50VXNlcigpKTtcclxuICAgICAgICAgIHJldHVybiByZXNwb25zZTtcclxuICAgICAgICB9KTtcclxuICAgICAgfSkuZmluYWxseSgoKSA9PiB7XHJcbiAgICAgICAgLy8gZm9yY2VzIHJlbG9naW4gYWZ0ZXIgdGVzdCBleGVjdXRpb25cclxuICAgICAgICByZXR1cm4gZGVsZXRlIHRlc3RTZXJ2ZXIubG9naW47XHJcbiAgICAgIH0pLmRvbmUoKHJlc3VsdCkgPT4gZG9uZSgpLCAoZXJyb3IpID0+IGRvbmUoZXJyb3IpKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdjYWxsYmFjayBvcmRlcicsIChkb25lKSA9PiB7XHJcbiAgICAgIGxldCBzdGF0ZSA9IDA7XHJcbiAgICAgIHJldHVybiB3ZWIuZ2V0KHtcclxuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxyXG4gICAgICAgIHVybDogJy9nb2Zlci9zeXN0ZW0vc2VjdXJpdHkvY3VycmVudEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAgIHJlcXVlc3RDYWxsYmFjazogKHJlcXVlc3QpID0+IHtcclxuICAgICAgICAgIGRlYnVnLmRlYnVnKCdyZXF1ZXN0IGNhbGxiYWNrIGZpcmVkLicpO1xyXG4gICAgICAgICAgYXNzZXJ0LmVxdWFsKHN0YXRlKyssIDAsICdyZXF1ZXN0IG11c3QgYmUgcmVwb3J0ZWQgZmlyc3RseScpO1xyXG4gICAgICAgICAgcmV0dXJuIHJlcXVlc3Q7XHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNwb25zZUNhbGxiYWNrOiAocmVzcG9uc2UpID0+IHtcclxuICAgICAgICAgIGRlYnVnLmRlYnVnKCdyZXNwb25zZSBjYWxsYmFjayBmaXJlZC4nKTtcclxuICAgICAgICAgIGFzc2VydC5lcXVhbChzdGF0ZSsrLCAxLCAncmVzcG9uc2UgbXVzdCBiZSByZXBvcnRlZCBhZnRlciByZXF1ZXN0Jyk7XHJcbiAgICAgICAgICByZXR1cm4gcmVzcG9uc2U7XHJcbiAgICAgICAgfSxcclxuICAgICAgfSkudGhlbigocmVzdWx0KSA9PiB7XHJcbiAgICAgICAgZGVidWcuZGVidWcoJ2JvZHkgZGF0YSBmaXJlZC4nKTtcclxuICAgICAgICBhc3NlcnQuZXF1YWwoc3RhdGUrKywgMiwgJ2JvZHkgZGF0YSBtdXN0IGJlIHJlcG9ydGVkIGxhc3RseScpO1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgIH0pLmRvbmUoKHJlc3VsdCkgPT4gZG9uZSgpLCAoZXJyb3IpID0+IGRvbmUoZXJyb3IpKTtcclxuICAgIH0pXHJcblxyXG4gIF07XHJcbn0pO1xyXG4iXX0=