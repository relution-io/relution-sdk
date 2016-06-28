/**
 * @file query/JsonFilterVisitor.spec.ts
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

import * as filters from './Filter';
import {jsonFilter} from './JsonFilterVisitor';
import {makeMovies} from './movies.data';

describe(module.filename, () => {
  return [

    it('filter movies by id', () => {
      var testdata = makeMovies();
      var expected = [1, 3, 5, 8];
      var filtered = testdata.filter(jsonFilter(<filters.LogOpFilter>{
        type: 'logOp',
        operation: 'or',
        filters: [
          <filters.StringFilter>{
            // index 3
            type: 'string',
            fieldName: 'id',
            value: '771370467'
          },
          <filters.StringFilter>{
            // does not exist
            type: 'string',
            fieldName: 'id',
            value: '471100000'
          },
          <filters.StringEnumFilter>{
            type: 'stringEnum',
            fieldName: 'id',
            values: [
              '771356696',  // index 5
              '281178000',  // does not exist
              '771313962'   // index 8
            ]
          },
          <filters.StringFilter>{
            // index 1
            type: 'string',
            fieldName: 'id',
            value: '771374432'
          }
        ]
      }));
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < filtered.length; ++i) {
        assert.equal(filtered[i], testdata[expected[i]], 'filter at #' + i);
      }
    }),

    it('filter movies like Ford', () => {
      var testdata = makeMovies();
      var expected = ['771373149', '771410658'];
      var filtered = testdata.filter(jsonFilter(<filters.LikeFilter>{
        type: 'like',
        fieldName: 'abridged_cast[*].name',
        like: '%Ford%'
      }));
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < filtered.length; ++i) {
        assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
      }
    }),

    it('filter movies containing Harris', () => {
      var testdata = makeMovies();
      var expected = ['771364722', '771373149', '771410658'];
      var filtered = testdata.filter(jsonFilter(<filters.ContainsStringFilter>{
        type: 'containsString',
        fieldName: 'abridged_cast[*].name',
        contains: 'Harris'
      }));
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < filtered.length; ++i) {
        assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
      }
    }),

    it('filter movies with critics score [70;85]', () => {
      var testdata = makeMovies();
      var expected = ['771324839', '771313962', '771368269', '771354922', '771412075', '771357114', '771385848'];
      var filtered = testdata.filter(jsonFilter(<filters.LogOpFilter>{
        type: 'logOp',
        operation: 'and',
        filters: [
          <filters.LongRangeFilter>{
            type: 'longRange',
            fieldName: 'ratings.critics_score',
            min: 70,
            max: 88
          },
          <filters.DoubleRangeFilter>{
            type: 'doubleRange',
            fieldName: 'ratings.critics_score',
            max: 85
          }
        ]
      }));
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < filtered.length; ++i) {
        assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
      }
    }),

    it('filter movies without DVD release', () => {
      var testdata = makeMovies();
      var filtered = testdata.filter(jsonFilter(<filters.NullFilter>{
        type: 'null',
        fieldName: 'release_dates.dvd',
        isNull: true
      }));
      var expected = testdata.filter(function (movie) {
        /* jshint -W106 */
        return !movie.release_dates.dvd;
      });
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < expected.length; ++i) {
        assert.equal(filtered[i], expected[i], 'filter at #' + i);
      }
    }),

    it('filter movies with links containing key similar', () => {
      var testdata = makeMovies();
      var filtered = testdata.filter(jsonFilter(<filters.StringMapFilter>{
        type: 'stringMap',
        fieldName: 'links',
        key: 'similar'
      }));
      var expected = testdata.filter(function (movie) {
        /* jshint -W106 */
        return movie.links && Object.keys(movie.links).indexOf('similar') >= 0;
      });
      assert.isTrue(expected.length > 0);
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < expected.length; ++i) {
        assert.equal(filtered[i], expected[i], 'filter at #' + i);
      }
    }),

    it('filter movies with links containing value http://api.rottentomatoes.com/api/public/v1.0/movies/771324839/similar.json', () => {
      var testdata = makeMovies();
      var filtered = testdata.filter(jsonFilter(<filters.StringMapFilter>{
        type: 'stringMap',
        fieldName: 'links',
        value: 'http://api.rottentomatoes.com/api/public/v1.0/movies/771324839/similar.json'
      }));
      var expected = testdata.filter(function (movie) {
        /* jshint -W106 */
        for (var key in movie.links || {}) {
          if (movie.links[key] === 'http://api.rottentomatoes.com/api/public/v1.0/movies/771324839/similar.json') {
            return true;
          }
        }
        return false;
      });
      assert.isTrue(expected.length > 0);
      assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
      for (var i = 0; i < expected.length; ++i) {
        assert.equal(filtered[i], expected[i], 'filter at #' + i);
      }
    })

  ];
});
