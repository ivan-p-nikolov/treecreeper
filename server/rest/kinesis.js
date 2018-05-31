const logger = require('@financial-times/n-logger').default;
const EventLogWriter = require('../lib/event-log-writer');
const Kinesis = require('../lib/kinesis');
const { isSameNeo4jInteger } = require('./utils');

const kinesisClient = new Kinesis(
	process.env.CRUD_EVENT_LOG_STREAM_NAME || 'test-stream-name'
);
const eventLogWriter = new EventLogWriter(kinesisClient);

const sendEvent = event =>
	eventLogWriter.sendEvent(event).catch(error => {
		logger.error(
			'Failed to send event to event log',
			Object.assign({ event, error: error })
		);
	});

const logNodeChanges = (requestId, result, deletedRelationships) => {
	const node = result.records[0].get('node');
	let event;
	let action;

	if (node.properties.deletedByRequest === requestId) {
		event = 'DELETED_NODE';
		action = EventLogWriter.actions.DELETE;
	} else if (node.properties.createdByRequest === requestId) {
		event = 'CREATED_NODE';
		action = EventLogWriter.actions.CREATE;
	} else {
		event = 'UPDATED_NODE';
		action = EventLogWriter.actions.UPDATE;
	}

	sendEvent({
		event,
		action,
		code: node.properties.id,
		type: node.labels[0],
		requestId
	});

	if (
		result.records[0] &&
		result.records[0].has('related') &&
		result.records[0].get('related')
	) {
		result.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			if (target.properties.createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_NODE',
					action: EventLogWriter.actions.CREATE,
					code: target.properties.id,
					type: target.labels[0],
					requestId
				});
			}

			if (rel.properties.createdByRequest === requestId) {
				sendEvent({
					event: 'CREATED_RELATIONSHIP',
					action: EventLogWriter.actions.UPDATE,
					relationship: {
						relType: rel.type,
						direction: isSameNeo4jInteger(rel.start, node.identity)
							? 'outgoing'
							: 'incoming',
						nodeCode: target.properties.id,
						nodeType: target.labels[0]
					},
					code: node.properties.id,
					type: node.labels[0],
					requestId
				});

				sendEvent({
					event: 'CREATED_RELATIONSHIP',
					action: EventLogWriter.actions.UPDATE,
					relationship: {
						relType: rel.type,
						direction: isSameNeo4jInteger(rel.start, node.identity)
							? 'incoming'
							: 'outgoing',
						nodeCode: node.properties.id,
						nodeType: node.labels[0]
					},
					code: target.properties.id,
					type: target.labels[0],
					requestId
				});
			}
		});
	}

	if (deletedRelationships && deletedRelationships.records.length) {
		deletedRelationships.records.forEach(record => {
			const target = record.get('related');
			const rel = record.get('relationship');

			sendEvent({
				event: 'DELETED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: rel.type,
					direction: isSameNeo4jInteger(rel.start, node.identity)
						? 'outgoing'
						: 'incoming',
					nodeCode: target.properties.id,
					nodeType: target.labels[0]
				},
				code: node.properties.id,
				type: node.labels[0],
				requestId
			});

			sendEvent({
				event: 'DELETED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: rel.type,
					direction: isSameNeo4jInteger(rel.start, node.identity)
						? 'incoming'
						: 'outgoing',
					nodeCode: node.properties.id,
					nodeType: node.labels[0]
				},
				code: target.properties.id,
				type: target.labels[0],
				requestId
			});
		});
	}
};

const logRelationshipChanges = (
	requestId,
	result,
	{ nodeType, code, relatedType, relatedCode, relationshipType }
) => {
	if (!result.records[0]) {
		sendEvent({
			event: 'DELETED_RELATIONSHIP',
			action: EventLogWriter.actions.UPDATE,
			relationship: {
				relType: relationshipType,
				direction: 'outgoing',
				nodeCode: relatedCode,
				nodeType: relatedType
			},
			code: code,
			type: nodeType,
			requestId
		});

		sendEvent({
			event: 'DELETED_RELATIONSHIP',
			action: EventLogWriter.actions.UPDATE,
			relationship: {
				relType: relationshipType,
				direction: 'incoming',
				nodeCode: code,
				nodeType: nodeType
			},
			code: relatedCode,
			type: relatedType,
			requestId
		});
	} else {
		const relationshipRecord = result.records[0].get('relationship');
		if (relationshipRecord.properties.createdByRequest === requestId) {
			sendEvent({
				event: 'CREATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: relationshipType,
					direction: 'outgoing',
					nodeCode: relatedCode,
					nodeType: relatedType
				},
				code: code,
				type: nodeType,
				requestId
			});

			sendEvent({
				event: 'CREATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: relationshipType,
					direction: 'incoming',
					nodeCode: code,
					nodeType: nodeType
				},
				code: relatedCode,
				type: relatedType,
				requestId
			});
		} else {
			sendEvent({
				event: 'UPDATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: relationshipType,
					direction: 'outgoing',
					nodeCode: relatedCode,
					nodeType: relatedType
				},
				code: code,
				type: nodeType,
				requestId
			});

			sendEvent({
				event: 'UPDATED_RELATIONSHIP',
				action: EventLogWriter.actions.UPDATE,
				relationship: {
					relType: relationshipType,
					direction: 'incoming',
					nodeCode: code,
					nodeType: nodeType
				},
				code: relatedCode,
				type: relatedType,
				requestId
			});
		}
	}
};

module.exports = { logNodeChanges, logRelationshipChanges };
