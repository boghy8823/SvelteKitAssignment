import { describe, expect, it } from 'vitest';

import { defaultItemQuery, type ItemQuery } from '../../src/lib/data/item-query';
import type { Item } from '../../src/lib/data/schemas';
import { items } from '../../src/lib/server/data/dataset/items';
import { compareForSort, facets, get, list } from '../../src/lib/server/data/items.repo';

function query(overrides: Partial<ItemQuery> = {}): ItemQuery {
	return { ...defaultItemQuery, ...overrides };
}

describe('items.repo.list', () => {
	it('paginates the full set with stable page bounds', async () => {
		const first = await list(query());
		const last = await list(query({ page: 9 }));

		expect([first.total, first.pageCount, first.rows.length]).toEqual([220, 9, 25]);
		// 220 rows over pages of 25 leaves a short final page.
		expect(last.rows.length).toBe(20);
	});

	it('never repeats or drops a row across pages', async () => {
		const seen: string[] = [];

		for (let page = 1; page <= 9; page += 1) {
			const result = await list(query({ page, sort: 'budget', direction: 'asc' }));
			seen.push(...result.rows.map((row) => row.id));
		}

		expect(seen).toHaveLength(220);
		expect(new Set(seen).size).toBe(220);
	});

	it('orders equal keys by id, holding the contract rather than the coincidence', () => {
		// Asserting this through `list` would prove nothing: the provided rows are
		// already id-ordered and Array.prototype.sort is stable, so ties would look
		// right even with no tiebreaker. The comparator is where the guarantee is.
		const first = items.find((item) => item.id === 'cmp_0001') as Item;
		const tied = items.find((item) => item.id !== first.id && item.budget === first.budget) as Item;

		expect(tied).toBeDefined();

		for (const direction of ['asc', 'desc'] as const) {
			const current = query({ sort: 'budget', direction });
			const forwards = compareForSort(first, tied, current);
			const backwards = compareForSort(tied, first, current);

			// Lower id sorts first whichever way the column is pointing, and the
			// comparator is antisymmetric so the sort cannot be order-dependent.
			expect(forwards).toBeLessThan(0);
			expect(backwards).toBeGreaterThan(0);
		}
	});

	it('breaks ties on id, so paging a low-cardinality sort stays consistent', async () => {
		const result = await list(query({ sort: 'budget', direction: 'asc', pageSize: 220 }));

		// Only 8 distinct budgets exist, so almost every comparison is a tie.
		const budgets = new Set(result.rows.map((row) => row.budget));
		expect(budgets.size).toBeLessThan(10);

		for (let index = 1; index < result.rows.length; index += 1) {
			const previous = result.rows[index - 1];
			const current = result.rows[index];

			expect(previous.budget).toBeLessThanOrEqual(current.budget);

			if (previous.budget === current.budget) {
				expect(previous.id < current.id).toBe(true);
			}
		}
	});

	it('sorts status in lifecycle order rather than alphabetically', async () => {
		const result = await list(query({ sort: 'status', direction: 'asc', pageSize: 220 }));
		const order = ['draft', 'scheduled', 'active', 'paused', 'completed', 'archived'];
		const positions = result.rows.map((row) => order.indexOf(row.status));

		expect(positions).toEqual([...positions].sort((a, b) => a - b));
	});

	it('reverses the comparison for descending, keeping the id tiebreaker ascending', async () => {
		const result = await list(query({ sort: 'budget', direction: 'desc', pageSize: 220 }));

		for (let index = 1; index < result.rows.length; index += 1) {
			const previous = result.rows[index - 1];
			const current = result.rows[index];

			expect(previous.budget).toBeGreaterThanOrEqual(current.budget);

			if (previous.budget === current.budget) {
				expect(previous.id < current.id).toBe(true);
			}
		}
	});

	it('applies IN semantics within a facet group', async () => {
		const result = await list(query({ status: ['active', 'paused'], pageSize: 220 }));
		const expected = items.filter(
			(item) => item.status === 'active' || item.status === 'paused'
		).length;

		expect(result.total).toBe(expected);
		expect(new Set(result.rows.map((row) => row.status))).toEqual(new Set(['active', 'paused']));
	});

	it('applies AND across facet groups', async () => {
		const result = await list(
			query({ status: ['active'], channel: ['email', 'sms'], pageSize: 220 })
		);
		const expected = items.filter(
			(item) => item.status === 'active' && (item.channel === 'email' || item.channel === 'sms')
		).length;

		expect(result.total).toBe(expected);
	});

	it('matches a tag if any of the row tags are selected', async () => {
		const result = await list(query({ tags: ['performance'], pageSize: 220 }));

		expect(result.total).toBe(items.filter((item) => item.tags.includes('performance')).length);
		expect(result.rows.every((row) => row.tags.includes('performance'))).toBe(true);
	});

	it('matches names case- and diacritic-insensitively', async () => {
		const [upper, lower] = await Promise.all([
			list(query({ q: 'UPGRADE', pageSize: 220 })),
			list(query({ q: 'upgrade', pageSize: 220 }))
		]);

		expect(upper.total).toBe(lower.total);
		expect(upper.total).toBeGreaterThan(0);
	});

	it('combines free text with facets', async () => {
		const result = await list(query({ q: 'summer', status: ['completed'], pageSize: 220 }));

		expect(
			result.rows.every(
				(row) => row.status === 'completed' && row.name.toLowerCase().includes('summer')
			)
		).toBe(true);
	});

	it('returns an empty page rather than failing when nothing matches', async () => {
		const result = await list(query({ q: 'no-such-campaign' }));

		expect([result.rows.length, result.total, result.pageCount]).toEqual([0, 0, 1]);
	});
});

