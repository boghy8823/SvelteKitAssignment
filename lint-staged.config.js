/** @type {import('lint-staged').Configuration} */
const config = {
	// Prettier first, so ESLint sees the same wrapping CI will. `eslint-disable-next-line`
	// on a one-line `<a href>` is a different line after Prettier breaks the tag.
	'*.{js,cjs,ts,svelte}': ['prettier --write', 'eslint --fix'],
	'*.{json,md,css,html,yml,yaml}': 'prettier --write'
};

export default config;
