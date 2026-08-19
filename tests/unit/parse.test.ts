import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { parseOrThrow } from '../../src/lib/server/data/parse';

const Row = z.strictObject({ id: z.string(), ctr: z.number().max(1) });

describe('parseOrThrow', () => {
	it('returns parsed data unchanged when it matches', () => {
		expect(parseOrThrow(Row, { id: 'a', ctr: 0.5 }, 'rows.json')).toEqual({ id: 'a', ctr: 0.5 });
	});

	it('names the source and the failing path, not just the file', () => {
		expect(() => parseOrThrow(Row.array(), [{ id: 'a', ctr: 4 }], 'items.json')).toThrow(
			/items\.json\.0\.ctr/
		);
	});

	it('reports how many issues there were', () => {
		expect(() => parseOrThrow(Row, { ctr: 'nope' }, 'items.json')).toThrow(/2 issues/);
	});

	it('truncates a systematically broken file instead of printing every row', () => {
		const rows = Array.from({ length: 12 }, (_, index) => ({ id: `row_${index}`, ctr: 9 }));

		expect(() => parseOrThrow(Row.array(), rows, 'items.json')).toThrow(/…and 7 more/);
	});
});
