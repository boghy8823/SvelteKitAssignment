import { canEdit, type Account } from '$lib/data/account';
import type { FacetGroup, ItemQuery, ItemSortField } from '$lib/data/item-query';
import { resolvePage, type Page, type PageMeta } from '$lib/data/pagination';
import { err, ok, type Result } from '$lib/data/result';
import { itemChannels, itemStatuses, type Item } from '$lib/data/schemas';
import type { Locale } from '$lib/i18n/locales';

import { items } from './dataset/items';
import { tags as taxonomy } from './dataset/tags';
import { EMPTY_OVERLAY, withEntry, type Overlay } from './overlay';

export interface FacetCount {
	value: string;
	count: number;
}

export type ItemFacets = Record<FacetGroup, readonly FacetCount[]>;

/*
 * Filtering, sorting, pagination, and facet counting all happen here, written
 * the way they would be written against SQL. The point is that the seam is
 * honest: swap this module for a database client and nothing above it changes.
 */

function normalise(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

/** `IN` semantics inside a group: an empty selection means no constraint. */
function includedBy(selected: readonly string[], values: readonly string[]): boolean {
	return selected.length === 0 || values.some((value) => selected.includes(value));
}

/**
 * `AND` across facet groups. `exclude` drops one group, which is what makes
 * facet counts describe the result of clicking an option rather than the result
 * of the filter already applied.
 */
function matches(item: Item, query: ItemQuery, exclude?: FacetGroup): boolean {
	const needle = normalise(query.q.trim());

	if (needle && !normalise(item.name).includes(needle)) {
		return false;
	}

	if (exclude !== 'status' && !includedBy(query.status, [item.status])) {
		return false;
	}

	if (exclude !== 'channel' && !includedBy(query.channel, [item.channel])) {
		return false;
	}

	if (exclude !== 'tags' && !includedBy(query.tags, item.tags)) {
		return false;
	}

	return true;
}

/**
 * Lifecycle order, not alphabetical: sorting by status should read
 * draft → scheduled → active → paused → completed → archived, because that is
 * the sequence the column actually describes.
 */
const statusOrder = new Map(itemStatuses.map((status, index) => [status, index]));
const channelOrder = new Map(itemChannels.map((channel, index) => [channel, index]));

function compareField(a: Item, b: Item, field: ItemSortField): number {
	switch (field) {
		case 'name':
			return a.name.localeCompare(b.name);

		case 'status':
			return (statusOrder.get(a.status) ?? 0) - (statusOrder.get(b.status) ?? 0);

		case 'channel':
			return (channelOrder.get(a.channel) ?? 0) - (channelOrder.get(b.channel) ?? 0);

		case 'owner':
			return a.owner.name.localeCompare(b.owner.name);

		case 'budget':
			return a.budget - b.budget;

		case 'spent':
			return a.spent - b.spent;

		case 'ctr':
			return a.ctr - b.ctr;

		case 'updatedAt':
			return a.updatedAt.localeCompare(b.updatedAt);
	}
}

/**
 * Stable by construction. Only 8 distinct budgets exist across 220 rows, so
 * without the id tiebreaker a budget sort would reshuffle ties between requests
 * and pagination would show the same row twice while hiding another.
 *
 * Exported because the guarantee cannot be observed through `list`: the source
 * rows happen to be id-ordered and Array.prototype.sort is stable, so ties look
 * correct even with no tiebreaker at all. Testing the comparator directly holds
 * the contract instead of the coincidence.
 */
export function compareForSort(a: Item, b: Item, query: ItemQuery): number {
	const ordered = compareField(a, b, query.sort);
	const directed = query.direction === 'desc' ? -ordered : ordered;

	return directed !== 0 ? directed : a.id.localeCompare(b.id);
}

/**
 * Pagination bounds without the rows, so the table can size itself before the
 * data arrives: the skeleton renders exactly as many rows as are coming, and the
 * summary line does not change once they do.
 *
 * Deliberately a second pass over the data rather than a by-product of `list`.
 * Behind a database this is `SELECT COUNT(*)` next to `SELECT ... LIMIT`, which
 * is the same two queries — and the whole point of the repository seam is that
 * the routes above it are written for that shape.
 */
export async function pageMeta(query: ItemQuery): Promise<PageMeta> {
	const total = items.filter((item) => matches(item, query)).length;

	return resolvePage(total, query.page, query.pageSize);
}

/** An edited row as it should now read. Returns the original when nothing was
 * edited, so callers can apply this unconditionally. */
export function applyOverlay(item: Item, overlay: Overlay): Item {
	const entry = overlay[item.id];

	return entry ? { ...item, budget: entry.budget, updatedAt: entry.updatedAt } : item;
}

export async function list(
	query: ItemQuery,
	overlay: Overlay = EMPTY_OVERLAY
): Promise<Page<Item>> {
	const filtered = items.filter((item) => matches(item, query));

	// Overlay after filtering and before sorting, which is the only order that is
	// correct: no filter reads `budget`, and sorting by it must see the edited
	// value or an edited row would sort by a number nobody can see.
	const patched = filtered.map((item) => applyOverlay(item, overlay));

	const sorted = [...patched].sort((a, b) => compareForSort(a, b, query));
	const meta = resolvePage(sorted.length, query.page, query.pageSize);

	return { ...meta, rows: sorted.slice(meta.from, meta.to) };
}

export async function get(id: string, overlay: Overlay = EMPTY_OVERLAY): Promise<Item | null> {
	const item = items.find((candidate) => candidate.id === id);

	return item ? applyOverlay(item, overlay) : null;
}

export interface UpdateBudgetCommand {
	id: string;
	budget: number;
	/**
	 * The `updatedAt` the editor was looking at. Sending it back is what turns a
	 * blind write into a compare-and-set: if the row moved in the meantime, this no
	 * longer matches and the write is refused instead of silently winning.
	 */
	expectedUpdatedAt: string;
}

export type UpdateBudgetError =
	| { kind: 'forbidden' }
	| { kind: 'not-found' }
	/** Carries the row as it now stands, so the UI can show both values rather
	 * than telling someone to go and look. */
	| { kind: 'conflict'; current: Item };

export interface UpdateBudgetResult {
	item: Item;
	/** The caller writes this back to the cookie. The repository does not touch
	 * the response, so it stays testable without a request. */
	overlay: Overlay;
}

/**
 * The one write in the app.
 *
 * Authorisation lives here rather than in the component that renders the button.
 * Hiding a control is a courtesy to the person using it; refusing the request is
 * the enforcement, and it is the only half that survives a crafted POST.
 */
export async function updateBudget(
	command: UpdateBudgetCommand,
	account: Account | null,
	overlay: Overlay = EMPTY_OVERLAY,
	now = new Date()
): Promise<Result<UpdateBudgetResult, UpdateBudgetError>> {
	if (!canEdit(account)) {
		return err({ kind: 'forbidden' });
	}

	const stored = items.find((candidate) => candidate.id === command.id);

	if (!stored) {
		return err({ kind: 'not-found' });
	}

	const current = applyOverlay(stored, overlay);

	if (current.updatedAt !== command.expectedUpdatedAt) {
		return err({ kind: 'conflict', current });
	}

	const entry = { budget: command.budget, updatedAt: now.toISOString() };

	return ok({
		item: { ...current, ...entry },
		overlay: withEntry(overlay, command.id, entry)
	});
}

function countBy(query: ItemQuery, group: FacetGroup, values: readonly string[]): FacetCount[] {
	// Counted against the query minus this group, which is what real faceted
	// search does: the number next to "paused" answers "how many would I get if
	// I clicked this", not "how many are in the result I already narrowed".
	const candidates = items.filter((item) => matches(item, query, group));
	const counts = new Map(values.map((value) => [value, 0]));

	for (const item of candidates) {
		const itemValues = group === 'tags' ? item.tags : [item[group]];

		for (const value of itemValues) {
			const current = counts.get(value);

			if (current !== undefined) {
				counts.set(value, current + 1);
			}
		}
	}

	// Zero counts are kept rather than dropped, so the filter panel can show an
	// option as unavailable instead of making it disappear under the cursor.
	return values.map((value) => ({ value, count: counts.get(value) ?? 0 }));
}

/**
 * Tag slug to label in one locale. Tag names are data, not copy — they come from
 * the provided taxonomy rather than the dictionary — so the filter panel needs
 * this to render a facet as something other than a slug.
 */
export async function tagLabels(locale: Locale): Promise<Record<string, string>> {
	return Object.fromEntries(taxonomy.map((tag) => [tag.slug, tag.label[locale]]));
}

export async function facets(query: ItemQuery): Promise<ItemFacets> {
	return {
		status: countBy(query, 'status', itemStatuses),
		channel: countBy(query, 'channel', itemChannels),
		tags: countBy(
			query,
			'tags',
			taxonomy.map((tag) => tag.slug)
		)
	};
}
