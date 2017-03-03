/*
 * @file livedata/index.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 27.06.2016
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
 * @preferred
 */
/** */
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./Collection'));
__export(require('./LiveDataMessage'));
__export(require('./LiveDataTimestamp'));
__export(require('./Model'));
__export(require('./Store'));
__export(require('./SyncContext'));
__export(require('./SyncEndpoint'));
__export(require('./SyncStore'));
__export(require('./WebSqlStore'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOzs7R0FHRztBQUNILE1BQU07Ozs7O0FBRU4saUJBQWMsY0FBYyxDQUFDLEVBQUE7QUFDN0IsaUJBQWMsbUJBQW1CLENBQUMsRUFBQTtBQUNsQyxpQkFBYyxxQkFBcUIsQ0FBQyxFQUFBO0FBQ3BDLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBQ3hCLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBQ3hCLGlCQUFjLGVBQWUsQ0FBQyxFQUFBO0FBQzlCLGlCQUFjLGdCQUFnQixDQUFDLEVBQUE7QUFDL0IsaUJBQWMsYUFBYSxDQUFDLEVBQUE7QUFDNUIsaUJBQWMsZUFBZSxDQUFDLEVBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvaW5kZXgudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI3LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICogQHByZWZlcnJlZFxuICovXG4vKiogKi9cblxuZXhwb3J0ICogZnJvbSAnLi9Db2xsZWN0aW9uJztcbmV4cG9ydCAqIGZyb20gJy4vTGl2ZURhdGFNZXNzYWdlJztcbmV4cG9ydCAqIGZyb20gJy4vTGl2ZURhdGFUaW1lc3RhbXAnO1xuZXhwb3J0ICogZnJvbSAnLi9Nb2RlbCc7XG5leHBvcnQgKiBmcm9tICcuL1N0b3JlJztcbmV4cG9ydCAqIGZyb20gJy4vU3luY0NvbnRleHQnO1xuZXhwb3J0ICogZnJvbSAnLi9TeW5jRW5kcG9pbnQnO1xuZXhwb3J0ICogZnJvbSAnLi9TeW5jU3RvcmUnO1xuZXhwb3J0ICogZnJvbSAnLi9XZWJTcWxTdG9yZSc7XG4iXX0=