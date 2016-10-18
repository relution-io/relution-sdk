#!/usr/bin/env node --harmony
'use strict';
const browserify = require('browserify');
const path = require('path');
const exorcist = require('exorcist');
const fs = require('fs');

// browserify ./lib/index.lazy.js --standalone Relution --debug -u jquery -u socket.io-client -u node-localstorage -u websql | exorcist browser.js.map > browser.js
class BuildBrowserFile {
  constructor() {
    const buiOptions = {
      debug: true
    };
    const excludes = [
      'jquery',
      'socket.io-client',
      'node-localstorage',
      'websql'
    ];
    const addFile = path.join(__dirname, '..', 'lib', 'index.lazy.js');
    const bui = browserify(buiOptions);

    bui.add(addFile);
    // bui.require(require.resolve(addFile), { entry: true });
    excludes.map((file) => {
      bui.exclude(file);
    });

    bui.bundle()
    .on('error', err => console.error(err))
    .on('close', () => {
      console.log('done');
    })
    .pipe(exorcist(path.join(process.cwd(), 'browser.js.map')))
    .pipe(fs.createWriteStream(`${process.cwd()}/browser.js`));
    // ;
  }
}
const a  = new BuildBrowserFile();
