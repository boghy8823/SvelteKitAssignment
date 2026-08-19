<script lang="ts">
	import { provideI18n } from '$lib/i18n/context.svelte.ts';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';

	let { data, children } = $props();

	const i18n = provideI18n(() => ({ locale: data.locale, messages: data.messages }));
</script>

<div class="min-h-dvh bg-surface text-fg">
	<a
		href="#main"
		class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
	>
		{i18n.t('a11y.skipToContent')}
	</a>

	<header class="flex items-center justify-end border-b border-border px-gutter py-3">
		<ThemeToggle label={i18n.t('a11y.themeToggle')} />
	</header>

	<main id="main">
		{@render children()}
	</main>
</div>
