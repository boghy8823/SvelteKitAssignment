import {
	DictionarySchema,
	ItemSchema,
	PostSchema,
	TagSchema,
	UserSchema,
	type Dictionary,
	type Item,
	type Post,
	type Tag,
	type User
} from '$lib/data/schemas';
import type { Locale } from '$lib/i18n/locales';
import rawDe from '$mocks/i18n.de.json';
import rawEn from '$mocks/i18n.en.json';
import rawItems from '$mocks/items.json';
import rawPosts from '$mocks/posts.json';
import rawTags from '$mocks/tags.json';
import rawUsers from '$mocks/users.json';

import { parseOrThrow } from './parse';

/*
 * The only module that touches mocks/, which is why lint restricts the $mocks
 * alias to this directory.
 *
 * Everything is parsed once here at module init rather than per request:
 * re-validating 220 rows on every request spends CPU rediscovering a fact that
 * is fixed at build time, and failing at init means malformed data breaks the
 * deploy instead of one visitor's page.
 */

export const tags: readonly Tag[] = Object.freeze(
	parseOrThrow(TagSchema.array(), rawTags, 'tags.json')
);

export const posts: readonly Post[] = Object.freeze(
	parseOrThrow(PostSchema.array(), rawPosts, 'posts.json')
);

export const items: readonly Item[] = Object.freeze(
	parseOrThrow(ItemSchema.array(), rawItems, 'items.json')
);

export const users: readonly User[] = Object.freeze(
	parseOrThrow(UserSchema.array(), rawUsers, 'users.json')
);

export const dictionaries: Readonly<Record<Locale, Dictionary>> = Object.freeze({
	en: parseOrThrow(DictionarySchema, rawEn, 'i18n.en.json'),
	de: parseOrThrow(DictionarySchema, rawDe, 'i18n.de.json')
});

/**
 * Constraints that span records, which a per-record schema cannot see. A tag
 * that exists on a post but not in the taxonomy renders as an empty filter chip
 * rather than an error, so it is exactly the kind of thing that ships unnoticed.
 */
function assertConsistency(): void {
	const problems: string[] = [];
	const known = new Set(tags.map((tag) => tag.slug));

	const checkTags = (kind: string, id: string, values: readonly string[]) => {
		for (const value of values) {
			if (!known.has(value)) {
				problems.push(`${kind} ${id} references unknown tag "${value}"`);
			}
		}
	};

	const checkUnique = (kind: string, values: readonly string[]) => {
		const seen = new Set<string>();

		for (const value of values) {
			if (seen.has(value)) {
				problems.push(`${kind} "${value}" is not unique`);
			}

			seen.add(value);
		}
	};

	for (const post of posts) {
		checkTags('post', post.id, post.tags);
	}

	for (const item of items) {
		checkTags('item', item.id, item.tags);
	}

	checkUnique(
		'item id',
		items.map((item) => item.id)
	);
	checkUnique(
		'post slug',
		posts.map((post) => post.slug)
	);
	checkUnique(
		'user email',
		users.map((user) => user.email)
	);

	if (problems.length > 0) {
		throw new Error(
			`Provided data is internally inconsistent:\n${problems.slice(0, 5).join('\n')}`
		);
	}
}

assertConsistency();
