/**
 * @file query/Filter.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.06.2015
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
"use strict";
/**
 * all known valid types of filters.
 *
 * @type {string[]} of all known types of filters.
 */
exports.filterTypes = [
    'boolean',
    'containsString',
    'dateRange',
    'doubleRange',
    'like',
    'logOp',
    'longEnum',
    'longRange',
    'stringEnum',
    'string',
    'stringMap',
    'stringRange',
    'null'
];
/**
 * checks if a given type value is a valid FilterType value.
 *
 * @param type value to check.
 * @return {boolean} whether type value is valid.
 */
function isFilterType(type) {
    return exports.filterTypes.indexOf(type) >= 0;
}
exports.isFilterType = isFilterType;
/**
 * checks if an object is a Filter.
 *
 * @param filter object to check.
 * @return {boolean} whether filter is a filter.
 */
function isFilter(filter) {
    return filter && isFilterType(filter.type);
}
exports.isFilter = isFilter;
//# sourceMappingURL=Filter.js.map