<script lang="ts">
	import '../app.css';

	import { onDestroy } from 'svelte';

	import favicon from '$lib/assets/favicon.svg';
	import { provideToasts } from '$lib/ui/toast.svelte.ts';
	import ToastRegion from '$lib/ui/ToastRegion.svelte';

	let { children } = $props();

	// Toasts are document-level furniture, so they live above the locale segment.
	// Anything with copy in it belongs inside that segment, where a translator
	// exists.
	const toasts = provideToasts();

	onDestroy(() => toasts.destroy());
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<ToastRegion />
