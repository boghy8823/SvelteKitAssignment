import type { Account } from '$lib/data/account';
import type { User } from '$lib/data/schemas';
import { constantTimeEquals } from '$lib/server/auth/password';

import { users } from './dataset/users';

/** Strips the password on the way out, so no caller can leak what it never has. */
function toAccount(user: User): Account {
	const { id, email, name, role } = user;

	return { id, email, name, role };
}

/**
 * A password of the same shape as the real ones, compared against when no
 * account matches. Without it, a missing email would return before any
 * comparison happened and the response time would answer "does this address have
 * an account here?" for anyone willing to measure.
 */
const DECOY = 'x'.repeat(8);

export async function authenticate(email: string, password: string): Promise<Account | null> {
	const normalised = email.trim().toLowerCase();
	const user = users.find((candidate) => candidate.email.toLowerCase() === normalised);
	const matches = constantTimeEquals(user?.password ?? DECOY, password);

	return user && matches ? toAccount(user) : null;
}

/**
 * The session cookie carries a subject, and every request resolves it back to an
 * account here. That is what makes a signed role safe: the cookie cannot be
 * edited, and the account behind it is still consulted, so removing a user or
 * changing their role takes effect on their next request rather than in a week.
 */
export async function byId(id: string): Promise<Account | null> {
	const user = users.find((candidate) => candidate.id === id);

	return user ? toAccount(user) : null;
}
