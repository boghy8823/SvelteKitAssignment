import type { ItemSortField } from '$lib/data/item-query';
import type { ItemChannel, ItemStatus } from '$lib/data/schemas';
import type { MessageKey } from '$lib/i18n/keys.generated';
import type { BadgeVariant } from '$lib/ui/badge-variants';

/**
 * The table's shape in one place, because three things have to agree about it:
 * the header cells, the body cells, and the skeleton that stands in for them.
 * A column added here appears in all three or in none.
 */
export interface ItemColumn {
	field: ItemSortField;
	label: MessageKey;
	/** Numbers right-align so digits line up and magnitudes are comparable. */
	align: 'start' | 'end';
	/**
	 * Fixed width. With `table-layout: fixed` these are what the browser uses
	 * instead of measuring content, which is what stops the columns from resizing
	 * when the streamed rows replace the skeleton.
	 */
	width: string;
	/** Width of the placeholder bar, so the skeleton reads as this kind of value. */
	placeholder: string;
}

export const itemColumns: readonly ItemColumn[] = [
	{
		field: 'name',
		label: 'dashboard.items.column.name',
		align: 'start',
		width: '18rem',
		placeholder: 'w-48'
	},
	{
		field: 'status',
		label: 'dashboard.items.column.status',
		align: 'start',
		width: '7.5rem',
		placeholder: 'w-16'
	},
	{
		field: 'channel',
		label: 'dashboard.items.column.channel',
		align: 'start',
		width: '7rem',
		placeholder: 'w-14'
	},
	{
		field: 'owner',
		label: 'dashboard.items.column.owner',
		align: 'start',
		width: '9rem',
		placeholder: 'w-24'
	},
	{
		field: 'budget',
		label: 'dashboard.items.column.budget',
		align: 'end',
		width: '8rem',
		placeholder: 'w-16'
	},
	{
		field: 'spent',
		label: 'dashboard.items.column.spent',
		align: 'end',
		width: '8rem',
		placeholder: 'w-16'
	},
	{
		field: 'ctr',
		label: 'dashboard.items.column.ctr',
		align: 'end',
		width: '6rem',
		placeholder: 'w-12'
	},
	{
		field: 'updatedAt',
		label: 'dashboard.items.column.updated',
		align: 'end',
		width: '10rem',
		placeholder: 'w-24'
	}
];

/*
 * Enum-to-copy maps rather than a computed `status.${value}` key. The lookup is
 * exhaustive by type, so adding a status to the schema breaks the build here
 * instead of rendering a raw key to a reader.
 */

export const statusLabels = {
	draft: 'status.draft',
	scheduled: 'status.scheduled',
	active: 'status.active',
	paused: 'status.paused',
	completed: 'status.completed',
	archived: 'status.archived'
} as const satisfies Record<ItemStatus, MessageKey>;

export const channelLabels = {
	email: 'channel.email',
	sms: 'channel.sms',
	web: 'channel.web',
	social: 'channel.social',
	push: 'channel.push'
} as const satisfies Record<ItemChannel, MessageKey>;

/** Only `active` earns colour. If every state is highlighted, none of them is. */
export const statusVariants = {
	draft: 'neutral',
	scheduled: 'accent',
	active: 'success',
	paused: 'neutral',
	completed: 'accent',
	archived: 'neutral'
} as const satisfies Record<ItemStatus, BadgeVariant>;
