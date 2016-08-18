/*
 * @file livedata/LiveDataMessage.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.12.2015
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

import * as _ from 'lodash';

import {Model} from './Model';

import * as diag from '../core/diag';

/**
 * an offline message of the client or a change message of the server.
 */
export interface LiveDataMessage {

  /**
   * primary key of the message.
   *
   * <p>
   * For offline messages stored on the client-side the key is of the form entity~id. The entity prefix
   * is required in order to compose a unique key in the rare event of using the same id value in
   * different entities. Notice, the combination is unique because offline messages targeting the same
   * record are merged resulting in just one change.
   * </p>
   * <p>
   * For transient (not stored) offline messages on the client-side the value is not present.
   * </p>
   * <p>
   * For changes reported by the server-side an explicit _id value is used, which is of no concern to
   * the client except for diagnostics as a debugging aid.
   * </p>
   */
  _id?: string;

  /**
   * original key of the target record being altered.
   */
  id: string;

  /**
   * CRUD-method of how the record is altered.
   *
   * <p>
   * This can be one of read, create, update, patch or delete only.
   * </p>
   */
  method: string;
  /**
   * point in time of alteration.
   */
  time: number;

  /**
   * actual attribute data being set (patch => merged) on target model in format suitable for model.set() call.
   */
  data: any;

  /**
   * offline messages are replayed in sort order of increasing priority followed by increasing time.
   *
   * <p>
   * The priority assigned is based on the SyncEndpoint (aka. entity). By default, all entites are of equal priority
   * so that messages are replayed in causal order. The priority may be changed to account for foreign key id
   * references among the entities. When this is done, entities with lower priority values are propagated to the
   * server before messages of higher order, independent of their timely order.
   * </p>
   * <p>
   * An example are customer accounts which must be created before creation of shopping card orders.
   * </p>
   */
  priority?: number;
}

/**
 * message packed into a Model.
 *
 * @module Relution.livedata.LiveDataMessage
 *
 * @type {*}
 */
export class LiveDataMessageModel extends Model/*<LiveDataMessage>*/ {

  /**
   * redefined to concrete type of attributes.
   */
  public attributes: LiveDataMessage;

}

// mixins
let msgmodel = _.extend(LiveDataMessageModel.prototype, {
  _type: 'Relution.livedata.LiveDataMessageModel',
  entity: '__msg__',
  idAttribute: '_id'
});
diag.debug.assert(() => LiveDataMessageModel.prototype.isPrototypeOf(Object.create(msgmodel)));
diag.debug.assert(() => new LiveDataMessageModel({ _id: 'check' }).id === 'check');
