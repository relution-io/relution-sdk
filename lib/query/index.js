/*
 * @file query/index.ts
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
 * @module query
 * @preferred
 */
/** */
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
__export(require('./Filter'));
__export(require('./FilterVisitor'));
__export(require('./GetQuery'));
__export(require('./JsonFilterVisitor'));
__export(require('./JsonPath'));
__export(require('./SortOrder'));
__export(require('./SortOrderComparator'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcXVlcnkvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOzs7R0FHRztBQUNILE1BQU07Ozs7O0FBRU4saUJBQWMsVUFBVSxDQUFDLEVBQUE7QUFDekIsaUJBQWMsaUJBQWlCLENBQUMsRUFBQTtBQUNoQyxpQkFBYyxZQUFZLENBQUMsRUFBQTtBQUMzQixpQkFBYyxxQkFBcUIsQ0FBQyxFQUFBO0FBQ3BDLGlCQUFjLFlBQVksQ0FBQyxFQUFBO0FBQzNCLGlCQUFjLGFBQWEsQ0FBQyxFQUFBO0FBQzVCLGlCQUFjLHVCQUF1QixDQUFDLEVBQUEiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgcXVlcnkvaW5kZXgudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA0LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBxdWVyeVxuICogQHByZWZlcnJlZFxuICovXG4vKiogKi9cblxuZXhwb3J0ICogZnJvbSAnLi9GaWx0ZXInO1xuZXhwb3J0ICogZnJvbSAnLi9GaWx0ZXJWaXNpdG9yJztcbmV4cG9ydCAqIGZyb20gJy4vR2V0UXVlcnknO1xuZXhwb3J0ICogZnJvbSAnLi9Kc29uRmlsdGVyVmlzaXRvcic7XG5leHBvcnQgKiBmcm9tICcuL0pzb25QYXRoJztcbmV4cG9ydCAqIGZyb20gJy4vU29ydE9yZGVyJztcbmV4cG9ydCAqIGZyb20gJy4vU29ydE9yZGVyQ29tcGFyYXRvcic7XG4iXX0=