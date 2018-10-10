const getTypes = require('../methods/get-types').method;
const getEnums = require('../methods/get-enums').method;

const stripEmptyFirstLine = (hardCoded, ...vars) => {
	hardCoded[0] = hardCoded[0].replace(/^\n+(.*)$/, ($0, $1) => $1);
	return [...Array(Math.max(hardCoded.length, vars.length))]
		.map((val, i) => `${hardCoded[i] || ''}${vars[i] || ''}`)
		.join('');
};

const indentMultiline = (str, indent, trimFirst) => {
	indent = [...Array(indent)].map(() => ' ').join('');
	return str
		.split('\n')
		.map(line => {
			line = trimFirst ? line.trim() : line;
			return `${line.length ? indent : ''}${line}`;
		})
		.join('\n');
};

const graphqlDirection = direction => (direction === 'outgoing' ? 'OUT' : 'IN');

const relFragment = (type, direction, depth = '') => {
	const left = direction === 'incoming' ? '<' : '';
	const right = direction === 'outgoing' ? '>' : '';
	return `${left}-[:${type}${depth}]-${right}`;
};

const maybePluralType = def => (def.hasMany ? `[${def.type}]` : def.type);

const maybePaginate = def =>
	def.isRelationship && def.hasMany ? '(first: Int, offset: Int)' : '';

const cypherResolver = def => {
	if (!def.isRelationship) {
		return '';
	}
	if (def.isRecursive) {
		return `@cypher(
      statement: "MATCH (this)${relFragment(
				def.relationship,
				def.direction,
				'*1..20'
			)}(related:${def.type}) RETURN DISTINCT related"
    )`;
	} else {
		return `@relation(name: "${
			def.relationship
		}", direction: "${graphqlDirection(def.direction)}")`;
	}
};

const defineProperties = properties => {
	return properties
		.map(
			([name, def]) =>
				stripEmptyFirstLine`
      # ${def.description}
      ${name}${maybePaginate(def)}: ${maybePluralType(def)} ${cypherResolver(
					def
				)}`
		)
		.join('');
};

const PAGINATE = indentMultiline(
	defineProperties(
		Object.entries({
			offset: {
				type: 'Int = 0',
				description: 'The pagination offset to use'
			},
			first: {
				type: 'Int = 20000',
				description:
					'The number of records to return after the pagination offset. This uses the default neo4j ordering'
			}
		})
	),
	4,
	true
);

const getIdentifyingFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canIdentify);

const getFilteringFields = config =>
	Object.entries(config.properties).filter(([, value]) => value.canFilter);

const defineQuery = ({ name, type, properties, paginate }) => {
	return `
  ${name}(
    ${paginate ? PAGINATE : ''}
    ${indentMultiline(defineProperties(properties), 4, true)}
  ): ${type}`;
};

const defineType = config => `
# ${config.description}
type ${config.name} {
  ${indentMultiline(
		defineProperties(Object.entries(config.properties)),
		2,
		true
	)}
}`;

const defineQueries = config => [
	defineQuery({
		name: config.name,
		type: config.name,
		properties: getIdentifyingFields(config)
	}),
	defineQuery({
		name: config.pluralName,
		type: `[${config.name}]`,
		properties: getFilteringFields(config),
		paginate: true
	})
];

const defineEnum = ([name, { description, options }]) => `
# ${description}
enum ${name} {
${indentMultiline(Object.keys(options).join('\n'), 2)}
}`;

module.exports.method = () => {
	const typesFromSchema = getTypes({
		primitiveTypes: 'graphql',
		relationshipStructure: 'graphql'
	});

	return [].concat(
		typesFromSchema.map(defineType),
		'type Query {\n',
		...typesFromSchema.map(defineQueries),
		'}',
		Object.entries(getEnums({ withMeta: true })).map(defineEnum)
	);
};
