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

/**
 * kind of Filter as defined by corresponding Java object model.
 */
export type FilterType =
  'boolean' |
  'containsString' |
  'dateRange' |
  'doubleRange' |
  'like' |
  'logOp' |
  'longEnum' |
  'longRange' |
  'stringEnum' |
  'string' |
  'stringMap' |
  'stringRange' |
  'null';

/**
 * all known valid types of filters.
 *
 * @type {string[]} of all known types of filters.
 */
export const filterTypes = [
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
export function isFilterType(type: any): type is FilterType {
    return filterTypes.indexOf(type) >= 0;
}

export interface Filter {
  /**
   * kind of Filter as defined by corresponding Java object model.
   */
  type: FilterType;
}

/**
 * checks if an object is a Filter.
 *
 * @param filter object to check.
 * @return {boolean} whether filter is a filter.
 */
export function isFilter(filter: any): filter is Filter {
  return filter && isFilterType(filter.type);
}

export interface LogOpFilter extends Filter {
  /**
   * kind of Operation as defined by corresponding Java object model.
   *
   * <p>
   *  - and
   *  - or
   *  - nand
   *  - nor
   * </p>
   */
  operation: string;

  /**
   * filters evaluated with logical operation (filter1 LOGOP filter2 LOGOP filter3...).
   */
  filters: Filter[];
}

export interface FieldFilter extends Filter {
  /**
   * field expression identifying left hand side of the filter.
   */
  fieldName: string;
}

/**
 * implementation detail of the library.
 */
export interface ValueFilter<T> extends FieldFilter {
  value: T;
}

/**
 * implementation detail of the library.
 */
export interface RangeFilter<T> extends FieldFilter {
  min?: T;
  max?: T;
}

/**
 * implementation detail of the library.
 */
export interface EnumFilter<T> extends FieldFilter {
  values: T[];
}

export interface BooleanFilter extends ValueFilter<boolean> {
}

export interface ContainsStringFilter extends FieldFilter {
  contains: string;
}

export interface DateRangeFilter extends RangeFilter<Date> {
}

/**
 * implementation detail of the library.
 */
export interface NumberRangeFilter extends RangeFilter<number> {
}

export interface DoubleRangeFilter extends NumberRangeFilter {
}

export interface LongRangeFilter extends NumberRangeFilter {
}

export interface LikeFilter extends FieldFilter {
  like: string;
}

export interface LongEnumFilter extends EnumFilter<number> {
}

export interface StringEnumFilter extends EnumFilter<string> {
}

export interface StringFilter extends ValueFilter<string> {
}

export interface StringMapFilter extends FieldFilter {
  key?: string;
  value?: string;
}

export interface StringRangeFilter extends RangeFilter<string> {
}

export interface NullFilter extends FieldFilter {
  isNull: boolean;
}
