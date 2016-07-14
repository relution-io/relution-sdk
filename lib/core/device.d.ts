import * as domain from './domain';
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
 * additional information provided by forked device plugin of M-Way Labs.
 *
 * Notice, all additional properties are optional as it can not be guaranteed that the device
 * plugin is the modified version.
 *
 * @see https://github.com/mwaylabs/cordova-plugin-device
 */
export interface MWaylabsDevicePlugin extends Device {
    name?: string;
    appIdentifier?: string;
    appVersionName?: string;
    appVersionCode?: string;
}
/**
 * describes the device platform, vendor, etc.
 */
export interface Information extends domain.Referenceable {
    /**
     * serial number extracted using cordova device plugin.
     *
     * This may be useful as an encryption key. Notice, the `uuid` is also part of this object. Both
     * information currently is available only if hosted on a mobile device running in a container.
     */
    serial?: string;
    /**
     * ISO code of language selected by user in system settings.
     */
    language: string;
    /**
     * information of runtime platform available in all environments meaning mobile device, browser
     * or node.
     */
    platform: {
        id: PlatformId;
        name: string;
        version: string;
    };
    /**
     * information of mobile device as provided by Cordova device plugin.
     *
     * This member currently is `undefined` in browser and node environments, but this may change
     * without notice.
     */
    device?: MWaylabsDevicePlugin;
}
