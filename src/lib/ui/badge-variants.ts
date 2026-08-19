/**
 * Extracted from the component for the same reason `button-styles.ts` is: a
 * caller that maps domain values to badge tones — a campaign status, say — needs
 * the variant *type* to make that map exhaustive, and a type cannot be imported
 * from a `.svelte` file as cleanly as from a module.
 */
export const badgeVariants = {
	neutral: 'bg-surface-sunken text-fg-muted',
	accent: 'bg-accent-subtle text-accent',
	success: 'bg-success text-success-fg',
	danger: 'bg-danger text-danger-fg'
} as const satisfies Record<string, string>;

export type BadgeVariant = keyof typeof badgeVariants;
