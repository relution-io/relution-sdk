/**
 * @file core/domain.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
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
export interface Referenceable {
    uuid: string;
}
export interface Secure {
    aclEntries: string[];
    effectivePermissions?: string;
}
export interface HasVersion {
    version: number;
}
export interface HasBundle {
    bundle?: string;
}
export interface HasModified {
    createdRole?: string;
    createdDate?: Date;
    modifiedUser?: string;
    modifiedDate?: Date;
}
