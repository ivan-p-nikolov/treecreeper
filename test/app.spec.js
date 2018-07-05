const app = require('../server/app.js');
const request = require('./helpers/supertest');

describe('generic app settings', () => {
	it('GET gtg - status code 200', async () => {
		return request(app)
			.get('/__gtg')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(200);
	});

	it('GET undefined route - status code 404', async () => {
		return request(app)
			.get('/irrelevant-albatross')
			.set('API_KEY', `${process.env.API_KEY}`)
			.expect(404, {
				errors: [
					{
						message: 'Not Found'
					}
				]
			});
	});

	it('GET v1 can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.get('/v1/node/System/test-system')
			.set('client-id', 'arbitrary-client')
			.set('API_KEY', process.env.API_KEY)
			.expect(503);

		delete process.env.DISABLE_READS;
	});

	it('POST graphql can be disabled', async () => {
		process.env.DISABLE_READS = 'true';
		await request(app)
			.post('/graphql')
			.send({
				query: `{
					Systems {
						code
					}
				}`
			})
			.set('client-id', 'arbitrary-client')
			.set('API_KEY', process.env.API_KEY)
			.expect(503);

		delete process.env.DISABLE_READS;
	});
});
