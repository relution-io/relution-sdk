/*
 * @file query/FilterVisitor.ts
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
 * @module query
 */
/** */

import * as filters from './Filter';

export interface FilterVisitorCore<T> {
  andOp(filter: filters.LogOpFilter): T;
  orOp(filter:  filters.LogOpFilter): T;
  nandOp(filter: filters.LogOpFilter): T;
  norOp(filter: filters.LogOpFilter): T;

  boolean(filter: filters.BooleanFilter): T;
  containsString(filter: filters.ContainsStringFilter): T;
  dateRange(filter: filters.DateRangeFilter): T;
  doubleRange(filter: filters.DoubleRangeFilter): T;
  like(filter: filters.LikeFilter): T;
  logOp(filter: filters.LogOpFilter): T;
  longEnum(filter: filters.LongEnumFilter): T;
  longRange(filter: filters.LongRangeFilter): T;
  stringEnum(filter: filters.StringEnumFilter): T;
  string(filter: filters.StringFilter): T;
  stringMap(filter: filters.StringMapFilter): T;
  stringRange(filter: filters.StringRangeFilter): T;
  null(filter: filters.NullFilter): T;
}

export class FilterVisitorBase<T> {
  public visit(filter: filters.Filter): T {
    return this[filter.type].apply(this, arguments);
  }

  logOp(filter: filters.LogOpFilter): T {
    return this[filter.operation.toLowerCase() + 'Op'].apply(this, arguments);
  }
}
