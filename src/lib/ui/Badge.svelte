<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cx } from './classes';

	const variants = {
		neutral: 'bg-surface-sunken text-fg-muted',
		accent: 'bg-accent-subtle text-accent',
		success: 'bg-success text-success-fg',
		danger: 'bg-danger text-danger-fg'
	} as const satisfies Record<string, string>;

	type BadgeVariant = keyof typeof variants;

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
		variants[variant],
		className
	)}
>
	{@render children()}
</span>
