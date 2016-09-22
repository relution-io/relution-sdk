/*
 * @file web/verb.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.06.2016
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
 * @module web
 */
/** */
"use strict";
var _ = require('lodash');
var http = require('./http');
/**
 * issues an http/ajax request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 *
 * @internal Implements verb methods.
 */
function verb(method, optionsOrUrl, body) {
    var options = {
        method: method
    };
    if (_.isString(optionsOrUrl)) {
        options.url = optionsOrUrl;
    }
    else {
        _.defaults(options, optionsOrUrl);
    }
    if (!_.isUndefined(body)) {
        options.body = body;
    }
    return http.ajax(options);
}
/**
 * issues an http/ajax HEAD request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
function head(optionsOrUrl) {
    return verb('HEAD', optionsOrUrl);
}
exports.head = head;
/**
 * issues an http/ajax GET request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
function get(optionsOrUrl) {
    return verb('GET', optionsOrUrl);
}
exports.get = get;
/**
 * issues an http/ajax PUT request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
function put(optionsOrUrl, body) {
    return verb('PUT', optionsOrUrl, body);
}
exports.put = put;
/**
 * issues an http/ajax POST request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see patch
 * @see delete
 *
 * @see ajax
 */
function post(optionsOrUrl, body) {
    return verb('POST', optionsOrUrl, body);
}
exports.post = post;
/**
 * issues an http/ajax PATCH request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see delete
 *
 * @see ajax
 */
function patch(optionsOrUrl, body) {
    return verb('PATCH', optionsOrUrl, body);
}
exports.patch = patch;
/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * <p>
 * Please consider this export as an implementation detail of the library and use delete instead.
 * </p>
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 * @see delete
 *
 * @see ajax
 */
