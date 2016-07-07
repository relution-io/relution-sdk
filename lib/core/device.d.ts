/**
 * @file core/device.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 07.07.2016
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
import * as Q from 'q';
/**
 * platform IDs compatible to constants of ionic.
 *
 * Notice, `io.js` is treated as `node` here. You may choose to use `process.platform` to further
 * differentiate on desktops or `window.device.platform` on mobile devices. Both of this is exposed
 * as `Information.platform.name`. That said, you should avoid platform-specific code of that level
 * entirely.
 */
export declare type PlatformId = 'android' | 'ios' | 'windowsphone' | 'blackberry' | 'browser' | 'node';
/**
 * describes the device platform, vendor, etc.
 */
export interface Information {
    platform: {
        id: PlatformId;
        name: string;
        version: string;
    };
}
/**
 * resolves to Information object as soon as the device is ready.
 */
export declare const ready: Q.Promise<Information>;
