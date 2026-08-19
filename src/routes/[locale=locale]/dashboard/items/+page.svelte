<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { canEdit } from '$lib/data/account';
	import {
		facetGroups,
		type FacetGroup,
		type ItemQuery,
		type ItemSortField
	} from '$lib/data/item-query';
	import type { ItemChannel, ItemStatus } from '$lib/data/schemas';
	import { BudgetEdits } from '$lib/features/items/budget-edits.svelte.ts';
	import { channelLabels, statusLabels } from '$lib/features/items/columns';
	import ItemFilters from '$lib/features/items/ItemFilters.svelte';
	import ItemsTable from '$lib/features/items/ItemsTable.svelte';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Pagination from '$lib/ui/Pagination.svelte';
	import { useToasts } from '$lib/ui/toast.svelte.ts';
	import { nextItemQuery, serializeItemQuery } from '$lib/url/item-query';

	let { data, form } = $props();

	const i18n = useI18n();
	const toasts = useToasts();

	/** The same predicate the action enforces. Here it decides whether to render a
	 * control; there it decides whether to honour a request. */
	const writable = $derived(canEdit(data.user));

	/**
	 * Owned here rather than inside the table, so an optimistic value survives the
	 * re-render that arrives when the rows reload.
	 */
	const edits = new BudgetEdits();

	/**
	 * Reacts to whatever the action returned. Scoped invalidation is the point:
	 * `invalidate('app:items')` re-runs the one load that declared `app:items`,
	 * while `invalidateAll()` would also re-run the layout's dictionary load and
	 * the session lookup to refresh a single number.
	 */
	$effect(() => {
		if (!form) {
			return;
		}

		if ('reason' in form) {
			toasts.show(i18n.t('table.budget.failed'), { tone: 'error' });

			return;
		}

		void invalidate('app:items');
		toasts.show(i18n.t('table.budget.saved'), { tone: 'success' });
	});

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('dashboard.items.title'),
			description: i18n.t('dashboard.subtitle'),
			path: '/dashboard/items',
			noindex: true
		})
	);

	const basePath = $derived(resolve('/[locale=locale]/dashboard/items', { locale: i18n.locale }));

	/**
	 * Every control on this page is a link to a URL, so the whole view is
	 * shareable and the back button works. `nextItemQuery` owns the one rule that
	 * is easy to get wrong: narrowing the results resets to page 1, re-sorting
	 * keeps the page you were on.
	 */
	function href(patch: Partial<ItemQuery>): string {
		const search = serializeItemQuery(nextItemQuery(data.query, patch));

		return search ? `${basePath}?${search}` : basePath;
	}

	/** Clicking the active column flips direction; a new column starts descending,
	 * because "most" is the question people ask first of a numeric column. */
	function sortHref(field: ItemSortField): string {
		const active = data.query.sort === field;

		return href({
			sort: field,
			direction: active && data.query.direction === 'desc' ? 'asc' : 'desc'
		});
	}

	/**
	 * A facet toggle is a committed decision, so it pushes a history entry and Back
	 * undoes exactly that one filter. Keystrokes are the opposite and belong to the
	 * form's submit; that split is the same one the blog search makes.
	 */
	function apply(group: FacetGroup, values: readonly string[]) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- href() builds on basePath, which came from resolve()
		void goto(href({ [group]: [...values] }), { keepFocus: true, noScroll: true });
	}

	const isFiltered = $derived(
		data.query.q !== '' || facetGroups.some((group) => data.query[group].length > 0)
	);

	/** Facet options come from the repository's counts, so an option's number
	 * answers "how many would I get if I clicked this". Labels are translated
	 * here, because the repository has no business knowing the reader's language. */
	const facetFields = $derived([
		{
			group: 'status' as const,
			label: i18n.t('dashboard.items.filters.status'),
			options: data.facets.status.map((facet) => ({
				value: facet.value,
				label: i18n.t(statusLabels[facet.value as ItemStatus]),
				count: facet.count
			}))
		},
		{
			group: 'channel' as const,
			label: i18n.t('dashboard.items.filters.channel'),
			options: data.facets.channel.map((facet) => ({
				value: facet.value,
				label: i18n.t(channelLabels[facet.value as ItemChannel]),
				count: facet.count
			}))
		},
		{
			group: 'tags' as const,
			label: i18n.t('dashboard.items.filters.tags'),
			options: data.facets.tags.map((facet) => ({
				value: facet.value,
				// Tag labels live in the taxonomy, not the dictionary: they are data.
				label: data.tagLabels[facet.value] ?? facet.value,
				count: facet.count
			}))
		}
	]);

	/** The same view with the rows awaited on the server. Built from the live query
	 * so the fallback keeps whatever filters are applied. */
	const noStreamQuery = $derived(
		[serializeItemQuery(data.query), 'stream=off'].filter(Boolean).join('&')
	);

	const directions = { asc: 'a11y.direction.asc', desc: 'a11y.direction.desc' } as const;

	const columnLabels = {
		name: 'dashboard.items.column.name',
		status: 'dashboard.items.column.status',
		channel: 'dashboard.items.column.channel',
		owner: 'dashboard.items.column.owner',
		budget: 'dashboard.items.column.budget',
		spent: 'dashboard.items.column.spent',
		ctr: 'dashboard.items.column.ctr',
		updatedAt: 'dashboard.items.column.updated'
	} as const;

	/**
	 * Announced after each navigation, because sorting and paging change the table
	 * without moving focus — a sighted user sees the rows change and a screen-reader
	 * user would otherwise have nothing to tell them anything happened.
	 */
	const summary = $derived(
		i18n.t('a11y.tableSummary', {
			count: data.meta.to - data.meta.from,
			total: data.meta.total,
			column: i18n.t(columnLabels[data.query.sort]),
			direction: i18n.t(directions[data.query.direction])
		})
	);
