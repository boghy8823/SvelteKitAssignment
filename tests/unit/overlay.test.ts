import { describe, expect, it } from 'vitest';

import {
	MAX_OVERLAY_ENTRIES,
	withEntry,
	type Overlay,
	type OverlayEntry
} from '../../src/lib/server/data/overlay';

function entry(budget: number): OverlayEntry {
	return { budget, updatedAt: '2026-08-19T10:00:00.000Z' };
}

function overlayOf(count: number): Overlay {
	const built: Overlay = {};

	for (let index = 0; index < count; index += 1) {
		built[`itm_${index}`] = entry(1000 + index);
	}

	return built;
}

describe('withEntry', () => {
	it('adds an edit', () => {
		expect(withEntry({}, 'itm_1', entry(500))).toEqual({ itm_1: entry(500) });
	});

	it('replaces an edit for a row that already has one', () => {
		const twice = withEntry(withEntry({}, 'itm_1', entry(500)), 'itm_1', entry(900));

		expect(Object.keys(twice)).toHaveLength(1);
		expect(twice.itm_1.budget).toBe(900);
	});

	it('leaves other rows alone', () => {
		const overlay = withEntry(withEntry({}, 'itm_1', entry(500)), 'itm_2', entry(700));

		expect(overlay.itm_1.budget).toBe(500);
	});

	it('caps the number of entries', () => {
		const overflowing = withEntry(overlayOf(MAX_OVERLAY_ENTRIES), 'itm_new', entry(42));

		expect(Object.keys(overflowing)).toHaveLength(MAX_OVERLAY_ENTRIES);
		expect(overflowing.itm_new).toBeDefined();
	});

	it('evicts the oldest edit, not the newest', () => {
		const overflowing = withEntry(overlayOf(MAX_OVERLAY_ENTRIES), 'itm_new', entry(42));

		expect(overflowing.itm_0).toBeUndefined();
		expect(overflowing.itm_1).toBeDefined();
	});

	it('treats re-editing as recent, so an active row is not the first evicted', () => {
		// Insertion order is the eviction order, so an edit to an existing row has
		// to move it to the end or the row someone is working on gets dropped.
		const touched = withEntry(overlayOf(MAX_OVERLAY_ENTRIES), 'itm_0', entry(99));
		const overflowing = withEntry(touched, 'itm_new', entry(42));

		expect(overflowing.itm_0?.budget).toBe(99);
		expect(overflowing.itm_1).toBeUndefined();
	});

	it('stays inside the 4 KB a cookie allows, with the signature counted', () => {
		// The cap exists for this reason, so the reason is the assertion. Ids and
		// timestamps are the real ones' length; the signature is 43 base64 chars
		// plus a separator, and base64 costs a third on top of the payload.
		const full: Overlay = {};

		for (let index = 0; index < MAX_OVERLAY_ENTRIES; index += 1) {
			full[`itm_${String(index).padStart(4, '0')}`] = {
				budget: 9_999_999,
				updatedAt: '2026-08-19T10:00:00.000Z'
			};
		}

		const payload = JSON.stringify(full);
		const signed = Math.ceil((payload.length * 4) / 3) + 44;

		expect(signed).toBeLessThan(4096);
	});
});
