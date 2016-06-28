/**
 * @file query/SortOrderComparator.ts
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

import * as _ from 'lodash';

import {SortOrder} from './SortOrder';
import {JsonPath} from './JsonPath';

/**
 * options of #jsonCompare function.
 */
export interface JsonCompareOptions {
  /**
   * set to explicitly use case-sensitive string matching, evalates to false to use matching
   * semantics of WebSQL.
   */
  casesensitive?: boolean;
}

/**
 * compiled compare function.
 */
export interface JsonCompareFn<T> {
  /**
   * compares objects in a way compatible to Array.sort().
   *
   * @param o1 left operand.
   * @param o2 right operand.
   * @return {number} indicating relative ordering of operands.
   */
  (o1: T, o2: T): number;
}

/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param json of SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export function jsonCompare<T>(json: string, options?: JsonCompareOptions): JsonCompareFn<T>;
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param json of SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export function jsonCompare<T>(json: string[], options?: JsonCompareOptions): JsonCompareFn<T>;
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param sortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export function jsonCompare<T>(sortOrder: SortOrder, options?: JsonCompareOptions):
  JsonCompareFn<T>;
/**
 * compiles a JsonCompareFn from a given SortOrder.
 *
 * @param arg defining the SortOrder being compiled.
 * @return {function} a JsonCompareFn function compatible to Array.sort().
 */
export function jsonCompare<T>(arg: string | string[] | SortOrder, options?: JsonCompareOptions):
  JsonCompareFn<T> {
  var sortOrder: SortOrder;
  if (typeof arg === 'string') {
    sortOrder = new SortOrder();
    sortOrder.fromJSON([ arg ]);
  } else if (_.isArray(arg)) {
    sortOrder = new SortOrder();
    sortOrder.fromJSON(arg);
  } else {
    sortOrder = arg;
  }

  var comparator = new SortOrderComparator<T>(sortOrder, options);
  return <JsonCompareFn<T>>(_.bind(comparator.compare, comparator));
}

/**
 * compiled SortOrder for comparison of objects.
 *
 * @see SortOrder
 */
class SortOrderComparator<T> {

  protected options: JsonCompareOptions = {
    casesensitive: false
  };

  /**
   * compiled accessor paths of SortField data.
   */
  private expressions: JsonPath[];

  /**
   * constructs a compiled SortOrder for object comparison.
   *
   * @param sortOrder to realize.
   */
  public constructor(private sortOrder: SortOrder, options?: JsonCompareOptions) {
    if (options) {
      _.extend(this.options, options);
    }

    this.expressions = new Array<JsonPath>(sortOrder.sortFields.length);
    for (var i = 0; i < this.expressions.length; ++i) {
      this.expressions[i] = new JsonPath(sortOrder.sortFields[i].name);
    }
  }

  /**
   * compares objects in a way compatible to Array.sort().
   *
   * @param o1 left operand.
   * @param o2 right operand.
   * @return {number} indicating relative ordering of operands.
   */
  public compare(o1: T, o2: T): number {
    for (var i = 0; i < this.sortOrder.sortFields.length; ++i) {
      var expression = this.expressions[i];
      var val1 = expression.evaluate(o1);
      var val2 = expression.evaluate(o2);
      var cmp = this.compare1(val1, val2);
      if (cmp !== 0) {
        return this.sortOrder.sortFields[i].ascending ? +cmp : -cmp;
      }
    }
    return 0;
  }

  /**
   * compares values in a way compatible to Array.sort().
   *
   * @param o1 left operand.
   * @param o2 right operand.
   * @return {number} indicating relative ordering of operands.
   */
  private compare1(val1: any, val2: any): number {
    if (!val1 || !val2) {
      // null/undefined case
      if (val2) {
        return -1;
      }
      if (val1) {
        return +1;
      }
    } else if (Array.isArray(val1) || Array.isArray(val2)) {
      // array case
      var items1 = Array.isArray(val1) ? val1 : [val1];
      var items2 = Array.isArray(val2) ? val2 : [val2];
      var length = Math.max(items1.length, items2.length);
      for (var i = 0; i < length; ++i) {
        var c = this.compare1(items1[i], items2[i]);
        if (c !== 0) {
          return c;
        }
      }
    } else {
      // comparision case
      if (!this.options.casesensitive) {
        if (typeof val1 === 'string') {
          val1 = val1.toLowerCase();
        }
        if (typeof val2 === 'string') {
          val2 = val2.toLowerCase();
        }
      }

      // value case
      if (val1 < val2) {
        return -1;
      }
      if (val1 > val2) {
        return +1;
      }
    }
    return 0;
  }
}
