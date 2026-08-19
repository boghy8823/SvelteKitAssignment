import { describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';

import ComboboxHarness from './ComboboxHarness.svelte';

/*
 * In a real browser, because every claim here is about something jsdom
 * approximates: which element holds DOM focus, what `aria-activedescendant`
 * points at after a filter shrinks the list, and whether a pointerdown outside
 * dismisses before the click lands.
 */

function input(): HTMLInputElement {
	const element = page.getByRole('combobox').element();

	if (!(element instanceof HTMLInputElement)) {
		throw new Error('No combobox input rendered');
	}

	return element;
}

/** The option `aria-activedescendant` currently names. */
function activeOption(): HTMLElement | null {
	const id = input().getAttribute('aria-activedescendant');

	return id ? document.getElementById(id) : null;
}

/** Opens the popup and leaves the first option active, which is where every
 * keyboard assertion below starts from. */
async function open() {
	await page.getByRole('combobox').click();
}

describe('Combobox', () => {
	it('stays closed until asked', async () => {
		render(ComboboxHarness);

		expect(input().getAttribute('aria-expanded')).toBe('false');
		expect(page.getByRole('listbox').elements()).toHaveLength(0);
	});

	it('opens on ArrowDown and keeps DOM focus on the input', async () => {
		render(ComboboxHarness);

		input().focus();
		await userEvent.keyboard('{ArrowDown}');

		// The premise of the virtual-focus pattern: the listbox is open, the active
		// option is announced through aria-activedescendant, and the text field
		// never gives up the keyboard.
		expect(input().getAttribute('aria-expanded')).toBe('true');
		expect(document.activeElement).toBe(input());
		expect(activeOption()?.textContent).toContain('Draft');
	});

	it('opens on ArrowUp at the last option, as a native picker does', async () => {
		render(ComboboxHarness);

		input().focus();
		await userEvent.keyboard('{ArrowUp}');

		await expect.poll(() => activeOption()?.textContent).toContain('Archived');
	});

	it('moves the active option with the arrow keys without moving focus', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{ArrowDown}{ArrowDown}');

		expect(activeOption()?.textContent).toContain('Active');
		expect(document.activeElement).toBe(input());
	});

	it('jumps to the ends with Home and End', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{End}');
		expect(activeOption()?.textContent).toContain('Archived');

		await userEvent.keyboard('{Home}');
		expect(activeOption()?.textContent).toContain('Draft');
	});

	it('clamps a page jump to the ends of the list', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{PageDown}');
		expect(activeOption()?.textContent).toContain('Archived');

		await userEvent.keyboard('{PageUp}');
		expect(activeOption()?.textContent).toContain('Draft');
	});

	it('toggles the active option with Enter and reports it upward', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{Enter}');

		await expect.element(page.getByTestId('selected')).toHaveTextContent('draft');
		expect(activeOption()?.getAttribute('aria-selected')).toBe('true');
	});

	it('keeps the popup open across a toggle, so a second facet costs no reopen', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{Enter}{ArrowDown}{Enter}');

		await expect.element(page.getByTestId('selected')).toHaveTextContent('draft,scheduled');
		expect(input().getAttribute('aria-expanded')).toBe('true');
	});

	it('deselects on a second toggle', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{Enter}{Enter}');

		await expect.element(page.getByTestId('selected')).toHaveTextContent('');
		await expect.element(page.getByTestId('changes')).toHaveTextContent('2');
	});

	it('filters as you type, which is what makes a separate typeahead redundant', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.fill(input(), 'act');

		await expect.poll(() => page.getByRole('option').elements().length).toBe(1);
		expect(page.getByRole('option').elements()[0].textContent).toContain('Active');
	});

	it('matches without diacritics, so an ASCII keyboard reaches every label', async () => {
		render(ComboboxHarness, {
			options: [
				{ value: 'a11y', label: 'Barrierefreiheit', count: 2 },
				{ value: 'dev', label: 'Entwicklung', count: 9 }
			]
		});

		await open();
		await userEvent.fill(input(), 'barrierefrei');

		await expect.poll(() => page.getByRole('option').elements().length).toBe(1);
	});

	it('never points at an option the filter removed', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{End}');
		expect(activeOption()?.textContent).toContain('Archived');

		// The list shrinks under the active index; a stale aria-activedescendant
		// would name an element that no longer exists, which is the classic bug in
		// this pattern.
		await userEvent.fill(input(), 'act');

		await expect.poll(() => activeOption()?.textContent).toContain('Active');
	});

	it('says how many options are listed, so narrowing is audible', async () => {
		render(ComboboxHarness);

		await open();
		await expect.poll(() => document.body.textContent).toContain('6 options');

		await userEvent.fill(input(), 'arch');
		await expect.poll(() => document.body.textContent).toContain('1 options');
	});

	it('keeps a zero-count facet listed rather than letting it vanish', async () => {
		render(ComboboxHarness);

		await open();

		const completed = page
			.getByRole('option')
			.elements()
			.find((option) => option.textContent?.includes('Completed'));

		expect(completed?.textContent).toContain('0');
	});

	it('closes on Escape and clears the filter, keeping what was committed', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.keyboard('{Enter}');
		await userEvent.fill(input(), 'act');
		await userEvent.keyboard('{Escape}');

		await expect.poll(() => input().getAttribute('aria-expanded')).toBe('false');
		expect(input().value).toBe('');

		// Escape reverts the transient filter text. The selection was already
		// committed, and undoing a committed change is what the back button is for.
		await expect.element(page.getByTestId('selected')).toHaveTextContent('draft');
	});

	it('closes when Tab takes focus out of the widget', async () => {
		render(ComboboxHarness);

		await open();
		await userEvent.tab();

		await expect.poll(() => input().getAttribute('aria-expanded')).toBe('false');
		expect(document.activeElement).not.toBe(input());
	});

	it('dismisses on a pointer press outside itself', async () => {
		render(ComboboxHarness);

		await open();
		await page.getByTestId('outside').click();

		await expect.poll(() => input().getAttribute('aria-expanded')).toBe('false');
	});

	it('toggles on a click without stealing focus from the input', async () => {
		render(ComboboxHarness);

		await open();
		await page.getByRole('option', { name: /Active/ }).click();

		await expect.element(page.getByTestId('selected')).toHaveTextContent('active');
		expect(document.activeElement).toBe(input());
	});

	it('declares itself multi-selectable, which is what tells Enter to toggle', async () => {
		render(ComboboxHarness);

		await open();

		expect(page.getByRole('listbox').element().getAttribute('aria-multiselectable')).toBe('true');
	});
});
