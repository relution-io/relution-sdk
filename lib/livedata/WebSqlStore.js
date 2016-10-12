/*
 * @file livedata/WebSqlStore.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 24.06.2015
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
 * @module livedata
 */
/** */
"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var Q = require('q');
var diag = require('../core/diag');
var objectid = require('../core/objectid');
var cipher = require('../core/cipher');
var Store_1 = require('./Store');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
/**
 * openDatabase of browser or via require websql.
 *
 * @internal Not public API, exported for testing purposes only!
 */
function openDatabase(options) {
    var db;
    var sqlitePlugin = 'sqlitePlugin';
    if (global[sqlitePlugin]) {
        // device implementation
        options = _.clone(options);
        if (!options.key) {
            if (options.security) {
                options.key = options.security;
                delete options.security;
            }
            else if (options.credentials) {
                options.key = cipher.hashJsonSync(options.credentials, 'sha256').toString('hex');
                delete options.credentials;
            }
        }
        if (!options.location) {
            options.location = 2;
        }
        db = global[sqlitePlugin].openDatabase(options);
    }
    else if (global['openDatabase']) {
        // native implementation
        db = global['openDatabase'](options.name, options.version || '', options.description || '', options.size || 1024 * 1024);
    }
    else if (process && !process['browser']) {
        // node.js implementation
        var websql = void 0;
        try {
            websql = require('websql');
        }
        catch (error) {
            diag.debug.warn(error);
        }
        if (websql) {
            db = websql(options.name, options.version || '', options.description || '', options.size || 1024 * 1024);
        }
    }
    if (!db) {
        // when this is reached no supported implementation is present
        throw new Error('WebSQL implementation is not available');
    }
    return db;
}
exports.openDatabase = openDatabase;
/**
 * matches char codes subject to https://issues.apache.org/jira/browse/CB-9435 Cordova iOS bug.
 */
var BAD_UNICODES = /[\u2028\u2029]/;
/**
 * stores LiveData into the WebSQL database.
 *
 * @example
 *
 * // The default configuration will save the complete model data as json
 * // into a database column with the name "data"
 * class MyCollection extends Relution.livedata.Collection {};
 * MyCollection.prototype.model = MyModel;
 * MyCollection.prototype.entity = 'MyTableName';
 * MyCollection.prototype.store = new Relution.livedata.WebSqlStore();
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * class MyModel extends Relution.livedata.Model {};
 * MyModel.prototype.idAttribute = 'id';
 */
