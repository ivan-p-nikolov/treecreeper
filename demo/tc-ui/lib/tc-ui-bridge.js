const logger = require('@financial-times/lambda-logger');
const {
	componentAssigner,
	graphqlQueryBuilder,
	ApiClient,
	getSchemaSubset,
	getPageRenderer,
	getDataTransformers,
} = require('@financial-times/tc-ui');
const { Header } = require('./components/header');
const { Footer } = require('./components/footer');

const customComponents = require('./components/primitives');

const customComponentMap = {
	Paragraph: 'LargeText',
};

const assignComponent = componentAssigner({
	customComponents,
	customTypeMappings: customComponentMap,
});

const graphqlBuilder = type => graphqlQueryBuilder(type, assignComponent);

module.exports = {
	assignComponent,
	graphqlBuilder,
	getSchemaSubset,
	getApiClient: event =>
		new ApiClient({
			event,
			graphqlBuilder,
			logger,
			apiBaseUrl: 'http://local.in.ft.com:8888/api',
			apiHeaders: () => ({
				'x-api-key': process.env.BIZ_OPS_API_KEY,
				'client-id': 'biz-ops-admin',
				'client-user-id': 'rhys.evans',
			}),
		}),
	...getPageRenderer({
		Header,
		Footer,
	}),
	...getDataTransformers(assignComponent),
};
