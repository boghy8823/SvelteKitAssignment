import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

const mocksMessage = 'Mocks may only be imported from src/lib/server. Use the $mocks alias there.';

const mocksRestriction = {
	paths: [{ name: '$mocks', message: mocksMessage }],
	patterns: [
		{
			group: ['$mocks/*', '$mocks/**', '**/mocks', '**/mocks/*', '**/mocks/**'],
			message: mocksMessage
		}
	]
};

const siblingMessage = 'Features may not import sibling features.';

/**
 * @param {string} name
 * @param {string[]} siblings
 */
function featureIsolation(name, siblings) {
	return {
		files: [`src/lib/features/${name}/**`],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: mocksRestriction.paths,
					patterns: [
						...mocksRestriction.patterns,
						{
							group: siblings.flatMap((sibling) => [
								`$lib/features/${sibling}`,
								`$lib/features/${sibling}/*`,
								`$lib/features/${sibling}/**`,
								`../${sibling}`,
								`../${sibling}/*`,
								`../${sibling}/**`
							]),
							message: siblingMessage
						}
					]
				}
			]
		}
	};
}

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	{
		ignores: ['mocks/**', 'take-home-senior-frontend-sveltekit.html', 'PLAN.md']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					'ts-expect-error': 'allow-with-description',
					'ts-ignore': true,
					'ts-nocheck': true,
					'ts-check': false,
					minimumDescriptionLength: 10
				}
			]
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		files: ['src/**/*.{js,ts,svelte}'],
		ignores: ['src/lib/server/**'],
		rules: {
			'no-restricted-imports': ['error', mocksRestriction]
		}
	},
	{
		files: ['src/lib/ui/**'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: mocksRestriction.paths,
					patterns: [
						...mocksRestriction.patterns,
						{
							group: [
								'$lib/features',
								'$lib/features/*',
								'$lib/features/**',
								'../features',
								'../features/*',
								'../features/**'
							],
							message: 'lib/ui may not import lib/features.'
						}
					]
				}
			]
		}
	},
	featureIsolation('blog', ['search', 'items']),
	featureIsolation('search', ['blog', 'items']),
	featureIsolation('items', ['blog', 'search'])
);
