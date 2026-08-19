import { describe, expect, it } from 'vitest';

import { defaultItemQuery, type ItemQuery } from '../../src/lib/data/item-query';
import { list, pageMeta } from '../../src/lib/server/data/items.repo';

function query(overrides: Partial<ItemQuery> = {}): ItemQuery {
	return { ...defaultItemQuery, ...overrides };
}

describe('items.repo.pageMeta', () => {
	it('agrees with the rows it is meant to describe', async () => {
		// The table sizes its skeleton from this while the rows are still in flight.
		// If the two disagree, streaming becomes a layout shift.
		const cases = [query(), query({ page: 2 }), query({ page: 9 }), query({ q: 'summer' })];

		for (const candidate of cases) {
			const [meta, page] = await Promise.all([pageMeta(candidate), list(candidate)]);

			expect({ ...meta, rows: page.rows.length }).toEqual({
				page: page.page,
				pageSize: page.pageSize,
				pageCount: page.pageCount,
				total: page.total,
				from: page.from,
				to: page.to,
				rows: page.to - page.from
			});
		}
	});

	it('counts the filtered set, not the whole dataset', async () => {
		const filtered = await pageMeta(query({ status: ['active'] }));

		expect(filtered.total).toBeGreaterThan(0);
		expect(filtered.total).toBeLessThan(220);
	});

	it('reports a short last page, which is where a fixed skeleton guess would shift', async () => {
		const last = await pageMeta(query({ page: 9 }));

		expect(last.total).toBe(220);
		expect(last.to - last.from).toBe(220 - 8 * 25);
	});

	it('clamps a page past the end instead of describing rows that do not exist', async () => {
		const meta = await pageMeta(query({ page: 500 }));

		expect(meta.page).toBe(meta.pageCount);
		expect(meta.to).toBeLessThanOrEqual(meta.total);
	});

	it('describes an empty result without going negative', async () => {
		const meta = await pageMeta(query({ q: 'no-campaign-is-called-this' }));

		expect([meta.total, meta.to - meta.from]).toEqual([0, 0]);
	});
});
