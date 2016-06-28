/**
 * Dependencies.
 */

if ('undefined' != typeof require) {
  Q = require('q');
  chai = require('chai');
  assert = chai.assert;
  expect = chai.expect;
}

serverUrl = "http://localhost:8200";

Q.longStackSupport = true;

function backbone_error(done) {
  return function (model, error) {
    done(error instanceof Error ? error : new Error(JSON.stringify(error)));
  }
}
