import { describe, expect, it } from 'vitest';

import { negotiateLocale, parseAcceptLanguage, resolveLocale } from '../../src/lib/i18n/negotiate';

describe('parseAcceptLanguage', () => {
	it('orders by quality, not by position', () => {
		expect(parseAcceptLanguage('de;q=0.5,en;q=0.9').map((p) => p.tag)).toEqual(['en', 'de']);
	});

	it('keeps header order when qualities tie', () => {
		expect(parseAcceptLanguage('de,en').map((p) => p.tag)).toEqual(['de', 'en']);
	});

	it('drops languages the client explicitly refuses', () => {
		expect(parseAcceptLanguage('de;q=0,en;q=0.5').map((p) => p.tag)).toEqual(['en']);
	});

	it('treats a malformed quality as full preference rather than discarding it', () => {
		expect(parseAcceptLanguage('de;q=abc').map((p) => p.quality)).toEqual([1]);
	});

	it.each([null, undefined, '', '   '])('returns nothing for %o', (header) => {
		expect(parseAcceptLanguage(header)).toEqual([]);
	});
});

describe('negotiateLocale', () => {
	it('matches an exact tag', () => {
		expect(negotiateLocale('de,en;q=0.8')).toBe('de');
	});

	it('matches on base language, so regional variants still work', () => {
		expect([negotiateLocale('de-AT'), negotiateLocale('en-GB')]).toEqual(['de', 'en']);
	});

	it('is case-insensitive', () => {
		expect(negotiateLocale('DE-DE')).toBe('de');
	});

	it('skips unsupported languages to reach a supported one', () => {
		expect(negotiateLocale('fr-FR,fr;q=0.9,de;q=0.4')).toBe('de');
	});

	it('returns null when nothing is supported, leaving the fallback to the caller', () => {
		expect(negotiateLocale('fr,es,ja')).toBeNull();
	});

	it('does not treat a wildcard as a language', () => {
		expect(negotiateLocale('*')).toBeNull();
	});
});

describe('resolveLocale', () => {
	it('prefers a stored choice over the browser header', () => {
		expect(resolveLocale('de', 'en-US,en;q=0.9')).toBe('de');
	});

	it('ignores a tampered cookie and falls back to the header', () => {
		expect(resolveLocale('klingon', 'de-DE')).toBe('de');
	});

	it('falls back to English when there is nothing to go on', () => {
		expect(resolveLocale(undefined, null)).toBe('en');
	});
});
