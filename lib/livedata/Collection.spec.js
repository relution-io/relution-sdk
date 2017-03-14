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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29sbGVjdGlvbi5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpdmVkYXRhL0NvbGxlY3Rpb24uc3BlYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOzs7Ozs7O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRTVCLHNCQUFvQixTQUFTLENBQUMsQ0FBQTtBQUM5QiwyQkFBdUMsY0FBYyxDQUFDLENBQUE7QUFDdEQsc0JBQW9CLFNBQVMsQ0FBQyxDQUFBO0FBRTlCLElBQUksSUFBSSxHQUFRLEVBQUUsQ0FBQztBQUNuQixJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLCtCQUErQixDQUFDO0FBQ3pFLElBQUksQ0FBQyxJQUFJLEdBQUc7SUFDVjtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxTQUFTO1FBQ3BCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxTQUFTO1FBQ25CLFNBQVMsRUFBRSxPQUFPO1FBQ2xCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLEdBQUcsRUFBRSxFQUFFO0tBQ1I7SUFDRDtRQUNFLFFBQVEsRUFBRSxNQUFNO1FBQ2hCLFNBQVMsRUFBRSxRQUFRO1FBQ25CLEdBQUcsRUFBRSxFQUFFO0tBQ1I7Q0FDRixDQUFDO0FBRUYsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxjQUFjLEVBQUU7WUFDakIs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Yy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5cbmltcG9ydCB7TW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtDb2xsZWN0aW9uLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcblxudmFyIFRFU1Q6IGFueSA9IHt9O1xuVEVTVC51cmwgPSAoZ2xvYmFsWydzZXJ2ZXJVcmwnXSB8fCAnJykgKyAnL3JlbHV0aW9uL2xpdmVkYXRhL2RldmVsb3BlcnMnO1xuVEVTVC5kYXRhID0gW1xuICB7XG4gICAgc3VyZU5hbWU6ICdMYXViYWNoJyxcbiAgICBmaXJzdE5hbWU6ICdEb21pbmlrJyxcbiAgICBhZ2U6IDI3XG4gIH0sXG4gIHtcbiAgICBzdXJlTmFtZTogJ0hhbm93c2tpJyxcbiAgICBmaXJzdE5hbWU6ICdNYXJjbycsXG4gICAgYWdlOiAyN1xuICB9LFxuICB7XG4gICAgc3VyZU5hbWU6ICdTdGllcmxlJyxcbiAgICBmaXJzdE5hbWU6ICdGcmFuaycsXG4gICAgYWdlOiA0M1xuICB9LFxuICB7XG4gICAgc3VyZU5hbWU6ICdXZXJsZXInLFxuICAgIGZpcnN0TmFtZTogJ1NlYmFzdGlhbicsXG4gICAgYWdlOiAzMFxuICB9LFxuICB7XG4gICAgc3VyZU5hbWU6ICdCdWNrJyxcbiAgICBmaXJzdE5hbWU6ICdTdGVmYW4nLFxuICAgIGFnZTogMjZcbiAgfVxuXTtcblxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xuICByZXR1cm4gW1xuXG4gICAgaXQoJ2lzQ29sbGVjdGlvbicsICgpID0+IHtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbih1bmRlZmluZWQpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbihudWxsKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oJycpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbigwKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oMSkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNDb2xsZWN0aW9uKHt9KSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oW10pKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbihDb2xsZWN0aW9uKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc0NvbGxlY3Rpb24oTW9kZWwpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzQ29sbGVjdGlvbihTdG9yZSkpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2Jhc2ljJywgZnVuY3Rpb24gKCkge1xuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChDb2xsZWN0aW9uKTtcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKENvbGxlY3Rpb24pO1xuXG4gICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgQ29sbGVjdGlvbigpO1xuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChpbnN0YW5jZSk7XG4gICAgICBhc3NlcnQuaXNPYmplY3QoaW5zdGFuY2UpO1xuICAgICAgYXNzZXJ0LmlzRGVmaW5lZChpbnN0YW5jZS5fdHlwZSk7XG4gICAgICBhc3NlcnQuaXNTdHJpbmcoaW5zdGFuY2UuX3R5cGUpO1xuICAgICAgYXNzZXJ0LmVxdWFsKGluc3RhbmNlLl90eXBlLCAnUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbicpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2NyZWF0aW5nIGNvbGxlY3Rpb24nLCBmdW5jdGlvbiAoKSB7XG4gICAgICBhc3NlcnQudHlwZU9mKENvbGxlY3Rpb24sICdmdW5jdGlvbicsICdDb2xsZWN0aW9uIGlzIGRlZmluZWQnKTtcblxuICAgICAgY2xhc3MgRGV2ZWxvcGVyIGV4dGVuZHMgTW9kZWwuZGVmYXVsdHMoe1xuICAgICAgICBpZEF0dHJpYnV0ZTogJ19pZCcsXG4gICAgICAgIGVudGl0eTogJ0RldmVsb3BlcidcbiAgICAgIH0pIHt9XG4gICAgICBURVNULkRldmVsb3BlciA9IERldmVsb3BlcjtcblxuICAgICAgYXNzZXJ0Lm9rKHR5cGVvZiBURVNULkRldmVsb3BlciA9PT0gJ2Z1bmN0aW9uJywgJ0RldmVsb3BlciBtb2RlbCBzdWNjZXNzZnVsbHkgZXh0ZW5kZWQuJyk7XG5cbiAgICAgIGNsYXNzIERldmVsb3BlckNvbGxlY3Rpb24gZXh0ZW5kcyBDb2xsZWN0aW9uLmRlZmF1bHRzKHtcbiAgICAgICAgdXJsOiBURVNULnVybCxcbiAgICAgICAgbW9kZWw6IFRFU1QuRGV2ZWxvcGVyXG4gICAgICB9KSB7fTtcbiAgICAgIFRFU1QuRGV2ZWxvcGVyQ29sbGVjdGlvbiA9IERldmVsb3BlckNvbGxlY3Rpb247XG5cbiAgICAgIGFzc2VydC5vayh0eXBlb2YgVEVTVC5EZXZlbG9wZXJDb2xsZWN0aW9uID09PSAnZnVuY3Rpb24nLCAnRGV2ZWxvcGVyIGNvbGxlY3Rpb24gc3VjY2Vzc2Z1bGx5IGV4dGVuZGVkLicpO1xuXG4gICAgICBURVNULkRldmVsb3BlcnMgPSBuZXcgVEVTVC5EZXZlbG9wZXJDb2xsZWN0aW9uKCk7XG5cbiAgICAgIGFzc2VydC5vayh0eXBlb2YgVEVTVC5EZXZlbG9wZXJzID09PSAnb2JqZWN0JywgJ0RldmVsb3BlciBjb2xsZWN0aW9uIHN1Y2Nlc3NmdWxseSBjcmVhdGVkLicpO1xuICAgIH0pLFxuXG4gICAgaXQoJ2FkZGluZyBkYXRhJywgZnVuY3Rpb24gKCkge1xuICAgICAgVEVTVC5EZXZlbG9wZXJzLmFkZChURVNULmRhdGEpO1xuXG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5EZXZlbG9wZXJzLmxlbmd0aCwgNSwgJ0FsbCByZWNvcmRzIHdlcmUgYWRkZWQuJyk7XG5cbiAgICAgIGFzc2VydC5lcXVhbChURVNULkRldmVsb3BlcnMuYXQoMikuZ2V0KCdzdXJlTmFtZScpLCBURVNULmRhdGFbMl0uc3VyZU5hbWUsICdzdXJlTmFtZSBvZiAzLiBtb2RlbCBoYXMgY29ycmVjdCB2YWx1ZScpO1xuICAgICAgYXNzZXJ0LmVxdWFsKFRFU1QuRGV2ZWxvcGVycy5hdCgzKS5nZXQoJ2ZpcnN0TmFtZScpLCBURVNULmRhdGFbM10uZmlyc3ROYW1lLCAnZmlyc3ROYW1lIG9mIDQuIG1vZGVsIGhhcyBjb3JyZWN0IHZhbHVlJyk7XG4gICAgICBhc3NlcnQuZXF1YWwoVEVTVC5EZXZlbG9wZXJzLmF0KDQpLmdldCgnYWdlJyksIFRFU1QuZGF0YVs0XS5hZ2UsICdhZ2Ugb2YgNS4gbW9kZWwgaGFzIGNvcnJlY3QgdmFsdWUnKTtcblxuICAgICAgYXNzZXJ0Lm9rKFRFU1QuRGV2ZWxvcGVyLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKFRFU1QuRGV2ZWxvcGVycy5hdCgwKSksICdSZWNvcmRzIHN1Y2Nlc3NmdWxseSBjb252ZXJ0ZWQgdG8gbW9kZWwgcmVjb3Jkcy4nKTtcblxuICAgIH0pLFxuXG4gICAgaXQoJ3NvcnRpbmcgZGF0YScsIGZ1bmN0aW9uICgpIHtcblxuICAgICAgVEVTVC5EZXZlbG9wZXJzLmNvbXBhcmF0b3IgPSBmdW5jdGlvbiAobTE6IE1vZGVsLCBtMjogTW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIG0yLmdldCgnYWdlJykgLSBtMS5nZXQoJ2FnZScpO1xuICAgICAgfTtcbiAgICAgIFRFU1QuRGV2ZWxvcGVycy5zb3J0KCk7XG5cbiAgICAgIHZhciBwMiA9IFRFU1QuRGV2ZWxvcGVycy5hdCgwKTtcbiAgICAgIGFzc2VydC5vayhwMi5nZXQoJ3N1cmVOYW1lJykgPT09ICdTdGllcmxlJywgJ1JlY29yZHMgY29ycmVjdGx5IHNvcnRlZCBieSBwYXNzZWQgaW4gc29ydCBmdW5jdGlvbicpO1xuXG4gICAgfSksXG5cbiAgICBpdCgnZmlsdGVyaW5nIGRhdGEnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyBmaWx0ZXIgYWxsIGRldnMgb2xkZXIgb3IgZXF1YWwgdG8gMjZcbiAgICAgIHZhciBhMSA9IFRFU1QuRGV2ZWxvcGVycy5maWx0ZXIoZnVuY3Rpb24gKHJlYzogTW9kZWwpIHtcbiAgICAgICAgcmV0dXJuIHJlYy5nZXQoJ2FnZScpID49IDI2O1xuICAgICAgfSk7XG5cbiAgICAgIGFzc2VydC5vayhhMS5sZW5ndGggPT09IDUsICdSZWNvcmRzIHN1Y2Nlc3NmdWxseSBmaWx0ZXJlZC4gRXZlcnlvbmUgaXMgMjYgb3Igb2xkZXIuJyk7XG5cbiAgICAgIC8vIGZpbHRlciBhbGwgZGV2cyBvbGRlciB0aGFuIDI2XG4gICAgICB2YXIgYTIgPSBURVNULkRldmVsb3BlcnMuZmlsdGVyKGZ1bmN0aW9uIChyZWM6IE1vZGVsKSB7XG4gICAgICAgIHJldHVybiByZWMuZ2V0KCdhZ2UnKSA+IDI2O1xuICAgICAgfSk7XG5cbiAgICAgIGFzc2VydC5vayhhMi5sZW5ndGggPT09IDQsICdSZWNvcmRzIHN1Y2Nlc3NmdWxseSBmaWx0ZXJlZC4gT25lIGRldiBpcyB5b3VuZ2VyIHRoYW4gMjcuJyk7XG5cbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==