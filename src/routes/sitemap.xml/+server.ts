import { renderSitemap } from '$lib/seo/sitemap';
import { refs } from '$lib/server/data/posts.repo';
import type { RequestHandler } from './$types';

/**
 * Prerendered, because the content set is fixed at build time and a sitemap that
 * is computed per request is compute spent on crawlers. It is generated from the
 * same route inventory that produces canonicals and hreflang, so the file cannot
 * describe a site that does not exist.
 */
export const prerender = true;

export const GET: RequestHandler = async () => {
	return new Response(renderSitemap(await refs()), {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			// A day, since a new post arrives with a deploy and crawlers refetch on
			// their own schedule anyway.
			'cache-control': 'public, max-age=0, s-maxage=86400'
		}
	});
};
