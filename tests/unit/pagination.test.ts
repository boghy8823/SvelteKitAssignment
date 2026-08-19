import { describe, expect, it } from 'vitest';

import { resolvePage } from '../../src/lib/data/pagination';

describe('resolvePage', () => {
	it('computes bounds for a middle page', () => {
		expect(resolvePage(220, 3, 25)).toEqual({
			page: 3,
			pageSize: 25,
			pageCount: 9,
			total: 220,
			from: 50,
			to: 75
		});
	});

	it('stops the last page at the row count', () => {
		const { from, to, pageCount } = resolvePage(220, 9, 25);

		expect([from, to, pageCount]).toEqual([200, 220, 9]);
	});

	it('clamps a page past the end instead of throwing, so a stale URL degrades', () => {
		expect(resolvePage(20, 99, 6).page).toBe(4);
	});

	it.each([0, -3, Number.NaN, Number.POSITIVE_INFINITY])('clamps %o up to page 1', (requested) => {
		expect(resolvePage(20, requested, 6).page).toBe(1);
	});

	it('reports one empty page when there are no rows', () => {
		expect(resolvePage(0, 1, 25)).toEqual({
			page: 1,
			pageSize: 25,
			pageCount: 1,
			total: 0,
			from: 0,
			to: 0
		});
	});

	it('survives a nonsense page size rather than dividing by zero', () => {
		expect(resolvePage(10, 1, 0).pageSize).toBe(1);
	});
});
