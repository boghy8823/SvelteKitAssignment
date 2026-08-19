import { POSTS_PAGE_SIZE } from '$lib/data/pagination';
import { list } from '$lib/server/data/posts.repo';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Incremental static regeneration rather than prerendering, because the index is
 * treated as CMS-backed: publishing a post should make it appear without a
 * redeploy. Sixty seconds is short enough that an editor sees their work and long
 * enough that a crawl does not become 40 renders.
 *
 * ISR and prerendering are mutually exclusive, which is why this route declares
 * no prerender flag.
 */
export const config = {
	isr: {
		expiration: 60,
		// Only `page` changes the response. Without this, a campaign URL with a utm
		// parameter would mint a separate cache entry for identical content.
		allowQuery: ['page']
	}
};

export const load: PageServerLoad = async ({ params, url }) => {
	const requested = Number(url.searchParams.get('page') ?? '1');
	const page = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : 1;

	const posts = await list({ locale: params.locale, page, pageSize: POSTS_PAGE_SIZE });

	// A page past the end is a 404, not a soft empty list. It is a crawlable URL,
	// and serving thin content there teaches a crawler that the pattern is
	// infinite.
	if (page > posts.pageCount) {
		error(404, 'Page not found');
	}

	return { posts };
};
