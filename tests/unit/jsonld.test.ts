import { describe, expect, it } from 'vitest';

import { article, breadcrumbs, organization } from '../../src/lib/seo/jsonld';
import { siteUrl } from '../../src/lib/seo/site';

/*
 * Structured data is markup no human reads, so nothing on the page looks broken
 * when it is wrong. These assertions stand in for the eyeballing that would
 * otherwise never happen: the required properties Google documents for each
 * type, and the absolute URLs that make the markup point at this site.
 */

const input = {
	locale: 'en',
	title: 'Sub-second LCP',
	description: 'How we did it.',
	slug: 'sub-second-lcp',
	publishedAt: '2026-05-31T09:00:00.000Z',
	author: 'Ada Lovelace',
	image: '/og/en/sub-second-lcp.png',
	tags: ['performance', 'engineering']
} as const;

describe('organization', () => {
	it('declares the context and type every consumer keys off', () => {
		expect(organization()).toMatchObject({
			'@context': 'https://schema.org',
			'@type': 'Organization'
		});
	});

	it('identifies the site by absolute URL', () => {
		expect(organization().url).toBe(siteUrl);
	});
});

describe('article', () => {
	const block = article(input);

	it('carries the properties Google requires for an Article', () => {
		expect(Object.keys(block)).toEqual(
			expect.arrayContaining(['@context', '@type', 'headline', 'datePublished', 'author', 'image'])
		);
	});

	it('names the page the markup describes, so a copy cannot claim it', () => {
		expect(block.mainEntityOfPage).toEqual({
			'@type': 'WebPage',
			'@id': `${siteUrl}/en/blog/sub-second-lcp`
		});
	});

	it('resolves the image to an absolute URL', () => {
		expect(block.image).toBe(`${siteUrl}/og/en/sub-second-lcp.png`);
	});

	it('states the language, which differs per locale at the same slug', () => {
		expect(article({ ...input, locale: 'de' }).inLanguage).toBe('de');
	});

	it('serialises without a raw closing script tag, which would break the block', () => {
		expect(JSON.stringify(block)).not.toContain('</script');
	});
});

describe('breadcrumbs', () => {
	const trail = breadcrumbs('de', [
		{ name: 'Start', path: '/' },
		{ name: 'Texte', path: '/blog' },
		{ name: 'Ein Beitrag', path: '/blog/ein-beitrag' }
	]);

	it('numbers positions from one, in order', () => {
		expect(trail.itemListElement).toMatchObject([
			{ position: 1, item: `${siteUrl}/de` },
			{ position: 2, item: `${siteUrl}/de/blog` },
			{ position: 3, item: `${siteUrl}/de/blog/ein-beitrag` }
		]);
	});

	it('localises the trail, so the German page does not link to English crumbs', () => {
		expect(JSON.stringify(trail)).not.toContain('/en/');
	});
});
