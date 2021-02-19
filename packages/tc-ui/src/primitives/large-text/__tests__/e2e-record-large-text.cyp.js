const { executeQuery, dropFixtures } = require('../../../test-helpers/db');

const namespace = 'e2e-demo-primitives-large-text';
const code = `${namespace}-code`;

const save = () =>
	cy.get('[data-button-type="submit"]').click({
		force: true,
	});

describe('End-to-end - Large Text primitive', () => {
	before(() => cy.wrap(dropFixtures(namespace)));
	afterEach(() => cy.wrap(dropFixtures(namespace)));

	it.skip('view empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}`);
		cy.get('#firstDocumentProperty').should('have.text', '');
	});

	it('edit empty state', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('textarea[name=firstDocumentProperty]').should('have.text', '');
	});

	const textInput = 'Long text';

	it('can set large text', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('textarea[name=firstDocumentProperty]').type(textInput);
		save();
		cy.get('#firstDocumentProperty').should('have.text', textInput);
	});

	it('can update large text', () => {
		cy.wrap(
			executeQuery(`CREATE (:KitchenSink $props)`, {
				props: { code, firstDocumentProperty: 'previous' },
			}),
		);
		cy.visit(`/KitchenSink/${code}/edit`);
		cy.get('textarea[name=firstDocumentProperty]').type(textInput);
		save();
		cy.get('#firstDocumentProperty').should(
			'have.text',
			`previous${textInput}`,
		);
	});
});
