<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** Appended last. Strings only: the contract is append-only, not merge. */
		class?: string;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<button {type} class={buttonClasses({ variant, size, class: className })} {...rest}>
	{@render children()}
</button>
