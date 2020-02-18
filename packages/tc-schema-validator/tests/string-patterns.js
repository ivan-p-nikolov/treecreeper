/* global it, describe, expect */
const { SDK } = require('@financial-times/tc-schema-sdk');
const readYaml = require('@financial-times/tc-schema-sdk/lib/read-yaml');

const stringPatterns = new SDK({ readYaml }).rawData.getStringPatterns();

const longString = 'x'.repeat(257);

describe('string patterns', () => {
	Object.entries(stringPatterns).forEach(([name, pattern]) => {
		if (typeof pattern === 'string') {
			it(`${name} evaluates to valid flagless regex`, () => {
				expect(() => new RegExp(pattern)).not.toThrow();
			});
			it(`${name} blocks very long strings`, () => {
				const regex = new RegExp(pattern);
				expect(regex.test(longString)).toEqual(false);
			});
		} else {
			it(`${name} evaluates to valid flagged regex`, () => {
				expect(
					() => new RegExp(pattern.pattern, pattern.flags),
				).not.toThrow();
			});
		}
	});
});
