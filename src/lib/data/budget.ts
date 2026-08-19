import { z } from 'zod';

import type { MessageKey } from '$lib/i18n/keys.generated';

/*
 * The budget rule, imported by the inline editor and by the action that saves it.
 * Same argument as the login schema: one definition, in $lib/data rather than
 * $lib/server, so the two halves cannot drift.
 */

/**
 * Whole dollars. The dataset holds integers and the currency formatter shows no
 * cents, so accepting 1500.75 would display as 1.501 and quietly lie.
 */
export const MAX_BUDGET = 10_000_000;

export const BudgetSchema = z.number().int().nonnegative().max(MAX_BUDGET);

/**
 * `null` when the value is usable, otherwise the message key for what is wrong.
 * Total: a `File` from a crafted multipart body, an empty field, or `"abc"` all
 * produce a key rather than an exception.
 */
export function budgetError(value: unknown): MessageKey | null {
	// Form values arrive as strings. Number('') is 0, which would silently accept
	// an empty field as a zero budget, so blank is rejected before coercion.
	if (typeof value === 'string' && value.trim() === '') {
		return 'table.budget.required';
	}

	const parsed = BudgetSchema.safeParse(typeof value === 'string' ? Number(value) : value);

	return parsed.success ? null : 'table.budget.invalid';
}

/** Parses to the number the schema accepted, for callers that already checked. */
export function parseBudget(value: unknown): number | null {
	const parsed = BudgetSchema.safeParse(typeof value === 'string' ? Number(value) : value);

	return parsed.success ? parsed.data : null;
}
