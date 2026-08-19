import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import DialogHarness from './DialogHarness.svelte';

function dialogElement(): HTMLDialogElement {
	const element = document.querySelector('dialog');

	if (!element) {
		throw new Error('No dialog rendered');
	}

	return element;
}

describe('Dialog', () => {
	it('opens as a modal and moves focus inside', async () => {
		render(DialogHarness);

		await page.getByTestId('open').click();

		expect(dialogElement().open).toBe(true);
		expect(dialogElement().contains(document.activeElement)).toBe(true);
	});

	it('refuses focus on background controls while open', async () => {
		render(DialogHarness);

		const trigger = page.getByTestId('open').element();
		const backgroundControl = page.getByTestId('background-control').element();

		await page.getByTestId('open').click();

		// A modal dialog puts everything outside it in the inert subtree, so even
		// a direct focus() call is refused. That is the mechanism the focus trap
		// rests on, rather than a keydown handler counting focusable elements.
		if (backgroundControl instanceof HTMLElement) {
			backgroundControl.focus();
		}

		if (trigger instanceof HTMLElement) {
			trigger.focus();
		}

		expect(document.activeElement).not.toBe(backgroundControl);
		expect(document.activeElement).not.toBe(trigger);
	});

	it('never lets Tab land on background content', async () => {
		render(DialogHarness);

		await page.getByTestId('open').click();

		const background = [
			page.getByTestId('open').element(),
			page.getByTestId('background-control').element()
		];

		for (let presses = 0; presses < 6; presses += 1) {
			await userEvent.tab();

			expect(background).not.toContain(document.activeElement);
		}
	});

	it('closes on Escape and returns focus to the trigger', async () => {
		render(DialogHarness);

		const trigger = page.getByTestId('open');
		await trigger.click();

		expect(dialogElement().open).toBe(true);

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialogElement().open).toBe(false);

		expect(document.activeElement).toBe(trigger.element());
	});

	it('closes on the close control', async () => {
		render(DialogHarness);

		await page.getByTestId('open').click();
		await page.getByRole('button', { name: 'Close' }).click();

		await expect.poll(() => dialogElement().open).toBe(false);
	});

	it('dismisses on a backdrop click only when dismissible', async () => {
		const { unmount } = render(DialogHarness, { dismissible: false });

		await page.getByTestId('open').click();
		dialogElement().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await expect.poll(() => dialogElement().open).toBe(true);
		unmount();

		render(DialogHarness, { dismissible: true });

		await page.getByTestId('open').click();
		dialogElement().dispatchEvent(new MouseEvent('click', { bubbles: true }));

		await expect.poll(() => dialogElement().open).toBe(false);
	});
});
