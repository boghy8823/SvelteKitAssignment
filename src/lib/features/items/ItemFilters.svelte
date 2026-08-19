<script lang="ts">
	import type { Snippet } from 'svelte';

	import { facetGroups, type FacetGroup, type ItemQuery } from '$lib/data/item-query';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import Button from '$lib/ui/Button.svelte';
	import Combobox from '$lib/ui/Combobox.svelte';
	import type { ComboboxOption } from '$lib/ui/combobox';

	interface FacetField {
		group: FacetGroup;
		label: string;
		options: readonly ComboboxOption[];
	}

	interface Props {
		query: ItemQuery;
		facets: readonly FacetField[];
		/** Where the search form posts, and the base every filter URL is built on. */
		action: string;
		/** Applies a facet change by navigating; the URL is the state. */
		apply: (group: FacetGroup, values: readonly string[]) => void;
		clearHref: string;
		filtered: boolean;
		/** Replaces the pickers when the facet query failed. Search still submits,
		 * and the hidden fields keep the current selection so a retry of the text
		 * box cannot wipe filters the pickers can no longer show. */
		degraded?: Snippet;
	}

	let { query, facets, action, apply, clearHref, filtered, degraded }: Props = $props();

	const i18n = useI18n();

	/** Widens the per-group tuple types to plain strings. Indexing the query by a
	 * union of groups gives a union of array types, and `includes` on that narrows
	 * its argument to `never`. */
	function selection(group: FacetGroup): readonly string[] {
		return query[group];
	}
</script>

<!--
	One GET form around everything, so the free-text field works with scripting
	disabled and a filtered view is always a URL.

	The comboboxes navigate on toggle rather than waiting for a submit, so they
	contribute nothing to this form. The current facets ride along as hidden
	fields instead, which is what keeps a text search from wiping the filters
	already in the URL.
-->
<form method="GET" {action} class="flex flex-col gap-4">
	<div class="flex flex-wrap items-end gap-3">
		<div class="min-w-64 flex-1">
			<label for="items-q" class="mb-1.5 block text-sm font-medium">
				{i18n.t('dashboard.items.search')}
			</label>
			<input
				id="items-q"
				name="q"
				type="search"
				value={query.q}
				class="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-muted"
			/>
		</div>

		<!-- Sorting travels with a search so the chosen column survives it. `page`
		     deliberately does not: a narrower result invalidates the page. -->
		<input type="hidden" name="sort" value={query.sort} />
		<input type="hidden" name="direction" value={query.direction} />

		<Button type="submit">{i18n.t('search.submit')}</Button>
	</div>

	<!--
		The current facets have to travel with a search, whether the pickers are
		drawn or not: the comboboxes commit by navigating, so nothing in this form
		would otherwise carry them and a submit would wipe filters the reader can
		still see in the URL.
	-->
	{#each facetGroups as group (group)}
		{#each selection(group) as value (value)}
			<input type="hidden" name={group} {value} />
		{/each}
	{/each}

	{#if degraded}
		{@render degraded()}
	{:else}
		<div data-enhanced class="grid gap-3 sm:grid-cols-3">
			{#each facets as facet (facet.group)}
				<Combobox
					label={facet.label}
					options={facet.options}
					selected={query[facet.group]}
					onchange={(values) => apply(facet.group, values)}
					announce={(count) => i18n.t('dashboard.items.filters.options', { count })}
					placeholder={i18n.t('dashboard.items.filters.placeholder')}
				/>
			{/each}
		</div>
	{/if}

	{#if filtered}
		<div>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built on a resolved route id; only the query string differs -->
			<a href={clearHref} class="text-sm text-accent underline-offset-2 hover:underline">
				{i18n.t('search.filters.clear')}
			</a>
		</div>
	{/if}
</form>