function del(optionsOrUrl, body) {
    return verb('DELETE', optionsOrUrl, body);
}
exports.del = del;
exports.delete = del;
/**
 * issues an http/ajax DELETE request against the Relution server.
 *
 * @param optionsOrUrl of request, including target `url`, or url.
 * @param body request body to submit in case optionsOrUrl is a url.
 * @return {Q.Promise} of response body, in case of failure rejects to an Error object including
 *    `requestUrl`, `statusCode` and `statusMessage`.
 *
 * @see head
 * @see get
 * @see put
 * @see post
 * @see patch
 *
 * @see ajax
 */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvdmVyYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRzVCLElBQVksSUFBSSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRS9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSCxjQUFpQixNQUFjLEVBQUUsWUFBdUMsRUFBRSxJQUFVO0lBQ2xGLElBQU0sT0FBTyxHQUFRO1FBQ25CLE1BQU0sRUFBRSxNQUFNO0tBQ2YsQ0FBQztJQUNGLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBSSxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxjQUF3QixZQUF1QztJQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFJLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxhQUF1QixZQUF1QztJQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFJLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRmUsV0FBRyxNQUVsQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsYUFBdUIsWUFBdUMsRUFBRSxJQUFVO0lBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUksS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRmUsV0FBRyxNQUVsQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsY0FBd0IsWUFBdUMsRUFBRSxJQUFVO0lBQ3pFLE1BQU0sQ0FBQyxJQUFJLENBQUksTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsZUFBeUIsWUFBdUMsRUFBRSxJQUFVO0lBQzFFLE1BQU0sQ0FBQyxJQUFJLENBQUksT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRmUsYUFBSyxRQUVwQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsYUFBdUIsWUFBdUMsRUFBRSxJQUFVO0lBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUksUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRmUsV0FBRyxNQUVsQjtBQWtCZSxjQUFNLE9BbEJyQjtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBAZmlsZSB3ZWIvdmVyYi50c1xuICogUmVsdXRpb24gU0RLXG4gKlxuICogQ3JlYXRlZCBieSBUaG9tYXMgQmVja21hbm4gb24gMDEuMDYuMjAxNlxuICogQ29weXJpZ2h0IDIwMTYgTS1XYXkgU29sdXRpb25zIEdtYkhcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4gKlxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cbiAqL1xuLyoqXG4gKiBAbW9kdWxlIHdlYlxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcblxuaW1wb3J0ICogYXMgaHR0cCBmcm9tICcuL2h0dHAnO1xuXG4vKipcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIG9wdGlvbnNPclVybCBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLCBvciB1cmwuXG4gKiBAcGFyYW0gYm9keSByZXF1ZXN0IGJvZHkgdG8gc3VibWl0IGluIGNhc2Ugb3B0aW9uc09yVXJsIGlzIGEgdXJsLlxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBFcnJvciBvYmplY3QgaW5jbHVkaW5nXG4gKiAgICBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxuICpcbiAqIEBzZWUgaGVhZFxuICogQHNlZSBnZXRcbiAqIEBzZWUgcHV0XG4gKiBAc2VlIHBvc3RcbiAqIEBzZWUgcGF0Y2hcbiAqIEBzZWUgZGVsZXRlXG4gKlxuICogQHNlZSBhamF4XG4gKlxuICogQGludGVybmFsIEltcGxlbWVudHMgdmVyYiBtZXRob2RzLlxuICovXG5mdW5jdGlvbiB2ZXJiPFQ+KG1ldGhvZDogc3RyaW5nLCBvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcsIGJvZHk/OiBhbnkpOiBRLlByb21pc2U8VD4ge1xuICBjb25zdCBvcHRpb25zOiBhbnkgPSB7XG4gICAgbWV0aG9kOiBtZXRob2RcbiAgfTtcbiAgaWYgKF8uaXNTdHJpbmcob3B0aW9uc09yVXJsKSkge1xuICAgIG9wdGlvbnMudXJsID0gb3B0aW9uc09yVXJsO1xuICB9IGVsc2Uge1xuICAgIF8uZGVmYXVsdHMob3B0aW9ucywgb3B0aW9uc09yVXJsKTtcbiAgfVxuICBpZiAoIV8uaXNVbmRlZmluZWQoYm9keSkpIHtcbiAgICBvcHRpb25zLmJvZHkgPSBib2R5O1xuICB9XG4gIHJldHVybiBodHRwLmFqYXg8VD4ob3B0aW9ucyk7XG59XG5cbi8qKlxuICogaXNzdWVzIGFuIGh0dHAvYWpheCBIRUFEIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBFcnJvciBvYmplY3QgaW5jbHVkaW5nXG4gKiAgICBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxuICpcbiAqIEBzZWUgZ2V0XG4gKiBAc2VlIHB1dFxuICogQHNlZSBwb3N0XG4gKiBAc2VlIHBhdGNoXG4gKiBAc2VlIGRlbGV0ZVxuICpcbiAqIEBzZWUgYWpheFxuICovXG5leHBvcnQgZnVuY3Rpb24gaGVhZDxUPihvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcpOiBRLlByb21pc2U8VD4ge1xuICByZXR1cm4gdmVyYjxUPignSEVBRCcsIG9wdGlvbnNPclVybCk7XG59XG5cbi8qKlxuICogaXNzdWVzIGFuIGh0dHAvYWpheCBHRVQgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIG9wdGlvbnNPclVybCBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLCBvciB1cmwuXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEVycm9yIG9iamVjdCBpbmNsdWRpbmdcbiAqICAgIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXG4gKlxuICogQHNlZSBoZWFkXG4gKiBAc2VlIHB1dFxuICogQHNlZSBwb3N0XG4gKiBAc2VlIHBhdGNoXG4gKiBAc2VlIGRlbGV0ZVxuICpcbiAqIEBzZWUgYWpheFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0PFQ+KG9wdGlvbnNPclVybDogaHR0cC5IdHRwT3B0aW9ucyB8IHN0cmluZyk6IFEuUHJvbWlzZTxUPiB7XG4gIHJldHVybiB2ZXJiPFQ+KCdHRVQnLCBvcHRpb25zT3JVcmwpO1xufVxuXG4vKipcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggUFVUIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxuICogQHBhcmFtIGJvZHkgcmVxdWVzdCBib2R5IHRvIHN1Ym1pdCBpbiBjYXNlIG9wdGlvbnNPclVybCBpcyBhIHVybC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBAc2VlIGhlYWRcbiAqIEBzZWUgZ2V0XG4gKiBAc2VlIHBvc3RcbiAqIEBzZWUgcGF0Y2hcbiAqIEBzZWUgZGVsZXRlXG4gKlxuICogQHNlZSBhamF4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwdXQ8VD4ob3B0aW9uc09yVXJsOiBodHRwLkh0dHBPcHRpb25zIHwgc3RyaW5nLCBib2R5PzogYW55KTogUS5Qcm9taXNlPFQ+IHtcbiAgcmV0dXJuIHZlcmI8VD4oJ1BVVCcsIG9wdGlvbnNPclVybCwgYm9keSk7XG59XG5cbi8qKlxuICogaXNzdWVzIGFuIGh0dHAvYWpheCBQT1NUIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxuICogQHBhcmFtIGJvZHkgcmVxdWVzdCBib2R5IHRvIHN1Ym1pdCBpbiBjYXNlIG9wdGlvbnNPclVybCBpcyBhIHVybC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBAc2VlIGhlYWRcbiAqIEBzZWUgZ2V0XG4gKiBAc2VlIHB1dFxuICogQHNlZSBwYXRjaFxuICogQHNlZSBkZWxldGVcbiAqXG4gKiBAc2VlIGFqYXhcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBvc3Q8VD4ob3B0aW9uc09yVXJsOiBodHRwLkh0dHBPcHRpb25zIHwgc3RyaW5nLCBib2R5PzogYW55KTogUS5Qcm9taXNlPFQ+IHtcbiAgcmV0dXJuIHZlcmI8VD4oJ1BPU1QnLCBvcHRpb25zT3JVcmwsIGJvZHkpO1xufVxuXG4vKipcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggUEFUQ0ggcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXG4gKlxuICogQHBhcmFtIG9wdGlvbnNPclVybCBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLCBvciB1cmwuXG4gKiBAcGFyYW0gYm9keSByZXF1ZXN0IGJvZHkgdG8gc3VibWl0IGluIGNhc2Ugb3B0aW9uc09yVXJsIGlzIGEgdXJsLlxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBFcnJvciBvYmplY3QgaW5jbHVkaW5nXG4gKiAgICBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxuICpcbiAqIEBzZWUgaGVhZFxuICogQHNlZSBnZXRcbiAqIEBzZWUgcHV0XG4gKiBAc2VlIHBvc3RcbiAqIEBzZWUgZGVsZXRlXG4gKlxuICogQHNlZSBhamF4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXRjaDxUPihvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcsIGJvZHk/OiBhbnkpOiBRLlByb21pc2U8VD4ge1xuICByZXR1cm4gdmVyYjxUPignUEFUQ0gnLCBvcHRpb25zT3JVcmwsIGJvZHkpO1xufVxuXG4vKipcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggREVMRVRFIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIDxwPlxuICogUGxlYXNlIGNvbnNpZGVyIHRoaXMgZXhwb3J0IGFzIGFuIGltcGxlbWVudGF0aW9uIGRldGFpbCBvZiB0aGUgbGlicmFyeSBhbmQgdXNlIGRlbGV0ZSBpbnN0ZWFkLlxuICogPC9wPlxuICpcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxuICogQHBhcmFtIGJvZHkgcmVxdWVzdCBib2R5IHRvIHN1Ym1pdCBpbiBjYXNlIG9wdGlvbnNPclVybCBpcyBhIHVybC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBAc2VlIGhlYWRcbiAqIEBzZWUgZ2V0XG4gKiBAc2VlIHB1dFxuICogQHNlZSBwb3N0XG4gKiBAc2VlIHBhdGNoXG4gKiBAc2VlIGRlbGV0ZVxuICpcbiAqIEBzZWUgYWpheFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVsPFQ+KG9wdGlvbnNPclVybDogaHR0cC5IdHRwT3B0aW9ucyB8IHN0cmluZywgYm9keT86IGFueSk6IFEuUHJvbWlzZTxUPiB7XG4gIHJldHVybiB2ZXJiPFQ+KCdERUxFVEUnLCBvcHRpb25zT3JVcmwsIGJvZHkpO1xufVxuXG4vKipcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggREVMRVRFIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxuICpcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxuICogQHBhcmFtIGJvZHkgcmVxdWVzdCBib2R5IHRvIHN1Ym1pdCBpbiBjYXNlIG9wdGlvbnNPclVybCBpcyBhIHVybC5cbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cbiAqXG4gKiBAc2VlIGhlYWRcbiAqIEBzZWUgZ2V0XG4gKiBAc2VlIHB1dFxuICogQHNlZSBwb3N0XG4gKiBAc2VlIHBhdGNoXG4gKlxuICogQHNlZSBhamF4XG4gKi9cbmV4cG9ydCB7IGRlbCBhcyBkZWxldGUgfTtcbiJdfQ==