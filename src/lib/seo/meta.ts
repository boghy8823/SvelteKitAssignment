import { locales, type Locale } from '$lib/i18n/locales';

import { absolute, siteName } from './site';

export interface MetaInput {
	locale: Locale;
	title: string;
	description: string;
	/** Locale-less path, e.g. `/blog`. Alternates are derived from it. */
	path: string;
	/** Absolute or root-relative image URL. */
	image?: string;
	/** `article` for posts, `website` for everything else. */
	type?: 'website' | 'article';
	publishedAt?: string;
	/** Search results and other per-query views should not be indexed. */
	noindex?: boolean;
}

export interface Alternate {
	hreflang: string;
	href: string;
}

export interface Meta {
	title: string;
	description: string;
	canonical: string;
	robots: string;
	alternates: Alternate[];
	og: Record<string, string>;
	twitter: Record<string, string>;
}

function localised(locale: Locale, path: string): string {
	return `/${locale}${path === '/' ? '' : path}`;
}

/**
 * One builder for every route, so a page cannot ship without a canonical or an
 * Open Graph tag. Alternates come from the same locale list the router and the
 * sitemap use, which is what stops hreflang from drifting away from reality.
 */
export function buildMeta(input: MetaInput): Meta {
	const { locale, path, type = 'website' } = input;
	const canonical = absolute(localised(locale, path));
	const image = input.image ? absolute(input.image) : undefined;

	const alternates: Alternate[] = [
		...locales.map((candidate) => ({
			hreflang: candidate,
			href: absolute(localised(candidate, path))
		})),
		// x-default points at the negotiating root rather than at English: the
		// root is what decides for a visitor whose language we do not publish.
		{ hreflang: 'x-default', href: absolute('/') }
	];

	const og: Record<string, string> = {
		'og:type': type,
		'og:site_name': siteName,
		'og:title': input.title,
		'og:description': input.description,
		'og:url': canonical,
		'og:locale': locale === 'de' ? 'de_DE' : 'en_US'
	};

	if (image) {
		og['og:image'] = image;
		og['og:image:width'] = '1200';
		og['og:image:height'] = '630';
	}

	if (input.publishedAt) {
		og['article:published_time'] = input.publishedAt;
	}

	return {
		title: input.title,
		description: input.description,
		canonical,
		// `follow` even when noindex: the page should not be listed, but the links
		// out of it are still worth crawling.
		robots: input.noindex ? 'noindex, follow' : 'index, follow',
		alternates,
		og,
		twitter: {
			'twitter:card': image ? 'summary_large_image' : 'summary',
			'twitter:title': input.title,
			'twitter:description': input.description,
			...(image ? { 'twitter:image': image } : {})
		}
	};
}
