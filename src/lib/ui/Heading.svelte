<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cx } from './classes';

	const sizes = {
		display: 'text-display font-semibold',
		lg: 'text-2xl font-semibold',
		md: 'text-lg font-semibold',
		sm: 'text-sm font-semibold'
	} as const satisfies Record<string, string>;

	interface Props {
		/** Document outline position. Never chosen for visual weight. */
		level: 1 | 2 | 3 | 4;
		/** Visual weight, deliberately independent of `level` so heading order
		 * can stay correct without forcing a type scale on the page. */
		size?: keyof typeof sizes;
		class?: string;
		children: Snippet;
	}

	let { level, size, class: className = '', children }: Props = $props();

	const defaultSizes = { 1: 'display', 2: 'lg', 3: 'md', 4: 'sm' } as const;
	const resolved = $derived(sizes[size ?? defaultSizes[level]]);
</script>

<svelte:element this={`h${level}`} class={cx(resolved, className)}>
	{@render children()}
</svelte:element>
