#!/usr/bin/env node --harmony
'use strict';
const fs = require('fs');
const path = require('path');
const Observable = require('@reactivex/rxjs').Observable;
const semver = require('semver');

/**
 * Bump the package json
 */
module.exports.Bump = class Bump {
  constructor(defaultType = 'patch', packages = [`${process.cwd()}/package.json`]) {
    this.packages = [];
    this.types = [
      'major',
      'minor',
      'patch',
      'pre',
      'premajor',
      'preminor',
      'prepatch',
      'prerelease'
    ];
    this.defaultType = defaultType;
    Observable.from(packages).subscribe(
      (pkg) => {
        // console.log('pkg', pkg);
        this.packages.push({
          path: pkg,
          data: require(pkg)
        });
      },
      (e) => console.error(e),
      () => {
        // console.log(this.packages)
      }
    );
  }

  bump(defaultType = this.defaultType) {
    let newVersion;
    return Observable.from(this.packages)
      .filter(() => {
        const allowed = this.types.indexOf(defaultType) !== -1;
        if (!allowed) {
          console.warn(`${defaultType} is not allowed. Please use ${this.types.map(
            (type, index) =>
              ` ${type}`
            )}`
          );
        }
        return allowed;
      })
      .map((pkg) => {
        newVersion = semver.inc(pkg.data.version, defaultType);
        console.log(`changed version from ${pkg.data.version} to ${newVersion} ${defaultType}`);
        pkg.data.version = semver.inc(pkg.data.version, defaultType);
        return pkg;
      })
      .mergeMap((pkg) => {
        const writer = Observable.bindNodeCallback(fs.writeFile);
        // pkg.path = `${process.cwd()}/package1.json`;
        return writer(pkg.path, JSON.stringify(pkg.data, null, 2));
      })
      .map((filePath) => {
        console.log(`update file ${filePath}`);
      })
      .map(() => {
        return newVersion;
      });
  }
}
/**
 * add a tag at the current branch and committ the changes
 */
module.exports.TagRepo = class TagRepo {

  constructor( message = 'v', repoPath = path.resolve(`${process.cwd()}`), commit = process.argv[3] ? process.argv[3] : false) {
    this.simpleGit = require('simple-git')(repoPath);
    this.message = message;
  }

  addTag(tag, type) {
    const self = this;
    return Observable.create((observer) => {
      this.simpleGit.add('./*')
        .commit(`${type} ${self.message}${tag}`)
        .addTag(`${tag}`)
        .pushTags(['-u', 'origin', 'master'], function () {
          observer.next(`${tag} pushed`);
        })
        .push(['-u', 'origin', 'master'], function () {
          observer.next(`master branch pushed`);
          observer.complete();
        });
    })
  }
}
/**
 * Check if there are uncommitted changes
 */
module.exports.RepoStats = class RepoStats {
  constructor(repoPath = path.resolve(`${process.cwd()}`), commit = process.argv[3] ? process.argv[3] : false) {
    this.simpleGit = require('simple-git')(repoPath);
  }
  isAllCommited() {
    return Observable.create((observer) => {
      this.simpleGit.status((e, stats) => {
        if (e) {
          console.error('ERROR', e);
          return observer.error(e);
        }
        debugger;
        if (stats && stats.modified) {
          observer.next(stats.modified);
        } else {
          observer.next([]);
        }
      });
    });
  }
}
