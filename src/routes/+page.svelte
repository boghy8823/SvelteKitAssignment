<script lang="ts">
	import Badge from '$lib/ui/Badge.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Container from '$lib/ui/Container.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Select from '$lib/ui/Select.svelte';
	import Skeleton from '$lib/ui/Skeleton.svelte';

	let name = $state('');
	let channel = $state('email');
</script>

<Container width="prose" class="py-section">
	<Heading level={1}>Design system</Heading>

	<p class="mt-4 text-fg-muted">
		Primitives take their colours from semantic tokens, so one class list covers both themes. The
		active theme resolves during SSR from a cookie, and both themes are contrast-checked in tests.
	</p>

	<Heading level={2} class="mt-12">Actions</Heading>

	<div class="mt-4 flex flex-wrap items-center gap-3">
		<Button>Primary</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="danger">Danger</Button>
		<Button size="sm" variant="secondary">Small</Button>
		<Button disabled>Disabled</Button>
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<Badge>draft</Badge>
		<Badge variant="accent">active</Badge>
		<Badge variant="success">completed</Badge>
		<Badge variant="danger">over budget</Badge>
	</div>

	<Heading level={2} class="mt-12">Forms</Heading>

	<div class="mt-4 grid gap-5 sm:grid-cols-2">
		<Input label="Campaign name" bind:value={name} placeholder="Spring launch" />
		<Input
			label="Budget"
			type="number"
			value="1200"
			error="Budget must be a positive number"
			min="0"
		/>
		<Select label="Channel" bind:value={channel} hint="Where the campaign runs">
			<option value="email">Email</option>
			<option value="sms">SMS</option>
			<option value="web">Web</option>
		</Select>
	</div>

	<Heading level={2} class="mt-12">Surfaces and loading</Heading>

	<div class="mt-4 grid gap-4 sm:grid-cols-2">
		<Card>
			<Heading level={3}>Loaded</Heading>
			<p class="mt-2 text-sm text-fg-muted">A card holds content on a raised surface.</p>
		</Card>

		<Card>
			<div aria-busy="true" aria-live="polite" class="space-y-2">
				<Skeleton class="h-5 w-32" />
				<Skeleton class="h-4 w-full" />
				<Skeleton class="h-4 w-2/3" />
			</div>
		</Card>
	</div>
</Container>
