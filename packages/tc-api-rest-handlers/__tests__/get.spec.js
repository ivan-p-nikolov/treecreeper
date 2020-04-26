const { setupMocks } = require('../../../test-helpers');
const { dbUnavailable } = require('../../../test-helpers/error-stubs');
const { getHandler } = require('../get');

describe('rest GET', () => {
	const namespace = 'api-rest-handlers-get';
	const mainCode = `${namespace}-main`;
	const input = {
		type: 'MainType',
		code: mainCode,
	};

	const { createNodes, createNode, connectNodes, meta } = setupMocks(
		namespace,
	);

	const createMainNode = (props = {}) =>
		createNode('MainType', { code: mainCode, ...props });

	it('gets record without relationships', async () => {
		await createMainNode({
			someString: 'name1',
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({ code: mainCode, someString: 'name1' });
	});

	it('retrieves metadata', async () => {
		await createMainNode();
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject(meta.default);
	});

	it('retrieves array data', async () => {
		await createMainNode({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
		const { body, status } = await getHandler()(input);

		expect(status).toBe(200);
		expect(body).toMatchObject({
			// someStringList: ['one', 'two'],
			someMultipleChoice: ['First', 'Second'],
		});
	});

	it('gets record with relationships', async () => {
		const [main, child, parent] = await createNodes(
			['MainType', mainCode],
			['ChildType', `${namespace}-child`],
			['ParentType', `${namespace}-parent`],
		);
		await connectNodes(
			// tests incoming and outgoing relationships
			[main, 'HAS_CHILD', child],
			[parent, 'IS_PARENT_OF', main],
		);

		const { body, status } = await getHandler()(input);
		expect(status).toBe(200);
		expect(body).toMatchObject({
			code: mainCode,
			parents: [`${namespace}-parent`],
			children: [`${namespace}-child`],
		});
	});

	it('throws 404 error if no record', async () => {
		await expect(getHandler()(input)).rejects.httpError({
			status: 404,
			message: `MainType with code "${mainCode}" does not exist`,
		});
	});

	it('throws if neo4j query fails', async () => {
		dbUnavailable();
		await expect(getHandler()(input)).rejects.toThrow('oh no');
	});

	describe('using alternative id', () => {
		it('gets by alternative id field', async () => {
			await createMainNode({
				someString: 'example-value-get',
			});
			const { body, status } = await getHandler()({
				type: 'MainType',
				code: 'example-value-get',
				query: {
					idField: 'someString',
				},
			});

			expect(status).toBe(200);
			expect(body).toMatchObject({
				code: mainCode,
				someString: 'example-value-get',
			});
		});

		it('throws 404 error if no record with alternative id', async () => {
			await expect(
				getHandler()({
					type: 'MainType',
					code: 'example-value-get',
					query: {
						idField: 'someString',
					},
				}),
			).rejects.httpError({
				status: 404,
				message: `MainType with someString "example-value-get" does not exist`,
			});
		});

		it('throws 409 error if multiple records with alternative id exist', async () => {
			await createNodes(
				[
					'MainType',
					{ code: `${mainCode}-1`, someString: 'example-value-get' },
				],
				[
					'MainType',
					{ code: `${mainCode}-2`, someString: 'example-value-get' },
				],
			);
			await expect(
				getHandler()({
					type: 'MainType',
					code: 'example-value-get',
					query: {
						idField: 'someString',
					},
				}),
			).rejects.httpError({
				status: 409,
				message: `Multiple MainType records with someString "example-value-get" exist`,
			});
		});

		it('throws 400 error if alternative id is not a valid property name', async () => {
			await expect(
				getHandler()({
					type: 'MainType',
					code: 'example-value-get',
					query: {
						idField: 'somethingElse',
					},
				}),
			).rejects.httpError({
				status: 400,
				message: `somethingElse is not a property of MainType and cannot be used to specify a record`,
			});
		});

		it('throws 400 error if alternative id is not indexed', async () => {
			await expect(
				getHandler()({
					type: 'MainType',
					code: 'example-value-get',
					query: {
						idField: 'someEnum',
					},
				}),
			).rejects.httpError({
				status: 400,
				message: `someEnum property of MainType is not indexed and cannot be used to specify a record`,
			});
		});
	});

	describe('rich relationship information', () => {
		it('gets record with rich relationship information if richRelationships query is true', async () => {
			const [main, childOne, childTwo, parent] = await createNodes(
				['MainType', mainCode],
				['ChildType', `${namespace}-child-1`],
				['ChildType', `${namespace}-child-2`],
				['ParentType', `${namespace}-parent`],
			);
			await connectNodes(
				[main, 'HAS_CHILD', childOne],
				[main, 'HAS_CHILD', childTwo],
				[parent, 'IS_PARENT_OF', main],
			);

			const { body, status } = await getHandler()({
				query: { richRelationships: true },
				...input,
			});

			expect(status).toBe(200);
			[...body.children, ...body.parents].forEach(relationship =>
				expect(relationship).toHaveProperty(
					'code',
					'_updatedByClient',
					'_updatedByRequest',
					'_updatedTimestamp',
					'_updatedByUser',
					'_createdByClient',
					'_createdByRequest',
					'_createdTimestamp',
					'_createdByUser',
				),
			);
		});
	});
});
