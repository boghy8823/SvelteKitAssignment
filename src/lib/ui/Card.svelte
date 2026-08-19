<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cx } from './classes';

	const paddings = {
		none: '',
		sm: 'p-4',
		md: 'p-gutter'
	} as const satisfies Record<string, string>;

	interface Props {
		padding?: keyof typeof paddings;
		class?: string;
		children: Snippet;
	}

	let { padding = 'md', class: className = '', children }: Props = $props();
</script>

<div class={cx('rounded-lg border border-border bg-surface-raised', paddings[padding], className)}>
	{@render children()}
</div>
