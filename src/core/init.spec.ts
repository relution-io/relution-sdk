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
