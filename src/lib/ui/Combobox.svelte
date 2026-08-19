<script lang="ts">
	import { cx } from './classes';
	import { matchesFilter, type ComboboxOption } from './combobox';

	interface Props {
		label: string;
		options: readonly ComboboxOption[];
		/** The committed selection. This component never owns it: every toggle is
		 * reported up, and the value comes back down from the URL. */
		selected: readonly string[];
		onchange: (values: readonly string[]) => void;
		/** Built by the caller so the copy stays in the dictionary: given the number
		 * of options currently listed, return the sentence to announce. */
		announce: (count: number) => string;
		placeholder?: string;
		class?: string;
	}

	let {
		label,
		options,
		selected,
		onchange,
		announce,
		placeholder,
		class: className = ''
	}: Props = $props();

	/*
	 * An ARIA combobox with virtual focus. DOM focus stays on the input for the
	 * widget's whole life, and `aria-activedescendant` tells assistive technology
	 * which option is current. That is what lets someone type to narrow the list and
	 * arrow through it in the same breath — moving real focus onto the options would
	 * take the keyboard away from the text field.
	 *
	 * Multi-select, so Enter toggles rather than picks-and-closes. Space is left to
	 * the text field, where it belongs: an option labelled "Summer sale" cannot be
	 * found without it.
	 */

	const id = $props.id();
	const inputId = `${id}-input`;
	const listId = `${id}-list`;

	let open = $state(false);
	let filter = $state('');
	/** Index into `visible`, not into `options`: the active option has to survive
	 * the list shrinking as someone types. */
	let active = $state(0);

	let root: HTMLDivElement | undefined;
	let input = $state<HTMLInputElement>();

	const visible = $derived(options.filter((option) => matchesFilter(option.label, filter)));

	/** Clamped on every render, so a filter that shortens the list cannot leave
	 * `aria-activedescendant` pointing at an option that is gone. */
	const activeIndex = $derived(visible.length === 0 ? -1 : Math.min(active, visible.length - 1));

	const activeId = $derived(activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined);

	const summary = $derived(selected.length > 0 ? `${label} (${selected.length})` : label);

	function show() {
		if (!open) {
			open = true;
			active = 0;
		}
	}

	/** Closing reverts the transient part of the state — the typed filter — but not
	 * the selection: each toggle was already committed to the URL, and undoing a
	 * navigation is what the back button is for. */
	function close() {
		open = false;
		filter = '';
		active = 0;
	}

	function toggle(value: string) {
		const next = selected.includes(value)
			? selected.filter((candidate) => candidate !== value)
			: [...selected, value];

		onchange(next);
	}

	function move(delta: number) {
		if (visible.length === 0) {
			return;
		}

		// Clamped rather than wrapped: arrowing past the end of a filtered list and
		// landing back at the top reads as a glitch when the list is three items long.
		active = Math.max(0, Math.min(activeIndex + delta, visible.length - 1));
	}

	function onKeyDown(event: KeyboardEvent) {
		switch (event.key) {
			// Opening is not also a move: ArrowDown on a closed combobox lands on the
			// first option and ArrowUp on the last, which is what the ARIA pattern
			// specifies and what a native picker does. Treating the same press as
			// "open, then advance" silently skips the first option.
			case 'ArrowDown':
				event.preventDefault();

				if (open) {
					move(1);
				} else {
					show();
				}

				return;

			case 'ArrowUp':
				event.preventDefault();

				if (open) {
					move(-1);
				} else {
					show();
					active = visible.length - 1;
				}

				return;

			case 'Home':
				if (open) {
					event.preventDefault();
					active = 0;
				}
				return;

			case 'End':
				if (open) {
					event.preventDefault();
					active = visible.length - 1;
				}
				return;

			case 'PageDown':
				if (open) {
					event.preventDefault();
					move(10);
				}
				return;

			case 'PageUp':
				if (open) {
					event.preventDefault();
					move(-10);
				}
				return;

			case 'Enter':
				// Only when the popup is open, so Enter still submits the surrounding
				// form when the widget is closed.
				if (open && activeIndex >= 0) {
					event.preventDefault();
					toggle(visible[activeIndex].value);
				}
				return;

			case 'Escape':
				if (open) {
					// Stopped, so Escape closing a popup does not also close the dialog
					// the popup might be inside.
					event.stopPropagation();
					close();
				}
				return;

			case 'Tab':
				// Leaving the field commits nothing new and dismisses the popup, which
				// is what every native picker does.
				close();
		}
	}

	/**
	 * Dismiss on focus leaving the widget entirely. `relatedTarget` is what makes
	 * this precise: moving focus from the input to a button inside the popup is not
	 * leaving, and `focusout` alone cannot tell the difference.
	 */
	function onFocusOut(event: FocusEvent) {
		const next = event.relatedTarget;

		if (!open || (next instanceof Node && root?.contains(next))) {
			return;
		}

		close();
	}

	/**
	 * Pointer dismissal is bound to the document rather than to a backdrop element:
	 * a backdrop would swallow the first click on whatever the reader was actually
	 * reaching for, which is a habit borrowed from modals and wrong for a popup.
	 */
	$effect(() => {
		if (!open) {
			return;
		}

		function onPointerDown(event: PointerEvent) {
			if (event.target instanceof Node && !root?.contains(event.target)) {
				close();
			}
		}

		document.addEventListener('pointerdown', onPointerDown, true);

		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	});
