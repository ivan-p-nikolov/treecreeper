const _isEmpty = require('lodash.isempty');
const { s3Get } = require('./get');
const { s3Delete } = require('./delete');
const { s3Post } = require('./post');
const { diffProperties } = require('./diff');

const s3Merge = async ({
	s3Instance,
	bucketName,
	nodeType,
	sourceCode,
	destinationCode,
}) => {
	const [sourceNodeBody, destinationNodeBody] = await Promise.all([
		s3Get({ s3Instance, bucketName, nodeType, sourceCode }),
		s3Get({ s3Instance, bucketName, nodeType, destinationCode }),
	]);
	// If the source node has no document properties/does not exist
	// in s3, take no action and return false in place of version ids
	if (_isEmpty(sourceNodeBody)) {
		return {};
	}

	const writeProperties = diffProperties({
		nodeType,
		newContent: sourceNodeBody,
		initialContent: destinationNodeBody,
	});

	Object.keys(sourceNodeBody).forEach(name => {
		if (name in destinationNodeBody) {
			delete writeProperties[name];
		}
	});

	const mergeResultPromises = [
		s3Delete({
			s3Instance,
			bucketName,
			nodeType,
			code: sourceCode,
		}),
	];
	const noPropertiesToWrite = _isEmpty(writeProperties);
	if (!noPropertiesToWrite) {
		mergeResultPromises.push(
			s3Post({
				s3Instance,
				bucketName,
				nodeType,
				code: destinationCode,
				body: Object.assign(destinationNodeBody, writeProperties),
			}),
		);
	}

	const [deletedObject, postedObject] = await Promise.all(
		mergeResultPromises,
	);
	const { versionMarker: deletedVersionId } = deletedObject;
	const { versionMarker: postedVersionId } = postedObject;
	if (!deletedVersionId && !postedVersionId) {
		throw new Error('MERGE FAILED: Write and delete failed in S3');
	}
	if (!deletedVersionId) {
		await s3Delete({
			s3Instance,
			bucketName,
			nodeType,
			code: destinationCode,
			versionMarker: postedVersionId,
		});
		throw new Error('MERGE FAILED: Delete failed in S3');
	}
	if (!postedVersionId && !noPropertiesToWrite) {
		await s3Delete({
			s3Instance,
			bucketName,
			nodeType,
			code: sourceCode,
			versionMarker: deletedVersionId,
		});
		throw new Error('MERGE FAILED: Write failed in S3');
	}
	return {
		versionMarker: postedVersionId,
		siblingVersionMarker: deletedVersionId,
		body: destinationNodeBody,
	};
};

module.exports = {
	s3Merge,
};
