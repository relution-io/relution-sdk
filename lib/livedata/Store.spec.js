/*
 * @file livedata/Store.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 05.07.2016
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
var chai_1 = require('chai');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var Store_1 = require('./Store');
describe(module.filename || __filename, function () {
    return [
        it('isStore', function () {
            chai_1.assert.isFalse(Store_1.isStore(undefined));
            chai_1.assert.isFalse(Store_1.isStore(null));
            chai_1.assert.isFalse(Store_1.isStore(''));
            chai_1.assert.isFalse(Store_1.isStore(0));
            chai_1.assert.isFalse(Store_1.isStore(1));
            chai_1.assert.isFalse(Store_1.isStore({}));
            chai_1.assert.isFalse(Store_1.isStore([]));
            chai_1.assert.isFalse(Store_1.isStore(Model_1.Model));
            chai_1.assert.isFalse(Store_1.isStore(new Model_1.Model()));
            chai_1.assert.isFalse(Store_1.isStore(Collection_1.Collection));
            chai_1.assert.isFalse(Store_1.isStore(new Collection_1.Collection()));
            chai_1.assert.isFalse(Store_1.isStore(Store_1.Store));
            chai_1.assert.isTrue(Store_1.isStore(new Store_1.Store()));
        }),
        it('basic', function () {
            chai_1.assert.isDefined(Store_1.Store);
            chai_1.assert.isFunction(Store_1.Store);
            var instance = new Store_1.Store();
            chai_1.assert.isDefined(instance);
            chai_1.assert.isObject(instance);
            chai_1.assert.isDefined(instance._type);
            chai_1.assert.isString(instance._type);
            chai_1.assert.equal(instance._type, 'Relution.livedata.Store');
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU3RvcmUuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saXZlZGF0YS9TdG9yZS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRTVCLHNCQUFvQixTQUFTLENBQUMsQ0FBQTtBQUM5QiwyQkFBeUIsY0FBYyxDQUFDLENBQUE7QUFDeEMsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBRXZDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsU0FBUyxFQUFFO1lBQ1osYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUNuQyxhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzlCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUIsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzNCLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUIsYUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxhQUFLLENBQUMsQ0FBQyxDQUFDO1lBQy9CLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksYUFBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3JDLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLHVCQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLGFBQU0sQ0FBQyxPQUFPLENBQUMsZUFBTyxDQUFDLElBQUksdUJBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMxQyxhQUFNLENBQUMsT0FBTyxDQUFDLGVBQU8sQ0FBQyxhQUFLLENBQUMsQ0FBQyxDQUFDO1lBQy9CLGFBQU0sQ0FBQyxNQUFNLENBQUMsZUFBTyxDQUFDLElBQUksYUFBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RDLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxPQUFPLEVBQUU7WUFDVixhQUFNLENBQUMsU0FBUyxDQUFDLGFBQUssQ0FBQyxDQUFDO1lBQ3hCLGFBQU0sQ0FBQyxVQUFVLENBQUMsYUFBSyxDQUFDLENBQUM7WUFFekIsSUFBSSxRQUFRLEdBQUcsSUFBSSxhQUFLLEVBQUUsQ0FBQztZQUMzQixhQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQzNCLGFBQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDMUIsYUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDakMsYUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsYUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLHlCQUF5QixDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL1N0b3JlLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDA1LjA3LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0IHthc3NlcnR9IGZyb20gJ2NoYWknO1xuXG5pbXBvcnQge01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbn0gZnJvbSAnLi9Db2xsZWN0aW9uJztcbmltcG9ydCB7U3RvcmUsIGlzU3RvcmV9IGZyb20gJy4vU3RvcmUnO1xuXG5kZXNjcmliZShtb2R1bGUuZmlsZW5hbWUgfHwgX19maWxlbmFtZSwgZnVuY3Rpb24oKSB7XG4gIHJldHVybiBbXG5cbiAgICBpdCgnaXNTdG9yZScsICgpID0+IHtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzU3RvcmUodW5kZWZpbmVkKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKG51bGwpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzU3RvcmUoJycpKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzU3RvcmUoMCkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNTdG9yZSgxKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKHt9KSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKFtdKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKE1vZGVsKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKG5ldyBNb2RlbCgpKSk7XG4gICAgICBhc3NlcnQuaXNGYWxzZShpc1N0b3JlKENvbGxlY3Rpb24pKTtcbiAgICAgIGFzc2VydC5pc0ZhbHNlKGlzU3RvcmUobmV3IENvbGxlY3Rpb24oKSkpO1xuICAgICAgYXNzZXJ0LmlzRmFsc2UoaXNTdG9yZShTdG9yZSkpO1xuICAgICAgYXNzZXJ0LmlzVHJ1ZShpc1N0b3JlKG5ldyBTdG9yZSgpKSk7XG4gICAgfSksXG5cbiAgICBpdCgnYmFzaWMnLCBmdW5jdGlvbiAoKSB7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKFN0b3JlKTtcbiAgICAgIGFzc2VydC5pc0Z1bmN0aW9uKFN0b3JlKTtcblxuICAgICAgdmFyIGluc3RhbmNlID0gbmV3IFN0b3JlKCk7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKGluc3RhbmNlKTtcbiAgICAgIGFzc2VydC5pc09iamVjdChpbnN0YW5jZSk7XG4gICAgICBhc3NlcnQuaXNEZWZpbmVkKGluc3RhbmNlLl90eXBlKTtcbiAgICAgIGFzc2VydC5pc1N0cmluZyhpbnN0YW5jZS5fdHlwZSk7XG4gICAgICBhc3NlcnQuZXF1YWwoaW5zdGFuY2UuX3R5cGUsICdSZWx1dGlvbi5saXZlZGF0YS5TdG9yZScpO1xuICAgIH0pXG5cbiAgXTtcbn0pO1xuIl19