import { safeLocalPath } from '$lib/url/local-path';
import { isTheme, nextTheme, THEME_COOKIE, THEME_COOKIE_MAX_AGE, type Theme } from '$lib/ui/theme';
import { json, redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	const form = await request.formData();
	const requested = form.get('theme');

	// A scripted toggle knows the theme the OS resolved to and sends it
	// explicitly. Without scripting there is nothing to read, so the server
	// flips whatever preference it has, treating "no preference" as light.
	const target: Theme = isTheme(requested) ? requested : nextTheme(locals.theme ?? 'light');

	// `secure` is left to SvelteKit, which sets it everywhere except http on
	// localhost. Deriving it from `dev` instead would mark the cookie Secure on
	// the production build that Playwright and Lighthouse serve over http, and
	// the browser would then drop it.
	//
	// Deliberately not httpOnly. Prerendered pages have no request to read the
	// cookie during render, so the pre-paint script in app.html has to read it
	// instead. A colour preference is not a credential, and hiding it from
	// scripting buys nothing while costing a correct first paint on every cached
	// page.
	cookies.set(THEME_COOKIE, target, {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		maxAge: THEME_COOKIE_MAX_AGE
	});

	if (request.headers.get('accept')?.includes('application/json')) {
		return json({ theme: target });
	}

	redirect(303, safeLocalPath(form.get('redirectTo'), '/'));
};
