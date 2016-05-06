/**
 * Created by Pascal Brewing
 * Copyright (c)
 * 2015
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

import * as _ from 'lodash';
import * as assert from 'assert';

/**
 * expression validating an assumption of the calling code, typically an arrow-function expression.
 */
export interface AssertionCheck {
  (): boolean;
}

/**
 * subtype of Error thrown by assert() in case AssertionCheck fails.
 */
export type AssertionError = assert.AssertionError;

/**
 * enables/disables assertion testing at runtime.
 *
 * <p>
 * When undefined, isDebugMode() controls whether assertions are validated.
 * </p>
 */
export let assertions: boolean;

export interface LogFunc {
  (message: string, ...parameters: any[]): void;
}

/**
 * console featuring coloring, fontSize and enabled state.
 */
export class Diagnostics {
  private static STUB() {
    // empty by intention
  }

  private fontSize_: string;
  private enabled_: boolean;

  public constructor(enabled = false, fontSize = '12px') {
    this.enabled_ = enabled;
    this.fontSize_ = fontSize;
    this.reset();
  }

  private reset() {
    // uses bound functions to avoid browsers outputting incorrect line numbers
    if (this.enabled_) {
      if (!process || 'browser' in process) {
        // browser
        this.log = <LogFunc>_.bind(console.log, console, '%c%s');
        this.trace = <LogFunc>_.bind(console.trace, console, '%c%s',
          `color: #378c13; font-size: ${this.fontSize_};font-weight: normal;`);
        this.debug = <LogFunc>_.bind(console.info, console, '%c%s',
          `color: #008c13; font-size: ${this.fontSize_};font-weight: normal;`);
        this.info = <LogFunc>_.bind(console.info, console, '%c%s',
          `color: #00f; font-size: ${this.fontSize_};font-weight: normal;`);
        this.warn = <LogFunc>_.bind(console.warn, console, '%c%s',
          `color: #e69138; font-size: ${this.fontSize_};font-weight: normal;`);
        this.error = <LogFunc>_.bind(console.error, console, '%c%s',
          `color: #f00; font-size: ${this.fontSize_};font-weight: normal;`);
      } else {
        // node
        this.log = <LogFunc>_.bind(console.log, console, '\u001b[15m  LOG\u001b[00m %s');
        this.trace = <LogFunc>_.bind(console.trace, console, '\u001b[34mTRACE\u001b[00m %s');
        this.debug = <LogFunc>_.bind(console.info, console, '\u001b[35mDEBUG\u001b[00m %s');
        this.info = <LogFunc>_.bind(console.info, console, '\u001b[32m INFO\u001b[00m %s');
        this.warn = <LogFunc>_.bind(console.warn, console, '\u001b[36m WARN\u001b[00m %s');
        this.error = <LogFunc>_.bind(console.error, console, '\u001b[31mERROR\u001b[00m %s');
      }
    } else {
      this.log = Diagnostics.STUB;
      this.trace = Diagnostics.STUB;
      this.debug = Diagnostics.STUB;
      this.info = Diagnostics.STUB;
      this.warn = Diagnostics.STUB;
      this.error = Diagnostics.STUB;
    }
    this.warning = this.warn; // alias only
  }

  public get enabled(): boolean {
    return this.enabled_;
  }

  public set enabled(enabled: boolean) {
    if (this.enabled_ !== enabled) {
      this.enabled_ = enabled;
      this.reset();
    }
  }

  public get fontSize(): string {
    return this.fontSize_;
  }

  public set fontSize(fontSize: string) {
    if (this.fontSize_ !== fontSize) {
      this.fontSize_ = fontSize;
      this.reset();
    }
  }

  public log: LogFunc;

  public trace: LogFunc;
  public debug: LogFunc;
  public info: LogFunc;
  public warn: LogFunc;
  public warning: LogFunc;
  public error: LogFunc;

  /**
   * uses toSource() if available, falling back to toString() otherwise.
   *
   * @param func to generate source of.
   * @return {string} of func.
     */
  private static toSource(func: Function): string {
    let anything: any = func; // must not type-check as name and toSource() might not exist
    return anything.name ||
      (typeof anything.toSource === 'function' ? anything.toSource() : func.toString());
  }

  /**
   * evaluates given check expression as a strong invariant never ever violated.
   *
   * <p>
   * Use assert to ensure an assumption at runtime. When running with assertions enabled, the check expression is
   * evaluated immediately. A check expression evaluating to false signals a violation of invariant that should never
   * happen. If it does, a hard error is output unconditionally to the console and an AssertionError is thrown.
   * </p>
   * <p>
   * Do not use assertions as a means of ordinary error checking. Here are some valid examples of assertions:
   * <pre>
   *     assert(() => Date.now() > 0, 'current time millis can not be before 1970 start of time!');
   *     assert(() => total_price >= item_price, 'total is sum of individal prices and thus can not be less than each one!');
   *     assert(() => num*num >= 0, 'squared num is less than zero!');
   * </pre>
   * </p>
   *
   * @param check expression validating an assumption of the calling code, typically an arrow-function expression.
   * @param message optional explanation of disaster.
   */
  public assert(check: AssertionCheck, message?: string): void {
    let debugMode = this.enabled;
    if (assertions === undefined ? debugMode : assertions) {
      try {
        assert(check(), message || Diagnostics.toSource(check));
      } catch (error) {
        if (debugMode) {
          this.error('Assertion failed: ' + error.message, error);
          debugger; // so you can inspect what causes the problem
        } else {
          console.error('Assertion failed: ' + error.message, error);
        }
        throw error;
      }
    }
  }

  /**
   * used in catch-blocks or Promise rejection callbacks to ensure the caught value is an Error.
   *
   * @param error to check.
   * @param message of disaster.
   * @return {any} value evaluating to true stating error is an instance of Error.
   */
  public assertIsError(error: any, message?: string): error is Error {
    this.assert(() => _.isError(error), message);
    return error;
  }
}

export const debug = new Diagnostics(true);
