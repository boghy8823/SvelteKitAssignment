import type { Account } from '$lib/data/account';
import { UserRoleSchema } from '$lib/data/schemas';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';

import { sign, verify } from './hmac';

/*
 * Sessions are a signed cookie rather than a server-side store, because there is
 * no database in this app and a stateless token needs neither.
 *
 * The cookie carries a subject, a role, and an expiry. It is not encrypted, and it
 * does not need to be: nothing in it is a secret, and the signature is what stops
 * it from being edited. A role in a tamper-proof cookie is still checked against
 * the account on every request, so a revoked user cannot ride an old one.
 */

export const SESSION_COOKIE = 'session';

/** Seven days, per the plan. Long enough to be convenient, short enough that a
 * forgotten session on a shared machine expires on its own. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Re-issued once past the halfway mark, so an active session never expires
 * under someone mid-task while an idle one still ages out. */
const REFRESH_AFTER = SESSION_MAX_AGE / 2;

const SessionSchema = z.strictObject({
	sub: z.string().min(1),
	role: UserRoleSchema,
	/** Unix seconds, matching `exp` as every token format spells it. */
	exp: z.int().positive()
});

export type Session = z.infer<typeof SessionSchema>;

export function createSession(account: Account, now = Date.now()): Session {
	return {
		sub: account.id,
		role: account.role,
		exp: Math.floor(now / 1000) + SESSION_MAX_AGE
	};
}

export function signSession(session: Session): Promise<string> {
	return sign(JSON.stringify(session));
}

/**
 * Returns the session only if the signature is ours, the payload still matches
 * the schema, and the expiry is in the future. Every other input — missing,
 * truncated, re-signed, hand-edited, or simply old — is `null`, because a caller
 * that has to distinguish between kinds of invalid will eventually get it wrong.
 */
export async function verifySession(
	token: string | undefined,
	now = Date.now()
): Promise<Session | null> {
	const payload = await verify(token);

	if (payload === null) {
		return null;
	}

	try {
		// The signature proves we wrote it. The schema proves it is still the shape
		// this version of the code understands, which is what makes changing the
		// payload a safe deploy rather than a runtime surprise.
		const session = SessionSchema.safeParse(JSON.parse(payload));

		if (!session.success || session.data.exp * 1000 <= now) {
			return null;
		}

		return session.data;
	} catch {
		// Malformed JSON inside an authentic signature means a payload from another
		// version of this code. Same answer as a forgery: no session.
		return null;
	}
}

export function needsRefresh(session: Session, now = Date.now()): boolean {
	return session.exp - Math.floor(now / 1000) < REFRESH_AFTER;
}

/*
 * `secure` is deliberately left to SvelteKit, which sets it for https and omits
 * it for http. Hard-coding it would make the cookie vanish on the http preview
 * server that Playwright and Lighthouse drive.
 */
const options = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax'
} as const;

export async function issueSession(cookies: Cookies, account: Account): Promise<void> {
	cookies.set(SESSION_COOKIE, await signSession(createSession(account)), {
		...options,
		maxAge: SESSION_MAX_AGE
	});
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, options);
}
