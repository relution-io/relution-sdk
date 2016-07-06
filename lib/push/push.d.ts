/**
 * @file push/push.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 06.07.2016
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
import * as Q from 'q';
import * as domain from '../core/domain';
import { Filter } from '../query/Filter';
/**
 * transmission status of a push Job.
 *
 * This models the Java enum `com.mwaysolutions.gofer2.push.domain.State`.
 */
export declare type State = 'UNUSED' | 'QUEUED' | 'RUNNING' | 'FINISHED';
/**
 * represents a push message.
 *
 * This models the Java class `com.mwaysolutions.gofer2.push.domain.Job`.
 */
export interface Job extends domain.Referenceable {
    description?: string;
    state?: State;
    app?: App;
    message: string;
    badge?: string;
    sound?: string;
    extras?: _.Dictionary<string>;
    deviceFilter?: Filter;
    total?: number;
    sent?: number;
    failed?: number;
}
/**
 * represents a push configuration of a specific client app.
 *
 * This models the Java class `com.mwaysolutions.gofer2.push.domain.App`.
 */
export interface App extends domain.Referenceable, domain.Secure, domain.HasVersion, domain.HasBundle, domain.HasApplication {
    organisationUuid?: string;
    name?: string;
    description?: string;
    devices?: Device[];
    jobs?: Job[];
}
/**
 * communication provider used to transport push messages to a push Device.
 *
 * This models the Java enum `com.mwaysolutions.gofer2.push.domain.ProviderType`.
 */
export declare type ProviderType = 'GCM' | 'APNS' | 'MCAP' | 'WNS';
/**
 * represents a push information of a specific mobile device.
 *
 * This models the Java class `com.mwaysolutions.gofer2.push.domain.Device`.
 */
export interface Device extends domain.Referenceable {
    token?: string;
    providerType?: ProviderType;
    app?: App;
    deviceIdentifier?: string;
    appPackageName?: string;
    user?: string;
    vendor?: string;
    name?: string;
    osVersion?: string;
    language?: string;
    country?: string;
    type?: string;
    appVersion?: string;
    model?: string;
    attributes?: _.Dictionary<string>;
    tags?: string[];
    badge?: number;
    lastConnect?: Date;
}
/**
 * posts push notification(s).
 *
 * @param message to deliver.
 * @returns promise of async execution resolving to UUIDs of jobs in asynchronous delivery,
 *    empty when no apps or devices got selected by the message criteria or null when no
 * 		target apps or devices exist at all.
 */
export declare function postPushNotification(message: Job): Q.Promise<string[]>;
/**
 * gets push notification status.
 *
 * @param uuidOrMessage to query.
 * @returns promise of async execution resolving to push Job information.
 */
export declare function fetchPushNotification(uuidOrMessage: string | Job): Q.Promise<Job>;
