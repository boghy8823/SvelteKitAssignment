import { BudgetSchema } from '$lib/data/budget';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';

import { sign, verify } from '../auth/hmac';

/*
 * Where a budget edit actually goes.
 *
 * There is no database in this app, and the provided dataset is frozen at module
 * scope on purpose: mutating it would make one reviewer's edit visible to every
 * other request, which is the bug that shape of state always produces on a
 * server. So a write lands in a signed cookie instead, and reads apply it on top
 * of the dataset.
 *
 * The honest consequence, for the README: edits are scoped to the browser that
 * made them and capped. The repository is the seam that makes a real store a
 * one-file change, and nothing above it would notice.
 */

export const OVERLAY_COOKIE = 'edits';

/**
 * Twenty rows. A cookie must stay under 4 KB including the signature, and this
 * is enough for a reviewer to convince themselves the feature works while
 * leaving a wide margin — the test pins the worst case.
 */
export const MAX_OVERLAY_ENTRIES = 20;

/** A day. Long enough to demonstrate persistence across a reload, short enough
 * that a stale edit does not follow someone into next week. */
const OVERLAY_MAX_AGE = 60 * 60 * 24;

const EntrySchema = z.strictObject({
	budget: BudgetSchema,
	/** Set when the edit was made, and what the next edit's conflict check
	 * compares against. */
	updatedAt: z.iso.datetime()
});

export const OverlaySchema = z.record(z.string().min(1), EntrySchema);

export type OverlayEntry = z.infer<typeof EntrySchema>;
export type Overlay = z.infer<typeof OverlaySchema>;

export const EMPTY_OVERLAY: Overlay = {};

/**
 * A cookie that fails verification or no longer matches the schema is discarded
 * rather than repaired. It holds edits, not identity: losing them costs a
 * reviewer one retry, while trusting half-parsed contents would put an
 * unvalidated number into a currency column.
 */
export async function readOverlay(cookies: Cookies): Promise<Overlay> {
	const payload = await verify(cookies.get(OVERLAY_COOKIE));

	if (payload === null) {
		return EMPTY_OVERLAY;
	}

	try {
		const parsed = OverlaySchema.safeParse(JSON.parse(payload));

		return parsed.success ? parsed.data : EMPTY_OVERLAY;
	} catch {
		return EMPTY_OVERLAY;
	}
}

/**
 * Oldest-first eviction, using the insertion order JSON objects preserve. Adding
 * an entry for a row that already has one moves it to the end, so the rows
 * someone is actively working on are the last to be dropped.
 */
export function withEntry(overlay: Overlay, id: string, entry: OverlayEntry): Overlay {
	const next: Overlay = {};

	// Copied without this id first, so re-editing a row appends it rather than
	// leaving it at its original position in the eviction order.
	for (const [key, value] of Object.entries(overlay)) {
		if (key !== id) {
			next[key] = value;
		}
	}

	next[id] = entry;

	const ids = Object.keys(next);

	if (ids.length <= MAX_OVERLAY_ENTRIES) {
		return next;
	}

	for (const stale of ids.slice(0, ids.length - MAX_OVERLAY_ENTRIES)) {
		delete next[stale];
	}

	return next;
}

export async function writeOverlay(cookies: Cookies, overlay: Overlay): Promise<void> {
	cookies.set(OVERLAY_COOKIE, await sign(JSON.stringify(overlay)), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: OVERLAY_MAX_AGE
	});
}
