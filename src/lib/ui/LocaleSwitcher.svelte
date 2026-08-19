<script lang="ts">
	import { page } from '$app/state';
	import { locales, type Locale } from '$lib/i18n/locales';
	import { currentSearch } from '$lib/url/current-search.svelte.ts';

	interface Props {
		current: Locale;
		label: string;
	}

	let { current, label }: Props = $props();

	const search = $derived(currentSearch());

	/**
	 * Swaps the locale segment and keeps everything else, so switching language
	 * stays on the same page with the same filters instead of dumping the reader
	 * back at the home page.
	 *
	 * Built from the live pathname rather than resolve(), because the target route
	 * is whatever the visitor is currently on. Every locale-prefixed path is a
	 * valid route by construction — that is what the param matcher guarantees.
	 */
	function href(locale: Locale): string {
		const rest = page.url.pathname.split('/').slice(2).join('/');

		return `/${locale}${rest ? `/${rest}` : ''}${search}`;
	}
</script>

<nav aria-label={label} class="flex items-center gap-1 text-sm">
	{#each locales as locale (locale)}
		{#if locale === current}
			<span aria-current="true" class="rounded-md px-2 py-1 font-semibold text-fg">
				{locale.toUpperCase()}
			</span>
		{:else}
			<!-- eslint-disable svelte/no-navigation-without-resolve -- the target is whatever route the visitor is on, in the other locale, so it is only knowable at runtime -->
			<a
				href={href(locale)}
				hreflang={locale}
				class="rounded-md px-2 py-1 text-fg-muted underline-offset-2 hover:text-fg hover:underline"
			>
				{locale.toUpperCase()}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	{/each}
</nav>
