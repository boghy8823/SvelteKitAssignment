import { describe, expect, it } from 'vitest';

import { dictionaries, items, posts, tags, users } from '../../src/lib/server/data/dataset';

describe('provided dataset', () => {
	it('parses at import, so malformed data fails the build rather than a request', () => {
		// Reaching this line at all means every schema passed during module init.
		expect([posts.length, items.length, users.length, tags.length]).toEqual([20, 220, 3, 8]);
	});

	it('exposes both dictionaries', () => {
		expect(Object.keys(dictionaries).sort()).toEqual(['de', 'en']);
	});

	it('is frozen, so a request cannot mutate data shared by every other request', () => {
		expect([Object.isFrozen(items), Object.isFrozen(posts), Object.isFrozen(tags)]).toEqual([
			true,
			true,
			true
		]);
	});

	it('only references tags that exist in the taxonomy', () => {
		const known = new Set(tags.map((tag) => tag.slug));
		const referenced = new Set([...posts.flatMap((p) => p.tags), ...items.flatMap((i) => i.tags)]);

		expect([...referenced].filter((slug) => !known.has(slug))).toEqual([]);
	});

	it('keeps the demo accounts the brief relies on', () => {
		expect(users.map((user) => `${user.email}:${user.role}`).sort()).toEqual([
			'admin@demo.test:admin',
			'editor@demo.test:editor',
			'viewer@demo.test:viewer'
		]);
	});
});
