'use strict';
const mimicFn = require('mimic-fn');
const isPromise = require('p-is-promise');
const mapAgeCleaner = require('map-age-cleaner');

const cacheStore = new WeakMap();

const defaultCacheKey = (...arguments_) => {
	if (arguments_.length === 0) {
		return '__defaultKey';
	}

	if (arguments_.length === 1) {
		const [firstArgument] = arguments_;
		const isObject = typeof firstArgument === 'object' && firstArgument !== null;
		const isPrimitive = !isObject;
		if (isPrimitive) {
			return firstArgument;
		}
	}

	return JSON.stringify(arguments_);
};

const getMaxAgeConfiguration = maxAge => {
	if (!['number', 'function', 'object'].includes(typeof maxAge)) {
		return {activated: false, getMaxAge: () => Infinity, extendMaxAge: false};
	}

	if (typeof maxAge === 'number') {
		return {activated: true, getMaxAge: () => Date.now() + maxAge, extendMaxAge: false};
	}

	if (typeof maxAge === 'function') {
		return {activated: true, getMaxAge: maxAge};
	}

	if (maxAge.ttl || maxAge.getExpirationDate) {
		const extendMaxAgeOnAccess = (typeof maxAge.extendOnAccess === 'number') && ((_, currentMaxAge) => currentMaxAge + maxAge.extendOnAccess);
		const getNewMaxAgeOnAccess = (typeof maxAge.setOnAccess === 'function') && maxAge.setOnAccess;

		return {
			activated: true,
			getMaxAge: maxAge.ttl ? () => Date.now() + maxAge.ttl : maxAge.getExpirationDate,
			getMaxAgeExtension: extendMaxAgeOnAccess || getNewMaxAgeOnAccess
		};
	}

	throw new Error('Invalid max age config (was given an object with a maxAge key)');
};

const mem = (fn, {
	cacheKey = defaultCacheKey,
	cache = new Map(),
	cachePromiseRejection = true,
	maxAge
} = {}) => {
	const maxAgeConfig = getMaxAgeConfiguration(maxAge);
	console.log(maxAgeConfig)
	if (maxAgeConfig.activated) {
		mapAgeCleaner(cache);
	}

	const memoized = function (...arguments_) {
		const key = cacheKey(...arguments_);

		if (cache.has(key)) {
			const cachedValue = cache.get(key);
			if (maxAgeConfig.getMaxAgeExtension) {
				// TODO: throttle the update
				const newMaxAge = maxAgeConfig.getMaxAgeExtension(key, cachedValue.maxAge);
				cache.set(key, {maxAge: newMaxAge, data: cachedValue.data});
			}

			return cachedValue.data;
		}

		const cacheItem = fn.apply(this, arguments_);

		cache.set(key, {
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
