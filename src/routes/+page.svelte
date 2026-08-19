<div class="mx-auto max-w-2xl px-gutter py-section">
	<h1 class="text-display font-semibold">Design tokens</h1>

	<p class="mt-4 text-fg-muted">
		Colours, radii, and spacing come from semantic tokens. Both themes are verified at WCAG AA by a
		unit test, and the active theme is resolved during SSR from a cookie, so there is no flash.
	</p>

	<div class="mt-8 grid gap-3 sm:grid-cols-2">
		<div class="rounded-lg border border-border bg-surface-raised p-gutter">
			<p class="font-medium">Raised surface</p>
			<p class="mt-1 text-sm text-fg-muted">One class list, both themes.</p>
		</div>

		<div class="rounded-lg bg-accent p-gutter text-accent-fg">
			<p class="font-medium">Accent</p>
			<p class="mt-1 text-sm opacity-90">Foreground pairs are contrast-checked.</p>
		</div>
	</div>
</div>
