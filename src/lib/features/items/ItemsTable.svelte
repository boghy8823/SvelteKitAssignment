<script lang="ts">
	import type { Snippet } from 'svelte';

	import type { ItemQuery, ItemSortField } from '$lib/data/item-query';
	import type { PageMeta } from '$lib/data/pagination';
	import type { Result } from '$lib/data/result';
	import type { Item } from '$lib/data/schemas';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import Badge from '$lib/ui/Badge.svelte';
	import Skeleton from '$lib/ui/Skeleton.svelte';

	import { channelLabels, itemColumns, statusLabels, statusVariants } from './columns';

	type Rows = Result<readonly Item[], unknown>;

	interface Props {
		query: ItemQuery;
		meta: PageMeta;
		/**
		 * A promise when the rows are streamed, and the value itself when the load
		 * awaited them. Both are supported because Svelte renders the pending branch
		 * of `{#await}` during SSR, so a streamed table only becomes rows once a
		 * script resolves it — which is no help to a reader without JavaScript.
		 *
		 * Either way it resolves to a result rather than rejecting, so a failure is
		 * something this component renders instead of a torn-down response.
		 */
		rows: Promise<Rows> | Rows;
		/** Builds the URL that sorts by a column. */
		sortHref: (field: ItemSortField) => string;
		/** Shown when the rows arrive and there are none. */
		empty: Snippet;
		/** Shown when the row load resolved to its error branch. */
		failed: Snippet;
	}

	let { query, meta, rows, sortHref, empty, failed }: Props = $props();

	const i18n = useI18n();

	/**
	 * Exactly as many placeholder rows as are coming, which is why the page bounds
	 * are loaded eagerly while the rows are streamed. A fixed guess would shift the
	 * layout on the last page, and CLS is measured on the real thing.
	 */
	const placeholders = $derived(Array.from({ length: meta.to - meta.from }, (_, index) => index));

	function ariaSort(field: ItemSortField): 'ascending' | 'descending' | undefined {
		if (query.sort !== field) {
			return undefined;
		}

		return query.direction === 'asc' ? 'ascending' : 'descending';
	}

	/** One definition, applied to header, body, and placeholder cells alike: the
	 * row height has to match across all three or streaming becomes a layout shift. */
	const cell = 'px-3 py-2.5 text-sm';
</script>

<!--
	Focusable and labelled, because a table this wide scrolls horizontally on a
	narrow viewport, and a scroll container that cannot be reached from the keyboard
	is content that cannot be read.

	Svelte's rule objects to a tabindex on a non-interactive element, and axe's
	scrollable-region-focusable rule requires one here. The axe rule is the one
	describing a real user's problem, so it wins.
-->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	role="region"
	aria-label={i18n.t('dashboard.items.title')}
	tabindex="0"
	class="overflow-x-auto rounded-lg border border-border"
>
	<!--
		`table-fixed` plus the colgroup is what makes the skeleton honest: the browser
		sizes columns from the declared widths instead of from content, so the streamed
		rows land in exactly the boxes the placeholders occupied.
	-->
	<table class="w-full min-w-[74rem] table-fixed border-collapse">
		<caption class="sr-only">{i18n.t('dashboard.items.title')}</caption>

		<colgroup>
			{#each itemColumns as column (column.field)}
				<col style={`width: ${column.width}`} />
			{/each}
		</colgroup>

		<thead class="bg-surface-raised">
			<tr>
				<!--
					eslint-disable svelte/no-navigation-without-resolve --
					sortHref builds its URLs on a route id the page resolved; only the query
					string differs, which resolve() cannot express.
				-->
				{#each itemColumns as column (column.field)}
					<th scope="col" aria-sort={ariaSort(column.field)} class="p-0">
						<!--
							A link rather than a button: sorting navigates to a different URL, it
							must work without JavaScript, and the result has to be shareable.
							`aria-sort` on the header carries the current state, so the label only
							has to say what the control does.
						-->
						<a
							href={sortHref(column.field)}
							aria-label={i18n.t('a11y.sortColumn', { column: i18n.t(column.label) })}
							data-sveltekit-noscroll
							class={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold tracking-wide text-fg-muted uppercase hover:text-fg ${column.align === 'end' ? 'justify-end' : ''}`}
						>
							{i18n.t(column.label)}

							<span aria-hidden="true" class="text-[0.625rem] leading-none">
								{#if query.sort === column.field}
									{query.direction === 'asc' ? '▲' : '▼'}
								{/if}
							</span>
						</a>
					</th>
				{/each}
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
			</tr>
		</thead>

		{#snippet skeleton()}
			<tbody aria-busy="true">
				{#each placeholders as placeholder (placeholder)}
					<tr class="border-t border-border">
						{#each itemColumns as column (column.field)}
							<td class={cell}>
								<div class={column.align === 'end' ? 'flex justify-end' : ''}>
									<Skeleton class={`h-5 ${column.placeholder}`} />
								</div>
							</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		{/snippet}

		{#snippet body(result: Rows)}
			<tbody>
				{#if !result.ok}
					<tr class="border-t border-border">
						<td colspan={itemColumns.length} class="px-3 py-10">{@render failed()}</td>
					</tr>
				{:else if result.data.length === 0}
					<tr class="border-t border-border">
						<td colspan={itemColumns.length} class="px-3 py-10">{@render empty()}</td>
					</tr>
				{:else}
					<!-- Keyed by id, so a row keeps its identity — and its focus — across the
					     re-render that follows an edit. -->
					{#each result.data as item (item.id)}
						<tr class="border-t border-border hover:bg-surface-raised">
							<td class={`${cell} truncate font-medium`} title={item.name}>{item.name}</td>

							<td class={cell}>
								<Badge variant={statusVariants[item.status]}>
									{i18n.t(statusLabels[item.status])}
								</Badge>
							</td>

							<td class={`${cell} text-fg-muted`}>{i18n.t(channelLabels[item.channel])}</td>
							<td class={`${cell} truncate text-fg-muted`}>{item.owner.name}</td>

							<td class={`${cell} text-end tabular-nums`}>{i18n.format.currency(item.budget)}</td>

							<td class={`${cell} text-end text-fg-muted tabular-nums`}>
								{i18n.format.currencyPrecise(item.spent)}
							</td>

							<td class={`${cell} text-end text-fg-muted tabular-nums`}>
								{i18n.format.percent(item.ctr)}
							</td>

							<td class={`${cell} text-end text-fg-muted`}>
								<!-- Machine-readable next to the formatted value, so the timestamp
								     is unambiguous without repeating it to the reader. -->
								<time datetime={item.updatedAt}>{i18n.format.dateTime(item.updatedAt)}</time>
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		{/snippet}

		{#if rows instanceof Promise}
			{#await rows}
				{@render skeleton()}
			{:then result}
				{@render body(result)}
			{/await}
		{:else}
			{@render body(rows)}
		{/if}
	</table>
</div>
