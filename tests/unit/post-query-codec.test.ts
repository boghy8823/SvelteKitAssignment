import { describe, expect, it } from 'vitest';

import {
	defaultPostQuery,
	parsePostQuery,
	serializePostQuery,
	type PostQueryState
} from '../../src/lib/url/post-query';

function parse(search: string): PostQueryState {
	return parsePostQuery(new URLSearchParams(search));
}

function query(overrides: Partial<PostQueryState> = {}): PostQueryState {
	return { ...defaultPostQuery, ...overrides };
}

describe('parsePostQuery', () => {
	it('returns defaults for an empty query string', () => {
		expect(parse('')).toEqual(defaultPostQuery);
	});

	it('reads every supported parameter', () => {
		expect(parse('q=lcp&tags=ai,performance&sort=title')).toEqual(
			query({ q: 'lcp', tags: ['ai', 'performance'], sort: 'title' })
		);
	});

	it('accepts the repeated form a checkbox form submits without JavaScript', () => {
		expect(parse('tags=ai&tags=design').tags).toEqual(['ai', 'design']);
	});

	it('normalises order and duplicates, so equivalent URLs are one state', () => {
		expect(parse('tags=design,ai,design').tags).toEqual(['ai', 'design']);
	});

	it('keeps the valid part of a partly invalid tag list', () => {
		expect(parse('tags=ai,Not A Slug,<script>').tags).toEqual(['ai']);
	});

	it('falls back to the default sort rather than erroring', () => {
		expect(parse('sort=sideways').sort).toBe(defaultPostQuery.sort);
	});

	it('trims free text and caps its length', () => {
		expect(parse('q=%20%20lcp%20%20').q).toBe('lcp');
		expect(parse(`q=${'a'.repeat(300)}`).q).toHaveLength(100);
	});

	it('ignores parameters it does not own', () => {
		expect(parse('utm_source=newsletter&page=4&pageSize=100000')).toEqual(defaultPostQuery);
	});

	it('never throws, whatever arrives', () => {
		expect(() => parse('q=%E2%9C%93&tags=,,,&sort=')).not.toThrow();
	});
});

describe('serializePostQuery', () => {
	it('omits every default, so the unfiltered view has a clean URL', () => {
		expect(serializePostQuery(defaultPostQuery)).toBe('');
	});

	it('emits the comma form even when the repeated form was parsed', () => {
		expect(serializePostQuery(parse('tags=ai&tags=design'))).toBe('tags=ai,design');
	});

	it('leaves commas readable rather than percent-encoded', () => {
		expect(serializePostQuery(query({ tags: ['ai', 'design'] }))).not.toContain('%2C');
	});

	it('sorts tags, so two equivalent states are byte-identical', () => {
		expect(serializePostQuery(query({ tags: ['design', 'ai'] }))).toBe(
			serializePostQuery(query({ tags: ['ai', 'design'] }))
		);
	});

	it('encodes free text safely', () => {
		expect(serializePostQuery(query({ q: 'a b&c=d' }))).toBe('q=a+b%26c%3Dd');
	});
});

describe('round trip', () => {
	const cases: PostQueryState[] = [
		defaultPostQuery,
		query({ q: 'sub-second lcp' }),
		query({ tags: ['ai', 'performance'] }),
		query({ sort: 'oldest' }),
		query({ q: 'ümlaut', tags: ['design'], sort: 'title' })
	];

	it.each(cases)('parse(serialize(q)) returns q for %j', (input) => {
		expect(parse(serializePostQuery(input))).toEqual(input);
	});

	it('serializing twice is stable', () => {
		const once = serializePostQuery(cases[4]);

		expect(serializePostQuery(parse(once))).toBe(once);
	});
});
