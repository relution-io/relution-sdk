/*
 * @file web/index.ts
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
 * @module web
 * @preferred
 */
/** */
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./urls'));
__export(require('./http'));
__export(require('./verb'));
__export(require('./online'));
__export(require('./offline'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvd2ViL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7O0dBR0c7QUFDSCxNQUFNOzs7OztBQUVOLGlCQUFjLFFBQVEsQ0FBQyxFQUFBO0FBQ3ZCLGlCQUFjLFFBQVEsQ0FBQyxFQUFBO0FBQ3ZCLGlCQUFjLFFBQVEsQ0FBQyxFQUFBO0FBQ3ZCLGlCQUFjLFVBQVUsQ0FBQyxFQUFBO0FBQ3pCLGlCQUFjLFdBQVcsQ0FBQyxFQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgd2ViL2luZGV4LnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNC4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSB3ZWJcclxuICogQHByZWZlcnJlZFxyXG4gKi9cclxuLyoqICovXHJcblxyXG5leHBvcnQgKiBmcm9tICcuL3VybHMnO1xyXG5leHBvcnQgKiBmcm9tICcuL2h0dHAnO1xyXG5leHBvcnQgKiBmcm9tICcuL3ZlcmInO1xyXG5leHBvcnQgKiBmcm9tICcuL29ubGluZSc7XHJcbmV4cG9ydCAqIGZyb20gJy4vb2ZmbGluZSc7XHJcbiJdfQ==