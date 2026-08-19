import type { Locale } from '$lib/i18n/locales';
import type { ThemePreference } from '$lib/ui/theme';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: Locale;
			theme: ThemePreference;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
