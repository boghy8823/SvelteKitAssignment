import type { Locale } from '$lib/i18n/locales';

import { absolute, siteName, siteUrl } from './site';

/**
 * Structured data as plain objects so the shape is reviewable and testable,
 * rather than a template string that validates only when someone remembers to
 * paste it into a checker.
 */
export type JsonLd = Record<string, unknown>;

export function organization(): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteName,
		url: siteUrl,
		description: 'A performance-first stack for teams that ship.'
	};
}

export interface ArticleInput {
	locale: Locale;
	title: string;
	description: string;
	slug: string;
	publishedAt: string;
	author: string;
	image: string;
	tags: readonly string[];
}

export function article(input: ArticleInput): JsonLd {
	const url = absolute(`/${input.locale}/blog/${input.slug}`);

	return {
		'@context': 'https://schema.org',
		'@type': 'Article',
		headline: input.title,
		description: input.description,
		datePublished: input.publishedAt,
		inLanguage: input.locale,
		keywords: [...input.tags].join(', '),
		image: absolute(input.image),
		author: { '@type': 'Person', name: input.author },
		publisher: { '@type': 'Organization', name: siteName, url: siteUrl },
		// Google reads this to decide which URL the markup describes; without it a
		// syndicated copy can be credited instead.
		mainEntityOfPage: { '@type': 'WebPage', '@id': url }
	};
}

export interface Crumb {
	name: string;
	path: string;
}

export function breadcrumbs(locale: Locale, crumbs: readonly Crumb[]): JsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: crumbs.map((crumb, index) => ({
			'@type': 'ListItem',
			position: index + 1,
			name: crumb.name,
			item: absolute(`/${locale}${crumb.path === '/' ? '' : crumb.path}`)
		}))
	};
}
