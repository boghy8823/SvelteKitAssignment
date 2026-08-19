<script lang="ts">
	import type { Snippet } from 'svelte';

	import Heading from '$lib/ui/Heading.svelte';

	interface Props {
		title: string;
		body: string;
		tone?: 'neutral' | 'danger';
		/** The one thing to do next. A state with no way out is a dead end. */
		action?: Snippet;
	}

	let { title, body, tone = 'neutral', action }: Props = $props();
</script>

<!--
	One layout for every terminal state, so "no results", "no rows yet", and "that
	failed" are recognisably the same kind of message rather than three
	improvisations. Each still says something specific: what happened, and what to
	do about it.
-->
<div class="mx-auto flex max-w-md flex-col items-center gap-2 py-4 text-center">
	<Heading level={2} size="md" class={tone === 'danger' ? 'text-danger' : ''}>{title}</Heading>

	<p class="text-sm text-fg-muted">{body}</p>

	<!-- The control comes from the caller, so a state can offer a link or a button
	     without this component having an opinion about which. -->
	{#if action}
		<div class="mt-2">{@render action()}</div>
	{/if}
</div>
