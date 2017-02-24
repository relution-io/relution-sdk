/*
 * @file web/online.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 14.10.2016
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
 * @module web
 */
/** */
"use strict";
var _ = require('lodash');
var online = require('./online');
var verb = require('./verb');
var assert = require('assert');
var http_spec_1 = require('./http.spec');
describe(module.filename || __filename, function () {
    return [
        it('online status', function () {
            return verb.get({
                serverUrl: http_spec_1.testServer.serverUrl,
                url: '/gofer/gui/index.html'
            }).then(function (resp) {
                assert(resp);
                return online.getOnlineStatus(http_spec_1.testServer.serverUrl);
            }).then(function (serverInfos) {
                assert(!!serverInfos);
                assert(_.isString(serverInfos.version));
                assert(_.isString(serverInfos.description));
                return serverInfos;
            });
        }),
        it('online status no answer', function () {
            return verb.get('http://127.0.0.1:32767/does-not-exist').then(function (resp) {
                throw new assert.AssertionError('timeout expected');
            }, function (error) {
                assert(!error.statusCode, error.message || 'timeout expected');
                return online.getOnlineStatus({
                    serverUrl: 'http://127.0.0.1:32767/'
                });
            }).then(function (serverInfos) {
                assert(!serverInfos);
                return serverInfos;
            });
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25saW5lLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2ViL29ubGluZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxNQUFNLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDbkMsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFHL0IsSUFBWSxNQUFNLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFakMsMEJBQTJCLGFBQWEsQ0FBQyxDQUFBO0FBRXpDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsZUFBZSxFQUFFO1lBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxzQkFBVSxDQUFDLFNBQVM7Z0JBQy9CLEdBQUcsRUFBRSx1QkFBdUI7YUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7Z0JBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNiLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNCQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsV0FBVztnQkFDbEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLHlCQUF5QixFQUFFO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDakUsTUFBTSxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUN0RCxDQUFDLEVBQUUsVUFBQyxLQUFxQjtnQkFDdkIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLGtCQUFrQixDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO29CQUM1QixTQUFTLEVBQUUseUJBQXlCO2lCQUNyQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxXQUFXO2dCQUNsQixNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUNyQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIHdlYi9vbmxpbmUuc3BlYy50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMTQuMTAuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgJ0xpY2Vuc2UnKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gJ0FTIElTJyBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSB3ZWJcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5cclxuaW1wb3J0ICogYXMgb25saW5lIGZyb20gJy4vb25saW5lJztcclxuaW1wb3J0ICogYXMgdmVyYiBmcm9tICcuL3ZlcmInO1xyXG5pbXBvcnQgKiBhcyBodHRwIGZyb20gJy4vaHR0cCc7XHJcblxyXG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcclxuXHJcbmltcG9ydCB7IHRlc3RTZXJ2ZXIgfSBmcm9tICcuL2h0dHAuc3BlYyc7XHJcblxyXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XHJcbiAgcmV0dXJuIFtcclxuXHJcbiAgICBpdCgnb25saW5lIHN0YXR1cycsICgpID0+IHtcclxuICAgICAgcmV0dXJuIHZlcmIuZ2V0KHtcclxuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxyXG4gICAgICAgIHVybDogJy9nb2Zlci9ndWkvaW5kZXguaHRtbCdcclxuICAgICAgfSkudGhlbigocmVzcCkgPT4ge1xyXG4gICAgICAgIGFzc2VydChyZXNwKTtcclxuICAgICAgICByZXR1cm4gb25saW5lLmdldE9ubGluZVN0YXR1cyh0ZXN0U2VydmVyLnNlcnZlclVybCk7XHJcbiAgICAgIH0pLnRoZW4oKHNlcnZlckluZm9zKSA9PiB7XHJcbiAgICAgICAgYXNzZXJ0KCEhc2VydmVySW5mb3MpO1xyXG4gICAgICAgIGFzc2VydChfLmlzU3RyaW5nKHNlcnZlckluZm9zLnZlcnNpb24pKTtcclxuICAgICAgICBhc3NlcnQoXy5pc1N0cmluZyhzZXJ2ZXJJbmZvcy5kZXNjcmlwdGlvbikpO1xyXG4gICAgICAgIHJldHVybiBzZXJ2ZXJJbmZvcztcclxuICAgICAgfSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnb25saW5lIHN0YXR1cyBubyBhbnN3ZXInLCAoKSA9PiB7XHJcbiAgICAgIHJldHVybiB2ZXJiLmdldCgnaHR0cDovLzEyNy4wLjAuMTozMjc2Ny9kb2VzLW5vdC1leGlzdCcpLnRoZW4oKHJlc3ApID0+IHtcclxuICAgICAgICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKCd0aW1lb3V0IGV4cGVjdGVkJyk7XHJcbiAgICAgIH0sIChlcnJvcjogaHR0cC5IdHRwRXJyb3IpID0+IHtcclxuICAgICAgICBhc3NlcnQoIWVycm9yLnN0YXR1c0NvZGUsIGVycm9yLm1lc3NhZ2UgfHwgJ3RpbWVvdXQgZXhwZWN0ZWQnKTtcclxuICAgICAgICByZXR1cm4gb25saW5lLmdldE9ubGluZVN0YXR1cyh7XHJcbiAgICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vMTI3LjAuMC4xOjMyNzY3LydcclxuICAgICAgICB9KTtcclxuICAgICAgfSkudGhlbigoc2VydmVySW5mb3MpID0+IHtcclxuICAgICAgICBhc3NlcnQoIXNlcnZlckluZm9zKTtcclxuICAgICAgICByZXR1cm4gc2VydmVySW5mb3M7XHJcbiAgICAgIH0pO1xyXG4gICAgfSlcclxuXHJcbiAgXTtcclxufSk7XHJcbiJdfQ==