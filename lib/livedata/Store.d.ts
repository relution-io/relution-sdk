/**
 * @file livedata/Store.ts
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
import { Model } from './Model';
import { Collection } from './Collection';
import { _create, _design } from './Object';
/**
 * constructor function of Store.
 */
export interface StoreCtor {
    /**
     * @see Store#constructor
     */
    new (options?: any): Store;
}
/**
 * base class to build a custom data store.
 */
export declare class Store {
    _type: string;
    isModel: boolean;
    isCollection: boolean;
    protected name: string;
    protected entities: any;
    endpoints: any;
    constructor(options?: any);
    static extend: typeof Backbone.Model.extend;
    static create: typeof _create;
    static design: typeof _design;
    protected trigger: any;
    getArray(data: any): any;
    getDataArray(data: any): any[];
    getAttributes(model: any): any;
    initModel(model: any, options?: any): void;
    initCollection(collection: any, options?: any): void;
    sync(method: string, model: Model | Collection, options?: any): PromiseLike<any>;
    /**
     *
     * @param collection usally a collection, but can also be a model
     * @param options
     */
    fetch(collection: any, options: any): any;
    create(collection: any, model: any, options: any): any;
    save(model: any, attr: any, options: any): any;
    destroy(model: any, options: any): void;
    _checkData(obj: any, data: any): boolean;
    private handleCallback;
    protected handleSuccess(obj: any, ...args: any[]): any;
    protected handleError(obj: any, ...args: any[]): any;
    static CONST: {
        ERROR_NO_DATA: string;
        ERROR_LOAD_DATA: string;
        ERROR_SAVE_DATA: string;
        ERROR_LOAD_IDS: string;
        ERROR_SAVE_IDS: string;
    };
    close(): void;
}
