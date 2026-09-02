import { expect, test } from '@playwright/test';

import {
	actionFailureBody,
	budgetCell,
	campaignRow,
	formatBudget,
	openCampaigns,
	signIn
} from './helpers';

test('editor can edit a budget, see the optimistic value, and watch it roll back', async ({
	page
}) => {
	await signIn(page);
	await openCampaigns(page);

	const row = campaignRow(page);
	const cell = budgetCell(row);
	const itemId = await row.getAttribute('data-item-id');

	expect(itemId).toBeTruthy();

	const original = (await cell.locator('.tabular-nums').first().textContent())?.trim() ?? '';
	const nextValue = 4242;
	const optimistic = formatBudget(nextValue);

	expect(original).not.toBe(optimistic);

	let release: (() => void) | undefined;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});

	await page.route('**/dashboard/items**', async (route) => {
		if (route.request().method() !== 'POST') {
			await route.continue();
			return;
		}

		await held;
		await route.fulfill({
			status: 500,
			contentType: 'application/json',
			headers: { 'x-sveltekit-action': 'true' },
			body: actionFailureBody({
				id: itemId ?? '',
				reason: 'unavailable'
			})
		});
	});

	await cell.getByRole('button', { name: /Edit budget/ }).click();
	await cell.locator('input[name="budget"]').fill(String(nextValue));
	await cell.getByRole('button', { name: 'Save' }).click();

	await expect(cell.getByText('Saving…')).toBeVisible();
	await expect(cell.getByText(optimistic)).toBeVisible();

	release?.();

	await expect(cell.getByText('Saving…')).toHaveCount(0);
	await expect(cell.getByText(original)).toBeVisible();
	await expect(cell.getByText(optimistic)).toHaveCount(0);

	await expect(page.getByText('Saving failed, so the change was rolled back.')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
