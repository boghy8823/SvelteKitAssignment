<script lang="ts">
	import Toast from './Toast.svelte';
	import { useToasts } from './toast.svelte.ts';

	interface Props {
		dismissLabel?: string;
	}

	let { dismissLabel }: Props = $props();

	const toasts = useToasts();

	const polite = $derived(toasts.items.filter((toast) => toast.tone !== 'error'));
	const assertive = $derived(toasts.items.filter((toast) => toast.tone === 'error'));
</script>

<!--
	Both live regions are rendered unconditionally and stay in the DOM empty.
	A region inserted at the same time as its content is not reliably announced,
	because assistive technology has nothing to have been watching.

	Errors go to the assertive region: a failed mutation interrupts. Everything
	else is polite and waits for a pause.
-->
<div class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4">
	<div aria-live="polite" aria-atomic="false" class="flex w-full flex-col items-center gap-2">
		{#each polite as toast (toast.id)}
			<Toast {toast} {dismissLabel} ondismiss={(id) => toasts.dismiss(id)} />
		{/each}
	</div>

	<div aria-live="assertive" aria-atomic="false" class="flex w-full flex-col items-center gap-2">
		{#each assertive as toast (toast.id)}
			<Toast {toast} {dismissLabel} ondismiss={(id) => toasts.dismiss(id)} />
		{/each}
	</div>
</div>
