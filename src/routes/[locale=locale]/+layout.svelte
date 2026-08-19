<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { provideI18n } from '$lib/i18n/context.svelte.ts';
	import { siteName } from '$lib/seo/site';
	import Button from '$lib/ui/Button.svelte';
	import { buttonClasses } from '$lib/ui/button-styles';
	import Container from '$lib/ui/Container.svelte';
	import LocaleSwitcher from '$lib/ui/LocaleSwitcher.svelte';
	import ThemeToggle from '$lib/ui/ThemeToggle.svelte';

	let { data, children } = $props();

	const i18n = provideI18n(() => ({ locale: data.locale, messages: data.messages }));

	// resolve() type-checks the route id against the router, so a link cannot
	// outlive the route it points at. Nav entries are added here as their routes
	// land, which is why this list grows rather than pointing at 404s.
	const home = $derived(resolve('/[locale=locale]', { locale: data.locale }));

	const links = $derived([
		{ href: resolve('/[locale=locale]/blog', { locale: data.locale }), label: i18n.t('nav.blog') },
		{
			href: resolve('/[locale=locale]/search', { locale: data.locale }),
			label: i18n.t('nav.search')
		}
	]);

	const loginHref = $derived(resolve('/[locale=locale]/login', { locale: data.locale }));
	const logoutAction = $derived(resolve('/[locale=locale]/logout', { locale: data.locale }));
</script>

<div class="flex min-h-dvh flex-col bg-surface text-fg">
	<a
		href="#main"
		class="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-fg"
	>
		{i18n.t('a11y.skipToContent')}
	</a>

	<header class="border-b border-border">
		<Container width="wide" class="flex h-16 items-center justify-between gap-4">
			<a href={home} class="font-semibold tracking-tight">{siteName}</a>

			<nav aria-label={siteName} class="flex items-center gap-1 text-sm">
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

			<div class="flex items-center gap-2">
				{#if data.user}
					<span class="hidden text-sm text-fg-muted sm:inline">
						{i18n.t('login.signedInAs', { name: data.user.name })}
					</span>

					<!--
						A form, not a link: signing out changes state, and the endpoint only
						answers POST. `redirectTo` carries the page they are on, which the
						server validates as a local path before honouring.
					-->
					<form method="POST" action={logoutAction}>
						<input type="hidden" name="redirectTo" value={page.url.pathname} />
						<Button type="submit" variant="ghost" size="sm">{i18n.t('nav.logout')}</Button>
					</form>
				{:else}
					<a href={loginHref} class={buttonClasses({ variant: 'secondary', size: 'sm' })}>
						{i18n.t('nav.login')}
					</a>
				{/if}

				<LocaleSwitcher current={data.locale} label={i18n.t('a11y.localeSwitcher')} />
				<ThemeToggle label={i18n.t('a11y.themeToggle')} />
			</div>
		</Container>
	</header>

	<main id="main" class="flex-1">
		{@render children()}
	</main>

	<footer class="border-t border-border">
		<Container width="wide" class="py-6 text-sm text-fg-muted">
			{i18n.t('footer.copy')}
		</Container>
	</footer>
</div>
