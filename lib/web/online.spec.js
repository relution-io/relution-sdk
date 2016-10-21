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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib25saW5lLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2ViL29ubGluZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4sSUFBWSxDQUFDLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFNUIsSUFBWSxNQUFNLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDbkMsSUFBWSxJQUFJLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFHL0IsSUFBWSxNQUFNLFdBQU0sUUFBUSxDQUFDLENBQUE7QUFFakMsMEJBQTJCLGFBQWEsQ0FBQyxDQUFBO0FBRXpDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsZUFBZSxFQUFFO1lBQ2xCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxzQkFBVSxDQUFDLFNBQVM7Z0JBQy9CLEdBQUcsRUFBRSx1QkFBdUI7YUFDN0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFDLElBQUk7Z0JBQ1gsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNiLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLHNCQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDdEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsV0FBVztnQkFDbEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDO1lBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLHlCQUF5QixFQUFFO1lBQzVCLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLHVDQUF1QyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsSUFBSTtnQkFDakUsTUFBTSxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQztZQUN0RCxDQUFDLEVBQUUsVUFBQyxLQUFxQjtnQkFDdkIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLGtCQUFrQixDQUFDLENBQUM7Z0JBQy9ELE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO29CQUM1QixTQUFTLEVBQUUseUJBQXlCO2lCQUNyQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxXQUFXO2dCQUNsQixNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDckIsTUFBTSxDQUFDLFdBQVcsQ0FBQztZQUNyQixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztLQUVILENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSB3ZWIvb25saW5lLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDE0LjEwLjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlICdMaWNlbnNlJyk7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiAnQVMgSVMnIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHdlYlxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuXG5pbXBvcnQgKiBhcyBvbmxpbmUgZnJvbSAnLi9vbmxpbmUnO1xuaW1wb3J0ICogYXMgdmVyYiBmcm9tICcuL3ZlcmInO1xuaW1wb3J0ICogYXMgaHR0cCBmcm9tICcuL2h0dHAnO1xuXG5pbXBvcnQgKiBhcyBhc3NlcnQgZnJvbSAnYXNzZXJ0JztcblxuaW1wb3J0IHsgdGVzdFNlcnZlciB9IGZyb20gJy4vaHR0cC5zcGVjJztcblxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW1xuXG4gICAgaXQoJ29ubGluZSBzdGF0dXMnLCAoKSA9PiB7XG4gICAgICByZXR1cm4gdmVyYi5nZXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6IHRlc3RTZXJ2ZXIuc2VydmVyVXJsLFxuICAgICAgICB1cmw6ICcvZ29mZXIvZ3VpL2luZGV4Lmh0bWwnXG4gICAgICB9KS50aGVuKChyZXNwKSA9PiB7XG4gICAgICAgIGFzc2VydChyZXNwKTtcbiAgICAgICAgcmV0dXJuIG9ubGluZS5nZXRPbmxpbmVTdGF0dXModGVzdFNlcnZlci5zZXJ2ZXJVcmwpO1xuICAgICAgfSkudGhlbigoc2VydmVySW5mb3MpID0+IHtcbiAgICAgICAgYXNzZXJ0KCEhc2VydmVySW5mb3MpO1xuICAgICAgICBhc3NlcnQoXy5pc1N0cmluZyhzZXJ2ZXJJbmZvcy52ZXJzaW9uKSk7XG4gICAgICAgIGFzc2VydChfLmlzU3RyaW5nKHNlcnZlckluZm9zLmRlc2NyaXB0aW9uKSk7XG4gICAgICAgIHJldHVybiBzZXJ2ZXJJbmZvcztcbiAgICAgIH0pO1xuICAgIH0pLFxuXG4gICAgaXQoJ29ubGluZSBzdGF0dXMgbm8gYW5zd2VyJywgKCkgPT4ge1xuICAgICAgcmV0dXJuIHZlcmIuZ2V0KCdodHRwOi8vMTI3LjAuMC4xOjMyNzY3L2RvZXMtbm90LWV4aXN0JykudGhlbigocmVzcCkgPT4ge1xuICAgICAgICB0aHJvdyBuZXcgYXNzZXJ0LkFzc2VydGlvbkVycm9yKCd0aW1lb3V0IGV4cGVjdGVkJyk7XG4gICAgICB9LCAoZXJyb3I6IGh0dHAuSHR0cEVycm9yKSA9PiB7XG4gICAgICAgIGFzc2VydCghZXJyb3Iuc3RhdHVzQ29kZSwgZXJyb3IubWVzc2FnZSB8fCAndGltZW91dCBleHBlY3RlZCcpO1xuICAgICAgICByZXR1cm4gb25saW5lLmdldE9ubGluZVN0YXR1cyh7XG4gICAgICAgICAgc2VydmVyVXJsOiAnaHR0cDovLzEyNy4wLjAuMTozMjc2Ny8nXG4gICAgICAgIH0pO1xuICAgICAgfSkudGhlbigoc2VydmVySW5mb3MpID0+IHtcbiAgICAgICAgYXNzZXJ0KCFzZXJ2ZXJJbmZvcyk7XG4gICAgICAgIHJldHVybiBzZXJ2ZXJJbmZvcztcbiAgICAgIH0pO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19