import { expect, test } from '@playwright/test';

test('anonymous search reaches a matching post', async ({ page }) => {
	await page.goto('/en/search');

	await expect(page.getByRole('heading', { level: 1, name: 'Search' })).toBeVisible();

	const search = page.getByRole('searchbox', { name: 'Search' });

	await search.fill('LCP');
	await page.getByRole('button', { name: 'Search' }).click();
	await expect(page).toHaveURL(/[?&]q=LCP/);

	const result = page.getByRole('link', { name: 'Sub-second LCP on a content site' });

	await expect(result).toBeVisible();
	await result.click();

	await expect(page).toHaveURL(/\/en\/blog\/sub-second-lcp-on-a-content-site$/);
	await expect(
		page.getByRole('heading', { level: 1, name: 'Sub-second LCP on a content site' })
	).toBeVisible();
	await expect(page.getByRole('article')).toBeVisible();
});
