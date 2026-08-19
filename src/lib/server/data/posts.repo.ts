import { POSTS_PAGE_SIZE, resolvePage, type Page } from '$lib/data/pagination';
import type { Post } from '$lib/data/schemas';
import type { Locale } from '$lib/i18n/locales';

import { posts } from './dataset';

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

export const postSorts = ['newest', 'oldest', 'title'] as const;

export type PostSort = (typeof postSorts)[number];

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

/*
 * Shaped like an API client rather than an array helper: the routes are written
 * against a seam that a database or CMS could sit behind without anything above
 * it changing.
 */

export async function list(query: PostQuery): Promise<Page<PostSummary>> {
	const { locale, sort = 'newest' } = query;
	const needle = query.q?.trim() ? normalise(query.q.trim(), locale) : undefined;
	const wanted = query.tags?.length ? new Set(query.tags) : undefined;

	const filtered = posts.filter((post) => {
		if (needle && !matchesText(post, locale, needle)) {
			return false;
		}

		// IN semantics within the tag group: any match qualifies.
		return !wanted || post.tags.some((tag) => wanted.has(tag));
	});

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

/** Every slug, for prerender entries and sitemap generation. */
export async function slugs(): Promise<readonly string[]> {
	return posts.map((post) => post.slug);
}
