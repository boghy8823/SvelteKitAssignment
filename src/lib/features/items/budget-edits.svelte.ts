import { SvelteMap } from 'svelte/reactivity';

/**
 * The optimistic layer, keyed by row id.
 *
 * An edit is shown as soon as it is submitted, before the server has agreed to
 * it. Two rules keep that from becoming a lie. An entry is removed the moment the
 * request settles — success or failure — so authoritative data always wins the
 * moment it exists, and a failure removes the entry without writing anything,
 * which *is* the rollback: the row goes back to showing what the server said.
 *
 * A `SvelteMap` rather than a plain object because rows read it in a template and
 * the whole point is that a set or a delete repaints exactly one cell.
 */
export class BudgetEdits {
	#pending = new SvelteMap<string, number>();

	/** The optimistic value for a row, or `undefined` when it has none. */
	pending(id: string): number | undefined {
		return this.#pending.get(id);
	}

	start(id: string, budget: number): void {
		this.#pending.set(id, budget);
	}

	/** Called on success and on failure alike. On success the reload has already
	 * replaced the value; on failure there is nothing to replace it with. */
	settle(id: string): void {
		this.#pending.delete(id);
	}
}
