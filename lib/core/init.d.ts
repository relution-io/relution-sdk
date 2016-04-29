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
 * optional options passed to [[init]].
 */
export interface InitOptions {
    /**
     * absolute url path of (default) Relution server.
     */
    serverUrl?: string;
    /**
     * optional logon applied after each login.
     */
    logonCallback?: LogonCallback;
}
/**
 * (re)initializes the SDK providing global configuration parameters.
 *
 * @param options of configuration, often these are hardcoded values of the mobile client app.
 */
export declare function init(options?: InitOptions): void;
