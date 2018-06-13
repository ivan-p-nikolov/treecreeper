const request = require('../helpers/supertest');
const app = require('../../server/app.js');
const { session: db } = require('../../server/db-connection');

const { checkResponse, setupMocks } = require('./helpers');

describe('v1 - node GET', () => {
	const state = {};

	setupMocks(state);

	it('gets node without relationships', async () => {
		return request(app)
			.get('/v1/node/Team/test-team')
			.auth()
			.expect(200, {
				node: {
					code: 'test-team',
					foo: 'bar1'
				},
				relationships: []
			});
	});

	it('gets node with relationships', async () => {
		// create the relationships
		await db.run(`MATCH (s:Team { code: "test-team" }), (p:Person { code: "test-person" }), (g:Group { code: "test-group" })
									MERGE (g)-[o:HAS_TEAM]->(s)-[t:HAS_TECH_LEAD]->(p)
									RETURN g, o, s, t, p`);

		return request(app)
			.get('/v1/node/Team/test-team')
			.auth()
			.expect(200)
			.then(({ body }) =>
				checkResponse(body, {
					node: {
						code: 'test-team',
						foo: 'bar1'
					},
					relationships: {
						HAS_TECH_LEAD: [
							{
								direction: 'outgoing',
								nodeType: 'Person',
								nodeCode: 'test-person'
							}
						],
						HAS_TEAM: [
							{
								direction: 'incoming',
								nodeType: 'Group',
								nodeCode: 'test-group'
							}
						]
					}
				})
			);
	});

	it('responds with 404 if no node', async () => {
		return request(app)
			.get('/v1/node/Team/not-test-team')
			.auth()
			.expect(404);
	});

	it('responds with 500 if query fails', async () => {
		state.sandbox.stub(db, 'run').throws('oh no');
		return request(app)
			.get('/v1/node/Team/test-team')
			.auth()
			.expect(500);
	});
});
