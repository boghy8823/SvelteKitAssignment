<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import Container from '$lib/ui/Container.svelte';

	let { children } = $props();

	const i18n = useI18n();

	/**
	 * A second nav rather than more entries in the header: these routes only exist
	 * for someone signed in, and mixing them into the site nav would advertise
	 * pages most visitors cannot open.
	 */
	const links = $derived([
		{
			href: resolve('/[locale=locale]/dashboard', { locale: i18n.locale }),
			label: i18n.t('dashboard.title')
		},
		{
			href: resolve('/[locale=locale]/dashboard/items', { locale: i18n.locale }),
			label: i18n.t('dashboard.items.title')
		}
	]);
</script>

<div class="border-b border-border bg-surface-raised">
	<Container width="wide">
		<nav aria-label={i18n.t('dashboard.title')} class="flex h-12 items-center gap-1 text-sm">
			{#each links as link (link.href)}
				<a
					href={link.href}
					aria-current={page.url.pathname === link.href ? 'page' : undefined}
					class="rounded-md px-2 py-1 text-fg-muted underline-offset-2 hover:text-fg hover:underline aria-[current]:font-semibold aria-[current]:text-fg"
				>
					{link.label}
				</a>
			{/each}
		</nav>
	</Container>
</div>

{@render children()}
