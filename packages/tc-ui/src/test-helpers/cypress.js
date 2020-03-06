/* eslint-disable no-undef */
const {
	code,
	someDocument,
	anotherDocument,
	someString,
	someEnum,
	someInteger,
	anotherString,
	someDate,
	someDatetime,
	someUrl,
} = require('./mainTypeData.json');
const {
	dropFixtures,
	executeQuery,
} = require('../../../../test-helpers/test-fixtures');

const populateParentTypeFields = codeLabel => {
	cy.visit(`/ParentType/create`);
	cy.url().should('contain', '/ParentType/create');

	cy.get('#id-code').type(codeLabel);
};

const populateChildTypeFields = async codeLabel => {
	cy.visit(`/ChildType/create`);
	cy.url().should('contain', '/ChildType/create');

	cy.get('#id-code').type(codeLabel);
};

const pickChild = () => {
	cy.get('#children-picker') // eslint-disable-line cypress/no-unnecessary-waiting
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}')
		.should('not.be.disabled');
};

const pickFavouriteChild = (childCode = 'e2e-demo-fir') => {
	cy.get('#favouriteChild-picker') // eslint-disable-line cypress/no-unnecessary-waiting
		.type(childCode)
		.wait(500)
		.type('{downarrow}{enter}');
};

const pickCuriousChild = () => {
	cy.get('#curiousChild-picker')
		.type('e2e-demo')
		.wait(500)
		.type('{downarrow}{enter}');
};

const pickCuriousParent = () => {
	cy.get('#curiousParent-picker')
		.type('e2e-demo')
		.wait(500)
		.type('{downarrow}{enter}');
};

const visitEditPage = () => {
	cy.get('[data-button-type="edit"]').click();
	cy.url().should('contain', `/MainType/${code}/edit`);
};

const visitMainTypePage = () => {
	cy.visit(`/MainType/${code}`);
	cy.url().should('contain', `/MainType/${code}`);
};

const save = () => {
	cy.get('[data-button-type="submit"]').click();
};

const pickParent = () => {
	cy.get('#parents-picker') // eslint-disable-line cypress/no-unnecessary-waiting
		.type('e2e')
		.wait(500)
		.type('{downarrow}{enter}');
};

const populateMinimumViableFields = codeLabel => {
	// create child record
	populateChildTypeFields(`${codeLabel}-first-child`);
	save();
	// create main record
	cy.visit(`/MainType/create`);
	cy.get('input[name=code]').type(codeLabel);
	cy.get('input[name=someString]').type(someString);
	pickChild();
};

const populateNonMinimumViableFields = () => {
	visitEditPage();

	cy.get('textarea[name=someDocument]').type(someDocument);
	cy.get('textarea[name=anotherDocument]').type(anotherDocument);
	cy.get('[type="radio"]')
		.first()
		.check({ force: true });
	cy.get('select[name=someEnum]').select(someEnum);
	cy.get('#checkbox-someMultipleChoice-First').check({ force: true });
	cy.get('#checkbox-someMultipleChoice-Third').check({ force: true });
	cy.get('#checkbox-someMultipleChoice-First')
		.should('have.value', 'First')
		.should('be.checked');
	cy.get('#checkbox-someMultipleChoice-Second')
		.should('have.value', 'Second')
		.should('not.be.checked');
	cy.get('#checkbox-someMultipleChoice-Third')
		.should('have.value', 'Third')
		.should('be.checked');
	cy.get('input[name=someInteger]').type(someInteger);
	cy.get('input[name=anotherString]').type(anotherString);
	cy.get('input[name=someDate]')
		.click()
		.then(input => {
			input[0].dispatchEvent(new Event('input', { bubbles: true }));
			input.val(someDate);
		})
		.click();
	cy.get('input[name=someDatetime]')
		.click()
		.then(input => {
			input[0].dispatchEvent(new Event('input', { bubbles: true }));
			input.val(someDatetime);
		})
		.click();

	cy.get('input[name=someUrl]').type(someUrl);
};

const setPropsOnCuriousChildRel = async codeLabel => {
	const query = `MATCH (m:MainType)-[r:HAS_CURIOUS_CHILD]->(c:ChildType)
		WHERE c.code=$code
		SET r.someBoolean =true, r.someString = "lorem ipsum", r.anotherString = "another lorem ipsum", r.someInteger=2020, r.someEnum="First", r.someMultipleChoice = ["First","Third"], r.someFloat = 12.53`;
	return new Promise((resolve, reject) => {
		try {
			const result = executeQuery(query, {
				code: codeLabel,
			});
			resolve(result);
		} catch (error) {
			reject(error);
		}
	});
};

const setPropsOnCuriousParentRel = async codeLabel => {
	const query = `MATCH (m:MainType)<-[r:IS_CURIOUS_PARENT_OF]-(c:ParentType)
	WHERE c.code=$code
	SET r.someString = "parent lorem ipsum", r.anotherString="parent another lorem ipsum"`;
	return new Promise((resolve, reject) => {
		try {
			const result = executeQuery(query, {
				code: codeLabel,
			});
			resolve(result);
		} catch (error) {
			reject(error);
		}
	});
};

const populateCuriousChildRelationshipFields = () => {
	cy.get('#ul-curiousChild').then(curiousChild => {
		cy.wrap(curiousChild)
			.find('#id-someString')
			.type(someString);
		cy.wrap(curiousChild)
			.find('#id-anotherString')
			.type(anotherString);
		cy.wrap(curiousChild)
			.find('#id-someInteger')
			.type(2023);
		cy.wrap(curiousChild)
			.find('#id-someEnum')
			.select(someEnum);
		cy.wrap(curiousChild)
			.find('#checkbox-someMultipleChoice-First')
			.check({ force: true });
		cy.wrap(curiousChild)
			.find('#checkbox-someMultipleChoice-Third')
			.check({ force: true });
		cy.wrap(curiousChild)
			.find('#radio-someBoolean-Yes')
			.check({ force: true });
		cy.wrap(curiousChild)
			.find('#id-someFloat')
			.type(20.23);
	});
};

const populateCuriousParent1RelationshipFields = parent => {
	cy.wrap(parent)
		.find('#id-someString')
		.type(someString);
	cy.wrap(parent)
		.find('#id-anotherString')
		.type(anotherString);
};

const populateCuriousParent2RelationshipFields = parent => {
	cy.wrap(parent)
		.find('#id-someString')
		.type('Parent two someString');
	cy.wrap(parent)
		.find('#id-anotherString')
		.type('Parent two anotherString');
};

const setLockedRecord = codeLabel => {
	const query = `MERGE (m:MainType {code: $code})
		SET m.lockedField = "locked value 1"
		SET m.someString = "locked value 2"
		SET m.someBoolean = true
		SET m._lockedFields = '{"someString": "lock-client-1", "someBoolean": "lock-client-2"}'
	RETURN m`;
	return executeQuery(query, {
		code: codeLabel,
	});
};

const resetDb = async () => {
	await dropFixtures(code);
};

module.exports = {
	populateNonMinimumViableFields,
	populateParentTypeFields,
	populateChildTypeFields,
	pickChild,
	pickParent,
	pickFavouriteChild,
	pickCuriousChild,
	pickCuriousParent,
	visitEditPage,
	visitMainTypePage,
	save,
	populateMinimumViableFields,
	resetDb,
	setPropsOnCuriousChildRel,
	setPropsOnCuriousParentRel,
	populateCuriousChildRelationshipFields,
	populateCuriousParent1RelationshipFields,
	populateCuriousParent2RelationshipFields,
	setLockedRecord,
};