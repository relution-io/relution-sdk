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
            }(Model_1.Model));
            ;
            Developer.prototype.idAttribute = '_id';
            Developer.prototype.entity = 'Developer';
            TEST.Developer = Developer;
            chai_1.assert.ok(typeof TEST.Developer === 'function', 'Developer model successfully extended.');
            var DeveloperCollection = (function (_super) {
                __extends(DeveloperCollection, _super);
                function DeveloperCollection() {
                    _super.apply(this, arguments);
                }
                return DeveloperCollection;
            }(Collection_1.Collection));
            ;
            DeveloperCollection.prototype.url = TEST.url;
            DeveloperCollection.prototype.model = TEST.Developer;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL0NvbGxlY3Rpb24uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRTVCLHNCQUFvQixTQUFTLENBQUMsQ0FBQTtBQUM5QiwyQkFBdUMsY0FBYyxDQUFDLENBQUE7QUFDdEQsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBRTlCLElBQUksSUFBSSxHQUFRLEVBQUUsQ0FBQztBQUNuQixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLCtCQUErQixDQUFDO0FBQ3pFLElBQUksQ0FBQyxJQUFJLEdBQUc7SUFDVjtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxNQUFNO1FBQ2hCLFNBQVMsRUFBRSxRQUFRO1FBQ25CLEdBQUcsRUFBRSxFQUFFO0tBQ1I7Q0FDRixDQUFDO0FBRUYsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxjQUFjLEVBQUU7WUFDakIs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Q0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSBsaXZlZGF0YS9Db2xsZWN0aW9uLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XG5cbnZhciBURVNUOiBhbnkgPSB7fTtcblRFU1QudXJsID0gKGdsb2JhbFsnc2VydmVyVXJsJ10gfHwgJycpICsgJy9yZWx1dGlvbi9saXZlZGF0YS9kZXZlbG9wZXJzJztcblRFU1QuZGF0YSA9IFtcbiAge1xuICAgIHN1cmVOYW1lOiAnTGF1YmFjaCcsXG4gICAgZmlyc3ROYW1lOiAnRG9taW5paycsXG4gICAgYWdlOiAyN1xuICB9LFxuICB7XG4gICAgc3VyZU5hbWU6ICdIYW5vd3NraScsXG4gICAgZmlyc3ROYW1lOiAnTWFyY28nLFxuICAgIGFnZTogMjdcbiAgfSxcbiAge1xuICAgIHN1cmVOYW1lOiAnU3RpZXJsZScsXG4gICAgZmlyc3ROYW1lOiAnRnJhbmsnLFxuICAgIGFnZTogNDNcbiAgfSxcbiAge1xuICAgIHN1cmVOYW1lOiAnV2VybGVyJyxcbiAgICBmaXJzdE5hbWU6ICdTZWJhc3RpYW4nLFxuICAgIGFnZTogMzBcbiAgfSxcbiAge1xuICAgIHN1cmVOYW1lOiAnQnVjaycsXG4gICAgZmlyc3ROYW1lOiAnU3RlZmFuJyxcbiAgICBhZ2U6IDI2XG4gIH1cbl07XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdpc0NvbGxlY3Rpb24nLCAoKSA9PiB7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24odW5kZWZpbmVkKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24obnVsbCkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKCcnKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oMCkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKDEpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbih7fSkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKFtdKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oQ29sbGVjdGlvbikpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKE1vZGVsKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oU3RvcmUpKTtcbiAgICB9KSxcblxuICAgIGl0KCdiYXNpYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoQ29sbGVjdGlvbik7XG4gICAgICBhc3NlcnQuaXNGdW5jdGlvbihDb2xsZWN0aW9uKTtcblxuICAgICAgdmFyIGluc3RhbmNlID0gbmV3IENvbGxlY3Rpb24oKTtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoaW5zdGFuY2UpO1xuICAgICAgYXNzZXJ0LmlzT2JqZWN0KGluc3RhbmNlKTtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoaW5zdGFuY2UuX3R5cGUpO1xuICAgICAgYXNzZXJ0LmlzU3RyaW5nKGluc3RhbmNlLl90eXBlKTtcbiAgICAgIGFzc2VydC5lcXVhbChpbnN0YW5jZS5fdHlwZSwgJ1JlbHV0aW9uLmxpdmVkYXRhLkNvbGxlY3Rpb24nKTtcbiAgICB9KSxcblxuICAgIGl0KCdjcmVhdGluZyBjb2xsZWN0aW9uJywgZnVuY3Rpb24gKCkge1xuICAgICAgYXNzZXJ0LnR5cGVPZihDb2xsZWN0aW9uLCAnZnVuY3Rpb24nLCAnQ29sbGVjdGlvbiBpcyBkZWZpbmVkJyk7XG5cbiAgICAgIGNsYXNzIERldmVsb3BlciBleHRlbmRzIE1vZGVsIHt9O1xuICAgICAgRGV2ZWxvcGVyLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdfaWQnO1xuICAgICAgRGV2ZWxvcGVyLnByb3RvdHlwZS5lbnRpdHkgPSAnRGV2ZWxvcGVyJztcbiAgICAgIFRFU1QuRGV2ZWxvcGVyID0gRGV2ZWxvcGVyO1xuXG4gICAgICBhc3NlcnQub2sodHlwZW9mIFRFU1QuRGV2ZWxvcGVyID09PSAnZnVuY3Rpb24nLCAnRGV2ZWxvcGVyIG1vZGVsIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcblxuICAgICAgY2xhc3MgRGV2ZWxvcGVyQ29sbGVjdGlvbiBleHRlbmRzIENvbGxlY3Rpb24ge307XG4gICAgICBEZXZlbG9wZXJDb2xsZWN0aW9uLnByb3RvdHlwZS51cmwgPSBURVNULnVybDtcbiAgICAgIERldmVsb3BlckNvbGxlY3Rpb24ucHJvdG90eXBlLm1vZGVsID0gVEVTVC5EZXZlbG9wZXI7XG4gICAgICBURVNULkRldmVsb3BlckNvbGxlY3Rpb24gPSBEZXZlbG9wZXJDb2xsZWN0aW9uO1xuXG4gICAgICBhc3NlcnQub2sodHlwZW9mIFRFU1QuRGV2ZWxvcGVyQ29sbGVjdGlvbiA9PT0gJ2Z1bmN0aW9uJywgJ0RldmVsb3BlciBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBleHRlbmRlZC4nKTtcblxuICAgICAgVEVTVC5EZXZlbG9wZXJzID0gbmV3IFRFU1QuRGV2ZWxvcGVyQ29sbGVjdGlvbigpO1xuXG4gICAgICBhc3NlcnQub2sodHlwZW9mIFRFU1QuRGV2ZWxvcGVycyA9PT0gJ29iamVjdCcsICdEZXZlbG9wZXIgY29sbGVjdGlvbiBzdWNjZXNzZnVsbHkgY3JlYXRlZC4nKTtcbiAgICB9KSxcblxuICAgIGl0KCdhZGRpbmcgZGF0YScsIGZ1bmN0aW9uICgpIHtcbiAgICAgIFRFU1QuRGV2ZWxvcGVycy5hZGQoVEVTVC5kYXRhKTtcblxuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuRGV2ZWxvcGVycy5sZW5ndGgsIDUsICdBbGwgcmVjb3JkcyB3ZXJlIGFkZGVkLicpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5EZXZlbG9wZXJzLmF0KDIpLmdldCgnc3VyZU5hbWUnKSwgVEVTVC5kYXRhWzJdLnN1cmVOYW1lLCAnc3VyZU5hbWUgb2YgMy4gbW9kZWwgaGFzIGNvcnJlY3QgdmFsdWUnKTtcbiAgICAgIGFzc2VydC5lcXVhbChURVNULkRldmVsb3BlcnMuYXQoMykuZ2V0KCdmaXJzdE5hbWUnKSwgVEVTVC5kYXRhWzNdLmZpcnN0TmFtZSwgJ2ZpcnN0TmFtZSBvZiA0LiBtb2RlbCBoYXMgY29ycmVjdCB2YWx1ZScpO1xuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuRGV2ZWxvcGVycy5hdCg0KS5nZXQoJ2FnZScpLCBURVNULmRhdGFbNF0uYWdlLCAnYWdlIG9mIDUuIG1vZGVsIGhhcyBjb3JyZWN0IHZhbHVlJyk7XG5cbiAgICAgIGFzc2VydC5vayhURVNULkRldmVsb3Blci5wcm90b3R5cGUuaXNQcm90b3R5cGVPZihURVNULkRldmVsb3BlcnMuYXQoMCkpLCAnUmVjb3JkcyBzdWNjZXNzZnVsbHkgY29udmVydGVkIHRvIG1vZGVsIHJlY29yZHMuJyk7XG5cbiAgICB9KSxcblxuICAgIGl0KCdzb3J0aW5nIGRhdGEnLCBmdW5jdGlvbiAoKSB7XG5cbiAgICAgIFRFU1QuRGV2ZWxvcGVycy5jb21wYXJhdG9yID0gZnVuY3Rpb24gKG0xOiBNb2RlbCwgbTI6IE1vZGVsKSB7XG4gICAgICAgIHJldHVybiBtMi5nZXQoJ2FnZScpIC0gbTEuZ2V0KCdhZ2UnKTtcbiAgICAgIH07XG4gICAgICBURVNULkRldmVsb3BlcnMuc29ydCgpO1xuXG4gICAgICB2YXIgcDIgPSBURVNULkRldmVsb3BlcnMuYXQoMCk7XG4gICAgICBhc3NlcnQub2socDIuZ2V0KCdzdXJlTmFtZScpID09PSAnU3RpZXJsZScsICdSZWNvcmRzIGNvcnJlY3RseSBzb3J0ZWQgYnkgcGFzc2VkIGluIHNvcnQgZnVuY3Rpb24nKTtcblxuICAgIH0pLFxuXG4gICAgaXQoJ2ZpbHRlcmluZyBkYXRhJywgZnVuY3Rpb24gKCkge1xuICAgICAgLy8gZmlsdGVyIGFsbCBkZXZzIG9sZGVyIG9yIGVxdWFsIHRvIDI2XG4gICAgICB2YXIgYTEgPSBURVNULkRldmVsb3BlcnMuZmlsdGVyKGZ1bmN0aW9uIChyZWM6IE1vZGVsKSB7XG4gICAgICAgIHJldHVybiByZWMuZ2V0KCdhZ2UnKSA+PSAyNjtcbiAgICAgIH0pO1xuXG4gICAgICBhc3NlcnQub2soYTEubGVuZ3RoID09PSA1LCAnUmVjb3JkcyBzdWNjZXNzZnVsbHkgZmlsdGVyZWQuIEV2ZXJ5b25lIGlzIDI2IG9yIG9sZGVyLicpO1xuXG4gICAgICAvLyBmaWx0ZXIgYWxsIGRldnMgb2xkZXIgdGhhbiAyNlxuICAgICAgdmFyIGEyID0gVEVTVC5EZXZlbG9wZXJzLmZpbHRlcihmdW5jdGlvbiAocmVjOiBNb2RlbCkge1xuICAgICAgICByZXR1cm4gcmVjLmdldCgnYWdlJykgPiAyNjtcbiAgICAgIH0pO1xuXG4gICAgICBhc3NlcnQub2soYTIubGVuZ3RoID09PSA0LCAnUmVjb3JkcyBzdWNjZXNzZnVsbHkgZmlsdGVyZWQuIE9uZSBkZXYgaXMgeW91bmdlciB0aGFuIDI3LicpO1xuXG4gICAgfSlcblxuICBdO1xufSk7XG4iXX0=