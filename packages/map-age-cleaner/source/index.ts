import pDefer from 'p-defer';
import Debug from 'debug';

const debug = Debug('omni-tools:map-age-cleaner');

interface Entry {
	[key: string]: any;
}

interface MaxAgeOptions<K, V> {
	property?: string;
	onExpire?(key: K, value?: V): void;
}

interface DeferredPromise<T = any, E = any> {
	promise: Promise<T>;
	resolve(value?: T): void;
	reject(error?: E): void;
}

interface TimerItem<T = any> {
	processingTimer?: NodeJS.Timer;
	processingDeferred?: DeferredPromise<T>;
}

/**
 * Automatically cleanup the items in the provided `map`.
 *
 * @param map - Map instance which should be cleaned up.
 * @param options - Options for the mapAgeCleaner
 * @param options.property - Name of the property which olds the expiry timestamp. §!! FIXME EXPIRE
 * @param options.onExpire - Callback to handle/be notified of the expiration of item
 */
export default function mapAgeCleaner<K, V = Entry>(map: Map<K, V>, options?: MaxAgeOptions<K, V>): Map<K, V> {
	const timerMap = new Map<K, TimerItem>();
	const safeOptions = options || {};
	const {property = 'maxAge', onExpire} = safeOptions;

	const setupTimer = async ([key, value]: [K, V]): Promise<any> => {
		const maxAge = value[property] as number;
		debug(`setting up timer for item ${key} scheduled at ${maxAge}`);
		if (!timerMap.has(key)) {
			timerMap.set(key, {processingTimer: undefined, processingDeferred: undefined});
		}
		const timeItem = timerMap.get(key) || {};
		if (timeItem.processingTimer) {
			debug(`existing timer on ${key} expiring it first`);
			clearTimeout(timeItem.processingTimer);
		}

		const itemProcessingDeferred = pDefer() as DeferredPromise;
		timeItem.processingDeferred = itemProcessingDeferred;

		const delay = maxAge - Date.now();
		if (delay <= 0) {
			// Remove the item immediately if the delay is equal to or below 0
			map.delete(key);
			itemProcessingDeferred.resolve();

			return;
		}

		// tslint:disable-next-line: no-shadowed-variable
		const expireItem = (key: K): void => {
			debug(`expire the following key ${key}`);
			if (onExpire) {
				try {
					onExpire(key, map.get(key));
				} catch (err) {
					// tslint:disable-next-line: no-unsafe-any
					debug(`issue occured while expiring item associated with key ${key}: ${err.message}`);
				}
			}
			// Remove the item when the timeout fires
			map.delete(key);
			if (itemProcessingDeferred) {
				itemProcessingDeferred.resolve();
			}

			timerMap.delete(key);
		};
		const itemProcessingTimer = setTimeout(expireItem, delay, key);
		timeItem.processingTimer = itemProcessingTimer;

		// tslint:disable-next-line:strict-type-predicates
		if (typeof itemProcessingTimer.unref === 'function') { // Isnt it always true?
			// Don't hold up the process from exiting
			itemProcessingTimer.unref();
		}

		return itemProcessingDeferred.promise;
	};

	const originalSet = map.set.bind(map);
	const originalClear = map.clear.bind(map);

	map.set = (key: K, value: V): Map<K, V> => {
		const result = originalSet(key, value);
		setupTimer([key, value]).catch((err: Error) => {
			debug(`some error occured while setting timer on key ${key}: ${err.message}`);
		});
		return result;
	};

	// tslint:disable-next-line: typedef
	map.clear = () => {
		for (const [key, timerItem] of timerMap.entries()) {
			debug(`clearing timer attached to key ${key}`);
			if (timerItem.processingTimer) {
				clearTimeout(timerItem.processingTimer);
			}
			if (timerItem.processingDeferred) {
				timerItem.processingDeferred.resolve();
			}
		}
		timerMap.clear();
		originalClear();
	};

	for (const [key, value] of map) {
		debug(`initial set up of timer on key ${key}`);
		setupTimer([key, value]).catch((err: Error) => {
			debug(`some error occured while setting timer on key ${key}: ${err.message}`);
		});
	}

	return map;
}

// Add support for CJS
module.exports = mapAgeCleaner;
// tslint:disable-next-line: no-unsafe-any
module.exports.default = mapAgeCleaner;
