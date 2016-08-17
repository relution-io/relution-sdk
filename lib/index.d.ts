/// <reference path="../typings/globals/backbone-global/index.d.ts" />
/// <reference path="../typings/globals/backbone/index.d.ts" />
/// <reference path="../typings/globals/cordova/plugins/device/index.d.ts" />
/// <reference path="../typings/globals/jquery/index.d.ts" />
/// <reference path="../typings/globals/mocha/index.d.ts" />
/// <reference path="../typings/globals/node/index.d.ts" />
/// <reference path="../typings/globals/phonegap-plugin-push/index.d.ts" />
/// <reference path="../typings/globals/q/index.d.ts" />
/// <reference path="../typings/globals/socket.io-client/index.d.ts" />
/// <reference path="../typings/globals/underscore/index.d.ts" />
/// <reference path="../typings/globals/websql/index.d.ts" />
declare const version: any;
export { version };
export { debug } from './core/diag';
export { init } from './core/init';
export import core = require('./core');
export import model = require('./model');
export import query = require('./query');
export import security = require('./security');
export import web = require('./web');
export import push = require('./push');
export import connector = require('./connector');
export import livedata = require('./livedata');
