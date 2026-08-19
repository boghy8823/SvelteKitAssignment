<script lang="ts">
	import '../app.css';

	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-dvh bg-surface text-fg">
	<header class="flex items-center justify-end border-b border-border px-gutter py-3">
		<ThemeToggle />
	</header>

	{@render children()}
</div>
