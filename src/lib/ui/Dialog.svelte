<script lang="ts">
	import type { Snippet } from 'svelte';

	import { cx } from './classes';

	interface Props {
		open: boolean;
		title: string;
		/** Accessible name for the close control. Passed in so i18n owns the copy. */
		closeLabel?: string;
		/** Whether clicking the backdrop dismisses. Off for destructive confirmations. */
		dismissible?: boolean;
		class?: string;
		children: Snippet;
		footer?: Snippet;
	}

	let {
		open = $bindable(),
		title,
		closeLabel = 'Close',
		dismissible = true,
		class: className = '',
		children,
		footer
	}: Props = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	const titleId = $props.id();

	/*
	 * The platform is not a library. A modal <dialog> gives the top layer,
	 * ::backdrop, Escape handling, the focus trap, and inertness of everything
	 * behind it — all of which a hand-rolled version gets subtly wrong. What is
	 * left to own is the open/closed sync and the scroll lock.
	 */
	$effect(() => {
		if (!dialog) {
			return;
		}

		if (open && !dialog.open) {
			dialog.showModal();
		} else if (!open && dialog.open) {
			dialog.close();
		}
	});

	$effect(() => {
		if (!open) {
			return;
		}

		// Locking scroll without compensating for the scrollbar shifts the page
		// under the backdrop, which is a layout shift the user can see and
		// Lighthouse can measure.
		const { style } = document.documentElement;
		const scrollbar = window.innerWidth - document.documentElement.clientWidth;
		const previousOverflow = style.overflow;
		const previousPadding = style.paddingRight;

		style.overflow = 'hidden';

		if (scrollbar > 0) {
			style.paddingRight = `${scrollbar}px`;
		}

		return () => {
			style.overflow = previousOverflow;
			style.paddingRight = previousPadding;
		};
	});

	function onBackdropClick(event: MouseEvent) {
		// A click on the dialog element itself is a click on the backdrop: the
		// panel is a child, so real content clicks never reach here.
		if (dismissible && event.target === dialog) {
			open = false;
		}
	}
</script>

<dialog
	bind:this={dialog}
	aria-labelledby={titleId}
	class="m-auto max-w-lg bg-transparent p-4 backdrop:bg-fg/50 open:flex"
	oncancel={(event) => {
		// Let the state drive visibility rather than the DOM closing behind its back.
		event.preventDefault();
		open = false;
	}}
	onclick={onBackdropClick}
>
	<div
		class={cx(
			'w-full rounded-xl border border-border bg-surface-raised p-gutter text-fg shadow-lg',
			className
		)}
	>
		<div class="flex items-start justify-between gap-4">
			<h2 id={titleId} class="text-lg font-semibold">{title}</h2>

			<button
				type="button"
				aria-label={closeLabel}
				class="-m-1 p-1 leading-none text-fg-muted hover:text-fg"
				onclick={() => (open = false)}
			>
				&times;
			</button>
		</div>

		<div class="mt-3 text-sm text-fg-muted">
			{@render children()}
		</div>

		{#if footer}
			<div class="mt-5 flex justify-end gap-3">
				{@render footer()}
			</div>
		{/if}
	</div>
</dialog>
