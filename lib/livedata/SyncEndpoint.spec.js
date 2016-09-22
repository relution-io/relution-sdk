/*
 * @file livedata/SyncEndpoint.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.06.2016
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
 * @module livedata
 */
/** */
"use strict";
var chai_1 = require('chai');
var SyncEndpoint_1 = require('./SyncEndpoint');
var Model_1 = require('./Model');
describe(module.filename || __filename, function () {
    return [
        it('hashing', function () {
            chai_1.assert.equal(SyncEndpoint_1.hashCode('api/dataSync/Todo'), 1108439963);
        }),
        it('creation', function () {
            var syncEndpoint = new SyncEndpoint_1.SyncEndpoint({
                entity: 'todo',
                modelType: Model_1.Model,
                urlRoot: 'https://127.0.0.1/api/dataSync/Todo',
                socketPath: '/api/dataSync/Todo/live',
                userUuid: '1249bb40-41ca-11e6-bdf4-0800200c9a66'
            });
            chai_1.assert.equal(syncEndpoint.host, 'https://127.0.0.1:443');
            chai_1.assert.equal(syncEndpoint.channel, '1249bb40-41ca-11e6-bdf4-0800200c9a66/todo/' +
                SyncEndpoint_1.hashCode('https://127.0.0.1:443'));
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3luY0VuZHBvaW50LnNwZWMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvU3luY0VuZHBvaW50LnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsNkJBQXFDLGdCQUFnQixDQUFDLENBQUE7QUFDdEQsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBRTVCLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN4QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQ1osYUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLFVBQVUsRUFBRTtZQUNiLElBQU0sWUFBWSxHQUFHLElBQUksMkJBQVksQ0FBQztnQkFDcEMsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsU0FBUyxFQUFFLGFBQUs7Z0JBQ2hCLE9BQU8sRUFBRSxxQ0FBcUM7Z0JBQzlDLFVBQVUsRUFBRSx5QkFBeUI7Z0JBQ3JDLFFBQVEsRUFBRSxzQ0FBc0M7YUFDakQsQ0FBQyxDQUFDO1lBQ0gsYUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHVCQUF1QixDQUFDLENBQUM7WUFDekQsYUFBTSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLDRDQUE0QztnQkFDN0UsdUJBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL1N5bmNFbmRwb2ludC5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCB7YXNzZXJ0fSBmcm9tICdjaGFpJztcblxuaW1wb3J0IHtTeW5jRW5kcG9pbnQsIGhhc2hDb2RlfSBmcm9tICcuL1N5bmNFbmRwb2ludCc7XG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcblxuICBkZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnaGFzaGluZycsICgpID0+IHtcbiAgICAgIGFzc2VydC5lcXVhbChoYXNoQ29kZSgnYXBpL2RhdGFTeW5jL1RvZG8nKSwgMTEwODQzOTk2Myk7XG4gICAgfSksXG5cbiAgICBpdCgnY3JlYXRpb24nLCAoKSA9PiB7XG4gICAgICBjb25zdCBzeW5jRW5kcG9pbnQgPSBuZXcgU3luY0VuZHBvaW50KHtcbiAgICAgICAgZW50aXR5OiAndG9kbycsXG4gICAgICAgIG1vZGVsVHlwZTogTW9kZWwsXG4gICAgICAgIHVybFJvb3Q6ICdodHRwczovLzEyNy4wLjAuMS9hcGkvZGF0YVN5bmMvVG9kbycsXG4gICAgICAgIHNvY2tldFBhdGg6ICcvYXBpL2RhdGFTeW5jL1RvZG8vbGl2ZScsXG4gICAgICAgIHVzZXJVdWlkOiAnMTI0OWJiNDAtNDFjYS0xMWU2LWJkZjQtMDgwMDIwMGM5YTY2J1xuICAgICAgfSk7XG4gICAgICBhc3NlcnQuZXF1YWwoc3luY0VuZHBvaW50Lmhvc3QsICdodHRwczovLzEyNy4wLjAuMTo0NDMnKTtcbiAgICAgIGFzc2VydC5lcXVhbChzeW5jRW5kcG9pbnQuY2hhbm5lbCwgJzEyNDliYjQwLTQxY2EtMTFlNi1iZGY0LTA4MDAyMDBjOWE2Ni90b2RvLycgK1xuICAgICAgICBoYXNoQ29kZSgnaHR0cHM6Ly8xMjcuMC4wLjE6NDQzJykpO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19