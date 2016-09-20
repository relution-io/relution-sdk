"use strict";
var test = require('../models/test');
var user = require('../models/user');
var livedata = require('relution/livedata.js');
function init(app) {
    app.use('/api/v1/test', livedata.middleware(test.options));
    app.use('/api/v1/user', livedata.middleware(user.options));
    app.use('/api/v1/approvals', livedata.middleware(user.options));
}
exports.init = init;
//# sourceMappingURL=data.js.map