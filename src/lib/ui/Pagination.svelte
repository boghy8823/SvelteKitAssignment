<script lang="ts">
	interface Props {
		page: number;
		pageCount: number;
		/** Already-interpolated "Showing 1–6 of 20", so copy stays with the caller. */
		summary: string;
		previousLabel: string;
		nextLabel: string;
		label: string;
		/** Builds the URL for a page. Real links, so paging works without JS. */
		href: (page: number) => string;
		class?: string;
	}

	let {
		page,
		pageCount,
		summary,
		previousLabel,
		nextLabel,
		label,
		href,
		class: className = ''
	}: Props = $props();

	/** A window around the current page, so 40 pages do not become 40 links. */
	const windowed = $derived.by(() => {
		const size = 5;
		const start = Math.max(1, Math.min(page - 2, pageCount - size + 1));
		const end = Math.min(pageCount, start + size - 1);

		return Array.from({ length: end - start + 1 }, (_, index) => start + index);
	});
</script>

<!--
	eslint-disable svelte/no-navigation-without-resolve --
	This component is route-agnostic so the blog and the dashboard can share it.
	Page URLs come from the caller's `href`, which is where resolve() belongs.
-->
<nav aria-label={label} class={className}>
	<p class="text-sm text-fg-muted">{summary}</p>

	{#if pageCount > 1}
		<ul class="mt-3 flex flex-wrap items-center gap-1">
			<!--
				Unavailable directions are omitted rather than rendered as disabled
				links: a disabled anchor is still focusable and still announced, which
				makes it a promise the control cannot keep.
			-->
			{#if page > 1}
				<li>
					<a
						href={href(page - 1)}
						rel="prev"
						class="rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted hover:border-border-strong hover:text-fg"
					>
						{previousLabel}
					</a>
				</li>
			{/if}

			{#each windowed as candidate (candidate)}
				<li>
					{#if candidate === page}
						<span
							aria-current="page"
							class="inline-block rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg"
						>
							{candidate}
						</span>
					{:else}
						<a
							href={href(candidate)}
							class="inline-block rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted hover:border-border-strong hover:text-fg"
						>
							{candidate}
						</a>
					{/if}
				</li>
			{/each}

			{#if page < pageCount}
				<li>
					<a
						href={href(page + 1)}
						rel="next"
						class="rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted hover:border-border-strong hover:text-fg"
					>
						{nextLabel}
					</a>
				</li>
			{/if}
		</ul>
	{/if}
</nav>
