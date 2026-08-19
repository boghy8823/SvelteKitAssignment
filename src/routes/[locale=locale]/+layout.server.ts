import { messagesFor } from '$lib/server/i18n/messages';
import type { LayoutServerLoad } from './$types';

/**
 * The dictionary for the active locale only. Shipping both would double a
 * payload that every page pays for, to serve a language the URL already
 * decided against.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	return {
		locale: locals.locale,
		messages: messagesFor(locals.locale)
	};
};
