/**
 * @module web
 */
/** */
import * as init from '../core/init';
/**
 * version information of Relution server extracted from response header.
 */
export interface ServerInformation {
    /**
     * plain version number of Relution server.
     *
     * This is the value of the X-Relution-Version header: `3.56`, for example.
     */
    version?: string;
    /**
     * human readable full name of Relution server.
     *
     * This is the value of the X-Server header: `Relution/3.56 Enterprise (Wed Sep 28 11:16:00 CEST 2016)`, for example.
     */
    description?: string;
}
/**
 * gets the [[ServerInformation]] of the last recent [[ajax]] request.
 *
 * @param serverUrlOrServerUrlOptions url of server or options object, omit to query the current server.
 * @return information object when online, or falsy when offline.
 */
export declare function getOnlineStatus(serverUrlOrServerUrlOptions?: string | init.ServerUrlOptions): ServerInformation;
