import { describe, expect, it } from 'vitest';

import { parseFault } from '../../src/lib/server/data/fault';

describe('parseFault', () => {
	it('is inert when the query is empty', () => {
		expect(parseFault('')).toEqual({ latencyMs: 0, rows: false, facets: false, write: false });
	});

	it('turns named directives into the flags the load honours', () => {
		expect(parseFault('slow,rows,facets,write')).toEqual({
			latencyMs: 1500,
			rows: true,
			facets: true,
			write: true
		});
	});

	it('ignores a typo rather than rejecting the rest', () => {
		// A debugging affordance should not 500 a page because one word was wrong.
		expect(parseFault('rows,nope')).toEqual({
			latencyMs: 0,
			rows: true,
			facets: false,
			write: false
		});
	});
});
