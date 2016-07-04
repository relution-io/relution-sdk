/**
 * @file livedata/CipherSqlStore.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 04.11.2015
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
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var AbstractSqlStore_1 = require('./AbstractSqlStore');
var diag = require('../core/diag');
/**
 * stores LiveData into the WebSQL database.
 *
 * @example
 *
 * // The default configuration will save the complete model data as json
 * // into a database column with the name "data"
 * var MyCollection = Relution.livedata.Collection.extend({
 *      model: MyModel,
 *      entity: 'MyTableName',
 *      store: new Relution.livedata.CipherSqlStore()
 * });
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * var MyModel = Relution.livedata.Model.extend({
 *      idAttribute: 'id'
 * });
 * 0 (default): Documents - visible to iTunes and backed up by iCloud
 * 1: Library - backed up by iCloud, NOT visible to iTunes
 * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
 */
var CipherSqlStore = (function (_super) {
    __extends(CipherSqlStore, _super);
    function CipherSqlStore(options) {
        _super.call(this, options);
        if (options && !options.security) {
            throw new Error('security Key is required on a CipherSqlStore');
        }
        diag.debug.trace('CipherSqlStore', options);
        var self = this;
        this._openDb({
            error: function (error) {
                diag.debug.error(error);
                self.trigger('error', error);
            }
        });
    }
    /**
     * The new location option is used to select the database subdirectory location (iOS only) with the following choices:
     *
     * 0 (default): Documents - visible to iTunes and backed up by iCloud
     * 1: Library - backed up by iCloud, NOT visible to iTunes
     * 2: Library/LocalDatabase - NOT visible to iTunes and NOT backed up by iCloud
     *
     * @private
     */
    CipherSqlStore.prototype._openDb = function (errorCallback) {
        var error, dbError;
        if (!this.security) {
            return diag.debug.error('A CipherSqlStore need a Security Token!', this);
        }
        /* openDatabase(db_name, version, description, estimated_size, callback) */
        if (!this.db) {
            try {
                if (!global.sqlitePlugin) {
                    error = 'Your browser does not support SQLite plugin.';
                }
                else {
                    this.db = global.sqlitePlugin.openDatabase({ name: this.name, key: this.security, location: 2 });
                    if (this.entities) {
                        for (var entity in this.entities) {
                            this._createTable({ entity: entity });
                        }
                    }
                }
            }
            catch (e) {
                dbError = e;
            }
        }
        if (this.db) {
            if (this.version && this.db.version !== this.version) {
                this._updateDb(errorCallback);
            }
            else {
                this.handleSuccess(errorCallback, this.db);
            }
        }
        else if (dbError === 2 || dbError === '2') {
            // Version number mismatch.
            this._updateDb(errorCallback);
        }
        else {
            if (!error && dbError) {
                error = dbError;
            }
            this.handleSuccess(errorCallback, error);
        }
    };
    CipherSqlStore.prototype._updateDb = function (options) {
        var error;
        try {
            if (!this.db) {
                this.db = global.sqlitePlugin.openDatabase({ name: this.name, key: this.security, location: 2 });
            }
            try {
                this._sqlUpdateDatabase(this.db.version, this.version);
                diag.debug.warning('sqlcipher cant change the version its still not supported check out https://github.com/litehelpers/Cordova-sqlcipher-adapter#other-limitations');
            }
            catch (e) {
                error = e.message;
                diag.debug.error('webSql change version failed, DB-Version: ' + this.db.version);
            }
        }
        catch (e) {
            error = e.message;
        }
        if (error) {
            this.handleError(options, error);
        }
    };
    return CipherSqlStore;
}(AbstractSqlStore_1.AbstractSqlStore));
exports.CipherSqlStore = CipherSqlStore;
// mixins
var cipherSqlStore = _.extend(CipherSqlStore.prototype, {
    _type: 'Relution.LiveData.CipherSqlStore',
    security: null
});
diag.debug.assert(function () { return CipherSqlStore.prototype.isPrototypeOf(Object.create(cipherSqlStore)); });
//# sourceMappingURL=CipherSqlStore.js.map