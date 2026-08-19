<script lang="ts">
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { organization } from '$lib/seo/jsonld';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import { buttonClasses } from '$lib/ui/button-styles';
	import Card from '$lib/ui/Card.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';

	const i18n = useI18n();

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('home.hero.title'),
			description: i18n.t('home.hero.subtitle'),
			path: '/'
		})
	);

	const features = $derived([
		{
			title: i18n.t('home.features.performance.title'),
			body: i18n.t('home.features.performance.body')
		},
		{ title: i18n.t('home.features.dx.title'), body: i18n.t('home.features.dx.body') },
		{
			title: i18n.t('home.features.accessibility.title'),
			body: i18n.t('home.features.accessibility.body')
		}
	]);

	const tiers = $derived([
		{ name: i18n.t('pricing.tier.starter'), price: 0 },
		{ name: i18n.t('pricing.tier.team'), price: 49 },
		{ name: i18n.t('pricing.tier.scale'), price: 199 }
	]);
</script>

<Seo {meta} jsonLd={[organization()]} />

<Container width="wide" class="py-section">
	<div class="max-w-2xl">
		<Heading level={1}>{i18n.t('home.hero.title')}</Heading>

		<p class="mt-5 text-lg text-fg-muted">{i18n.t('home.hero.subtitle')}</p>

		<div class="mt-8 flex flex-wrap items-center gap-3">
			<a href="#pricing" class={buttonClasses({ variant: 'primary' })}>
				{i18n.t('home.hero.cta')}
			</a>
		</div>
	</div>
</Container>

<section class="border-t border-border bg-surface-raised">
	<Container width="wide" class="py-section">
		<Heading level={2}>{i18n.t('home.features.title')}</Heading>

		<div class="mt-8 grid gap-4 md:grid-cols-3">
			{#each features as feature (feature.title)}
				<Card class="bg-surface">
					<Heading level={3}>{feature.title}</Heading>
					<p class="mt-2 text-sm text-fg-muted">{feature.body}</p>
				</Card>
			{/each}
		</div>
	</Container>
</section>

<section id="pricing" class="border-t border-border">
	<Container width="wide" class="py-section">
		<Heading level={2}>{i18n.t('pricing.title')}</Heading>
		<p class="mt-3 text-fg-muted">{i18n.t('pricing.subtitle')}</p>

		<div class="mt-8 grid gap-4 md:grid-cols-3">
			{#each tiers as tier (tier.name)}
				<Card>
					<Heading level={3}>{tier.name}</Heading>

					<p class="mt-3 text-2xl font-semibold">
						{i18n.format.currency(tier.price)}
						<span class="text-sm font-normal text-fg-muted">{i18n.t('pricing.perMonth')}</span>
					</p>

					<button
						type="button"
						class={buttonClasses({ variant: 'secondary', class: 'mt-5 w-full' })}
					>
						{i18n.t('pricing.cta')}
					</button>
				</Card>
			{/each}
		</div>
	</Container>
</section>

<section class="border-t border-border bg-surface-raised">
	<Container width="wide" class="py-section">
		<Heading level={2}>{i18n.t('social.title')}</Heading>
		<p class="mt-3 max-w-xl text-fg-muted">{i18n.t('social.subtitle')}</p>
	</Container>
</section>
