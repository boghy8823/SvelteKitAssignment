import { describe, expect, it } from 'vitest';

import { locales } from '../../src/lib/i18n/locales';
import { alternatesFor } from '../../src/lib/seo/meta';
import { marketingRoutes } from '../../src/lib/seo/routes';
import { renderRobots, renderSitemap, type PostEntry } from '../../src/lib/seo/sitemap';
import { siteUrl } from '../../src/lib/seo/site';

const posts: PostEntry[] = [
	{ slug: 'first-post', publishedAt: '2026-05-31T09:00:00.000Z' },
	{ slug: 'second-post', publishedAt: '2026-06-14T09:00:00.000Z' }
];

const xml = renderSitemap(posts);

function locations(document: string): string[] {
	return [...document.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

describe('renderSitemap', () => {
	it('emits one URL per locale per route', () => {
		const expected = (marketingRoutes.length + posts.length) * locales.length;

		expect(locations(xml)).toHaveLength(expected);
	});

	it('lists every locale of every page', () => {
		expect(locations(xml)).toContain(`${siteUrl}/de/blog/first-post`);
		expect(locations(xml)).toContain(`${siteUrl}/en/blog/first-post`);
	});

	it('does not leave a trailing segment on the home page', () => {
		expect(locations(xml)).toContain(`${siteUrl}/en`);
		expect(locations(xml)).not.toContain(`${siteUrl}/en/`);
	});

	it('never lists a URL twice, which would waste crawl budget on itself', () => {
		const found = locations(xml);

		expect(new Set(found).size).toBe(found.length);
	});

	it('omits the search page, which is noindex', () => {
		expect(xml).not.toContain('/search');
	});

	it('carries the same alternates the pages advertise as hreflang', () => {
		// The point of generating both from alternatesFor(): a sitemap that
		// disagrees with the page's own hreflang is worse than no sitemap.
		for (const alternate of alternatesFor('/blog')) {
			expect(xml).toContain(
				`<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${alternate.href}" />`
			);
		}
	});

	it('dates posts from their publication, and leaves undated routes undated', () => {
		expect(xml).toContain('<lastmod>2026-05-31T09:00:00.000Z</lastmod>');
		expect([...xml.matchAll(/<lastmod>/g)]).toHaveLength(posts.length * locales.length);
	});

	it('declares the xhtml namespace the alternates need to be valid', () => {
		expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
	});

	it('escapes XML rather than trusting slugs to stay tame', () => {
		const hostile = renderSitemap([{ slug: 'a&b', publishedAt: posts[0].publishedAt }]);

		expect(hostile).toContain('/blog/a&amp;b');
		expect(hostile).not.toMatch(/<loc>[^<]*&(?!amp;)/);
	});
});

describe('renderRobots', () => {
	const robots = renderRobots();

	it('points at an absolute sitemap URL, as the format requires', () => {
		expect(robots).toContain(`Sitemap: ${siteUrl}/sitemap.xml`);
	});

	it('leaves search crawlable so its noindex can be read', () => {
		// Disallowing a noindex page hides the directive and leaves the URL
		// indexable on inbound links alone.
		expect(robots).not.toContain('search');
	});

	it('keeps crawlers out of the API surface', () => {
		expect(robots).toContain('Disallow: /api/');
	});
});
