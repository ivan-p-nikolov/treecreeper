const { stripIndents } = require('common-tags');
const { validateParams } = require('../../lib/validation');
const { preflightChecks } = require('../../lib/error-handling');
const { executeQuery } = require('../../lib/neo4j-model');
const { logNodeDeletion } = require('../../../../lib/log-to-kinesis');
const { getNodeWithRelationships } = require('../../lib/read-helpers');
const { deleteFileFromS3 } = require('../../lib/s3-documents-helper');

module.exports = async input => {
	validateParams(input);
	const { nodeType, code } = input;

	const existingRecord = await getNodeWithRelationships(nodeType, code);

	deleteFileFromS3(nodeType, code);

	preflightChecks.bailOnMissingNode({
		result: existingRecord,
		nodeType,
		code,
		status: 404,
	});
	preflightChecks.bailOnAttachedNode({
		record: existingRecord.toApiV2(nodeType),
		nodeType,
		code,
	});

	const query = stripIndents`
	MATCH (node:${nodeType} {code: $code})
	DELETE node
	`;

	await executeQuery(query, { code });
	logNodeDeletion(existingRecord.getNode());

	return { status: 204 };
};
