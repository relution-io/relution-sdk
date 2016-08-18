/*
 * @file query/JsonFilterVisitor.ts
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

import * as _ from 'lodash';

import * as filters from './Filter';
import {FilterVisitorBase, FilterVisitorCore} from'./FilterVisitor';
import {JsonPath} from './JsonPath';

/**
 * options of #jsonFilter function.
 */
export interface JsonFilterOptions {
  /**
   * set to explicitly use case-sensitive string matching, evalates to false to use matching
   * semantics of WebSQL.
   */
  casesensitive?: boolean;
}

/**
 * compiled test function.
 */
export interface JsonFilterFn<T> {
  /**
   * tests an object against a Filter tree.
   *
   * @param arg object to test.
   * @return {boolean} whether the given object passes the Filter tree.
   */
  (arg: T): boolean;
}

/**
 * compiles a JsonFilterFn from a given Filter tree.
 *
 * @param filter tree being compiled.
 * @param options customizing the matching, entirely optional.
 * @return {function} a JsonFilterFn function.
 */
export function jsonFilter<T>(filter: filters.Filter, options?: JsonFilterOptions): JsonFilterFn<T> {
  return new JsonFilterVisitor<T>(options).visit(filter);
}

/**
 * compiles a Filter tree into a JsonFilterFn.
 */
