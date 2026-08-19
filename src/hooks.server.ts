import { building } from '$app/environment';
import { defaultLocale, isLocale, LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from '$lib/i18n/locales';
import { readThemePreference, THEME_COOKIE } from '$lib/ui/theme';
import type { Handle } from '@sveltejs/kit';

/** First path segment, which the `locale` param matcher guarantees is a locale. */
function localeFromPath(pathname: string) {
	const segment = pathname.split('/')[1];

	return isLocale(segment) ? segment : defaultLocale;
}

export const handle: Handle = async ({ event, resolve }) => {
	const locale = localeFromPath(event.url.pathname);

	event.locals.locale = locale;
	event.locals.theme = readThemePreference(event.cookies.get(THEME_COOKIE));

	// Remember the language actually being read, so a later visit to `/` lands
	// where the visitor left off. The URL still wins whenever it names a locale;
	// this cookie only feeds the negotiation at the root.
	if (!building && event.cookies.get(LOCALE_COOKIE) !== locale && isLocale(event.params.locale)) {
		event.cookies.set(LOCALE_COOKIE, locale, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: LOCALE_COOKIE_MAX_AGE
		});
	}

	return resolve(event, {
		// Both attributes are written during SSR: the theme so the first paint is
		// correct without a blocking script, and lang because a screen reader
		// choosing a voice from the wrong language is unusable, not untidy.
		transformPageChunk: ({ html }) =>
			html.replace('%theme%', event.locals.theme ?? '').replace('%lang%', locale)
	});
};
