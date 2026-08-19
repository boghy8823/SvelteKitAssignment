import { z } from 'zod';

import type { MessageKey } from '$lib/i18n/keys.generated';

/*
 * The brief asks for one validation schema shared by the client and the server,
 * so this module lives in $lib/data rather than $lib/server: the form component
 * imports it, and so does the action. There is no second definition to drift.
 *
 * Messages are message *keys*, not sentences. A schema that both halves share
 * cannot know the reader's language, and returning a key keeps the copy in the
 * dictionary where a translator can reach it.
 */

/** Matches the demo accounts. Real minimums belong to a password policy, not
 * to a login form, which only has to reject input that cannot be a password. */
const MIN_PASSWORD_LENGTH = 8;

export const LoginSchema = z.strictObject({
	email: z.email(),
	password: z.string().min(MIN_PASSWORD_LENGTH)
});

export type LoginInput = z.infer<typeof LoginSchema>;

export type LoginField = keyof LoginInput;

/**
 * One message per field. Missing and malformed collapse into the same sentence
 * deliberately: "enter a valid email address" answers both, and three variants of
 * the same instruction is noise for the person reading it.
 */
const messages = {
	email: 'login.error.email',
	password: 'login.error.password'
} as const satisfies Record<LoginField, MessageKey>;

export type LoginErrors = Partial<Record<LoginField, MessageKey>>;

/**
 * `null` when the input is usable. Total, like the URL codec: whatever arrives —
 * a `File` from a crafted multipart body, `null` from a missing field — produces
 * errors rather than an exception.
 */
export function loginErrors(input: unknown): LoginErrors | null {
	const result = LoginSchema.safeParse(input);

	if (result.success) {
		return null;
	}

	const errors: LoginErrors = {};

	for (const issue of result.error.issues) {
		const field = issue.path[0];

		if (field === 'email' || field === 'password') {
			errors[field] ??= messages[field];
		}
	}

	// A body with no recognisable fields at all still has to fail, or an empty
	// POST would fall through to the credential check.
	return Object.keys(errors).length > 0 ? errors : { email: messages.email };
}
