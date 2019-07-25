const AWS = require('aws-sdk');
const { diff } = require('deep-diff');
const { logger } = require('../../../lib/request-context');

const s3BucketInstance = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

class S3DocumentsHelper {
	constructor(s3Bucket = s3BucketInstance) {
		const s3BucketPrefixCode = 'biz-ops-documents';
		this.s3BucketName = `${s3BucketPrefixCode}.${process.env.AWS_ACCOUNT_ID}`;
		this.s3Bucket = s3Bucket;
	}

	async uploadToS3(params, requestType) {
		try {
			const res = await this.s3Bucket.upload(params).promise();
			logger.info(res, `${requestType}: S3 Upload successful`);
		} catch (err) {
			logger.info(err, `${requestType}: S3 Upload failed`);
		}
	}

	async writeFileToS3(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
			Body: JSON.stringify(body),
		};
		this.uploadToS3(params, 'POST');
	}

	async patchS3file(nodeType, code, body) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		try {
			const existingNode = await this.s3Bucket
				.getObject(params)
				.promise();
			const existingBody = JSON.parse(existingNode.Body);
			if (diff(existingBody, body)) {
				const newBody = Object.assign(existingBody, body);
				this.uploadToS3(
					Object.assign({ Body: JSON.stringify(newBody) }, params),
					'PATCH',
				);
			} else {
				logger.info('PATCH: No S3 Upload as file is unchanged');
			}
		} catch (err) {
			this.uploadToS3(
				Object.assign({ Body: JSON.stringify(body) }, params),
				'PATCH',
			);
		}
	}

	async sendDocumentsToS3(method, nodeType, code, body) {
		const send = method === 'POST' ? this.writeFileToS3 : this.patchS3file;
		send.call(this, nodeType, code, body);
	}

	async deleteFileFromS3(nodeType, code) {
		const params = {
			Bucket: this.s3BucketName,
			Key: `${nodeType}/${code}`,
		};
		try {
			const res = await this.s3Bucket.deleteObject(params).promise();
			logger.info(res, 'DELETE: S3 Delete successful');
		} catch (err) {
			logger.info(err, 'DELETE: S3 Delete failed');
		}
	}
}

module.exports = S3DocumentsHelper;
