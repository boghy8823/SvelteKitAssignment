<script lang="ts">
	import '../app.css';

	import { onDestroy } from 'svelte';

	import favicon from '$lib/assets/favicon.svg';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';
	import { provideToasts } from '$lib/ui/toast.svelte.ts';
	import ToastRegion from '$lib/ui/ToastRegion.svelte';

	let { children } = $props();

	const toasts = provideToasts();

	onDestroy(() => toasts.destroy());
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

<ToastRegion />
