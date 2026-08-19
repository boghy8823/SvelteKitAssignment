import { PostSchema, type Post } from '$lib/data/schemas';
import rawPosts from '$mocks/posts.json';

import { assertNoProblems, duplicates, parseOrThrow } from '../parse';
import { tagSlugs } from './tags';

export const posts: readonly Post[] = Object.freeze(
	parseOrThrow(PostSchema.array(), rawPosts, 'posts.json')
);

assertNoProblems(
	[
		...duplicates(posts.map((post) => post.slug)).map(
			(slug) => `post slug "${slug}" is not unique`
		),
		...posts.flatMap((post) =>
			post.tags
				.filter((tag) => !tagSlugs.has(tag))
				// An unknown tag renders as an empty filter chip rather than an error,
				// so it is exactly the kind of thing that ships unnoticed.
				.map((tag) => `post ${post.id} references unknown tag "${tag}"`)
		)
	],
	'posts.json'
);
