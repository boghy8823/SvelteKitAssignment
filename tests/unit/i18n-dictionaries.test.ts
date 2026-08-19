import { describe, expect, it } from 'vitest';

import de from '../../mocks/i18n.de.json';
import en from '../../mocks/i18n.en.json';

const source: Record<string, string> = en;
const target: Record<string, string> = de;

function placeholders(value: string): string[] {
	return [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
}

describe('i18n dictionaries', () => {
	it('translates every key, with no extras', () => {
		expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
	});

	it('keeps interpolation slots identical across locales', () => {
		const drifted = Object.keys(source).filter(
			(key) => placeholders(source[key]).join() !== placeholders(target[key] ?? '').join()
		);

		expect(drifted).toEqual([]);
	});

	it('has no blank translations', () => {
		const blank = Object.entries(target)
			.filter(([, value]) => value.trim() === '')
			.map(([key]) => key);

		expect(blank).toEqual([]);
	});
});
