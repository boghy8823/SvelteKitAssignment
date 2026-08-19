<script lang="ts">
	import { enhance } from '$app/forms';
	import { budgetError } from '$lib/data/budget';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import type { MessageKey } from '$lib/i18n/keys.generated';
	import Button from '$lib/ui/Button.svelte';

	interface Props {
		id: string;
		/** The row's name, for a label that says which budget is being edited. */
		name: string;
		/** The authoritative value from the server. */
		budget: number;
		/** Sent back with the write, so a stale edit is refused rather than winning. */
		updatedAt: string;
		/** Whether this account may write. Hiding the control is the courtesy; the
		 * action is the enforcement. */
		editable: boolean;
		/** The optimistic value while a save is in flight, if any. */
		pending: number | undefined;
		/** Set when this row's last save was refused as stale. `budget` is the value
		 * that won, and `updatedAt` is the stamp an overwrite has to send. */
		conflict?: { budget: number; updatedAt: string };
		/** Reported before the request goes out, so the page can retry the exact
		 * attempt later without asking anyone to retype it. */
		onstart: (id: string, budget: number, expectedUpdatedAt: string) => void;
		onsettle: (id: string) => void;
		/** Re-submits the rejected value against the stamp that won. */
		onoverwrite: (id: string, budget: number, updatedAt: string) => void;
		/** Abandons the rejected value and keeps what the server has. */
		ondismissconflict: () => void;
	}

	let {
		id,
		name,
		budget,
		updatedAt,
		editable,
		pending,
		conflict,
		onstart,
		onsettle,
		onoverwrite,
		ondismissconflict
	}: Props = $props();

	const i18n = useI18n();

	let editing = $state(false);
	/**
	 * The draft, seeded when the editor opens rather than derived from the prop. A
	 * reload landing mid-edit must not overwrite what someone is typing — which is
	 * also why this is not `$derived`.
	 */
	let value = $state('');
	let error = $state<MessageKey | undefined>();

	/** The number last submitted from this cell, kept so a conflict can offer it
	 * back rather than making someone retype what they already typed. */
	let attempted = $state<number | undefined>();

	let editButton = $state<HTMLButtonElement>();
	let input = $state<HTMLInputElement>();

	const saving = $derived(pending !== undefined);

	/** The optimistic value wins while it exists, because it is what the person
	 * just asked for. When the request settles it disappears and the server's
	 * number is what remains — which is the rollback, in the failure case. */
	const shown = $derived(pending ?? budget);

	async function open() {
		editing = true;
		value = String(budget);
		error = undefined;

		// Focus moves into the field on open and back to the trigger on close, so
		// the interaction is operable without a pointer and never dumps focus at
		// the top of the document.
		await Promise.resolve();
		input?.focus();
		input?.select();
	}

	async function close() {
		editing = false;
		error = undefined;

		await Promise.resolve();
		editButton?.focus();
	}
</script>

{#if editing}
	<form
		method="POST"
		action="?/budget"
		use:enhance={({ formData, cancel }) => {
			// The same rule the action applies, run first so an obvious mistake never
			// becomes a round trip. The server still validates: this copy is a
			// courtesy, that one is the rule.
			const invalid = budgetError(formData.get('budget'));

			if (invalid) {
				error = invalid;
				cancel();
				input?.focus();

				return;
			}

			const next = Number(formData.get('budget'));

			attempted = next;
			onstart(id, next, updatedAt);
			void close();

			return async ({ update }) => {
				// Settled either way, so authoritative data always wins and a failure
				// leaves the row showing what the server last said.
				onsettle(id);

				// The page decides what a failure looks like; this component's job
				// ends when the optimistic value is released.
				await update({ reset: false, invalidateAll: false });
			};
		}}
		class="flex items-center justify-end gap-1.5"
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="expectedUpdatedAt" value={updatedAt} />

		<label class="sr-only" for={`budget-${id}`}>
			{i18n.t('table.budget.label', { name })}
		</label>

		<input
			bind:this={input}
			bind:value
			id={`budget-${id}`}
			name="budget"
			type="number"
			inputmode="numeric"
			min="0"
			step="1"
			aria-invalid={error ? 'true' : undefined}
			aria-describedby={error ? `budget-${id}-error` : undefined}
			onkeydown={(event) => {
				// Escape abandons the edit, which is what every inline editor does and
				// what someone who opened the wrong row expects.
				if (event.key === 'Escape') {
					event.preventDefault();
					void close();
				}
			}}
			class="h-8 w-24 rounded-md border border-border-strong bg-surface px-2 text-end text-sm tabular-nums"
		/>

		<Button type="submit" size="sm">{i18n.t('table.save')}</Button>
		<Button type="button" size="sm" variant="ghost" onclick={close}>
			{i18n.t('table.cancel')}
		</Button>

		{#if error}
			<!-- Announced immediately: the message replaced a value the person just
			     typed, so waiting for a polite turn would be too late. -->
			<p id={`budget-${id}-error`} role="alert" class="sr-only">{i18n.t(error)}</p>
		{/if}
	</form>
{:else}
	<div class="flex flex-col items-end gap-1.5">
		<div class="flex items-center justify-end gap-2">
			<span class={`tabular-nums ${saving ? 'text-fg-muted' : ''}`}>
				{i18n.format.currency(shown)}
			</span>

			{#if saving}
				<!-- A word, not a spinner: it says what is happening, it is readable by a
				     screen reader, and it cannot spin forever. -->
				<span class="text-xs text-fg-muted">{i18n.t('table.saving')}</span>
			{:else if editable}
				<Button
					bind:element={editButton}
					type="button"
					size="sm"
					variant="ghost"
					onclick={open}
					aria-label={i18n.t('table.budget.label', { name })}
				>
					{i18n.t('table.editBudget')}
				</Button>
			{/if}
		</div>

		{#if conflict && attempted !== undefined}
			<!--
				A conflict is the one failure that cannot be resolved by a toast, because
				the choice belongs to this row and needs both numbers side by side.
				Rendered here rather than announced and forgotten, so nobody has to
				remember what they typed.
			-->
			<div
				role="alert"
				class="w-56 rounded-md border border-danger bg-surface p-2 text-start text-xs text-fg"
			>
				<p class="font-medium">{i18n.t('table.conflict.title')}</p>

				<p class="mt-1 text-fg-muted">
					{i18n.t('table.conflict.theirs', { value: i18n.format.currency(conflict.budget) })}
				</p>
				<p class="text-fg-muted">
					{i18n.t('table.conflict.mine', { value: i18n.format.currency(attempted) })}
				</p>

				<div class="mt-2 flex flex-wrap gap-1.5">
					<!-- Overwriting sends the stamp that won, so it is a fresh
					     compare-and-set rather than a force. -->
					<Button
						size="sm"
						onclick={() => {
							if (attempted !== undefined) {
								onoverwrite(id, attempted, conflict.updatedAt);
							}
						}}
					>
						{i18n.t('table.conflict.overwrite')}
					</Button>

					<Button
						size="sm"
						variant="secondary"
						onclick={() => {
							attempted = undefined;
							ondismissconflict();
						}}
					>
						{i18n.t('table.conflict.dismiss')}
					</Button>
				</div>
			</div>
		{/if}
	</div>
{/if}
