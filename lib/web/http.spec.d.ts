import * as web from './index';
import * as security from '../security';
export declare class TestServer {
    private resetProperty<ValueT>(key, value);
    serverUrl: string;
    credentials: security.LoginObject;
    login: Q.Promise<web.LoginResponse>;
}
export declare const testServer: TestServer;
