const { h, Fragment } = require('preact');
const { getEnums } = require('@financial-times/tc-schema-sdk');
const logger = require('@financial-times/lambda-logger');
const { Concept, SectionHeader } = require('./components/structure');

const { SaveButton, CancelButton } = require('./components/buttons');
const { FormError } = require('./components/messages');

const { assignComponent } = require('../lib/assign-component');

const getValue = (itemSchema, itemValue) => {
	// preserves boolean values to prevent false being coerced to empty string
	if (itemSchema.type === 'Boolean') {
		return typeof itemValue === 'boolean' ? itemValue : '';
	}

	// return relationships as type, code and name object
	if (itemSchema.relationship) {
		if (itemSchema.hasMany) {
			return itemValue
				? itemValue.map(item => ({
						type: itemSchema.type,
						code: item.code,
						name: item.name || item.code,
				  }))
				: [];
		}
		return itemValue
			? {
					type: itemSchema.type,
					code: itemValue.code,
					name: itemValue.name || itemValue.code,
			  }
			: null;
	}

	// everything else is just text
	return itemValue;
};

const PropertyInputs = ({ fields, data, isEdit, type }) => {
	let fieldsToLock;
	let lockedBy;
	const lockedFieldsErrorMessage = 'Failed to parse _lockedFields';
	const propertyfields = Object.entries(fields);

	try {
		fieldsToLock = data._lockedFields ? JSON.parse(data._lockedFields) : {};
	} catch (error) {
		logger.error(
			{
				error,
				nodeType: type,
				code: data.code,
				_lockedFields: data._lockedFields,
				event: 'LOCKED_FIELDS_PARSE_ERROR',
			},
			lockedFieldsErrorMessage,
		);
		throw new Error(
			`${lockedFieldsErrorMessage} ${data._lockedFields}. ${error}`,
		);
	}

	const fieldNamesToLock = Object.keys(fieldsToLock).filter(
		fieldName => fieldsToLock[fieldName] !== 'biz-ops-admin',
	);

	return propertyfields
		.filter(
			([, schema]) =>
				// HACK: need to get rid of fields that are doing this
				!schema.label.includes('deprecated') &&
				!schema.deprecationReason,
		)
		.map(([name, item]) => {
			lockedBy = null;
			if (fieldNamesToLock.includes(name)) {
				lockedBy = fieldsToLock[name];
			}
			const { EditComponent } = assignComponent(item.type);
			const viewModel = {
				propertyName: name,
				value: getValue(item, data[name]),
				dataType: item.type,
				parentType: type,
				options: getEnums()[item.type]
					? Object.keys(getEnums()[item.type])
					: [],
				label: name.toUpperCase(),
				...item,
				isEdit,
				lockedBy,
			};

			return viewModel.propertyName && viewModel.label ? (
				<EditComponent {...viewModel} />
			) : null;
		});
};

const EditForm = ({ schema, data, isEdit, error, type, code }) => {
	const getAction = () => {
		return isEdit
			? `/${type}/${encodeURIComponent(code)}/edit`
			: `/${type}/create`;
	};

	return (
		<Fragment>
			<form
				className="o-layout__main o-forms"
				action={getAction()}
				method="POST"
				autoComplete="off"
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
					<div className="biz-ops-cta-container--sticky o-layout__unstyled-element">
						<SaveButton
							querystring={schema.referralQs || ''}
							type={type}
							code={code}
						/>
						<CancelButton
							querystring={schema.referralQs || ''}
							type={type}
							code={code}
						/>
					</div>
					{Object.entries(schema.fieldsets).map(
						([name, { heading, properties }]) => (
							<fieldset
								className={`fieldset-biz-ops fieldset-${name}`}
							>
								<div className="o-layout-typography">
									<SectionHeader title={heading} />
								</div>
								<PropertyInputs
									fields={properties}
									data={data}
									isEdit={isEdit}
									type={type}
								/>
							</fieldset>
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
		</Fragment>
	);
};

module.exports = EditForm;