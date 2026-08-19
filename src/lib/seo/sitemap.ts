import { locales, type Locale } from '$lib/i18n/locales';

import { alternatesFor, localisedPath } from './meta';
import { marketingRoutes, postRoute, type SitemapRoute } from './routes';
import { absolute } from './site';

export interface SitemapEntry extends SitemapRoute {
	/** ISO 8601. Omitted rather than faked when the content has no date. */
	lastModified?: string;
}

export interface PostEntry {
	slug: string;
	publishedAt: string;
}

/**
 * One `<url>` per locale per path, each carrying the alternates for every other
 * locale. That is what Google asks for: a page must list itself among its own
 * alternates, and every URL in a language group must point at the whole group.
 */
export function sitemapEntries(posts: readonly PostEntry[]): SitemapEntry[] {
	return [
		...marketingRoutes,
		...posts.map((post) => ({
			...postRoute,
			path: `/blog/${post.slug}`,
			lastModified: post.publishedAt
		}))
	];
}

const XML_ESCAPES: Readonly<Record<string, string>> = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&apos;'
};

/** Slugs are safe today, but a generator that cannot emit invalid XML is worth
 * more than one that happens not to. */
function escapeXml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => XML_ESCAPES[character] ?? character);
}

function urlEntry(entry: SitemapEntry, locale: Locale): string {
	const alternates = alternatesFor(entry.path)
		.map(
			(alternate) =>
				`\t\t<xhtml:link rel="alternate" hreflang="${alternate.hreflang}" href="${escapeXml(alternate.href)}" />`
		)
		.join('\n');

	return [
		'\t<url>',
		`\t\t<loc>${escapeXml(absolute(localisedPath(locale, entry.path)))}</loc>`,
		alternates,
		entry.lastModified ? `\t\t<lastmod>${entry.lastModified}</lastmod>` : undefined,
		`\t\t<changefreq>${entry.changeFrequency}</changefreq>`,
		`\t\t<priority>${entry.priority.toFixed(1)}</priority>`,
		'\t</url>'
	]
		.filter((line) => line !== undefined)
		.join('\n');
}

export function renderSitemap(posts: readonly PostEntry[]): string {
	const entries = sitemapEntries(posts);

	// Locale is the outer loop so the file groups by language, which makes it
	// readable by a human reviewing it — the only reader who ever will.
	const urls = locales.flatMap((locale) => entries.map((entry) => urlEntry(entry, locale)));

	return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
}

/**
 * `noindex` is what keeps search results out of the index, and a crawler has to
 * fetch the page to see it. Disallowing `/search` here would hide the directive
 * and leave those URLs eligible for indexing on the strength of inbound links,
 * which is the opposite of the intent.
 *
 * `/og/` stays crawlable too: those images are referenced from Open Graph tags,
 * and a blocked image is a blank card in every preview.
 */
export function renderRobots(): string {
	return `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${absolute('/sitemap.xml')}
`;
}
