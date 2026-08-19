import process from 'node:process';

import node from '@sveltejs/adapter-node';
import vercel from '@sveltejs/adapter-vercel';
import type { Adapter } from '@sveltejs/kit';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { playwright } from '@vitest/browser-playwright';
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
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The provided dataset stays byte-identical at the repo root. Reaching it
			// through an alias makes the boundary explicit, and ESLint restricts the
			// alias to src/lib/server so nothing else can import it.
			alias: { $mocks: 'mocks' },
			prerender: {
				// Prerendering is driven by explicit `entries`, not by following links.
				// The app links to routes that are ISR, per-request, or behind a login,
				// none of which a build-time crawler can fetch — and the same explicit
				// inventory is what generates the sitemap.
				crawl: false
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
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'component',
					// A real browser, not jsdom: focus order, Escape handling, and
					// inertness of the background are exactly the things jsdom
					// approximates, and they are the whole point of these tests.
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['tests/component/**/*.test.ts']
				}
			}
		]
	}
});
