const { getType } = require('@financial-times/biz-ops-schema');
const {
	isDateTime,
	isDate,
	isTime,
} = require('neo4j-driver/lib/v1/temporal-types');
const neo4jTemporalTypes = require('neo4j-driver/lib/v1/temporal-types');
const { diffProperties } = require('./record-analysis');

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

const isTemporalType = val => isDateTime(val) || isDate(val) || isTime(val);
const convertNeo4jTypes = obj => {
	Object.entries(obj).forEach(([key, val]) => {
		if (isTemporalType(val)) {
			obj[key] = val.toString();
		}
	});
	return obj;
};

const isTemporalTypeName = type => ['Date', 'DateTime', 'Time'].includes(type);

const convertTemporalTypes = nodeType => {
	const { properties } = getType(nodeType);
	return ([propName, val]) => {
		const { type } = properties[propName];
		if (isTemporalTypeName(type)) {
			val = neo4jTemporalTypes[type].fromStandardDate(new Date(val));
		}
		return [propName, val];
	};
};

const isNullValue = val => val === null || val === '';

const convertNullValues = ([propName, val]) => [
	propName,
	isNullValue(val) ? null : val,
];

const constructNeo4jProperties = ({
	nodeType,
	newContent = {},
	code,
	initialContent,
}) => {
	newContent.code = code || newContent.code;

	return diffProperties({ nodeType, newContent, initialContent }, false)
		.map(convertTemporalTypes(nodeType))
		.map(convertNullValues)
		.reduce(entriesToObject, {});
};

module.exports = {
	convertNeo4jTypes,
	constructNeo4jProperties,
};