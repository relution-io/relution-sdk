#!/usr/bin/env node --harmony
'use strict';
const Observable = require('@reactivex/rxjs').Observable;
const {Bump, TagRepo, RepoStats} = require('./bump_commit');
const {BuildBrowserFile} = require('./browserify_build');

const browserify = new BuildBrowserFile();
const bumpClass = new Bump();
const taggingClass = new TagRepo();
const spawn = require('child_process').spawn;
// const _browserify = spawn('npm', ['run', 'browserify']);


let defVer = bumpClass.defaultType;
let patchVersion = null;
const stats = new RepoStats();
  stats.isAllCommited()
  .filter((stats) => {
    if (stats.length) {
      console.log(`You have uncommitted changes plz commit before ${stats.toString()}`);
    }
    return stats.length <= 0;
  })
  .mergeMap(() => {
    return browserify.build();
  })
  .mergeMap(() => {
    return bumpClass.bump(defVer);
  })
  // .mergeMap((version) => {
  //   console.log('verison', version);
  //   patchVersion = version;
  //   return taggingClass.addTag(patchVersion, defVer);
  // })
  // .mergeMap(() => {
  //   const npmPublish = spawn('npm', ['publish']);
  //   return Observable.fromEvent(npmPublish, 'exit');
  // })
  .subscribe(
    (log) => {
      console.log(log);
    },
    (e) => {
      console.error(e)
    },
    () => {
      console.log(bumpClass.packages);
      console.log('the new Version is now available at npm.');
    }
  );

