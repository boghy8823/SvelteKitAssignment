import process from 'node:process';

import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';
import type { Adapter } from '@sveltejs/kit';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

/**
 * Vercel is the deploy target; the Node build exists so CI and Lighthouse can
 * serve a real production build without Vercel credentials. Both are kept
 * buildable so the adapter seam cannot rot unnoticed.
 */
function resolveAdapter(target: string): Adapter {
	switch (target) {
		case 'vercel':
			return vercel();
		case 'node':
			return node();
		default:
			throw new Error(`Unknown BUILD_ADAPTER "${target}". Expected "vercel" or "node".`);
	}
}

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: resolveAdapter(process.env.BUILD_ADAPTER ?? 'vercel')
		})
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['tests/unit/**/*.test.ts']
				}
			}
		]
	}
});
