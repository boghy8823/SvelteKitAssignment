<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';

	import { postSorts, type PostSort } from '$lib/data/post-sorts';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import type { MessageKey } from '$lib/i18n/keys.generated';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import { defaultPostQuery, serializePostQuery, type PostQueryState } from '$lib/url/post-query';

	let { data } = $props();

	const i18n = useI18n();

	/** Explicit rather than a computed `search.sort.${option}`, so a renamed key
	 * fails to compile instead of falling back to the raw enum at runtime. */
	const sortLabels: Record<PostSort, MessageKey> = {
		newest: 'search.sort.newest',
		oldest: 'search.sort.oldest',
		title: 'search.sort.title'
	};

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('nav.search'),
			description: i18n.t('search.placeholder'),
			path: '/search',
			// A result page per query is infinite, near-duplicate, and worthless in an
			// index. `follow` keeps the posts it links to discoverable.
			noindex: true
		})
	);

	const basePath = $derived(resolve('/[locale=locale]/search', { locale: i18n.locale }));

	const filtered = $derived(data.query.q !== '' || data.query.tags.length > 0);

	function href(query: PostQueryState): string {
		const search = serializePostQuery(query);

		return search ? `${basePath}?${search}` : basePath;
	}

	/**
	 * resolve() cannot take route params and a computed query at once, so the route
	 * id is resolved into `basePath` and only the query string is appended here.
	 * Every URL this produces is therefore a resolved route.
	 */
	function navigate(query: PostQueryState, replaceState: boolean) {
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- basePath came from resolve(); this only appends a query string
		void goto(href(query), { replaceState, keepFocus: true, noScroll: true });
	}

	let pending: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(pending));

	/**
	 * Typing replaces the history entry rather than pushing one, so Back returns to
	 * the page before the search instead of walking one character at a time. The
	 * surrounding form still submits normally when scripting is unavailable.
	 */
	function onInput(event: Event) {
		const { value } = event.currentTarget as HTMLInputElement;

		clearTimeout(pending);
		pending = setTimeout(() => navigate({ ...data.query, q: value }, true), 250);
	}

	/** Choosing a sort or a tag is a committed navigation, so it pushes an entry
	 * and Back undoes exactly that one decision. */
	function onSortChange(event: Event) {
		const { value } = event.currentTarget as HTMLSelectElement;
		const sort = postSorts.find((candidate) => candidate === value) ?? defaultPostQuery.sort;

		navigate({ ...data.query, sort }, false);
	}

	function onTagChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const tags = data.query.tags.filter((tag) => tag !== input.value);

		navigate({ ...data.query, tags: input.checked ? [...tags, input.value] : tags }, false);
	}
</script>

<Seo {meta} />

<Container width="wide" class="py-section">
	<Heading level={1}>{i18n.t('nav.search')}</Heading>

	<!-- GET, so a search is a shareable URL and works with scripting disabled. -->
	<form method="GET" action={basePath} class="mt-8 flex flex-col gap-5" data-sveltekit-keepfocus>
		<div class="flex flex-wrap items-end gap-3">
			<div class="min-w-64 flex-1">
				<label for="search-q" class="mb-1.5 block text-sm font-medium">
					{i18n.t('nav.search')}
				</label>
				<input
					id="search-q"
					name="q"
					type="search"
					value={data.query.q}
					placeholder={i18n.t('search.placeholder')}
					oninput={onInput}
					class="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-muted"
				/>
			</div>

			<div>
				<label for="search-sort" class="mb-1.5 block text-sm font-medium">
					{i18n.t('search.sort.label')}
				</label>
				<select
					id="search-sort"
					name="sort"
					value={data.query.sort}
					onchange={onSortChange}
					class="h-10 rounded-md border border-border-strong bg-surface px-3 text-sm text-fg"
				>
					{#each postSorts as option (option)}
						<option value={option}>{i18n.t(sortLabels[option])}</option>
					{/each}
				</select>
			</div>

			<!-- Redundant when the debounce fires, and the only way to search without
			     scripting. SvelteKit routes GET submissions through the client router,
			     so it costs no full page load when JavaScript is available. -->
			<Button type="submit">{i18n.t('search.submit')}</Button>
		</div>

		<fieldset>
			<legend class="mb-2 text-sm font-medium">{i18n.t('search.filters.tags')}</legend>

			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				{#each data.tags as tag (tag.slug)}
					<label class="flex items-center gap-2 text-sm text-fg-muted">
						<input
							type="checkbox"
							name="tags"
							value={tag.slug}
							checked={data.query.tags.includes(tag.slug)}
							onchange={onTagChange}
							class="size-4 rounded border-border-strong"
						/>
						<!-- Counted against the query minus the tag filter, so the number
						     answers "how many if I click this" rather than restating the
						     result already on screen. -->
						{i18n.t('search.filters.tagOption', { label: tag.label, count: tag.count })}
					</label>
				{/each}

				{#if filtered}
					<!-- eslint-disable svelte/no-navigation-without-resolve -- href() builds on basePath, which came from resolve() -->
					<a
						href={href({ ...defaultPostQuery, sort: data.query.sort })}
						data-sveltekit-noscroll
						class="text-sm text-accent underline-offset-2 hover:underline"
					>
						{i18n.t('search.filters.clear')}
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				{/if}
			</div>
		</fieldset>
	</form>

	<!--
		Announced politely, so a screen-reader user hears the result count change
		after a debounced navigation rather than discovering it by exploring.
	-->
	<p aria-live="polite" class="mt-8 text-sm text-fg-muted">
		{#if !filtered}
			{i18n.t('search.prompt')}
		{:else if data.results.total === 0}
			{i18n.t('search.noResults')}
		{:else if data.query.q === ''}
			<!-- The provided `search.results` quotes the query, which reads as empty
			     quotes when only a tag is selected, so tag-only results get their own
			     string. It is phrased without a plural, because the dictionary is flat
			     and inventing a plural form would fork the provided key. -->
			{i18n.t('search.results.filtered', { count: data.results.total })}
		{:else}
			{i18n.t('search.results', { count: data.results.total, query: data.query.q })}
		{/if}
	</p>

	{#if data.results.rows.length > 0}
		<ul class="mt-6 divide-y divide-border border-t border-border">
			{#each data.results.rows as post (post.slug)}
				<li class="py-5">
					<Heading level={2} size="md">
						<a
							href={resolve('/[locale=locale]/blog/[slug]', {
								locale: i18n.locale,
								slug: post.slug
							})}
							class="underline-offset-2 hover:underline"
						>
							{post.title}
						</a>
					</Heading>

					<div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
						<time datetime={post.publishedAt}>{i18n.format.date(post.publishedAt)}</time>
						<span aria-hidden="true">·</span>
						<span>{i18n.t('blog.readingTime', { minutes: post.readingTimeMinutes })}</span>

						{#each post.tags as tag (tag)}
							<Badge variant="accent">{tag}</Badge>
						{/each}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</Container>
