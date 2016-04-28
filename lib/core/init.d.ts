/**
 * optional options passed to [[init]].
 */
export interface InitOptions {
    /**
     * absolute url path of (default) Relution server.
     */
    serverUrl?: string;
}
/**
 * (re)initializes the SDK providing global configuration parameters.
 *
 * @param options of configuration, often these are hardcoded values of the mobile client app.
 */
export declare function init(options?: InitOptions): void;
