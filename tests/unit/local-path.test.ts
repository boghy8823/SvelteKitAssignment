import { describe, expect, it } from 'vitest';

import { isLocalPath, safeLocalPath } from '../../src/lib/url/local-path';

describe('local path guard', () => {
	it.each(['/', '/en/blog', '/en/dashboard/items?page=3&sort=budget', '/en/blog#top'])(
		'accepts %s',
		(value) => {
			expect(isLocalPath(value)).toBe(true);
		}
	);

	it.each([
		'//evil.com',
		'/\\evil.com',
		'https://evil.com',
		'http://evil.com/en',
		'javascript:alert(1)',
		'en/blog',
		'/en/blog\nSet-Cookie: a=b',
		'/en /blog',
		'',
		undefined,
		null,
		42
	])('rejects %o', (value) => {
		expect(isLocalPath(value)).toBe(false);
	});

	it('falls back when the target is not usable', () => {
		expect(safeLocalPath('//evil.com', '/en')).toBe('/en');
	});

	it('passes a usable target through untouched', () => {
		expect(safeLocalPath('/de/blog?page=2', '/en')).toBe('/de/blog?page=2');
	});
});
