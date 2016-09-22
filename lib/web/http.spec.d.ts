/// <reference types="q" />
/**
 * @module web
 */
/** */
import * as Q from 'q';
import * as web from './index';
import * as security from '../security';
export declare class TestServer {
    private resetProperty<ValueT>(key, value);
    readonly serverUrl: string;
    readonly credentials: security.LoginObject;
    readonly login: Q.Promise<web.LoginResponse>;
}
export declare const testServer: TestServer;
