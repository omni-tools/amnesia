import {expectType, expectError} from 'tsd';
import mem = require('.');

const fn = (string: string) => true;

expectType<(string: string) => boolean>(mem(fn));
expectType<(string: string) => boolean>(mem(fn, {maxAge: 1}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: () => 42}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: {ttl: 2}}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: {setOnAccess: () => 2, expirationDate: () => 4}}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: {setOnAccess: () => 2, expirationDate: () => 4, extensionThrottle: true}}));
// expectError<(string: string) => boolean>(mem(fn, {maxAge: {expirationDate: () => 4, extensionThrottle: true, setOnAccess: () => 12}})); // for some reason does not trigger
expectError<(string: string) => boolean>(mem(fn, {maxAge: {}}));
expectError<(string: string) => boolean>(mem(fn, {maxAge: {extensionThrottle: true}}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: {extendOnAccess: 2, ttl: 4}}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: {extendOnAccess: 2, ttl: 4, extensionThrottle: 1}}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: () => 42}));
expectType<(string: string) => boolean>(mem(fn, {maxAge: () => 42}));
expectType<(string: string) => boolean>(mem(fn, {cacheKey: (...arguments_) => arguments_}));
expectType<(string: string) => boolean>(
	mem(
		fn,
		{cacheKey: (...arguments_) => arguments_,
		cache: new Map<[string], {data: boolean; maxAge: number}>()})
);
expectType<(string: string) => boolean>(
	mem(fn, {cache: new Map<[string], {data: boolean; maxAge: number}>()})
);
expectType<(string: string) => boolean>(mem(fn, {cachePromiseRejection: false}));
expectType<(string: string) => boolean>(mem(fn, {onExpire: ({key, args, value}) => console.log({key, args, value})}));
expectError<(string: string) => boolean>(mem(fn, {onExpire: (any: number, extra: string) => console.log('expired')}));
expectType<(string: string) => boolean>(mem(fn, {cachePromiseRejection: false}));

mem.clear(fn);
