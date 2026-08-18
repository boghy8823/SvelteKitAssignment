/** @type {import('lint-staged').Configuration} */
const config = {
	'*.{js,ts,svelte}': ['eslint --fix', 'prettier --write'],
	'*.{json,md,css,html,yml,yaml}': 'prettier --write'
};

export default config;
