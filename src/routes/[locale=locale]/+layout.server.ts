import { messagesFor } from '$lib/server/i18n/messages';
import type { LayoutServerLoad } from './$types';

/**
 * The dictionary for the active locale only. Shipping both would double a
 * payload that every page pays for, to serve a language the URL already
 * decided against.
 *
 * The locale is read from `params`, not from `locals`, even though the hook put
 * the same value there. SvelteKit decides whether to re-run a load from what
 * the load touched, and `locals` is not tracked: reading only that made this
 * function dependency-free, so switching language changed the URL and the
 * client reused the previous dictionary until a full reload. `params.locale` is
 * the dependency that makes /en → /de re-run.
 */
export const load: LayoutServerLoad = ({ locals, params }) => {
	return {
		locale: params.locale,
		messages: messagesFor(params.locale),
		// The header needs to know whether anyone is signed in. `Account` carries no
		// password by construction, so this is the whole user object and still safe
		// to serialise into the page.
		user: locals.user
	};
};
