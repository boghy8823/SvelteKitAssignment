import type { Account } from '$lib/data/account';
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
			/** Resolved from the session cookie on every request. `null` is anonymous,
			 * which is a state every route has to handle rather than assume away. */
			user: Account | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
