<script lang="ts">
	import Button from '$lib/ui/Button.svelte';
	import Dialog from '$lib/ui/Dialog.svelte';

	interface Props {
		dismissible?: boolean;
	}

	let { dismissible = true }: Props = $props();

	let open = $state(false);
</script>

<!-- Stands in for a real page: a trigger, background content that must go
     inert, and the dialog itself. -->
<main>
	<Button data-testid="open" onclick={() => (open = true)}>Edit budget</Button>
	<Button data-testid="background-control" variant="ghost">Background control</Button>
</main>

<Dialog bind:open title="Edit budget" {dismissible}>
	<p>Set a new budget for this campaign.</p>

	{#snippet footer()}
		<Button data-testid="cancel" variant="secondary" onclick={() => (open = false)}>Cancel</Button>
		<Button data-testid="save">Save</Button>
	{/snippet}
</Dialog>
