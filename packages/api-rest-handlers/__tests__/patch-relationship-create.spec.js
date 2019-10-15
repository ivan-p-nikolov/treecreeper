const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { patchHandler } = require('../patch');

const { setupMocks, neo4jTest } = require('../../../test-helpers');
const { securityTests } = require('../../../test-helpers/security');
const {
	dbUnavailable,
	asyncErrorFunction,
} = require('../../../test-helpers/error-stubs');

describe('rest PATCH relationship create', () => {
	const namespace = 'api-rest-handlers-patch-relationships';
	const mainCode = `${namespace}-main`;

	const { createNodes, createNode, meta, getMetaPayload } = setupMocks(
		namespace,
	);

	securityTests(patchHandler(), mainCode);

	const getInput = (body, query, metadata) => ({
		type: 'MainType',
		code: mainCode,
		body,
		query,
		metadata,
	});

	const getS3PatchMock = body =>
		jest.fn(async () => ({
			versionId: 'fake-id',
			newBodyDocs: body,
		}));

	const basicHandler = (...args) => patchHandler()(getInput(...args));

	const createMainNode = (props = {}) =>
		createNode('MainType', Object.assign({ code: mainCode }, props));

	it('errors if updating relationships without relationshipAction query string', async () => {});
	describe('__-to-one relationships', () => {
		it('accept a string', async () => {});
		it('accept an array of length one', async () => {});
		it('error if trying to write multiple relationships', async () => {});
		it('replace existing relationship', async () => {});
	});
	describe('merge', () => {
		it('can merge with empty relationship set if relationshipAction=merge', async () => {});
		it('can merge with relationships if relationshipAction=merge', async () => {});
	});
	describe('replace', () => {
		it('can replace an empty relationship set if relationshipAction=replace', async () => {});
		it('can replace relationships if relationshipAction=replace', async () => {});
		it('leaves relationships in other direction and of other types untouched when replacing', async () => {});
		it('replaces relationships in multiple directions', async () => {});
	});
	describe('upsert', () => {
		it('create node related to non-existent nodes when using upsert=true', async () => {});
		it('not leave creation artifacts on things that already existed when using `upsert=true`', async () => {});
	});
	describe('diffing before writes', () => {
		it('writes if property but no relationship changes detected', async () => {});
		it('writes if relationship but no property changes detected', async () => {});
		it('detects deleted property as a change', async () => {});
	});
	describe('patching with fewer relationships', () => {
		it('treats fewer relationships as a delete when replacing relationships', async () => {});
		it('treats fewer relationships as no change when merging relationships', async () => {});
	});
});
