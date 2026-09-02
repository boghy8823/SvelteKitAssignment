import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
const baseURL = `http://localhost:${port}`;
const authSecret = process.env.AUTH_SECRET ?? 'e2e-preview-secret';

/**
 * Production preview, not `vite dev`. Lighthouse and Playwright have to see the
 * same HTML a visitor gets, including prerendered pages and the Node adapter's
 * streaming. The secret is required outside dev: without it the server refuses
 * to sign a session and the dashboard flow cannot log in.
 *
 * `localhost` rather than `127.0.0.1`: SvelteKit only drops `Secure` on cookies
 * for the hostname `localhost`, so an HTTP preview on the IP would set a cookie
 * the browser immediately throws away.
 */
const previewEnv = {
	AUTH_SECRET: authSecret,
	ORIGIN: baseURL,
	PORT: String(port)
};

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
	timeout: 30_000,
	expect: {
		timeout: 10_000,
		toHaveScreenshot: {
			animations: 'disabled',
			caret: 'hide'
		}
	},
	use: {
		baseURL,
		...devices['Desktop Chrome'],
		// Local machines often have Chrome already; CI installs Playwright's Chromium.
		// The two are close enough for behaviour tests. Visual snapshots run on Linux CI.
		...(process.env.CI ? {} : { channel: 'chrome' as const }),
		colorScheme: 'light',
		locale: 'en-US',
		timezoneId: 'UTC',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	webServer: {
		command:
			process.env.CI || process.env.E2E_SKIP_BUILD === '1'
				? 'node build'
				: 'pnpm build:node && node build',
		url: `${baseURL}/en`,
		reuseExistingServer: !process.env.CI,
		timeout: 180_000,
		env: previewEnv
	}
});
