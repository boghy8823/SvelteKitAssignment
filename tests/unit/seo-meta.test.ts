import { describe, expect, it } from 'vitest';

import { locales } from '../../src/lib/i18n/locales';
import { buildMeta } from '../../src/lib/seo/meta';
import { siteUrl } from '../../src/lib/seo/site';

describe('buildMeta', () => {
	it('builds an absolute canonical for the active locale', () => {
		const meta = buildMeta({
			locale: 'de',
			title: 'Titel',
			description: 'Beschreibung',
			path: '/blog'
		});

		expect(meta.canonical).toBe(`${siteUrl}/de/blog`);
	});

	it('does not leave a trailing segment on the home path', () => {
		const meta = buildMeta({ locale: 'en', title: 'Home', description: 'Home', path: '/' });

		expect(meta.canonical).toBe(`${siteUrl}/en`);
	});

	it('emits one alternate per locale plus x-default', () => {
		const meta = buildMeta({ locale: 'en', title: 'T', description: 'D', path: '/blog' });

		expect(meta.alternates.map((alternate) => alternate.hreflang)).toEqual([
			...locales,
			'x-default'
		]);
	});

	it('points x-default at the negotiating root rather than at English', () => {
		const meta = buildMeta({ locale: 'en', title: 'T', description: 'D', path: '/blog' });
		const fallback = meta.alternates.find((alternate) => alternate.hreflang === 'x-default');

		expect(fallback?.href).toBe(`${siteUrl}/`);
	});

	it('includes the current locale among the alternates, as Google requires', () => {
		const meta = buildMeta({ locale: 'de', title: 'T', description: 'D', path: '/search' });

		expect(meta.alternates).toContainEqual({ hreflang: 'de', href: `${siteUrl}/de/search` });
	});

	it('indexes by default', () => {
		const meta = buildMeta({ locale: 'en', title: 'T', description: 'D', path: '/' });

		expect(meta.robots).toBe('index, follow');
	});

	it('keeps following links on a noindex page, so outbound links still count', () => {
		const meta = buildMeta({
			locale: 'en',
			title: 'T',
			description: 'D',
			path: '/search',
			noindex: true
		});

		expect(meta.robots).toBe('noindex, follow');
	});

	it('maps the locale to an Open Graph locale', () => {
		expect(
			buildMeta({ locale: 'de', title: 'T', description: 'D', path: '/' }).og['og:locale']
		).toBe('de_DE');
	});

	it('promotes the card to a large image only when there is one', () => {
		const without = buildMeta({ locale: 'en', title: 'T', description: 'D', path: '/' });
		const with_ = buildMeta({
			locale: 'en',
			title: 'T',
			description: 'D',
			path: '/blog/a',
			image: '/og/en/a.png'
		});

		expect(without.twitter['twitter:card']).toBe('summary');
		expect(with_.twitter['twitter:card']).toBe('summary_large_image');
		expect(with_.og['og:image']).toBe(`${siteUrl}/og/en/a.png`);
	});

	it('declares image dimensions, which crawlers use before fetching the file', () => {
		const meta = buildMeta({
			locale: 'en',
			title: 'T',
			description: 'D',
			path: '/blog/a',
			image: '/og/en/a.png'
		});

		expect([meta.og['og:image:width'], meta.og['og:image:height']]).toEqual(['1200', '630']);
	});
});
