/*
 * @file security/server.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
 * @module security
 */
/** */
"use strict";
var assert = require('assert');
var core = require('../core');
var server = require('./server');
describe(module.filename || __filename, function () {
    return [
        it('serverUrl', function () {
            core.init({
                serverUrl: 'http://47.11.28.13'
            });
            var serverA = server.getCurrentServer();
            core.init({
                serverUrl: 'http://47.11.28.13/'
            });
            var serverB = server.getCurrentServer();
            assert.strictEqual(serverB, serverA, 'http://47.11.28.13 === http://47.11.28.13/');
            core.init({
                serverUrl: 'http://47.11.28.12'
            });
            var serverC = server.getCurrentServer();
            assert.notStrictEqual(serverC, serverA, 'http://47.11.28.12 !== http://47.11.28.13');
            core.init({
                serverUrl: 'http://47.11.28.13'
            });
            var serverD = server.getCurrentServer();
            assert.strictEqual(serverD, serverA, 'http://47.11.28.13 === http://47.11.28.13');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VjdXJpdHkvc2VydmVyLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixJQUFZLE1BQU0sV0FBTSxRQUFRLENBQUMsQ0FBQTtBQUVqQyxJQUFZLElBQUksV0FBTSxTQUFTLENBQUMsQ0FBQTtBQUNoQyxJQUFZLE1BQU0sV0FBTSxVQUFVLENBQUMsQ0FBQTtBQUVuQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsTUFBTSxDQUFDO1FBQ0wsRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUNkLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsU0FBUyxFQUFFLG9CQUFvQjthQUNoQyxDQUFDLENBQUM7WUFDSCxJQUFNLE9BQU8sR0FBa0IsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFFekQsSUFBSSxDQUFDLElBQUksQ0FBQztnQkFDUixTQUFTLEVBQUUscUJBQXFCO2FBQ2pDLENBQUMsQ0FBQztZQUNILElBQU0sT0FBTyxHQUFrQixNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN6RCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsNENBQTRDLENBQUMsQ0FBQztZQUVuRixJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUNSLFNBQVMsRUFBRSxvQkFBb0I7YUFDaEMsQ0FBQyxDQUFDO1lBQ0gsSUFBTSxPQUFPLEdBQWtCLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3pELE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSwyQ0FBMkMsQ0FBQyxDQUFDO1lBRXJGLElBQUksQ0FBQyxJQUFJLENBQUM7Z0JBQ1IsU0FBUyxFQUFFLG9CQUFvQjthQUNoQyxDQUFDLENBQUM7WUFDSCxJQUFNLE9BQU8sR0FBa0IsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDekQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLDJDQUEyQyxDQUFDLENBQUM7UUFDcEYsQ0FBQyxDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHNlY3VyaXR5L3NlcnZlci5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgc2VjdXJpdHlcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIGFzc2VydCBmcm9tICdhc3NlcnQnO1xuXG5pbXBvcnQgKiBhcyBjb3JlIGZyb20gJy4uL2NvcmUnO1xuaW1wb3J0ICogYXMgc2VydmVyIGZyb20gJy4vc2VydmVyJztcblxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW1xuICAgIGl0KCdzZXJ2ZXJVcmwnLCAoKSA9PiB7XG4gICAgICBjb3JlLmluaXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vNDcuMTEuMjguMTMnXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHNlcnZlckE6IHNlcnZlci5TZXJ2ZXIgPSBzZXJ2ZXIuZ2V0Q3VycmVudFNlcnZlcigpO1xuXG4gICAgICBjb3JlLmluaXQoe1xuICAgICAgICBzZXJ2ZXJVcmw6ICdodHRwOi8vNDcuMTEuMjguMTMvJ1xuICAgICAgfSk7XG4gICAgICBjb25zdCBzZXJ2ZXJCOiBzZXJ2ZXIuU2VydmVyID0gc2VydmVyLmdldEN1cnJlbnRTZXJ2ZXIoKTtcbiAgICAgIGFzc2VydC5zdHJpY3RFcXVhbChzZXJ2ZXJCLCBzZXJ2ZXJBLCAnaHR0cDovLzQ3LjExLjI4LjEzID09PSBodHRwOi8vNDcuMTEuMjguMTMvJyk7XG5cbiAgICAgIGNvcmUuaW5pdCh7XG4gICAgICAgIHNlcnZlclVybDogJ2h0dHA6Ly80Ny4xMS4yOC4xMidcbiAgICAgIH0pO1xuICAgICAgY29uc3Qgc2VydmVyQzogc2VydmVyLlNlcnZlciA9IHNlcnZlci5nZXRDdXJyZW50U2VydmVyKCk7XG4gICAgICBhc3NlcnQubm90U3RyaWN0RXF1YWwoc2VydmVyQywgc2VydmVyQSwgJ2h0dHA6Ly80Ny4xMS4yOC4xMiAhPT0gaHR0cDovLzQ3LjExLjI4LjEzJyk7XG5cbiAgICAgIGNvcmUuaW5pdCh7XG4gICAgICAgIHNlcnZlclVybDogJ2h0dHA6Ly80Ny4xMS4yOC4xMydcbiAgICAgIH0pO1xuICAgICAgY29uc3Qgc2VydmVyRDogc2VydmVyLlNlcnZlciA9IHNlcnZlci5nZXRDdXJyZW50U2VydmVyKCk7XG4gICAgICBhc3NlcnQuc3RyaWN0RXF1YWwoc2VydmVyRCwgc2VydmVyQSwgJ2h0dHA6Ly80Ny4xMS4yOC4xMyA9PT0gaHR0cDovLzQ3LjExLjI4LjEzJyk7XG4gICAgfSlcbiAgXTtcbn0pO1xuIl19