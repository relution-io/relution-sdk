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
__export(require('./Model'));
__export(require('./Store'));
__export(require('./SyncContext'));
__export(require('./SyncEndpoint'));
__export(require('./SyncStore'));
__export(require('./WebSqlStore'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOzs7R0FHRztBQUNILE1BQU07Ozs7O0FBRU4saUJBQWMsY0FBYyxDQUFDLEVBQUE7QUFDN0IsaUJBQWMsbUJBQW1CLENBQUMsRUFBQTtBQUNsQyxpQkFBYyxTQUFTLENBQUMsRUFBQTtBQUN4QixpQkFBYyxTQUFTLENBQUMsRUFBQTtBQUN4QixpQkFBYyxlQUFlLENBQUMsRUFBQTtBQUM5QixpQkFBYyxnQkFBZ0IsQ0FBQyxFQUFBO0FBQy9CLGlCQUFjLGFBQWEsQ0FBQyxFQUFBO0FBQzVCLGlCQUFjLGVBQWUsQ0FBQyxFQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL2luZGV4LnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyNy4wNi4yMDE2XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqIEBwcmVmZXJyZWRcbiAqL1xuLyoqICovXG5cbmV4cG9ydCAqIGZyb20gJy4vQ29sbGVjdGlvbic7XG5leHBvcnQgKiBmcm9tICcuL0xpdmVEYXRhTWVzc2FnZSc7XG5leHBvcnQgKiBmcm9tICcuL01vZGVsJztcbmV4cG9ydCAqIGZyb20gJy4vU3RvcmUnO1xuZXhwb3J0ICogZnJvbSAnLi9TeW5jQ29udGV4dCc7XG5leHBvcnQgKiBmcm9tICcuL1N5bmNFbmRwb2ludCc7XG5leHBvcnQgKiBmcm9tICcuL1N5bmNTdG9yZSc7XG5leHBvcnQgKiBmcm9tICcuL1dlYlNxbFN0b3JlJztcbiJdfQ==