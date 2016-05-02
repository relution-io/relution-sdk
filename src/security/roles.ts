/**
 * @file security/roles.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 28.04.2016
 * Copyright (c)
 * 2016
 * M-Way Solutions GmbH. All rights reserved.
 * http://www.mwaysolutions.com
 * Redistribution and use in source and binary forms, with or without
 * modification, are not permitted.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 * FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
 * COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 * ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
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
