// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt

import * as url from 'url';

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
export function getLocation(urlStr): any {
  if (!('document' in global)) {
    let result = url.parse(urlStr);
    result.host = result.hostname || '';
    result.toString = () => url.format(result);
    return result;
  }

  var location = document.createElement('a');
  location.href = urlStr || this.url;
  // IE doesn't populate all link properties when setting .href with a relative URL,
  // however .href will return an absolute URL which then can be used on itself
  // to populate these additional fields.
  if (location.host === '') {
    location.href = location.href;
  }
  return location;
}

export function resolveLocation(str) {
  return getLocation(str).toString();
}

export function hashLocation(str) {
  return hashCode(this.resolveLocation(str));
}

/**
 * @internal For library use only.
 */
export function hashCode(...args: string[]) {
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
