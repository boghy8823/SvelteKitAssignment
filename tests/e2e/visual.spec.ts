import { expect, test } from '@playwright/test';

test('login page matches the visual snapshot', async ({ page }) => {
	// Font rasterisation differs across OS. The snapshot is recorded on the same
	// Linux image CI uses, so a local Windows run would be a false failure.
	test.skip(process.platform !== 'linux', 'Visual snapshots are recorded on Linux CI');

	await page.goto('/en/login');
	await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
	await page.evaluate(() => document.fonts.ready);

	await expect(page).toHaveScreenshot('login.png', {
		fullPage: true
	});
});
