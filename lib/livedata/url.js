// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt
"use strict";
// Returns a unique identifier
/*
 url = "http://example.com:3000/pathname/?search=test#hash";

 location.protocol; // => "http:"
 location.host;     // => "example.com:3000"
 location.hostname; // => "example.com"
 location.port;     // => "3000"
 location.pathname; // => "/pathname/"
 location.hash;     // => "#hash"
 location.search;   // => "?search=test"
 */
function getLocation(url) {
    var location = document.createElement('a');
    location.href = url || this.url;
    // IE doesn't populate all link properties when setting .href with a relative URL,
    // however .href will return an absolute URL which then can be used on itself
    // to populate these additional fields.
    if (location.host === '') {
        location.href = location.href;
    }
    return location;
}
exports.getLocation = getLocation;
function resolveLocation(str) {
    return getLocation(str).toString();
}
exports.resolveLocation = resolveLocation;
function hashLocation(str) {
    return _hashCode(this.resolveLocation(str));
}
exports.hashLocation = hashLocation;
function _hashCode() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    var hash = 0;
    for (var i = 0; i < args.length; ++i) {
        var str = args[i] || '';
        for (var j = 0, l = str.length; j < l; ++j) {
            var char = str.charCodeAt(j);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
    }
    return hash;
}
//# sourceMappingURL=url.js.map