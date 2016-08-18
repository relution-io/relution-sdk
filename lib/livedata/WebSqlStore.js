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
    if (global['sqlitePlugin']) {
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
        db = global['sqllitePlugin'].openDatabase(options);
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
//# sourceMappingURL=WebSqlStore.js.map