class JsonFilterVisitor<T> extends FilterVisitorBase<JsonFilterFn<T>>
  implements FilterVisitorCore<JsonFilterFn<T>> {

  protected options: JsonFilterOptions = {
    casesensitive: false
  };

  constructor(options?: JsonFilterOptions) {
    super();

    if (options) {
      _.extend(this.options, options);
    }
  }

  containsString(filter: filters.ContainsStringFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var contains = filter.contains;
    if (contains === undefined || contains === null) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value === undefined || value === null;
      };
    }

    var testFn: (val: any) => boolean;
    if (this.options.casesensitive) {
      // case-sensitive
      testFn = (val) => {
        return val.toString().indexOf(contains) >= 0;
      };
    } else {
      // case-insensitive (RegExp-based)
      var pattern = contains.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
      var regexp = new RegExp(pattern, 'i');
      testFn = (val) => {
        return regexp.test(val.toString());
      };
    }

    return (obj: T) => {
      var value = expression.evaluate(obj);
      if (value === undefined || value === null) {
        // null/undefined case
        return false;
      } else if (_.isArray(value)) {
        // array case
        for (var i = 0; i < value.length; ++i) {
          var val = value[i];
          if (val !== undefined && val !== null && testFn(val)) {
            return true;
          }
        }
        return false;
      } else {
        // simple case
        return testFn(value);
      }
    };
  }

  string(filter: filters.StringFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var expected = filter.value;
    if (expected === undefined || expected === null) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value === undefined || value === null;
      };
    }

    var testFn: (val: any) => boolean;
    if (this.options.casesensitive) {
      // case-sensitive
      testFn = (val) => {
        return val == expected;
      };
    } else {
      // case-insensitive (RegExp-based)
      var pattern = expected.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
      var regexp = new RegExp('^' + pattern + '$', 'i');
      testFn = (val) => {
        return regexp.test(val.toString());
      };
    }

    return (obj: T) => {
      var value = expression.evaluate(obj);
      if (value === undefined || value === null) {
        // null/undefined case
        return false;
      } else if (_.isArray(value)) {
        // array case
        for (var i = 0; i < value.length; ++i) {
          var val = value[i];
          if (val !== undefined && val !== null && testFn(val)) {
            return true;
          }
        }
        return false;
      } else {
        // simple case
        return testFn(value);
      }
    };
  }

  range<V>(filter: filters.RangeFilter<V>): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var min: V = filter.min;
    var max: V = filter.max;
    if (min === undefined || min === null) {
      if (max === undefined || max === null) {
        return (obj: T) => {
          var value = expression.evaluate(obj);
          return !!value;
        };
      } else {
        return (obj: T) => {
          var value = expression.evaluate(obj);
          return !!value && value <= max;
        };
      }
    } else if (min === max) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return !!value && value == min;
      };
    } else {
      if (max === undefined || max === null) {
        return (obj: T) => {
          var value = expression.evaluate(obj);
          return !!value && value >= min;
        };
      } else {
        return (obj: T) => {
          var value = expression.evaluate(obj);
          return !!value && value <= max && value >= min;
        };
      }
    }
  }

  longRange(filter: filters.LongRangeFilter): JsonFilterFn<T> {
    return this.range(filter);
  }

  dateRange(filter: filters.DateRangeFilter): JsonFilterFn<T> {
    return this.range(filter);
  }

  stringRange(filter: filters.StringRangeFilter): JsonFilterFn<T> {
    // not case-insensitive in WebSQL and we want same behavior here!
    return this.range(filter);
  }

  doubleRange(filter: filters.DoubleRangeFilter): JsonFilterFn<T> {
    return this.range(filter);
  }

  boolean(filter: filters.BooleanFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var expected = filter.value;
    return (obj: T) => {
      var value = expression.evaluate(obj);
      return !!value === expected;
    };
  }

  enum<V>(filter: filters.EnumFilter<V>): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var values: V[] = filter.values;
    if (!values) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return !value;
      };
    } else {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return values.indexOf(value) >= 0;
      };
    }
  }

  stringEnum(filter: filters.StringEnumFilter): JsonFilterFn<T> {
    // not case-insensitive in WebSQL and we want same behavior here!
    return this.enum(filter);
  }

  longEnum(filter: filters.LongEnumFilter): JsonFilterFn<T> {
    return this.enum(filter);
  }

  stringMap(filter: filters.StringMapFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var property = filter.key !== undefined && filter.key !== null && new JsonPath(filter.key);
    var expected = filter.value;

    var testFn: (val: any) => boolean;
    if (expected !== undefined && expected !== null) {
      if (this.options.casesensitive) {
        // case-sensitive
        testFn = (val) => {
          return val == expected;
        };
      } else {
        // case-insensitive (RegExp-based)
        var pattern = expected.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1');
        var regexp = new RegExp('^' + pattern + '$', 'i');
        testFn = (val) => {
          return regexp.test(val.toString());
        };
      }
    }

    if (!property && !testFn) {
      // no key and no value --> at least one entry in dictionary
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value && _.keys(value).length > 0;
      };
    } else if (!property) {
      // no key but some value
      return (obj: T) => {
        var value = expression.evaluate(obj);
        if (value) {
          for (var key in value) {
            var val = value[key];
            if (val !== undefined && val !== null && testFn(val)) {
              return true;
            }
          }
        }
        return false;
      };
    } else if (expected === undefined || expected === null) {
      // key but no value --> any value will do
      return (obj: T) => {
        var value = expression.evaluate(obj);
        var val = property.evaluate(value);
        return val !== undefined && val !== null;
      };
    } else {
      // key and value --> must have exact entry
      return (obj: T) => {
        var value = expression.evaluate(obj);
        var val = property.evaluate(value);
        return val !== undefined && val !== null && testFn(val);
      };
    }
  }

  like(filter: filters.LikeFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    var like = filter.like;
    if (like === undefined || like === null) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value === undefined || value === null;
      };
    }

    var pattern = like.replace(/([\.\\\[\]\+\^\$\(\)\*\?\{\}\,\!])/g, '\\$1').replace(/%/g, '.*');
    var regexp: RegExp;
    if (this.options.casesensitive) {
      regexp = new RegExp('^' + pattern + '$');
    } else {
      regexp = new RegExp('^' + pattern + '$', 'i');
    }

    return (obj: T) => {
      var value = expression.evaluate(obj);
      if (value === undefined || value === null) {
        // null/undefined case
        return false;
      } else if (_.isArray(value)) {
        // array case
        for (var i = 0; i < value.length; ++i) {
          var val = value[i];
          if (regexp.test(val)) {
            return true;
          }
        }
        return false;
      } else {
        // simple case
        return regexp.test(value);
      }
    };
  }

  null(filter: filters.NullFilter): JsonFilterFn<T> {
    var expression = new JsonPath(filter.fieldName);
    if (filter.isNull) {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value === undefined || value === null;
      };
    } else {
      return (obj: T) => {
        var value = expression.evaluate(obj);
        return value !== undefined && value !== null;
      };
    }
  }

  filters(filter: filters.LogOpFilter): JsonFilterFn<T>[] {
    // build filter functions
    var filters: JsonFilterFn<T>[] = new Array<JsonFilterFn<T>>(filter.filters.length);
    for (var i = 0; i < filters.length; ++i) {
      filters[i] = this.visit(filter.filters[i]);
    }
    return filters;
  }

  andOp(filter: filters.LogOpFilter): JsonFilterFn<T> {
    var filters = this.filters(filter);
    return (obj: T) => {
      for (var i = 0; i < filters.length; ++i) {
        var child = filters[i];
        if (!child(obj)) {
          return false;
        }
      }
      return true;
    };
  }

  orOp(filter: filters.LogOpFilter): JsonFilterFn<T> {
    let filters = this.filters(filter);
    return (obj: T) => {
      for (var i = 0; i < filters.length; ++i) {
        let child = filters[i];
        if (child(obj)) {
          return true;
        }
      }
      return false;
    };
  }

  nandOp(filter: filters.LogOpFilter): JsonFilterFn<T> {
    var filters = this.filters(filter);
    return (obj: T) => {
      for (var i = 0; i < filters.length; ++i) {
        var child = filters[i];
        if (!child(obj)) {
          return true;
        }
      }
      return false;
    };
  }

  norOp(filter: filters.LogOpFilter): JsonFilterFn<T> {
    var filters = this.filters(filter);
    return (obj: T) => {
      for (var i = 0; i < filters.length; ++i) {
        var child = filters[i];
        if (child(obj)) {
          return false;
        }
      }
      return true;
    };
  }
}
