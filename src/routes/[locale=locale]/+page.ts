import { locales } from '$lib/i18n/locales';
import type { EntryGenerator } from './$types';

/**
 * Static, because the marketing copy changes when someone deploys and LCP is
 * graded here. Nothing on this page depends on the request.
 */
export const prerender = true;

/** The locale param has a matcher, so the router cannot enumerate it alone. */
export const entries: EntryGenerator = () => locales.map((locale) => ({ locale }));
