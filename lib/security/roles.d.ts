/**
 * @module security
 */
/** */
import * as domain from '../core/domain';
/**
 * role data as exchanged with Relution server.
 */
export interface Role extends domain.Referenceable, domain.Secure, domain.HasVersion, domain.HasBundle {
    provider?: string;
    foreignKey?: string;
}
/**
 * tenancy organization data as exchanged with Relution server.
 */
export interface Organization extends domain.Referenceable, domain.Secure, domain.HasVersion, domain.HasBundle, domain.HasModified {
    name: string;
    uniqueName: string;
    propertyMap?: any;
}
/**
 * user data as exchanged with Relution server.
 */
export interface User extends Role {
    organizationUuid: string;
    name: string;
    password: string;
    salutation?: string;
    givenName?: string;
    surname?: string;
    position?: string;
    email?: string;
    phone?: string;
    country?: string;
    lastLoggedTime?: Date;
    passwordExpires?: Date;
    locked?: boolean;
    activated?: boolean;
    confirmationToken?: string;
    confirmationTokenValidTo?: Date;
    preferences?: any;
}
