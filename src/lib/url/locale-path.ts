import type { Locale } from '$lib/i18n/locales';

/*
 * Absolute, locale-prefixed paths for code that runs on the server.
 *
 * `resolve()` from $app/paths is the right tool inside a component: it checks the
 * route id against the router, so a link cannot outlive the route it points at.
 * What it returns, though, is a path relative to the current page — `../en` — because
 * `paths.relative` defaults to true so prerendered pages stay portable. A browser
 * resolves that correctly in an `href`, but it is the wrong shape for two things
 * this app does: a `Location` header, whose base is whatever depth the request
 * came in at, and `isLocalPath`, which requires a leading slash before it will
 * vouch for a redirect target.
 *
 * So server-side redirects build their paths here instead, and the route ids they
 * correspond to are named in the callers.
 */

/** `/en`, `/de/blog`, `/en/dashboard/items`. */
export function localePath(locale: Locale, path = '/'): string {
	return `/${locale}${path === '/' ? '' : path}`;
}

/**
 * Where the guard sends anonymous traffic: the login page, carrying the URL it
 * interrupted so signing in continues rather than dumping the visitor at home.
 *
 * The query string travels too — being bounced off a filtered, sorted, page-three
 * table and returned to page one would be its own small insult — and it is
 * encoded, so a `?` or `&` in the original cannot graft extra parameters onto the
 * login URL. The login action still validates the value as a local path before
 * honouring it, because this is not the only way one can arrive there.
 */
export function loginPath(locale: Locale, from: URL): string {
	const login = localePath(locale, '/login');
	const redirectTo = from.pathname + from.search;

	return `${login}?redirectTo=${encodeURIComponent(redirectTo)}`;
}
