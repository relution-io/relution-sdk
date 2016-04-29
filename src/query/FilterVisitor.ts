/**
 * @file query/FilterVisitor.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 22.06.2015
 * Copyright (c)
 * 2015
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

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
