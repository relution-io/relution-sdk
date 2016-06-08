import * as auth from './auth';
import * as roles from './roles';
/**
 * gets the [[Authorization]] in effect.
 *
 * @return {Authorization} in effect, may be null.
 */
export declare function getCurrentAuthorization(): auth.Authorization;
/**
 * gets the [[Organization]] in effect.
 *
 * @param fields of interest.
 * @return {Organization} in effect, may be null.
 */
export declare function getCurrentOrganization(...fields: string[]): roles.Organization;
/**
 * sets the [[Organization]].
 *
 * @param organization to set.
 */
export declare function setCurrentOrganization(organization: roles.Organization): void;
/**
 * gets the [[User]] in effect.
 *
 * @param fields of interest.
 * @return {User} in effect, may be null.
 */
export declare function getCurrentUser(...fields: string[]): roles.User;
