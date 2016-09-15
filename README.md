# Relution SDK

[![NPM version](http://img.shields.io/npm/v/relution-sdk.svg?style=flat-square)][npm-url]
[![Dependency Status](http://img.shields.io/david/relution-io/relution-sdk/master.svg?style=flat-square)][daviddm-url]
[![Download Month](http://img.shields.io/npm/dm/relution-sdk.svg?style=flat-square)][npm-url]

[npm-url]: https://npmjs.org/package/relution-sdk
[daviddm-url]: https://david-dm.org/relution-io/relution-sdk

## Docs
[https://relution.readme.io/docs/relution-sdk](https://relution.readme.io/docs/relution-sdk)

## Installation and Usage

### ES6 via npm

```bash
npm install relution-sdk --save
```

To import the entire core set of functionality:

> Notice Relution SDK is lazy loaded

```javascript
import * as Relution from 'relution-sdk';

Relution.init ....
```
To import only what you need by patching :
```javascript
import {web} from 'relution-sdk/web';

Relution.web. ....
```

### ES5 via bower

```bash
bower install relution-sdk --save
```
```html
<script src="{{Your path to your bower_components}}/relution-sdk/browser.js"></script>
```
```javascript
Relution.init ....
```
[read more about Relution SDK](https://relution.readme.io/docs/relution-sdk).
### Dev Guide
---

##### Installation for development
```bash
$: git clone git@github.com:relution-io/relution-sdk.git
$: cd relution-sdk 
$: npm i
$: npm run watch
```

### Build browser js
```bash
npm run browserify
```

##### Test
```bash
$: npm test
```

##### Api reference
```bash
$: npm run api
```
