<script lang="ts">
	import { applyAction, deserialize } from '$app/forms';
	import { goto, invalidate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
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
	import { loginPath } from '$lib/url/locale-path';

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

	/** The row whose last save was refused as stale, if any. Cleared by resolving
	 * the conflict either way. */
	let conflict = $state<{ id: string; budget: number; updatedAt: string } | undefined>();

	/** The last save that was attempted, so a retry does not ask anyone to retype
	 * a value the interface already had. */
	let lastAttempt = $state<{ id: string; budget: number; expectedUpdatedAt: string } | undefined>();

	/** Identity of the action result already handled. `$effect` re-runs when any
	 * captured value changes, and without this a dictionary or toast-store update
	 * would replay the same toast. */
	let handled = $state<typeof form | undefined>(undefined);

	/**
	 * Re-submits a save without a form, for the retry a toast offers and for the
	 * overwrite that resolves a conflict. The form path stays on `use:enhance` so it
	 * works without JavaScript; this is the same request by hand, and it goes
	 * through `applyAction` so both paths end in the same place.
	 */
	async function save(id: string, budget: number, expectedUpdatedAt: string) {
		lastAttempt = { id, budget, expectedUpdatedAt };

		const body = new FormData();

		body.set('id', id);
		body.set('budget', String(budget));
		body.set('expectedUpdatedAt', expectedUpdatedAt);

		edits.start(id, budget);

		try {
			const response = await fetch(`${page.url.pathname}?/budget`, {
				method: 'POST',
				body,
				headers: {
					accept: 'application/json',
					'x-sveltekit-action': 'true'
				}
			});

			// Settled before the result is applied, so authoritative data is never
			// covered by an optimistic value that already had its answer.
			edits.settle(id);
			await applyAction(deserialize(await response.text()));
		} catch {
			// The network never got there. Same rollback as any other failure.
			edits.settle(id);
			toasts.show(i18n.t('table.budget.unavailable'), {
				tone: 'error',
				action: {
					label: i18n.t('common.retry'),
					run: () => void save(id, budget, expectedUpdatedAt)
				}
			});
		}
	}

	/**
	 * One place that decides what each failure looks like, because they are not
	 * interchangeable: a permission refusal is not a network blip, and a stale write
	 * is a decision rather than an apology.
	 *
	 * Scoped invalidation throughout: `invalidate('app:items')` re-runs the one load
	 * that declared `app:items`. `invalidateAll()` would also re-run the layout's
	 * dictionary load and the session lookup to refresh a single number.
	 */
	$effect(() => {
		if (!form || form === handled) {
			return;
		}

		handled = form;

		if (!('reason' in form)) {
			conflict = undefined;
			void invalidate('app:items');
			toasts.show(i18n.t('table.budget.saved'), { tone: 'success' });

			return;
		}

		switch (form.reason) {
			case 'conflict':
				// Reload so the row shows the value that won, and hand the row the two
				// numbers so the choice is made where the data is.
				void invalidate('app:items');
				conflict = { id: form.id, budget: form.current.budget, updatedAt: form.current.updatedAt };

				return;

			case 'forbidden':
				// No optimistic value was ever started for a role that cannot edit, so
				// there is nothing to roll back and no flicker to hide. Reload anyway:
				// the role may have changed under this session.
				void invalidate('app:items');
				toasts.show(i18n.t('table.budget.forbidden'), { tone: 'error' });

				return;

			case 'signed-out':
				toasts.show(i18n.t('table.budget.signedOut'), { tone: 'error' });
				// Sent to the login page carrying this URL, so signing in returns to the
				// table with its filters rather than to the dashboard root. `loginPath`
				// is already an absolute locale path; resolve() would return a relative
				// one, which is the wrong shape for a redirect target.
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- loginPath is the absolute /{locale}/login URL, with a validated redirectTo
				void goto(loginPath(i18n.locale, page.url));

				return;

			case 'missing':
				void invalidate('app:items');
				toasts.show(i18n.t('table.budget.missing'), { tone: 'error' });

				return;

			case 'invalid':
				// The editor validates first, so reaching this means a crafted body or a
				// rule that moved. Nothing was saved and nothing is inline to point at.
				toasts.show(i18n.t('table.budget.invalidToast'), { tone: 'error' });

				return;

			case 'unavailable':
				// The rollback already happened when the optimistic entry settled. The
				// toast persists — it is an error tone — and carries the retry, because
				// the value someone typed is still known here.
				toasts.show(i18n.t('table.budget.unavailable'), {
					tone: 'error',
					action: {
						label: i18n.t('common.retry'),
						run: () => {
							if (lastAttempt) {
								void save(lastAttempt.id, lastAttempt.budget, lastAttempt.expectedUpdatedAt);
							}
						}
					}
				});
		}
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
	 * Every control on this page is a URL, so the whole view is shareable and the
	 * back button works. `nextItemQuery` owns the one rule that is easy to get
	 * wrong: narrowing the results resets to page 1, re-sorting keeps the page you
	 * were on.
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
			{conflict}
			onstart={(id, budget, expectedUpdatedAt) => {
				lastAttempt = { id, budget, expectedUpdatedAt };
				edits.start(id, budget);
			}}
			onsettle={(id) => edits.settle(id)}
			onoverwrite={(id, budget, updatedAt) => {
				conflict = undefined;
				void save(id, budget, updatedAt);
			}}
			ondismissconflict={() => (conflict = undefined)}
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
