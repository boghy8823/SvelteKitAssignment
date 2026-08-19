import { postSorts, type PostSort } from '$lib/data/post-sorts';

export interface PostQueryState {
	q: string;
	tags: readonly string[];
	sort: PostSort;
}

export const defaultPostQuery: PostQueryState = { q: '', tags: [], sort: 'newest' };

const TAG_SLUG = /^[a-z0-9-]+$/;

const MAX_QUERY_LENGTH = 100;

/**
 * Accepts both shapes the same UI can produce: `?tags=ai,design` from a shared
 * link, and `?tags=ai&tags=design` from a native checkbox form submitted without
 * JavaScript. Serialization always emits the comma form, so the canonical URL is
 * one of them rather than whichever the visitor happened to arrive with.
 */
export function parsePostQuery(params: URLSearchParams): PostQueryState {
	const tags = params
		.getAll('tags')
		.flatMap((value) => value.split(','))
		.map((value) => value.trim())
		.filter((value) => TAG_SLUG.test(value));

	const sort = params.get('sort');

	return {
		q: (params.get('q') ?? '').trim().slice(0, MAX_QUERY_LENGTH),
		tags: [...new Set(tags)].sort(),
		sort: postSorts.find((candidate) => candidate === sort) ?? defaultPostQuery.sort
	};
}

export function serializePostQuery(query: PostQueryState): string {
	const params = new URLSearchParams();

	if (query.q !== defaultPostQuery.q) {
		params.set('q', query.q);
	}

	if (query.tags.length > 0) {
		params.set('tags', [...query.tags].sort().join(','));
	}

	if (query.sort !== defaultPostQuery.sort) {
		params.set('sort', query.sort);
	}

	return params.toString().replace(/%2C/g, ',');
}
