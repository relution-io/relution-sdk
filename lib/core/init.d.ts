/**
 * applied on each successful authentication with the Relution server.
 *
 * The function may be executed multiple times, for example when the session times out. The purpose
 * of it is to call application-specific logons passing information such as credentials of 3rd-tier
 * backend servers.
 */
export interface LogonCallback {
    (): Q.Promise<any>;
}
/**
 * options passed to [[login]] method as well as to [[init]] serving as defaults for HTTP logins.
 */
export interface ServerUrlOptions {
    /**
     * absolute url path of (default) Relution server.
     */
    serverUrl?: string;
    /**
     * name of (backend) application as specified in relution.json.
     */
    application?: string;
    /**
     * optional logon applied after each login.
     */
    logonCallback?: LogonCallback;
    /**
     * when set, this is used as `pfx` for the requests to the server.
     */
    clientCertificate?: {
        cert?: Buffer;
        passphrase?: string;
    } | any;
    /**
     * specifies additional options for the HTTP agent, advanced operation.
     */
    agentOptions?: any;
}
export declare function cloneServerUrlOptions(serverUrlOptions: ServerUrlOptions): ServerUrlOptions;
/**
 * optional options passed to [[init]].
 */
export interface InitOptions extends ServerUrlOptions {
    /**
     * when set, reconfigures console debugging and assertion testing of the library.
     */
    debug?: boolean;
}
/**
 * (re)initializes the SDK providing global configuration parameters.
 *
 * @param options of configuration, often these are hardcoded values of the mobile client app.
 */
export declare function init(options?: InitOptions): void;
