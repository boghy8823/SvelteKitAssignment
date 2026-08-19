import { resolveLocale } from '$lib/i18n/negotiate';
import { LOCALE_COOKIE } from '$lib/i18n/locales';
import type { RequestHandler } from '@sveltejs/kit';

/**
 * The textbook edge workload: inspect one header, touch no data, and answer on
 * the first hop of every cold visit. Nothing here needs a session, the dataset,
 * or a region — putting it next to the user is pure latency win.
 */
export const config = { runtime: 'edge' };

export const GET: RequestHandler = ({ request, cookies, url }) => {
	const locale = resolveLocale(cookies.get(LOCALE_COOKIE), request.headers.get('accept-language'));

	// 302, not 301: the target depends on this visitor's cookie and headers, and
	// a permanent redirect would have intermediaries pin one language for
	// everyone. Vary states the dependency so a shared cache cannot get it wrong.
	return new Response(null, {
		status: 302,
		headers: {
			location: `/${locale}${url.search}`,
			vary: 'Accept-Language, Cookie',
			'cache-control': 'private, no-store'
		}
	});
};
