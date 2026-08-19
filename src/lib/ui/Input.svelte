<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	import { cx } from './classes';
	import Field from './Field.svelte';

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'class'> {
		label: string;
		value?: string | number;
		hint?: string;
		error?: string;
		/** Wrapper class. The input itself is sized by the design system. */
		class?: string;
		/** The element itself, so a caller can move focus to the field it just
		 * reported an error on. Exposed deliberately: focus management belongs to
		 * whoever owns the form's error state, not to the primitive. */
		element?: HTMLInputElement;
	}

	let {
		label,
		value = $bindable(''),
		hint,
		error,
		id,
		class: className = '',
		element = $bindable(),
		...rest
	}: Props = $props();

	const fallbackId = $props.id();
	const inputId = $derived(id ?? fallbackId);
</script>

<Field id={inputId} {label} {hint} {error} class={className}>
	{#snippet control({ describedBy, invalid })}
		<input
			id={inputId}
			bind:this={element}
			bind:value
			aria-describedby={describedBy}
			aria-invalid={invalid || undefined}
			class={cx(
				'h-10 w-full rounded-md border bg-surface px-3 text-sm text-fg placeholder:text-fg-muted',
				invalid ? 'border-danger' : 'border-border-strong'
			)}
			{...rest}
		/>
	{/snippet}
</Field>
