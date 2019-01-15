const app = require('../../server/app.js');
const API_KEY = process.env.API_KEY;
const { setupMocks, verifyNotExists } = require('../helpers');

describe('v2 - node generic', () => {
	const sandbox = {};
	const namespace = 'node-v2-firewall';
	const teamCode = `${namespace}-team`;
	const teamRestUrl = `/v2/node/Team/${teamCode}`;

	setupMocks(sandbox, { namespace });

	describe('unimplemented', () => {
		describe('PUT', () => {
			it('405 Method Not Allowed', () => {
				return sandbox
					.request(app)
					.put(teamRestUrl)
					.namespacedAuth()
					.expect(405);
			});
		});
	});
	describe('api key auth', () => {
		it('GET no api_key returns 401', async () => {
			return sandbox
				.request(app)
				.get(teamRestUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
		});

		it('POST no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.post(teamRestUrl)
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		it('PATCH no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.patch('/v2/node/Team/a-team')
				.send({ foo: 'bar' })
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		it('DELETE no api_key returns 401', async () => {
			await sandbox
				.request(app)
				.delete(teamRestUrl)
				.set('client-id', 'test-client-id')
				.expect(401);
			verifyNotExists('Team', teamCode);
		});

		describe('client headers', () => {
			it('GET no client-id or client-user-id returns 400', async () => {
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
			});

			it('POST no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.post('/v2/node/Team/new-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('PATCH no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.patch('/v2/node/Team/a-team')
					.send({ foo: 'bar' })
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('DELETE no client-id or client-user-id returns 400', async () => {
				await sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.expect(400);
				verifyNotExists('Team', teamCode);
			});

			it('GET client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('POST client-id but no client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id but no client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-id but no client-user-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.expect(204);
			});

			it('GET client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-user-id but no client-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('PATCH client-user-id but no client-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-user-id but no client-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.expect(204);
			});

			it('GET client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.get(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(200);
			});

			it('POST client-id and client-user-id returns 200', async () => {
				return sandbox
					.request(app)
					.post(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.expect(200);
			});

			it('PATCH client-id and client-user-id returns 200', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', 'test-user-id')
					.set('client-id', 'test-client-id')
					.send({ name: 'name2' })
					.expect(200);
			});

			it('DELETE client-id and client-user-id returns 204', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				return sandbox
					.request(app)
					.delete(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', 'test-client-id')
					.set('client-user-id', 'test-user-id')
					.expect(204);
			});

			it('PATCH no client-id header deletes the _updatedByClient metaProperty from the database', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				const expectedMeta = sandbox.withUpdateMeta({
					name: 'name2',
					code: teamCode
				});
				delete expectedMeta._updatedByClient;
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-user-id', `${namespace}-user`)
					.set('x-request-id', `${namespace}-request`)
					.send({ name: 'name2' })
					.expect(200, expectedMeta);
			});

			it('PATCH no client-user-id header deletes the _updatedByUser metaProperty from the database', async () => {
				await sandbox.createNode('Team', {
					code: `${namespace}-team`,
					name: 'name1'
				});
				const expectedMeta = sandbox.withUpdateMeta({
					name: 'name2',
					code: teamCode
				});
				delete expectedMeta._updatedByUser;
				return sandbox
					.request(app)
					.patch(teamRestUrl)
					.set('API_KEY', API_KEY)
					.set('client-id', `${namespace}-client`)
					.set('x-request-id', `${namespace}-request`)
					.send({ name: 'name2' })
					.expect(200, expectedMeta);
			});
		});
	});

	[['post', true], ['patch', true], ['get', false], ['delete', false]].forEach(
		([method, checkBody]) => {
			describe(`security checks - ${method}`, () => {
				it('should error when node type is suspicious', async () => {
					await sandbox
						.request(app)
						[method](`/v2/node/DROP ALL/${teamCode}`)
						.namespacedAuth()
						.expect(400, /Invalid node type `DROP ALL`/);
				});

				it('should error when node code is suspicious', async () => {
					await sandbox
						.request(app)
						[method]('/v2/node/Team/DROP ALL')
						.namespacedAuth()
						.expect(
							400,
							/Invalid value `DROP ALL` for property `code` on type `Team`/
						);
				});

				it('should error when client id is suspicious', async () => {
					await sandbox
						.request(app)
						[method](teamRestUrl)
						.set('API_KEY', API_KEY)
						.set('client-id', 'DROP ALL')
						.expect(400, /Invalid client id `DROP ALL`/);
				});

				it('should error when client user id is suspicious', async () => {
					await sandbox
						.request(app)
						[method](teamRestUrl)
						.set('API_KEY', API_KEY)
						.set('client-user-id', 'DROP ALL')
						.expect(400, /Invalid client user id `DROP ALL`/);
				});

				it('should error when request id is suspicious', async () => {
					await sandbox
						.request(app)
						[method](teamRestUrl)
						.set('API_KEY', API_KEY)
						.set('client-id', 'valid-id')
						.set('x-request-id', 'DROP ALL')
						.expect(400, /Invalid request id `DROP ALL`/);
				});

				if (checkBody) {
					describe('values in body', () => {
						it('should save injected cypher statements in attributes as strings', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									prop: 'MATCH (n) DELETE n'
								})
								.expect(({ status }) => /20(0|1)/.test(String(status)));
							verifyNotExists('Team', teamCode);
						});

						it('should error when attribute name is suspicious', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									'MATCH (n) DELETE n': 'value'
								})
								.expect(400);
						});

						it.skip('TODO: write a test that is a better test of cypher injection', () => {});

						it('should error when relationship node code is suspicious', async () => {
							await sandbox
								.request(app)
								[method](teamRestUrl)
								.namespacedAuth()
								.send({
									supports: ['DROP ALL']
								})
								.expect(
									400,
									/Invalid value `DROP ALL` for property `code` on type `System`/
								);
						});
					});
				}
			});
		}
	);
});
