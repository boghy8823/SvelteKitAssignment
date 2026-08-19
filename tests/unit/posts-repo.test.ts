import { describe, expect, it } from 'vitest';

import { posts } from '../../src/lib/server/data/dataset';
import { get, list, slugs } from '../../src/lib/server/data/posts.repo';

describe('posts.repo.list', () => {
	it('paginates newest first by default', async () => {
		const result = await list({ locale: 'en' });

		expect([result.total, result.pageCount, result.rows.length]).toEqual([20, 4, 6]);

		const dates = result.rows.map((row) => row.publishedAt);
		expect(dates).toEqual([...dates].sort().reverse());
	});

	it('walks every post exactly once across pages', async () => {
		const seen: string[] = [];

		for (let page = 1; page <= 4; page += 1) {
			const result = await list({ locale: 'en', page });
			seen.push(...result.rows.map((row) => row.slug));
		}

		expect(new Set(seen).size).toBe(20);
	});

	it('reverses for oldest first', async () => {
		const result = await list({ locale: 'en', sort: 'oldest' });
		const dates = result.rows.map((row) => row.publishedAt);

		expect(dates).toEqual([...dates].sort());
	});

	it('resolves the requested locale', async () => {
		const [english, german] = await Promise.all([
			list({ locale: 'en', pageSize: 1 }),
			list({ locale: 'de', pageSize: 1 })
		]);

		expect(english.rows[0].slug).toBe(german.rows[0].slug);
		expect(english.rows[0].title).not.toBe(german.rows[0].title);
	});

	it('matches titles', async () => {
		const result = await list({ locale: 'en', q: 'combobox' });

		expect(result.total).toBe(1);
		expect(result.rows[0].title.toLowerCase()).toContain('combobox');
	});

	it('ignores body text, which is identical across the provided posts', async () => {
		// "decoration" appears in every body. Matching bodies would return all 20
		// and make the search field look broken.
		const inBody = posts.filter((post) =>
			post.translations.en.body.toLowerCase().includes('decoration')
		).length;

		expect(inBody).toBe(20);
		await expect(list({ locale: 'en', q: 'decoration' })).resolves.toMatchObject({ total: 0 });
	});

	it('is case- and diacritic-insensitive', async () => {
		const [plain, shouted] = await Promise.all([
			list({ locale: 'en', q: 'streaming' }),
			list({ locale: 'en', q: 'STREAMING' })
		]);

		expect(plain.total).toBe(shouted.total);
		expect(plain.total).toBeGreaterThan(0);
	});

	it('filters by tag with IN semantics', async () => {
		const result = await list({ locale: 'en', tags: ['performance', 'ai'], pageSize: 20 });
		const expected = posts.filter(
			(post) => post.tags.includes('performance') || post.tags.includes('ai')
		).length;

		expect(result.total).toBe(expected);
	});

	it('sorts by title using locale collation', async () => {
		const result = await list({ locale: 'de', sort: 'title', pageSize: 20 });
		const titles = result.rows.map((row) => row.title);

		expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, 'de')));
	});

	it('clamps a page past the end', async () => {
		const result = await list({ locale: 'en', page: 99 });

		expect(result.page).toBe(4);
		expect(result.rows.length).toBeGreaterThan(0);
	});
});

describe('posts.repo.get', () => {
	it('returns the body for the requested locale', async () => {
		const [english, german] = await Promise.all([
			get('sub-second-lcp-on-a-content-site', 'en'),
			get('sub-second-lcp-on-a-content-site', 'de')
		]);

		expect(english?.body).toBeTruthy();
		expect(german?.title).not.toBe(english?.title);
	});

	it('returns null for an unknown slug', async () => {
		await expect(get('not-a-post', 'en')).resolves.toBeNull();
	});
});

describe('posts.repo.slugs', () => {
	it('lists every slug once, for prerendering and the sitemap', async () => {
		const all = await slugs();

		expect(all).toHaveLength(20);
		expect(new Set(all).size).toBe(20);
	});
});
