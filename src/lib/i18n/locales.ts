export const locales = ['en', 'de'] as const;

export const LOCALE_COOKIE = 'locale';

/** A year: a language choice should outlive the session that made it. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export function isLocale(value: unknown): value is Locale {
	return typeof value === 'string' && locales.includes(value as Locale);
}
