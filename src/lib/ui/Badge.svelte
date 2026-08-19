<script lang="ts">
	import type { Snippet } from 'svelte';

	import { badgeVariants, type BadgeVariant } from './badge-variants';
	import { cx } from './classes';

	interface Props {
		variant?: BadgeVariant;
		class?: string;
		children: Snippet;
	}

	let { variant = 'neutral', class: className = '', children }: Props = $props();
</script>

<span
	class={cx(
		'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
		badgeVariants[variant],
		className
	)}
>
	{@render children()}
</span>
