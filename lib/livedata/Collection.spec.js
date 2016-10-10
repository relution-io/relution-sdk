/*
 * @file livedata/Collection.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.06.2016
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
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
var TEST = {};
TEST.url = (global['serverUrl'] || '') + '/relution/livedata/developers';
TEST.data = [
    {
        sureName: 'Laubach',
        firstName: 'Dominik',
        age: 27
    },
    {
        sureName: 'Hanowski',
        firstName: 'Marco',
        age: 27
    },
    {
        sureName: 'Stierle',
        firstName: 'Frank',
        age: 43
    },
    {
        sureName: 'Werler',
        firstName: 'Sebastian',
        age: 30
    },
    {
        sureName: 'Buck',
        firstName: 'Stefan',
        age: 26
    }
];
describe(module.filename || __filename, function () {
    return [
        it('isCollection', function () {
            chai_1.assert.isFalse(Collection_1.isCollection(undefined));
            chai_1.assert.isFalse(Collection_1.isCollection(null));
            chai_1.assert.isFalse(Collection_1.isCollection(''));
            chai_1.assert.isFalse(Collection_1.isCollection(0));
            chai_1.assert.isFalse(Collection_1.isCollection(1));
            chai_1.assert.isFalse(Collection_1.isCollection({}));
            chai_1.assert.isFalse(Collection_1.isCollection([]));
            chai_1.assert.isFalse(Collection_1.isCollection(Collection_1.Collection));
            chai_1.assert.isFalse(Collection_1.isCollection(Model_1.Model));
            chai_1.assert.isFalse(Collection_1.isCollection(Store_1.Store));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Collection_1.Collection);
            chai_1.assert.isFunction(Collection_1.Collection);
            var instance = new Collection_1.Collection();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Collection');
        }),
        it('creating collection', function () {
            chai_1.assert.typeOf(Collection_1.Collection, 'function', 'Collection is defined');
            var Developer = (function (_super) {
                __extends(Developer, _super);
                function Developer() {
                    _super.apply(this, arguments);
                }
                return Developer;
            }(Model_1.Model.defaults({
                idAttribute: '_id',
                entity: 'Developer'
            })));
            TEST.Developer = Developer;
            chai_1.assert.ok(typeof TEST.Developer === 'function', 'Developer model successfully extended.');
            var DeveloperCollection = (function (_super) {
                __extends(DeveloperCollection, _super);
                function DeveloperCollection() {
                    _super.apply(this, arguments);
                }
                return DeveloperCollection;
            }(Collection_1.Collection.defaults({
                url: TEST.url,
                model: TEST.Developer
            })));
            ;
            TEST.DeveloperCollection = DeveloperCollection;
            chai_1.assert.ok(typeof TEST.DeveloperCollection === 'function', 'Developer collection successfully extended.');
            TEST.Developers = new TEST.DeveloperCollection();
            chai_1.assert.ok(typeof TEST.Developers === 'object', 'Developer collection successfully created.');
        }),
        it('adding data', function () {
            TEST.Developers.add(TEST.data);
            chai_1.assert.equal(TEST.Developers.length, 5, 'All records were added.');
            chai_1.assert.equal(TEST.Developers.at(2).get('sureName'), TEST.data[2].sureName, 'sureName of 3. model has correct value');
            chai_1.assert.equal(TEST.Developers.at(3).get('firstName'), TEST.data[3].firstName, 'firstName of 4. model has correct value');
            chai_1.assert.equal(TEST.Developers.at(4).get('age'), TEST.data[4].age, 'age of 5. model has correct value');
            chai_1.assert.ok(TEST.Developer.prototype.isPrototypeOf(TEST.Developers.at(0)), 'Records successfully converted to model records.');
        }),
        it('sorting data', function () {
            TEST.Developers.comparator = function (m1, m2) {
                return m2.get('age') - m1.get('age');
            };
            TEST.Developers.sort();
            var p2 = TEST.Developers.at(0);
            chai_1.assert.ok(p2.get('sureName') === 'Stierle', 'Records correctly sorted by passed in sort function');
        }),
        it('filtering data', function () {
            // filter all devs older or equal to 26
            var a1 = TEST.Developers.filter(function (rec) {
                return rec.get('age') >= 26;
            });
            chai_1.assert.ok(a1.length === 5, 'Records successfully filtered. Everyone is 26 or older.');
            // filter all devs older than 26
            var a2 = TEST.Developers.filter(function (rec) {
                return rec.get('age') > 26;
            });
            chai_1.assert.ok(a2.length === 4, 'Records successfully filtered. One dev is younger than 27.');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL0NvbGxlY3Rpb24uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRTVCLHNCQUFvQixTQUFTLENBQUMsQ0FBQTtBQUM5QiwyQkFBdUMsY0FBYyxDQUFDLENBQUE7QUFDdEQsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBRTlCLElBQUksSUFBSSxHQUFRLEVBQUUsQ0FBQztBQUNuQixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLCtCQUErQixDQUFDO0FBQ3pFLElBQUksQ0FBQyxJQUFJLEdBQUc7SUFDVjtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxNQUFNO1FBQ2hCLFNBQVMsRUFBRSxRQUFRO1FBQ25CLEdBQUcsRUFBRSxFQUFFO0tBQ1I7Q0FDRixDQUFDO0FBRUYsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxjQUFjLEVBQUU7WUFDakIs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cGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBsaXZlZGF0YVxyXG4gKi9cclxuLyoqICovXHJcblxyXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XHJcblxyXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcclxuaW1wb3J0IHtDb2xsZWN0aW9uLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XHJcbmltcG9ydCB7U3RvcmV9IGZyb20gJy4vU3RvcmUnO1xyXG5cclxudmFyIFRFU1Q6IGFueSA9IHt9O1xyXG5URVNULnVybCA9IChnbG9iYWxbJ3NlcnZlclVybCddIHx8ICcnKSArICcvcmVsdXRpb24vbGl2ZWRhdGEvZGV2ZWxvcGVycyc7XHJcblRFU1QuZGF0YSA9IFtcclxuICB7XHJcbiAgICBzdXJlTmFtZTogJ0xhdWJhY2gnLFxyXG4gICAgZmlyc3ROYW1lOiAnRG9taW5paycsXHJcbiAgICBhZ2U6IDI3XHJcbiAgfSxcclxuICB7XHJcbiAgICBzdXJlTmFtZTogJ0hhbm93c2tpJyxcclxuICAgIGZpcnN0TmFtZTogJ01hcmNvJyxcclxuICAgIGFnZTogMjdcclxuICB9LFxyXG4gIHtcclxuICAgIHN1cmVOYW1lOiAnU3RpZXJsZScsXHJcbiAgICBmaXJzdE5hbWU6ICdGcmFuaycsXHJcbiAgICBhZ2U6IDQzXHJcbiAgfSxcclxuICB7XHJcbiAgICBzdXJlTmFtZTogJ1dlcmxlcicsXHJcbiAgICBmaXJzdE5hbWU6ICdTZWJhc3RpYW4nLFxyXG4gICAgYWdlOiAzMFxyXG4gIH0sXHJcbiAge1xyXG4gICAgc3VyZU5hbWU6ICdCdWNrJyxcclxuICAgIGZpcnN0TmFtZTogJ1N0ZWZhbicsXHJcbiAgICBhZ2U6IDI2XHJcbiAgfVxyXG5dO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ2lzQ29sbGVjdGlvbicsICgpID0+IHtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKHVuZGVmaW5lZCkpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24obnVsbCkpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oJycpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKDApKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKDEpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKHt9KSk7XHJcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbihbXSkpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oQ29sbGVjdGlvbikpO1xyXG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oTW9kZWwpKTtcclxuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKFN0b3JlKSk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnYmFzaWMnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoQ29sbGVjdGlvbik7XHJcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKENvbGxlY3Rpb24pO1xyXG5cclxuICAgICAgdmFyIGluc3RhbmNlID0gbmV3IENvbGxlY3Rpb24oKTtcclxuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChpbnN0YW5jZSk7XHJcbiAgICAgIGFzc2VydC5pc09iamVjdChpbnN0YW5jZSk7XHJcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoaW5zdGFuY2UuX3R5cGUpO1xyXG4gICAgICBhc3NlcnQuaXNTdHJpbmcoaW5zdGFuY2UuX3R5cGUpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwoaW5zdGFuY2UuX3R5cGUsICdSZWx1dGlvbi5saXZlZGF0YS5Db2xsZWN0aW9uJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnY3JlYXRpbmcgY29sbGVjdGlvbicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgYXNzZXJ0LnR5cGVPZihDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnQ29sbGVjdGlvbiBpcyBkZWZpbmVkJyk7XHJcblxyXG4gICAgICBjbGFzcyBEZXZlbG9wZXIgZXh0ZW5kcyBNb2RlbC5kZWZhdWx0cyh7XHJcbiAgICAgICAgaWRBdHRyaWJ1dGU6ICdfaWQnLFxyXG4gICAgICAgIGVudGl0eTogJ0RldmVsb3BlcidcclxuICAgICAgfSkge31cclxuICAgICAgVEVTVC5EZXZlbG9wZXIgPSBEZXZlbG9wZXI7XHJcblxyXG4gICAgICBhc3NlcnQub2sodHlwZW9mIFRFU1QuRGV2ZWxvcGVyID09PSAnZnVuY3Rpb24nLCAnRGV2ZWxvcGVyIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcclxuXHJcbiAgICAgIGNsYXNzIERldmVsb3BlckNvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcclxuICAgICAgICB1cmw6IFRFU1QudXJsLFxyXG4gICAgICAgIG1vZGVsOiBURVNULkRldmVsb3BlclxyXG4gICAgICB9KSB7fTtcclxuICAgICAgVEVTVC5EZXZlbG9wZXJDb2xsZWN0aW9uID0gRGV2ZWxvcGVyQ29sbGVjdGlvbjtcclxuXHJcbiAgICAgIGFzc2VydC5vayh0eXBlb2YgVEVTVC5EZXZlbG9wZXJDb2xsZWN0aW9uID09PSAnZnVuY3Rpb24nLCAnRGV2ZWxvcGVyIGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xyXG5cclxuICAgICAgVEVTVC5EZXZlbG9wZXJzID0gbmV3IFRFU1QuRGV2ZWxvcGVyQ29sbGVjdGlvbigpO1xyXG5cclxuICAgICAgYXNzZXJ0Lm9rKHR5cGVvZiBURVNULkRldmVsb3BlcnMgPT09ICdvYmplY3QnLCAnRGV2ZWxvcGVyIGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGNyZWF0ZWQuJyk7XHJcbiAgICB9KSxcclxuXHJcbiAgICBpdCgnYWRkaW5nIGRhdGEnLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIFRFU1QuRGV2ZWxvcGVycy5hZGQoVEVTVC5kYXRhKTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbChURVNULkRldmVsb3BlcnMubGVuZ3RoLCA1LCAnQWxsIHJlY29yZHMgd2VyZSBhZGRlZC4nKTtcclxuXHJcbiAgICAgIGFzc2VydC5lcXVhbChURVNULkRldmVsb3BlcnMuYXQoMikuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGFbMl0uc3VyZU5hbWUsICdzdXJlTmFtZSBvZiAzLiBtb2RlbCBoYXMgY29ycmVjdCB2YWx1ZScpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5EZXZlbG9wZXJzLmF0KDMpLmdldCgnZmlyc3ROYW1lJyksIFRFU1QuZGF0YVszXS5maXJzdE5hbWUsICdmaXJzdE5hbWUgb2YgNC4gbW9kZWwgaGFzIGNvcnJlY3QgdmFsdWUnKTtcclxuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuRGV2ZWxvcGVycy5hdCg0KS5nZXQoJ2FnZScpLCBURVNULmRhdGFbNF0uYWdlLCAnYWdlIG9mIDUuIG1vZGVsIGhhcyBjb3JyZWN0IHZhbHVlJyk7XHJcblxyXG4gICAgICBhc3NlcnQub2soVEVTVC5EZXZlbG9wZXIucHJvdG90eXBlLmlzUHJvdG90eXBlT2YoVEVTVC5EZXZlbG9wZXJzLmF0KDApKSwgJ1JlY29yZHMgc3VjY2Vzc2Z1bGx5IGNvbnZlcnRlZCB0byBtb2RlbCByZWNvcmRzLicpO1xyXG5cclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdzb3J0aW5nIGRhdGEnLCBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICBURVNULkRldmVsb3BlcnMuY29tcGFyYXRvciA9IGZ1bmN0aW9uIChtMTogTW9kZWwsIG0yOiBNb2RlbCkge1xyXG4gICAgICAgIHJldHVybiBtMi5nZXQoJ2FnZScpIC0gbTEuZ2V0KCdhZ2UnKTtcclxuICAgICAgfTtcclxuICAgICAgVEVTVC5EZXZlbG9wZXJzLnNvcnQoKTtcclxuXHJcbiAgICAgIHZhciBwMiA9IFRFU1QuRGV2ZWxvcGVycy5hdCgwKTtcclxuICAgICAgYXNzZXJ0Lm9rKHAyLmdldCgnc3VyZU5hbWUnKSA9PT0gJ1N0aWVybGUnLCAnUmVjb3JkcyBjb3JyZWN0bHkgc29ydGVkIGJ5IHBhc3NlZCBpbiBzb3J0IGZ1bmN0aW9uJyk7XHJcblxyXG4gICAgfSksXHJcblxyXG4gICAgaXQoJ2ZpbHRlcmluZyBkYXRhJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAvLyBmaWx0ZXIgYWxsIGRldnMgb2xkZXIgb3IgZXF1YWwgdG8gMjZcclxuICAgICAgdmFyIGExID0gVEVTVC5EZXZlbG9wZXJzLmZpbHRlcihmdW5jdGlvbiAocmVjOiBNb2RlbCkge1xyXG4gICAgICAgIHJldHVybiByZWMuZ2V0KCdhZ2UnKSA+PSAyNjtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhc3NlcnQub2soYTEubGVuZ3RoID09PSA1LCAnUmVjb3JkcyBzdWNjZXNzZnVsbHkgZmlsdGVyZWQuIEV2ZXJ5b25lIGlzIDI2IG9yIG9sZGVyLicpO1xyXG5cclxuICAgICAgLy8gZmlsdGVyIGFsbCBkZXZzIG9sZGVyIHRoYW4gMjZcclxuICAgICAgdmFyIGEyID0gVEVTVC5EZXZlbG9wZXJzLmZpbHRlcihmdW5jdGlvbiAocmVjOiBNb2RlbCkge1xyXG4gICAgICAgIHJldHVybiByZWMuZ2V0KCdhZ2UnKSA+IDI2O1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGFzc2VydC5vayhhMi5sZW5ndGggPT09IDQsICdSZWNvcmRzIHN1Y2Nlc3NmdWxseSBmaWx0ZXJlZC4gT25lIGRldiBpcyB5b3VuZ2VyIHRoYW4gMjcuJyk7XHJcblxyXG4gICAgfSlcclxuXHJcbiAgXTtcclxufSk7XHJcbiJdfQ==