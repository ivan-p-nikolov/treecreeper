const primitiveTypes = require('./lib/primitive-types-map');
const sendSchemaToS3 = require('./lib/send-schema-to-s3');

const RawData = require('./lib/raw-data');
const getDataAccessors = require('./data-accessors');
const getValidators = require('./lib/validate');

module.exports = {
	init: (opts = {}) => {
		const rawData = new RawData(opts);
		if (opts.rawData) {
			rawData.setRawData(opts.rawData);
		}
		const dataAccessors = getDataAccessors(rawData);
		const validate = getValidators(dataAccessors);

		return Object.assign(
			{
				on: rawData.on.bind(rawData),
				startPolling: rawData.startPolling.bind(rawData),
				stopPolling: rawData.stopPolling.bind(rawData),
				refresh: rawData.refresh.bind(rawData),
				normalizeTypeName: name => name,
				primitiveTypesMap: primitiveTypes,
				sendSchemaToS3: sendSchemaToS3(rawData),
			},
			validate,
			dataAccessors,
		);
	},
};
