import { describe, expect, it } from 'vitest';

import { isLocalPath, safeLocalPath } from '../../src/lib/url/local-path';
import { localePath, loginPath } from '../../src/lib/url/locale-path';

function login(path: string): string {
	return loginPath('en', new URL(`https://example.test${path}`));
}

/** What the login action does with whatever `loginPath` produced. */
function roundTrip(path: string): string | null {
	const url = new URL(`https://example.test${login(path)}`);

	return url.searchParams.get('redirectTo');
}

describe('localePath', () => {
	it('prefixes the locale', () => {
		expect(localePath('de', '/blog')).toBe('/de/blog');
	});

	it('does not leave a trailing slash on the home path', () => {
		expect(localePath('en')).toBe('/en');
		expect(localePath('en', '/')).toBe('/en');
	});

	it('produces something the redirect guard will accept', () => {
		// The reason this helper exists: resolve() returns a path relative to the
		// current page, which isLocalPath rejects and a Location header would
		// resolve against the wrong base.
		expect(isLocalPath(localePath('en', '/dashboard/items'))).toBe(true);
	});
});

describe('loginPath', () => {
	it('sends anonymous traffic to the login page for the active locale', () => {
		expect(loginPath('de', new URL('https://example.test/de/dashboard'))).toBe(
			'/de/login?redirectTo=%2Fde%2Fdashboard'
		);
	});

	it('keeps the query string, so a filtered table is not lost on the way back', () => {
		expect(roundTrip('/en/dashboard/items?page=3&sort=budget')).toBe(
			'/en/dashboard/items?page=3&sort=budget'
		);
	});

	it('encodes the target, so it cannot graft extra parameters onto the login URL', () => {
		const url = new URL(`https://example.test${login('/en/dashboard?a=1&next=/evil')}`);

		expect([...url.searchParams.keys()]).toEqual(['redirectTo']);
	});

	it('drops the origin, so the target is always local', () => {
		const target = loginPath('en', new URL('https://elsewhere.test/en/dashboard'));

		expect(
			safeLocalPath(new URL(`https://x.test${target}`).searchParams.get('redirectTo'), '/en')
		).toBe('/en/dashboard');
	});

	it('never emits a fragment, which a server redirect could not honour anyway', () => {
		expect(login('/en/dashboard#budget')).not.toContain('#');
	});
});
