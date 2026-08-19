import { describe, expect, it } from 'vitest';

import { dictionaries } from '../../src/lib/server/data/dataset/dictionaries';
import { items } from '../../src/lib/server/data/dataset/items';
import { posts } from '../../src/lib/server/data/dataset/posts';
import { tags, tagSlugs } from '../../src/lib/server/data/dataset/tags';
import { users } from '../../src/lib/server/data/dataset/users';

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
		const referenced = new Set([...posts.flatMap((p) => p.tags), ...items.flatMap((i) => i.tags)]);

		expect([...referenced].filter((slug) => !tagSlugs.has(slug))).toEqual([]);
	});

	it('keeps the demo accounts the brief relies on', () => {
		expect(users.map((user) => `${user.email}:${user.role}`).sort()).toEqual([
			'admin@demo.test:admin',
			'editor@demo.test:editor',
			'viewer@demo.test:viewer'
		]);
	});

	it('splits per entity, so a route bundles only the data it reads', async () => {
		// Search runs on the edge and reads posts; importing posts must not drag the
		// campaign dataset along with it.
		const postsModule = await import('../../src/lib/server/data/dataset/posts');

		expect(Object.keys(postsModule)).toEqual(['posts']);
	});
});
