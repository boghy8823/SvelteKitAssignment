<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		id: string;
		label: string;
		/** Static help text. Always announced, so keep it short. */
		hint?: string;
		/** Validation message. Replaces the hint in the accessible description. */
		error?: string;
		class?: string;
		control: Snippet<[{ describedBy: string | undefined; invalid: boolean }]>;
	}

	let { id, label, hint, error, class: className = '', control }: Props = $props();

	const hintId = $derived(`${id}-hint`);
	const errorId = $derived(`${id}-error`);

	// An error supersedes the hint rather than stacking with it: two competing
	// descriptions on one control is noise for a screen reader.
	let describedBy = $derived(error ? errorId : hint ? hintId : undefined);
</script>

<div class={className}>
	<label for={id} class="mb-1.5 block text-sm font-medium text-fg">{label}</label>

	{@render control({ describedBy, invalid: Boolean(error) })}

	{#if error}
		<p id={errorId} class="mt-1.5 text-sm text-danger">{error}</p>
	{:else if hint}
		<p id={hintId} class="mt-1.5 text-sm text-fg-muted">{hint}</p>
	{/if}
</div>
