<script lang="ts">
	import Badge from '$lib/ui/Badge.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Input from '$lib/ui/Input.svelte';
	import Select from '$lib/ui/Select.svelte';

	let name = $state('');
	let channel = $state('email');
</script>

<div class="mx-auto max-w-2xl px-gutter py-section">
	<h1 class="text-display font-semibold">Design system</h1>

	<p class="mt-4 text-fg-muted">
		Primitives take their colours from semantic tokens, so one class list covers both themes. The
		active theme resolves during SSR from a cookie, and both themes are contrast-checked in tests.
	</p>

	<div class="mt-10 flex flex-wrap items-center gap-3">
		<Button>Primary</Button>
		<Button variant="secondary">Secondary</Button>
		<Button variant="ghost">Ghost</Button>
		<Button variant="danger">Danger</Button>
		<Button size="sm" variant="secondary">Small</Button>
		<Button disabled>Disabled</Button>
	</div>

	<div class="mt-6 flex flex-wrap items-center gap-2">
		<Badge>draft</Badge>
		<Badge variant="accent">active</Badge>
		<Badge variant="success">completed</Badge>
		<Badge variant="danger">over budget</Badge>
	</div>

	<div class="mt-10 grid gap-5 sm:grid-cols-2">
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
</div>
