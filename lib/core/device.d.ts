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
