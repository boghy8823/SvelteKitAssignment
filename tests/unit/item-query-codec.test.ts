import { describe, expect, it } from 'vitest';

import { defaultItemQuery, type ItemQuery } from '../../src/lib/data/item-query';
import { nextItemQuery, parseItemQuery, serializeItemQuery } from '../../src/lib/url/item-query';

function parse(search: string): ItemQuery {
	return parseItemQuery(new URLSearchParams(search));
}

function query(overrides: Partial<ItemQuery> = {}): ItemQuery {
	return { ...defaultItemQuery, ...overrides };
}

describe('parseItemQuery', () => {
	it('returns defaults for an empty query string', () => {
		expect(parse('')).toEqual(defaultItemQuery);
	});

	it('reads every supported parameter', () => {
		expect(
			parse('q=summer&status=active&channel=email&tags=ai&sort=budget&direction=asc&page=4')
		).toEqual(
			query({
				q: 'summer',
				status: ['active'],
				channel: ['email'],
				tags: ['ai'],
				sort: 'budget',
				direction: 'asc',
				page: 4
			})
		);
	});

	it('splits comma-joined facets', () => {
		expect(parse('status=active,paused').status).toEqual(['active', 'paused']);
	});

	it('normalises facet order and duplicates, so equivalent URLs are one state', () => {
		expect(parse('status=paused,active,paused').status).toEqual(['active', 'paused']);
	});

	it('keeps the valid part of a partly invalid facet', () => {
		expect(parse('status=active,made-up').status).toEqual(['active']);
	});

	it('drops a facet that is entirely invalid rather than throwing', () => {
		expect(parse('status=nope&channel=fax').status).toEqual([]);
	});

	it('rejects tag values that are not slugs', () => {
		expect(parse('tags=ai,Not A Slug,<script>').tags).toEqual(['ai']);
	});

	it.each([
		['sort=nonsense', 'sort'],
		['direction=sideways', 'direction']
	])('falls back to the default for %s', (search, field) => {
		expect(parse(search)[field as 'sort' | 'direction']).toBe(defaultItemQuery[field as 'sort']);
	});

	it.each(['page=0', 'page=-4', 'page=abc', 'page=', 'page=1.5e3x'])(
		'falls back to page 1 for %s',
		(search) => {
			expect(parse(search).page).toBe(1);
		}
	);

	it('keeps a page past the end, leaving clamping to the repository', () => {
		// The codec cannot know how many rows exist; the repository clamps and
		// reports what it used.
		expect(parse('page=99').page).toBe(99);
	});

	it('trims free text and caps its length', () => {
		expect(parse('q=%20%20summer%20%20').q).toBe('summer');
		expect(parse(`q=${'a'.repeat(300)}`).q).toHaveLength(100);
	});

	it('ignores parameters it does not own', () => {
		expect(parse('utm_source=newsletter&page=2')).toEqual(query({ page: 2 }));
	});

	it('never takes page size from the URL', () => {
		expect(parse('pageSize=100000').pageSize).toBe(defaultItemQuery.pageSize);
	});

	it('never throws, whatever arrives', () => {
		const hostile = 'q=%E2%9C%93&status=,,,&channel=&tags=,&sort=&direction=&page=NaN';

		expect(() => parse(hostile)).not.toThrow();
	});
});

describe('serializeItemQuery', () => {
	it('omits every default, so the default view has a clean URL', () => {
		expect(serializeItemQuery(defaultItemQuery)).toBe('');
	});

	it('writes keys in canonical order regardless of object order', () => {
		const built: ItemQuery = {
			page: 3,
			direction: 'asc',
			sort: 'budget',
			tags: ['ai'],
			channel: ['email'],
			status: ['active'],
			q: 'summer',
			pageSize: defaultItemQuery.pageSize
		};

		expect(serializeItemQuery(built)).toBe(
			'q=summer&status=active&channel=email&tags=ai&sort=budget&direction=asc&page=3'
		);
	});

	it('joins facets with readable commas', () => {
		expect(serializeItemQuery(query({ status: ['active', 'paused'] }))).toBe(
			'status=active,paused'
		);
	});

	it('sorts facet values, so two equivalent states are byte-identical', () => {
		const a = serializeItemQuery(query({ channel: ['sms', 'email'] }));
		const b = serializeItemQuery(query({ channel: ['email', 'sms'] }));

		expect(a).toBe(b);
	});

	it('encodes free text safely', () => {
		expect(serializeItemQuery(query({ q: 'a b&c=d' }))).toBe('q=a+b%26c%3Dd');
	});
});

describe('round trip', () => {
	const cases: ItemQuery[] = [
		defaultItemQuery,
		query({ q: 'summer sale' }),
		query({ status: ['active', 'paused'], channel: ['email'] }),
		query({ tags: ['ai', 'performance'], sort: 'ctr', direction: 'asc' }),
		query({ page: 7 }),
		query({
			q: 'ümlaut',
			status: ['archived'],
			channel: ['push', 'web'],
			tags: ['design'],
			sort: 'spent',
			direction: 'asc',
			page: 2
		})
	];

	it.each(cases)('parse(serialize(q)) returns q for %j', (input) => {
		expect(parse(serializeItemQuery(input))).toEqual(input);
	});

	it('serializing twice is stable', () => {
		const once = serializeItemQuery(cases[5]);
		const twice = serializeItemQuery(parse(once));

		expect(twice).toBe(once);
	});
});

describe('nextItemQuery', () => {
	const onPageThree = query({ page: 3, status: ['active'], sort: 'budget' });

	it('keeps the page when only the sort column changes', () => {
		expect(nextItemQuery(onPageThree, { sort: 'name' }).page).toBe(3);
	});

	it('keeps the page when only the direction changes', () => {
		expect(nextItemQuery(onPageThree, { direction: 'asc' }).page).toBe(3);
	});

	it('resets to page 1 when a facet changes, because page 3 may no longer exist', () => {
		expect(nextItemQuery(onPageThree, { status: ['paused'] }).page).toBe(1);
	});

	it('resets to page 1 when free text changes', () => {
		expect(nextItemQuery(onPageThree, { q: 'summer' }).page).toBe(1);
	});

	it('resets to page 1 when a facet is cleared', () => {
		expect(nextItemQuery(onPageThree, { status: [] }).page).toBe(1);
	});

	it('keeps the page when a patch restates the same filter', () => {
		expect(nextItemQuery(onPageThree, { status: ['active'] }).page).toBe(3);
	});

	it('honours an explicit page, which is what pagination itself sends', () => {
		expect(nextItemQuery(onPageThree, { page: 5 }).page).toBe(5);
	});

	it('honours an explicit page even alongside a filter change', () => {
		expect(nextItemQuery(onPageThree, { q: 'summer', page: 2 }).page).toBe(2);
	});

	it('leaves everything else merged as given', () => {
		expect(nextItemQuery(onPageThree, { sort: 'ctr', direction: 'asc' })).toEqual(
			query({ page: 3, status: ['active'], sort: 'ctr', direction: 'asc' })
		);
	});
});
