import * as express from 'express';

import * as test from '../models/test';
import * as user from '../models/user';
import * as approval from '../models/approval';

const livedata = require('relution/livedata.js');

export function init(app: express.Application) {
    app.use('/api/v1/test', livedata.middleware(test.options));
    app.use('/api/v1/user', livedata.middleware(user.options));
    app.use('/api/v1/approvals', livedata.middleware(user.options));
}
