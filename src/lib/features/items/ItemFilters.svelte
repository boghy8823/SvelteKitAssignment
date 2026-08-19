<script lang="ts">
	import type { FacetGroup, ItemQuery } from '$lib/data/item-query';
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
	}

	let { query, facets, action, apply, clearHref, filtered }: Props = $props();

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

	The facets appear twice, and deliberately. The native multi-selects are the
	no-JavaScript path; they stay in the DOM when scripting is available — hidden,
	but still submitting — which is what carries the current facets when someone
	submits the text search. The comboboxes are the enhancement, and they navigate
	on toggle rather than waiting for a submit.
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

	<div data-requires-js class="grid gap-3 sm:grid-cols-3">
		{#each facets as facet (facet.group)}
			<div>
				<label for={`native-${facet.group}`} class="mb-1.5 block text-sm font-medium">
					{facet.label}
				</label>

				<select
					id={`native-${facet.group}`}
					name={facet.group}
					multiple
					size="4"
					class="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-sm text-fg"
				>
					{#each facet.options as option (option.value)}
						<option value={option.value} selected={selection(facet.group).includes(option.value)}>
							{option.label}{option.count === undefined ? '' : ` (${option.count})`}
						</option>
					{/each}
				</select>
			</div>
		{/each}
	</div>

	{#if filtered}
		<div>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- built on a resolved route id; only the query string differs -->
			<a href={clearHref} class="text-sm text-accent underline-offset-2 hover:underline">
				{i18n.t('search.filters.clear')}
			</a>
		</div>
	{/if}
</form>
