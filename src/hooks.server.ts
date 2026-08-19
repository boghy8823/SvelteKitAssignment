import { readThemePreference, THEME_COOKIE } from '$lib/ui/theme';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.theme = readThemePreference(event.cookies.get(THEME_COOKIE));

	return resolve(event, {
		// Writing the attribute during SSR is what makes the theme flicker-free:
		// no blocking inline script, so no CSP concession either. An empty value
		// leaves `color-scheme: light dark` in place, which follows the OS.
		transformPageChunk: ({ html }) => html.replace('%theme%', event.locals.theme ?? '')
	});
};
