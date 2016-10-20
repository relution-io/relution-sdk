#!/usr/bin/env node --harmony
'use strict';
const browserify = require('browserify');
const path = require('path');
const exorcist = require('exorcist');
const fs = require('fs');
const Observable = require('@reactivex/rxjs').Observable;

// browserify ./lib/index.lazy.js --standalone Relution --debug -u jquery -u socket.io-client -u node-localstorage -u websql | exorcist browser.js.map > browser.js
module.exports.BuildBrowserFile = class BuildBrowserFile {
  build() {
    return Observable.create(observer => {
      const buiOptions = {
        debug: true,
        standalone: 'Relution'
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
        .on('error', err => observer.error(err))
        .on('end', () => {
          console.log(`${process.cwd()}/browser.js written`);
          console.log(path.join(process.cwd(), 'browser.js.map') + ' written');
          //workaround exorcist
          setTimeout(() => {
            observer.next('browserify are done');
            observer.complete();
          }, 3000);
        })
        .pipe(exorcist(path.join(process.cwd(), 'browser.js.map')))
        .pipe(fs.createWriteStream(`${process.cwd()}/browser.js`));
    })
  }
}
