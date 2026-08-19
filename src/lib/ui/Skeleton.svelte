<script lang="ts">
	import { cx } from './classes';

	interface Props {
		/** Sizing lives with the caller: a skeleton has to match the real row's
		 * box exactly, or streaming it in becomes a layout shift. */
		class?: string;
		/** Matches the radius of whatever it stands in for. */
		radius?: 'sm' | 'md' | 'full';
	}

	let { class: className = '', radius = 'sm' }: Props = $props();

	const radii = { sm: 'rounded-sm', md: 'rounded-md', full: 'rounded-full' } as const;
</script>

<!--
	Decorative by design: the region that owns a set of skeletons is what
	announces loading, via aria-busy. Announcing each placeholder would spam
	the accessibility tree with meaningless updates. The pulse is disabled
	globally under prefers-reduced-motion.
-->
<div
	aria-hidden="true"
	class={cx('animate-pulse bg-surface-sunken', radii[radius], className)}
></div>
