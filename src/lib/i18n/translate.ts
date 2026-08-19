import type { MessageKey } from './keys.generated';

export type Messages = Readonly<Record<MessageKey, string>>;

export type MessageValues = Readonly<Record<string, string | number>>;

export type Translate = (key: MessageKey, values?: MessageValues) => string;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills `{placeholders}`. A slot with no matching value is left as its literal
 * token rather than replaced with an empty string: a visible `{count}` is a bug
 * report, while a silent gap is a mystery.
 */
export function interpolate(template: string, values?: MessageValues): string {
	if (!values) {
		return template;
	}

	return template.replace(PLACEHOLDER, (token, name: string) => {
		const value = values[name];

		return value === undefined ? token : String(value);
	});
}

/**
 * Keys are a generated union, so a typo is a compile error. The runtime
 * fallback to the key itself exists for the one case types cannot cover: a
 * dictionary shipped from the server that is older than the code reading it.
 */
export function createTranslator(messages: Messages): Translate {
	return (key, values) => interpolate(messages[key] ?? key, values);
}
