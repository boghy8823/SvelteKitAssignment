/**
 * The indexable surface, as locale-less paths. The sitemap is generated from
 * this list plus the post slugs, and the same paths are what `buildMeta` turns
 * into canonicals and hreflang, so a new public route is added in one place.
 *
 * `/search` is deliberately absent: it is `noindex, follow`, and listing a page
 * in a sitemap while telling crawlers not to index it is a contradiction that
 * costs trust in the whole file.
 */
export interface SitemapRoute {
	/** Locale-less path, e.g. `/blog`. */
	path: string;
	/**
	 * How often the content behind the URL changes. Advisory — crawlers weigh it
	 * against observed reality — so it states intent rather than a promise.
	 */
	changeFrequency: 'daily' | 'weekly' | 'monthly';
	/** Relative importance within this site only; it says nothing across sites. */
	priority: number;
}

export const marketingRoutes: readonly SitemapRoute[] = [
	{ path: '/', changeFrequency: 'monthly', priority: 1 },
	{ path: '/blog', changeFrequency: 'daily', priority: 0.8 }
];

/** Posts are the deep content: stable once published, worth crawling first. */
export const postRoute = {
	changeFrequency: 'monthly',
	priority: 0.6
} as const satisfies Omit<SitemapRoute, 'path'>;
