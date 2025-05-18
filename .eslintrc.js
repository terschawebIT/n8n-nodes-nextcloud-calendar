/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	root: true,

	env: {
		node: true,
	},

	parser: '@typescript-eslint/parser',

	parserOptions: {
		sourceType: 'module',
	},

	plugins: ['@typescript-eslint', 'eslint-plugin-n8n-nodes-base'],

	extends: [
		'plugin:@typescript-eslint/recommended',
		'plugin:n8n-nodes-base/community',
	],

	rules: {
		'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
		'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
		'n8n-nodes-base/node-execute-block-missing-continue-on-fail': 'off',
		'@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-empty-function': 'off',
	},

	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			parser: 'jsonc-eslint-parser',
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'error',
			},
		},
	],
};
