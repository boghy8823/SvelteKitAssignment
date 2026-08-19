import { getContext, setContext } from 'svelte';

export type ToastTone = 'info' | 'success' | 'error';

export interface ToastAction {
	label: string;
	run: () => void;
}

export interface Toast {
	id: string;
	tone: ToastTone;
	message: string;
	action?: ToastAction;
}

export interface ShowToastOptions {
	tone?: ToastTone;
	action?: ToastAction;
	/** Milliseconds until auto-dismiss. `0` keeps it until dismissed. */
	duration?: number;
}

/** Long enough to read a sentence, short enough not to linger over content. */
const DEFAULT_DURATION = 6000;

/** Older toasts are evicted rather than stacking off-screen forever. */
const MAX_VISIBLE = 4;

export class ToastStore {
	#items = $state<Toast[]>([]);

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- bookkeeping only; no template reads these, so reactivity would be cost without a reader
	#timers = new Map<string, ReturnType<typeof setTimeout>>();

	get items(): Toast[] {
		return this.#items;
	}

	show(message: string, options: ShowToastOptions = {}): string {
		const tone = options.tone ?? 'info';
		const id = crypto.randomUUID();

		this.#items = [...this.#items, { id, tone, message, action: options.action }];

		while (this.#items.length > MAX_VISIBLE) {
			this.dismiss(this.#items[0].id);
		}

		// Errors persist by default. A failure the user has to act on should not
		// disappear while they are reading it, and a retry action needs to stay
		// reachable.
		const duration = options.duration ?? (tone === 'error' ? 0 : DEFAULT_DURATION);

		if (duration > 0) {
			this.#timers.set(
				id,
				setTimeout(() => this.dismiss(id), duration)
			);
		}

		return id;
	}

	dismiss(id: string): void {
		const timer = this.#timers.get(id);

		if (timer !== undefined) {
			clearTimeout(timer);
			this.#timers.delete(id);
		}

		this.#items = this.#items.filter((toast) => toast.id !== id);
	}

	/** Clears pending timers so a torn-down region cannot update dead state. */
	destroy(): void {
		for (const timer of this.#timers.values()) {
			clearTimeout(timer);
		}

		this.#timers.clear();
		this.#items = [];
	}
}

const key = Symbol('toasts');

/**
 * Created per component tree rather than at module scope. Module-level state on
 * the server is shared between concurrent requests, which is how one user's
 * notification ends up in another user's response.
 */
export function provideToasts(): ToastStore {
	return setContext(key, new ToastStore());
}

export function useToasts(): ToastStore {
	const store = getContext<ToastStore | undefined>(key);

	if (!store) {
		throw new Error('useToasts() requires provideToasts() in a parent component');
	}

	return store;
}
