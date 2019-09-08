import pDefer from 'p-defer';

interface Entry {
	[key: string]: any;
}

interface MaxAgeEntry extends Entry {
	maxAge: number;
}

interface DeferredPromise<T = any, E = any> {
	promise: Promise<T>;
	resolve(value?: T): void;
	reject(error?: E): void;
}

/**
 * Automatically cleanup the items in the provided `map`. The property of the expiration timestamp should be named `maxAge`.
 *
 * @param map - Map instance which should be cleaned up.
 */
export default function mapAgeCleaner<K = any, V extends MaxAgeEntry = MaxAgeEntry>(map: Map<K, V>);

/**
 * Automatically cleanup the items in the provided `map`.
 *
 * @param map - Map instance which should be cleaned up.
 * @param property - Name of the property which olds the expiry timestamp.
 */
export default function mapAgeCleaner<K = any, V = Entry>(map: Map<K, V>, property: string);

export default function mapAgeCleaner<K = any, V = Entry>(map: Map<K, V>, property = 'maxAge') {
	const timerMap = new Map();

	const setupTimer = async (item: [K, V]) => {
		if (!timerMap.has(item[0])) {
			timerMap.set(item[0], {processingTimer: null, processingDeferred: null});
		}
		const timeItem = timerMap.get(item[0]);
		if (timeItem.processingTimer) {
			clearTimeout(timeItem.processingTimer);
		}

		const itemProcessingDeferred = pDefer() as DeferredPromise;
		timeItem.processingDeferred = itemProcessingDeferred;

		const delay = (item[1] as any)[property] - Date.now();
		if (delay <= 0) {
			// Remove the item immediately if the delay is equal to or below 0
			map.delete(item[0]);
			itemProcessingDeferred.resolve();

			return;
		}

		const itemProcessingTimer = setTimeout(() => {
			// Remove the item when the timeout fires
			map.delete(item[0]);
			if (itemProcessingDeferred) {
				itemProcessingDeferred.resolve();
			}

			timerMap.delete(item[0]);
		}, delay);
		timeItem.processingTimer = itemProcessingTimer;

		// tslint:disable-next-line:strict-type-predicates
		if (typeof itemProcessingTimer.unref === 'function') { // isnt it always true?
			// Don't hold up the process from exiting
			itemProcessingTimer.unref();
		}

		return itemProcessingDeferred.promise;
	};

	const originalSet = map.set.bind(map);
	const originalClear = map.clear.bind(map);

	map.set = (key: K, value: V) => {
		if (map.has(key)) {
			// If the key already exist, remove it so we can add it back at the end of the map.
			map.delete(key);
		}

		// Call the original `map.set`
		const result = originalSet(key, value);

		setupTimer([key, value]); // tslint:disable-line:no-floating-promises
		return result;
	};
	map.clear = () => {
		for(const timerItem of timerMap.values()) {
			if (timerItem.processingTimer) clearTimeout(timerItem.processingTimer);
			if (timerItem.processingDeferred) timerItem.processingDeferred.resolve();
		}
		timerMap.clear();
		return originalClear();
	}
	for (const entry of map) {
		setupTimer(entry).catch(() => {});
	}

	return map;
}

// Add support for CJS
module.exports = mapAgeCleaner;
module.exports.default = mapAgeCleaner;
