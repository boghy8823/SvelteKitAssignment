import { describe, expect, it } from 'vitest';

import { isTheme, nextTheme, readThemePreference } from '../../src/lib/ui/theme';

describe('theme preference', () => {
	it('accepts the two supported themes', () => {
		expect([isTheme('light'), isTheme('dark')]).toEqual([true, true]);
	});

	it.each(['', 'system', 'DARK', undefined, null, 0])('rejects %o', (value) => {
		expect(isTheme(value)).toBe(false);
	});

	it('treats a missing or tampered cookie as no preference, so the OS decides', () => {
		expect([readThemePreference(undefined), readThemePreference('sepia')]).toEqual([null, null]);
	});

	it('reads a stored preference', () => {
		expect(readThemePreference('dark')).toBe('dark');
	});

	it('toggles in both directions', () => {
		expect([nextTheme('light'), nextTheme('dark')]).toEqual(['dark', 'light']);
	});
});
