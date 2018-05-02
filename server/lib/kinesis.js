'use strict';

const AWS = require('aws-sdk');
const logger = require('@financial-times/n-logger').default;

const dyno = process.env.DYNO;
const isProduction = process.env.NODE_ENV === 'production';

const stubInDevelopment = (action, fn) => (...args) => {
    if (!isProduction) {
        logger.debug(`Skipped kinesis ${action} as not in production`, { event: args[0].event });
        return Promise.resolve();
    }
    return fn(...args);
};

const create = streamName => {
    const kinesis = new AWS.Kinesis({
        apiVersion: '2013-12-02',
        logger: {
            log(message) {
                logger.debug('Kinesis API call', message);
            },
        },
    });

    return {
        putRecord: stubInDevelopment('put record', data => {
            kinesis
				.putRecord({
					Data: Buffer.from(JSON.stringify(data), 'utf-8'),
					PartitionKey: `${dyno}:${Date.now()}`,
					StreamName: streamName,
				})
				.promise()
				.catch(error => {
					logger.error('Kinesis put record failed', {
						event: 'KINESIS_PUT_RECORD_FAILURE',
						error,
						data,
					});
					throw error;
				});
        }),
    };
};

module.exports = create;
