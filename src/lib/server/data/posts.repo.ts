import { POSTS_PAGE_SIZE, resolvePage, type Page } from '$lib/data/pagination';
import type { PostSort } from '$lib/data/post-sorts';
import type { Post } from '$lib/data/schemas';
import type { Locale } from '$lib/i18n/locales';

import { posts } from './dataset/posts';
import { tags as taxonomy } from './dataset/tags';

export interface PostSummary {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	tags: readonly string[];
	author: Post['author'];
	publishedAt: string;
	readingTimeMinutes: number;
	coverColor: string;
}

export interface PostDetail extends PostSummary {
	body: string;
}

export interface TagFacet {
	slug: string;
	/** Already resolved to the query's locale, so the route does no lookup. */
	label: string;
	count: number;
}

export interface PostQuery {
	locale: Locale;
	page?: number;
	pageSize?: number;
	/** Free text. Matched against titles only — see `matchesText`. */
	q?: string;
	tags?: readonly string[];
	sort?: PostSort;
}

/**
 * Lowercase and strip diacritics so a German query matches a German title
 * without the reader having to reproduce umlauts exactly.
 */
function normalise(value: string, locale: Locale): string {
	return value
		.toLocaleLowerCase(locale)
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '');
}

/**
 * Titles only, deliberately. Every post in the provided dataset shares one
 * identical body and excerpt, so matching those would return the whole
 * collection for any query and make search look broken. With real content this
 * would widen to the body, which is a change in this function alone.
 */
function matchesText(post: Post, locale: Locale, needle: string): boolean {
	return normalise(post.translations[locale].title, locale).includes(needle);
}

function toSummary(post: Post, locale: Locale): PostSummary {
	const { title, excerpt } = post.translations[locale];

	return {
		id: post.id,
		slug: post.slug,
		title,
		excerpt,
		tags: post.tags,
		author: post.author,
		publishedAt: post.publishedAt,
		readingTimeMinutes: post.readingTimeMinutes,
		coverColor: post.coverColor
	};
}

/** Slug is the tiebreaker so equal keys never reorder between requests. */
function compare(a: Post, b: Post, sort: PostSort, locale: Locale): number {
	if (sort === 'title') {
		const byTitle = a.translations[locale].title.localeCompare(
			b.translations[locale].title,
			locale
		);

		return byTitle !== 0 ? byTitle : a.slug.localeCompare(b.slug);
	}

	const byDate =
		sort === 'oldest'
			? a.publishedAt.localeCompare(b.publishedAt)
			: b.publishedAt.localeCompare(a.publishedAt);

	return byDate !== 0 ? byDate : a.slug.localeCompare(b.slug);
}

/**
 * The query reduced to what filtering needs, normalised once per request rather
 * than once per post.
 */
interface Filter {
	locale: Locale;
	needle?: string;
	tags?: ReadonlySet<string>;
}

function toFilter(query: PostQuery): Filter {
	const { locale } = query;

	return {
		locale,
		needle: query.q?.trim() ? normalise(query.q.trim(), locale) : undefined,
		tags: query.tags?.length ? new Set(query.tags) : undefined
	};
}

/**
 * `exclude` drops the tag constraint, which is what lets a facet count answer
 * "how many would I get if I clicked this" rather than "how many are in the
 * result I already narrowed".
 */
function matches(post: Post, filter: Filter, exclude?: 'tags'): boolean {
	const { needle, tags } = filter;

	if (needle && !matchesText(post, filter.locale, needle)) {
		return false;
	}

	// IN semantics within the tag group: any match qualifies.
	if (exclude !== 'tags' && tags && !post.tags.some((tag) => tags.has(tag))) {
		return false;
	}

	return true;
}

/*
 * Shaped like an API client rather than an array helper: the routes are written
 * against a seam that a database or CMS could sit behind without anything above
 * it changing.
 */

export async function list(query: PostQuery): Promise<Page<PostSummary>> {
	const { locale, sort = 'newest' } = query;
	const filter = toFilter(query);

	const filtered = posts.filter((post) => matches(post, filter));

	const sorted = [...filtered].sort((a, b) => compare(a, b, sort, locale));
	const meta = resolvePage(sorted.length, query.page ?? 1, query.pageSize ?? POSTS_PAGE_SIZE);

	return {
		...meta,
		rows: sorted.slice(meta.from, meta.to).map((post) => toSummary(post, locale))
	};
}

export async function get(slug: string, locale: Locale): Promise<PostDetail | null> {
	const post = posts.find((candidate) => candidate.slug === slug);

	if (!post) {
		return null;
	}

	return { ...toSummary(post, locale), body: post.translations[locale].body };
}

/**
 * Tag options for the search UI, labelled in the reader's locale and counted
 * against the query minus the tag filter itself.
 */
export async function tagFacets(query: PostQuery): Promise<readonly TagFacet[]> {
	const filter = toFilter(query);
	const candidates = posts.filter((post) => matches(post, filter, 'tags'));
	const counts = new Map(taxonomy.map((tag) => [tag.slug, 0]));

	for (const post of candidates) {
		for (const tag of post.tags) {
			const current = counts.get(tag);

			if (current !== undefined) {
				counts.set(tag, current + 1);
			}
		}
	}

	// Zero counts are kept rather than dropped, so an option cannot disappear from
	// under the pointer as the query narrows.
	return taxonomy.map((tag) => ({
		slug: tag.slug,
		label: tag.label[query.locale],
		count: counts.get(tag.slug) ?? 0
	}));
}

/** Every slug, for prerender entries and sitemap generation. */
export async function slugs(): Promise<readonly string[]> {
	return posts.map((post) => post.slug);
}
