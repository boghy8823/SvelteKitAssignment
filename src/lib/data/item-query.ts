import { z } from 'zod';

import { ITEMS_PAGE_SIZE } from './pagination';
import { ItemChannelSchema, ItemStatusSchema } from './schemas';

/** Columns the table can sort by. Every one is a real column the user sees. */
export const itemSortFields = [
	'name',
	'status',
	'channel',
	'owner',
	'budget',
	'spent',
	'ctr',
	'updatedAt'
] as const;

export const ItemSortFieldSchema = z.enum(itemSortFields);
export const SortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * The dashboard query, shared by the URL codec and the repository so the two
 * cannot disagree about what a filtered view means. It lives outside
 * lib/server because the client half of the table needs the same type.
 */
export const ItemQuerySchema = z.strictObject({
	q: z.string(),
	status: z.array(ItemStatusSchema),
	channel: z.array(ItemChannelSchema),
	tags: z.array(z.string()),
	sort: ItemSortFieldSchema,
	direction: SortDirectionSchema,
	page: z.int().positive(),
	pageSize: z.int().positive()
});

export type ItemQuery = z.infer<typeof ItemQuerySchema>;
export type ItemSortField = z.infer<typeof ItemSortFieldSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;

/** Facet groups are ANDed with each other and ORed within themselves. */
export const facetGroups = ['status', 'channel', 'tags'] as const;

export type FacetGroup = (typeof facetGroups)[number];

/**
 * Most recently touched first, which is what someone opening a campaign
 * dashboard is usually looking for.
 */
export const defaultItemQuery: ItemQuery = {
	q: '',
	status: [],
	channel: [],
	tags: [],
	sort: 'updatedAt',
	direction: 'desc',
	page: 1,
	pageSize: ITEMS_PAGE_SIZE
};
