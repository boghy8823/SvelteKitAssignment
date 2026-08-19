/**
 * Joins class values, dropping falsy ones.
 *
 * Deliberately append-only: there is no conflict resolution, so a caller's
 * `class` wins only where CSS cascade lets it. That is the documented contract
 * for every primitive's `class` prop, and it is why no tailwind-merge is
 * needed — the primitives own layout and colour, callers add spacing and
 * placement.
 */
export function cx(...values: Array<string | false | null | undefined>): string {
	return values.filter(Boolean).join(' ');
}
