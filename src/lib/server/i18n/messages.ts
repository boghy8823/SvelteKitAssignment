import { messageKeys } from '$lib/i18n/keys.generated';
import type { Locale } from '$lib/i18n/locales';
import type { Messages } from '$lib/i18n/translate';
import { dictionaries } from '$lib/server/data/dataset';
import extensionsDe from '$lib/i18n/extensions.de.json';
import extensionsEn from '$lib/i18n/extensions.en.json';

/*
 * The provided dictionaries cover 41 keys. The rest of the surface the brief
 * asks for — statuses, channels, pricing, error pages, table affordances,
 * screen-reader strings — is not in them, so those live in extension files
 * inside src/ rather than being edited into mocks/, which stays byte-identical.
 */
const extensions: Readonly<Record<Locale, Record<string, string>>> = {
	en: extensionsEn,
	de: extensionsDe
};

function assemble(locale: Locale): Messages {
	const merged: Record<string, string> = { ...dictionaries[locale], ...extensions[locale] };
	const missing = messageKeys.filter((key) => !(key in merged));

	if (missing.length > 0) {
		// The generated union says these keys exist, so a gap here means the
		// dictionaries and the generated types disagree. Failing at boot beats
		// rendering a raw key to a user.
		throw new Error(
			`Dictionary for "${locale}" is missing ${missing.length} key(s): ${missing.slice(0, 5).join(', ')}`
		);
	}

	return Object.freeze(merged) as Messages;
}

const assembled: Readonly<Record<Locale, Messages>> = Object.freeze({
	en: assemble('en'),
	de: assemble('de')
});

/** Only the active locale is sent to the browser, so the payload holds one
 * dictionary rather than every language the site supports. */
export function messagesFor(locale: Locale): Messages {
	return assembled[locale];
}
