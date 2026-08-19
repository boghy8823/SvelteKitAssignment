import { TagSchema, type Tag } from '$lib/data/schemas';
import rawTags from '$mocks/tags.json';

import { assertNoProblems, duplicates, parseOrThrow } from '../parse';

/*
 * The dataset is split per entity so a route only bundles what it reads. Search
 * runs on the edge and needs posts and tags; bundling the 220-row campaign file
 * with it would be a cold-start cost for data that route never touches.
 */

export const tags: readonly Tag[] = Object.freeze(
	parseOrThrow(TagSchema.array(), rawTags, 'tags.json')
);

export const tagSlugs: ReadonlySet<string> = new Set(tags.map((tag) => tag.slug));

assertNoProblems(
	duplicates(tags.map((tag) => tag.slug)).map((slug) => `tag slug "${slug}" is not unique`),
	'tags.json'
);
