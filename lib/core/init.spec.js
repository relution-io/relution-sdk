"use strict";
var chai_1 = require('chai');
var Relution = require('./init');
describe(module.filename || __filename, function () {
    it('if serverUrl is incorrect', function () {
        var options = {
            serverUrl: 'ashdhasdasd/gsdvhasd',
            debug: false
        };
        return Relution.init(options)
            .then(function () {
            throw new Error('expected to fail!');
        })
            .catch(function (e) {
            chai_1.assert(e.message.indexOf(options.serverUrl) !== -1, "Url fails " + e.message);
            return true;
        });
    });
    it('if serverUrl is set', function () {
        var options = {
            serverUrl: 'https://mwaysolutions.com',
            debug: false
        };
        return Relution.init(options).then(function (info) {
            chai_1.assert(info, 'Url not fails');
            return true;
        });
    });
    it('if serverUrl is not set', function () {
        return Relution.init({ debug: false }).then(function (info) {
            chai_1.assert(info.platform.id === 'node', 'node');
            return true;
        });
    });
});
//# sourceMappingURL=init.spec.js.map