import { describe, expect, it } from 'vitest';

import { ItemSchema, PostSchema, UserSchema } from '../../src/lib/data/schemas';

const item = {
	id: 'cmp_0001',
	name: 'Upgrade — GA release #001',
	status: 'completed',
	channel: 'social',
	owner: { id: 'u_priya', name: 'Priya Iyer' },
	budget: 2500,
	spent: 2332.02,
	impressions: 325282,
	clicks: 17467,
	ctr: 0.0537,
	startDate: '2026-04-03',
	endDate: '2026-05-16',
	updatedAt: '2026-04-09T22:00:00Z',
	tags: ['performance']
};

const post = {
	id: 'post_000',
	slug: 'sub-second-lcp-on-a-content-site',
	translations: {
		en: { title: 'Title', excerpt: 'Excerpt', body: 'Body' },
		de: { title: 'Titel', excerpt: 'Auszug', body: 'Inhalt' }
	},
	tags: ['performance'],
	author: { id: 'u_omar', name: 'Omar Haddad', avatarColor: '#a855f7' },
	publishedAt: '2026-05-31T00:00:00Z',
	readingTimeMinutes: 3,
	coverColor: '#1e293b'
};

/** The first issue's path, which is what a boot failure has to report. */
function firstIssuePath(result: { success: boolean; error?: { issues: { path: unknown[] }[] } }) {
	return result.error?.issues[0]?.path.join('.');
}

describe('ItemSchema', () => {
	it('accepts a row from the provided dataset', () => {
		expect(ItemSchema.safeParse(item).success).toBe(true);
	});

	it.each([
		['ctr above 1', { ctr: 1.5 }, 'ctr'],
		['negative budget', { budget: -1 }, 'budget'],
		['fractional impressions', { impressions: 12.5 }, 'impressions'],
		['unknown status', { status: 'pending' }, 'status'],
		['unknown channel', { channel: 'billboard' }, 'channel'],
		['a timestamp where a date belongs', { startDate: '2026-04-03T00:00:00Z' }, 'startDate'],
		['a date where a timestamp belongs', { updatedAt: '2026-04-09' }, 'updatedAt'],
		['an empty name', { name: '' }, 'name']
	])('rejects %s and reports the field', (_case, patch, path) => {
		const result = ItemSchema.safeParse({ ...item, ...patch });

		expect([result.success, firstIssuePath(result)]).toEqual([false, path]);
	});

	it('rejects fields the contract does not define, so drift surfaces at boot', () => {
		expect(ItemSchema.safeParse({ ...item, priority: 'high' }).success).toBe(false);
	});
});

describe('PostSchema', () => {
	it('accepts a row from the provided dataset', () => {
		expect(PostSchema.safeParse(post).success).toBe(true);
	});

	it('requires every locale, so a translated page has nothing to fall back to', () => {
		const englishOnly = { en: post.translations.en };

		expect(PostSchema.safeParse({ ...post, translations: englishOnly }).success).toBe(false);
	});

	it.each([
		['a non-hex cover colour', { coverColor: 'slate' }],
		['a three-digit hex colour', { coverColor: '#fff' }],
		['a zero reading time', { readingTimeMinutes: 0 }]
	])('rejects %s', (_case, patch) => {
		expect(PostSchema.safeParse({ ...post, ...patch }).success).toBe(false);
	});
});

describe('UserSchema', () => {
	it('rejects an unknown role', () => {
		const result = UserSchema.safeParse({
			id: 'demo_admin',
			email: 'admin@demo.test',
			password: 'demo1234',
			name: 'Demo Admin',
			role: 'superuser'
		});

		expect([result.success, firstIssuePath(result)]).toEqual([false, 'role']);
	});

	it('rejects a malformed email', () => {
		const result = UserSchema.safeParse({
			id: 'demo_admin',
			email: 'admin@demo',
			password: 'demo1234',
			name: 'Demo Admin',
			role: 'admin'
		});

		expect(result.success).toBe(false);
	});
});
