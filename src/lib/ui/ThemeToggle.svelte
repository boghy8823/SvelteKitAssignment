<script lang="ts">
	import { page } from '$app/state';

	import { isTheme, nextTheme, type Theme } from './theme';

	interface Props {
		/** Accessible name. Passed in so the i18n layer owns the copy, not this component. */
		label?: string;
		/** Announced in a live region after a scripted switch. */
		announce?: (theme: Theme) => string;
		class?: string;
	}

	let {
		label = 'Switch theme',
		announce = (theme) => `${theme === 'dark' ? 'Dark' : 'Light'} theme enabled`,
		class: className = ''
	}: Props = $props();

	let announcement = $state('');

	/** What the user is actually looking at, whether that came from a cookie or the OS. */
	function currentTheme(): Theme {
		const stored = document.documentElement.dataset.theme;

		if (isTheme(stored)) {
			return stored;
		}

		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	async function toggle(event: SubmitEvent) {
		event.preventDefault();

		const target = nextTheme(currentTheme());

		// Paint first, persist after: the cookie is httpOnly, so the server is
		// the only writer, but the user should not wait for it.
		document.documentElement.dataset.theme = target;
		announcement = announce(target);

		await fetch('/api/theme', {
			method: 'POST',
			headers: { accept: 'application/json' },
			body: new URLSearchParams({ theme: target })
		});
	}
</script>

<form method="POST" action="/api/theme" onsubmit={toggle} class={className}>
	<input type="hidden" name="redirectTo" value={page.url.pathname + page.url.search} />

	<button
		type="submit"
		aria-label={label}
		title={label}
		class="flex size-9 items-center justify-center rounded-full border border-border bg-surface-raised text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
	>
		<svg viewBox="0 0 24 24" class="size-4" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
			<path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" />
		</svg>
	</button>
</form>

<p class="sr-only" aria-live="polite">{announcement}</p>
