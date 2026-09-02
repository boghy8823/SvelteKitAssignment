import { expect, type Locator, type Page } from '@playwright/test';

/** Published demo account that can edit dashboard rows. */
export const editor = {
	email: 'editor@demo.test',
	password: 'demo1234'
} as const;

/** Matches `createFormatters('en').currency` — whole dollars, en-US, USD. */
export function formatBudget(value: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	}).format(value);
}

export async function signIn(page: Page, account = editor): Promise<void> {
	await page.goto('/en/login');
	await page.getByLabel('Email').fill(account.email);
	await page.getByLabel('Password').fill(account.password);
	await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/en\/dashboard/);
}

export async function openCampaigns(page: Page): Promise<void> {
	await page.goto('/en/dashboard/items');
	await expect(page.getByRole('heading', { level: 1, name: 'Campaigns' })).toBeVisible();
	await expect(page.locator('[data-item-id]').first()).toBeVisible();
}

export function campaignRow(page: Page, index = 0): Locator {
	return page.locator('[data-item-id]').nth(index);
}

export function budgetCell(row: Locator): Locator {
	return row.locator('td').nth(4);
}

/**
 * SvelteKit serialises action data with devalue. A flat string record becomes
 * this array form, which `deserialize()` on the client round-trips back into
 * the object the page branches on.
 */
export function actionFailureBody(data: Record<string, string>): string {
	const keys = Object.keys(data);
	const template: Record<string, number> = {};
	const values: string[] = [];

	for (const [index, key] of keys.entries()) {
		template[key] = index + 1;
		const value = data[key];

		if (value === undefined) {
			throw new Error(`Missing value for "${key}"`);
		}

		values.push(value);
	}

	return JSON.stringify({
		type: 'failure',
		status: 500,
		data: JSON.stringify([template, ...values])
	});
}
