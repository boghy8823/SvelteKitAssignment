import { budgetError, parseBudget } from '$lib/data/budget';
import type { ItemQuery } from '$lib/data/item-query';
import { err, ok, type Result } from '$lib/data/result';
import type { Item } from '$lib/data/schemas';
import { delay, faultFrom, type Fault } from '$lib/server/data/fault';
import {
	facets,
	list,
	pageMeta,
	tagLabels,
	updateBudget,
	type ItemFacets
} from '$lib/server/data/items.repo';
import { readOverlay, writeOverlay, type Overlay } from '$lib/server/data/overlay';
import { parseItemQuery } from '$lib/url/item-query';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * Why a save failed, as one word the client can branch on. A union rather than a
 * status code, because the failures need different renderings and re-deriving
 * them from 401/403/409/500 at the call site is how one ends up handled like
 * another.
 *
 * It is also the only reliable signal here. `fail()` sets a real status, and an
 * enhanced submission reads it out of the result envelope — but a full-page POST
 * to *this* page answers 200, because the response has already started streaming
 * by the time the status would be written. The reason travels in the payload, so
 * it survives either shape.
 */
export type BudgetFailure =
	'signed-out' | 'invalid' | 'forbidden' | 'missing' | 'conflict' | 'unavailable';

/**
 * Node, and neither prerendered nor cached: the response depends on a session and
 * on the query string, and it parses the 220-row dataset. Streaming also rules out
 * prerendering, which is the pair of flags most easily set at the same time by
 * mistake.
 */

/** What a load reports when it fails. A union, so the template renders the
 * cause rather than one generic apology. */
export type RowsError = 'unavailable';
export type FacetsError = 'unavailable';

/**
 * The deferred half. It resolves to a result and never rejects: a rejected promise
 * returned from `load` tears down the response mid-flight, and there is no
 * component boundary that can catch it. Failure has to arrive as data.
 */
async function loadRows(
	query: ItemQuery,
	fault: Fault,
	overlay: Overlay
): Promise<Result<readonly Item[], RowsError>> {
	try {
		await delay(fault.latencyMs);

		if (fault.rows) {
			throw new Error('Injected row failure');
		}

		const page = await list(query, overlay);

		return ok(page.rows);
	} catch (error) {
		// Logged where it happened, because the client is told only that the rows
		// are unavailable. A stack trace in a response body is a gift to no one.
		console.error('items: row load failed', error);

		return err('unavailable');
	}
}

/**
 * Eager, unlike the rows: the filter panel is how someone decides what to ask
 * for next, so it cannot be the part that arrives late. It still resolves to a
 * result, so a facet failure degrades the pickers instead of taking the page
 * down with it — the other half of the brief's partial-failure state.
 */
async function loadFacets(
	query: ItemQuery,
	fault: Fault
): Promise<Result<ItemFacets, FacetsError>> {
	try {
		if (fault.facets) {
			throw new Error('Injected facet failure');
		}

		return ok(await facets(query));
	} catch (error) {
		console.error('items: facet load failed', error);

		return err('unavailable');
	}
}

export const actions = {
	/**
	 * The one write. It re-checks the session and the role itself: the layout guard
	 * covers navigation, but an action runs before the loads, so a crafted POST
	 * never passes through it. Hiding the button is a courtesy; this is the
	 * enforcement.
	 */
	budget: async ({ cookies, locals, request, url }) => {
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const raw = data.get('budget');

		if (!locals.user) {
			// Anonymous, so there is nothing to explain — the session expired under
			// them. The client turns this into a trip back through the login page.
			return fail(401, { id, reason: 'signed-out' as const satisfies BudgetFailure });
		}

		const invalid = budgetError(raw);
		const budget = parseBudget(raw);

		if (invalid || budget === null) {
			return fail(422, {
				id,
				reason: 'invalid' as const satisfies BudgetFailure,
				message: invalid
			});
		}

		if (faultFrom(url).write) {
			// The injected infrastructure failure, so the rollback path can be seen
			// without breaking anything real.
			return fail(500, { id, reason: 'unavailable' as const satisfies BudgetFailure });
		}

		const overlay = await readOverlay(cookies);

		const result = await updateBudget(
			{ id, budget, expectedUpdatedAt: String(data.get('expectedUpdatedAt') ?? '') },
			locals.user,
			overlay
		);

		if (!result.ok) {
			switch (result.error.kind) {
				case 'forbidden':
					return fail(403, { id, reason: 'forbidden' as const satisfies BudgetFailure });

				case 'not-found':
					return fail(404, { id, reason: 'missing' as const satisfies BudgetFailure });

				case 'conflict':
					// 409 carries the row as it now stands, so the editor can show both
					// numbers instead of sending someone to look for the difference.
					return fail(409, {
						id,
						reason: 'conflict' as const satisfies BudgetFailure,
						current: {
							budget: result.error.current.budget,
							updatedAt: result.error.current.updatedAt
						}
					});
			}
		}

		await writeOverlay(cookies, result.data.overlay);

		return { id, budget: result.data.item.budget, updatedAt: result.data.item.updatedAt };
	}
} satisfies Actions;

export const load: PageServerLoad = async ({ cookies, depends, locals, url }) => {
	// The one thing a budget edit invalidates. `invalidateAll()` would re-run the
	// layout's dictionary load and the session lookup to refresh one number.
	depends('app:items');

	const query = parseItemQuery(url.searchParams);
	const fault = faultFrom(url);

	// Read once per request and threaded down, rather than reached for inside the
	// repository: the repository does not know what a cookie is, which is what
	// keeps it testable without a request.
	const overlay = await readOverlay(cookies);

	// Started before the eager awaits, so injected latency overlaps the facet
	// and count work instead of starting after it.
	const rows = loadRows(query, fault, overlay);

	// Awaited, so the table can size itself before the rows exist: the skeleton
	// renders exactly as many rows as are coming and the summary line does not
	// change when they land. The facet counts are eager for the same reason — the
	// filter panel is how someone decides what to ask for next, so it cannot be
	// the part that arrives late.
	const [meta, groups, labels] = await Promise.all([
		pageMeta(query),
		loadFacets(query, fault),
		tagLabels(locals.locale)
	]);

	/*
	 * Streamed by default. Awaiting the 25-row table into the first HTML
	 * made Slow 4G LCP *worse* (~2340ms vs ~2170ms): TTFB waited on 25
	 * BudgetCells, and campaign names in a fat document became the LCP
	 * element. Empty skeleton cells are not LCP candidates; the heading
	 * is. Flush that first, and let the rows follow.
	 *
	 * `?stream=off` still awaits, because streaming resolves through a
	 * script and a reader without JavaScript would sit on the skeleton.
	 *
	 * Returning a value rather than a promise is what switches the mode:
	 * Svelte renders the pending branch of `{#await}` during SSR, so
	 * keeping the promise would keep the skeleton no matter how quickly
	 * it settled.
	 */
	if (url.searchParams.get('stream') === 'off') {
		return { query, meta, facets: groups, tagLabels: labels, rows: await rows };
	}

	return { query, meta, facets: groups, tagLabels: labels, rows };
};