</script>

<div bind:this={root} onfocusout={onFocusOut} class={cx('relative', className)}>
	<label for={inputId} class="mb-1.5 block text-sm font-medium">{summary}</label>

	<input
		bind:this={input}
		bind:value={filter}
		id={inputId}
		type="text"
		role="combobox"
		autocomplete="off"
		aria-expanded={open}
		aria-controls={listId}
		aria-activedescendant={activeId}
		aria-autocomplete="list"
		{placeholder}
		onkeydown={onKeyDown}
		oninput={show}
		onmousedown={show}
		class="h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-muted"
	/>

	<!--
		The option count, announced politely as the list narrows. Typing into a
		combobox is the one interaction where a sighted user gets continuous feedback
		and a screen-reader user gets none unless it is said out loud.
	-->
	<p aria-live="polite" class="sr-only">{open ? announce(visible.length) : ''}</p>

	<!--
		Rendered only while open. `aria-multiselectable` is what tells assistive
		technology that Enter toggles instead of choosing and closing.
	-->
	{#if open}
		<ul
			id={listId}
			role="listbox"
			aria-multiselectable="true"
			aria-label={label}
			class="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border-strong bg-surface py-1 shadow-lg"
		>
			{#each visible as option, index (option.value)}
				{@const isSelected = selected.includes(option.value)}

				<!--
					Options are not focusable and carry no key handler by design: this is
					the virtual-focus pattern, and every key is handled on the input above.
				-->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<li
					id={`${id}-option-${index}`}
					role="option"
					aria-selected={isSelected}
					onclick={() => toggle(option.value)}
					onmousedown={(event) => {
						// Keeps DOM focus in the input, which is the whole premise of
						// virtual focus. Without this the popup dismisses on mousedown and
						// the click never lands.
						event.preventDefault();
						input?.focus();
					}}
					onmousemove={() => (active = index)}
					class={cx(
						'flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-sm',
						index === activeIndex ? 'bg-accent-subtle text-accent' : 'text-fg'
					)}
				>
					<span class="flex items-center gap-2">
						<!--
							A drawn box rather than a real checkbox: `aria-selected` already
							carries the state for assistive technology, and a nested input
							would be a second focusable thing inside a listbox option.
						-->
						<span
							aria-hidden="true"
							class={cx(
								'flex size-4 items-center justify-center rounded-sm border text-[0.625rem]',
								isSelected ? 'border-accent bg-accent text-accent-fg' : 'border-border-strong'
							)}
						>
							{isSelected ? '✓' : ''}
						</span>

						{option.label}
					</span>

					{#if option.count !== undefined}
						<span class="text-fg-muted tabular-nums">{option.count}</span>
					{/if}
				</li>
			{/each}

			{#if visible.length === 0}
				<li
					role="option"
					aria-selected="false"
					aria-disabled="true"
					class="px-3 py-2 text-sm text-fg-muted"
				>
					{announce(0)}
				</li>
			{/if}
		</ul>
	{/if}
</div>
