import { clearSession } from '$lib/server/auth/session';
import { safeLocalPath } from '$lib/url/local-path';
import { localePath } from '$lib/url/locale-path';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * POST only. Signing out is a state change, and a GET would let any image tag or
 * prefetch on the page log the visitor out — the mirror image of the CSRF problem
 * on the way in. A form gives it the right method and works without JavaScript.
 */
export const POST: RequestHandler = async ({ cookies, locals, request }) => {
	clearSession(cookies);

	const form = await request.formData();

	// Back to where they were, unless that page needs a session — the caller sends
	// a safe destination and it is validated as a local path regardless. The
	// fallback is absolute for the same reason the login one is: a `Location` a
	// browser resolves against `/{locale}/logout` is not the home page.
	redirect(303, safeLocalPath(form.get('redirectTo'), localePath(locals.locale, '/')));
};
