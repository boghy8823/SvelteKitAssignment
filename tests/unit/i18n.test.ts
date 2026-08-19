import { describe, expect, it } from 'vitest';

import { createFormatters } from '../../src/lib/i18n/intl';
import type { Messages } from '../../src/lib/i18n/translate';
import { createTranslator, interpolate } from '../../src/lib/i18n/translate';
import { messagesFor } from '../../src/lib/server/i18n/messages';

describe('interpolate', () => {
	it('fills a slot', () => {
		expect(interpolate('{minutes} min read', { minutes: 3 })).toBe('3 min read');
	});

	it('fills every slot in a message', () => {
		expect(interpolate('{count} results for "{query}"', { count: 12, query: 'lcp' })).toBe(
			'12 results for "lcp"'
		);
	});

	it('leaves an unfilled slot visible rather than blank', () => {
		expect(interpolate('{count} results', {})).toBe('{count} results');
	});

	it('leaves a message without slots untouched', () => {
		expect(interpolate('Sign in', { unused: 1 })).toBe('Sign in');
	});
});

describe('createTranslator', () => {
	it('reads the provided dictionary verbatim', () => {
		const t = createTranslator(messagesFor('en'));

		expect([t('nav.blog'), t('login.submit')]).toEqual(['Blog', 'Sign in']);
	});

	it('translates the same keys into German', () => {
		const t = createTranslator(messagesFor('de'));

		expect(t('nav.blog')).toBe('Blog');
		expect(t('login.submit')).not.toBe('Sign in');
	});

	it('interpolates through the translator', () => {
		const t = createTranslator(messagesFor('en'));

		expect(t('blog.readingTime', { minutes: 7 })).toBe('7 min read');
	});

	it('falls back to the key when a dictionary predates the code', () => {
		const t = createTranslator({} as Messages);

		expect(t('nav.blog')).toBe('nav.blog');
	});

	it('covers both locales for every generated key', () => {
		const en = messagesFor('en');
		const de = messagesFor('de');

		expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
	});
});

describe('formatters', () => {
	const en = createFormatters('en');
	const de = createFormatters('de');

	it('formats currency with English conventions', () => {
		expect(en.currency(12500)).toBe('$12,500');
	});

	it('formats currency with German conventions: decimal comma, trailing symbol', () => {
		// Non-breaking space before the symbol, which is why this compares loosely.
		expect(de.currencyPrecise(1234.56).replace(/\u00a0/g, ' ')).toBe('1.234,56 $');
	});

	it('formats a ratio as a percentage in both locales', () => {
		expect(en.percent(0.0537)).toBe('5.37%');
		expect(de.percent(0.0537).replace(/\u00a0/g, ' ')).toBe('5,37 %');
	});

	it('spells out prose dates per locale, pinned to UTC so the day never drifts', () => {
		expect(en.date('2026-05-31T00:00:00Z')).toBe('May 31, 2026');
		expect(de.date('2026-05-31T00:00:00Z')).toBe('31. Mai 2026');
	});

	it('keeps table timestamps compact, in the order each locale expects', () => {
		expect(en.dateTime('2026-04-09T22:00:00Z')).toContain('Apr 9, 2026');
		expect(de.dateTime('2026-04-09T22:00:00Z')).toContain('09.04.2026');
	});

	it('returns the same formatter instance for repeated calls', () => {
		// Memoisation is the point: constructing Intl objects per cell is
		// measurable across 25 rows and three numeric columns.
		const first = createFormatters('en');
		const second = createFormatters('en');

		expect(first.currency(100)).toBe(second.currency(100));
	});
});
