/** Card grid on the blog index: four pages across the provided 20 posts. */
export const POSTS_PAGE_SIZE = 6;

/**
 * Enough rows that server-side pagination is doing real work across 220 items,
 * few enough to keep the inline-edit interaction within the INP budget.
 */
export const ITEMS_PAGE_SIZE = 25;

export interface PageMeta {
	/** Clamped into range, so it is always safe to render. */
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
	/** Zero-based slice bounds, useful for "showing x–y of z". */
	from: number;
	to: number;
}

export interface Page<T> extends PageMeta {
	rows: readonly T[];
}

/**
 * Resolves pagination bounds, clamping instead of throwing: a hand-edited or
 * stale URL should degrade to a page that exists rather than produce a 500.
 *
 * The clamped page is returned so a caller can notice the request was out of
 * range — a route may prefer a 404 over silently serving different content at
 * a crawlable URL.
 */
export function resolvePage(total: number, requestedPage: number, pageSize: number): PageMeta {
	const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 1;
	const rows = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
	const pageCount = Math.max(1, Math.ceil(rows / size));

	const requested = Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1;
	const page = Math.min(Math.max(requested, 1), pageCount);

	const from = (page - 1) * size;

	return {
		page,
		pageSize: size,
		pageCount,
		total: rows,
		from,
		to: Math.min(rows, from + size)
	};
}
