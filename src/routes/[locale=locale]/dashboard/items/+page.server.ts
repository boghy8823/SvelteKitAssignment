import { err, ok, type Result } from '$lib/data/result';
import type { Item } from '$lib/data/schemas';
import type { ItemQuery } from '$lib/data/item-query';
import { delay, faultFrom, type Fault } from '$lib/server/data/fault';
import { list, pageMeta } from '$lib/server/data/items.repo';
import { parseItemQuery } from '$lib/url/item-query';
import type { PageServerLoad } from './$types';

/**
 * Node, and neither prerendered nor cached: the response depends on a session and
 * on the query string, and it parses the 220-row dataset. Streaming also rules out
 * prerendering, which is the pair of flags most easily set at the same time by
 * mistake.
 */

/** What the row load reports when it fails. A union, so the template renders the
 * cause rather than one generic apology. */
export type RowsError = 'unavailable';

/**
 * The deferred half. It resolves to a result and never rejects: a rejected promise
 * returned from `load` tears down the response mid-flight, and there is no
 * component boundary that can catch it. Failure has to arrive as data.
 */
async function loadRows(
	query: ItemQuery,
	fault: Fault
): Promise<Result<readonly Item[], RowsError>> {
	try {
		await delay(fault.latencyMs);

		if (fault.rows) {
			throw new Error('Injected row failure');
		}

		const page = await list(query);

		return ok(page.rows);
	} catch (error) {
		// Logged where it happened, because the client is told only that the rows
		// are unavailable. A stack trace in a response body is a gift to no one.
		console.error('items: row load failed', error);

		return err('unavailable');
	}
}

export const load: PageServerLoad = async ({ depends, url }) => {
	// The one thing a budget edit invalidates. `invalidateAll()` would re-run the
	// layout's dictionary load and the session lookup to refresh one number.
	depends('app:items');

	const query = parseItemQuery(url.searchParams);
	const fault = faultFrom(url);

	// Awaited, so the table can size itself before the rows exist: the skeleton
	// renders exactly as many rows as are coming and the summary line does not
	// change when they land.
	const meta = await pageMeta(query);
	const rows = loadRows(query, fault);

	/*
	 * Streaming resolves the deferred half through a script, which means a reader
	 * without JavaScript would sit in front of a skeleton forever. `?stream=off`
	 * awaits the rows instead and returns them as plain data, so the table is fully
	 * server-rendered — the page links to it for exactly that case.
	 *
	 * Returning a value rather than a promise is what switches the mode: Svelte
	 * renders the pending branch of `{#await}` during SSR, so keeping the promise
	 * would keep the skeleton no matter how quickly it settled.
	 */
	if (url.searchParams.get('stream') === 'off') {
		return { query, meta, rows: await rows };
	}

	// Not awaited. This is the streamed half.
	return { query, meta, rows };
};
