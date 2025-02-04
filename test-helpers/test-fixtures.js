const { DateTime } = require('neo4j-driver/lib/temporal-types.js');

const { driver } = require('./db-connection');

const executeQuery = (query, parameters) =>
	driver.session().run(query, parameters);

const getNodeCreator = (namespace, defaultProps) => async (
	type,
	props = {},
) => {
	if (typeof props === 'string') {
		props = { code: props };
	}
	const result = await executeQuery(`CREATE (n:${type} $props) RETURN n`, {
		props: { ...defaultProps, ...props },
	});
	return result.records[0].get('n').identity;
};

const getConnector = (namespace, defaultProps) => (
	id1,
	relationshipType,
	id2,
	props = {},
) =>
	executeQuery(
		`
MATCH (n1) WHERE ID(n1) = toInteger($id1)
WITH n1
MATCH (n2) WHERE ID(n2) = toInteger($id2)
WITH n1, n2
MERGE (n1)-[rel:${relationshipType}]->(n2)
SET rel = $props
RETURN n1, n2, rel`,
		{
			id1,
			id2,
			props: { ...defaultProps, ...props },
		},
	);

const fixtureBuilder = (namespace, now, then) => {
	const getMetaPayload = () => ({
		requestId: `${namespace}-request`,
		clientId: `${namespace}-client`,
		clientUserId: `${namespace}-user`,
	});

	const getMetaObject = (prefix, suffix = '', time) => ({
		[`${prefix}ByRequest`]: `${namespace}${suffix}-request`,
		[`${prefix}ByClient`]: `${namespace}${suffix}-client`,
		[`${prefix}ByUser`]: `${namespace}${suffix}-user`,
		[`${prefix}Timestamp`]: DateTime.fromStandardDate(
			new Date(time),
		).toString(),
	});

	const stockMetadata = {
		default: Object.assign(
			getMetaObject('_updated', '-default', then),
			getMetaObject('_created', '-default', then),
		),
		create: Object.assign(
			getMetaObject('_updated', '', now),
			getMetaObject('_created', '', now),
		),
		update: Object.assign(
			getMetaObject('_updated', '', now),
			getMetaObject('_created', '-default', then),
		),
	};

	const createNode = getNodeCreator(namespace, stockMetadata.default);
	const connect = getConnector(namespace, stockMetadata.default);

	const connectNodes = (...input) => {
		if (!Array.isArray(input[0])) {
			input = [input];
		}
		return Promise.all(input.map(args => connect(...args)));
	};
	const createNodes = (...nodes) =>
		Promise.all(nodes.map(args => createNode(...args)));

	return {
		createNodes,
		createNode,
		connectNodes,
		stockMetadata,
		getMetaPayload,
	};
};

const dropFixtures = namespace =>
	executeQuery(
		`MATCH (n) WHERE n.code STARTS WITH "${namespace}" DETACH DELETE n`,
	);

module.exports = {
	fixtureBuilder,
	dropFixtures,
	executeQuery,
};
