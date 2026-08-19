<script lang="ts">
	import { cx } from './classes';
	import type { Toast } from './toast.svelte.ts';

	interface Props {
		toast: Toast;
		dismissLabel?: string;
		ondismiss: (id: string) => void;
	}

	let { toast, dismissLabel = 'Dismiss', ondismiss }: Props = $props();

	const tones = {
		info: 'border-border',
		success: 'border-success',
		error: 'border-danger'
	} as const satisfies Record<Toast['tone'], string>;
</script>

<div
	class={cx(
		'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-l-4 border-border bg-surface-raised p-3 shadow-lg',
		tones[toast.tone]
	)}
>
	<p class="flex-1 text-sm text-fg">{toast.message}</p>

	{#if toast.action}
		<button
			type="button"
			class="text-sm font-medium text-accent underline underline-offset-2"
			onclick={() => {
				toast.action?.run();
				ondismiss(toast.id);
			}}
		>
			{toast.action.label}
		</button>
	{/if}

	<button
		type="button"
		aria-label={dismissLabel}
		class="-m-1 p-1 text-sm leading-none text-fg-muted hover:text-fg"
		onclick={() => ondismiss(toast.id)}
	>
		&times;
	</button>
</div>
