/**
 * @module security
 */
/** */
import * as domain from '../core/domain';
/**
 * Role is either a User or a Group.
 */
export declare type RoleType = 'GROUP' | 'USER';
/**
 * A Group can have one of these types.
 */
export declare type GroupType = 'SYSTEM_PERMISSION' | 'GROUP' | 'SYSTEM_GROUP';
/**
 * Lightweight DTO for sending members and roles of groups/users in JSON responses.
 */
export interface RoleDto {
    uuid: string;
    name: string;
    systemPermission: boolean;
    type: RoleType;
    groupType?: GroupType;
}
/**
 * role data as exchanged with Relution server.
 */
export interface Role extends domain.Referenceable, domain.Secure, domain.HasVersion, domain.HasBundle {
    type: RoleType;
    roles: string[];
    rolesObjects: RoleDto[];
    sysRoles: string[];
    provider?: string;
    foreignKey?: string;
    readonly?: boolean;
}
/**
 * tenancy organization data as exchanged with Relution server.
 */
export interface Organization extends domain.Referenceable, domain.Secure, domain.HasVersion, domain.HasBundle, domain.HasModified {
    name: string;
    uniqueName: string;
    address?: any;
    billingSettings?: any;
    passwordPolicy?: any;
    technicalPerson?: any;
    url?: string;
    assetPath?: string;
    reportLocaleString?: string;
    defaultRoles?: string[];
    propertyMap?: any;
}
/**
 * user data as exchanged with Relution server.
 */
export interface User extends Role {
    organizationUuid: string;
    name: string;
    password?: string;
    salutation?: string;
    givenName?: string;
    surname?: string;
    position?: string;
    email?: string;
    phone?: string;
    country?: string;
    lastLoggedTime?: Date | number;
    passwordExpires?: Date | number;
    locked?: boolean;
    activated?: boolean;
    confirmationToken?: string;
    confirmationTokenValidTo?: Date;
    preferences?: any;
}
