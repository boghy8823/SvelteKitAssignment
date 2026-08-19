import { DictionarySchema, type Dictionary } from '$lib/data/schemas';
import type { Locale } from '$lib/i18n/locales';
import rawDe from '$mocks/i18n.de.json';
import rawEn from '$mocks/i18n.en.json';

import { parseOrThrow } from '../parse';

export const dictionaries: Readonly<Record<Locale, Dictionary>> = Object.freeze({
	en: parseOrThrow(DictionarySchema, rawEn, 'i18n.en.json'),
	de: parseOrThrow(DictionarySchema, rawDe, 'i18n.de.json')
});
