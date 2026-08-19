<script lang="ts">
	import type { JsonLd } from './jsonld';
	import type { Meta } from './meta';
	import { siteName } from './site';

	interface Props {
		meta: Meta;
		/** Structured data blocks, serialised into one script per block. */
		jsonLd?: readonly JsonLd[];
	}

	let { meta, jsonLd = [] }: Props = $props();

	const fullTitle = $derived(meta.title === siteName ? meta.title : `${meta.title} · ${siteName}`);

	/**
	 * Structured data has to be a real `<script>` tag, which a component template
	 * cannot contain, so it goes through {@html}. Every `<` inside the JSON is
	 * escaped, so a value can never break out of the block, and the closing tag is
	 * assembled from two halves — writing it whole would end this file's own script
	 * as far as the parser is concerned.
	 */
	const closing = '</' + 'script>';

	const blocks = $derived(
		jsonLd.map(
			(block) =>
				`<script type="application/ld+json">${JSON.stringify(block).replace(/</g, '\\u003c')}${closing}`
		)
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={meta.description} />
	<meta name="robots" content={meta.robots} />
	<link rel="canonical" href={meta.canonical} />

	{#each meta.alternates as alternate (alternate.hreflang)}
		<link rel="alternate" hreflang={alternate.hreflang} href={alternate.href} />
	{/each}

	{#each Object.entries(meta.og) as [property, content] (property)}
		<meta {property} {content} />
	{/each}

	{#each Object.entries(meta.twitter) as [name, content] (name)}
		<meta {name} {content} />
	{/each}

	{#each blocks as block, index (index)}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON-LD needs a script tag; the payload is app-owned and every `<` in it is escaped above -->
		{@html block}
	{/each}
</svelte:head>
