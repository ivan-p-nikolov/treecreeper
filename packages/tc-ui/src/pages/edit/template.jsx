const React = require('react');
const { rawData } = require('@financial-times/tc-schema-sdk');
const { FormError } = require('../../lib/components/messages');
const { Concept, Fieldset } = require('../../lib/components/structure');
const { SaveButton, CancelButton } = require('../../lib/components/buttons');

const PropertyInputs = ({ fields, data, type, assignComponent, hasError }) => {
	const propertyDefinitionsArray = Object.entries(fields);

	const fieldsToLock = data._lockedFields
		? JSON.parse(data._lockedFields)
		: {};

	const fieldNamesToLock = Object.keys(fieldsToLock).filter(
		fieldName => fieldsToLock[fieldName] !== 'biz-ops-admin',
	);

	return propertyDefinitionsArray
		.filter(([, { deprecationReason }]) => !deprecationReason)
		.map(([propertyName, propDef]) => {
			let lockedBy;
			if (fieldNamesToLock.includes(propertyName)) {
				lockedBy = fieldsToLock[propertyName];
			}
			const { EditComponent, AdditionalEditComponent } = assignComponent(
				propDef,
			);

			const itemValue = propDef.isRelationship
				? data[`${propertyName}_rel`] || data[propertyName]
				: data[propertyName];

			const viewModel = {
				hasError,
				parentCode: data.code,
				propertyName,
				value: itemValue,
				parentType: type,
				...propDef,
				lockedBy: propDef.lockedBy || lockedBy,
			};

			return (
				<div>
					<EditComponent {...viewModel} />
					{AdditionalEditComponent ? (
						<div className="additional-edit-component-hydration-container">
							<AdditionalEditComponent
								{...viewModel}
								entireRecord={data}
							/>
						</div>
					) : null}
				</div>
			);
		});
};

const EditForm = props => {
	const {
		schema,
		data,
		isEdit,
		error,
		type,
		code,
		querystring,
		assignComponent,
	} = props;

	return (
		<>
			<div className="o-layout__sidebar" />
			<form
				id="tc-form"
				className="o-layout__main o-forms"
				action={
					isEdit
						? `/${type}/${encodeURIComponent(code)}/edit`
						: `/${type}/create`
				}
				method="POST"
				autoComplete="off"
				data-tc-page-type={props.pageType}
				data-tc-entire-record={JSON.stringify(data)}
			>
				<div className="o-layout__main__full-span">
					{/* note we use code || data.code so that, when creating and there is no
				code in the url path, we give a nicer error */}
					<FormError
						type={type}
						code={code || data.code}
						error={error}
					/>
					<div className="o-layout-typography">
						<h1 id="record-title" className="record-title">
							{type}: {data.name || data.code}
						</h1>
					</div>
					<Concept
						name={schema.name}
						description={schema.description}
						moreInformation={schema.moreInformation}
					/>
					<div className="treecreeper-cta-container--sticky o-layout__unstyled-element">
						<SaveButton
							querystring={querystring || ''}
							type={type}
							code={code}
						/>
						<CancelButton
							querystring={querystring || ''}
							type={type}
							code={code}
						/>
					</div>
					{Object.entries(schema.fieldsets).map(
						(
							[name, { heading, properties, description }],
							index,
						) => (
							<Fieldset
								key={index}
								name={name}
								heading={heading}
								properties={properties}
								description={description}
							>
								<PropertyInputs
									hasError={!!error}
									fields={properties}
									data={data}
									type={type}
									assignComponent={assignComponent}
								/>
							</Fieldset>
						),
					)}
					<input
						name="_lockedFields"
						type="hidden"
						value={data._lockedFields}
					/>
				</div>
			</form>
			<script src="https://cloud.tinymce.com/stable/tinymce.js" defer />
			<script
				type="application/json"
				data-json="schema-data"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({ ...rawData.getAll() }),
				}}
			/>
			<script src="https://cdnjs.cloudflare.com/ajax/libs/autolinker/3.11.1/Autolinker.min.js" />
		</>
	);
};

module.exports = EditForm;
