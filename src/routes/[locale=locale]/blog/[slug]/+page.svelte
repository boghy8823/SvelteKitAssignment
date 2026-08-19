<script lang="ts">
	import { resolve } from '$app/paths';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { article, breadcrumbs } from '$lib/seo/jsonld';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';

	let { data } = $props();

	const i18n = useI18n();

	const ogImage = $derived(`/og/${i18n.locale}/${data.post.slug}.png`);

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: data.post.title,
			description: data.post.excerpt,
			path: `/blog/${data.post.slug}`,
			image: ogImage,
			type: 'article',
			publishedAt: data.post.publishedAt
		})
	);

	const jsonLd = $derived([
		article({
			locale: i18n.locale,
			title: data.post.title,
			description: data.post.excerpt,
			slug: data.post.slug,
			publishedAt: data.post.publishedAt,
			author: data.post.author.name,
			image: ogImage,
			tags: data.post.tags
		}),
		breadcrumbs(i18n.locale, [
			{ name: i18n.t('nav.home'), path: '/' },
			{ name: i18n.t('blog.title'), path: '/blog' },
			{ name: data.post.title, path: `/blog/${data.post.slug}` }
		])
	]);

	/**
	 * The provided bodies are plain prose separated by blank lines. Splitting on
	 * them costs nothing and ships no parser; a markdown renderer would be a
	 * dependency and a bundle for formatting that is not in the data.
	 */
	const paragraphs = $derived(data.post.body.split('\n\n').filter((block) => block.trim() !== ''));
</script>

<Seo {meta} {jsonLd} />

<article>
	<div class="h-40 w-full" style={`background-color: ${data.post.coverColor}`}></div>

	<Container width="prose" class="py-section">
		<nav aria-label={i18n.t('blog.title')} class="text-sm">
			<a
				href={resolve('/[locale=locale]/blog', { locale: i18n.locale })}
				class="text-fg-muted underline-offset-2 hover:text-fg hover:underline"
			>
				{i18n.t('blog.title')}
			</a>
		</nav>

		<Heading level={1} class="mt-4">{data.post.title}</Heading>

		<div class="mt-4 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
			<span>{data.post.author.name}</span>
			<span aria-hidden="true">·</span>
			<!-- A machine-readable date next to the formatted one, so the timestamp is
			     unambiguous without repeating it to the reader. -->
			<time datetime={data.post.publishedAt}>{i18n.format.date(data.post.publishedAt)}</time>
			<span aria-hidden="true">·</span>
			<span>{i18n.t('blog.readingTime', { minutes: data.post.readingTimeMinutes })}</span>
		</div>

		<div class="mt-4 flex flex-wrap gap-1">
			{#each data.post.tags as tag (tag)}
				<Badge variant="accent">{tag}</Badge>
			{/each}
		</div>

		<div class="mt-8 space-y-5 text-fg-muted">
			{#each paragraphs as paragraph, index (index)}
				<p>{paragraph}</p>
			{/each}
		</div>
	</Container>
</article>
