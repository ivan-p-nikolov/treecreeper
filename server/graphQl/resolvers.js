const util = require('util');
const partialRight = require('lodash/partialRight');
const { neo4jgraphql } = require('neo4j-graphql-js');

const mapToNeo4j = partialRight(neo4jgraphql, process.env.DEBUG || true);
const { getNeo4jResolverNames, enumsSchema } = require('../../schema');

const queries = getNeo4jResolverNames();

const upperCaseResolver = keys =>
	keys.reduce(
		(resolver, key) => Object.assign(resolver, { [key.toUpperCase()]: key }),
		{}
	);

const enumResolvers = Object.entries(enumsSchema).reduce(
	(map, [key, { options }]) =>
		Object.assign(map, {
			[key]: Array.isArray(options) ? upperCaseResolver(options) : options
		}),
	{}
);

const queryResolvers = queries.reduce(
	(query, key) => Object.assign(query, { [key]: mapToNeo4j }),
	{}
);

const mutationResolvers = {
	/*
		Example mutation of a systems scalar properties
		At the time of writing this must be done programatically rather than via
		neo4j-graphql-js
	*/
	System: async (_, { code, params }, context) => {
		const result = await context.driver.run(`
			MATCH (s:System {code: "${code}"})
			SET s += {${util.inspect(params)}}
			RETURN s
		`);
		return result.records[0].get(0).properties;
	}
};

module.exports = {
	enumResolvers,
	queryResolvers,
	mutationResolvers,
	all: Object.assign(
		{},
		enumResolvers,
		{ Query: queryResolvers },
		{ Mutation: mutationResolvers }
	)
};
