/**
 * @file core/diag.spec.ts
 * Relution SDK
 *
 * Created by Thomas Beckmann on 03.05.2016
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

import * as diag from './diag';

describe(module.filename, () => {
  return [

    it('logging', () => {
      diag.debug.log('This is a log level message.');
      // diag.debug.trace('Trace message with length stack trace.');
      diag.debug.debug('Debug output of a variable:', 10);
      diag.debug.info('For your information...');
      diag.debug.warn('This stuff is under test.');
      diag.debug.error('The error can be ignored safely.');
    }),

    it('assertions', () => {
      diag.debug.assert(() => 1 > 0, 'one is greater than zero');
      diag.debug.assertIsError(new Error('some error'));
    })

  ];
});
