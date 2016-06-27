/**
 * @file livedata/AbstractSqlStore.ts
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
var Store_1 = require('./Store');
var Model_1 = require('./Model');
var Collection_1 = require('./Collection');
var objectid_1 = require('./objectid');
var diag = require('../core/diag');
/**
 * stores LiveData into the WebSQL database.
 */
var AbstractSqlStore = (function (_super) {
    __extends(AbstractSqlStore, _super);
    function AbstractSqlStore(options) {
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
    }
    AbstractSqlStore.prototype.sync = function (method, model, options) {
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
    AbstractSqlStore.prototype.select = function (options) {
        this._select(null, options);
    };
    AbstractSqlStore.prototype.drop = function (options) {
        this._dropTable(options);
    };
    AbstractSqlStore.prototype.createTable = function (options) {
        this._createTable(options);
    };
    AbstractSqlStore.prototype.execute = function (options) {
        this._executeSql(options);
    };
    AbstractSqlStore.prototype._sqlUpdateDatabase = function (oldVersion, newVersion) {
        // create sql array, simply drop and create the database
        var sql = [];
        for (var entity in this.entities) {
            sql.push(this._sqlDropTable(entity));
            sql.push(this._sqlCreateTable(entity));
        }
        return sql;
    };
    AbstractSqlStore.prototype._sqlDropTable = function (entity) {
        return "DROP TABLE IF EXISTS '" + this.entities[entity].table + "';";
    };
    AbstractSqlStore.prototype._sqlCreateTable = function (entity) {
        return "CREATE TABLE IF NOT EXISTS '" + this.entities[entity].table + "' (id VARCHAR(255) NOT NULL PRIMARY KEY ASC UNIQUE, data TEXT NOT NULL);";
    };
    AbstractSqlStore.prototype._sqlDelete = function (options, entity) {
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
    AbstractSqlStore.prototype._sqlWhereFromData = function (options, entity) {
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
    AbstractSqlStore.prototype._sqlSelect = function (options, entity) {
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
    AbstractSqlStore.prototype._sqlValue = function (value) {
        value = _.isNull(value) ? 'null' : _.isObject(value) ? JSON.stringify(value) : value.toString();
        value = value.replace(/"/g, '""');
        return '"' + value + '"';
    };
    AbstractSqlStore.prototype._dropTable = function (options) {
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
            this.handleSuccess(options);
        }
    };
    AbstractSqlStore.prototype._createTable = function (options) {
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
    AbstractSqlStore.prototype._checkTable = function (options, callback) {
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
    AbstractSqlStore.prototype._insertOrReplace = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options) && this._checkData(options, models)) {
            var statements = [];
            var sqlTemplate = 'INSERT OR REPLACE INTO \'' + this.entities[entity].table + '\' (';
            for (var i = 0; i < models.length; i++) {
                var amodel = models[i];
                var statement = ''; // the actual sql insert string with values
                if (!amodel.id) {
                    amodel.set(amodel.idAttribute, new objectid_1.ObjectID().toHexString());
                }
                var value = options.attrs || amodel.attributes;
                var keys = ['id', 'data'];
                var args = [amodel.id, JSON.stringify(value)];
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
    AbstractSqlStore.prototype._select = function (model, options) {
        var entity = options.entity;
        if (this._checkDb(options)) {
            var lastStatement;
            var isCollection = !Model_1.isModel(model);
            var result;
            if (isCollection) {
                result = [];
            }
            else {
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
                });
            }, function (sqlError) {
                diag.debug.error('WebSql Syntax Error: ' + sqlError.message);
                that.handleError(options, sqlError.message, lastStatement);
            }, function () {
                if (result) {
                    if (options.syncContext) {
                        result = options.syncContext.processAttributes(result, options);
                    }
                    that.handleSuccess(options, result);
                }
                else {
                    that.handleError(options, 'no result');
                }
            });
        }
    };
    AbstractSqlStore.prototype._delete = function (model, options) {
        var entity = options.entity;
        var models = Collection_1.isCollection(model) ? model.models : [model];
        if (this._checkDb(options)) {
            options.models = models;
            var sql = this._sqlDelete(options, entity);
            // reset flag
            this._executeTransaction(options, [sql], model.toJSON());
        }
    };
    AbstractSqlStore.prototype._executeSql = function (options) {
        if (options.sql) {
            this._executeTransaction(options, [options.sql]);
        }
    };
    AbstractSqlStore.prototype._executeTransaction = function (options, statements, result) {
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
                            }
                        }
                        t.executeSql(statement, args);
                    });
                }, reject, resolve);
            }).then(function () {
                return _this.handleSuccess(options, result) || null;
            }, function (error) {
                diag.debug.error(error.message);
                return _this.handleError(options, error, lastStatement) || null;
            });
        });
    };
    AbstractSqlStore.prototype._checkDb = function (options) {
        // has to be initialized first
        if (!this.db) {
            var error = 'db handler not initialized.';
            diag.debug.error(error);
            this.handleError(options, error);
            return false;
        }
        return true;
    };
    return AbstractSqlStore;
}(Store_1.Store));
exports.AbstractSqlStore = AbstractSqlStore;
// mixins
var abstractSqlStore = _.extend(AbstractSqlStore.prototype, {
    _type: 'Relution.LiveData.AbstractSqlStore',
    size: 1024 * 1024,
    version: '1.0'
});
diag.debug.assert(function () { return AbstractSqlStore.prototype.isPrototypeOf(Object.create(abstractSqlStore)); });
//# sourceMappingURL=AbstractSqlStore.js.map