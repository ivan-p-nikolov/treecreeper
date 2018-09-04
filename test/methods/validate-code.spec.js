const sinon = require('sinon');
const getType = require('../../methods/get-type');
const { validateCode } = require('../../');

describe('validateCode', () => {
	const sandbox = sinon.createSandbox();
	beforeEach(() => {
		sandbox.stub(getType, 'method').returns({
			name: 'Thing',
			properties: {
				code: {
					type: 'String',
					validator: /^[^z]+$/ //exclude the letter z
				}
			}
		});
	});

	afterEach(() => sandbox.restore());

	it('accept strings', () => {
		expect(() => validateCode('Thing', 'acceptable')).not.to.throw();
	});
	it('not accept booleans', () => {
		expect(() => validateCode('Thing', true)).to.throw(/Must be a string/);
		expect(() => validateCode('Thing', false)).to.throw(/Must be a string/);
	});
	it('not accept floats', () => {
		expect(() => validateCode('Thing', 1.34)).to.throw(/Must be a string/);
	});
	it('not accept integers', () => {
		expect(() => validateCode('Thing', 134)).to.throw(/Must be a string/);
	});
	it('apply string patterns', () => {
		expect(() => validateCode('Thing', 'zo-no')).to.throw(/Must match pattern/);
	});
});
