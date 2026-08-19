import { z, type ZodType } from 'zod';

import {
	defaultItemQuery,
	ItemSortFieldSchema,
	SortDirectionSchema,
	type ItemQuery
} from '$lib/data/item-query';
import { ItemChannelSchema, ItemStatusSchema } from '$lib/data/schemas';

/*
 * URL is the source of truth for the dashboard view, so this codec is the
 * boundary where an arbitrary query string becomes a typed query. It is total:
 * every input produces a valid ItemQuery, because a hand-edited or stale URL
 * should degrade to something sensible rather than return a 500.
 */

/** Canonical order, so two equivalent states serialize byte-identically and the
 * result is usable as a cache key. */
const keyOrder = ['q', 'status', 'channel', 'tags', 'sort', 'direction', 'page'] as const;

/** Slug shape for tags. Also guarantees no commas, which is what makes the
 * comma-joined list format unambiguous. */
const TagSlugSchema = z.string().regex(/^[a-z0-9-]+$/);

/** Long enough for a real search, short enough to keep URLs shareable. */
const MAX_QUERY_LENGTH = 100;

const PageSchema = z.coerce.number().int().min(1).catch(defaultItemQuery.page);

/**
 * Keeps the values a schema accepts and drops the rest, rather than discarding
 * the whole list. `status=active,bogus` should filter by active: the user's
 * intent is legible, and refusing all of it would be pedantry.
 */
function pickValid<T>(value: string | null, schema: ZodType<T>): T[] {
	if (!value) {
		return [];
	}

	const parsed = value
		.split(',')
		.map((entry) => schema.safeParse(entry.trim()))
		.flatMap((result) => (result.success ? [result.data] : []));

	// Sorted and de-duplicated so ?status=paused,active and ?status=active,paused
	// are the same state and serialize identically.
	return [...new Set(parsed)].sort();
}

export function parseItemQuery(params: URLSearchParams): ItemQuery {
	const q = (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH);

	return {
		q,
		status: pickValid(params.get('status'), ItemStatusSchema),
		channel: pickValid(params.get('channel'), ItemChannelSchema),
		tags: pickValid(params.get('tags'), TagSlugSchema),
		sort: ItemSortFieldSchema.catch(defaultItemQuery.sort).parse(params.get('sort')),
		direction: SortDirectionSchema.catch(defaultItemQuery.direction).parse(params.get('direction')),
		page: PageSchema.parse(params.get('page') ?? defaultItemQuery.page),
		// Never taken from the URL. A client-controlled page size is an invitation
		// to ask for 100,000 rows, and no legitimate link needs to set it.
		pageSize: defaultItemQuery.pageSize
	};
}

function serializedValue(query: ItemQuery, key: (typeof keyOrder)[number]): string | undefined {
	switch (key) {
		case 'q':
			return query.q === defaultItemQuery.q ? undefined : query.q;

		case 'status':
			return query.status.length === 0 ? undefined : [...query.status].sort().join(',');

		case 'channel':
			return query.channel.length === 0 ? undefined : [...query.channel].sort().join(',');

		case 'tags':
			return query.tags.length === 0 ? undefined : [...query.tags].sort().join(',');

		case 'sort':
			return query.sort === defaultItemQuery.sort ? undefined : query.sort;

		case 'direction':
			return query.direction === defaultItemQuery.direction ? undefined : query.direction;

		case 'page':
			return query.page === defaultItemQuery.page ? undefined : String(query.page);
	}
}

/**
 * Serializes to a query string with no leading `?`. Defaults are omitted, which
 * keeps shared links short and means the default view has a clean URL rather
 * than one restating every default.
 */
export function serializeItemQuery(query: ItemQuery): string {
	const params = new URLSearchParams();

	for (const key of keyOrder) {
		const value = serializedValue(query, key);

		if (value !== undefined) {
			params.set(key, value);
		}
	}

	// URLSearchParams percent-encodes commas; they are safe and far more readable
	// here, and every value is a slug or enum so there is nothing to confuse.
	return params.toString().replace(/%2C/g, ',');
}

const filterKeys = ['q', 'status', 'channel', 'tags'] as const;

function sameValue(a: ItemQuery[keyof ItemQuery], b: ItemQuery[keyof ItemQuery]): boolean {
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((value, index) => value === b[index]);
	}

	return a === b;
}

/**
 * Applies a change and decides what happens to `page`.
 *
 * Narrowing the result set invalidates the current page — page 7 of a 3-page
 * result is a dead end — so filters and free text reset to 1. Re-sorting does
 * not: someone on page 3 who flips a column still wants page 3, and bouncing
 * them to the top would be the interface losing their place.
 */
export function nextItemQuery(current: ItemQuery, patch: Partial<ItemQuery>): ItemQuery {
	const merged: ItemQuery = { ...current, ...patch };

	if (patch.page !== undefined) {
		return merged;
	}

	const narrowed = filterKeys.some((key) => !sameValue(current[key], merged[key]));

	return { ...merged, page: narrowed ? 1 : current.page };
}
