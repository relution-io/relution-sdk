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
"use strict";
var chai_1 = require('chai');
var JsonFilterVisitor_1 = require('./JsonFilterVisitor');
var movies_data_1 = require('./movies.data');
describe(module.filename || __filename, function () {
    return [
        it('filter movies by id', function () {
            var testdata = movies_data_1.makeMovies();
            var expected = [1, 3, 5, 8];
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'logOp',
                operation: 'or',
                filters: [
                    {
                        // index 3
                        type: 'string',
                        fieldName: 'id',
                        value: '771370467'
                    },
                    {
                        // does not exist
                        type: 'string',
                        fieldName: 'id',
                        value: '471100000'
                    },
                    {
                        type: 'stringEnum',
                        fieldName: 'id',
                        values: [
                            '771356696',
                            '281178000',
                            '771313962' // index 8
                        ]
                    },
                    {
                        // index 1
                        type: 'string',
                        fieldName: 'id',
                        value: '771374432'
                    }
                ]
            }));
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < filtered.length; ++i) {
                chai_1.assert.equal(filtered[i], testdata[expected[i]], 'filter at #' + i);
            }
        }),
        it('filter movies like Ford', function () {
            var testdata = movies_data_1.makeMovies();
            var expected = ['771373149', '771410658'];
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'like',
                fieldName: 'abridged_cast[*].name',
                like: '%Ford%'
            }));
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < filtered.length; ++i) {
                chai_1.assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
            }
        }),
        it('filter movies containing Harris', function () {
            var testdata = movies_data_1.makeMovies();
            var expected = ['771364722', '771373149', '771410658'];
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'containsString',
                fieldName: 'abridged_cast[*].name',
                contains: 'Harris'
            }));
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < filtered.length; ++i) {
                chai_1.assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
            }
        }),
        it('filter movies with critics score [70;85]', function () {
            var testdata = movies_data_1.makeMovies();
            var expected = ['771324839', '771313962', '771368269', '771354922', '771412075', '771357114', '771385848'];
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'logOp',
                operation: 'and',
                filters: [
                    {
                        type: 'longRange',
                        fieldName: 'ratings.critics_score',
                        min: 70,
                        max: 88
                    },
                    {
                        type: 'doubleRange',
                        fieldName: 'ratings.critics_score',
                        max: 85
                    }
                ]
            }));
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < filtered.length; ++i) {
                chai_1.assert.equal(filtered[i].id, expected[i], 'filter at #' + i);
            }
        }),
        it('filter movies without DVD release', function () {
            var testdata = movies_data_1.makeMovies();
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'null',
                fieldName: 'release_dates.dvd',
                isNull: true
            }));
            var expected = testdata.filter(function (movie) {
                /* jshint -W106 */
                return !movie.release_dates.dvd;
            });
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < expected.length; ++i) {
                chai_1.assert.equal(filtered[i], expected[i], 'filter at #' + i);
            }
        }),
        it('filter movies with links containing key similar', function () {
            var testdata = movies_data_1.makeMovies();
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
                type: 'stringMap',
                fieldName: 'links',
                key: 'similar'
            }));
            var expected = testdata.filter(function (movie) {
                /* jshint -W106 */
                return movie.links && Object.keys(movie.links).indexOf('similar') >= 0;
            });
            chai_1.assert.isTrue(expected.length > 0);
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < expected.length; ++i) {
                chai_1.assert.equal(filtered[i], expected[i], 'filter at #' + i);
            }
        }),
        it('filter movies with links containing value http://api.rottentomatoes.com/api/public/v1.0/movies/771324839/similar.json', function () {
            var testdata = movies_data_1.makeMovies();
            var filtered = testdata.filter(JsonFilterVisitor_1.jsonFilter({
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
            chai_1.assert.isTrue(expected.length > 0);
            chai_1.assert.equal(filtered.length, expected.length, 'expected ' + expected.length + ' elements');
            for (var i = 0; i < expected.length; ++i) {
                chai_1.assert.equal(filtered[i], expected[i], 'filter at #' + i);
            }
        })
    ];
});
//# sourceMappingURL=JsonFilterVisitor.spec.js.map