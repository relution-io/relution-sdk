/**
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

import * as _ from 'lodash';

import * as diag from '../core/diag';

import * as cipher from '../core/cipher';
import {AbstractSqlStore} from './AbstractSqlStore';

interface WebSqlOptions {
  name: string;
  description?: string;
  version?: string;

  size?: number;
  location?: number;

  key?: string;
  security?: string;
  credentials?: any;
}

/**
 * openDatabase of browser or via require websql.
 *
 * @internal Not public API, exported for testing purposes only!
 */
export function openDatabase(options: WebSqlOptions) {
  let db;
  if (global['sqlitePlugin']) {
    // device implementation
    options = _.clone(options);
    if (!options.key) {
      if (options.security) {
        options.key = options.security;
        delete options.security;
      } else if (options.credentials) {
        options.key = cipher.hashJsonSync(options.credentials, 'sha256').toString('hex');
        delete options.credentials;
      }
    }
    if (!options.location) {
      options.location = 2;
    }
    db = global['sqllitePlugin'].openDatabase(options);
  } else if (global['openDatabase']) {
    // native implementation
    db = global['openDatabase'](options.name, options.version || '', options.description || '', options.size || 1024 * 1024);
  } else if (process && !process['browser']) {
    // node.js implementation
    let websql;
    try {
      websql = require('websql');
    } catch (error) {
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
 *      store: new Relution.livedata.WebSqlStore()
 * });
 *
 * // If you want to use specific columns you can specify the fields
 * // in the entity of your model like this:
 * var MyModel = Relution.livedata.Model.extend({
 *      idAttribute: 'id'
 * });
 */
export class WebSqlStore extends AbstractSqlStore {
  constructor(options?: any) {
    super(options);

    var that = this;
    this._openDb(_.defaults({
      name: this.name,
      error: function (error) {
        diag.debug.error(error);
        that.trigger('error', error);
      }
    }, options));
  }

  /**
   * @private
   */
  private _openDb(options) {
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
      } catch (e) {
        error = e;
      }
    }

    if (this.db) {
      if (this.version && this.db.version !== this.version && this.db.changeVersion) {
        this._updateDb(options);
      } else {
        this.handleSuccess(options, this.db);
      }
    } else if (error === 2 || error === '2') {
      // Version number mismatch.
      this._updateDb(options);
    } else if (error) {
      this.handleError(options, error);
    } else {
      this.handleSuccess(options, this.db);
    }
  }

  private _updateDb(options) {
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
          } else {
            that.handleError(options, err.message, lastSql);
          }
        }, function () {
          that.handleSuccess(options, that.db);
        });
      } catch (e) {
        error = e.message;
        diag.debug.error('webSql change version failed, DB-Version: ' + this.db.version);
      }
    } catch (e) {
      error = e.message;
    }
    if (error) {
      this.handleError(options, error);
    }
  }
}

// mixins
let webSqlStore = _.extend(WebSqlStore.prototype, {
  _type: 'Relution.LiveData.WebSqlStore'
});
diag.debug.assert(() => WebSqlStore.prototype.isPrototypeOf(Object.create(webSqlStore)));
