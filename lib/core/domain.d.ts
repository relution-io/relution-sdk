/**
 * @module core
 */
/** */
export interface Referenceable {
    uuid: string;
}
export interface Secure {
    aclEntries: string[];
    effectivePermissions?: string;
}
export interface HasVersion {
    version: number;
}
export interface HasBundle {
    bundle?: string;
}
export interface HasApplication {
    application?: string;
}
export interface HasModified {
    createdUser?: string;
    createdDate?: Date;
    modifiedUser?: string;
    modifiedDate?: Date;
}
/**
 * extracts the uuid of a Referenceable.
 *
 * @param referenceable or string uuid.
 * @return {string} uuid of referenceable.
 */
export declare function uuidOf(referenceable: Referenceable | string): string;
