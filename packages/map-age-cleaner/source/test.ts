/* tslint:disable:await-promise */
import anyTest, {TestInterface} from 'ava';

import delay from 'delay';
import mapAgeCleaner from '.';

interface Item {
	maxAge: number;
	data: any;
}
interface Context {
	map: Map<string, Item>;
}
const test = anyTest as TestInterface<Context>;

test.beforeEach(t => {
	t.context.map = new Map();
});

test('auto removal on initial Map', async t => {
	const map = new Map([
		['unicorn', {maxAge: Date.now() + 1000, data: '🦄'}]
	]);
	mapAgeCleaner(map);

	t.true(map.has('unicorn'));

	await delay(400);

	t.true(map.has('unicorn'));

	await delay(600);

	t.false(map.has('unicorn'));
});

test('auto removal', async t => {
	const {map} = t.context;
	mapAgeCleaner(map);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄'});

	t.true(map.has('unicorn'));

	await delay(400);

	t.true(map.has('unicorn'));

	await delay(600);

	t.false(map.has('unicorn'));
});

test('return map instance', async t => {
	const map = mapAgeCleaner(new Map([
		['unicorn', {maxAge: Date.now() + 1000, data: '🦄'}]
	]));

	t.true(map.has('unicorn'));

	await delay(1005);

	t.false(map.has('unicorn'));
});

test('use other property name', async t => {
	const map = new Map([
		['unicorn', {timestamp: Date.now() + 1000, data: '🦄'}]
	]);

	mapAgeCleaner(map, {property: 'timestamp'});

	t.true(map.has('unicorn'));

	await delay(1005);

	t.false(map.has('unicorn'));
});

test('order on reset', async t => {
	const {map} = t.context;
	mapAgeCleaner(map);

	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄'});

	await delay(400);
	map.set('rainbow', {maxAge: Date.now() + 1000, data: '🌈'});
	await delay(100);
	map.set('hooray', {maxAge: Date.now() + 1000, data: '🎉'});

	await delay(300);

	map.set('rainbow', {maxAge: Date.now() + 1000, data: '🌈🦄'});

	await delay(205);

	t.false(map.has('unicorn'));
	t.true(map.has('rainbow'));
	t.true(map.has('hooray'));
	t.is(map.size, 2);

	await delay(505);

	t.false(map.has('unicorn'));
	t.true(map.has('rainbow'));
	t.false(map.has('hooray'));
	t.is(map.size, 1);

	await delay(305);

	t.false(map.has('unicorn'));
	t.false(map.has('rainbow'));
	t.false(map.has('hooray'));
	t.is(map.size, 0);
});

test('reset currently processed item', async t => {
	const {map} = t.context;
	mapAgeCleaner(map);

	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄'});
	await delay(200);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄🦄'});
	await delay(200);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄🦄🦄'});
	await delay(400);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄🦄🦄🦄'});
	await delay(300);

	t.true(map.has('unicorn'));
});

test('reset currently processed item and process next', async t => {
	const {map} = t.context;
	mapAgeCleaner(map);

	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄'});
	await delay(500);
	map.set('rainbow', {maxAge: Date.now() + 1000, data: '🌈'});

	await delay(200);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄🦄'});
	await delay(200);
	map.set('unicorn', {maxAge: Date.now() + 1000, data: '🦄🦄'});
	await delay(400);

	t.true(map.has('unicorn'));
	t.true(map.has('rainbow'));
	t.is(map.size, 2);

	await delay(205);

	t.true(map.has('unicorn'));
	t.false(map.has('rainbow'));
	t.is(map.size, 1);

	await delay(405);

	t.false(map.has('unicorn'));
	t.false(map.has('rainbow'));
	t.is(map.size, 0);
});

test('cleanup items which have same expiration timestamp', async t => {
	const map = new Map([
		['unicorn', {maxAge: Date.now() + 1000, data: '🦄'}],
		['rainbow', {maxAge: Date.now() + 1000, data: '🌈'}]
	]);
	mapAgeCleaner(map);

	t.is(map.size, 2);

	await delay(1005);

	t.is(map.size, 0);
});

test('clean the map before expiration', async t => {
	const map = new Map([
		['unicorn', {maxAge: Date.now() + 1000, data: '🦄'}],
		['rainbow', {maxAge: Date.now() + 1000, data: '🌈'}]
	]);
	mapAgeCleaner(map);

	map.clear();
	t.is(map.size, 0);
});

test('Insert of an outdated item', async t => {
	const map = new Map();
	mapAgeCleaner(map);
	map.set('old-unicorn', {maxAge: Date.now() - 1234, data: '🦄'});

	t.is(map.size, 0);
});

test('Expiration trigger onExpire handler', async t => {
	const expiredKeys: string[] = [];
	const expiredValues: any[] = [];
	const map = new Map([
		['unicorn', {maxAge: Date.now() + 1234, data: '🦄'}],
		['rainbow', {maxAge: Date.now() + 1000, data: '🌈'}]
	]);
	const onExpire = (key: string, value: Item): void => {
		expiredKeys.push(key);
		expiredValues.push(value.data);
	};
	mapAgeCleaner(map, {onExpire});

	t.is(map.size, 2);

	await delay(1400);

	t.is(map.size, 0);
	t.is(expiredKeys.length, 2);
	t.is(expiredValues.length, 2);
	t.deepEqual(expiredKeys, ['rainbow', 'unicorn']);
	t.deepEqual(expiredValues, ['🌈', '🦄']);
});

test('Expiration trigger onExpire handler and resist to crash', async t => {
	const map = new Map([
		['unicorn', {maxAge: Date.now() + 123, data: '🦄'}],
		['rainbow', {maxAge: Date.now() + 100, data: '🌈'}]
	]);
	let onExpireCallCount = 0;
	const onExpire = (key: string, value: Item): void => {
		onExpireCallCount++;
		throw new Error(`${key} error with some ${value}`);
	};
	mapAgeCleaner(map, {onExpire});

	t.is(map.size, 2);

	await delay(400);

	t.is(map.size, 0);
	t.is(onExpireCallCount, 2);
});
