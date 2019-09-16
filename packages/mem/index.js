'use strict';
const mimicFn = require('mimic-fn');
const isPromise = require('p-is-promise');
const mapAgeCleaner = require('@omni-tools/map-age-cleaner');
const debug = require('debug')('omni-tools:mem');

const cacheStore = new WeakMap();

const defaultCacheKey = (...args) => {
	if (args.length === 0) {
		return '__defaultKey';
	}

	if (args.length === 1) {
		const [firstArgument] = args;
		const isObject = typeof firstArgument === 'object' && firstArgument !== null;
		const isPrimitive = !isObject;
		if (isPrimitive) {
			return firstArgument;
		}
	}

	return JSON.stringify(args);
};

const DEFAULT_THROTTLE = 1000;
const getMaxAgeConfiguration = maxAge => {
	if (!maxAge || !['number', 'function', 'object'].includes(typeof maxAge)) {
		return {activated: false, getMaxAge: () => Infinity};
	}

	if (typeof maxAge === 'number') {
		return {activated: true, getMaxAge: () => Date.now() + maxAge};
	}

	if (typeof maxAge === 'function') {
		return {activated: true, getMaxAge: maxAge};
	}

	if (maxAge.ttl || maxAge.expirationDate) {
		let getNewMaxAge = null;
		const throttleMaxAgeUpdate = typeof maxAge.extensionThrottle === 'number' ? maxAge.extensionThrottle : maxAge.extensionThrottle && DEFAULT_THROTTLE;
		if (typeof maxAge.extendOnAccess === 'number') {
			getNewMaxAge = (_, currentMaxAge) => currentMaxAge + maxAge.extendOnAccess;
		} else if (typeof maxAge.setOnAccess === 'function') {
			getNewMaxAge = maxAge.setOnAccess;
		}

		return {
			activated: true,
			getMaxAge: maxAge.ttl ? () => Date.now() + maxAge.ttl : maxAge.expirationDate,
			updateMaxAge: getNewMaxAge,
			throttleMaxAgeUpdate
		};
	}

	throw new Error('Invalid max age config (was given an object without a maxAge key(ttl or expirationDate))');
};

const mem = (fn, {
	cacheKey = defaultCacheKey,
	cache = new Map(),
	cachePromiseRejection = true,
	maxAge,
	onExpire
} = {}) => {
	const maxAgeConfig = getMaxAgeConfiguration(maxAge);
	if (maxAgeConfig.activated) {
		debug('calling max-age-cleaner to set up the expire mecanism');
		if (onExpire) {
			const wrapedOnExpire = (key, value) => onExpire({hash: key, args: value.args, value: value.data});
			mapAgeCleaner(cache, {onExpire: wrapedOnExpire});
		} else {
			mapAgeCleaner(cache);
		}
	}

	const memoized = function (...args) {
		const key = cacheKey(...args);

		if (cache.has(key)) {
			debug(`${fn.name} has cached value for ${key}`);
			const cachedValue = cache.get(key);
			if (maxAgeConfig.updateMaxAge) {
				if (maxAgeConfig.extensionThrottleMaxAgeUpdate) {
					const endThrottle = cachedValue.lastRecordedAccess && cachedValue.lastRecordedAccess + maxAgeConfig.extensionThrottleMaxAgeUpdate;
					const shouldRefreshMaxAge = !endThrottle || endThrottle < Date.now();
					if (shouldRefreshMaxAge) {
						debug(`refreshing timer for ${fn.name}:${key}`);
						const newMaxAge = maxAgeConfig.updateMaxAge(key, cachedValue.maxAge);
						cache.set(key, {maxAge: newMaxAge, data: cachedValue.data, lastRecordedAccess: Date.now()});
					} else {
						debug(`refreshing timer for ${fn.name}:${key} what throttled (throttle in place until ${endThrottle})`);
					}
				} else {
					debug(`refreshing timer for ${fn.name}:${key}`);
					const newMaxAge = maxAgeConfig.updateMaxAge(key, cachedValue.maxAge);
					cache.set(key, {maxAge: newMaxAge, data: cachedValue.data});
				}
			}

			return cachedValue.data;
		}

		const cacheItem = fn.apply(this, args);

		cache.set(key, {
			args,
			data: cacheItem,
			maxAge: maxAgeConfig.getMaxAge(key)
		});

		if (isPromise(cacheItem) && cachePromiseRejection === false) {
			cacheItem.catch(() => cache.delete(key));
		}

		return cacheItem;
	};

	try {
		// The below call will throw in some host environments
		// See https://github.com/sindresorhus/mimic-fn/issues/10
		mimicFn(memoized, fn);
	} catch (_) {}

	cacheStore.set(memoized, cache);

	return memoized;
};

module.exports = mem;

module.exports.clear = fn => {
	if (!cacheStore.has(fn)) {
		throw new Error('Can\'t clear a function that was not memoized!');
	}

	const cache = cacheStore.get(fn);
	if (typeof cache.clear === 'function') {
		cache.clear();
	}
};
