import type { User, UserRole } from './schemas';

/**
 * A user as the rest of the app is allowed to see one. Derived from `User` by
 * omission rather than declared separately, so adding a field to the schema
 * forces a decision here instead of leaking it by default — the field this
 * exists to exclude is `password`.
 */
export type Account = Omit<User, 'password'>;

/** Roles that may mutate. `viewer` is read-only, and that is enforced in the
 * action, not by hiding the control. */
const writers: readonly UserRole[] = ['admin', 'editor'];

export function canEdit(account: Account | null): boolean {
	return account !== null && writers.includes(account.role);
}
