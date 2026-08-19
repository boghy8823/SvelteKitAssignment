import type { Locale } from './locales';

/**
 * The dataset is priced in USD, and German formats a dollar amount as
 * "1.234,56 $" — decimal comma, point as the group separator, symbol trailing.
 * Getting that from `Intl` rather than a template is the whole point.
 */
const currency = 'USD';

const tags: Readonly<Record<Locale, string>> = { en: 'en-US', de: 'de-DE' };

/*
 * Formatters are memoised because constructing them is the expensive part:
 * 25 rows times three numeric columns is 75 constructions per render, and the
 * result is identical every time.
 *
 * Caching them at module scope is safe where caching data would not be. An
 * Intl formatter is immutable and holds nothing about the request, so two
 * concurrent requests sharing one cannot leak anything into each other.
 */
const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function numberFormat(locale: Locale, key: string, options: Intl.NumberFormatOptions) {
	const id = `n:${locale}:${key}`;
	const existing = cache.get(id);

	if (existing instanceof Intl.NumberFormat) {
		return existing;
	}

	const created = new Intl.NumberFormat(tags[locale], options);
	cache.set(id, created);

	return created;
}

function dateFormat(locale: Locale, key: string, options: Intl.DateTimeFormatOptions) {
	const id = `d:${locale}:${key}`;
	const existing = cache.get(id);

	if (existing instanceof Intl.DateTimeFormat) {
		return existing;
	}

	const created = new Intl.DateTimeFormat(tags[locale], options);
	cache.set(id, created);

	return created;
}

export interface Formatters {
	/** Whole dollars: campaign budgets have no meaningful cents at this scale. */
	currency(value: number): string;
	/** Cents included, for amounts already spent. */
	currencyPrecise(value: number): string;
	/** A 0–1 ratio rendered as a percentage. */
	percent(value: number): string;
	number(value: number): string;
	/** Spelled-out calendar day, for publication dates in prose. */
	date(value: string): string;
	/** Compact day and time, for a dense "last updated" column. */
	dateTime(value: string): string;
}

export function createFormatters(locale: Locale): Formatters {
	return {
		currency: (value) =>
			numberFormat(locale, 'currency', {
				style: 'currency',
				currency,
				maximumFractionDigits: 0
			}).format(value),

		currencyPrecise: (value) =>
			numberFormat(locale, 'currencyPrecise', {
				style: 'currency',
				currency,
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(value),

		percent: (value) =>
			numberFormat(locale, 'percent', {
				style: 'percent',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(value),

		number: (value) => numberFormat(locale, 'number', {}).format(value),

		// `long` rather than `medium`, because German medium is the numeric
		// 31.05.2026 while long spells the month — better for a byline, and the
		// English side gains full month names at the same time.
		date: (value) =>
			dateFormat(locale, 'date', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value)),

		dateTime: (value) =>
			dateFormat(locale, 'dateTime', {
				dateStyle: 'medium',
				timeStyle: 'short',
				timeZone: 'UTC'
			}).format(new Date(value))
	};
}
