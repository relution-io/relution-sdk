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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyYi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy93ZWIvdmVyYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0g7O0dBRUc7QUFDSCxNQUFNOztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRzVCLElBQVksSUFBSSxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBRS9COzs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FrQkc7QUFDSCxjQUFpQixNQUFjLEVBQUUsWUFBdUMsRUFBRSxJQUFVO0lBQ2xGLElBQU0sT0FBTyxHQUFRO1FBQ25CLE1BQU0sRUFBRSxNQUFNO0tBQ2YsQ0FBQztJQUNGLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdCLE9BQU8sQ0FBQyxHQUFHLEdBQUcsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFBQyxJQUFJLENBQUMsQ0FBQztRQUNOLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQ3BDLENBQUM7SUFDRCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFDRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBSSxPQUFPLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxjQUF3QixZQUF1QztJQUM3RCxNQUFNLENBQUMsSUFBSSxDQUFJLE1BQU0sRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0dBY0c7QUFDSCxhQUF1QixZQUF1QztJQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFJLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBRmUsV0FBRyxNQUVsQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsYUFBdUIsWUFBdUMsRUFBRSxJQUFVO0lBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUksS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM1QyxDQUFDO0FBRmUsV0FBRyxNQUVsQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsY0FBd0IsWUFBdUMsRUFBRSxJQUFVO0lBQ3pFLE1BQU0sQ0FBQyxJQUFJLENBQUksTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QyxDQUFDO0FBRmUsWUFBSSxPQUVuQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztHQWVHO0FBQ0gsZUFBeUIsWUFBdUMsRUFBRSxJQUFVO0lBQzFFLE1BQU0sQ0FBQyxJQUFJLENBQUksT0FBTyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM5QyxDQUFDO0FBRmUsYUFBSyxRQUVwQixDQUFBO0FBRUQ7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsYUFBdUIsWUFBdUMsRUFBRSxJQUFVO0lBQ3hFLE1BQU0sQ0FBQyxJQUFJLENBQUksUUFBUSxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUMvQyxDQUFDO0FBRmUsV0FBRyxNQUVsQjtBQWtCZSxjQUFNLE9BbEJyQjtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7R0FlRztBQUNzQiIsInNvdXJjZXNDb250ZW50IjpbIi8qXHJcbiAqIEBmaWxlIHdlYi92ZXJiLnRzXHJcbiAqIFJlbHV0aW9uIFNES1xyXG4gKlxyXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAwMS4wNi4yMDE2XHJcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQG1vZHVsZSB3ZWJcclxuICovXHJcbi8qKiAqL1xyXG5cclxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xyXG5pbXBvcnQgKiBhcyBRIGZyb20gJ3EnO1xyXG5cclxuaW1wb3J0ICogYXMgaHR0cCBmcm9tICcuL2h0dHAnO1xyXG5cclxuLyoqXHJcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxyXG4gKiBAcGFyYW0gYm9keSByZXF1ZXN0IGJvZHkgdG8gc3VibWl0IGluIGNhc2Ugb3B0aW9uc09yVXJsIGlzIGEgdXJsLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEVycm9yIG9iamVjdCBpbmNsdWRpbmdcclxuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICpcclxuICogQHNlZSBoZWFkXHJcbiAqIEBzZWUgZ2V0XHJcbiAqIEBzZWUgcHV0XHJcbiAqIEBzZWUgcG9zdFxyXG4gKiBAc2VlIHBhdGNoXHJcbiAqIEBzZWUgZGVsZXRlXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKlxyXG4gKiBAaW50ZXJuYWwgSW1wbGVtZW50cyB2ZXJiIG1ldGhvZHMuXHJcbiAqL1xyXG5mdW5jdGlvbiB2ZXJiPFQ+KG1ldGhvZDogc3RyaW5nLCBvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcsIGJvZHk/OiBhbnkpOiBRLlByb21pc2U8VD4ge1xyXG4gIGNvbnN0IG9wdGlvbnM6IGFueSA9IHtcclxuICAgIG1ldGhvZDogbWV0aG9kXHJcbiAgfTtcclxuICBpZiAoXy5pc1N0cmluZyhvcHRpb25zT3JVcmwpKSB7XHJcbiAgICBvcHRpb25zLnVybCA9IG9wdGlvbnNPclVybDtcclxuICB9IGVsc2Uge1xyXG4gICAgXy5kZWZhdWx0cyhvcHRpb25zLCBvcHRpb25zT3JVcmwpO1xyXG4gIH1cclxuICBpZiAoIV8uaXNVbmRlZmluZWQoYm9keSkpIHtcclxuICAgIG9wdGlvbnMuYm9keSA9IGJvZHk7XHJcbiAgfVxyXG4gIHJldHVybiBodHRwLmFqYXg8VD4ob3B0aW9ucyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBpc3N1ZXMgYW4gaHR0cC9hamF4IEhFQUQgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEVycm9yIG9iamVjdCBpbmNsdWRpbmdcclxuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICpcclxuICogQHNlZSBnZXRcclxuICogQHNlZSBwdXRcclxuICogQHNlZSBwb3N0XHJcbiAqIEBzZWUgcGF0Y2hcclxuICogQHNlZSBkZWxldGVcclxuICpcclxuICogQHNlZSBhamF4XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaGVhZDxUPihvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcpOiBRLlByb21pc2U8VD4ge1xyXG4gIHJldHVybiB2ZXJiPFQ+KCdIRUFEJywgb3B0aW9uc09yVXJsKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggR0VUIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBAcGFyYW0gb3B0aW9uc09yVXJsIG9mIHJlcXVlc3QsIGluY2x1ZGluZyB0YXJnZXQgYHVybGAsIG9yIHVybC5cclxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBFcnJvciBvYmplY3QgaW5jbHVkaW5nXHJcbiAqICAgIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXHJcbiAqXHJcbiAqIEBzZWUgaGVhZFxyXG4gKiBAc2VlIHB1dFxyXG4gKiBAc2VlIHBvc3RcclxuICogQHNlZSBwYXRjaFxyXG4gKiBAc2VlIGRlbGV0ZVxyXG4gKlxyXG4gKiBAc2VlIGFqYXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXQ8VD4ob3B0aW9uc09yVXJsOiBodHRwLkh0dHBPcHRpb25zIHwgc3RyaW5nKTogUS5Qcm9taXNlPFQ+IHtcclxuICByZXR1cm4gdmVyYjxUPignR0VUJywgb3B0aW9uc09yVXJsKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggUFVUIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiBAcGFyYW0gb3B0aW9uc09yVXJsIG9mIHJlcXVlc3QsIGluY2x1ZGluZyB0YXJnZXQgYHVybGAsIG9yIHVybC5cclxuICogQHBhcmFtIGJvZHkgcmVxdWVzdCBib2R5IHRvIHN1Ym1pdCBpbiBjYXNlIG9wdGlvbnNPclVybCBpcyBhIHVybC5cclxuICogQHJldHVybiB7US5Qcm9taXNlfSBvZiByZXNwb25zZSBib2R5LCBpbiBjYXNlIG9mIGZhaWx1cmUgcmVqZWN0cyB0byBhbiBFcnJvciBvYmplY3QgaW5jbHVkaW5nXHJcbiAqICAgIGByZXF1ZXN0VXJsYCwgYHN0YXR1c0NvZGVgIGFuZCBgc3RhdHVzTWVzc2FnZWAuXHJcbiAqXHJcbiAqIEBzZWUgaGVhZFxyXG4gKiBAc2VlIGdldFxyXG4gKiBAc2VlIHBvc3RcclxuICogQHNlZSBwYXRjaFxyXG4gKiBAc2VlIGRlbGV0ZVxyXG4gKlxyXG4gKiBAc2VlIGFqYXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwdXQ8VD4ob3B0aW9uc09yVXJsOiBodHRwLkh0dHBPcHRpb25zIHwgc3RyaW5nLCBib2R5PzogYW55KTogUS5Qcm9taXNlPFQ+IHtcclxuICByZXR1cm4gdmVyYjxUPignUFVUJywgb3B0aW9uc09yVXJsLCBib2R5KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggUE9TVCByZXF1ZXN0IGFnYWluc3QgdGhlIFJlbHV0aW9uIHNlcnZlci5cclxuICpcclxuICogQHBhcmFtIG9wdGlvbnNPclVybCBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLCBvciB1cmwuXHJcbiAqIEBwYXJhbSBib2R5IHJlcXVlc3QgYm9keSB0byBzdWJtaXQgaW4gY2FzZSBvcHRpb25zT3JVcmwgaXMgYSB1cmwuXHJcbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xyXG4gKiAgICBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxyXG4gKlxyXG4gKiBAc2VlIGhlYWRcclxuICogQHNlZSBnZXRcclxuICogQHNlZSBwdXRcclxuICogQHNlZSBwYXRjaFxyXG4gKiBAc2VlIGRlbGV0ZVxyXG4gKlxyXG4gKiBAc2VlIGFqYXhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwb3N0PFQ+KG9wdGlvbnNPclVybDogaHR0cC5IdHRwT3B0aW9ucyB8IHN0cmluZywgYm9keT86IGFueSk6IFEuUHJvbWlzZTxUPiB7XHJcbiAgcmV0dXJuIHZlcmI8VD4oJ1BPU1QnLCBvcHRpb25zT3JVcmwsIGJvZHkpO1xyXG59XHJcblxyXG4vKipcclxuICogaXNzdWVzIGFuIGh0dHAvYWpheCBQQVRDSCByZXF1ZXN0IGFnYWluc3QgdGhlIFJlbHV0aW9uIHNlcnZlci5cclxuICpcclxuICogQHBhcmFtIG9wdGlvbnNPclVybCBvZiByZXF1ZXN0LCBpbmNsdWRpbmcgdGFyZ2V0IGB1cmxgLCBvciB1cmwuXHJcbiAqIEBwYXJhbSBib2R5IHJlcXVlc3QgYm9keSB0byBzdWJtaXQgaW4gY2FzZSBvcHRpb25zT3JVcmwgaXMgYSB1cmwuXHJcbiAqIEByZXR1cm4ge1EuUHJvbWlzZX0gb2YgcmVzcG9uc2UgYm9keSwgaW4gY2FzZSBvZiBmYWlsdXJlIHJlamVjdHMgdG8gYW4gRXJyb3Igb2JqZWN0IGluY2x1ZGluZ1xyXG4gKiAgICBgcmVxdWVzdFVybGAsIGBzdGF0dXNDb2RlYCBhbmQgYHN0YXR1c01lc3NhZ2VgLlxyXG4gKlxyXG4gKiBAc2VlIGhlYWRcclxuICogQHNlZSBnZXRcclxuICogQHNlZSBwdXRcclxuICogQHNlZSBwb3N0XHJcbiAqIEBzZWUgZGVsZXRlXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoPFQ+KG9wdGlvbnNPclVybDogaHR0cC5IdHRwT3B0aW9ucyB8IHN0cmluZywgYm9keT86IGFueSk6IFEuUHJvbWlzZTxUPiB7XHJcbiAgcmV0dXJuIHZlcmI8VD4oJ1BBVENIJywgb3B0aW9uc09yVXJsLCBib2R5KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIGlzc3VlcyBhbiBodHRwL2FqYXggREVMRVRFIHJlcXVlc3QgYWdhaW5zdCB0aGUgUmVsdXRpb24gc2VydmVyLlxyXG4gKlxyXG4gKiA8cD5cclxuICogUGxlYXNlIGNvbnNpZGVyIHRoaXMgZXhwb3J0IGFzIGFuIGltcGxlbWVudGF0aW9uIGRldGFpbCBvZiB0aGUgbGlicmFyeSBhbmQgdXNlIGRlbGV0ZSBpbnN0ZWFkLlxyXG4gKiA8L3A+XHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxyXG4gKiBAcGFyYW0gYm9keSByZXF1ZXN0IGJvZHkgdG8gc3VibWl0IGluIGNhc2Ugb3B0aW9uc09yVXJsIGlzIGEgdXJsLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEVycm9yIG9iamVjdCBpbmNsdWRpbmdcclxuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICpcclxuICogQHNlZSBoZWFkXHJcbiAqIEBzZWUgZ2V0XHJcbiAqIEBzZWUgcHV0XHJcbiAqIEBzZWUgcG9zdFxyXG4gKiBAc2VlIHBhdGNoXHJcbiAqIEBzZWUgZGVsZXRlXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGRlbDxUPihvcHRpb25zT3JVcmw6IGh0dHAuSHR0cE9wdGlvbnMgfCBzdHJpbmcsIGJvZHk/OiBhbnkpOiBRLlByb21pc2U8VD4ge1xyXG4gIHJldHVybiB2ZXJiPFQ+KCdERUxFVEUnLCBvcHRpb25zT3JVcmwsIGJvZHkpO1xyXG59XHJcblxyXG4vKipcclxuICogaXNzdWVzIGFuIGh0dHAvYWpheCBERUxFVEUgcmVxdWVzdCBhZ2FpbnN0IHRoZSBSZWx1dGlvbiBzZXJ2ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSBvcHRpb25zT3JVcmwgb2YgcmVxdWVzdCwgaW5jbHVkaW5nIHRhcmdldCBgdXJsYCwgb3IgdXJsLlxyXG4gKiBAcGFyYW0gYm9keSByZXF1ZXN0IGJvZHkgdG8gc3VibWl0IGluIGNhc2Ugb3B0aW9uc09yVXJsIGlzIGEgdXJsLlxyXG4gKiBAcmV0dXJuIHtRLlByb21pc2V9IG9mIHJlc3BvbnNlIGJvZHksIGluIGNhc2Ugb2YgZmFpbHVyZSByZWplY3RzIHRvIGFuIEVycm9yIG9iamVjdCBpbmNsdWRpbmdcclxuICogICAgYHJlcXVlc3RVcmxgLCBgc3RhdHVzQ29kZWAgYW5kIGBzdGF0dXNNZXNzYWdlYC5cclxuICpcclxuICogQHNlZSBoZWFkXHJcbiAqIEBzZWUgZ2V0XHJcbiAqIEBzZWUgcHV0XHJcbiAqIEBzZWUgcG9zdFxyXG4gKiBAc2VlIHBhdGNoXHJcbiAqXHJcbiAqIEBzZWUgYWpheFxyXG4gKi9cclxuZXhwb3J0IHsgZGVsIGFzIGRlbGV0ZSB9O1xyXG4iXX0=