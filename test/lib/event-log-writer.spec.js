const EventLogWriter = require('../../server/lib/event-log-writer');

describe('Event log writer', () => {
	const defaultEvent = {
		action: 'CREATE',
		code: 'biz-ops-tests',
		type: 'ATestType'
	};
	let stubKinesis;
	let eventLogWriter;

	beforeEach(() => {
		stubKinesis = {
			putRecord: jest.fn()
		};

		eventLogWriter = new EventLogWriter(stubKinesis);
	});

	afterEach(() => {});

	it('should do a single putRecord Kinesis API call per record', async () => {
		await eventLogWriter.sendEvent(defaultEvent);

		expect(stubKinesis.putRecord).toHaveBeenCalledTimes(1);
		expect(stubKinesis.putRecord.mock.calls[0]).toHaveLength(1);
	});

	it('should add legacy attributes to a given node for backwards compatibility with CMDB', async () => {
		const givenType = 'SAlad';
		const givenCode = 'LEttuce';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				type: givenType,
				code: givenCode
			})
		);

		const call = stubKinesis.putRecord.mock.calls[0][0];
		expect(call).toHaveProperty(
			'key',
			`${givenType.toLowerCase()}/${givenCode}`
		);
		expect(call).toHaveProperty('model', 'DataItem');
		expect(call).toHaveProperty('name', 'dataItemID');
		expect(call).toHaveProperty('value', givenCode);
	});

	it('should add the event', async () => {
		const givenValue = 'updated_thing';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				event: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].event).toBe(givenValue);
	});

	it('should add the action', async () => {
		const givenValue = EventLogWriter.actions.UPDATE;
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				action: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].action).toBe(givenValue);
	});

	it('should add the code', async () => {
		const givenValue = 'dummySystemCode';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				code: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].code).toBe(givenValue);
	});

	it('should add the type', async () => {
		const givenValue = 'RepositorY';
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				type: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].type).toBe('RepositorY');
	});

	it('should add any nested relationship attributes provided', async () => {
		const givenValue = {
			from: 'someThing',
			direction: 'to'
		};
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, {
				relationship: givenValue
			})
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].relationship).toBe(
			givenValue
		);
	});

	it('should add a URL encoded link to the API resource', async () => {
		const givenAttributes = {
			type: 'kebab&',
			code: 'frehs:donner+'
		};
		await eventLogWriter.sendEvent(
			Object.assign({}, defaultEvent, givenAttributes)
		);

		expect(stubKinesis.putRecord.mock.calls[0][0].link).toBe(
			'/api/kebab%26/frehs%3Adonner%2B'
		);
	});

	new Array(2).fill(1).forEach(() => {
		const time = Math.floor(Math.random() * 10 ** 9);
		it.skip(`should add the correct timestamp when the clock ticks ${time} millis`, async () => {
			jest.useFakeTimers();

			jest.advanceTimersByTime(time);
			await eventLogWriter.sendEvent(defaultEvent);

			expect(stubKinesis.putRecord.mock.calls[0][0].time).toBe(
				Math.floor(time / 1000)
			);
			jest.clearAllTimers();
		});
	});
});
