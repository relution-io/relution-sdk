// Copyright (c) 2013 M-Way Solutions GmbH
// http://github.com/mwaylabs/The-M-Project/blob/absinthe/MIT-LICENSE.txt
"use strict";
// ===========================================================================
//
// Relution.LiveData.ObjectId uses code from meteor.js
// https://github.com/meteor/meteor/blob/master/packages/minimongo
//
// Thanks for sharing!
//
// ===========================================================================
// m_require('core/foundation/object.js');
/**
 * @internal For implementation use only!
 */
var ObjectID = (function () {
    function ObjectID(hexString) {
        // random-based impl of Mongo ObjectID
        if (hexString) {
            hexString = hexString.toLowerCase();
            if (!ObjectID._looksLikeObjectID(hexString)) {
                throw new Error('Invalid hexadecimal string for creating an ObjectID');
            }
            // meant to work with _.isEqual(), which relies on structural equality
            this._str = hexString;
        }
        else {
            this._str =
                this._hexString(8, new Date().getTime() / 1000) +
                    this._hexString(6, ObjectID.machineId) +
                    this._hexString(4, ObjectID.processId) +
                    this._hexString(6, ObjectID.counter++); // a 3-byte counter, starting with a random value.
        }
    }
    ObjectID._looksLikeObjectID = function (str) {
        return str.length === 24 && str.match(/^[0-9a-f]*$/);
    };
    ObjectID.prototype._hexString = function (len, num) {
        num = num || parseInt('' + (Math.random() * Math.pow(16, len)));
        var str = num.toString(16);
        while (str.length < len) {
            str = '0' + str;
        }
        return str.substr(0, len);
    };
    ObjectID.prototype.toString = function () {
        return 'ObjectID(\'' + this._str + '\')';
    };
    ObjectID.prototype.equals = function (other) {
        return other instanceof ObjectID && this.valueOf() === other.valueOf();
    };
    ObjectID.prototype.clone = function () {
        return new ObjectID(this._str);
    };
    ObjectID.prototype.typeName = function () {
        return 'oid';
    };
    ObjectID.prototype.getTimestamp = function () {
        return parseInt(this._str.substr(0, 8), 16) * 1000;
    };
    ObjectID.prototype.getMachineId = function () {
        return parseInt(this._str.substr(8, 6), 16);
    };
    ObjectID.prototype.getProcessId = function () {
        return parseInt(this._str.substr(14, 4), 16);
    };
    ObjectID.prototype.getCounter = function () {
        return parseInt(this._str.substr(18, 6), 16);
    };
    ObjectID.prototype.valueOf = function () {
        return this._str;
    };
    ObjectID.prototype.toJSON = function () {
        return this._str;
    };
    ObjectID.prototype.toHexString = function () {
        return this._str;
    };
    // Is this selector just shorthand for lookup by _id?
    ObjectID.prototype._selectorIsId = function (selector) {
        return (typeof selector === 'string') ||
            (typeof selector === 'number') ||
            selector instanceof ObjectID;
    };
    // Is the selector just lookup by _id (shorthand or not)?
    ObjectID.prototype._selectorIsIdPerhapsAsObject = function (selector) {
        return this._selectorIsId(selector) || (selector && typeof selector === 'object' && selector._id && this._selectorIsId(selector._id) && _.size(selector) === 1);
    };
    // If this is a selector which explicitly constrains the match by ID to a finite
    // number of documents, returns a list of their IDs.  Otherwise returns
    // null. Note that the selector may have other restrictions so it may not even
    // match those document!  We care about $in and $and since those are generated
    // access-controlled update and remove.
    ObjectID.prototype._idsMatchedBySelector = function (selector) {
        // Is the selector just an ID?
        if (this._selectorIsId(selector)) {
            return [selector];
        }
        if (!selector) {
            return null;
        }
        // Do we have an _id clause?
        if (_.has(selector, '_id')) {
            // Is the _id clause just an ID?
            if (this._selectorIsId(selector._id)) {
                return [selector._id];
            }
            // Is the _id clause {_id: {$in: ["x", "y", "z"]}}?
            if (selector._id && selector._id.$in && _.isArray(selector._id.$in) && !_.isEmpty(selector._id.$in) && _.all(selector._id.$in, this._selectorIsId)) {
                return selector._id.$in;
            }
            return null;
        }
        // If this is a top-level $and, and any of the clauses constrain their
        // documents, then the whole selector is constrained by any one clause's
        // constraint. (Well, by their intersection, but that seems unlikely.)
        if (selector.$and && _.isArray(selector.$and)) {
            for (var i = 0; i < selector.$and.length; ++i) {
                var subIds = this._idsMatchedBySelector(selector.$and[i]);
                if (subIds) {
                    return subIds;
                }
            }
        }
        return null;
    };
    ObjectID.counter = parseInt('' + (Math.random() * Math.pow(16, 6)));
    ObjectID.machineId = parseInt('' + (Math.random() * Math.pow(16, 6)));
    ObjectID.processId = parseInt('' + (Math.random() * Math.pow(16, 4)));
    return ObjectID;
}());
exports.ObjectID = ObjectID;
//# sourceMappingURL=objectid.js.map