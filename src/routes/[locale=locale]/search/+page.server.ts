import { SEARCH_RESULT_LIMIT } from '$lib/data/pagination';
import { list, tagFacets } from '$lib/server/data/posts.repo';
import { parsePostQuery } from '$lib/url/post-query';
import type { PageServerLoad } from './$types';

/**
 * Edge, because every response depends on this request's query string and
 * nothing else: no session, no writes, and nothing worth caching. It is
 * latency-sensitive in the way search always is, and the data it reads is the
 * 20-post index rather than the campaign dataset — which is why the dataset is
 * split per entity, so this function does not carry 220 rows it never looks at.
 */
export const config = { runtime: 'edge' };

export const load: PageServerLoad = async ({ params, url }) => {
	const query = parsePostQuery(url.searchParams);

	const request = {
		locale: params.locale,
		q: query.q,
		tags: query.tags,
		sort: query.sort
	};

	const [results, tags] = await Promise.all([
		list({ ...request, pageSize: SEARCH_RESULT_LIMIT }),
		tagFacets(request)
	]);

	return { query, results, tags };
};
