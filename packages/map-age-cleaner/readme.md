# map-age-cleaner

[![Npm Version](https://img.shields.io/npm/v/@omni-tools/map-age-cleaner)](https://www.npmjs.com/package/@omni-tools/map-age-cleaner)
[![Build Status](https://travis-ci.org/omni-tools/amnesia.svg?branch=master)](https://travis-ci.org/omni-tools/amnesia.svg)
[![codecov](https://codecov.io/gh/omni-tools/amnesia/badge.svg?branch=master)](https://codecov.io/gh/omni-tools/amnesia?branch=master)

> Automatically cleanup expired items in a Map

:loudspeaker: This is a fork of [@SamVerschueren](https://github.com/SamVerschueren) [`map-age-cleaner`](https://github.com/SamVerschueren/map-age-cleaner), to be used for [`@omni-tools/mem`](https://www.npmjs.com/package/@omni-tools/mem)

So far its still kind of experiment, but
It might end up to be merged :slightly_smiling_face:

## Install

```
$ npm install @omni-tools/map-age-cleaner
```

## Usage

```js
import mapAgeCleaner from '@omni-tools/map-age-cleaner';

const map = new Map([
	['unicorn', {data: '🦄', maxAge: Date.now() + 1000}]
]);

mapAgeCleaner(map);

map.has('unicorn'); //=> true

// Wait for 1 second... 😴

map.has('unicorn'); //=> false
```

## API

### mapAgeCleaner(map, [options={property?,onExpire?}])

Returns the `Map` instance.

- `map`: Map instance which should be cleaned up. (_Type: `Map`_)
- `options`: object containing eventualy the two options possible
  - `property`: Name of the property which olds the expiry timestamp. (_Type: `string`, Default: `maxAge`_)
  - `onExpire`: Handler to be called with expired object on expiration. (_Type: `(key, value) => void`, Default: `undefined`_)
	takes the `key` and `value` of expired item as argument

## Related

- [expiry-map](https://github.com/SamVerschueren/expiry-map) - A `Map` implementation with expirable items
- [expiry-set](https://github.com/SamVerschueren/expiry-set) - A `Set` implementation with expirable keys
- [mem](https://github.com/sindresorhus/mem) - Memoize functions

## License

MIT © [Sam Verschueren](https://github.com/SamVerschueren)
