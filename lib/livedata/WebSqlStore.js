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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiV2ViU3FsU3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGl2ZWRhdGEvV2ViU3FsU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQWtCRztBQUNIOztHQUVHO0FBQ0gsTUFBTTs7Ozs7OztBQUVOLElBQVksQ0FBQyxXQUFNLFFBQVEsQ0FBQyxDQUFBO0FBQzVCLElBQVksQ0FBQyxXQUFNLEdBQUcsQ0FBQyxDQUFBO0FBRXZCLElBQVksSUFBSSxXQUFNLGNBQWMsQ0FBQyxDQUFBO0FBQ3JDLElBQVksUUFBUSxXQUFNLGtCQUFrQixDQUFDLENBQUE7QUFDN0MsSUFBWSxNQUFNLFdBQU0sZ0JBQWdCLENBQUMsQ0FBQTtBQUV6QyxzQkFBb0IsU0FBUyxDQUFDLENBQUE7QUFDOUIsc0JBQTZCLFNBQVMsQ0FBQyxDQUFBO0FBQ3ZDLDJCQUF1QyxjQUFjLENBQUMsQ0FBQTtBQTJCdEQ7Ozs7R0FJRztBQUNILHNCQUE2QixPQUFzQjtJQUNqRCxJQUFJLEVBQVksQ0FBQztJQUNqQixFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLHdCQUF3QjtRQUN4QixPQUFPLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMzQixFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pCLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNyQixPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7Z0JBQy9CLE9BQU8sT0FBTyxDQUFDLFFBQVEsQ0FBQztZQUMxQixDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixPQUFPLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pGLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUM3QixDQUFDO1FBQ0gsQ0FBQztRQUNELEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDdEIsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUNELEVBQUUsR0FBRyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ3JELENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNsQyx3QkFBd0I7UUFDeEIsRUFBRSxHQUFHLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNILENBQUM7SUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyx5QkFBeUI7UUFDekIsSUFBSSxNQUFNLFNBQTRCLENBQUM7UUFDdkMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM3QixDQUFFO1FBQUEsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNmLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFDRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ1gsRUFBRSxHQUFHLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxXQUFXLElBQUksRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzNHLENBQUM7SUFDSCxDQUFDO0lBRUQsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1IsOERBQThEO1FBQzlELE1BQU0sSUFBSSxLQUFLLENBQUMsd0NBQXdDLENBQUMsQ0FBQztJQUM1RCxDQUFDO0lBQ0QsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUNaLENBQUM7QUF2Q2Usb0JBQVksZUF1QzNCLENBQUE7QUFFRDs7R0FFRztBQUNILElBQU0sWUFBWSxHQUFHLGdCQUFnQixDQUFDO0FBRXRDOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0g7SUFBaUMsK0JBQUs7SUFXcEMscUJBQVksT0FBYTtRQVgzQixpQkFvZ0JDO1FBeGZHLGtCQUFNLE9BQU8sQ0FBQyxDQUFDO1FBUFAsT0FBRSxHQUFhLElBQUksQ0FBQztRQUNwQixhQUFRLEdBR1osRUFBRSxDQUFDO1FBMmJELHVCQUFrQixHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUF0YjNDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNoQyxHQUFHLENBQUMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsR0FBRztvQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTTtpQkFDMUMsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQ3RCLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUVyQixLQUFLLEVBQUUsVUFBQyxLQUFZO2dCQUNsQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hDLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNqQyxLQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMvQixDQUFDO1NBQ0YsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0ksMkJBQUssR0FBWjtRQUNFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQy9CLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ1osSUFBSSxDQUFDO2dCQUNILDhDQUE4QztnQkFDOUMsRUFBRSxDQUFDLENBQU8sSUFBSSxDQUFDLEVBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO29CQUNuQixJQUFJLENBQUMsRUFBRyxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUN6QixDQUFDO1lBQ0gsQ0FBQztvQkFBUyxDQUFDO2dCQUNULElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssNkJBQU8sR0FBZixVQUFnQixPQUFZO1FBQzFCLElBQUksS0FBOEIsQ0FBQztRQUNuQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2IsSUFBSSxDQUFDO2dCQUNILElBQUksQ0FBQyxFQUFFLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNoQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztvQkFDbEIsR0FBRyxDQUFDLENBQUMsSUFBSSxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7d0JBQ2pDLElBQUksQ0FBQyxZQUFZLENBQUM7NEJBQ2hCLE1BQU0sRUFBRSxNQUFNO3lCQUNmLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUM7WUFDSCxDQUFFO1lBQUEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDWCxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQ1osQ0FBQztRQUNILENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNaLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7Z0JBQzlFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUIsQ0FBQztZQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNOLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0gsQ0FBQztRQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxJQUFJLEtBQUssS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLDJCQUEyQjtZQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNqQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN0QixLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBUyxLQUFLLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTixJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdkMsQ0FBQztJQUNILENBQUM7SUFFTywrQkFBUyxHQUFqQixVQUFrQixPQUFzQjtRQUN0QyxJQUFJLEtBQVksQ0FBQztRQUNqQixJQUFJLE9BQWUsQ0FBQztRQUNwQixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsSUFBSSxDQUFDO1lBQ0gsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDYixJQUFJLENBQUMsRUFBRSxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBQ0QsSUFBSSxDQUFDO2dCQUNILElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ25FLElBQUksQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFO29CQUMvRCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxVQUFVLEdBQUc7d0JBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxDQUFDO3dCQUN6QyxPQUFPLEdBQUcsR0FBRyxDQUFDO3dCQUNkLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3JCLENBQUMsQ0FBQyxDQUFDO2dCQUNMLENBQUMsRUFBRSxVQUFVLEdBQVE7b0JBQ25CLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO3dCQUNqRCxtRUFBbUU7d0JBQ25FLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDdkMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQzt3QkFDTixFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOzRCQUNaLEdBQUcsQ0FBQyxHQUFHLEdBQUcsT0FBTyxDQUFDO3dCQUNwQixDQUFDO3dCQUNELElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFDO29CQUNqQyxDQUFDO2dCQUNILENBQUMsRUFBRTtvQkFDRCxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ3ZDLENBQUMsQ0FBQyxDQUFDO1lBQ0wsQ0FBRTtZQUFBLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ1gsS0FBSyxHQUFHLENBQUMsQ0FBQztnQkFDVixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25GLENBQUM7UUFDSCxDQUFFO1FBQUEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNYLEtBQUssR0FBRyxDQUFDLENBQUM7UUFDWixDQUFDO1FBQ0QsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25DLENBQUM7SUFDSCxDQUFDO0lBRUQsMEJBQUksR0FBSixVQUFLLE1BQWMsRUFBRSxLQUF5QixFQUFFLE9BQWE7UUFDM0QsT0FBTyxHQUFHLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDeEIsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDO1lBQ2xCLE1BQU0sRUFBRSxLQUFLLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNO1NBQ3ZDLEVBQUUsT0FBTyxJQUFJLEVBQUUsRUFBRTtZQUNoQixPQUFPLEVBQUUsVUFBVSxRQUFhO2dCQUM5QixJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUM7Z0JBQy9ELENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2xCLE1BQU0sQ0FBQyxNQUFNLENBQUM7WUFDaEIsQ0FBQztZQUNELEtBQUssRUFBRSxVQUFVLEtBQVk7Z0JBQzNCLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUM5QyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNYLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ2xCLE1BQU0sQ0FBQyxNQUFNLENBQUM7Z0JBQ2hCLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDbEIsQ0FBQztZQUNILENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ2YsS0FBSyxRQUFRO2dCQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFO29CQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNyQyxDQUFDLENBQUMsQ0FBQztnQkFDSCxLQUFLLENBQUM7WUFFUixLQUFLLFFBQVEsQ0FBQztZQUNkLEtBQUssT0FBTztnQkFDVixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRTtvQkFDckIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDckMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsS0FBSyxDQUFDO1lBRVIsS0FBSyxRQUFRO2dCQUNYLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFO29CQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsS0FBSyxDQUFDO1lBRVIsS0FBSyxNQUFNO2dCQUNULElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFO29CQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDNUIsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsS0FBSyxDQUFDO1lBRVI7Z0JBQ0UsS0FBSyxDQUFDO1FBQ1YsQ0FBQztRQUNELE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0lBQ25CLENBQUM7SUFFUyw0QkFBTSxHQUFoQixVQUFpQixPQUFZO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFFUywwQkFBSSxHQUFkLFVBQWUsT0FBWTtRQUN6QixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNCLENBQUM7SUFFUyxpQ0FBVyxHQUFyQixVQUFzQixPQUFZO1FBQ2hDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVTLDZCQUFPLEdBQWpCLFVBQWtCLE9BQVk7UUFDNUIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM1QixDQUFDO0lBRVMsd0NBQWtCLEdBQTVCLFVBQTZCLFVBQThCLEVBQUUsVUFBa0I7UUFDN0Usd0RBQXdEO1FBQ3hELElBQUksR0FBRyxHQUFhLEVBQUUsQ0FBQztRQUN2QixHQUFHLENBQUMsQ0FBQyxJQUFJLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUNqQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUN6QyxDQUFDO1FBQ0QsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFUyxtQ0FBYSxHQUF2QixVQUF3QixNQUFjO1FBQ3BDLE1BQU0sQ0FBQywyQkFBeUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLE9BQUksQ0FBQztJQUNsRSxDQUFDO0lBRVMscUNBQWUsR0FBekIsVUFBMEIsTUFBYztRQUN0QyxNQUFNLENBQUMsaUNBQStCLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyw2RUFBMEUsQ0FBQztJQUM5SSxDQUFDO0lBRVMsZ0NBQVUsR0FBcEIsVUFBcUIsT0FBWSxFQUFFLE1BQWM7UUFDL0MsSUFBSSxHQUFHLEdBQUcsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1FBQ2hFLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDcEQsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNWLEdBQUcsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQzNCLENBQUM7UUFBQyxJQUFJLENBQUMsQ0FBQztZQUNOLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLGNBQU0sT0FBQSxLQUFLLEVBQUwsQ0FBSyxFQUFFLDBDQUEwQyxDQUFDLENBQUM7UUFDN0UsQ0FBQztRQUNELEdBQUcsSUFBSSxPQUFPLENBQUMsR0FBRyxHQUFHLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNoRCxNQUFNLENBQUMsR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVTLHVDQUFpQixHQUEzQixVQUE0QixPQUFZLEVBQUUsTUFBYztRQUN0RCxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3hDLElBQUksR0FBRyxHQUFhLEVBQUUsQ0FBQztZQUN2QixJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7WUFDaEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFVBQVUsS0FBWTtnQkFDM0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JDLENBQUM7WUFDSCxDQUFDLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDbkIsTUFBTSxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztZQUN6QyxDQUFDO1FBQ0gsQ0FBQztRQUNELE1BQU0sQ0FBQyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRVMsZ0NBQVUsR0FBcEIsVUFBcUIsT0FBWSxFQUFFLE1BQWM7UUFDL0MsSUFBSSxHQUFHLEdBQUcsU0FBUyxDQUFDO1FBQ3BCLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDWCxHQUFHLElBQUksVUFBVSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUV2RCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUN4QixnREFBZ0Q7WUFDaEQsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDVixHQUFHLElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUMzQixDQUFDO1FBRUQsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbEIsR0FBRyxJQUFJLFlBQVksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUNsQixHQUFHLElBQUksU0FBUyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDbkMsQ0FBQztRQUVELEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ25CLEdBQUcsSUFBSSxVQUFVLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUNyQyxDQUFDO1FBRUQsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFUywrQkFBUyxHQUFuQixVQUFvQixLQUFVO1FBQzVCLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hHLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsR0FBRyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUM7SUFDM0IsQ0FBQztJQUVTLGdDQUFVLEdBQXBCLFVBQXFCLE9BQVk7UUFDL0IsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3ZFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzQixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxhQUFhO2dCQUNiLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDSCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTiw0Q0FBNEM7WUFDNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNILENBQUM7SUFFUyxrQ0FBWSxHQUF0QixVQUF1QixPQUFZO1FBQ2pDLElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDNUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUc7Z0JBQ3RCLEtBQUssRUFBRSxNQUFNO2FBQ2QsQ0FBQztRQUNKLENBQUM7UUFFRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3ZDLGFBQWE7WUFDYixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDO0lBQ0gsQ0FBQztJQUVTLGlDQUFXLEdBQXJCLFVBQXNCLE9BQVksRUFBRSxRQUFrQjtRQUNwRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUM7UUFDaEIsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixFQUFFLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xGLElBQUksQ0FBQyxZQUFZLENBQUM7Z0JBQ2hCLE9BQU8sRUFBRTtvQkFDUCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7b0JBQ3JDLFFBQVEsRUFBRSxDQUFDO2dCQUNiLENBQUM7Z0JBQ0QsS0FBSyxFQUFFLFVBQVUsS0FBWTtvQkFDM0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ25DLENBQUM7Z0JBQ0QsTUFBTSxFQUFFLE1BQU07YUFDZixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQUMsSUFBSSxDQUFDLENBQUM7WUFDTiwrQkFBK0I7WUFDL0IsUUFBUSxFQUFFLENBQUM7UUFDYixDQUFDO0lBQ0gsQ0FBQztJQUVTLHNDQUFnQixHQUExQixVQUEyQixLQUF5QixFQUFFLE9BQVk7UUFDaEUsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixJQUFJLE1BQU0sR0FBRyx5QkFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxJQUFJLFVBQVUsR0FBZ0IsRUFBRSxDQUFDO1lBQ2pDLElBQUksV0FBVyxHQUFHLDJCQUEyQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztZQUNyRixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN2QixJQUFJLFNBQVMsR0FBRyxFQUFFLENBQUMsQ0FBQywyQ0FBMkM7Z0JBQy9ELEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ2YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRCxDQUFDO2dCQUNELElBQUksS0FBSyxHQUFHLE9BQU8sQ0FBQyxLQUFLLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQztnQkFDL0MsSUFBSSxJQUFJLEdBQUcsQ0FBRSxJQUFJLEVBQUUsTUFBTSxDQUFFLENBQUM7Z0JBQzVCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pDLE9BQU8sWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUMvQixrRUFBa0U7b0JBQ2xFLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUN4RSxDQUFDO2dCQUNELElBQUksSUFBSSxHQUFHLENBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUUsQ0FBQztnQkFDL0IsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNwQixJQUFJLE1BQU0sR0FBRyxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztvQkFDckQsSUFBSSxPQUFPLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDO29CQUMvQyxTQUFTLElBQUksV0FBVyxHQUFHLE9BQU8sR0FBRyxZQUFZLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQztvQkFDbEUsVUFBVSxDQUFDLElBQUksQ0FBQzt3QkFDZCxTQUFTLEVBQUUsU0FBUzt3QkFDcEIsU0FBUyxFQUFFLElBQUk7cUJBQ2hCLENBQUMsQ0FBQztnQkFDTCxDQUFDO1lBQ0gsQ0FBQztZQUNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLENBQUM7SUFDSCxDQUFDO0lBRVMsNkJBQU8sR0FBakIsVUFBa0IsS0FBeUIsRUFBRSxPQUFZO1FBQ3ZELElBQUksTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDNUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDM0IsSUFBSSxhQUFxQixDQUFDO1lBQzFCLElBQUksWUFBWSxHQUFHLENBQUMsZUFBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25DLElBQUksTUFBVyxDQUFDO1lBQ2hCLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDZCxDQUFDO1lBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUMzQixDQUFDO1lBQ0QsSUFBSSxHQUFHLEdBQVEsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDaEQsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLElBQUksQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQztnQkFDakMsSUFBSSxTQUFTLEdBQUcsR0FBRyxDQUFDLFNBQVMsSUFBSSxHQUFHLENBQUM7Z0JBQ3JDLElBQUksSUFBSSxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7Z0JBQ3pCLGFBQWEsR0FBRyxTQUFTLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUMvQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO29CQUNULElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3pELENBQUM7Z0JBQ0QsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxFQUFFLEdBQUc7b0JBQzdDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO29CQUMxQixHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO3dCQUM3QixJQUFJLElBQUksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQzt3QkFDNUIsSUFBSSxLQUFVLENBQUM7d0JBQ2YsSUFBSSxDQUFDOzRCQUNILEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDaEMsQ0FBRTt3QkFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOzRCQUNYLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUN6QixRQUFRLENBQUM7d0JBQ1gsQ0FBQzt3QkFDRCxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDOzRCQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUNyQixDQUFDO3dCQUFDLElBQUksQ0FBQyxDQUFDOzRCQUNOLE1BQU0sR0FBRyxLQUFLLENBQUM7NEJBQ2YsS0FBSyxDQUFDO3dCQUNSLENBQUM7b0JBQ0gsQ0FBQztnQkFDSCxDQUFDLEVBQUUsVUFBVSxFQUFrQixFQUFFLENBQVc7b0JBQzFDLFFBQVE7b0JBQ1IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUMvQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUTtnQkFDdkIsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLEVBQUUsVUFBVSxRQUFhO2dCQUN4QixFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO29CQUNsQixRQUFRLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQztnQkFDL0IsQ0FBQztnQkFDRCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzdELElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBQ3RDLENBQUMsRUFBRTtnQkFDRCxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNYLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO3dCQUN4QixNQUFNLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQ2xFLENBQUM7b0JBQ0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQ3RDLENBQUM7Z0JBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ04sSUFBSSxLQUFLLEdBQWdCLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNoRCxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO3dCQUNsQixLQUFLLENBQUMsR0FBRyxHQUFHLGFBQWEsQ0FBQztvQkFDNUIsQ0FBQztvQkFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDbkMsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7SUFFUyw2QkFBTyxHQUFqQixVQUFrQixLQUF5QixFQUFFLE9BQVk7UUFDdkQsSUFBSSxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM1QixJQUFJLE1BQU0sR0FBRyx5QkFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxRCxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMzQixPQUFPLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztZQUN4QixJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztZQUMzQyxhQUFhO1lBQ2IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0lBRVMsaUNBQVcsR0FBckIsVUFBc0IsT0FBWTtRQUNoQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUNoQixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQztJQUNILENBQUM7SUFJUyx5Q0FBbUIsR0FBN0IsVUFBOEIsT0FBWSxFQUFFLFVBQWtDLEVBQUUsTUFBWTtRQUE1RixpQkF1Q0M7UUF0Q0MsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUM1QixNQUFNLENBQUMsQ0FBQywwREFBMEQ7UUFDcEUsQ0FBQztRQUVELHVGQUF1RjtRQUN2RixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztZQUN4RCxJQUFJLGFBQXFCLENBQUM7WUFDMUIsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUUsTUFBTTtnQkFDL0IseUdBQXlHO2dCQUN6RyxNQUFNLENBQUMsS0FBSSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsVUFBQyxDQUFDO29CQUMzQixNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsVUFBQyxHQUFRO3dCQUNqQyxJQUFJLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxJQUFJLEdBQUcsQ0FBQzt3QkFDckMsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQzt3QkFDekIsYUFBYSxHQUFHLFNBQVMsQ0FBQzt3QkFFMUIsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOzRCQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxTQUFTLENBQUMsQ0FBQzs0QkFDL0MsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztnQ0FDVCxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0NBQzNELElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO29DQUNoQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQUMsR0FBUSxJQUFLLE9BQUEsT0FBTyxHQUFHLEtBQUssUUFBUSxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQWpELENBQWlELENBQUMsQ0FBQztnQ0FDckYsQ0FBQyxFQUFFLGtFQUFrRSxDQUFDLENBQUM7NEJBQ3pFLENBQUM7d0JBQ0gsQ0FBQzt3QkFFRCxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztvQkFDaEMsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxFQUFFLE1BQU0sRUFBbUIsT0FBTyxDQUFDLENBQUM7WUFDdkMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNOLE1BQU0sQ0FBQyxLQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUM7WUFDckQsQ0FBQyxFQUFFLFVBQUMsS0FBa0I7Z0JBQ3BCLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7b0JBQ2xCLEtBQUssQ0FBQyxHQUFHLEdBQUcsYUFBYSxDQUFDO2dCQUM1QixDQUFDO2dCQUNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLEtBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQztZQUNsRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVTLDhCQUFRLEdBQWxCLFVBQW1CLE9BQVk7UUFDN0IsOEJBQThCO1FBQzlCLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDYixJQUFJLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ3JELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRVMsZ0NBQVUsR0FBcEIsVUFBcUIsT0FBWSxFQUFFLElBQWE7UUFDOUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2pFLElBQUksS0FBSyxHQUFHLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNoQyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUNELE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUgsa0JBQUM7QUFBRCxDQUFDLEFBcGdCRCxDQUFpQyxhQUFLLEdBb2dCckM7QUFwZ0JZLG1CQUFXLGNBb2dCdkIsQ0FBQTtBQUVELFNBQVM7QUFDVCxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUU7SUFDaEQsS0FBSyxFQUFFLCtCQUErQjtJQUV0QyxJQUFJLEVBQUUsSUFBSSxHQUFHLElBQUk7SUFDakIsT0FBTyxFQUFFLEtBQUs7Q0FDZixDQUFDLENBQUM7QUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxjQUFNLE9BQUEsV0FBVyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUEvRCxDQUErRCxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogQGZpbGUgbGl2ZWRhdGEvV2ViU3FsU3RvcmUudHNcbiAqIFJlbHV0aW9uIFNES1xuICpcbiAqIENyZWF0ZWQgYnkgVGhvbWFzIEJlY2ttYW5uIG9uIDI0LjA2LjIwMTVcbiAqIENvcHlyaWdodCAyMDE2IE0tV2F5IFNvbHV0aW9ucyBHbWJIXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cbi8qKlxuICogQG1vZHVsZSBsaXZlZGF0YVxuICovXG4vKiogKi9cblxuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgUSBmcm9tICdxJztcblxuaW1wb3J0ICogYXMgZGlhZyBmcm9tICcuLi9jb3JlL2RpYWcnO1xuaW1wb3J0ICogYXMgb2JqZWN0aWQgZnJvbSAnLi4vY29yZS9vYmplY3RpZCc7XG5pbXBvcnQgKiBhcyBjaXBoZXIgZnJvbSAnLi4vY29yZS9jaXBoZXInO1xuXG5pbXBvcnQge1N0b3JlfSBmcm9tICcuL1N0b3JlJztcbmltcG9ydCB7TW9kZWwsIGlzTW9kZWx9IGZyb20gJy4vTW9kZWwnO1xuaW1wb3J0IHtDb2xsZWN0aW9uLCBpc0NvbGxlY3Rpb259IGZyb20gJy4vQ29sbGVjdGlvbic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2ViU3FsT3B0aW9ucyB7XG4gIG5hbWU6IHN0cmluZztcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIHZlcnNpb24/OiBzdHJpbmc7XG5cbiAgc2l6ZT86IG51bWJlcjtcbiAgbG9jYXRpb24/OiBudW1iZXI7XG5cbiAga2V5Pzogc3RyaW5nO1xuICBzZWN1cml0eT86IHN0cmluZztcbiAgY3JlZGVudGlhbHM/OiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3RhdGVtZW50IHtcbiAgc3RhdGVtZW50OiBzdHJpbmcsXG4gIGFyZ3VtZW50czogYW55W11cbn1cblxuZXhwb3J0IGludGVyZmFjZSBXZWJTcWxFcnJvciBleHRlbmRzIEVycm9yIHtcbiAgLyoqXG4gICAqIGV2ZW50dWFsbHkgY29udGFpbnMgbGFzdCByZWNlbnRseSBleGVjdXRlZCBTUUwgY2F1c2luZyB0aGUgZXJyb3IuXG4gICAqL1xuICBzcWw/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogb3BlbkRhdGFiYXNlIG9mIGJyb3dzZXIgb3IgdmlhIHJlcXVpcmUgd2Vic3FsLlxuICpcbiAqIEBpbnRlcm5hbCBOb3QgcHVibGljIEFQSSwgZXhwb3J0ZWQgZm9yIHRlc3RpbmcgcHVycG9zZXMgb25seSFcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG9wZW5EYXRhYmFzZShvcHRpb25zOiBXZWJTcWxPcHRpb25zKSB7XG4gIGxldCBkYjogRGF0YWJhc2U7XG4gIGlmIChnbG9iYWxbJ3NxbGl0ZVBsdWdpbiddKSB7XG4gICAgLy8gZGV2aWNlIGltcGxlbWVudGF0aW9uXG4gICAgb3B0aW9ucyA9IF8uY2xvbmUob3B0aW9ucyk7XG4gICAgaWYgKCFvcHRpb25zLmtleSkge1xuICAgICAgaWYgKG9wdGlvbnMuc2VjdXJpdHkpIHtcbiAgICAgICAgb3B0aW9ucy5rZXkgPSBvcHRpb25zLnNlY3VyaXR5O1xuICAgICAgICBkZWxldGUgb3B0aW9ucy5zZWN1cml0eTtcbiAgICAgIH0gZWxzZSBpZiAob3B0aW9ucy5jcmVkZW50aWFscykge1xuICAgICAgICBvcHRpb25zLmtleSA9IGNpcGhlci5oYXNoSnNvblN5bmMob3B0aW9ucy5jcmVkZW50aWFscywgJ3NoYTI1NicpLnRvU3RyaW5nKCdoZXgnKTtcbiAgICAgICAgZGVsZXRlIG9wdGlvbnMuY3JlZGVudGlhbHM7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghb3B0aW9ucy5sb2NhdGlvbikge1xuICAgICAgb3B0aW9ucy5sb2NhdGlvbiA9IDI7XG4gICAgfVxuICAgIGRiID0gZ2xvYmFsWydzcWxsaXRlUGx1Z2luJ10ub3BlbkRhdGFiYXNlKG9wdGlvbnMpO1xuICB9IGVsc2UgaWYgKGdsb2JhbFsnb3BlbkRhdGFiYXNlJ10pIHtcbiAgICAvLyBuYXRpdmUgaW1wbGVtZW50YXRpb25cbiAgICBkYiA9IGdsb2JhbFsnb3BlbkRhdGFiYXNlJ10ob3B0aW9ucy5uYW1lLCBvcHRpb25zLnZlcnNpb24gfHwgJycsIG9wdGlvbnMuZGVzY3JpcHRpb24gfHwgJycsIG9wdGlvbnMuc2l6ZSB8fCAxMDI0ICogMTAyNCk7XG4gIH0gZWxzZSBpZiAocHJvY2VzcyAmJiAhcHJvY2Vzc1snYnJvd3NlciddKSB7XG4gICAgLy8gbm9kZS5qcyBpbXBsZW1lbnRhdGlvblxuICAgIGxldCB3ZWJzcWw6IHR5cGVvZiB3aW5kb3cub3BlbkRhdGFiYXNlO1xuICAgIHRyeSB7XG4gICAgICB3ZWJzcWwgPSByZXF1aXJlKCd3ZWJzcWwnKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgZGlhZy5kZWJ1Zy53YXJuKGVycm9yKTtcbiAgICB9XG4gICAgaWYgKHdlYnNxbCkge1xuICAgICAgZGIgPSB3ZWJzcWwob3B0aW9ucy5uYW1lLCBvcHRpb25zLnZlcnNpb24gfHwgJycsIG9wdGlvbnMuZGVzY3JpcHRpb24gfHwgJycsIG9wdGlvbnMuc2l6ZSB8fCAxMDI0ICogMTAyNCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFkYikge1xuICAgIC8vIHdoZW4gdGhpcyBpcyByZWFjaGVkIG5vIHN1cHBvcnRlZCBpbXBsZW1lbnRhdGlvbiBpcyBwcmVzZW50XG4gICAgdGhyb3cgbmV3IEVycm9yKCdXZWJTUUwgaW1wbGVtZW50YXRpb24gaXMgbm90IGF2YWlsYWJsZScpO1xuICB9XG4gIHJldHVybiBkYjtcbn1cblxuLyoqXG4gKiBtYXRjaGVzIGNoYXIgY29kZXMgc3ViamVjdCB0byBodHRwczovL2lzc3Vlcy5hcGFjaGUub3JnL2ppcmEvYnJvd3NlL0NCLTk0MzUgQ29yZG92YSBpT1MgYnVnLlxuICovXG5jb25zdCBCQURfVU5JQ09ERVMgPSAvW1xcdTIwMjhcXHUyMDI5XS87XG5cbi8qKlxuICogc3RvcmVzIExpdmVEYXRhIGludG8gdGhlIFdlYlNRTCBkYXRhYmFzZS5cbiAqXG4gKiBAZXhhbXBsZVxuICpcbiAqIC8vIFRoZSBkZWZhdWx0IGNvbmZpZ3VyYXRpb24gd2lsbCBzYXZlIHRoZSBjb21wbGV0ZSBtb2RlbCBkYXRhIGFzIGpzb25cbiAqIC8vIGludG8gYSBkYXRhYmFzZSBjb2x1bW4gd2l0aCB0aGUgbmFtZSBcImRhdGFcIlxuICogY2xhc3MgTXlDb2xsZWN0aW9uIGV4dGVuZHMgUmVsdXRpb24ubGl2ZWRhdGEuQ29sbGVjdGlvbiB7fTtcbiAqIE15Q29sbGVjdGlvbi5wcm90b3R5cGUubW9kZWwgPSBNeU1vZGVsO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5lbnRpdHkgPSAnTXlUYWJsZU5hbWUnO1xuICogTXlDb2xsZWN0aW9uLnByb3RvdHlwZS5zdG9yZSA9IG5ldyBSZWx1dGlvbi5saXZlZGF0YS5XZWJTcWxTdG9yZSgpO1xuICpcbiAqIC8vIElmIHlvdSB3YW50IHRvIHVzZSBzcGVjaWZpYyBjb2x1bW5zIHlvdSBjYW4gc3BlY2lmeSB0aGUgZmllbGRzXG4gKiAvLyBpbiB0aGUgZW50aXR5IG9mIHlvdXIgbW9kZWwgbGlrZSB0aGlzOlxuICogY2xhc3MgTXlNb2RlbCBleHRlbmRzIFJlbHV0aW9uLmxpdmVkYXRhLk1vZGVsIHt9O1xuICogTXlNb2RlbC5wcm90b3R5cGUuaWRBdHRyaWJ1dGUgPSAnaWQnO1xuICovXG5leHBvcnQgY2xhc3MgV2ViU3FsU3RvcmUgZXh0ZW5kcyBTdG9yZSB7XG4gIC8vIGZvbGxvd2luZyBhcmUgc3RvcmUtc3BlY2lmaWMgb3B0aW9ucywgZGVmYXVsdHMgc3RvcmVkIGluIHByb3RvdHlwZSBhdCBlbmQgb2YgdGhpcyBmaWxlXG4gIHByb3RlY3RlZCBzaXplOiBudW1iZXI7XG4gIHByb3RlY3RlZCB2ZXJzaW9uOiBzdHJpbmc7XG5cbiAgcHJvdGVjdGVkIGRiOiBEYXRhYmFzZSA9IG51bGw7XG4gIHByb3RlY3RlZCBlbnRpdGllczogeyBbZW50aXR5OiBzdHJpbmddOiB7XG4gICAgdGFibGU6IHN0cmluZywgICAgLy8gYnkgZGVmYXVsdCwgZW50aXR5IGl0c2VsZiBidXQgaXMgZ2l2ZW4gZXhwbGljaXRseSBieSBTeW5jU3RvcmUhXG4gICAgY3JlYXRlZD86IGJvb2xlYW4gLy8gdHJpLXN0YXRlIGFzIGluaXRpYWwgc3RhdGUgaXMgbm90IGtub3duIGFuZCB0aHVzIHVuZGVmaW5lZFxuICB9IH0gPSB7fTtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzogYW55KSB7XG4gICAgc3VwZXIob3B0aW9ucyk7XG5cbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLmVudGl0aWVzKSB7XG4gICAgICBmb3IgKHZhciBlbnRpdHkgaW4gb3B0aW9ucy5lbnRpdGllcykge1xuICAgICAgICB0aGlzLmVudGl0aWVzW2VudGl0eV0gPSB7XG4gICAgICAgICAgdGFibGU6IG9wdGlvbnMuZW50aXRpZXNbZW50aXR5XSB8fCBlbnRpdHlcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICB0aGlzLl9vcGVuRGIoXy5kZWZhdWx0cyh7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICBzaXplOiB0aGlzLnNpemUsXG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG5cbiAgICAgIGVycm9yOiAoZXJyb3I6IEVycm9yKSA9PiB7XG4gICAgICAgIGRpYWcuZGVidWcuZXJyb3IoZXJyb3IubWVzc2FnZSk7XG4gICAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgICB0aGlzLnRyaWdnZXIoJ2Vycm9yJywgZXJyb3IpO1xuICAgICAgfVxuICAgIH0sIG9wdGlvbnMpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBjbG9zZXMgdGhlIGRhdGFiYXNlLlxuICAgKi9cbiAgcHVibGljIGNsb3NlKCkge1xuICAgIGRpYWcuZGVidWcuaW5mbygnU3RvcmUgY2xvc2UnKTtcbiAgICBpZiAodGhpcy5kYikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gc29tZSBpbXBsZW1lbnRhdGlvbnMgb2ZmZXIgYSBjbG9zZSgpIG1ldGhvZFxuICAgICAgICBpZiAoKDxhbnk+dGhpcy5kYikuY2xvc2UpIHtcbiAgICAgICAgICAoPGFueT50aGlzLmRiKS5jbG9zZSgpO1xuICAgICAgICB9XG4gICAgICB9IGZpbmFsbHkge1xuICAgICAgICB0aGlzLmRiID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQHByaXZhdGVcbiAgICovXG4gIHByaXZhdGUgX29wZW5EYihvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZXJyb3I6IEVycm9yIHwgbnVtYmVyIHwgc3RyaW5nO1xuICAgIGlmICghdGhpcy5kYikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5kYiA9IG9wZW5EYXRhYmFzZShvcHRpb25zKTtcbiAgICAgICAgaWYgKHRoaXMuZW50aXRpZXMpIHtcbiAgICAgICAgICBmb3IgKHZhciBlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykge1xuICAgICAgICAgICAgdGhpcy5fY3JlYXRlVGFibGUoe1xuICAgICAgICAgICAgICBlbnRpdHk6IGVudGl0eVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGVycm9yID0gZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5kYikge1xuICAgICAgaWYgKHRoaXMudmVyc2lvbiAmJiB0aGlzLmRiLnZlcnNpb24gIT09IHRoaXMudmVyc2lvbiAmJiB0aGlzLmRiLmNoYW5nZVZlcnNpb24pIHtcbiAgICAgICAgdGhpcy5fdXBkYXRlRGIob3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdGhpcy5kYik7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChlcnJvciA9PT0gMiB8fCBlcnJvciA9PT0gJzInKSB7XG4gICAgICAvLyBWZXJzaW9uIG51bWJlciBtaXNtYXRjaC5cbiAgICAgIHRoaXMuX3VwZGF0ZURiKG9wdGlvbnMpO1xuICAgIH0gZWxzZSBpZiAoZXJyb3IpIHtcbiAgICAgIGlmICghXy5pc0Vycm9yKGVycm9yKSkge1xuICAgICAgICBlcnJvciA9IG5ldyBFcnJvcignJyArIGVycm9yKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgPEVycm9yPmVycm9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHRoaXMuZGIpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgX3VwZGF0ZURiKG9wdGlvbnM6IFdlYlNxbE9wdGlvbnMpIHtcbiAgICB2YXIgZXJyb3I6IEVycm9yO1xuICAgIHZhciBsYXN0U3FsOiBzdHJpbmc7XG4gICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgIHRyeSB7XG4gICAgICBpZiAoIXRoaXMuZGIpIHtcbiAgICAgICAgdGhpcy5kYiA9IG9wZW5EYXRhYmFzZShvcHRpb25zKTtcbiAgICAgIH1cbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBhclNxbCA9IHRoaXMuX3NxbFVwZGF0ZURhdGFiYXNlKHRoaXMuZGIudmVyc2lvbiwgdGhpcy52ZXJzaW9uKTtcbiAgICAgICAgdGhpcy5kYi5jaGFuZ2VWZXJzaW9uKHRoaXMuZGIudmVyc2lvbiwgdGhpcy52ZXJzaW9uLCBmdW5jdGlvbiAodHgpIHtcbiAgICAgICAgICBfLmVhY2goYXJTcWwsIGZ1bmN0aW9uIChzcWwpIHtcbiAgICAgICAgICAgIGRpYWcuZGVidWcuaW5mbygnc3FsIHN0YXRlbWVudDogJyArIHNxbCk7XG4gICAgICAgICAgICBsYXN0U3FsID0gc3FsO1xuICAgICAgICAgICAgdHguZXhlY3V0ZVNxbChzcWwpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9LCBmdW5jdGlvbiAoZXJyOiBhbnkpIHtcbiAgICAgICAgICBpZiAoIWxhc3RTcWwgJiYgdGhhdC5kYi52ZXJzaW9uID09PSB0aGF0LnZlcnNpb24pIHtcbiAgICAgICAgICAgIC8vIG5vdCBhIHJlYWwgZXJyb3IsIGNvbmN1cnJlbnQgbWlncmF0aW9uIGF0dGVtcHQgY29tcGxldGVkIGFscmVhZHlcbiAgICAgICAgICAgIHRoYXQuaGFuZGxlU3VjY2VzcyhvcHRpb25zLCB0aGF0LmRiKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGxhc3RTcWwpIHtcbiAgICAgICAgICAgICAgZXJyLnNxbCA9IGxhc3RTcWw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHRoYXQuZGIpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZXJyb3IgPSBlO1xuICAgICAgICBkaWFnLmRlYnVnLmVycm9yKCd3ZWJTcWwgY2hhbmdlIHZlcnNpb24gZmFpbGVkLCBEQi1WZXJzaW9uOiAnICsgdGhpcy5kYi52ZXJzaW9uKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBlcnJvciA9IGU7XG4gICAgfVxuICAgIGlmIChlcnJvcikge1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgfVxuICB9XG5cbiAgc3luYyhtZXRob2Q6IHN0cmluZywgbW9kZWw6IE1vZGVsIHwgQ29sbGVjdGlvbiwgb3B0aW9ucz86IGFueSk6IFEuUHJvbWlzZTxhbnk+IHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgdmFyIHEgPSBRLmRlZmVyKCk7XG4gICAgdmFyIG9wdHMgPSBfLmV4dGVuZCh7XG4gICAgICBlbnRpdHk6IG1vZGVsLmVudGl0eSB8fCBvcHRpb25zLmVudGl0eVxuICAgIH0sIG9wdGlvbnMgfHwge30sIHtcbiAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uIChyZXNwb25zZTogYW55KSB7XG4gICAgICAgIHZhciByZXN1bHQgPSB0aGF0LmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzcG9uc2UpIHx8IHJlc3BvbnNlO1xuICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIH0sXG4gICAgICBlcnJvcjogZnVuY3Rpb24gKGVycm9yOiBFcnJvcikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gdGhhdC5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICBxLnJlc29sdmUocmVzdWx0KTtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHEucmVqZWN0KGVycm9yKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgc3dpdGNoIChtZXRob2QpIHtcbiAgICAgIGNhc2UgJ2NyZWF0ZSc6XG4gICAgICAgIHRoYXQuX2NoZWNrVGFibGUob3B0cywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgIHRoYXQuX2luc2VydE9yUmVwbGFjZShtb2RlbCwgb3B0cyk7XG4gICAgICAgIH0pO1xuICAgICAgICBicmVhaztcblxuICAgICAgY2FzZSAndXBkYXRlJzpcbiAgICAgIGNhc2UgJ3BhdGNoJzpcbiAgICAgICAgdGhhdC5fY2hlY2tUYWJsZShvcHRzLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdGhhdC5faW5zZXJ0T3JSZXBsYWNlKG1vZGVsLCBvcHRzKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlICdkZWxldGUnOlxuICAgICAgICB0aGF0Ll9jaGVja1RhYmxlKG9wdHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0Ll9kZWxldGUobW9kZWwsIG9wdHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGNhc2UgJ3JlYWQnOlxuICAgICAgICB0aGF0Ll9jaGVja1RhYmxlKG9wdHMsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0Ll9zZWxlY3QobW9kZWwsIG9wdHMpO1xuICAgICAgICB9KTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gcS5wcm9taXNlO1xuICB9XG5cbiAgcHJvdGVjdGVkIHNlbGVjdChvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9zZWxlY3QobnVsbCwgb3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZHJvcChvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9kcm9wVGFibGUob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgY3JlYXRlVGFibGUob3B0aW9uczogYW55KSB7XG4gICAgdGhpcy5fY3JlYXRlVGFibGUob3B0aW9ucyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgZXhlY3V0ZShvcHRpb25zOiBhbnkpIHtcbiAgICB0aGlzLl9leGVjdXRlU3FsKG9wdGlvbnMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxVcGRhdGVEYXRhYmFzZShvbGRWZXJzaW9uOiBzdHJpbmcgfCBET01TdHJpbmcsIG5ld1ZlcnNpb246IHN0cmluZykge1xuICAgIC8vIGNyZWF0ZSBzcWwgYXJyYXksIHNpbXBseSBkcm9wIGFuZCBjcmVhdGUgdGhlIGRhdGFiYXNlXG4gICAgdmFyIHNxbDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKHZhciBlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykge1xuICAgICAgc3FsLnB1c2godGhpcy5fc3FsRHJvcFRhYmxlKGVudGl0eSkpO1xuICAgICAgc3FsLnB1c2godGhpcy5fc3FsQ3JlYXRlVGFibGUoZW50aXR5KSk7XG4gICAgfVxuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbERyb3BUYWJsZShlbnRpdHk6IHN0cmluZykge1xuICAgIHJldHVybiBgRFJPUCBUQUJMRSBJRiBFWElTVFMgJyR7dGhpcy5lbnRpdGllc1tlbnRpdHldLnRhYmxlfSc7YDtcbiAgfVxuXG4gIHByb3RlY3RlZCBfc3FsQ3JlYXRlVGFibGUoZW50aXR5OiBzdHJpbmcpIHtcbiAgICByZXR1cm4gYENSRUFURSBUQUJMRSBJRiBOT1QgRVhJU1RTICcke3RoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZX0nIChpZCBWQVJDSEFSKDI1NSkgTk9UIE5VTEwgUFJJTUFSWSBLRVkgQVNDIFVOSVFVRSwgZGF0YSBURVhUIE5PVCBOVUxMKTtgO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxEZWxldGUob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIHZhciBzcWwgPSAnREVMRVRFIEZST00gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcnO1xuICAgIHZhciB3aGVyZSA9IHRoaXMuX3NxbFdoZXJlRnJvbURhdGEob3B0aW9ucywgZW50aXR5KTtcbiAgICBpZiAod2hlcmUpIHtcbiAgICAgIHNxbCArPSAnIFdIRVJFICcgKyB3aGVyZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZGlhZy5kZWJ1Zy5hc3NlcnQoKCkgPT4gZmFsc2UsICdhdHRlbXB0IG9mIGRlbGV0aW9uIHdpdGhvdXQgd2hlcmUgY2xhdXNlJyk7XG4gICAgfVxuICAgIHNxbCArPSBvcHRpb25zLmFuZCA/ICcgQU5EICcgKyBvcHRpb25zLmFuZCA6ICcnO1xuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbFdoZXJlRnJvbURhdGEob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubW9kZWxzICYmIGVudGl0eSkge1xuICAgICAgdmFyIGlkczogc3RyaW5nW10gPSBbXTtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIF8uZWFjaChvcHRpb25zLm1vZGVscywgZnVuY3Rpb24gKG1vZGVsOiBNb2RlbCkge1xuICAgICAgICBpZiAoIW1vZGVsLmlzTmV3KCkpIHtcbiAgICAgICAgICBpZHMucHVzaCh0aGF0Ll9zcWxWYWx1ZShtb2RlbC5pZCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIGlmIChpZHMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm4gJ2lkIElOICgnICsgaWRzLmpvaW4oJywnKSArICcpJztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuICcnO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9zcWxTZWxlY3Qob3B0aW9uczogYW55LCBlbnRpdHk6IHN0cmluZykge1xuICAgIHZhciBzcWwgPSAnU0VMRUNUICc7XG4gICAgc3FsICs9ICcqJztcbiAgICBzcWwgKz0gJyBGUk9NIFxcJycgKyB0aGlzLmVudGl0aWVzW2VudGl0eV0udGFibGUgKyAnXFwnJztcblxuICAgIGlmIChvcHRpb25zLnN5bmNDb250ZXh0KSB7XG4gICAgICAvLyBuZXcgY29kZSBtdXN0IGRvIHN0dWZmIGluIEphdmFTY3JpcHQsIG5vdCBTUUxcbiAgICAgIHJldHVybiBzcWw7XG4gICAgfVxuXG4gICAgdmFyIHdoZXJlID0gdGhpcy5fc3FsV2hlcmVGcm9tRGF0YShvcHRpb25zLCBlbnRpdHkpO1xuICAgIGlmICh3aGVyZSkge1xuICAgICAgc3FsICs9ICcgV0hFUkUgJyArIHdoZXJlO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLm9yZGVyKSB7XG4gICAgICBzcWwgKz0gJyBPUkRFUiBCWSAnICsgb3B0aW9ucy5vcmRlcjtcbiAgICB9XG5cbiAgICBpZiAob3B0aW9ucy5saW1pdCkge1xuICAgICAgc3FsICs9ICcgTElNSVQgJyArIG9wdGlvbnMubGltaXQ7XG4gICAgfVxuXG4gICAgaWYgKG9wdGlvbnMub2Zmc2V0KSB7XG4gICAgICBzcWwgKz0gJyBPRkZTRVQgJyArIG9wdGlvbnMub2Zmc2V0O1xuICAgIH1cblxuICAgIHJldHVybiBzcWw7XG4gIH1cblxuICBwcm90ZWN0ZWQgX3NxbFZhbHVlKHZhbHVlOiBhbnkpIHtcbiAgICB2YWx1ZSA9IF8uaXNOdWxsKHZhbHVlKSA/ICdudWxsJyA6IF8uaXNPYmplY3QodmFsdWUpID8gSlNPTi5zdHJpbmdpZnkodmFsdWUpIDogdmFsdWUudG9TdHJpbmcoKTtcbiAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1wiL2csICdcIlwiJyk7XG4gICAgcmV0dXJuICdcIicgKyB2YWx1ZSArICdcIic7XG4gIH1cblxuICBwcm90ZWN0ZWQgX2Ryb3BUYWJsZShvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSBpbiB0aGlzLmVudGl0aWVzICYmIHRoaXMuZW50aXRpZXNbZW50aXR5XS5jcmVhdGVkICE9PSBmYWxzZSkge1xuICAgICAgaWYgKHRoaXMuX2NoZWNrRGIob3B0aW9ucykpIHtcbiAgICAgICAgdmFyIHNxbCA9IHRoaXMuX3NxbERyb3BUYWJsZShlbnRpdHkpO1xuICAgICAgICAvLyByZXNldCBmbGFnXG4gICAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIG5vIG5lZWQgZHJvcHBpbmcgYXMgdGFibGUgd2FzIG5vdCBjcmVhdGVkXG4gICAgICB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgdW5kZWZpbmVkKTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2NyZWF0ZVRhYmxlKG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICBpZiAoIShlbnRpdHkgaW4gdGhpcy5lbnRpdGllcykpIHtcbiAgICAgIHRoaXMuZW50aXRpZXNbZW50aXR5XSA9IHtcbiAgICAgICAgdGFibGU6IGVudGl0eVxuICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgdmFyIHNxbCA9IHRoaXMuX3NxbENyZWF0ZVRhYmxlKGVudGl0eSk7XG4gICAgICAvLyByZXNldCBmbGFnXG4gICAgICB0aGlzLl9leGVjdXRlVHJhbnNhY3Rpb24ob3B0aW9ucywgW3NxbF0pO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfY2hlY2tUYWJsZShvcHRpb25zOiBhbnksIGNhbGxiYWNrOiBGdW5jdGlvbikge1xuICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgaWYgKGVudGl0eSAmJiAoIXRoaXMuZW50aXRpZXNbZW50aXR5XSB8fCB0aGlzLmVudGl0aWVzW2VudGl0eV0uY3JlYXRlZCA9PT0gZmFsc2UpKSB7XG4gICAgICB0aGlzLl9jcmVhdGVUYWJsZSh7XG4gICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICB0aGF0LmVudGl0aWVzW2VudGl0eV0uY3JlYXRlZCA9IHRydWU7XG4gICAgICAgICAgY2FsbGJhY2soKTtcbiAgICAgICAgfSxcbiAgICAgICAgZXJyb3I6IGZ1bmN0aW9uIChlcnJvcjogRXJyb3IpIHtcbiAgICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIGVycm9yKTtcbiAgICAgICAgfSxcbiAgICAgICAgZW50aXR5OiBlbnRpdHlcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyB3ZSBrbm93IGl0J3MgY3JlYXRlZCBhbHJlYWR5XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfaW5zZXJ0T3JSZXBsYWNlKG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICB2YXIgbW9kZWxzID0gaXNDb2xsZWN0aW9uKG1vZGVsKSA/IG1vZGVsLm1vZGVscyA6IFttb2RlbF07XG4gICAgaWYgKHRoaXMuX2NoZWNrRGIob3B0aW9ucykgJiYgdGhpcy5fY2hlY2tEYXRhKG9wdGlvbnMsIG1vZGVscykpIHtcbiAgICAgIHZhciBzdGF0ZW1lbnRzOiBTdGF0ZW1lbnRbXSA9IFtdO1xuICAgICAgdmFyIHNxbFRlbXBsYXRlID0gJ0lOU0VSVCBPUiBSRVBMQUNFIElOVE8gXFwnJyArIHRoaXMuZW50aXRpZXNbZW50aXR5XS50YWJsZSArICdcXCcgKCc7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1vZGVscy5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgYW1vZGVsID0gbW9kZWxzW2ldO1xuICAgICAgICB2YXIgc3RhdGVtZW50ID0gJyc7IC8vIHRoZSBhY3R1YWwgc3FsIGluc2VydCBzdHJpbmcgd2l0aCB2YWx1ZXNcbiAgICAgICAgaWYgKCFhbW9kZWwuaWQpIHtcbiAgICAgICAgICBhbW9kZWwuc2V0KGFtb2RlbC5pZEF0dHJpYnV0ZSwgb2JqZWN0aWQubWFrZU9iamVjdElEKCkpO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IG9wdGlvbnMuYXR0cnMgfHwgYW1vZGVsLmF0dHJpYnV0ZXM7XG4gICAgICAgIHZhciBrZXlzID0gWyAnaWQnLCAnZGF0YScgXTtcbiAgICAgICAgdmFyIGpzb24gPSBKU09OLnN0cmluZ2lmeSh2YWx1ZSk7XG4gICAgICAgIHdoaWxlIChCQURfVU5JQ09ERVMudGVzdChqc29uKSkge1xuICAgICAgICAgIC8vIHdvcmthcm91bmQgaHR0cHM6Ly9pc3N1ZXMuYXBhY2hlLm9yZy9qaXJhL2Jyb3dzZS9DQi05NDM1IG9uIGlPU1xuICAgICAgICAgIGpzb24gPSBqc29uLnJlcGxhY2UoJ1xcdTIwMjgnLCAnXFxcXHUyMDI4JykucmVwbGFjZSgnXFx1MjAyOScsICdcXFxcdTIwMjknKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgYXJncyA9IFsgYW1vZGVsLmlkLCBqc29uIF07XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB2YXIgdmFsdWVzID0gbmV3IEFycmF5KGFyZ3MubGVuZ3RoKS5qb2luKCc/LCcpICsgJz8nO1xuICAgICAgICAgIHZhciBjb2x1bW5zID0gJ1xcJycgKyBrZXlzLmpvaW4oJ1xcJyxcXCcnKSArICdcXCcnO1xuICAgICAgICAgIHN0YXRlbWVudCArPSBzcWxUZW1wbGF0ZSArIGNvbHVtbnMgKyAnKSBWQUxVRVMgKCcgKyB2YWx1ZXMgKyAnKTsnO1xuICAgICAgICAgIHN0YXRlbWVudHMucHVzaCh7XG4gICAgICAgICAgICBzdGF0ZW1lbnQ6IHN0YXRlbWVudCxcbiAgICAgICAgICAgIGFyZ3VtZW50czogYXJnc1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLl9leGVjdXRlVHJhbnNhY3Rpb24ob3B0aW9ucywgc3RhdGVtZW50cywgbW9kZWwudG9KU09OKCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfc2VsZWN0KG1vZGVsOiBNb2RlbCB8IENvbGxlY3Rpb24sIG9wdGlvbnM6IGFueSkge1xuICAgIHZhciBlbnRpdHkgPSBvcHRpb25zLmVudGl0eTtcbiAgICBpZiAodGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgdmFyIGxhc3RTdGF0ZW1lbnQ6IHN0cmluZztcbiAgICAgIHZhciBpc0NvbGxlY3Rpb24gPSAhaXNNb2RlbChtb2RlbCk7XG4gICAgICB2YXIgcmVzdWx0OiBhbnk7XG4gICAgICBpZiAoaXNDb2xsZWN0aW9uKSB7XG4gICAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgfSBlbHNlIGlmIChtb2RlbCkge1xuICAgICAgICBvcHRpb25zLm1vZGVscyA9IFttb2RlbF07XG4gICAgICB9XG4gICAgICB2YXIgc3RtOiBhbnkgPSB0aGlzLl9zcWxTZWxlY3Qob3B0aW9ucywgZW50aXR5KTtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIHRoaXMuZGIucmVhZFRyYW5zYWN0aW9uKGZ1bmN0aW9uICh0KSB7XG4gICAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdG0uc3RhdGVtZW50IHx8IHN0bTtcbiAgICAgICAgdmFyIGFyZ3MgPSBzdG0uYXJndW1lbnRzO1xuICAgICAgICBsYXN0U3RhdGVtZW50ID0gc3RhdGVtZW50O1xuICAgICAgICBkaWFnLmRlYnVnLmluZm8oJ3NxbCBzdGF0ZW1lbnQ6ICcgKyBzdGF0ZW1lbnQpO1xuICAgICAgICBpZiAoYXJncykge1xuICAgICAgICAgIGRpYWcuZGVidWcudHJhY2UoJ2FyZ3VtZW50czogJyArIEpTT04uc3RyaW5naWZ5KGFyZ3MpKTtcbiAgICAgICAgfVxuICAgICAgICB0LmV4ZWN1dGVTcWwoc3RhdGVtZW50LCBhcmdzLCBmdW5jdGlvbiAodHgsIHJlcykge1xuICAgICAgICAgIHZhciBsZW4gPSByZXMucm93cy5sZW5ndGg7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgICAgICAgdmFyIGl0ZW0gPSByZXMucm93cy5pdGVtKGkpO1xuICAgICAgICAgICAgdmFyIGF0dHJzOiBhbnk7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBhdHRycyA9IEpTT04ucGFyc2UoaXRlbS5kYXRhKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgdGhhdC50cmlnZ2VyKCdlcnJvcicsIGUpO1xuICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChpc0NvbGxlY3Rpb24pIHtcbiAgICAgICAgICAgICAgcmVzdWx0LnB1c2goYXR0cnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgcmVzdWx0ID0gYXR0cnM7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSwgZnVuY3Rpb24gKHQyOiBTUUxUcmFuc2FjdGlvbiwgZTogU1FMRXJyb3IpIHtcbiAgICAgICAgICAvLyBlcnJvclxuICAgICAgICAgIGRpYWcuZGVidWcuZXJyb3IoJ3dlYlNxbCBlcnJvcjogJyArIGUubWVzc2FnZSk7XG4gICAgICAgICAgcmV0dXJuIHRydWU7IC8vIGFib3J0XG4gICAgICAgIH0pO1xuICAgICAgfSwgZnVuY3Rpb24gKHNxbEVycm9yOiBhbnkpIHsgLy8gZXJyb3JDYWxsYmFja1xuICAgICAgICBpZiAobGFzdFN0YXRlbWVudCkge1xuICAgICAgICAgIHNxbEVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcignV2ViU3FsIFN5bnRheCBFcnJvcjogJyArIHNxbEVycm9yLm1lc3NhZ2UpO1xuICAgICAgICB0aGF0LmhhbmRsZUVycm9yKG9wdGlvbnMsIHNxbEVycm9yKTtcbiAgICAgIH0sIGZ1bmN0aW9uICgpIHsgLy8gdm9pZENhbGxiYWNrIChzdWNjZXNzKVxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgaWYgKG9wdGlvbnMuc3luY0NvbnRleHQpIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IG9wdGlvbnMuc3luY0NvbnRleHQucHJvY2Vzc0F0dHJpYnV0ZXMocmVzdWx0LCBvcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdGhhdC5oYW5kbGVTdWNjZXNzKG9wdGlvbnMsIHJlc3VsdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbGV0IGVycm9yOiBXZWJTcWxFcnJvciA9IG5ldyBFcnJvcignbm8gcmVzdWx0Jyk7XG4gICAgICAgICAgaWYgKGxhc3RTdGF0ZW1lbnQpIHtcbiAgICAgICAgICAgIGVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRoYXQuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICBwcm90ZWN0ZWQgX2RlbGV0ZShtb2RlbDogTW9kZWwgfCBDb2xsZWN0aW9uLCBvcHRpb25zOiBhbnkpIHtcbiAgICB2YXIgZW50aXR5ID0gb3B0aW9ucy5lbnRpdHk7XG4gICAgdmFyIG1vZGVscyA9IGlzQ29sbGVjdGlvbihtb2RlbCkgPyBtb2RlbC5tb2RlbHMgOiBbbW9kZWxdO1xuICAgIGlmICh0aGlzLl9jaGVja0RiKG9wdGlvbnMpKSB7XG4gICAgICBvcHRpb25zLm1vZGVscyA9IG1vZGVscztcbiAgICAgIHZhciBzcWwgPSB0aGlzLl9zcWxEZWxldGUob3B0aW9ucywgZW50aXR5KTtcbiAgICAgIC8vIHJlc2V0IGZsYWdcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbc3FsXSwgbW9kZWwudG9KU09OKCkpO1xuICAgIH1cbiAgfVxuXG4gIHByb3RlY3RlZCBfZXhlY3V0ZVNxbChvcHRpb25zOiBhbnkpIHtcbiAgICBpZiAob3B0aW9ucy5zcWwpIHtcbiAgICAgIHRoaXMuX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zLCBbb3B0aW9ucy5zcWxdKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIHRyYW5zYWN0aW9uUHJvbWlzZSA9IFEucmVzb2x2ZShudWxsKTtcblxuICBwcm90ZWN0ZWQgX2V4ZWN1dGVUcmFuc2FjdGlvbihvcHRpb25zOiBhbnksIHN0YXRlbWVudHM6IChTdGF0ZW1lbnQgfCBzdHJpbmcpW10sIHJlc3VsdD86IGFueSkge1xuICAgIGlmICghdGhpcy5fY2hlY2tEYihvcHRpb25zKSkge1xuICAgICAgcmV0dXJuOyAvLyBkYXRhYmFzZSBub3Qgb3BlbiwgZXJyb3Igd2FzIGlzc3VlZCBieSBfY2hlY2tEYigpIGFib3ZlXG4gICAgfVxuXG4gICAgLy8gZm9sbG93aW5nIHNlcXVlbnRpYWxseSBwcm9jZXNzZXMgdHJhbnNhY3Rpb25zIGF2b2lkaW5nIHJ1bm5pbmcgdG9vIG1hbnkgY29uY3VycmVudGx5XG4gICAgdGhpcy50cmFuc2FjdGlvblByb21pc2UgPSB0aGlzLnRyYW5zYWN0aW9uUHJvbWlzZS5maW5hbGx5KCgpID0+IHtcbiAgICAgIHZhciBsYXN0U3RhdGVtZW50OiBzdHJpbmc7XG4gICAgICByZXR1cm4gUS5Qcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgICAgLyogdHJhbnNhY3Rpb24gaGFzIDMgcGFyYW1ldGVyczogdGhlIHRyYW5zYWN0aW9uIGNhbGxiYWNrLCB0aGUgZXJyb3IgY2FsbGJhY2sgYW5kIHRoZSBzdWNjZXNzIGNhbGxiYWNrICovXG4gICAgICAgIHJldHVybiB0aGlzLmRiLnRyYW5zYWN0aW9uKCh0KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIF8uZWFjaChzdGF0ZW1lbnRzLCAoc3RtOiBhbnkpID0+IHtcbiAgICAgICAgICAgIHZhciBzdGF0ZW1lbnQgPSBzdG0uc3RhdGVtZW50IHx8IHN0bTtcbiAgICAgICAgICAgIHZhciBhcmdzID0gc3RtLmFyZ3VtZW50cztcbiAgICAgICAgICAgIGxhc3RTdGF0ZW1lbnQgPSBzdGF0ZW1lbnQ7XG5cbiAgICAgICAgICAgIGlmIChkaWFnLmRlYnVnLmVuYWJsZWQpIHtcbiAgICAgICAgICAgICAgZGlhZy5kZWJ1Zy5pbmZvKCdzcWwgc3RhdGVtZW50OiAnICsgc3RhdGVtZW50KTtcbiAgICAgICAgICAgICAgaWYgKGFyZ3MpIHtcbiAgICAgICAgICAgICAgICBkaWFnLmRlYnVnLnRyYWNlKCcgICAgYXJndW1lbnRzOiAnICsgSlNPTi5zdHJpbmdpZnkoYXJncykpO1xuICAgICAgICAgICAgICAgIGRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgIHJldHVybiAhYXJncy5zb21lKChhcmc6IGFueSkgPT4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgJiYgQkFEX1VOSUNPREVTLnRlc3QoYXJnKSk7XG4gICAgICAgICAgICAgICAgfSwgJ2h0dHBzOi8vaXNzdWVzLmFwYWNoZS5vcmcvamlyYS9icm93c2UvQ0ItOTQzNSBpT1MgdW5pY29kZSBpc3N1ZSEnKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0LmV4ZWN1dGVTcWwoc3RhdGVtZW50LCBhcmdzKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSwgcmVqZWN0LCA8U1FMVm9pZENhbGxiYWNrPnJlc29sdmUpO1xuICAgICAgfSkudGhlbigoKSA9PiB7XG4gICAgICAgIHJldHVybiB0aGlzLmhhbmRsZVN1Y2Nlc3Mob3B0aW9ucywgcmVzdWx0KSB8fCBudWxsO1xuICAgICAgfSwgKGVycm9yOiBXZWJTcWxFcnJvcikgPT4ge1xuICAgICAgICBpZiAobGFzdFN0YXRlbWVudCkge1xuICAgICAgICAgIGVycm9yLnNxbCA9IGxhc3RTdGF0ZW1lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgICAgcmV0dXJuIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpIHx8IG51bGw7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuXG4gIHByb3RlY3RlZCBfY2hlY2tEYihvcHRpb25zOiBhbnkpIHtcbiAgICAvLyBoYXMgdG8gYmUgaW5pdGlhbGl6ZWQgZmlyc3RcbiAgICBpZiAoIXRoaXMuZGIpIHtcbiAgICAgIHZhciBlcnJvciA9IG5ldyBFcnJvcignZGIgaGFuZGxlciBub3QgaW5pdGlhbGl6ZWQuJyk7XG4gICAgICBkaWFnLmRlYnVnLmVycm9yKGVycm9yLm1lc3NhZ2UpO1xuICAgICAgdGhpcy5oYW5kbGVFcnJvcihvcHRpb25zLCBlcnJvcik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgcHJvdGVjdGVkIF9jaGVja0RhdGEob3B0aW9uczogYW55LCBkYXRhOiBNb2RlbFtdKSB7XG4gICAgaWYgKCghXy5pc0FycmF5KGRhdGEpIHx8IGRhdGEubGVuZ3RoID09PSAwKSAmJiAhXy5pc09iamVjdChkYXRhKSkge1xuICAgICAgdmFyIGVycm9yID0gbmV3IEVycm9yKCdubyBkYXRhLicpO1xuICAgICAgZGlhZy5kZWJ1Zy5lcnJvcihlcnJvci5tZXNzYWdlKTtcbiAgICAgIHRoaXMuaGFuZGxlRXJyb3Iob3B0aW9ucywgZXJyb3IpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG59XG5cbi8vIG1peGluc1xubGV0IHdlYlNxbFN0b3JlID0gXy5leHRlbmQoV2ViU3FsU3RvcmUucHJvdG90eXBlLCB7XG4gIF90eXBlOiAnUmVsdXRpb24ubGl2ZWRhdGEuV2ViU3FsU3RvcmUnLFxuXG4gIHNpemU6IDEwMjQgKiAxMDI0LCAvLyAxIE1CXG4gIHZlcnNpb246ICcxLjAnXG59KTtcbmRpYWcuZGVidWcuYXNzZXJ0KCgpID0+IFdlYlNxbFN0b3JlLnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mKE9iamVjdC5jcmVhdGUod2ViU3FsU3RvcmUpKSk7XG4iXX0=