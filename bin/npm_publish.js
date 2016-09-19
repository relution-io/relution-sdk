#!/usr/bin/env node --harmony
'use strict';
const Observable = require('@reactivex/rxjs').Observable;
const {Bump, TagRepo} = require('./bump_commit');
const bumpClass = new Bump();
const taggingClass = new TagRepo();
const spawn = require('child_process').spawn;
const _browserify = spawn('npm', ['run', 'browserify']);
let defVer = bumpClass.defaultType;

bumpClass.bump(defVer)
  .last()
  .mergeMap((version) => {
    return Observable.fromEvent(_browserify, 'close')
  })
  .mergeMap((version) => {
    console.log('version', version);
    return taggingClass.addTag(version, defVer);
  })
  .mergeMap(() => {
    const npmPublish = spawn('npm', ['publish']);
    return Observable.fromEvent(npmPublish, 'close');
  })
  .subscribe(
    (log) => {
      console.log(log);
    },
    (e) => console.error(e),
    () => {
      console.log(bumpClass.packages);
      console.log('the new Version is now available at npm.');
    }
  );

