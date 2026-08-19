import { getContext, setContext } from 'svelte';

import { createFormatters, type Formatters } from './intl';
import type { Locale } from './locales';
import { createTranslator, type Messages, type Translate } from './translate';

export interface I18n {
	locale: Locale;
	t: Translate;
	format: Formatters;
}

const key = Symbol('i18n');

/**
 * Per component tree rather than module scope, because on the server the module
 * is shared by every concurrent request and the locale is not.
 */
export function provideI18n(locale: Locale, messages: Messages): I18n {
	return setContext<I18n>(key, {
		locale,
		t: createTranslator(messages),
		format: createFormatters(locale)
	});
}

export function useI18n(): I18n {
	const value = getContext<I18n | undefined>(key);

	if (!value) {
		throw new Error('useI18n() requires provideI18n() in a parent component');
	}

	return value;
}
