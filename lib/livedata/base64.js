// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt
"use strict";
/**
 * The key string for the base 64 decoding and encoding.
 *
 * @type String
 */
var keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
/**
 * This method encodes a given binary input, using the base64 encoding.
 *
 * @param {String} input The binary to be encoded. (e.g. an requested image)
 * @returns {String} The base64 encoded string.
 */
function encodeBinary(input) {
    var output = '';
    var bytebuffer;
    var encodedCharIndexes = new Array(4);
    var inx = 0;
    var paddingBytes = 0;
    while (inx < input.length) {
        // Fill byte buffer array
        bytebuffer = new Array(3);
        for (var jnx = 0; jnx < bytebuffer.length; jnx++) {
            if (inx < input.length) {
                // throw away high-order byte, as documented at: https://developer.mozilla.org/En/Using_XMLHttpRequest#Handling_binary_data
                bytebuffer[jnx] = input.charCodeAt(inx++) & 0xff;
            }
            else {
                bytebuffer[jnx] = 0;
            }
        }
        // Get each encoded character, 6 bits at a time
        // index 1: first 6 bits
        encodedCharIndexes[0] = bytebuffer[0] >> 2;
        // index 2: second 6 bits (2 least significant bits from input byte 1 + 4 most significant bits from byte 2)
        encodedCharIndexes[1] = ((bytebuffer[0] & 0x3) << 4) | (bytebuffer[1] >> 4);
        // index 3: third 6 bits (4 least significant bits from input byte 2 + 2 most significant bits from byte 3)
        encodedCharIndexes[2] = ((bytebuffer[1] & 0x0f) << 2) | (bytebuffer[2] >> 6);
        // index 3: forth 6 bits (6 least significant bits from input byte 3)
        encodedCharIndexes[3] = bytebuffer[2] & 0x3f;
        // Determine whether padding happened, and adjust accordingly
        paddingBytes = inx - (input.length - 1);
        switch (paddingBytes) {
            case 2:
                // Set last 2 characters to padding char
                encodedCharIndexes[3] = 64;
                encodedCharIndexes[2] = 64;
                break;
            case 1:
                // Set last character to padding char
                encodedCharIndexes[3] = 64;
                break;
            default:
                break; // No padding - proceed
        }
        // Now we will grab each appropriate character out of our keystring
        // based on our index array and append it to the output string
        for (jnx = 0; jnx < encodedCharIndexes.length; jnx++) {
            output += keyStr.charAt(encodedCharIndexes[jnx]);
        }
    }
    return output;
}
exports.encodeBinary = encodeBinary;
/**
 * This method encodes a given input string, using the base64 encoding.
 *
 * @param {String} input The string to be encoded.
 * @returns {String} The base64 encoded string.
 */
function encode(input) {
    var output = '';
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    input = utf8Encode(input);
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        }
        else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}
exports.encode = encode;
function binaryEncode(input) {
    var output = '';
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    while (i < input.length) {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);
        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;
        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        }
        else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
    }
    return output;
}
exports.binaryEncode = binaryEncode;
/**
 * This method decodes a given input string, using the base64 decoding.
 *
 * @param {String} input The string to be decoded.
 * @returns {String} The base64 decoded string.
 */
function decode(input) {
    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');
    while (i < input.length) {
        enc1 = keyStr.indexOf(input.charAt(i++));
        enc2 = keyStr.indexOf(input.charAt(i++));
        enc3 = keyStr.indexOf(input.charAt(i++));
        enc4 = keyStr.indexOf(input.charAt(i++));
        chr1 = (enc1 << 2) | (enc2 >> 4);
        chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        chr3 = ((enc3 & 3) << 6) | enc4;
        output = output + String.fromCharCode(chr1);
        if (enc3 !== 64) {
            output = output + String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
            output = output + String.fromCharCode(chr3);
        }
    }
    return utf8Decode(output);
}
exports.decode = decode;
/**
 * Private method for UTF-8 encoding
 *
 * @private
 * @param {String} s The string to be encoded.
 * @returns {String} The utf8 encoded string.
 */
function utf8Encode(s) {
    s = s.replace(/\r\n/g, '\n');
    var utf8String = '';
    for (var n = 0; n < s.length; n++) {
        var c = s.charCodeAt(n);
        if (c < 128) {
            utf8String += String.fromCharCode(c);
        }
        else if ((c > 127) && (c < 2048)) {
            utf8String += String.fromCharCode((c >> 6) | 192);
            utf8String += String.fromCharCode((c & 63) | 128);
        }
        else {
            utf8String += String.fromCharCode((c >> 12) | 224);
            utf8String += String.fromCharCode(((c >> 6) & 63) | 128);
            utf8String += String.fromCharCode((c & 63) | 128);
        }
    }
    return utf8String;
}
/**
 * Private method for UTF-8 decoding
 *
 * @private
 * @param {String} utf8String The string to be decoded.
 * @returns {String} The utf8 decoded string.
 */
function utf8Decode(utf8String) {
    var s = '';
    var i;
    var c;
    var c1;
    var c2;
    var c3;
    i = c = c1 = c2 = 0;
    while (i < utf8String.length) {
        c = utf8String.charCodeAt(i);
        if (c < 128) {
            s += String.fromCharCode(c);
            i++;
        }
        else if ((c > 191) && (c < 224)) {
            c2 = utf8String.charCodeAt(i + 1);
            s += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i += 2;
        }
        else {
            c2 = utf8String.charCodeAt(i + 1);
            c3 = utf8String.charCodeAt(i + 2);
            s += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 3;
        }
    }
    return s;
}
//# sourceMappingURL=base64.js.map