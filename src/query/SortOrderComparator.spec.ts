/**
 * @file query/SortOrderComparator.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 23.06.2015
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

import {assert} from 'chai';

import * as _ from 'lodash';

import {SortOrder} from './SortOrder';
import {jsonCompare} from './SortOrderComparator';
import {makeMovies} from './movies.data';

describe(module.filename || __filename, function() {
  return [

    it('sort movies by id', () => {
      var testdata = makeMovies();

      var original = new Array(testdata.length);
      for (var i = 0; i < testdata.length; ++i) {
        original[i] = testdata[i].id;
      }

      testdata.sort(jsonCompare(new SortOrder().fromJSON([
        'id'
      ])));
      original.sort();

      for (var j = 0; j < testdata.length; ++j) {
        assert.equal(testdata[j].id, original[j], 'order at #' + j);
      }
    }),

    it('sort movies by year ascending', () => {
      var testdata = makeMovies();

      var original = new Array(testdata.length);
      for (var i = 0; i < testdata.length; ++i) {
        original[i] = testdata[i].year;
      }

      testdata.sort(jsonCompare(
        '+year'
      ));
      original.sort();

      for (var j = 0; j < testdata.length; ++j) {
        assert.equal(testdata[j].year, original[j], 'order at #' + j);
      }
    }),

    it('sort movies by runtime descending', () => {
      var testdata = makeMovies();

      var original = new Array(testdata.length);
      for (var i = 0; i < testdata.length; ++i) {
        original[i] = testdata[i].runtime;
      }

      testdata.sort(jsonCompare(new SortOrder().fromJSON([
        '-runtime'
      ])));
      original.sort(function (a, b) {
        return (b | 0) - (a | 0);
      });

      for (var j = 0; j < testdata.length; ++j) {
        assert.equal(testdata[j].runtime, original[j], 'order at #' + j);
      }
    }),

    it('sort movies by year descending, runtime ascending, id', () => {
      var testdata = makeMovies();
      var original = _.clone(testdata);

      testdata.sort(jsonCompare([
        '-year',
        '+runtime',
        'id'
      ]));
      original.sort(function (a, b) {
        var result = (b.year | 0) - (a.year | 0);
        if (result === 0) {
          result = (a.runtime | 0) - (b.runtime | 0);
          if (result === 0) {
            result = a.id.localeCompare(b.id);
          }
        }
        return result;
      });

      for (var j = 0; j < testdata.length; ++j) {
        assert.equal(testdata[j], original[j], 'order at #' + j);
      }
    })

  ];
});
