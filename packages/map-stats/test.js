import test from 'ava';
import StatsMap from './';

test('initial stats', t => {
	const map = new StatsMap();

	t.deepEqual(map.stats, {
		hits: 0,
		misses: 0
	});
});

test('stats', t => {
	const map = new StatsMap();
	map.set('foo', 'bar');

	t.deepEqual(map.get('foo'), 'bar');
	t.deepEqual(map.stats, {
		hits: 1,
		misses: 0
	});
	t.is(map.get('lost'), undefined);

	t.deepEqual(map.stats, {
		hits: 1,
		misses: 1
	});

	map.has('unicorn'); // will incread missed
	map.has('foo'); // but not hits

	map.has('unicorn'); // and one more

	t.deepEqual(map.stats, {
		hits: 1,
		misses: 3
	});
	t.deepEqual(map.detailedStats, {
		read: {
			foo: 1,
			lost: 1
		},
		miss: {
			lost: 1
		},
		write: {
			foo: 1
		},
		check: {
			foo: 1,
			unicorn: 2
		}
	});
});
