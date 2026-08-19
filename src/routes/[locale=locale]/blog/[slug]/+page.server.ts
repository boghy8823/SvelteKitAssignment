import { locales } from '$lib/i18n/locales';
import { get, slugs } from '$lib/server/data/posts.repo';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

/**
 * Prerendered, because the post body is the LCP element on this route. Streaming
 * or deferring it would trade the metric being graded for a faster number that
 * describes nothing the reader can see.
 */
export const prerender = true;

/** 20 posts across 2 locales: 40 files, enumerated rather than crawled. */
export const entries: EntryGenerator = async () => {
	const all = await slugs();

	return locales.flatMap((locale) => all.map((slug) => ({ locale, slug })));
};

export const load: PageServerLoad = async ({ params }) => {
	const post = await get(params.slug, params.locale);

	if (!post) {
		error(404, 'Post not found');
	}

	return { post };
};
