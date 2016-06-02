/**
 * @file security/roles.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
 * Copyright 2016 M-Way Solutions GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as domain from '../core/domain';

/**
 * role data as exchanged with Relution server.
 */
export interface Role extends domain.Referenceable, domain.Secure, domain.HasVersion,
                              domain.HasBundle {
  provider?: string;
  foreignKey?: string;
}

/**
 * tenancy organization data as exchanged with Relution server.
 */
export interface Organization extends domain.Referenceable, domain.Secure, domain.HasVersion,
                                      domain.HasBundle, domain.HasModified {
  name: string;
  uniqueName: string;

  propertyMap?: any;
}

/**
 * turns the object deeply immutable.
 *
 * @param organization to freeze.
 * @return {Organization} organization for convenience.
 *
 * @internal for library use only.
 */
export function freezeOrganization(organization: Organization): Organization {
  if (organization.propertyMap) {
    organization.propertyMap = Object.freeze(organization.propertyMap);
  }
  return domain.freeze(organization);
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

/**
 * turns the object deeply immutable.
 *
 * @param user to freeze.
 * @return {User} user for convenience.
 *
 * @internal for library use only.
 */
export function freezeUser(user: User): User {
  if (user.lastLoggedTime) {
    user.lastLoggedTime = Object.freeze(new Date(+user.lastLoggedTime));
  }
  if (user.passwordExpires) {
    user.passwordExpires = Object.freeze(new Date(+user.passwordExpires));
  }
  if (user.confirmationTokenValidTo) {
    user.confirmationTokenValidTo = Object.freeze(new Date(+user.confirmationTokenValidTo));
  }
  if (user.preferences) {
    user.preferences = Object.freeze(user.preferences);
  }
  return domain.freeze(user);
}
