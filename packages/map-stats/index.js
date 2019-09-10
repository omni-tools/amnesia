'use strict';

const increment = (object, key) => {
	object[key] = (object[key] || 0) + 1;
}

class StatsMap extends Map {

	constructor(iterable) {
		super(iterable);

		this._stats = {
			hits: 0,
			misses: 0
		};
		this._detailedStats = { // ByKey
			read: {},
			write: {},
			miss: {},
			check: {}
		};
	};

	get stats() {
		return this._stats;
	}

	get detailedStats() {
		return this._detailedStats
	}

	set(key, value) {
		increment(this._detailedStats.write, key);
		return super.set(key, value);
	}

	get(key) {
		increment(this._detailedStats.read, key);
		if (super.has(key)) {
			this._stats.hits++;
		} else {
			increment(this._detailedStats.miss, key);
			this._stats.misses++;
		}
		return super.get(key);
	}

	has(key) {
		const has = super.has(key);
		increment(this._detailedStats.check, key);
		if (!has) {
			this._stats.misses++;
		}
		return has;
	}
}

module.exports = StatsMap;
