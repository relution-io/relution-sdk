/**
 * @file core/domain.ts
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

export interface HasModified {
  createdRole?: string;
  createdDate?: Date;
  modifiedUser?: string;
  modifiedDate?: Date;
}

/**
 * turns the object deeply immutable.
 *
 * @param self to freeze.
 * @return {T} self for convenience.
 *
 * @internal for library use only.
 */
export function freeze<T>(self: T): T {
  let anything: any = self;
  if (anything.aclEntries) {
    anything.aclEntries = Object.freeze(anything.aclEntries);
  }
  if (anything.createdDate) {
    anything.createdDate = Object.freeze(new Date(+anything.createdDate));
  }
  if (anything.modifiedDate) {
    anything.modifiedDate = Object.freeze(new Date(+anything.modifiedDate));
  }
  return Object.freeze(anything);
}
