/**
 * @file app.js
 */
import * as express from 'express';
import * as bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// global variables
global['app'] = app;

// install routes
require('./routes/routes').init(app);
require('./routes/data').init(app);
require('./routes/connectors').init(app);
require('./routes/push').init(app);

// start express server
app.listen(null);
