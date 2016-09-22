/*
 * @file livedata/Model.spec.ts
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
describe(module.filename || __filename, function () {
    return [
        it('isModel', function () {
            chai_1.assert.isFalse(Model_1.isModel(undefined));
            chai_1.assert.isFalse(Model_1.isModel(null));
            chai_1.assert.isFalse(Model_1.isModel(''));
            chai_1.assert.isFalse(Model_1.isModel(0));
            chai_1.assert.isFalse(Model_1.isModel(1));
            chai_1.assert.isFalse(Model_1.isModel({}));
            chai_1.assert.isFalse(Model_1.isModel([]));
            chai_1.assert.isFalse(Model_1.isModel(Model_1.Model));
            chai_1.assert.isTrue(Model_1.isModel(new Model_1.Model()));
            chai_1.assert.isFalse(Model_1.isModel(Collection_1.Collection));
            chai_1.assert.isFalse(Model_1.isModel(new Collection_1.Collection()));
            chai_1.assert.isFalse(Model_1.isModel(Store_1.Store));
            chai_1.assert.isFalse(Model_1.isModel(new Store_1.Store()));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Model_1.Model);
            chai_1.assert.isFunction(Model_1.Model);
            var instance = new Model_1.Model();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Model');
        }),
        it('creating model', function () {
            chai_1.assert.typeOf(Model_1.Model, 'function', 'Model is defined.');
            var Person = (function (_super) {
                __extends(Person, _super);
                function Person() {
                    _super.apply(this, arguments);
                }
                return Person;
            }(Model_1.Model));
            ;
            Person.prototype.idAttribute = 'id';
            Person.prototype.defaults = {
                bmi: 0.0
            };
            Person.prototype.entity = 'person';
            chai_1.assert.typeOf(Person, 'function', 'person model could be extended.');
            chai_1.assert.typeOf(new Person(), 'object', 'empty person model could be created.');
            var p = new Person({
                firstName: 'Max',
                sureName: 'Mustermann',
                notes: 'Notes to this person',
                address: { street: 'Leitzstraße', house_nr: 45, zip: '70469', city: 'Stuttgart' }
            });
            chai_1.assert.ok(typeof p === 'object', 'person record could be created.');
            chai_1.assert.ok(p.get('firstName') === 'Max', 'Field "firstName" is set.');
            chai_1.assert.ok(p.get('sureName') === 'Mustermann', 'Field "sureName" is set.');
            chai_1.assert.ok(p.get('bmi') === 0.0, 'Field "bmi" has correct default value.');
            chai_1.assert.ok(p.get('notes') === 'Notes to this person', 'Field "note" has correct value.');
            chai_1.assert.ok(typeof p.get('id') === 'undefined', 'Field "id" is undefined, as expected.');
            chai_1.assert.ok(p.get('address').street === 'Leitzstraße', 'Field "address" has correct value.');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTW9kZWwuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9Nb2RlbC5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07Ozs7Ozs7QUFFTixxQkFBcUIsTUFBTSxDQUFDLENBQUE7QUFFNUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF5QixjQUFjLENBQUMsQ0FBQTtBQUN4QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFFOUIsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxTQUFTLEVBQUU7WUFDWixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQ25DLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLGFBQUssQ0FBQyxDQUFDLENBQUM7WUFDL0IsYUFBTSxDQUFDLE1BQU0sQ0FBQyxlQUFPLENBQUMsSUFBSSxhQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDcEMsYUFBTSxD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TSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssV0FBVyxFQUFFLHVDQUF1QyxDQUFDLENBQUM7WUFDdkYsYUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxhQUFhLEVBQUUsb0NBQW9DLENBQUMsQ0FBQztRQUM3RixDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvTW9kZWwuc3BlYy50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMjguMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIGxpdmVkYXRhXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5cbmltcG9ydCB7TW9kZWwsIGlzTW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdpc01vZGVsJywgKCkgPT4ge1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCh1bmRlZmluZWQpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwobnVsbCkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCgnJykpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbCgwKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKDEpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoe30pKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoW10pKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoTW9kZWwpKTtcbiAgICAgIGFzc2VydC5pc1RydWUoaXNNb2RlbChuZXcgTW9kZWwoKSkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNNb2RlbChDb2xsZWN0aW9uKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc01vZGVsKG5ldyBDb2xsZWN0aW9uKCkpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwoU3RvcmUpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzTW9kZWwobmV3IFN0b3JlKCkpKTtcbiAgICB9KSxcblxuICAgIGl0KCdiYXNpYycsIGZ1bmN0aW9uICgpIHtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoTW9kZWwpO1xuICAgICAgYXNzZXJ0LmlzRnVuY3Rpb24oTW9kZWwpO1xuXG4gICAgICB2YXIgaW5zdGFuY2UgPSBuZXcgTW9kZWwoKTtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoaW5zdGFuY2UpO1xuICAgICAgYXNzZXJ0LmlzT2JqZWN0KGluc3RhbmNlKTtcbiAgICAgIGFzc2VydC5pc0RlZmluZWQoaW5zdGFuY2UuX3R5cGUpO1xuICAgICAgYXNzZXJ0LmlzU3RyaW5nKGluc3RhbmNlLl90eXBlKTtcbiAgICAgIGFzc2VydC5lcXVhbChpbnN0YW5jZS5fdHlwZSwgJ1JlbHV0aW9uLmxpdmVkYXRhLk1vZGVsJyk7XG4gICAgfSksXG5cbiAgICBpdCgnY3JlYXRpbmcgbW9kZWwnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBhc3NlcnQudHlwZU9mKE1vZGVsLCAnZnVuY3Rpb24nLCAnTW9kZWwgaXMgZGVmaW5lZC4nKTtcbiAgICAgIGNsYXNzIFBlcnNvbiBleHRlbmRzIE1vZGVsIHt9O1xuICAgICAgUGVyc29uLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdpZCc7XG4gICAgICBQZXJzb24ucHJvdG90eXBlLmRlZmF1bHRzID0gPGFueT57XG4gICAgICAgIGJtaTogMC4wXG4gICAgICB9O1xuICAgICAgUGVyc29uLnByb3RvdHlwZS5lbnRpdHkgPSAncGVyc29uJztcbiAgICAgIGFzc2VydC50eXBlT2YoUGVyc29uLCAnZnVuY3Rpb24nLCAncGVyc29uIG1vZGVsIGNvdWxkIGJlIGV4dGVuZGVkLicpO1xuICAgICAgYXNzZXJ0LnR5cGVPZihuZXcgUGVyc29uKCksICdvYmplY3QnLCAnZW1wdHkgcGVyc29uIG1vZGVsIGNvdWxkIGJlIGNyZWF0ZWQuJyk7XG5cbiAgICAgIHZhciBwID0gbmV3IFBlcnNvbih7XG4gICAgICAgIGZpcnN0TmFtZTogJ01heCcsXG4gICAgICAgIHN1cmVOYW1lOiAnTXVzdGVybWFubicsXG4gICAgICAgIG5vdGVzOiAnTm90ZXMgdG8gdGhpcyBwZXJzb24nLFxuICAgICAgICBhZGRyZXNzOiB7c3RyZWV0OiAnTGVpdHpzdHJhw59lJywgaG91c2VfbnI6IDQ1LCB6aXA6ICc3MDQ2OScsIGNpdHk6ICdTdHV0dGdhcnQnfVxuICAgICAgfSk7XG4gICAgICBhc3NlcnQub2sodHlwZW9mIHAgPT09ICdvYmplY3QnLCAncGVyc29uIHJlY29yZCBjb3VsZCBiZSBjcmVhdGVkLicpO1xuICAgICAgYXNzZXJ0Lm9rKHAuZ2V0KCdmaXJzdE5hbWUnKSA9PT0gJ01heCcsICdGaWVsZCBcImZpcnN0TmFtZVwiIGlzIHNldC4nKTtcbiAgICAgIGFzc2VydC5vayhwLmdldCgnc3VyZU5hbWUnKSA9PT0gJ011c3Rlcm1hbm4nLCAnRmllbGQgXCJzdXJlTmFtZVwiIGlzIHNldC4nKTtcbiAgICAgIGFzc2VydC5vayhwLmdldCgnYm1pJykgPT09IDAuMCwgJ0ZpZWxkIFwiYm1pXCIgaGFzIGNvcnJlY3QgZGVmYXVsdCB2YWx1ZS4nKTtcbiAgICAgIGFzc2VydC5vayhwLmdldCgnbm90ZXMnKSA9PT0gJ05vdGVzIHRvIHRoaXMgcGVyc29uJywgJ0ZpZWxkIFwibm90ZVwiIGhhcyBjb3JyZWN0IHZhbHVlLicpO1xuICAgICAgYXNzZXJ0Lm9rKHR5cGVvZiBwLmdldCgnaWQnKSA9PT0gJ3VuZGVmaW5lZCcsICdGaWVsZCBcImlkXCIgaXMgdW5kZWZpbmVkLCBhcyBleHBlY3RlZC4nKTtcbiAgICAgIGFzc2VydC5vayhwLmdldCgnYWRkcmVzcycpLnN0cmVldCA9PT0gJ0xlaXR6c3RyYcOfZScsICdGaWVsZCBcImFkZHJlc3NcIiBoYXMgY29ycmVjdCB2YWx1ZS4nKTtcbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==