var WebSqlStore = (function (_super) {
    __extends(WebSqlStore, _super);
    function WebSqlStore(options) {
        var _this = this;
        _super.call(this, options);
        this.db = null;
        this.entities = {};
        this.transactionPromise = Q.resolve(null);
        if (options && options.entities) {
            for (var entity in options.entities) {
                this.entities[entity] = {
                    table: options.entities[entity] || entity
                };
            }
        }
        this._openDb(_.defaults({
            name: this.name,
            size: this.size,
            version: this.version,
            error: function (error) {
                diag.debug.error(error.message);
                _this.handleError(options, error);
                _this.trigger('error', error);
            }
        }, options));
    }
    /**
     * closes the database.
     */
    WebSqlStore.prototype.close = function () {
        diag.debug.info('Store close');
        if (this.db) {
            try {
                // some implementations offer a close() method
                if (this.db.close) {
                    this.db.close();
                }
            }
            finally {
                this.db = null;
            }
        }
    };
    /**
     * @private
     */
    WebSqlStore.prototype._openDb = function (options) {
        var error;
        if (!this.db) {
            try {
                this.db = openDatabase(options);
                if (this.entities) {
                    for (var entity in this.entities) {
                        this._createTable({
                            entity: entity
                        });
                    }
                }
            }
            catch (e) {
                error = e;
            }
        }
        if (this.db) {
            if (this.version && this.db.version !== this.version && this.db.changeVersion) {
                this._updateDb(options);
            }
            else {
                this.handleSuccess(options, this.db);
            }
        }
        else if (error === 2 || error === '2') {
            // Version number mismatch.
            this._updateDb(options);
        }
        else if (error) {
            if (!_.isError(error)) {
                error = new Error('' + error);
            }
            this.handleError(options, error);
        }
        else {
            this.handleSuccess(options, this.db);
        }
    };
    WebSqlStore.prototype._updateDb = function (options) {
        var error;
        var lastSql;
        var that = this;
        try {
            if (!this.db) {
                this.db = openDatabase(options);
            }
            try {
                var arSql = this._sqlUpdateDatabase(this.db.version, this.version);
                this.db.changeVersion(this.db.version, this.version, function (tx) {
                    _.each(arSql, function (sql) {
                        diag.debug.info('sql statement: ' + sql);
                        lastSql = sql;
                        tx.executeSql(sql);
                    });
                }, function (err) {
                    if (!lastSql && that.db.version === that.version) {
                        // not a real error, concurrent migration attempt completed already
                        that.handleSuccess(options, that.db);
                    }
                    else {
                        if (lastSql) {
                            err.sql = lastSql;
                        }
                        that.handleError(options, err);
                    }
                }, function () {
                    that.handleSuccess(options, that.db);
                });
            }
            catch (e) {
                error = e;
                diag.debug.error('webSql change version failed, DB-Version: ' + this.db.version);
            }
        }
        catch (e) {
            error = e;
        }
        if (error) {
            this.handleError(options, error);
        }
    };
    WebSqlStore.prototype.sync = function (method, model, options) {
        options = options || {};
        var that = this;
        var q = Q.defer();
        var opts = _.extend({
            entity: model.entity || options.entity
        }, options || {}, {
            success: function (response) {
                var result = that.handleSuccess(options, response) || response;
                q.resolve(result);
                return result;
            },
            error: function (error) {
                var result = that.handleError(options, error);
                if (result) {
                    q.resolve(result);
                    return result;
                }
                else {
                    q.reject(error);
                }
            }
        });
        switch (method) {
            case 'create':
                that._checkTable(opts, function () {
                    that._insertOrReplace(model, opts);
                });
                break;
            case 'update':
            case 'patch':
                that._checkTable(opts, function () {
                    that._insertOrReplace(model, opts);
                });
                break;
            case 'delete':
                that._checkTable(opts, function () {
                    that._delete(model, opts);
                });
                break;
            case 'read':
                that._checkTable(opts, function () {
                    that._select(model, opts);
                });
                break;
            default:
                break;
        }
        return q.promise;
    };
    WebSqlStore.prototype.select = function (options) {
        this._select(null, options);
    };
    WebSqlStore.prototype.drop = function (options) {
        this._dropTable(options);
    };
    WebSqlStore.prototype.createTable = function (options) {
        this._createTable(options);
    };
    WebSqlStore.prototype.execute = function (options) {
        this._executeSql(options);
    };
    WebSqlStore.prototype._sqlUpdateDatabase = function (oldVersion, newVersion) {
        // create sql array, simply drop and create the database
        var sql = [];
        for (var entity in this.entities) {
            sql.push(this._sqlDropTable(entity));
            sql.push(this._sqlCreateTable(entity));
        }
        return sql;
    };
    WebSqlStore.prototype._sqlDropTable = function (entity) {
        return "DROP TABLE IF EXISTS '" + this.entities[entity].table + "';";
    };
    WebSqlStore.prototype._sqlCreateTable = function (entity) {
        return "CREATE TABLE IF NOT EXISTS '" + this.entities[entity].table + "' (id VARCHAR(255) NOT NULL PRIMARY KEY ASC UNIQUE, data TEXT NOT NULL);";
    };
    WebSqlStore.prototype._sqlDelete = function (options, entity) {
        var sql = 'DELETE FROM \'' + this.entities[entity].table + '\'';
        var where = this._sqlWhereFromData(options, entity);
        if (where) {
            sql += ' WHERE ' + where;
        }
        else {
            diag.debug.assert(function () { return false; }, 'attempt of deletion without where clause');
        }
        sql += options.and ? ' AND ' + options.and : '';
        return sql;
    };
    WebSqlStore.prototype._sqlWhereFromData = function (options, entity) {
        if (options && options.models && entity) {
            var ids = [];
            var that = this;
            _.each(options.models, function (model) {
                if (!model.isNew()) {
                    ids.push(that._sqlValue(model.id));
                }
            });
            if (ids.length > 0) {
                return 'id IN (' + ids.join(',') + ')';
            }
        }
        return '';
    };
    WebSqlStore.prototype._sqlSelect = function (options, entity) {
        var sql = 'SELECT ';
        sql += '*';
        sql += ' FROM \'' + this.entities[entity].table + '\'';
        if (options.syncContext) {
            // new code must do stuff in JavaScript, not SQL
            return sql;
        }
        var where = this._sqlWhereFromData(options, entity);
        if (where) {
            sql += ' WHERE ' + where;
        }
        if (options.order) {
            sql += ' ORDER BY ' + options.order;
        }
        if (options.limit) {
            sql += ' LIMIT ' + options.limit;
        }
        if (options.offset) {
            sql += ' OFFSET ' + options.offset;
        }
        return sql;
    };
    WebSqlStore.prototype._sqlValue = function (value) {
        value = _.isNull(value) ? 'null' : _.isObject(value) ? JSON.stringify(value) : value.toString();
        value = value.replace(/"/g, '""');
        return '"' + value + '"';
    };
    WebSqlStore.prototype._dropTable = function (options) {
        var entity = options.entity;
        if (entity in this.entities && this.entities[entity].created !== false) {
            if (this._checkDb(options)) {
                var sql = this._sqlDropTable(entity);
                // reset flag
                this._executeTransaction(options, [sql]);
            }
        }
        else {
            // no need dropping as table was not created
            this.handleSuccess(options, undefined);
        }
    };
    WebSqlStore.prototype._createTable = function (options) {
        var entity = options.entity;
        if (!(entity in this.entities)) {
            this.entities[entity] = {
                table: entity
            };
        }
        if (this._checkDb(options)) {
            var sql = this._sqlCreateTable(entity);
            // reset flag
            this._executeTransaction(options, [sql]);
        }
    };
    WebSqlStore.prototype._checkTable = function (options, callback) {
        var that = this;
        var entity = options.entity;
        if (entity && (!this.entities[entity] || this.entities[entity].created === false)) {
            this._createTable({
                success: function () {
                    that.entities[entity].created = true;
                    callback();
                },
                error: function (error) {
                    that.handleError(options, error);
                },
                entity: entity
            });
        }
        else {
            // we know it's created already
            callback();
        }
    };
    WebSqlStore.prototype._insertOrReplace = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options) && this._checkData(options, models)) {
            var statements = [];
            var sqlTemplate = 'INSERT OR REPLACE INTO \'' + this.entities[entity].table + '\' (';
            for (var i = 0; i < models.length; i++) {
                var amodel = models[i];
                var statement = ''; // the actual sql insert string with values
                if (!amodel.id) {
                    amodel.set(amodel.idAttribute, objectid.makeObjectID());
                }
                var value = options.attrs || amodel.attributes;
                var keys = ['id', 'data'];
                var json = JSON.stringify(value);
                while (BAD_UNICODES.test(json)) {
                    // workaround https://issues.apache.org/jira/browse/CB-9435 on iOS
                    json = json.replace('\u2028', '\\u2028').replace('\u2029', '\\u2029');
                }
                var args = [amodel.id, json];
                if (args.length > 0) {
                    var values = new Array(args.length).join('?,') + '?';
                    var columns = '\'' + keys.join('\',\'') + '\'';
                    statement += sqlTemplate + columns + ') VALUES (' + values + ');';
                    statements.push({
                        statement: statement,
                        arguments: args
                    });
                }
            }
            this._executeTransaction(options, statements, model.toJSON());
        }
    };
    WebSqlStore.prototype._select = function (model, options) {
        var entity = options.entity;
        if (this._checkDb(options)) {
            var lastStatement;
            var isCollection = !Model_1.isModel(model);
            var result;
            if (isCollection) {
                result = [];
            }
            else if (model) {
                options.models = [model];
            }
            var stm = this._sqlSelect(options, entity);
            var that = this;
            this.db.readTransaction(function (t) {
                var statement = stm.statement || stm;
                var args = stm.arguments;
                lastStatement = statement;
                diag.debug.info('sql statement: ' + statement);
                if (args) {
                    diag.debug.trace('arguments: ' + JSON.stringify(args));
                }
                t.executeSql(statement, args, function (tx, res) {
                    var len = res.rows.length;
                    for (var i = 0; i < len; i++) {
                        var item = res.rows.item(i);
                        var attrs;
                        try {
                            attrs = JSON.parse(item.data);
                        }
                        catch (e) {
                            that.trigger('error', e);
                            continue;
                        }
                        if (isCollection) {
                            result.push(attrs);
                        }
                        else {
                            result = attrs;
                            break;
                        }
                    }
                }, function (t2, e) {
                    // error
                    diag.debug.error('webSql error: ' + e.message);
                    return true; // abort
                });
            }, function (sqlError) {
                if (lastStatement) {
                    sqlError.sql = lastStatement;
                }
                diag.debug.error('WebSql Syntax Error: ' + sqlError.message);
                that.handleError(options, sqlError);
            }, function () {
                if (result) {
                    if (options.syncContext) {
                        result = options.syncContext.processAttributes(result, options);
                    }
                    that.handleSuccess(options, result);
                }
                else {
                    var error = new Error('no result');
                    if (lastStatement) {
                        error.sql = lastStatement;
                    }
                    that.handleError(options, error);
                }
            });
        }
    };
    WebSqlStore.prototype._delete = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options)) {
            options.models = models;
            var sql = this._sqlDelete(options, entity);
            // reset flag
            this._executeTransaction(options, [sql], model.toJSON());
        }
    };
    WebSqlStore.prototype._executeSql = function (options) {
        if (options.sql) {
            this._executeTransaction(options, [options.sql]);
        }
    };
    WebSqlStore.prototype._executeTransaction = function (options, statements, result) {
        var _this = this;
        if (!this._checkDb(options)) {
            return; // database not open, error was issued by _checkDb() above
        }
        // following sequentially processes transactions avoiding running too many concurrently
        this.transactionPromise = this.transactionPromise.finally(function () {
            var lastStatement;
            return Q.Promise(function (resolve, reject) {
                /* transaction has 3 parameters: the transaction callback, the error callback and the success callback */
                return _this.db.transaction(function (t) {
                    return _.each(statements, function (stm) {
                        var statement = stm.statement || stm;
                        var args = stm.arguments;
                        lastStatement = statement;
                        if (diag.debug.enabled) {
                            diag.debug.info('sql statement: ' + statement);
                            if (args) {
                                diag.debug.trace('    arguments: ' + JSON.stringify(args));
                                diag.debug.assert(function () {
                                    return !args.some(function (arg) { return typeof arg === 'string' && BAD_UNICODES.test(arg); });
                                }, 'https://issues.apache.org/jira/browse/CB-9435 iOS unicode issue!');
                            }
                        }
                        t.executeSql(statement, args);
                    });
                }, reject, resolve);
            }).then(function () {
                return _this.handleSuccess(options, result) || null;
            }, function (error) {
                if (lastStatement) {
                    error.sql = lastStatement;
                }
                diag.debug.error(error.message);
                return _this.handleError(options, error) || null;
            });
        });
    };
    WebSqlStore.prototype._checkDb = function (options) {
        // has to be initialized first
        if (!this.db) {
            var error = new Error('db handler not initialized.');
            diag.debug.error(error.message);
            this.handleError(options, error);
            return false;
        }
        return true;
    };
    WebSqlStore.prototype._checkData = function (options, data) {
        if ((!_.isArray(data) || data.length === 0) && !_.isObject(data)) {
            var error = new Error('no data.');
            diag.debug.error(error.message);
            this.handleError(options, error);
            return false;
        }
        return true;
    };
    return WebSqlStore;
}(Store_1.Store));
exports.WebSqlStore = WebSqlStore;
// mixins
var webSqlStore = _.extend(WebSqlStore.prototype, {
    _type: 'Relution.livedata.WebSqlStore',
    size: 1024 * 1024,
    version: '1.0'
});
diag.debug.assert(function () { return WebSqlStore.prototype.isPrototypeOf(Object.create(webSqlStore)); });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvV2ViU3FsU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksUUFBUSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFDN0MsSUFBWSxNQUFNLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUV6QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF1QyxjQUFjLENBQUMsQ0FBQTtBQTJCdEQ7Ozs7R0FJRztBQUNILHNCQUE2QixPQUFzQjtJQUNqRCxJQUFJLEVBQVksQ0FBQztJQUNqQixJQUFNLFlBQVksR0FBRyxjQUFjLENBQUM7SUFDcEMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6Qix3QkFBd0I7UUFDeEIsT0FBTyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDM0IsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNqQixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDckIsT0FBTyxDQUFDLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDO2dCQUMvQixPQUFPLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDMUIsQ0FBQztZQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENB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RUFBL0QsQ0FBK0QsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIEBmaWxlIGxpdmVkYXRhL1dlYlNxbFN0b3JlLnRzXG4gKiBSZWx1dGlvbiBTREtcbiAqXG4gKiBDcmVhdGVkIGJ5IFRob21hcyBCZWNrbWFubiBvbiAyNC4wNi4yMDE1XG4gKiBDb3B5cmlnaHQgMjAxNiBNLVdheSBTb2x1dGlvbnMgR21iSFxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICovXG4vKipcbiAqIEBtb2R1bGUgbGl2ZWRhdGFcbiAqL1xuLyoqICovXG5cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIFEgZnJvbSAncSc7XG5cbmltcG9ydCAqIGFzIGRpYWcgZnJvbSAnLi4vY29yZS9kaWFnJztcbmltcG9ydCAqIGFzIG9iamVjdGlkIGZyb20gJy4uL2NvcmUvb2JqZWN0aWQnO1xuaW1wb3J0ICogYXMgY2lwaGVyIGZyb20gJy4uL2NvcmUvY2lwaGVyJztcblxuaW1wb3J0IHtTdG9yZX0gZnJvbSAnLi9TdG9yZSc7XG5pbXBvcnQge01vZGVsLCBpc01vZGVsfSBmcm9tICcuL01vZGVsJztcbmltcG9ydCB7Q29sbGVjdGlvbiwgaXNDb2xsZWN0aW9ufSBmcm9tICcuL0NvbGxlY3Rpb24nO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdlYlNxbE9wdGlvbnMge1xuICBuYW1lOiBzdHJpbmc7XG4gIGRlc2NyaXB0aW9uPzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuXG4gIHNpemU/OiBudW1iZXI7XG4gIGxvY2F0aW9uPzogbnVtYmVyO1xuXG4gIGtleT86IHN0cmluZztcbiAgc2VjdXJpdHk/OiBzdHJpbmc7XG4gIGNyZWRlbnRpYWxzPzogYW55O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN0YXRlbWVudCB7XG4gIHN0YXRlbWVudDogc3RyaW5nLFxuICBhcmd1bWVudHM6IGFueVtdXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU3FsRXJyb3IgZXh0ZW5kcyBFcnJvciB7XG4gIC8qKlxuICAgKiBldmVudHVhbGx5IGNvbnRhaW5zIGxhc3QgcmVjZW50bHkgZXhlY3V0ZWQgU1FMIGNhdXNpbmcgdGhlIGVycm9yLlxuICAgKi9cbiAgc3FsPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIG9wZW5EYXRhYmFzZSBvZiBicm93c2VyIG9yIHZpYSByZXF1aXJlIHdlYnNxbC5cbiAqXG4gKiBAaW50ZXJuYWwgTm90IHB1YmxpYyBBUEksIGV4cG9ydGVkIGZvciB0ZXN0aW5nIHB1cnBvc2VzIG9ubHkhXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBvcGVuRGF0YWJhc2Uob3B0aW9uczogV2ViU3FsT3B0aW9ucykge1xuICBsZXQgZGI6IERhdGFiYXNlO1xuICBjb25zdCBzcWxpdGVQbHVnaW4gPSAnc3FsaXRlUGx1Z2luJztcbiAgaWYgKGdsb2JhbFtzcWxpdGVQbHVnaW5dKSB7XG4gICAgLy8gZGV2aWNlIGltcGxlbWVudGF0aW9uXG4gICAgb3B0aW9ucyA9IF8uY2xvbmUob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLmtleSkge1xuICAgICAgaWYgKG9wdGlvbnMuc2VjdXJpdHkpIHtcbiAgICAgICAgb3B0aW9ucy5rZXkgPSBvcHRpb25zLnNlY3VyaXR5O1xuICAgICAgICBkZWxldGUgb3B0aW9ucy5zZWN1cml0eTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jcmVkZW50aWFscykge1xuICAgICAgICBvcHRpb25zLmtleSA9IGNpcGhlci5oYXNoSnNvblN5bmMob3B0aW9ucy5jcmVkZW50aWFscywgJ3NoYTI1NicpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgZGVsZXRlIG9wdGlvbnMuY3JlZGVudGlhbHM7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5sb2NhdGlvbikge1xuICAgICAgb3B0aW9ucy5sb2NhdGlvbiA9IDI7XG4gICAgfVxuICAgIGRiID0gZ2xvYmFsW3NxbGl0ZVBsdWdpbl0ub3BlbkRhdGFiYXNlKG9wdGlvbnMpO1xuICB9IGVsc2UgaWYgKGdsb2JhbFsnb3BlbkRhdGFiYXNlJ10pIHtcbiAgICAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb25cbiAgICBkYiA9IGdsb2JhbFsnb3BlbkRhdGFiYXNlJ10ob3B0aW9ucy5uYW1lLCBvcHRpb25zLnZlcnNpb24gfHwgJycsIG9wdGlvbnMuZGVzY3JpcHRpb24gfHwgJycsIG9wdGlvbnMuc2l6ZSB8fCAxMDI0ICogMTAyNCk7XG4gIH0gZWxzZSBpZiAocHJvY2VzcyAmJiAhcHJvY2Vzc1snYnJvd3NlciddKSB7XG4gICAgLy8gbm9kZS5qcyBpbXBsZW1lbnRhdGlvblxuICAgIGxldCB3ZWJzcWw6IHR5cGVvZiB3aW5kb3cub3BlbkRhdGFiYXNlO1xuICAgIHRyeSB7XG4gICAgICB3ZWJzcWwgPSByZXF1aXJlKCd3ZWJzcWwnKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKGVycm9yKTtcbiAgICB9XG4gICAgaWYgKHdlYnNxbCkge1xuICAgICAgZGIgPSB3ZWJzcWwob3B0aW9ucy5uYW1lLCBvcHRpb25zLnZlcnNpb24gfHwgJycsIG9wdGlvbnMuZGVzY3JpcHRpb24gfHwgJycsIG9wdGlvbnMuc2l6ZSB8fCAxMDI0ICogMTAyNCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFkYikge1xuICAgIC8vIHdoZW4gdGhpcyBpcyByZWFjaGVkIG5vIHN1cHBvcnRlZCBpbXBsZW1lbnRhdGlvbiBpcyBwcmVzZW50XG4gICAgdGhyb3cgbmV3IEVycm9yKCdXZWJTUUwgaW1wbGVtZW50YXRpb24gaXMgbm90IGF2YWlsYWJsZScpO1xuICB9XG4gIHJldHVybiBkYjtcbn1cblxuLyoqXG4gKiBtYXRjaGVzIGNoYXIgY29kZXMgc3ViamVjdCB0byBodHRwczovL2lzc3Vlcy5hcGFjaGUub3JnL2ppcmEvYnJvd3NlL0NCLTk0MzUgQ29yZG92YSBpT1MgYnVnLlxuICovXG5jb25zdCBCQURfVU5JQ09ERVMgPSAvW1xcdTIwMjhcXHUyMDI5XS87XG5cbi8qKlxuICogc3RvcmVzIExpdmVEYXRhIGludG8gdGhlIFdlYlNRTCBkYXRhYmFzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGpzb25cbiAqIC8vIGludG8gYSBkYXRhYmFzZSBjb2x1bW4gd2l0aCB0aGUgbmFtZSBcImRhdGFcIlxuICogY2xhc3MgTXlDb2xsZWN0aW9uIGV4dGVuZHMgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiB7fTtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5lbnRpdHkgPSAnTXlUYWJsZU5hbWUnO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IG5ldyBSZWx1dGlvbi5saXZlZGF0YS5XZWJTcWxTdG9yZSgpO1xuICpcbiAqIC8vIElmIHlvdSB3YW50IHRvIHVzZSBzcGVjaWZpYyBjb2x1bW5zIHlvdSBjYW4gc3BlY2lmeSB0aGUgZmllbGRzXG4gKiAvLyBpbiB0aGUgZW50aXR5IG9mIHlvdXIgbW9kZWwgbGlrZSB0aGlzOlxuICogY2xhc3MgTXlNb2RlbCBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLk1vZGVsIHt9O1xuICogTXlNb2RlbC5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAnaWQnO1xuICovXG5leHBvcnQgY2xhc3MgV2ViU3FsU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XG4gIC8vIGZvbGxvd2luZyBhcmUgc3RvcmUtc3BlY2lmaWMgb3B0aW9ucywgZGVmYXVsdHMgc3RvcmVkIGluIHByb3RvdHlwZSBhdCBlbmQgb2YgdGhpcyBmaWxlXG4gIHByb3RlY3RlZCBzaXplOiBudW1iZXI7XG4gIHByb3RlY3RlZCB2ZXJzaW9uOiBzdHJpbmc7XG5cbiAgcHJvdGVjdGVkIGRiOiBEYXRhYmFzZSA9IG51bGw7XG4gIHByb3RlY3RlZCBlbnRpdGllczogeyBbZW50aXR5OiBzdHJpbmddOiB7XG4gICAgdGFibGU6IHN0cmluZywgICAgLy8gYnkgZGVmYXVsdCwgZW50aXR5IGl0c2VsZiBidXQgaXMgZ2l2ZW4gZXhwbGljaXRseSBieSBTeW5jU3RvcmUhXG4gICAgY3JlYXRlZD86IGJvb2xlYW4gLy8gdHJpLXN0YXRlIGFzIGluaXRpYWwgc3RhdGUgaXMgbm90IGtub3duIGFuZCB0aHVzIHVuZGVmaW5lZFxuICB9IH0gPSB7fTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmVudGl0aWVzKSB7XG4gICAgICBmb3IgKHZhciBlbnRpdHkgaW4gb3B0aW9ucy5lbnRpdGllcykge1xuICAgICAgICB0aGlzLmVudGl0aWVzW2VudGl0eV0gPSB7XG4gICAgICAgICAgdGFibGU6IG9wdGlvbnMuZW50aXRpZXNbZW50aXR5XSB8fCBlbnRpdHlcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9vcGVuRGIoXy5kZWZhdWx0cyh7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICBzaXplOiB0aGlzLnNpemUsXG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG5cbiAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0sIG9wdGlvbnMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZXMgdGhlIGRhdGFiYXNlLlxuICAgKi9cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIGRpYWcuZGVidWcuaW5mbygnU3RvcmUgY2xvc2UnKTtcbiAgICBpZiAodGhpcy5kYikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gc29tZSBpbXBsZW1lbnRhdGlvbnMgb2ZmZXIgYSBjbG9zZSgpIG1ldGhvZFxuICAgICAgICBpZiAoKDxhbnk+dGhpcy5kYikuY2xvc2UpIHtcbiAgICAgICAgICAoPGFueT50aGlzLmRiKS5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0aGlzLmRiID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByaXZhdGUgX29wZW5EYihvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZXJyb3I6IEVycm9yIHwgbnVtYmVyIHwgc3RyaW5nO1xuICAgIGlmICghdGhpcy5kYikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5kYiA9IG9wZW5EYXRhYmFzZShvcHRpb25zKTtcbiAgICAgICAgaWYgKHRoaXMuZW50aXRpZXMpIHtcbiAgICAgICAgICBmb3IgKHZhciBlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlVGFibGUoe1xuICAgICAgICAgICAgICBlbnRpdHk6IGVudGl0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yID0gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kYikge1xuICAgICAgaWYgKHRoaXMudmVyc2lvbiAmJiB0aGlzLmRiLnZlcnNpb24gIT09IHRoaXMudmVyc2lvbiAmJiB0aGlzLmRiLmNoYW5nZVZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRGIob3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdGhpcy5kYik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlcnJvciA9PT0gMiB8fCBlcnJvciA9PT0gJzInKSB7XG4gICAgICAvLyBWZXJzaW9uIG51bWJlciBtaXNtYXRjaC5cbiAgICAgIHRoaXMuX3VwZGF0ZURiKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoZXJyb3IpIHtcbiAgICAgIGlmICghXy5pc0Vycm9yKGVycm9yKSkge1xuICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignJyArIGVycm9yKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgPEVycm9yPmVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHRoaXMuZGIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZURiKG9wdGlvbnM6IFdlYlNxbE9wdGlvbnMpIHtcbiAgICB2YXIgZXJyb3I6IEVycm9yO1xuICAgIHZhciBsYXN0U3FsOiBzdHJpbmc7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuZGIpIHtcbiAgICAgICAgdGhpcy5kYiA9IG9wZW5EYXRhYmFzZShvcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBhclNxbCA9IHRoaXMuX3NxbFVwZGF0ZURhdGFiYXNlKHRoaXMuZGIudmVyc2lvbiwgdGhpcy52ZXJzaW9uKTtcbiAgICAgICAgdGhpcy5kYi5jaGFuZ2VWZXJzaW9uKHRoaXMuZGIudmVyc2lvbiwgdGhpcy52ZXJzaW9uLCBmdW5jdGlvbiAodHgpIHtcbiAgICAgICAgICBfLmVhY2goYXJTcWwsIGZ1bmN0aW9uIChzcWwpIHtcbiAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc3FsIHN0YXRlbWVudDogJyArIHNxbCk7XG4gICAgICAgICAgICBsYXN0U3FsID0gc3FsO1xuICAgICAgICAgICAgdHguZXhlY3V0ZVNxbChzcWwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBpZiAoIWxhc3RTcWwgJiYgdGhhdC5kYi52ZXJzaW9uID09PSB0aGF0LnZlcnNpb24pIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHJlYWwgZXJyb3IsIGNvbmN1cnJlbnQgbWlncmF0aW9uIGF0dGVtcHQgY29tcGxldGVkIGFscmVhZHlcbiAgICAgICAgICAgIHRoYXQuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCB0aGF0LmRiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGxhc3RTcWwpIHtcbiAgICAgICAgICAgICAgZXJyLnNxbCA9IGxhc3RTcWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHRoYXQuZGIpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3IgPSBlO1xuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCd3ZWJTcWwgY2hhbmdlIHZlcnNpb24gZmFpbGVkLCBEQi1WZXJzaW9uOiAnICsgdGhpcy5kYi52ZXJzaW9uKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlcnJvciA9IGU7XG4gICAgfVxuICAgIGlmIChlcnJvcikge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHEgPSBRLmRlZmVyKCk7XG4gICAgdmFyIG9wdHMgPSBfLmV4dGVuZCh7XG4gICAgICBlbnRpdHk6IG1vZGVsLmVudGl0eSB8fCBvcHRpb25zLmVudGl0eVxuICAgIH0sIG9wdGlvbnMgfHwge30sIHtcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZTogYW55KSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGF0LmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xuICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yOiBFcnJvcikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhhdC5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHEucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgIHRoYXQuX2NoZWNrVGFibGUob3B0cywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoYXQuX2luc2VydE9yUmVwbGFjZShtb2RlbCwgb3B0cyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIGNhc2UgJ3BhdGNoJzpcbiAgICAgICAgdGhhdC5fY2hlY2tUYWJsZShvcHRzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhhdC5faW5zZXJ0T3JSZXBsYWNlKG1vZGVsLCBvcHRzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICB0aGF0Ll9jaGVja1RhYmxlKG9wdHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0Ll9kZWxldGUobW9kZWwsIG9wdHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICB0aGF0Ll9jaGVja1RhYmxlKG9wdHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0Ll9zZWxlY3QobW9kZWwsIG9wdHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcS5wcm9taXNlO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNlbGVjdChvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9zZWxlY3QobnVsbCwgb3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZHJvcChvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9kcm9wVGFibGUob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY3JlYXRlVGFibGUob3B0aW9uczogYW55KSB7XG4gICAgdGhpcy5fY3JlYXRlVGFibGUob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZXhlY3V0ZShvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9leGVjdXRlU3FsKG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxVcGRhdGVEYXRhYmFzZShvbGRWZXJzaW9uOiBzdHJpbmcgfCBET01TdHJpbmcsIG5ld1ZlcnNpb246IHN0cmluZykge1xuICAgIC8vIGNyZWF0ZSBzcWwgYXJyYXksIHNpbXBseSBkcm9wIGFuZCBjcmVhdGUgdGhlIGRhdGFiYXNlXG4gICAgdmFyIHNxbDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKHZhciBlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykge1xuICAgICAgc3FsLnB1c2godGhpcy5fc3FsRHJvcFRhYmxlKGVudGl0eSkpO1xuICAgICAgc3FsLnB1c2godGhpcy5fc3FsQ3JlYXRlVGFibGUoZW50aXR5KSk7XG4gICAgfVxuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbERyb3BUYWJsZShlbnRpdHk6IHN0cmluZykge1xuICAgIHJldHVybiBgRFJPUCBUQUJMRSBJRiBFWElTVFMgJyR7dGhpcy5lbnRpdGllc1tlbnRpdHldLnRhYmxlfSc7YDtcbiAgfVxuXG4gIHByb3RlY3RlZCBfc3FsQ3JlYXRlVGFibGUoZW50aXR5OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTICcke3RoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZX0nIChpZCBWQVJDSEFSKDI1NSkgTk9UIE5VTEwgUFJJTUFSWSBLRVkgQVNDIFVOSVFVRSwgZGF0YSBURVhUIE5PVCBOVUxMKTtgO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxEZWxldGUob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIHZhciBzcWwgPSAnREVMRVRFIEZST00gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcnO1xuICAgIHZhciB3aGVyZSA9IHRoaXMuX3NxbFdoZXJlRnJvbURhdGEob3B0aW9ucywgZW50aXR5KTtcbiAgICBpZiAod2hlcmUpIHtcbiAgICAgIHNxbCArPSAnIFdIRVJFICcgKyB3aGVyZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZmFsc2UsICdhdHRlbXB0IG9mIGRlbGV0aW9uIHdpdGhvdXQgd2hlcmUgY2xhdXNlJyk7XG4gICAgfVxuICAgIHNxbCArPSBvcHRpb25zLmFuZCA/ICcgQU5EICcgKyBvcHRpb25zLmFuZCA6ICcnO1xuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbFdoZXJlRnJvbURhdGEob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubW9kZWxzICYmIGVudGl0eSkge1xuICAgICAgdmFyIGlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIF8uZWFjaChvcHRpb25zLm1vZGVscywgZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICBpZiAoIW1vZGVsLmlzTmV3KCkpIHtcbiAgICAgICAgICBpZHMucHVzaCh0aGF0Ll9zcWxWYWx1ZShtb2RlbC5pZCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChpZHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gJ2lkIElOICgnICsgaWRzLmpvaW4oJywnKSArICcpJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxTZWxlY3Qob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIHZhciBzcWwgPSAnU0VMRUNUICc7XG4gICAgc3FsICs9ICcqJztcbiAgICBzcWwgKz0gJyBGUk9NIFxcJycgKyB0aGlzLmVudGl0aWVzW2VudGl0eV0udGFibGUgKyAnXFwnJztcblxuICAgIGlmIChvcHRpb25zLnN5bmNDb250ZXh0KSB7XG4gICAgICAvLyBuZXcgY29kZSBtdXN0IGRvIHN0dWZmIGluIEphdmFTY3JpcHQsIG5vdCBTUUxcbiAgICAgIHJldHVybiBzcWw7XG4gICAgfVxuXG4gICAgdmFyIHdoZXJlID0gdGhpcy5fc3FsV2hlcmVGcm9tRGF0YShvcHRpb25zLCBlbnRpdHkpO1xuICAgIGlmICh3aGVyZSkge1xuICAgICAgc3FsICs9ICcgV0hFUkUgJyArIHdoZXJlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm9yZGVyKSB7XG4gICAgICBzcWwgKz0gJyBPUkRFUiBCWSAnICsgb3B0aW9ucy5vcmRlcjtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5saW1pdCkge1xuICAgICAgc3FsICs9ICcgTElNSVQgJyArIG9wdGlvbnMubGltaXQ7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMub2Zmc2V0KSB7XG4gICAgICBzcWwgKz0gJyBPRkZTRVQgJyArIG9wdGlvbnMub2Zmc2V0O1xuICAgIH1cblxuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbFZhbHVlKHZhbHVlOiBhbnkpIHtcbiAgICB2YWx1ZSA9IF8uaXNOdWxsKHZhbHVlKSA/ICdudWxsJyA6IF8uaXNPYmplY3QodmFsdWUpID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUudG9TdHJpbmcoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyk7XG4gICAgcmV0dXJuICdcIicgKyB2YWx1ZSArICdcIic7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2Ryb3BUYWJsZShvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSBpbiB0aGlzLmVudGl0aWVzICYmIHRoaXMuZW50aXRpZXNbZW50aXR5XS5jcmVhdGVkICE9PSBmYWxzZSkge1xuICAgICAgaWYgKHRoaXMuX2NoZWNrRGIob3B0aW9ucykpIHtcbiAgICAgICAgdmFyIHNxbCA9IHRoaXMuX3NxbERyb3BUYWJsZShlbnRpdHkpO1xuICAgICAgICAvLyByZXNldCBmbGFnXG4gICAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIG5lZWQgZHJvcHBpbmcgYXMgdGFibGUgd2FzIG5vdCBjcmVhdGVkXG4gICAgICB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NyZWF0ZVRhYmxlKG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICBpZiAoIShlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykpIHtcbiAgICAgIHRoaXMuZW50aXRpZXNbZW50aXR5XSA9IHtcbiAgICAgICAgdGFibGU6IGVudGl0eVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgdmFyIHNxbCA9IHRoaXMuX3NxbENyZWF0ZVRhYmxlKGVudGl0eSk7XG4gICAgICAvLyByZXNldCBmbGFnXG4gICAgICB0aGlzLl9leGVjdXRlVHJhbnNhY3Rpb24ob3B0aW9ucywgW3NxbF0pO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfY2hlY2tUYWJsZShvcHRpb25zOiBhbnksIGNhbGxiYWNrOiBGdW5jdGlvbikge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSAmJiAoIXRoaXMuZW50aXRpZXNbZW50aXR5XSB8fCB0aGlzLmVudGl0aWVzW2VudGl0eV0uY3JlYXRlZCA9PT0gZmFsc2UpKSB7XG4gICAgICB0aGlzLl9jcmVhdGVUYWJsZSh7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0LmVudGl0aWVzW2VudGl0eV0uY3JlYXRlZCA9IHRydWU7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvcjogRXJyb3IpIHtcbiAgICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW50aXR5OiBlbnRpdHlcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB3ZSBrbm93IGl0J3MgY3JlYXRlZCBhbHJlYWR5XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfaW5zZXJ0T3JSZXBsYWNlKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICB2YXIgbW9kZWxzID0gaXNDb2xsZWN0aW9uKG1vZGVsKSA/IG1vZGVsLm1vZGVscyA6IFttb2RlbF07XG4gICAgaWYgKHRoaXMuX2NoZWNrRGIob3B0aW9ucykgJiYgdGhpcy5fY2hlY2tEYXRhKG9wdGlvbnMsIG1vZGVscykpIHtcbiAgICAgIHZhciBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IFtdO1xuICAgICAgdmFyIHNxbFRlbXBsYXRlID0gJ0lOU0VSVCBPUiBSRVBMQUNFIElOVE8gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcgKCc7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vZGVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYW1vZGVsID0gbW9kZWxzW2ldO1xuICAgICAgICB2YXIgc3RhdGVtZW50ID0gJyc7IC8vIHRoZSBhY3R1YWwgc3FsIGluc2VydCBzdHJpbmcgd2l0aCB2YWx1ZXNcbiAgICAgICAgaWYgKCFhbW9kZWwuaWQpIHtcbiAgICAgICAgICBhbW9kZWwuc2V0KGFtb2RlbC5pZEF0dHJpYnV0ZSwgb2JqZWN0aWQubWFrZU9iamVjdElEKCkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IG9wdGlvbnMuYXR0cnMgfHwgYW1vZGVsLmF0dHJpYnV0ZXM7XG4gICAgICAgIHZhciBrZXlzID0gWyAnaWQnLCAnZGF0YScgXTtcbiAgICAgICAgdmFyIGpzb24gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgIHdoaWxlIChCQURfVU5JQ09ERVMudGVzdChqc29uKSkge1xuICAgICAgICAgIC8vIHdvcmthcm91bmQgaHR0cHM6Ly9pc3N1ZXMuYXBhY2hlLm9yZy9qaXJhL2Jyb3dzZS9DQi05NDM1IG9uIGlPU1xuICAgICAgICAgIGpzb24gPSBqc29uLnJlcGxhY2UoJ1xcdTIwMjgnLCAnXFxcXHUyMDI4JykucmVwbGFjZSgnXFx1MjAyOScsICdcXFxcdTIwMjknKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXJncyA9IFsgYW1vZGVsLmlkLCBqc29uIF07XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGFyZ3MubGVuZ3RoKS5qb2luKCc/LCcpICsgJz8nO1xuICAgICAgICAgIHZhciBjb2x1bW5zID0gJ1xcJycgKyBrZXlzLmpvaW4oJ1xcJyxcXCcnKSArICdcXCcnO1xuICAgICAgICAgIHN0YXRlbWVudCArPSBzcWxUZW1wbGF0ZSArIGNvbHVtbnMgKyAnKSBWQUxVRVMgKCcgKyB2YWx1ZXMgKyAnKTsnO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XG4gICAgICAgICAgICBzdGF0ZW1lbnQ6IHN0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl9leGVjdXRlVHJhbnNhY3Rpb24ob3B0aW9ucywgc3RhdGVtZW50cywgbW9kZWwudG9KU09OKCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfc2VsZWN0KG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICBpZiAodGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgdmFyIGxhc3RTdGF0ZW1lbnQ6IHN0cmluZztcbiAgICAgIHZhciBpc0NvbGxlY3Rpb24gPSAhaXNNb2RlbChtb2RlbCk7XG4gICAgICB2YXIgcmVzdWx0OiBhbnk7XG4gICAgICBpZiAoaXNDb2xsZWN0aW9uKSB7XG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgfSBlbHNlIGlmIChtb2RlbCkge1xuICAgICAgICBvcHRpb25zLm1vZGVscyA9IFttb2RlbF07XG4gICAgICB9XG4gICAgICB2YXIgc3RtOiBhbnkgPSB0aGlzLl9zcWxTZWxlY3Qob3B0aW9ucywgZW50aXR5KTtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIHRoaXMuZGIucmVhZFRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdG0uc3RhdGVtZW50IHx8IHN0bTtcbiAgICAgICAgdmFyIGFyZ3MgPSBzdG0uYXJndW1lbnRzO1xuICAgICAgICBsYXN0U3RhdGVtZW50ID0gc3RhdGVtZW50O1xuICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NxbCBzdGF0ZW1lbnQ6ICcgKyBzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgIGRpYWcuZGVidWcudHJhY2UoJ2FyZ3VtZW50czogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgICB0LmV4ZWN1dGVTcWwoc3RhdGVtZW50LCBhcmdzLCBmdW5jdGlvbiAodHgsIHJlcykge1xuICAgICAgICAgIHZhciBsZW4gPSByZXMucm93cy5sZW5ndGg7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXMucm93cy5pdGVtKGkpO1xuICAgICAgICAgICAgdmFyIGF0dHJzOiBhbnk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBhdHRycyA9IEpTT04ucGFyc2UoaXRlbS5kYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0NvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgcmVzdWx0LnB1c2goYXR0cnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cnM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKHQyOiBTUUxUcmFuc2FjdGlvbiwgZTogU1FMRXJyb3IpIHtcbiAgICAgICAgICAvLyBlcnJvclxuICAgICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ3dlYlNxbCBlcnJvcjogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIGFib3J0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKHNxbEVycm9yOiBhbnkpIHsgLy8gZXJyb3JDYWxsYmFja1xuICAgICAgICBpZiAobGFzdFN0YXRlbWVudCkge1xuICAgICAgICAgIHNxbEVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignV2ViU3FsIFN5bnRheCBFcnJvcjogJyArIHNxbEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIHNxbEVycm9yKTtcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHsgLy8gdm9pZENhbGxiYWNrIChzdWNjZXNzKVxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG9wdGlvbnMuc3luY0NvbnRleHQucHJvY2Vzc0F0dHJpYnV0ZXMocmVzdWx0LCBvcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGVycm9yOiBXZWJTcWxFcnJvciA9IG5ldyBFcnJvcignbm8gcmVzdWx0Jyk7XG4gICAgICAgICAgaWYgKGxhc3RTdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgIGVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoYXQuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2RlbGV0ZShtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgdmFyIG1vZGVscyA9IGlzQ29sbGVjdGlvbihtb2RlbCkgPyBtb2RlbC5tb2RlbHMgOiBbbW9kZWxdO1xuICAgIGlmICh0aGlzLl9jaGVja0RiKG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zLm1vZGVscyA9IG1vZGVscztcbiAgICAgIHZhciBzcWwgPSB0aGlzLl9zcWxEZWxldGUob3B0aW9ucywgZW50aXR5KTtcbiAgICAgIC8vIHJlc2V0IGZsYWdcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSwgbW9kZWwudG9KU09OKCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfZXhlY3V0ZVNxbChvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5zcWwpIHtcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbb3B0aW9ucy5zcWxdKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHRyYW5zYWN0aW9uUHJvbWlzZSA9IFEucmVzb2x2ZShudWxsKTtcblxuICBwcm90ZWN0ZWQgX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zOiBhbnksIHN0YXRlbWVudHM6IChTdGF0ZW1lbnQgfCBzdHJpbmcpW10sIHJlc3VsdD86IGFueSkge1xuICAgIGlmICghdGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgcmV0dXJuOyAvLyBkYXRhYmFzZSBub3Qgb3BlbiwgZXJyb3Igd2FzIGlzc3VlZCBieSBfY2hlY2tEYigpIGFib3ZlXG4gICAgfVxuXG4gICAgLy8gZm9sbG93aW5nIHNlcXVlbnRpYWxseSBwcm9jZXNzZXMgdHJhbnNhY3Rpb25zIGF2b2lkaW5nIHJ1bm5pbmcgdG9vIG1hbnkgY29uY3VycmVudGx5XG4gICAgdGhpcy50cmFuc2FjdGlvblByb21pc2UgPSB0aGlzLnRyYW5zYWN0aW9uUHJvbWlzZS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHZhciBsYXN0U3RhdGVtZW50OiBzdHJpbmc7XG4gICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgLyogdHJhbnNhY3Rpb24gaGFzIDMgcGFyYW1ldGVyczogdGhlIHRyYW5zYWN0aW9uIGNhbGxiYWNrLCB0aGUgZXJyb3IgY2FsbGJhY2sgYW5kIHRoZSBzdWNjZXNzIGNhbGxiYWNrICovXG4gICAgICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKCh0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIF8uZWFjaChzdGF0ZW1lbnRzLCAoc3RtOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdG0uc3RhdGVtZW50IHx8IHN0bTtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3RtLmFyZ3VtZW50cztcbiAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnQgPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgICAgIGlmIChkaWFnLmRlYnVnLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzcWwgc3RhdGVtZW50OiAnICsgc3RhdGVtZW50KTtcbiAgICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLnRyYWNlKCcgICAgYXJndW1lbnRzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncykpO1xuICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAhYXJncy5zb21lKChhcmc6IGFueSkgPT4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgJiYgQkFEX1VOSUNPREVTLnRlc3QoYXJnKSk7XG4gICAgICAgICAgICAgICAgfSwgJ2h0dHBzOi8vaXNzdWVzLmFwYWNoZS5vcmcvamlyYS9icm93c2UvQ0ItOTQzNSBpT1MgdW5pY29kZSBpc3N1ZSEnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0LmV4ZWN1dGVTcWwoc3RhdGVtZW50LCBhcmdzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcmVqZWN0LCA8U1FMVm9pZENhbGxiYWNrPnJlc29sdmUpO1xuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzdWx0KSB8fCBudWxsO1xuICAgICAgfSwgKGVycm9yOiBXZWJTcWxFcnJvcikgPT4ge1xuICAgICAgICBpZiAobGFzdFN0YXRlbWVudCkge1xuICAgICAgICAgIGVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IG51bGw7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY2hlY2tEYihvcHRpb25zOiBhbnkpIHtcbiAgICAvLyBoYXMgdG8gYmUgaW5pdGlhbGl6ZWQgZmlyc3RcbiAgICBpZiAoIXRoaXMuZGIpIHtcbiAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcignZGIgaGFuZGxlciBub3QgaW5pdGlhbGl6ZWQuJyk7XG4gICAgICBkaWFnLmRlYnVnLmVycm9yKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9jaGVja0RhdGEob3B0aW9uczogYW55LCBkYXRhOiBNb2RlbFtdKSB7XG4gICAgaWYgKCghXy5pc0FycmF5KGRhdGEpIHx8IGRhdGEubGVuZ3RoID09PSAwKSAmJiAhXy5pc09iamVjdChkYXRhKSkge1xuICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdubyBkYXRhLicpO1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG59XG5cbi8vIG1peGluc1xubGV0IHdlYlNxbFN0b3JlID0gXy5leHRlbmQoV2ViU3FsU3RvcmUucHJvdG90eXBlLCB7XG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuV2ViU3FsU3RvcmUnLFxuXG4gIHNpemU6IDEwMjQgKiAxMDI0LCAvLyAxIE1CXG4gIHZlcnNpb246ICcxLjAnXG59KTtcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFdlYlNxbFN0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUod2ViU3FsU3RvcmUpKSk7XG4iXX0=