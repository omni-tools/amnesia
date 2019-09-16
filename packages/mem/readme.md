# Mem

[![Npm Version](https://img.shields.io/npm/v/@omni-tools/mem)](https://www.npmjs.com/package/@omni-tools/mem)
[![Build Status](https://travis-ci.org/omni-tools/amnesia.svg?branch=master)](https://travis-ci.org/omni-tools/amnesia.svg)
[![codecov](https://codecov.io/gh/omni-tools/amnesia/badge.svg?branch=master)](https://codecov.io/gh/omni-tools/amnesia?branch=master)

> (_Memory Expirable Memoize_) :floppy_disk:

> [Memoize](https://en.wikipedia.org/wiki/Memoization) functions - An optimization used to speed up consecutive function calls by caching the result of calls with identical input

Memory is automatically released when an item expires.

:loudspeaker: This is a fork of [@Sindresorhus](https://github.com/Sindresorhus) [`mem`](https://github.com/SamVerschueren/map-age-cleaner) package. It adds possibility to have non static max age, and a extend max age on access. (with a throttle mecanism)

So far its still kind of experiment, but
It might end up to be merged :slightly_smiling_face:

## Install

```
$ npm install @omni-tools/mem
```


## Usage

```js
const mem = require('@omni-tools/mem');

let i = 0;
const counter = () => ++i;
const memoized = mem(counter);

memoized('foo'); //=> 1

// Cached as it's the same arguments
memoized('foo'); //=> 1

// Not cached anymore as the arguments changed
memoized('bar'); //=> 2

memoized('bar'); //=> 2
```

##### Works fine with promise returning functions

```js
const mem = require('@omni-tools/mem');

let i = 0;
const counter = async () => ++i;
const memoized = mem(counter);

(async () => {
	console.log(await memoized()); //=> 1

	// The return value didn't increase as it's cached
	console.log(await memoized()); //=> 1
})();
```

```js
const mem = require('@omni-tools/mem');
const got = require('got');
const delay = require('delay');

const memGot = mem(got, {maxAge: 1000});

(async () => {
	await memGot('sindresorhus.com');

	// This call is cached
	await memGot('sindresorhus.com');

	await delay(2000);

	// This call is not cached as the cache has expired
	await memGot('sindresorhus.com');
})();
```


## API

### `mem(fn, options?)`

- `fn`: Function to be memoized. (_Type: `Function`_)
- `options`: Diverses option to customize memoizing behavior (_Type: `object`, default: `{}` _)
	you'll find bellow the different available options

##### `maxAge`
Configuration for the `maxAge` configuration mecanism

Originaly just the Milliseconds until the cache expires.

- _Type:_ (`number`|`function`|`object`)
- _Default:_ `Infinity`

More complex options can be now used, as you can now provide as `maxAge`:
- a `function`: this one will be injected the `key` and should return the moment(timestamp) at which the item should expire
- an `object`: this one is necessary to configure the refresh mecanism on acess
  - `ttl`: the ttl attached to new item. (this is the equivalent for simple _`number`_ `maxAge`)
  - `expirationDate`: function to compute the expiration data for new item with given `key` (value returned by `cacheKey` function)
  - `extendOnAccess`: increment to be added to `maxAge` of item being accessed (_Type: `number`_)
  - `setOnAccess`: Function that will determine the new `maxAge` for the object being accessed. (_Type: `(key:string, currentMaxAge:number) => future_max_age:numver`_)
  - `extensionThrottle`: throttle the extension of `maxAge` of the object being accessed (_Type: `number|boolean`_)
	if value is `true`, default throttle value of 1 second will be applied.
	if some number is given, any access to the item will not cause a `maxAge` extension until the end of this cooldown (in _millisecond_)

##### `cacheKey`
Determines the cache key for storing the result based on the function arguments.

- _Type:_ `Function`

By default, if there's only one argument and it's a [primitive](https://developer.mozilla.org/en-US/docs/Glossary/Primitive), it's used directly as a key (if it's a `function`, its reference will be used as key), otherwise it's all the function arguments JSON stringified as an array.

You could for example change it to only cache on the first argument `x => JSON.stringify(x)`.

##### `cache`
Specify the cache object to use

- _Type:_ `object`
- _Default:_ `new Map()`

Use a different cache storage. Must implement the following methods: `.has(key)`, `.get(key)`, `.set(key, value)`, `.delete(key)`, and optionally `.clear()`. You could for example use a `WeakMap` instead or [`quick-lru`](https://github.com/sindresorhus/quick-lru) for a LRU cache.

##### `cachePromiseRejection`
Cache rejected promises.

- _Type:_ `boolean`
- _Default:_ `true`


### mem.clear(fn)

Clear all cached data of a memoized function.
- `fn` : Some Memoized function.(_Type: `Function`_)

## Tips

### Cache statistics

If you want to know how many times your cache had a hit or a miss, you can make use of [stats-map](https://github.com/SamVerschueren/stats-map) as a replacement for the default cache.

#### Example

```js
const mem = require('@omni-tools/mem');
const StatsMap = require('stats-map');
const got = require('got');

const cache = new StatsMap();
const memGot = mem(got, {cache});

(async () => {
	await memGot('sindresorhus.com');
	await memGot('sindresorhus.com');
	await memGot('sindresorhus.com');

	console.log(cache.stats); //=> {hits: 2, misses: 1}
})();
```


## Related

- [p-memoize](https://github.com/sindresorhus/p-memoize) - Memoize promise-returning & async functions
