import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/*
 * Deterministic latency and forced failures, so the states that only exist for a
 * few hundred milliseconds — or only after something breaks — can actually be
 * looked at.
 *
 * Two things keep this from being production contamination. It is inert unless
 * `ENABLE_TEST_HOOKS` is set or the app is in dev, so a deployment without that
 * variable cannot be slowed down by a crafted URL. And it only ever adds delay or
 * turns a success into the failure path that already exists — it cannot invent a
 * state the app would not otherwise reach.
 *
 * The E2E rollback test intercepts the POST with Playwright instead, which needs
 * no production hook at all. This exists for the manual demo and for the
 * partial-failure rendering.
 */

export interface Fault {
	/** Milliseconds to stall the streamed rows. */
	latencyMs: number;
	/** Make the deferred row load resolve to its error branch. */
	rows: boolean;
	/** Make the facet query resolve to its error branch. */
	facets: boolean;
	/** Make the budget mutation fail as an infrastructure error. */
	write: boolean;
}

const NONE: Fault = { latencyMs: 0, rows: false, facets: false, write: false };

/** Long enough to see the skeleton and measure it, short enough to sit through. */
const SLOW_MS = 1500;

function honoured(): boolean {
	return dev || env.ENABLE_TEST_HOOKS === 'true';
}

/**
 * Turns a `fault` query value into the flags the load and the action honour.
 * Extracted so the mapping can be tested without a request, and so `faultFrom`
 * can refuse the whole thing when the hook is not enabled.
 */
export function parseFault(raw: string): Fault {
	const directives = new Set(
		raw
			.split(',')
			.map((directive) => directive.trim())
			.filter(Boolean)
	);

	return {
		latencyMs: directives.has('slow') ? SLOW_MS : 0,
		rows: directives.has('rows'),
		facets: directives.has('facets'),
		write: directives.has('write')
	};
}

/**
 * Reads `?fault=slow,rows,facets,write`. Unknown directives are ignored rather
 * than rejected: this is a debugging affordance, and a typo in one should not
 * 500 a page someone was trying to inspect.
 */
export function faultFrom(url: URL): Fault {
	if (!honoured()) {
		return NONE;
	}

	return parseFault(url.searchParams.get('fault') ?? '');
}

export function delay(ms: number): Promise<void> {
	return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
