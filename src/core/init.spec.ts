import {assert} from 'chai';
import * as Relution from './init';

describe(module.filename || __filename, function() {
  it ('if serverUrl fails', (done) => {
    const options = {
      serverUrl: 'ashdhasdasd/gsdvhasd'
    };
    return Relution.init(options).catch((e) => {
      assert(e.message.indexOf(options.serverUrl) !== -1, `Url fails ${e.message}`);
      done();
    });

  });

  it ('if serverUrl not fails', (done) => {
    const options = {
      serverUrl: 'https://mwaysolutions.com'
    };
    return Relution.init(options).then(
      (info) => {
        assert(info, 'Url not fails');
        done();
      }
    );
  });
});
