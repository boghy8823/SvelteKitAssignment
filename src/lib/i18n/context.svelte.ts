import { getContext, setContext } from 'svelte';

import { createFormatters, type Formatters } from './intl';
import type { Locale } from './locales';
import { createTranslator, type Messages, type Translate } from './translate';

export interface I18nSource {
	locale: Locale;
	messages: Messages;
}

export interface I18n {
	readonly locale: Locale;
	readonly t: Translate;
	readonly format: Formatters;
}

const key = Symbol('i18n');

/**
 * Takes a getter rather than a value, because switching language does not remount
 * the layout: the same component receives new data, and a translator captured at
 * init would keep rendering the previous language.
 *
 * Created per component tree rather than at module scope, since on the server one
 * module is shared by every concurrent request and the locale is not.
 */
export function provideI18n(source: () => I18nSource): I18n {
	const t = $derived(createTranslator(source().messages));
	const format = $derived(createFormatters(source().locale));

	return setContext<I18n>(key, {
		get locale() {
			return source().locale;
		},
		get t() {
			return t;
		},
		get format() {
			return format;
		}
	});
}

export function useI18n(): I18n {
	const value = getContext<I18n | undefined>(key);

	if (!value) {
		throw new Error('useI18n() requires provideI18n() in a parent component');
	}

	return value;
}
