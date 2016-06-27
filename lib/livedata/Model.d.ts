/**
 * @file livedata/Model.ts
 * Relution SDK
 *
 * Created by M-Way on 27.06.2016
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
import { Store } from './Store';
import { Collection } from './Collection';
import { SyncEndpoint } from './SyncEndpoint';
import { _create, _design } from './Object';
/**
 * constructor function of Model.
 */
export interface ModelCtor {
    /**
     * @see Model#constructor
     */
    new (attributes?: any, options?: any): Model;
}
/**
 * tests whether a given object is a Model.
 *
 * @param {object} object to check.
 * @return {boolean} whether object is a Model.
 */
export declare function isModel(object: any): object is Model;
/**
 * extension of a backbone.js Model.
 */
export declare class Model extends Backbone.Model {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    entity: string;
    defaults: {};
    changedSinceSync: {};
    collection: Collection;
    store: Store;
    credentials: any;
    endpoint: SyncEndpoint;
    static extend: typeof Backbone.Model.extend;
    static create: typeof _create;
    static design: typeof _design;
    constructor(attributes?: any, options?: any);
    protected init(attributes?: any, options?: any): void;
    ajax(options: any): any;
    sync(method: string, model: Backbone.ModelBase, options?: any): any;
    onChange(model: any, options: any): void;
    onSync(model: any, options: any): void;
    getUrlRoot(): string;
}
