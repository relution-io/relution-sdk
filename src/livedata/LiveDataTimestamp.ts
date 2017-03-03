/*
 * @file livedata/LiveDataTimestamp.ts
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
 * used to persist last message timestamp data.
 *
 * @module Relution.livedata.LiveDataTimestamp
 *
 * @type {*}
 */
export interface LiveDataTimestamp {

  /**
   * channel the timestamp belongs to.
   */
  channel: string;

  /**
   * value stored.
   */
  timestamp: number;
}

/**
 * timestamp packed into a Model.
 *
 * @module Relution.livedata.LiveDataTimestamp
 *
 * @type {*}
 */
export class LiveDataTimestampModel extends Model/*<LiveDataTimestamp>*/ {

  /**
   * redefined to concrete type of attributes.
   */
  public attributes: LiveDataTimestamp;

}

// mixins
let timestampmodel = _.extend(LiveDataTimestampModel.prototype, {
  _type: 'Relution.livedata.LiveDataTimestampModel',
  entity: '__timestamp__',
  idAttribute: 'channel'
});
diag.debug.assert(() => LiveDataTimestampModel.prototype.isPrototypeOf(Object.create(timestampmodel)));
diag.debug.assert(() => new LiveDataTimestampModel({ channel: 'check' }).id === 'check');
