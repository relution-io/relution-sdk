/*
 * @file core/init.spec.ts
 * Relution SDK
 *
 * Created by Pascal Brewing on 27.07.2016
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
/**
 * @module core
 */
/** */

import {assert} from 'chai';
import * as Relution from './init';

describe(module.filename || __filename, function() {

  it ('if serverUrl is incorrect', () => {
    const options = {
      serverUrl: 'ashdhasdasd/gsdvhasd',
      debug: false
    };
    return Relution.init(options)
    .then(() => {
      throw new Error('expected to fail!');
    })
    .catch((e) => {
      assert(e.message.indexOf(options.serverUrl) !== -1, `Url fails ${e.message}`);
      return true;
    });

  });

  it ('if serverUrl is set', () => {
    const options = {
      serverUrl: 'https://mwaysolutions.com',
      debug: false
    };
    return Relution.init(options).then(
      (info) => {
        assert(info, 'Url not fails');
        return true;
      }
    );
  });

  it ('if serverUrl is not set', () => {
    return Relution.init({debug: false}).then(
      (info) => {
        assert(info.platform.id !== undefined, `Platform has a id ${info.platform.id}`);
        return true;
      }
    );
  });
});
