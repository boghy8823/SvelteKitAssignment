<script lang="ts">
	import { canEdit } from '$lib/data/account';
	import { useI18n } from '$lib/i18n/context.svelte.ts';
	import { buildMeta } from '$lib/seo/meta';
	import Seo from '$lib/seo/Seo.svelte';
	import Badge from '$lib/ui/Badge.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';

	let { data } = $props();

	const i18n = useI18n();

	const meta = $derived(
		buildMeta({
			locale: i18n.locale,
			title: i18n.t('dashboard.title'),
			description: i18n.t('dashboard.subtitle'),
			path: '/dashboard',
			// Behind a session, so a crawler only ever sees the login page here.
			// Saying so is cheaper than letting it guess from a redirect.
			noindex: true
		})
	);

	const roleLabels = {
		admin: 'role.admin',
		editor: 'role.editor',
		viewer: 'role.viewer'
	} as const;

	/**
	 * The same predicate the mutation uses server-side. Here it explains what the
	 * account may do; there it decides. A viewer is told they are read-only rather
	 * than discovering it from a control that fails.
	 */
	const writable = $derived(canEdit(data.user));
</script>

<Seo {meta} />

<Container width="wide" class="py-section">
	<Heading level={1}>{i18n.t('dashboard.title')}</Heading>
	<p class="mt-3 text-fg-muted">{i18n.t('dashboard.welcome', { name: data.user.name })}</p>

	<Card class="mt-8 flex flex-col gap-3">
		<div class="flex items-center gap-2 text-sm">
			<span class="text-fg-muted">{i18n.t('dashboard.role')}</span>
			<Badge variant={writable ? 'accent' : 'neutral'}>
				{i18n.t(roleLabels[data.user.role])}
			</Badge>
		</div>

		<p class="text-sm text-fg-muted">
			{writable ? i18n.t('dashboard.canEdit') : i18n.t('dashboard.readOnly')}
		</p>
	</Card>
</Container>
