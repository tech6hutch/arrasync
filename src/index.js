const assert = require('assert');

const symbols = {
	all: Symbol('all'),
	filter: Symbol('filter'),
	includes: Symbol('includes'),
	join: Symbol('join'),
	map: Symbol('map'),
	reduce: Symbol('reduce'),
};


/**
 * This is a Promise, but it has methods that operate on the Array it resolves to.
 */
class ArrayPromise extends Promise {

	// Just so I don't have to type as much lol
	static tryReject(fn) {
		return new ArrayPromise(async (resolve, reject) => {
			try {
				resolve(await fn());
			} catch (e) {
				reject(e);
			}
		});
	}

	// Also has all the instance methods from AsyncArrayMethods below.

}

const AsyncArrayMethods = {

	async [symbols.all]() {
		return Promise.all(await this);
	},

	[symbols.filter](cb, thisArg) {
		return ArrayPromise.tryReject(async () =>
			(await this)[symbols.reduce](async (newArray, element, i, array) => {
				if (await cb.call(thisArg, element, i, array)) newArray.push(element);
				return newArray;
			}, []));
	},

	async [symbols.includes](value) {
		for (const promise of await this) {
			if (await promise === value) return true;
		}
		return false;
	},

	async [symbols.join](separator = ',') {
		return (await this)[symbols.reduce]((joined, element) =>
			`${joined}${separator}${element}`);
	},

	[symbols.map](cb, thisArg) {
		return ArrayPromise.tryReject(async () =>
			(await this).map(async (promise, i, array) =>
				cb.call(thisArg, await promise, i, array)));
	},

	[symbols.reduce](cb, initialValue) {
		return ArrayPromise.tryReject(async () =>
			(await this).reduce(...[
				async (accP, promise, i, array) => cb(await accP, await promise, i, array),
				...[arguments.length > 1 ? initialValue : []],
			]));
	},

};

const installOn = obj => () => {
	for (const sym of Object.values(symbols)) {
		assert(typeof sym === 'symbol');
		obj[sym] = AsyncArrayMethods[sym];
	}
};

installOn(ArrayPromise.prototype)();

module.exports = {
	...symbols,
	install: installOn(Array.prototype),
};
