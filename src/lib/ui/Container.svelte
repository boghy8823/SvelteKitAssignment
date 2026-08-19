<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cx } from './classes';

	const widths = {
		prose: 'max-w-2xl',
		default: 'max-w-5xl',
		wide: 'max-w-7xl'
	} as const satisfies Record<string, string>;

	interface Props {
		width?: keyof typeof widths;
		class?: string;
		children: Snippet;
	}

	let { width = 'default', class: className = '', children }: Props = $props();
</script>

<div class={cx('mx-auto w-full px-gutter', widths[width], className)}>
	{@render children()}
</div>
