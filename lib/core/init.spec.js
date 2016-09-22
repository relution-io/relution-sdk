/*
 * @file core/init.spec.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 27.07.2016
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
 * @module core
 */
/** */
"use strict";
var chai_1 = require('chai');
var Relution = require('./init');
describe(module.filename || __filename, function () {
    it('if serverUrl is incorrect', function () {
        var options = {
            serverUrl: 'ashdhasdasd/gsdvhasd',
            debug: false
        };
        return Relution.init(options)
            .then(function () {
            throw new Error('expected to fail!');
        })
            .catch(function (e) {
            chai_1.assert(e.message.indexOf(options.serverUrl) !== -1, "Url fails " + e.message);
            return true;
        });
    });
    it('if serverUrl is set', function () {
        var options = {
            serverUrl: 'https://mwaysolutions.com',
            debug: false
        };
        return Relution.init(options).then(function (info) {
            chai_1.assert(info, 'Url not fails');
            return true;
        });
    });
    it('if serverUrl is not set', function () {
        return Relution.init({ debug: false }).then(function (info) {
            chai_1.assert(info.platform.id !== undefined, "Platform has a id " + info.platform.id);
            return true;
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdC5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvaW5pdC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBQzVCLElBQVksUUFBUSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRW5DLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUV0QyxFQUFFLENBQUUsMkJBQTJCLEVBQUU7UUFDL0IsSUFBTSxPQUFPLEdBQUc7WUFDZCxTQUFTLEVBQUUsc0JBQXNCO1lBQ2pDLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQztRQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQzthQUM1QixJQUFJLENBQUM7WUFDSixNQUFNLElBQUksS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDO2FBQ0QsS0FBSyxDQUFDLFVBQUMsQ0FBQztZQUNQLGFBQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsZUFBYSxDQUFDLENBQUMsT0FBUyxDQUFDLENBQUM7WUFDOUUsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBRUwsQ0FBQyxDQUFDLENBQUM7SUFFSCxFQUFFLENBQUUscUJBQXFCLEVBQUU7UUFDekIsSUFBTSxPQUFPLEdBQUc7WUFDZCxTQUFTLEVBQUUsMkJBQTJCO1lBQ3RDLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQztRQUNGLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FDaEMsVUFBQyxJQUFJO1lBQ0gsYUFBTSxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsQ0FBQztZQUM5QixNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEVBQUUsQ0FBRSx5QkFBeUIsRUFBRTtRQUM3QixNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFDLEtBQUssRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FDdkMsVUFBQyxJQUFJO1lBQ0gsYUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxLQUFLLFNBQVMsRUFBRSx1QkFBcUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFJLENBQUMsQ0FBQztZQUNoRixNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ2QsQ0FBQyxDQUNGLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGNvcmUvaW5pdC5zcGVjLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFBhc2NhbCBCcmV3aW5nIG9uIDI3LjA3LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBjb3JlXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5pbXBvcnQgKiBhcyBSZWx1dGlvbiBmcm9tICcuL2luaXQnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG5cbiAgaXQgKCdpZiBzZXJ2ZXJVcmwgaXMgaW5jb3JyZWN0JywgKCkgPT4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSB7XG4gICAgICBzZXJ2ZXJVcmw6ICdhc2hkaGFzZGFzZC9nc2R2aGFzZCcsXG4gICAgICBkZWJ1ZzogZmFsc2VcbiAgICB9O1xuICAgIHJldHVybiBSZWx1dGlvbi5pbml0KG9wdGlvbnMpXG4gICAgLnRoZW4oKCkgPT4ge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdleHBlY3RlZCB0byBmYWlsIScpO1xuICAgIH0pXG4gICAgLmNhdGNoKChlKSA9PiB7XG4gICAgICBhc3NlcnQoZS5tZXNzYWdlLmluZGV4T2Yob3B0aW9ucy5zZXJ2ZXJVcmwpICE9PSAtMSwgYFVybCBmYWlscyAke2UubWVzc2FnZX1gKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gIH0pO1xuXG4gIGl0ICgnaWYgc2VydmVyVXJsIGlzIHNldCcsICgpID0+IHtcbiAgICBjb25zdCBvcHRpb25zID0ge1xuICAgICAgc2VydmVyVXJsOiAnaHR0cHM6Ly9td2F5c29sdXRpb25zLmNvbScsXG4gICAgICBkZWJ1ZzogZmFsc2VcbiAgICB9O1xuICAgIHJldHVybiBSZWx1dGlvbi5pbml0KG9wdGlvbnMpLnRoZW4oXG4gICAgICAoaW5mbykgPT4ge1xuICAgICAgICBhc3NlcnQoaW5mbywgJ1VybCBub3QgZmFpbHMnKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgKTtcbiAgfSk7XG5cbiAgaXQgKCdpZiBzZXJ2ZXJVcmwgaXMgbm90IHNldCcsICgpID0+IHtcbiAgICByZXR1cm4gUmVsdXRpb24uaW5pdCh7ZGVidWc6IGZhbHNlfSkudGhlbihcbiAgICAgIChpbmZvKSA9PiB7XG4gICAgICAgIGFzc2VydChpbmZvLnBsYXRmb3JtLmlkICE9PSB1bmRlZmluZWQsIGBQbGF0Zm9ybSBoYXMgYSBpZCAke2luZm8ucGxhdGZvcm0uaWR9YCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICk7XG4gIH0pO1xufSk7XG4iXX0=