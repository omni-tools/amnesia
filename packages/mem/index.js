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

const mem = (fn, {
	cacheKey = defaultCacheKey,
	cache = new Map(),
	cachePromiseRejection = true,
	maxAge,
	updateMaxAgeOnAccess
} = {}) => {
	if (typeof maxAge === 'number' || typeof maxAge === 'function') {
		mapAgeCleaner(cache);
	}

	const getExpirationDate = typeof maxAge === 'function' ?
		maxAge :
		() => typeof maxAge === 'number' ? Date.now() + maxAge : Infinity;
	const getMaxAgeExtension = typeof updateMaxAgeOnAccess === 'number' ?
		(_, currentMaxAge) => ({maxAge: currentMaxAge + updateMaxAgeOnAccess}) :
		(key, currentMaxAge) => updateMaxAgeOnAccess(key, currentMaxAge);

	const memoized = function (...arguments_) {
		const key = cacheKey(...arguments_);

		if (cache.has(key)) {
			const cachedValue = cache.get(key);
			if (updateMaxAgeOnAccess) {
				// TODO: throttle the update
				const increment = getMaxAgeExtension(key, cachedValue.maxAge);
				const newMaxAge = increment.maxAge || cachedValue.maxAge + increment.maxAgeIncrement;
				cache.set(key, {maxAge: newMaxAge, data: cachedValue.data});
			}

			return cachedValue.data;
		}

		const cacheItem = fn.apply(this, arguments_);

		cache.set(key, {
			data: cacheItem,
			maxAge: getExpirationDate(key)
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