</script>

<Seo {meta} />

<Container width="wide" class="py-section">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<Heading level={1}>{i18n.t('dashboard.items.title')}</Heading>
			<p class="mt-3 text-fg-muted">{i18n.t('dashboard.subtitle')}</p>
		</div>
	</div>

	<div class="mt-8">
		<ItemFilters
			query={data.query}
			facets={facetFields}
			action={basePath}
			{apply}
			clearHref={href({ q: '', status: [], channel: [], tags: [] })}
			filtered={isFiltered}
		/>
	</div>

	<p aria-live="polite" class="sr-only">{summary}</p>

	<!--
		Hidden by CSS as soon as scripting is available. The streamed rows resolve
		through a script, so this is the way to the same table with the rows already
		in the HTML.
	-->
	<p
		data-requires-js
		class="mt-6 rounded-md border border-border-strong bg-surface-raised p-3 text-sm"
	>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath came from resolve(); this appends a query string -->
		<a href={`${basePath}?${noStreamQuery}`} class="text-accent underline-offset-2 hover:underline">
			{i18n.t('dashboard.items.noStream')}
		</a>
	</p>

	<div class="mt-6">
		<ItemsTable
			query={data.query}
			meta={data.meta}
			rows={data.rows}
			editable={writable}
			{edits}
			{sortHref}
		>
			{#snippet empty()}
				<p class="text-center text-sm text-fg-muted">{i18n.t('dashboard.items.empty')}</p>
			{/snippet}

			{#snippet failed()}
				<p class="text-center text-sm text-danger">{i18n.t('common.error')}</p>
			{/snippet}
		</ItemsTable>
	</div>

	<Pagination
		class="mt-6"
		page={data.meta.page}
		pageCount={data.meta.pageCount}
		summary={i18n.t('pagination.showing', {
			from: data.meta.from + 1,
			to: data.meta.to,
			total: data.meta.total
		})}
		previousLabel={i18n.t('pagination.previous')}
		nextLabel={i18n.t('pagination.next')}
		label={i18n.t('dashboard.items.title')}
		href={(page) => href({ page })}
	/>
</Container>
