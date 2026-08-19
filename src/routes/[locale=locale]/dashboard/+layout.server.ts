import { loginPath } from '$lib/url/locale-path';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * The guard for everything under /dashboard. It lives in a layout load so a new
 * child route is protected by existing, rather than by someone remembering to
 * protect it.
 *
 * What a layout load does *not* cover is a form action in a child route: an
 * action runs before the loads, so a crafted POST reaches it without passing
 * through here. That is why the mutation checks the session and the role again
 * itself. This guard is about where a person can navigate; authorisation is
 * decided where the state changes.
 */
export const load: LayoutServerLoad = ({ locals, url }) => {
	if (!locals.user) {
		// 303, so the browser follows with GET regardless of how it arrived.
		redirect(303, loginPath(locals.locale, url));
	}

	// Narrowed to a signed-in account, so children destructure `user` without
	// re-testing what this layout already guaranteed.
	return { user: locals.user };
};
