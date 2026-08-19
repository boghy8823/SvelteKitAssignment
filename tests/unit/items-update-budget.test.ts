import { describe, expect, it } from 'vitest';

import type { Account } from '../../src/lib/data/account';
import { defaultItemQuery } from '../../src/lib/data/item-query';
import { items } from '../../src/lib/server/data/dataset/items';
import { applyOverlay, get, list, updateBudget } from '../../src/lib/server/data/items.repo';
import type { Overlay } from '../../src/lib/server/data/overlay';

const editor: Account = {
	id: 'demo_editor',
	email: 'editor@demo.test',
	name: 'Erin Editor',
	role: 'editor'
};

const viewer: Account = { ...editor, id: 'demo_viewer', role: 'viewer' };

const target = items[0];

function command(overrides: Partial<Parameters<typeof updateBudget>[0]> = {}) {
	return {
		id: target.id,
		budget: 4242,
		expectedUpdatedAt: target.updatedAt,
		...overrides
	};
}

describe('items.repo.updateBudget', () => {
	it('returns the updated row and an overlay carrying the edit', async () => {
		const result = await updateBudget(command(), editor);

		expect(result.ok).toBe(true);

		if (result.ok) {
			expect(result.data.item.budget).toBe(4242);
			expect(result.data.overlay[target.id].budget).toBe(4242);
		}
	});

	it('stamps a new updatedAt, so the next edit has something to compare against', async () => {
		const now = new Date('2026-08-19T12:00:00.000Z');
		const result = await updateBudget(command(), editor, {}, now);

		expect(result.ok && result.data.item.updatedAt).toBe(now.toISOString());
	});

	it('never mutates the provided dataset', async () => {
		const before = target.budget;
		await updateBudget(command({ budget: before + 1 }), editor);

		// The dataset is shared by every request on this server. A write that
		// touched it would leak one reviewer's edit into everyone else's response.
		expect(items[0].budget).toBe(before);
	});

	it('refuses a viewer, whatever the form said', async () => {
		const result = await updateBudget(command(), viewer);

		expect(result.ok).toBe(false);
		expect(!result.ok && result.error.kind).toBe('forbidden');
	});

	it('refuses an anonymous request', async () => {
		const result = await updateBudget(command(), null);

		expect(!result.ok && result.error.kind).toBe('forbidden');
	});

	it('reports a missing row rather than inventing one', async () => {
		const result = await updateBudget(command({ id: 'itm_nope' }), editor);

		expect(!result.ok && result.error.kind).toBe('not-found');
	});

	it('refuses a stale write and hands back the row as it now stands', async () => {
		const result = await updateBudget(
			command({ expectedUpdatedAt: '2020-01-01T00:00:00.000Z' }),
			editor
		);

		expect(!result.ok && result.error.kind).toBe('conflict');

		if (!result.ok && result.error.kind === 'conflict') {
			// The UI shows both numbers, so the error has to carry the current one.
			expect(result.error.current.updatedAt).toBe(target.updatedAt);
		}
	});

	it('compares against the overlay, not the original, once a row has been edited', async () => {
		const first = await updateBudget(command({ budget: 100 }), editor);

		if (!first.ok) {
			throw new Error('expected the first write to succeed');
		}

		// A second edit sending the *original* timestamp is stale: the row moved
		// when the first edit landed.
		const stale = await updateBudget(command({ budget: 200 }), editor, first.data.overlay);
		expect(!stale.ok && stale.error.kind).toBe('conflict');

		const fresh = await updateBudget(
			command({ budget: 200, expectedUpdatedAt: first.data.item.updatedAt }),
			editor,
			first.data.overlay
		);
		expect(fresh.ok).toBe(true);
	});
});

describe('overlay applied to reads', () => {
	const overlay: Overlay = {
		[target.id]: { budget: 7_777_777, updatedAt: '2026-08-19T12:00:00.000Z' }
	};

	it('returns the edited value from get', async () => {
		await expect(get(target.id, overlay)).resolves.toMatchObject({ budget: 7_777_777 });
	});

	it('leaves an unedited row untouched', () => {
		expect(applyOverlay(items[1], overlay)).toBe(items[1]);
	});

	it('sorts by the edited value, not the stored one', async () => {
		// Overlay before sort is the whole point: an edited budget that sorted by
		// its old number would put the row somewhere the reader cannot explain.
		const page = await list(
			{ ...defaultItemQuery, sort: 'budget', direction: 'desc', pageSize: 5 },
			overlay
		);

		expect(page.rows[0].id).toBe(target.id);
		expect(page.rows[0].budget).toBe(7_777_777);
	});

	it('does not change which rows match a filter', async () => {
		// No filter reads `budget`, so an edit cannot move a row in or out of a
		// result set — which is what makes the eager page count still correct.
		const [plain, edited] = await Promise.all([
			list({ ...defaultItemQuery, status: ['active'] }),
			list({ ...defaultItemQuery, status: ['active'] }, overlay)
		]);

		expect(edited.total).toBe(plain.total);
	});
});
