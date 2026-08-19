import { defaultLocale, isLocale, locales, type Locale } from './locales';

interface Preference {
	tag: string;
	quality: number;
}

/**
 * Parses an `Accept-Language` header into preferences, highest quality first.
 *
 * Deliberately lenient: a malformed q-value is treated as 1 rather than
 * discarding the language. Dropping "de" because a proxy mangled its q value
 * would send a German speaker to the English site, which is a worse failure
 * than over-trusting the header.
 */
export function parseAcceptLanguage(header: string | null | undefined): Preference[] {
	if (!header) {
		return [];
	}

	return header
		.split(',')
		.map((part, index) => {
			const [tag, ...parameters] = part.trim().split(';');
			const q = parameters
				.map((parameter) => /^\s*q=([\d.]+)\s*$/i.exec(parameter))
				.find((match) => match !== null);

			const parsed = q ? Number.parseFloat(q[1]) : Number.NaN;

			return {
				tag: tag.trim().toLowerCase(),
				quality: Number.isFinite(parsed) ? parsed : 1,
				// Preserves header order between equal qualities.
				index
			};
		})
		.filter((preference) => preference.tag !== '' && preference.quality > 0)
		.sort((a, b) => b.quality - a.quality || a.index - b.index)
		.map(({ tag, quality }) => ({ tag, quality }));
}

/**
 * Picks a supported locale from the header, matching the base language so
 * de-AT and de-CH both land on German.
 */
export function negotiateLocale(header: string | null | undefined): Locale | null {
	for (const { tag } of parseAcceptLanguage(header)) {
		const base = tag.split('-')[0];
		const match = locales.find((locale) => locale === base);

		if (match) {
			return match;
		}
	}

	return null;
}

/**
 * Cookie first, then the header, then English.
 *
 * This is only consulted to decide where `/` sends someone. Once a locale is in
 * the URL, the URL wins — otherwise a shared link would render differently for
 * the sender and the recipient.
 */
export function resolveLocale(
	cookie: string | undefined,
	header: string | null | undefined
): Locale {
	if (isLocale(cookie)) {
		return cookie;
	}

	return negotiateLocale(header) ?? defaultLocale;
}
