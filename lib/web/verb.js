/**
 * @file web/verb.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 01.06.2016
 * Copyright (c)
 * 2016
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */
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
//# sourceMappingURL=verb.js.map