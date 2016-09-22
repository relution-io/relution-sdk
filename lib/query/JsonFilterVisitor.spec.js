/*
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
/**
 * @module query
 */
/** */
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSnNvbkZpbHRlclZpc2l0b3Iuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9xdWVyeS9Kc29uRmlsdGVyVmlzaXRvci5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRzVCLGtDQUF5QixxQkFBcUIsQ0FBQyxDQUFBO0FBQy9DLDRCQUF5QixlQUFlLENBQUMsQ0FBQTtBQUV6QyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsSUFBSSxVQUFVLEVBQUU7SUFDdEMsTUFBTSxDQUFDO1FBRUwsRUFBRSxDQUFDLHFCQUFxQixFQUFFO1lBQ3hCLElBQUksUUFBUSxHQUFHLHdCQUFVLEVBQUUsQ0FBQztZQUM1QixJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVCLElBQUksUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsOEJBQVUsQ0FBc0I7Z0JBQzdELElBQUksRUFBRSxPQUFPO2dCQUNiLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE9BQU8sRUFBRTtvQkFDZTt3QkFDcEIsVUFBVTt3QkFDVixJQUFJLEVBQUUsUUFBUTt3QkFDZCxTQUFTLEVBQUUsSUFBSTt3QkFDZixLQUFLLEVBQUUsV0FBVztxQkFDbkI7b0JBQ3FCO3dCQUNwQixpQkFBaUI7d0JBQ2pCLElBQUksRUFBRSxRQUFRO3dCQUNkLFNBQVMsRUFBRSxJQUFJO3dCQUNmLEtBQUssRUFBRSxXQUFXO3FCQUNuQjtvQkFDeUI7d0JBQ3hCLElBQUksRUFBRSxZQUFZO3dCQUNsQixTQUFTLEVBQUUsSUFBSTt3QkFDZixNQUFNLEVBQUU7NEJBQ04sV0FBVzs0QkFDWCxXQUFXOzRCQUNYLFdBQVcsQ0FBRyxVQUFVO3lCQUN6QjtxQkFDRjtvQkFDcUI7d0JB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QU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNuQyxhQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sRUFBRSxXQUFXLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsQ0FBQztZQUM1RixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsYUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxDQUFDO1FBQ0gsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIHF1ZXJ5L0pzb25GaWx0ZXJWaXNpdG9yLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDIzLjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBxdWVyeVxuICovXG4vKiogKi9cblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQgKiBhcyBmaWx0ZXJzIGZyb20gJy4vRmlsdGVyJztcbmltcG9ydCB7anNvbkZpbHRlcn0gZnJvbSAnLi9Kc29uRmlsdGVyVmlzaXRvcic7XG5pbXBvcnQge21ha2VNb3ZpZXN9IGZyb20gJy4vbW92aWVzLmRhdGEnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnZmlsdGVyIG1vdmllcyBieSBpZCcsICgpID0+IHtcbiAgICAgIHZhciB0ZXN0ZGF0YSA9IG1ha2VNb3ZpZXMoKTtcbiAgICAgIHZhciBleHBlY3RlZCA9IFsxLCAzLCA1LCA4XTtcbiAgICAgIHZhciBmaWx0ZXJlZCA9IHRlc3RkYXRhLmZpbHRlcihqc29uRmlsdGVyKDxmaWx0ZXJzLkxvZ09wRmlsdGVyPntcbiAgICAgICAgdHlwZTogJ2xvZ09wJyxcbiAgICAgICAgb3BlcmF0aW9uOiAnb3InLFxuICAgICAgICBmaWx0ZXJzOiBbXG4gICAgICAgICAgPGZpbHRlcnMuU3RyaW5nRmlsdGVyPntcbiAgICAgICAgICAgIC8vIGluZGV4IDNcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgZmllbGROYW1lOiAnaWQnLFxuICAgICAgICAgICAgdmFsdWU6ICc3NzEzNzA0NjcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICA8ZmlsdGVycy5TdHJpbmdGaWx0ZXI+e1xuICAgICAgICAgICAgLy8gZG9lcyBub3QgZXhpc3RcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmcnLFxuICAgICAgICAgICAgZmllbGROYW1lOiAnaWQnLFxuICAgICAgICAgICAgdmFsdWU6ICc0NzExMDAwMDAnXG4gICAgICAgICAgfSxcbiAgICAgICAgICA8ZmlsdGVycy5TdHJpbmdFbnVtRmlsdGVyPntcbiAgICAgICAgICAgIHR5cGU6ICdzdHJpbmdFbnVtJyxcbiAgICAgICAgICAgIGZpZWxkTmFtZTogJ2lkJyxcbiAgICAgICAgICAgIHZhbHVlczogW1xuICAgICAgICAgICAgICAnNzcxMzU2Njk2JywgIC8vIGluZGV4IDVcbiAgICAgICAgICAgICAgJzI4MTE3ODAwMCcsICAvLyBkb2VzIG5vdCBleGlzdFxuICAgICAgICAgICAgICAnNzcxMzEzOTYyJyAgIC8vIGluZGV4IDhcbiAgICAgICAgICAgIF1cbiAgICAgICAgICB9LFxuICAgICAgICAgIDxmaWx0ZXJzLlN0cmluZ0ZpbHRlcj57XG4gICAgICAgICAgICAvLyBpbmRleCAxXG4gICAgICAgICAgICB0eXBlOiAnc3RyaW5nJyxcbiAgICAgICAgICAgIGZpZWxkTmFtZTogJ2lkJyxcbiAgICAgICAgICAgIHZhbHVlOiAnNzcxMzc0NDMyJ1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfSkpO1xuICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkLmxlbmd0aCwgZXhwZWN0ZWQubGVuZ3RoLCAnZXhwZWN0ZWQgJyArIGV4cGVjdGVkLmxlbmd0aCArICcgZWxlbWVudHMnKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZmlsdGVyZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkW2ldLCB0ZXN0ZGF0YVtleHBlY3RlZFtpXV0sICdmaWx0ZXIgYXQgIycgKyBpKTtcbiAgICAgIH1cbiAgICB9KSxcblxuICAgIGl0KCdmaWx0ZXIgbW92aWVzIGxpa2UgRm9yZCcsICgpID0+IHtcbiAgICAgIHZhciB0ZXN0ZGF0YSA9IG1ha2VNb3ZpZXMoKTtcbiAgICAgIHZhciBleHBlY3RlZCA9IFsnNzcxMzczMTQ5JywgJzc3MTQxMDY1OCddO1xuICAgICAgdmFyIGZpbHRlcmVkID0gdGVzdGRhdGEuZmlsdGVyKGpzb25GaWx0ZXIoPGZpbHRlcnMuTGlrZUZpbHRlcj57XG4gICAgICAgIHR5cGU6ICdsaWtlJyxcbiAgICAgICAgZmllbGROYW1lOiAnYWJyaWRnZWRfY2FzdFsqXS5uYW1lJyxcbiAgICAgICAgbGlrZTogJyVGb3JkJSdcbiAgICAgIH0pKTtcbiAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZC5sZW5ndGgsIGV4cGVjdGVkLmxlbmd0aCwgJ2V4cGVjdGVkICcgKyBleHBlY3RlZC5sZW5ndGggKyAnIGVsZW1lbnRzJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZFtpXS5pZCwgZXhwZWN0ZWRbaV0sICdmaWx0ZXIgYXQgIycgKyBpKTtcbiAgICAgIH1cbiAgICB9KSxcblxuICAgIGl0KCdmaWx0ZXIgbW92aWVzIGNvbnRhaW5pbmcgSGFycmlzJywgKCkgPT4ge1xuICAgICAgdmFyIHRlc3RkYXRhID0gbWFrZU1vdmllcygpO1xuICAgICAgdmFyIGV4cGVjdGVkID0gWyc3NzEzNjQ3MjInLCAnNzcxMzczMTQ5JywgJzc3MTQxMDY1OCddO1xuICAgICAgdmFyIGZpbHRlcmVkID0gdGVzdGRhdGEuZmlsdGVyKGpzb25GaWx0ZXIoPGZpbHRlcnMuQ29udGFpbnNTdHJpbmdGaWx0ZXI+e1xuICAgICAgICB0eXBlOiAnY29udGFpbnNTdHJpbmcnLFxuICAgICAgICBmaWVsZE5hbWU6ICdhYnJpZGdlZF9jYXN0WypdLm5hbWUnLFxuICAgICAgICBjb250YWluczogJ0hhcnJpcydcbiAgICAgIH0pKTtcbiAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZC5sZW5ndGgsIGV4cGVjdGVkLmxlbmd0aCwgJ2V4cGVjdGVkICcgKyBleHBlY3RlZC5sZW5ndGggKyAnIGVsZW1lbnRzJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpbHRlcmVkLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZFtpXS5pZCwgZXhwZWN0ZWRbaV0sICdmaWx0ZXIgYXQgIycgKyBpKTtcbiAgICAgIH1cbiAgICB9KSxcblxuICAgIGl0KCdmaWx0ZXIgbW92aWVzIHdpdGggY3JpdGljcyBzY29yZSBbNzA7ODVdJywgKCkgPT4ge1xuICAgICAgdmFyIHRlc3RkYXRhID0gbWFrZU1vdmllcygpO1xuICAgICAgdmFyIGV4cGVjdGVkID0gWyc3NzEzMjQ4MzknLCAnNzcxMzEzOTYyJywgJzc3MTM2ODI2OScsICc3NzEzNTQ5MjInLCAnNzcxNDEyMDc1JywgJzc3MTM1NzExNCcsICc3NzEzODU4NDgnXTtcbiAgICAgIHZhciBmaWx0ZXJlZCA9IHRlc3RkYXRhLmZpbHRlcihqc29uRmlsdGVyKDxmaWx0ZXJzLkxvZ09wRmlsdGVyPntcbiAgICAgICAgdHlwZTogJ2xvZ09wJyxcbiAgICAgICAgb3BlcmF0aW9uOiAnYW5kJyxcbiAgICAgICAgZmlsdGVyczogW1xuICAgICAgICAgIDxmaWx0ZXJzLkxvbmdSYW5nZUZpbHRlcj57XG4gICAgICAgICAgICB0eXBlOiAnbG9uZ1JhbmdlJyxcbiAgICAgICAgICAgIGZpZWxkTmFtZTogJ3JhdGluZ3MuY3JpdGljc19zY29yZScsXG4gICAgICAgICAgICBtaW46IDcwLFxuICAgICAgICAgICAgbWF4OiA4OFxuICAgICAgICAgIH0sXG4gICAgICAgICAgPGZpbHRlcnMuRG91YmxlUmFuZ2VGaWx0ZXI+e1xuICAgICAgICAgICAgdHlwZTogJ2RvdWJsZVJhbmdlJyxcbiAgICAgICAgICAgIGZpZWxkTmFtZTogJ3JhdGluZ3MuY3JpdGljc19zY29yZScsXG4gICAgICAgICAgICBtYXg6IDg1XG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9KSk7XG4gICAgICBhc3NlcnQuZXF1YWwoZmlsdGVyZWQubGVuZ3RoLCBleHBlY3RlZC5sZW5ndGgsICdleHBlY3RlZCAnICsgZXhwZWN0ZWQubGVuZ3RoICsgJyBlbGVtZW50cycpO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmaWx0ZXJlZC5sZW5ndGg7ICsraSkge1xuICAgICAgICBhc3NlcnQuZXF1YWwoZmlsdGVyZWRbaV0uaWQsIGV4cGVjdGVkW2ldLCAnZmlsdGVyIGF0ICMnICsgaSk7XG4gICAgICB9XG4gICAgfSksXG5cbiAgICBpdCgnZmlsdGVyIG1vdmllcyB3aXRob3V0IERWRCByZWxlYXNlJywgKCkgPT4ge1xuICAgICAgdmFyIHRlc3RkYXRhID0gbWFrZU1vdmllcygpO1xuICAgICAgdmFyIGZpbHRlcmVkID0gdGVzdGRhdGEuZmlsdGVyKGpzb25GaWx0ZXIoPGZpbHRlcnMuTnVsbEZpbHRlcj57XG4gICAgICAgIHR5cGU6ICdudWxsJyxcbiAgICAgICAgZmllbGROYW1lOiAncmVsZWFzZV9kYXRlcy5kdmQnLFxuICAgICAgICBpc051bGw6IHRydWVcbiAgICAgIH0pKTtcbiAgICAgIHZhciBleHBlY3RlZCA9IHRlc3RkYXRhLmZpbHRlcihmdW5jdGlvbiAobW92aWUpIHtcbiAgICAgICAgLyoganNoaW50IC1XMTA2ICovXG4gICAgICAgIHJldHVybiAhbW92aWUucmVsZWFzZV9kYXRlcy5kdmQ7XG4gICAgICB9KTtcbiAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZC5sZW5ndGgsIGV4cGVjdGVkLmxlbmd0aCwgJ2V4cGVjdGVkICcgKyBleHBlY3RlZC5sZW5ndGggKyAnIGVsZW1lbnRzJyk7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGV4cGVjdGVkLmxlbmd0aDsgKytpKSB7XG4gICAgICAgIGFzc2VydC5lcXVhbChmaWx0ZXJlZFtpXSwgZXhwZWN0ZWRbaV0sICdmaWx0ZXIgYXQgIycgKyBpKTtcbiAgICAgIH1cbiAgICB9KSxcblxuICAgIGl0KCdmaWx0ZXIgbW92aWVzIHdpdGggbGlua3MgY29udGFpbmluZyBrZXkgc2ltaWxhcicsICgpID0+IHtcbiAgICAgIHZhciB0ZXN0ZGF0YSA9IG1ha2VNb3ZpZXMoKTtcbiAgICAgIHZhciBmaWx0ZXJlZCA9IHRlc3RkYXRhLmZpbHRlcihqc29uRmlsdGVyKDxmaWx0ZXJzLlN0cmluZ01hcEZpbHRlcj57XG4gICAgICAgIHR5cGU6ICdzdHJpbmdNYXAnLFxuICAgICAgICBmaWVsZE5hbWU6ICdsaW5rcycsXG4gICAgICAgIGtleTogJ3NpbWlsYXInXG4gICAgICB9KSk7XG4gICAgICB2YXIgZXhwZWN0ZWQgPSB0ZXN0ZGF0YS5maWx0ZXIoZnVuY3Rpb24gKG1vdmllKSB7XG4gICAgICAgIC8qIGpzaGludCAtVzEwNiAqL1xuICAgICAgICByZXR1cm4gbW92aWUubGlua3MgJiYgT2JqZWN0LmtleXMobW92aWUubGlua3MpLmluZGV4T2YoJ3NpbWlsYXInKSA+PSAwO1xuICAgICAgfSk7XG4gICAgICBhc3NlcnQuaXNUcnVlKGV4cGVjdGVkLmxlbmd0aCA+IDApO1xuICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkLmxlbmd0aCwgZXhwZWN0ZWQubGVuZ3RoLCAnZXhwZWN0ZWQgJyArIGV4cGVjdGVkLmxlbmd0aCArICcgZWxlbWVudHMnKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhwZWN0ZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkW2ldLCBleHBlY3RlZFtpXSwgJ2ZpbHRlciBhdCAjJyArIGkpO1xuICAgICAgfVxuICAgIH0pLFxuXG4gICAgaXQoJ2ZpbHRlciBtb3ZpZXMgd2l0aCBsaW5rcyBjb250YWluaW5nIHZhbHVlIGh0dHA6Ly9hcGkucm90dGVudG9tYXRvZXMuY29tL2FwaS9wdWJsaWMvdjEuMC9tb3ZpZXMvNzcxMzI0ODM5L3NpbWlsYXIuanNvbicsICgpID0+IHtcbiAgICAgIHZhciB0ZXN0ZGF0YSA9IG1ha2VNb3ZpZXMoKTtcbiAgICAgIHZhciBmaWx0ZXJlZCA9IHRlc3RkYXRhLmZpbHRlcihqc29uRmlsdGVyKDxmaWx0ZXJzLlN0cmluZ01hcEZpbHRlcj57XG4gICAgICAgIHR5cGU6ICdzdHJpbmdNYXAnLFxuICAgICAgICBmaWVsZE5hbWU6ICdsaW5rcycsXG4gICAgICAgIHZhbHVlOiAnaHR0cDovL2FwaS5yb3R0ZW50b21hdG9lcy5jb20vYXBpL3B1YmxpYy92MS4wL21vdmllcy83NzEzMjQ4Mzkvc2ltaWxhci5qc29uJ1xuICAgICAgfSkpO1xuICAgICAgdmFyIGV4cGVjdGVkID0gdGVzdGRhdGEuZmlsdGVyKGZ1bmN0aW9uIChtb3ZpZSkge1xuICAgICAgICAvKiBqc2hpbnQgLVcxMDYgKi9cbiAgICAgICAgZm9yICh2YXIga2V5IGluIG1vdmllLmxpbmtzIHx8IHt9KSB7XG4gICAgICAgICAgaWYgKG1vdmllLmxpbmtzW2tleV0gPT09ICdodHRwOi8vYXBpLnJvdHRlbnRvbWF0b2VzLmNvbS9hcGkvcHVibGljL3YxLjAvbW92aWVzLzc3MTMyNDgzOS9zaW1pbGFyLmpzb24nKSB7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSk7XG4gICAgICBhc3NlcnQuaXNUcnVlKGV4cGVjdGVkLmxlbmd0aCA+IDApO1xuICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkLmxlbmd0aCwgZXhwZWN0ZWQubGVuZ3RoLCAnZXhwZWN0ZWQgJyArIGV4cGVjdGVkLmxlbmd0aCArICcgZWxlbWVudHMnKTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhwZWN0ZWQubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKGZpbHRlcmVkW2ldLCBleHBlY3RlZFtpXSwgJ2ZpbHRlciBhdCAjJyArIGkpO1xuICAgICAgfVxuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19