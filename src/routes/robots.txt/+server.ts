import { renderRobots } from '$lib/seo/sitemap';
import type { RequestHandler } from './$types';

/** Static text that names the sitemap; nothing about it depends on a request. */
export const prerender = true;

export const GET: RequestHandler = () => {
	return new Response(renderRobots(), {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=0, s-maxage=86400'
		}
	});
};
