import { dev } from '$app/environment';

/**
 * Canonical URLs and Open Graph images have to be absolute, and prerendered
 * pages are built with no request to derive an origin from — during prerendering
 * `url.origin` is a placeholder. So the origin is configuration, not something
 * discovered at runtime.
 *
 * A deployment with its own domain changes this one line.
 */
export const siteUrl = dev ? 'http://localhost:5173' : 'https://sveltekit-assignment.vercel.app';

export const siteName = 'Northwind';

export function absolute(path: string): string {
	return `${siteUrl}${path}`;
}
