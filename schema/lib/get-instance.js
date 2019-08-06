const primitiveTypes = require('./primitive-types-map');
const sendSchemaToS3 = require('./send-schema-to-s3');
const getSchemaFilename = require('./get-schema-filename');
const RawData = require('./raw-data');
const getDataAccessors = require('../data-accessors');
const getValidators = require('./validators');

module.exports = {
	init: (opts = {}) => {
		const rawData = new RawData(opts);

		// generally only used in tests
		if (opts.rawData) {
			rawData.setRawData(opts.rawData);
		}
		const dataAccessors = getDataAccessors(rawData);
		const validators = getValidators(dataAccessors);

		return Object.assign(
			{
				on: rawData.on.bind(rawData),
				configure: rawData.configure.bind(rawData),
				startPolling: rawData.startPolling.bind(rawData),
				stopPolling: rawData.stopPolling.bind(rawData),
				refresh: rawData.refresh.bind(rawData),
				normalizeTypeName: name => name,
				primitiveTypesMap: primitiveTypes,
				sendSchemaToS3: env => sendSchemaToS3(env, rawData.getAll()),
				getSchemaFilename,
			},

			dataAccessors,
			validators,
		);
	},
};