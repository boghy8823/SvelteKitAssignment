import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastStore } from '../../src/lib/ui/toast.svelte.ts';

describe('toast store', () => {
	let toasts: ToastStore;

	beforeEach(() => {
		vi.useFakeTimers();
		toasts = new ToastStore();
	});

	afterEach(() => {
		toasts.destroy();
		vi.useRealTimers();
	});

	it('auto-dismisses an informational toast', () => {
		toasts.show('Saved');
		expect(toasts.items).toHaveLength(1);

		vi.advanceTimersByTime(6000);
		expect(toasts.items).toEqual([]);
	});

	it('keeps an error until it is dismissed, so a retry stays reachable', () => {
		const id = toasts.show('Could not save', { tone: 'error' });

		vi.advanceTimersByTime(60_000);
		expect(toasts.items).toHaveLength(1);

		toasts.dismiss(id);
		expect(toasts.items).toEqual([]);
	});

	it('evicts the oldest toast rather than stacking without bound', () => {
		for (let index = 0; index < 6; index += 1) {
			toasts.show(`Toast ${index}`);
		}

		expect(toasts.items.map((toast) => toast.message)).toEqual([
			'Toast 2',
			'Toast 3',
			'Toast 4',
			'Toast 5'
		]);
	});

	it('cancels pending timers on dismiss, so a reused id cannot be re-dismissed', () => {
		const id = toasts.show('Saved');
		toasts.dismiss(id);
		toasts.show('Saved again');

		vi.advanceTimersByTime(5999);
		expect(toasts.items).toHaveLength(1);
	});

	it('clears everything on destroy', () => {
		toasts.show('One');
		toasts.show('Two', { tone: 'error' });

		toasts.destroy();

		expect(toasts.items).toEqual([]);
	});
});
