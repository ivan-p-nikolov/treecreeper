const { expect } = require('chai');
const generateGraphqlDefs = require('../../server/graphql/generate-graphql-defs');
const schema = require('../../schema');

describe('creating graphql schema', () => {
	it('generates expected graphql def given schema', () => {
		const mockSchema = Object.assign({}, schema, {
			typesSchema: [
				{
					name: 'CostCentre',
					description: 'A cost centre which groups are costed to',
					properties: {
						code: {
							type: 'String',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE'
						},
						name: {
							type: 'String',
							canIdentify: true,
							description: 'The name of the cost centre'
						}
					}
				},
				{
					name: 'Group',
					description:
						'An overarching group which contains teams and is costed separately',
					properties: {
						code: {
							type: 'String',
							required: true,
							unique: true,
							canIdentify: true,
							description: 'Unique code/id for this item',
							pattern: 'COST_CENTRE'
						},
						name: {
							type: 'String',
							canIdentify: true,
							description: 'The name of the group'
						},
						isActive: {
							type: 'Boolean',
							canFilter: true,
							description: 'Whether or not the group is still in existence'
						}
					}
				}
			],
			relationshipsSchema: {
				PAYS_FOR: {
					type: 'ONE_TO_MANY',
					fromType: {
						CostCentre: {
							graphql: {
								name: 'hasGroups',
								description: 'The groups which are costed to the cost centre'
							}
						}
					},
					toType: {
						Group: {
							graphql: {
								name: 'hasBudget',
								description: 'The Cost Centre associated with the group'
							}
						}
					}
				}
			},
			enumsSchema: {
				Lifecycle: {
					description: 'The lifecycle stage of a product',
					options: ['INCUBATE', 'SUSTAIN', 'GROW', 'SUNSET']
				}
			}
		});

		const generated = generateGraphqlDefs(mockSchema)
			// trim trailing whitespace from empty lines
			// (an artefact of the graphql definition generator which text editors may strip when writing fixtures)
			.map(str =>
				str
					.split('\n')
					.map(str => (/^\s+$/.test(str) ? '' : str))
					.join('\n')
			);

		expect(generated).to.have.members([
			`
# A cost centre which groups are costed to
type CostCentre {

  # Unique code/id for this item
  code: String
  # The name of the cost centre
  name: String

}`,
			`
# An overarching group which contains teams and is costed separately
type Group {

  # Unique code/id for this item
  code: String
  # The name of the group
  name: String
  # Whether or not the group is still in existence
  isActive: Boolean

}`,
			`type Query {
    CostCentre(


    # Unique code/id for this item
    code: String
    # The name of the cost centre
    name: String
  ): CostCentre

  Group(


    # Unique code/id for this item
    code: String
    # The name of the group
    name: String
  ): Group

  Groups(

    # The pagination offset to use
    offset: Int = 0
    # The number of records to return after the pagination offset. This uses the default neo4j ordering
    first: Int = 20000

    # Whether or not the group is still in existence
    isActive: Boolean
  ): [Group]
}`,
			`
# The lifecycle stage of a product
enum Lifecycle {
  INCUBATE
  SUSTAIN
  GROW
  SUNSET
}`,
			`
input SystemInput {
    serviceTier: ServiceTier
    name: String
    supported: YesNo
    primaryURL: String
    systemType: String
    serviceTier: ServiceTier
    serviceType: String
    hostPlatform: String
    personalData: YesNo
    sensitiveData: YesNo
    lifecycleStage: SystemLifecycle
}

type Mutation {
    System(code: String, params: SystemInput): System!
}`
		]);
	});
});
