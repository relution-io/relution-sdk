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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOzs7R0FHRztBQUNILE1BQU07Ozs7O0FBRU4saUJBQWMsY0FBYyxDQUFDLEVBQUE7QUFDN0IsaUJBQWMsbUJBQW1CLENBQUMsRUFBQTtBQUNsQyxpQkFBYyxxQkFBcUIsQ0FBQyxFQUFBO0FBQ3BDLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBQ3hCLGlCQUFjLFNBQVMsQ0FBQyxFQUFBO0FBQ3hCLGlCQUFjLGVBQWUsQ0FBQyxFQUFBO0FBQzlCLGlCQUFjLGdCQUFnQixDQUFDLEVBQUE7QUFDL0IsaUJBQWMsYUFBYSxDQUFDLEVBQUE7QUFDNUIsaUJBQWMsZUFBZSxDQUFDLEVBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxyXG4gKiBAZmlsZSBsaXZlZGF0YS9pbmRleC50c1xyXG4gKiBSZWx1dGlvbiBTREtcclxuICpcclxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjcuMDYuMjAxNlxyXG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcclxuICogQHByZWZlcnJlZFxyXG4gKi9cclxuLyoqICovXHJcblxyXG5leHBvcnQgKiBmcm9tICcuL0NvbGxlY3Rpb24nO1xyXG5leHBvcnQgKiBmcm9tICcuL0xpdmVEYXRhTWVzc2FnZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vTGl2ZURhdGFUaW1lc3RhbXAnO1xyXG5leHBvcnQgKiBmcm9tICcuL01vZGVsJztcclxuZXhwb3J0ICogZnJvbSAnLi9TdG9yZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vU3luY0NvbnRleHQnO1xyXG5leHBvcnQgKiBmcm9tICcuL1N5bmNFbmRwb2ludCc7XHJcbmV4cG9ydCAqIGZyb20gJy4vU3luY1N0b3JlJztcclxuZXhwb3J0ICogZnJvbSAnLi9XZWJTcWxTdG9yZSc7XHJcbiJdfQ==