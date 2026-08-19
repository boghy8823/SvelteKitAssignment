import { resolve } from '$app/paths';
import { loginErrors } from '$lib/data/login';
import type { Locale } from '$lib/i18n/locales';
import { issueSession } from '$lib/server/auth/session';
import { authenticate, demoLogins } from '$lib/server/data/users.repo';
import { isLocalPath, safeLocalPath } from '$lib/url/local-path';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/*
 * Node, not edge: this route signs a cookie and reads the account list. It is the
 * definition of the work the runtime split puts on Node.
 */

/**
 * `redirectTo` arrives from a query string or a form field, which makes it
 * attacker-controlled. Validating it as a local path is what stops the login page
 * from becoming an open redirect — the classic hole in exactly this feature.
 */
function target(value: unknown, locale: Locale): string {
	return safeLocalPath(value, resolve('/[locale=locale]', { locale }));
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const requested = url.searchParams.get('redirectTo');
	const redirectTo = target(requested, locals.locale);

	// Already signed in: send them where they were going instead of showing a form
	// that would sign them in as someone they already are.
	if (locals.user) {
		redirect(303, redirectTo);
	}

	return {
		redirectTo,
		// A usable target means the guard sent them here, so the page can say why it
		// appeared. Arriving by choice shows no such notice.
		interrupted: isLocalPath(requested),
		demo: await demoLogins()
	};
};

export const actions = {
	default: async ({ cookies, locals, request }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');
		const redirectTo = target(data.get('redirectTo'), locals.locale);

		// The same function the form ran before submitting. The client copy is a
		// courtesy; this one is the rule.
		const errors = loginErrors({ email, password });

		if (errors) {
			// 422, and the email is echoed so the field is not cleared. The password
			// never travels back — a value in a response is a value in a log.
			return fail(422, { errors, email, credentials: false });
		}

		const account = await authenticate(email, password);

		if (!account) {
			// One message for both halves, and 401 rather than 422: the input was
			// well-formed, it just is not a login. Naming which half was wrong is how
			// an account-enumeration oracle gets built.
			return fail(401, { errors: {}, email, credentials: true });
		}

		await issueSession(cookies, account);

		// 303, so the browser follows with GET and the password is not in the
		// history entry the back button returns to.
		redirect(303, redirectTo);
	}
} satisfies Actions;