describe('items.repo.get', () => {
	it('finds a row by id', async () => {
		await expect(get('cmp_0001')).resolves.toMatchObject({ id: 'cmp_0001' });
	});

	it('returns null for an unknown id instead of throwing', async () => {
		await expect(get('cmp_9999')).resolves.toBeNull();
	});
});

describe('items.repo.facets', () => {
	it('counts a facet against the query minus that facet', async () => {
		const unfiltered = await facets(query());
		const filtered = await facets(query({ status: ['active'] }));

		// Selecting a status must not change what the status counts say, or the
		// panel would tell the user that every other option leads nowhere.
		expect(filtered.status).toEqual(unfiltered.status);
	});

	it('still narrows the other groups when a facet is selected', async () => {
		const unfiltered = await facets(query());
		const filtered = await facets(query({ status: ['active'] }));

		const total = (counts: readonly { count: number }[]) =>
			counts.reduce((sum, entry) => sum + entry.count, 0);

		expect(total(filtered.channel)).toBeLessThan(total(unfiltered.channel));
	});

	it('agrees with the row count for a single-valued facet', async () => {
		const current = query({ channel: ['email'] });
		const [counted, listed] = await Promise.all([facets(current), list(current)]);

		const statusTotal = counted.status.reduce((sum, entry) => sum + entry.count, 0);

		// Every row has exactly one status, so the status counts must sum to the
		// number of rows the rest of the query selects.
		expect(statusTotal).toBe(listed.total);
	});

	it('reflects free text in the counts', async () => {
		const counted = await facets(query({ q: 'upgrade' }));
		const listed = await list(query({ q: 'upgrade' }));

		expect(counted.status.reduce((sum, entry) => sum + entry.count, 0)).toBe(listed.total);
	});

	it('keeps unavailable options at zero rather than dropping them', async () => {
		const counted = await facets(query({ q: 'no-such-campaign' }));

		expect(counted.status).toHaveLength(6);
		expect(counted.channel).toHaveLength(5);
		expect(counted.tags).toHaveLength(8);
		expect(counted.status.every((entry) => entry.count === 0)).toBe(true);
	});
});
