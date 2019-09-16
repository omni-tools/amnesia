declare namespace mem {
	interface CacheStorage<KeyType, ValueType> {
		has(key: KeyType): boolean;
		get(key: KeyType): ValueType | undefined;
		set(key: KeyType, value: ValueType): void;
		delete(key: KeyType): void;
		clear?: () => void;
	}

 	type SimpleMaxAgeOption = ({
		readonly ttl: number;
	} | {
		readonly expirationDate: (key: string) => number;
	});

	type MaxAgeOption = SimpleMaxAgeOption | (SimpleMaxAgeOption & ({
		readonly setOnAccess: (key: string, currentMaxAge: number) => number;
		readonly extensionThrottle?: number | boolean;
	} | {
		readonly extendOnAccess: number;
		readonly extensionThrottle?: number | boolean;
	}));

	interface Options<
		ArgumentsType extends unknown[],
		CacheKeyType,
		ReturnType
	> {
		/**
		Milliseconds until the cache expires.
		(some some more complex option)

		@default Infinity
		*/
		readonly maxAge?: number | ((key: string) => number) | MaxAgeOption;

		/**
		Determines the cache key for storing the result based on the function arguments. By default, if there's only one argument and it's a [primitive](https://developer.mozilla.org/en-US/docs/Glossary/Primitive), it's used directly as a key (if it's a `function`, its reference will be used as key), otherwise it's all the function arguments JSON stringified as an array.

		You could for example change it to only cache on the first argument `x => JSON.stringify(x)`.
		*/
		readonly cacheKey?: (...arguments: ArgumentsType) => CacheKeyType;

		/**
		Use a different cache storage. You could for example use a `WeakMap` instead or [`quick-lru`](https://github.com/sindresorhus/quick-lru) for a LRU cache.

		@default new Map()
		*/
		readonly cache?: CacheStorage<CacheKeyType, {data: ReturnType; maxAge: number}>;

		/**
		Cache rejected promises.

		@default true
		*/
		readonly cachePromiseRejection?: boolean;

		/**
		Handler to manage item at expiration
		@default noop
		 */
		readonly onExpire?: (item: {key: CacheKeyType, args: ArgumentsType, value: ReturnType}) => void
	}
}

declare const mem: {
	/**
	[Memoize](https://en.wikipedia.org/wiki/Memoization) functions - An optimization used to speed up consecutive function calls by caching the result of calls with identical input.

	@param fn - Function to be memoized.

	@example
	```
	import mem = require('mem');

	let i = 0;
	const counter = () => ++i;
	const memoized = mem(counter);

	memoized('foo');
	//=> 1

	// Cached as it's the same arguments
	memoized('foo');
	//=> 1

	// Not cached anymore as the arguments changed
	memoized('bar');
	//=> 2

	memoized('bar');
	//=> 2
	```
	*/
	<
		ArgumentsType extends unknown[],
		ReturnType,
		CacheKeyType
	>(
		fn: (...arguments: ArgumentsType) => ReturnType,
		options?: mem.Options<ArgumentsType, CacheKeyType, ReturnType>
	): (...arguments: ArgumentsType) => ReturnType;

	/**
	Clear all cached data of a memoized function.

	@param fn - Memoized function.
	*/
	clear<ArgumentsType extends unknown[], ReturnType>(
		fn: (...arguments: ArgumentsType) => ReturnType
	): void;
};

export = mem;
