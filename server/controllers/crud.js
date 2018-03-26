const db = require('../db-connection');
const logger = require('@financial-times/n-logger').default;

const _createRelationships = async (relationships, upsert) => {

	let resultRel;

	for (let relationship of relationships) {
		const createRelationshipAndNode = `
			MATCH (a:${relationship.from})
			WHERE a.${relationship.fromUniqueAttrName} = '${relationship.fromUniqueAttrValue}'
			MERGE (a)-[r:${relationship.name}]->(b:${relationship.to} {${relationship.toUniqueAttrName}: '${relationship.toUniqueAttrValue}'})
			RETURN r
		`;

		const createRelationshipAlone = `
			MATCH (a:${relationship.from}),(b:${relationship.to})
			WHERE a.${relationship.fromUniqueAttrName} = '${relationship.fromUniqueAttrValue}'
			AND b.${relationship.toUniqueAttrName} = '${relationship.toUniqueAttrValue}'
			CREATE (a)-[r:${relationship.name}]->(b)
			RETURN r
		`;

		const query = upsert === 'upsert' ? createRelationshipAndNode : createRelationshipAlone;
		console.log('[CRUD] relationship query', query);

		try {
			let oneResultRel = await db.run(query);

			if (oneResultRel.records && oneResultRel.records.length > 0) {
				resultRel = oneResultRel
			}
		}
		catch (e) {
			console.log('[CRUD] Relationship not created', e.toString());
		}
	}
	return resultRel;
};


const get = async (res, nodeType, uniqueAttrName, uniqueAttr) => {
	logger.info({ event:'CRUD_GET', nodeType, uniqueAttrName, uniqueAttr});

	let response;

	try {

		const filter = uniqueAttrName && uniqueAttr ? `{${uniqueAttrName}: "${uniqueAttr}"}` : '';]

		const query = `MATCH (a:${nodeType} ${filter}) RETURN a`;

		logger.info({ event:'CRUD_GET_QUERY', query});

		const result = await db.run(query);

		if (!result.records.length) {
			response = {
				status: 404,
				data: `${nodeType} ${uniqueAttr ? uniqueAttr : ''} not found`
			};
		}
		else {
			const formattedResult = result.records.map(record => record._fields[0].properties);
			response = {
				status: 200,
				data: formattedResult
			};
		}

		logger.info({ event:'CRUD_GET_OK', response});
		return response;
	}
	catch (e) {
		response = {
			status: 500,
			data: e.toString()
		};
		logger.info({ event:'CRUD_GET_ERROR', response});
		return response;
	}
};

const create = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert) => {
	logger.info({ event:'CRUD_GET', nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert});

	let response;

	if (uniqueAttrName) {
		const existingNode = `MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"}) RETURN a`;

		console.log('[CRUD] exists query', existingNode);

		const result = await db.run(existingNode);
		if (result.records.length > 0) {
			console.log(nodeType, uniqueAttr, uniqueAttrName, 'ALREADY EXISTS', JSON.stringify(result.records, null, 2));

			response = {
				status: 400,
				data: `node with ${uniqueAttrName}=${obj[uniqueAttrName]} already exists`
			};
			logger.info({ event:'CRUD_CREATE_ERROR', response});
			return response;
		}
	}

	try {

		// Make sure if we've said there is a primary key, then it is in the obj
		if (uniqueAttrName) {
			obj[uniqueAttrName] = uniqueAttr;
		}

		if (nodeType) {
			const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;
			console.log('[CRUD] query', createQuery);
			const result = await db.run(createQuery, {node: obj});

			if (!relationships) {
				return res.send(result.records[0]._fields[0].properties);
			}
		}

		if (relationships) {
			let resultRel = await _createRelationships(relationships, upsert);

			if (!resultRel) {
				return res.status(400).end('error creating relationships');
			}

			return res.send(resultRel.records[0]._fields);
		}
	}
	catch (e) {
		console.log(`${nodeType} not created`, e.toString());
		return res.status(400).end(e.toString());
	}
};

const update = async (res, nodeType, uniqueAttrName, uniqueAttr, obj, relationships, upsert) => {
	console.log('[CRUD] updating', obj, nodeType, uniqueAttrName, uniqueAttr);
	try {
		const updateQuery = `
			MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})
			SET a += $props
			RETURN a
		`;

		console.log('[CRUD] query', updateQuery);

		const result = await db.run(updateQuery, {props: obj});

		console.log('[CRUD] records', result.records)

		if (result.records.length === 0) {
			if (upsert) {
				const createQuery = `CREATE (a:${nodeType} $node) RETURN a`;

				if (uniqueAttrName) {
					obj[uniqueAttrName] = uniqueAttr;
				 }

				console.log('[CRUD] create query (upsert)', createQuery);
				await db.run(createQuery, {node: obj});
			} else {
				const message = `${nodeType}${uniqueAttr} not found. No nodes updated.`;
				console.log(message);
				return res.status(404).end(message);
			}
		}

		if (relationships) {
			let resultRel = await _createRelationships(relationships, upsert);

			console.log('RESULT REL, RETURNING', resultRel);

			if (!resultRel) {
				return res.status(400).end('error creating relationships');
			}

			return res.send(resultRel.records[0]._fields);
		}

		res.send(result.records && result.records.length ? result.records[0]._fields[0].properties : result);
	}
	catch (e) {
		console.log('[CRUD] update error', e);
		return res.status(500).end(e.toString());
	}
};

const remove = async (res, nodeType, uniqueAttrName, uniqueAttr, mode) => {

	try {
		const query = `MATCH (a:${nodeType} {${uniqueAttrName}: "${uniqueAttr}"})${mode === 'detach' ? ' DETACH' : ''} DELETE a`;
		console.log('[CRUD] delete query', query);

		const result = await db.run(query);
		if (result && result.summary && result.summary.counters && result.summary.counters.nodesDeleted() === 1) {
			return res.status(200).end(`${uniqueAttr} deleted`);
		}
		else {
			return res.status(404).end(`${uniqueAttr} not found. No nodes deleted.`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAllforOne = async (res, relationship, param) => {
	try {
		// TODO
		// use uniqueattr value and name instead of id
		// used by webPMA contract controller
		const query = `MATCH p=(${relationship.from} {id: "${param}"})-[r:${relationship.name}]->(${relationship.to}) RETURN p`;
		console.log('[CRUD] all for one query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].end.properties;
			});
			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${relationship.to} found for ${relationship.from} ${param}`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};


const getAll = async (res, nodeType, filters = '') => {

	try {
		const query = `MATCH (a:${nodeType} ${filters}) RETURN a`;
		console.log('[CRUD] get all query', query);

		const result = await db.run(query);

		if (result.records.length) {
			const elements = result.records.map((node) => {
				return node._fields[0].properties;
			});

			return res.send(elements);
		}
		else {
			return res.status(404).end(`No ${nodeType} found`);
		}
	}
	catch (e) {
		return res.status(500).end(e.toString());
	}
};

module.exports = { get, create, update, remove, getAll, getAllforOne };