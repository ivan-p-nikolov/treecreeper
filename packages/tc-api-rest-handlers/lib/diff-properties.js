const neo4jTemporalTypes = require('neo4j-driver/lib/temporal-types');
const { getType } = require('@financial-times/tc-schema-sdk');

const isNullValue = val => val === null || val === '';

const isTemporalTypeName = type => ['Date', 'DateTime', 'Time'].includes(type);

const entriesToObject = (map, [key, val]) => Object.assign(map, { [key]: val });

// We go to extra lengths here using constructors because the string representations
// in the payload and retrieved from db may have different precision, but effectively
// be the same value e.g. 12:00:00 compared to 12:00:00.000 should return false
const normalizeDateString = (type, val, neo4jConstructor) => {
	if (type === 'Time') {
		// Need to pass a standard JavaScript Date to use fromStandardDate function
		// It returns only Time object even if the val includes date.
		// Any date is ok. It doesn't need to be 2000-01-01.
		val = `2000-01-01T${val}`;
	}
	return neo4jConstructor.fromStandardDate(new Date(val)).toString();
};

const datesAreEqual = (type, val1, val2, neo4jConstructor) =>
	normalizeDateString(type, val1, neo4jConstructor) ===
	normalizeDateString(type, val2, neo4jConstructor);

const isProperty = type => {
	const { properties } = getType(type);
	return ([propName]) =>
		properties[propName] && !properties[propName].isRelationship;
};

const getPropertyChangeDetector = (properties, initialContent) => ([
	propName,
	newVal,
]) => {
	const { type, hasMany } = properties[propName] || {};

	if (!(propName in initialContent)) {
		return !isNullValue(newVal);
	}

	if (isNullValue(newVal)) {
		return true;
	}

	const oldVal = initialContent[propName];

	if (isTemporalTypeName(type)) {
		return !datesAreEqual(
			type,
			newVal,
			initialContent[propName],
			neo4jTemporalTypes[type],
		);
	}

	if (hasMany) {
		const sortedNew = newVal.sort();
		const sortedOld = oldVal.sort();

		return (
			sortedNew.some((val, i) => sortedOld[i] !== val) ||
			sortedOld.some((val, i) => sortedNew[i] !== val)
		);
	}

	return newVal !== oldVal;
};

const detectPropertyChanges = (type, initialContent = {}) => {
	if (!Object.keys(initialContent).length) {
		return ([, val]) => !isNullValue(val);
	}

	const { properties } = getType(type);

	return getPropertyChangeDetector(properties, initialContent);
};

const diffProperties = ({ type, newContent = {}, initialContent = {} }) =>
	Object.entries(newContent)
		.filter(isProperty(type))
		.filter(detectPropertyChanges(type, initialContent))
		.reduce(entriesToObject, {});

module.exports = {
	diffProperties,
};
