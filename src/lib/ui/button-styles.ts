import { cx } from './classes';

export const buttonVariants = {
	primary: 'bg-accent text-accent-fg hover:opacity-90',
	secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-sunken',
	ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
	danger: 'bg-danger text-danger-fg hover:opacity-90'
} as const satisfies Record<string, string>;

export const buttonSizes = {
	sm: 'h-8 gap-1.5 px-3 text-sm',
	md: 'h-10 gap-2 px-4 text-sm'
} as const satisfies Record<string, string>;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = keyof typeof buttonSizes;

const base =
	'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

/**
 * Exported so an anchor can look like a button without the primitive needing
 * to shapeshift between `<a>` and `<button>` — the accessibility difference
 * between a link and a button is not a styling detail worth hiding.
 */
export function buttonClasses(options: {
	variant?: ButtonVariant;
	size?: ButtonSize;
	class?: string;
}): string {
	return cx(
		base,
		buttonVariants[options.variant ?? 'primary'],
		buttonSizes[options.size ?? 'md'],
		options.class
	);
}
