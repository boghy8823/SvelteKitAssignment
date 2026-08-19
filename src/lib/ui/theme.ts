export const themes = ['light', 'dark'] as const;

export type Theme = (typeof themes)[number];

/** `null` means no stored preference, so the OS setting applies. */
export type ThemePreference = Theme | null;

export const THEME_COOKIE = 'theme';

/** One year: a theme choice should outlive the session that made it. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
	return typeof value === 'string' && themes.includes(value as Theme);
}

export function readThemePreference(value: string | undefined): ThemePreference {
	return isTheme(value) ? value : null;
}

export function nextTheme(theme: Theme): Theme {
	return theme === 'dark' ? 'light' : 'dark';
}
