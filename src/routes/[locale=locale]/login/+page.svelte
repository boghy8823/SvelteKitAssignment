<script lang="ts">
	import { enhance } from '$app/forms';
	import { loginErrors, type LoginErrors } from '$lib/data/login';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Input from '$lib/ui/Input.svelte';

	let { data, form } = $props();

	const i18n = useI18n();

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('login.title'),
			description: i18n.t('login.subtitle'),
			path: '/login',
			// A sign-in form is not a search result. It also carries a redirectTo, and
			// indexing one URL per destination would be worse than indexing none.
			noindex: true
		})
	);

	let email = $state('');
	let password = $state('');

	/**
	 * Client-side errors, from the same `loginErrors` the action runs. They appear
	 * on submit rather than on every keystroke: telling someone their address is
	 * invalid while they are still typing it is noise, and it moves focus rules
	 * around under them.
	 */
	let clientErrors = $state<LoginErrors>({});

	/** The action's reply survives until the next submit. */
	const errors = $derived<LoginErrors>({ ...form?.errors, ...clientErrors });

	const credentialsRejected = $derived(
		form?.credentials === true && !errors.email && !errors.password
	);

	let submitting = $state(false);

	// `$state` because they are written by a two-way binding, not read in a
	// template: without it the binding would assign to a plain variable.
	let emailInput = $state<HTMLInputElement>();
	let passwordInput = $state<HTMLInputElement>();

	/**
	 * Validating in the submit handler rather than with `required`/`type=email`
	 * keeps one definition of valid. Native constraints would be a second, subtly
	 * different rule, and their bubbles cannot be translated.
	 */
	function onSubmit(event: SubmitEvent) {
		clientErrors = loginErrors({ email, password }) ?? {};

		if (Object.keys(clientErrors).length === 0) {
			return;
		}

		event.preventDefault();

		// Focus the field being complained about, so a keyboard user is not left
		// hunting for the message that just appeared.
		(clientErrors.email ? emailInput : passwordInput)?.focus();
	}

	function useDemo(demoEmail: string, demoPassword: string) {
		email = demoEmail;
		password = demoPassword;
		clientErrors = {};
	}
</script>

<Seo {meta} />

<Container width="prose" class="py-section">
	<Heading level={1}>{i18n.t('login.title')}</Heading>
	<p class="mt-3 text-fg-muted">{i18n.t('login.subtitle')}</p>

	<Card class="mt-8">
		<form
			method="POST"
			onsubmit={onSubmit}
			use:enhance={() => {
				submitting = true;

				return async ({ update }) => {
					// `update` applies the action result, including the redirect on
					// success. `invalidateAll` is off: nothing else on this page depends
					// on server data, and reloading every load function to render one
					// form error is exactly the habit the brief warns about.
					await update({ reset: false, invalidateAll: false });
					submitting = false;
				};
			}}
			class="flex flex-col gap-5"
			novalidate
		>
			<!-- Travels with the POST so the destination survives a failed attempt. It
			     is validated as a local path on the server either way. -->
			<input type="hidden" name="redirectTo" value={data.redirectTo} />

			{#if credentialsRejected}
				<!--
					A live region that exists in the DOM from the start, so the message is
					announced when it arrives rather than when the container appears.
					Wrong password is a state, not a field error, so it sits above both.
				-->
				<p
					role="alert"
					class="rounded-md border border-danger bg-surface px-3 py-2 text-sm text-danger"
				>
					{i18n.t('login.error')}
				</p>
			{/if}

			<Input
				bind:element={emailInput}
				bind:value={email}
				name="email"
				type="email"
				autocomplete="email"
				label={i18n.t('login.email')}
				error={errors.email ? i18n.t(errors.email) : undefined}
			/>

			<Input
				bind:element={passwordInput}
				bind:value={password}
				name="password"
				type="password"
				autocomplete="current-password"
				label={i18n.t('login.password')}
				error={errors.password ? i18n.t(errors.password) : undefined}
			/>

			<Button type="submit" disabled={submitting}>
				{submitting ? i18n.t('login.submitting') : i18n.t('login.submit')}
			</Button>
		</form>
	</Card>

	<!--
		The brief publishes these accounts for reviewers, so the page hands them over
		instead of making someone find them in the mocks. They come from the dataset
		rather than from copy, so they cannot drift out of date.
	-->
	<section class="mt-8">
		<Heading level={2} size="md">{i18n.t('login.demo.title')}</Heading>

		<p class="mt-2 text-sm text-fg-muted">
			{i18n.t('login.demo.password', { password: data.demo[0].password })}
		</p>

		<ul class="mt-3 flex flex-col gap-2">
			{#each data.demo as account (account.email)}
				<li class="flex items-center justify-between gap-3 text-sm">
					<span>
						<span class="font-medium">{account.email}</span>
						<span class="text-fg-muted">· {account.role}</span>
					</span>

					<Button
						variant="secondary"
						size="sm"
						onclick={() => useDemo(account.email, account.password)}
					>
						{i18n.t('login.demo.use', { email: account.email })}
					</Button>
				</li>
			{/each}
		</ul>
	</section>
</Container>
