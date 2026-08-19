<script lang="ts">
	import Combobox from '$lib/ui/Combobox.svelte';
	import type { ComboboxOption } from '$lib/ui/combobox';

	interface Props {
		options?: readonly ComboboxOption[];
	}

	/** Statuses and counts shaped like the real facets, including a zero so the
	 * "kept rather than dropped" behaviour is covered. */
	const defaults: readonly ComboboxOption[] = [
		{ value: 'draft', label: 'Draft', count: 41 },
		{ value: 'scheduled', label: 'Scheduled', count: 37 },
		{ value: 'active', label: 'Active', count: 52 },
		{ value: 'paused', label: 'Paused', count: 30 },
		{ value: 'completed', label: 'Completed', count: 0 },
		{ value: 'archived', label: 'Archived', count: 60 }
	];

	let { options = defaults }: Props = $props();

	/**
	 * The harness owns the selection, exactly as the page does: the combobox
	 * reports a change and receives the new value back as a prop. A test that let
	 * the component keep its own state would not be testing the real wiring.
	 */
	let selected = $state<readonly string[]>([]);

	/** Every committed change, so a test can assert what was reported rather than
	 * only what ended up on screen. */
	let changes = $state<string[]>([]);
</script>

<main>
	<button data-testid="outside" type="button">Outside</button>

	<Combobox
		label="Status"
		{options}
		{selected}
		onchange={(values) => {
			selected = values;
			changes = [...changes, values.join(',')];
		}}
		announce={(count) => `${count} options`}
		placeholder="Type to filter"
	/>

	<p data-testid="selected">{selected.join(',')}</p>
	<p data-testid="changes">{changes.length}</p>
</main>
