import { ItemSchema, type Item } from '$lib/data/schemas';
import rawItems from '$mocks/items.json';

import { assertNoProblems, duplicates, parseOrThrow } from '../parse';
import { tagSlugs } from './tags';

export const items: readonly Item[] = Object.freeze(
	parseOrThrow(ItemSchema.array(), rawItems, 'items.json')
);

assertNoProblems(
	[
		...duplicates(items.map((item) => item.id)).map((id) => `item id "${id}" is not unique`),
		...items.flatMap((item) =>
			item.tags
				.filter((tag) => !tagSlugs.has(tag))
				.map((tag) => `item ${item.id} references unknown tag "${tag}"`)
		)
	],
	'items.json'
);
