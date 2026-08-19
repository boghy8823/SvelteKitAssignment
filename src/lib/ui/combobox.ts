export interface ComboboxOption {
	value: string;
	label: string;
	/**
	 * How many results this option would produce. Optional because not every list
	 * is a facet; when present, a zero stays listed rather than disappearing, so an
	 * option cannot vanish from under the pointer as the query narrows.
	 */
	count?: number;
}

/**
 * Matching is diacritic-insensitive so a German label is reachable from an
 * ASCII keyboard: typing "barrierefrei" should find "Barrierefreiheit", and
 * typing "kanale" should find "Kanäle".
 */
export function matchesFilter(label: string, filter: string): boolean {
	return normalise(label).includes(normalise(filter));
}

function normalise(value: string): string {
	return value
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.trim();
}
