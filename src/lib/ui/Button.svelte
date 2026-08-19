<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	import { buttonClasses, type ButtonSize, type ButtonVariant } from './button-styles';

	interface Props extends Omit<HTMLButtonAttributes, 'class'> {
		variant?: ButtonVariant;
		size?: ButtonSize;
		/** Appended last. Strings only: the contract is append-only, not merge. */
		class?: string;
		/** The element itself, so a caller can return focus to the control that
		 * opened something. Focus management belongs to whoever owns the
		 * interaction, not to the primitive. */
		element?: HTMLButtonElement;
		children: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		type = 'button',
		class: className = '',
		element = $bindable(),
		children,
		...rest
	}: Props = $props();
</script>

<button
	bind:this={element}
	{type}
	class={buttonClasses({ variant, size, class: className })}
	{...rest}
>
	{@render children()}
</button>
