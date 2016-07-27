"use strict";
var chai_1 = require('chai');
var Relution = require('./init');
describe(module.filename || __filename, function () {
    it('if serverUrl fails', function (done) {
        var options = {
            serverUrl: 'ashdhasdasd/gsdvhasd'
        };
        return Relution.init(options).catch(function (e) {
            chai_1.assert(e.message.indexOf(options.serverUrl) !== -1, "Url fails " + e.message);
            done();
        });
    });
    it('if serverUrl not fails', function (done) {
        var options = {
            serverUrl: 'https://mwaysolutions.com'
        };
        return Relution.init(options).then(function (info) {
            chai_1.assert(info, 'Url not fails');
            done();
        });
    });
});
//# sourceMappingURL=init.spec.js.map