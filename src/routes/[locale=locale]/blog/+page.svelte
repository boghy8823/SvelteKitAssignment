<script lang="ts">
	import { resolve } from '$app/paths';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Pagination from '$lib/ui/Pagination.svelte';

	let { data } = $props();

	const i18n = useI18n();

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('blog.title'),
			description: i18n.t('home.hero.subtitle'),
			path: '/blog',
			search: data.posts.page > 1 ? `?page=${data.posts.page}` : ''
		})
	);

	function pageHref(page: number): string {
		const base = resolve('/[locale=locale]/blog', { locale: i18n.locale });

		return page > 1 ? `${base}?page=${page}` : base;
	}
</script>

<Seo {meta} />

<Container width="wide" class="py-section">
	<Heading level={1}>{i18n.t('blog.title')}</Heading>

	{#if data.posts.rows.length === 0}
		<p class="mt-6 text-fg-muted">{i18n.t('blog.empty')}</p>
	{:else}
		<ul class="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			{#each data.posts.rows as post (post.slug)}
				<li>
					<Card padding="none" class="flex h-full flex-col overflow-hidden">
						<!-- The dataset ships no images, only a per-post colour, so the cover
						     is a token-driven block rather than a fake photograph. -->
						<div class="h-24" style={`background-color: ${post.coverColor}`}></div>

						<div class="flex flex-1 flex-col p-gutter">
							<div class="flex flex-wrap gap-1">
								{#each post.tags as tag (tag)}
									<Badge variant="accent">{tag}</Badge>
								{/each}
							</div>

							<Heading level={2} size="md" class="mt-3">
								<a
									href={resolve('/[locale=locale]/blog/[slug]', {
										locale: i18n.locale,
										slug: post.slug
									})}
									class="underline-offset-2 hover:underline"
								>
									{post.title}
								</a>
							</Heading>

							<p class="mt-2 line-clamp-3 text-sm text-fg-muted">{post.excerpt}</p>

							<p class="mt-4 flex items-center gap-2 text-xs text-fg-muted">
								<span>{i18n.format.date(post.publishedAt)}</span>
								<span aria-hidden="true">·</span>
								<span>{i18n.t('blog.readingTime', { minutes: post.readingTimeMinutes })}</span>
							</p>
						</div>
					</Card>
				</li>
			{/each}
		</ul>

		<Pagination
			class="mt-10"
			page={data.posts.page}
			pageCount={data.posts.pageCount}
			summary={i18n.t('pagination.showing', {
				from: data.posts.from + 1,
				to: data.posts.to,
				total: data.posts.total
			})}
			previousLabel={i18n.t('pagination.previous')}
			nextLabel={i18n.t('pagination.next')}
			label={i18n.t('blog.title')}
			href={pageHref}
		/>
	{/if}
</Container>
