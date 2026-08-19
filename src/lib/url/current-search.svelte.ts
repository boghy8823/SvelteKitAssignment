import { building } from '$app/environment';
import { page } from '$app/state';

/**
 * The current query string, or empty while prerendering.
 *
 * Reading `url.search` during prerendering is an error, and rightly so: it would
 * bake one visitor's query into a page served to everyone. Prerendered pages have
 * no query state worth carrying, and the routes that do — search and the
 * dashboard — render per request, where this returns the real value.
 */
export function currentSearch(): string {
	return building ? '' : page.url.search;
}
