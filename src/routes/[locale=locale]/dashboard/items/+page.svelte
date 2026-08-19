<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ItemQuery, ItemSortField } from '$lib/data/item-query';
	import ItemsTable from '$lib/features/items/ItemsTable.svelte';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Pagination from '$lib/ui/Pagination.svelte';
	import { nextItemQuery, serializeItemQuery } from '$lib/url/item-query';

	let { data } = $props();

	const i18n = useI18n();

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

	<!-- GET, so a filtered view is a URL. The field keeps its name so it works
	     with scripting disabled, exactly like the blog search. -->
	<form method="GET" action={basePath} class="mt-8 flex flex-wrap items-end gap-3">
		<div class="min-w-64 flex-1">
			<label for="items-q" class="mb-1.5 block text-sm font-medium">
				{i18n.t('dashboard.items.search')}
			</label>
			<input
				id="items-q"
				name="q"
				type="search"
				value={data.query.q}
				class="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-muted"
			/>
		</div>

		<!-- Sort and direction travel with the search so submitting the form keeps
		     the column someone chose. Page deliberately does not: a narrower result
		     invalidates the page they were on. -->
		<input type="hidden" name="sort" value={data.query.sort} />
		<input type="hidden" name="direction" value={data.query.direction} />

		<Button type="submit">{i18n.t('search.submit')}</Button>
	</form>

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
		<ItemsTable query={data.query} meta={data.meta} rows={data.rows} {sortHref}>
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
