import { createFormatters } from '$lib/i18n/intl';
import { locales } from '$lib/i18n/locales';
import { createTranslator } from '$lib/i18n/translate';
import { siteName } from '$lib/seo/site';
import { get, slugs } from '$lib/server/data/posts.repo';
import { messagesFor } from '$lib/server/i18n/messages';
import { renderOgImage } from '$lib/server/seo/og-image';
import { error } from '@sveltejs/kit';
import type { EntryGenerator, RequestHandler } from './$types';

/**
 * Prerendered rather than generated per request. Rendering a card costs a font
 * parse and a rasterisation, and the alternative is paying that on a cold start
 * every time a link is pasted into Slack — for output that is identical every
 * time, because the titles come from a fixed dataset.
 *
 * The trade-off is stated in ADR 0001: a new post needs a deploy to get a card.
 */
export const prerender = true;

/** 20 posts across 2 locales: 40 files, enumerated rather than crawled. */
export const entries: EntryGenerator = async () => {
	const all = await slugs();

	return locales.flatMap((locale) => all.map((slug) => ({ locale, slug })));
};

export const GET: RequestHandler = async ({ params }) => {
	const post = await get(params.slug, params.locale);

	if (!post) {
		error(404, 'Post not found');
	}

	// The card is localised like every other surface: German cards carry the
	// German title, date format, and reading-time string.
	const t = createTranslator(messagesFor(params.locale));
	const format = createFormatters(params.locale);

	const png = await renderOgImage({
		title: post.title,
		eyebrow: `${siteName} · ${t('blog.title')}`,
		byline: `${format.date(post.publishedAt)} · ${t('blog.readingTime', { minutes: post.readingTimeMinutes })}`,
		// Three at most: a fourth chip wraps and the row stops reading as a row.
		tags: post.tags.slice(0, 3),
		coverColor: post.coverColor
	});

	// Only the content type is worth setting here. Prerendered responses become
	// files on disk, and the cache headers that reach a visitor are the host's.
	return new Response(png, { headers: { 'content-type': 'image/png' } });
};
