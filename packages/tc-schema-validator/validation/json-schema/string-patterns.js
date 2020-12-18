module.exports = {
	stringPatternsSchema: {
		type: 'object',
		propertyNames: {
			pattern: '^(?=.{2,64}$)[A-Z][A-Z_]*[A-Z]$',

		},
		errorMessage: {
			propertyNames: "Your string pattern name should only use uppercase letters and underscores"
		},
		additionalProperties: {
			if: {
				type: 'string',
			},
			then: {
				type: 'string',
				pattern: '^\\^.*\\$$', errorMessage: "Don't forget to bookend your regex with ^ and $ to match the entire string",
			},
			else: {
				type: 'object',
					properties: {
						pattern: { type: 'string', pattern: '^\\^.*\\$$'},
						flags: { type: 'string', pattern: '^[i]+$' },
					},
					additionalProperties: false,
					errorMessage: "There's something wrong with the definition of this flagged regex"
			}
		},
	},
};
