/*
 * @file core/mocha.spec.ts
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
 * @module core
 */
/** */
"use strict";
var chai_1 = require('chai');
describe(module.filename || __filename, function () {
    return [
        it('assert samples', function () {
            var x = {};
            // assert.valueOf(x, 'object', 'x is an object.');
            chai_1.assert.isObject(x, 'x is an object.');
            chai_1.assert.ok(1 !== 2, '1 is not 2');
            chai_1.assert.equal(-1, [1, 2, 3].indexOf(5));
            chai_1.assert.equal(-1, [1, 2, 3].indexOf(0));
        }),
        it('expect samples', function () {
            var foo = 'bar';
            var beverages = { tea: ['chai', 'matcha', 'oolong'] };
            chai_1.expect(foo).to.be.a('string');
            chai_1.expect(foo).to.equal('bar');
            chai_1.expect(foo).to.have.length(3);
            chai_1.expect(beverages).to.have.property('tea').with.length(3);
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9jaGEuc3BlYy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb3JlL21vY2hhLnNwZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7QUFFTixxQkFBNkIsTUFBTSxDQUFDLENBQUE7QUFFcEMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxRQUFRLElBQUksVUFBVSxFQUFFO0lBQ3RDLE1BQU0sQ0FBQztRQUVMLEVBQUUsQ0FBQyxnQkFBZ0IsRUFBRTtZQUNuQixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDWCxrREFBa0Q7WUFDbEQsYUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztZQUN0QyxhQUFNLENBQUMsRUFBRSxDQUFTLENBQUMsS0FBYSxDQUFDLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDakQsYUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDdkMsYUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLGdCQUFnQixFQUFFO1lBQ25CLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQTtZQUNmLElBQUksU0FBUyxHQUFHLEVBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBQyxDQUFDO1lBQ3BELGFBQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUM5QixhQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM1QixhQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUIsYUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQyxDQUFDO0tBRUgsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcclxuICogQGZpbGUgY29yZS9tb2NoYS5zcGVjLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyOC4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSBjb3JlXHJcbiAqL1xyXG4vKiogKi9cclxuXHJcbmltcG9ydCB7YXNzZXJ0LCBleHBlY3R9IGZyb20gJ2NoYWknO1xyXG5cclxuZGVzY3JpYmUobW9kdWxlLmZpbGVuYW1lIHx8IF9fZmlsZW5hbWUsIGZ1bmN0aW9uKCkge1xyXG4gIHJldHVybiBbXHJcblxyXG4gICAgaXQoJ2Fzc2VydCBzYW1wbGVzJywgKCkgPT4ge1xyXG4gICAgICB2YXIgeCA9IHt9O1xyXG4gICAgICAvLyBhc3NlcnQudmFsdWVPZih4LCAnb2JqZWN0JywgJ3ggaXMgYW4gb2JqZWN0LicpO1xyXG4gICAgICBhc3NlcnQuaXNPYmplY3QoeCwgJ3ggaXMgYW4gb2JqZWN0LicpO1xyXG4gICAgICBhc3NlcnQub2soPG51bWJlcj4xICE9PSA8bnVtYmVyPjIsICcxIGlzIG5vdCAyJyk7XHJcbiAgICAgIGFzc2VydC5lcXVhbCgtMSwgWzEsIDIsIDNdLmluZGV4T2YoNSkpO1xyXG4gICAgICBhc3NlcnQuZXF1YWwoLTEsIFsxLCAyLCAzXS5pbmRleE9mKDApKTtcclxuICAgIH0pLFxyXG5cclxuICAgIGl0KCdleHBlY3Qgc2FtcGxlcycsICgpID0+IHtcclxuICAgICAgdmFyIGZvbyA9ICdiYXInXHJcbiAgICAgIHZhciBiZXZlcmFnZXMgPSB7dGVhOiBbJ2NoYWknLCAnbWF0Y2hhJywgJ29vbG9uZyddfTtcclxuICAgICAgZXhwZWN0KGZvbykudG8uYmUuYSgnc3RyaW5nJyk7XHJcbiAgICAgIGV4cGVjdChmb28pLnRvLmVxdWFsKCdiYXInKTtcclxuICAgICAgZXhwZWN0KGZvbykudG8uaGF2ZS5sZW5ndGgoMyk7XHJcbiAgICAgIGV4cGVjdChiZXZlcmFnZXMpLnRvLmhhdmUucHJvcGVydHkoJ3RlYScpLndpdGgubGVuZ3RoKDMpO1xyXG4gICAgfSlcclxuXHJcbiAgXTtcclxufSk7XHJcbiJdfQ==