/*
 * @file core/q.spec.ts
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
var Q = require('q');
describe(module.filename || __filename, function () {
    return [
        it('Q direct resolve', function (done) {
            Q.resolve(1).then(function (x) {
                chai_1.assert.equal(x, 1, 'one');
            }).then(done, done).done();
        }),
        it('Q indirect resolve', function (done) {
            Q.fcall(function () {
                return 1;
            }).then(function (x) {
                chai_1.assert.equal(x, 1, 'one');
            }).then(done, done).done();
        }),
        it('Q empty resolve', function (done) {
            Q.resolve(undefined).then(function (x) {
                chai_1.assert.equal(x, undefined, 'undefined');
            }).then(done, done).done();
        }),
        it('Q empty resolve all', function (done) {
            Q.all([]).then(function (x) {
                chai_1.assert.deepEqual(x, [], 'undefined');
            }).then(done, done).done();
        })
    ];
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicS5zcGVjLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2NvcmUvcS5zcGVjLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSDs7R0FFRztBQUNILE1BQU07O0FBRU4scUJBQXFCLE1BQU0sQ0FBQyxDQUFBO0FBRTVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLFVBQVUsRUFBRTtJQUN0QyxNQUFNLENBQUM7UUFFTCxFQUFFLENBQUMsa0JBQWtCLEVBQUUsVUFBQyxJQUFJO1lBQzFCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQztnQkFDbEIsYUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzVCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDN0IsQ0FBQyxDQUFDO1FBRUYsRUFBRSxDQUFDLG9CQUFvQixFQUFFLFVBQUMsSUFBSTtZQUM1QixDQUFDLENBQUMsS0FBSyxDQUFDO2dCQUNOLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDWCxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDO2dCQUNSLGFBQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUM1QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzdCLENBQUMsQ0FBQztRQUVGLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxVQUFDLElBQUk7WUFDekIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBQyxDQUFDO2dCQUMxQixhQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDMUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDLENBQUM7UUFFRixFQUFFLENBQUMscUJBQXFCLEVBQUUsVUFBQyxJQUFJO1lBQzdCLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQUMsQ0FBQztnQkFDZixhQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUM3QixDQUFDLENBQUM7S0FFSCxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgY29yZS9xLnNwZWMudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI4LjA2LjIwMTZcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBjb3JlXG4gKi9cbi8qKiAqL1xuXG5pbXBvcnQge2Fzc2VydH0gZnJvbSAnY2hhaSc7XG5cbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5cbmRlc2NyaWJlKG1vZHVsZS5maWxlbmFtZSB8fCBfX2ZpbGVuYW1lLCBmdW5jdGlvbigpIHtcbiAgcmV0dXJuIFtcblxuICAgIGl0KCdRIGRpcmVjdCByZXNvbHZlJywgKGRvbmUpID0+IHtcbiAgICAgIFEucmVzb2x2ZSgxKS50aGVuKCh4KSA9PiB7XG4gICAgICAgIGFzc2VydC5lcXVhbCh4LCAxLCAnb25lJyk7XG4gICAgICB9KS50aGVuKGRvbmUsIGRvbmUpLmRvbmUoKTtcbiAgICB9KSxcblxuICAgIGl0KCdRIGluZGlyZWN0IHJlc29sdmUnLCAoZG9uZSkgPT4ge1xuICAgICAgUS5mY2FsbCgoKSA9PiB7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfSkudGhlbigoeCkgPT4ge1xuICAgICAgICBhc3NlcnQuZXF1YWwoeCwgMSwgJ29uZScpO1xuICAgICAgfSkudGhlbihkb25lLCBkb25lKS5kb25lKCk7XG4gICAgfSksXG5cbiAgICBpdCgnUSBlbXB0eSByZXNvbHZlJywgKGRvbmUpID0+IHtcbiAgICAgIFEucmVzb2x2ZSh1bmRlZmluZWQpLnRoZW4oKHgpID0+IHtcbiAgICAgICAgYXNzZXJ0LmVxdWFsKHgsIHVuZGVmaW5lZCwgJ3VuZGVmaW5lZCcpO1xuICAgICAgfSkudGhlbihkb25lLCBkb25lKS5kb25lKCk7XG4gICAgfSksXG5cbiAgICBpdCgnUSBlbXB0eSByZXNvbHZlIGFsbCcsIChkb25lKSA9PiB7XG4gICAgICBRLmFsbChbXSkudGhlbigoeCkgPT4ge1xuICAgICAgICBhc3NlcnQuZGVlcEVxdWFsKHgsIFtdLCAndW5kZWZpbmVkJyk7XG4gICAgICB9KS50aGVuKGRvbmUsIGRvbmUpLmRvbmUoKTtcbiAgICB9KVxuXG4gIF07XG59KTtcbiJdfQ==