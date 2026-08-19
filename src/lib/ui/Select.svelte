<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLSelectAttributes } from 'svelte/elements';

	import { cx } from './classes';
	import Field from './Field.svelte';

	interface Props extends Omit<HTMLSelectAttributes, 'value' | 'class'> {
		label: string;
		value?: string;
		hint?: string;
		error?: string;
		class?: string;
		/** The `<option>` list, so callers keep control of grouping and labels. */
		children: Snippet;
	}

	let {
		label,
		value = $bindable(''),
		hint,
		error,
		id,
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const fallbackId = $props.id();
	const selectId = $derived(id ?? fallbackId);
</script>

<Field id={selectId} {label} {hint} {error} class={className}>
	{#snippet control({ describedBy, invalid })}
		<select
			id={selectId}
			bind:value
			aria-describedby={describedBy}
			aria-invalid={invalid || undefined}
			class={cx(
				'h-10 w-full rounded-md border bg-surface px-3 text-sm text-fg',
				invalid ? 'border-danger' : 'border-border-strong'
			)}
			{...rest}
		>
			{@render children()}
		</select>
	{/snippet}
</Field>
