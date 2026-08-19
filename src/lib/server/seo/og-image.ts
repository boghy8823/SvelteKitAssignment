import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import { bestForeground, readableAccent } from '$lib/ui/contrast';

/*
 * Open Graph cards, rendered at build time.
 *
 * Satori lays out a subset of flexbox and emits SVG; resvg rasterises it. Both
 * are heavy — a wasm rasteriser and a font parser — which is exactly why this
 * runs during prerendering instead of per request. The content set is 20 posts
 * across 2 locales and the titles are not user-generated, so 40 files cover
 * every card the site can ever need, at zero runtime cost and zero cold start.
 *
 * Because this module is only ever imported by a prerendered endpoint, reading
 * the font from node_modules is safe: the code runs in the build's Node process
 * and is never shipped to a serverless function.
 */

const WIDTH = 1200;
const HEIGHT = 630;

/** Fixed card background, so text contrast never depends on the dataset. */
const INK = '#0b1020';
const PAPER = '#f8fafc';
const MUTED = '#94a3b8';

const require = createRequire(import.meta.url);

/**
 * Inter, in `woff` rather than `woff2`: satori parses the former directly, and
 * the latter would need a Brotli decoder for no visual difference. The `latin`
 * subset covers German umlauts, which the titles need.
 */
function inter(weight: 400 | 600 | 700) {
	return readFileSync(require.resolve(`@fontsource/inter/files/inter-latin-${weight}-normal.woff`));
}

const fonts = [
	{ name: 'Inter', data: inter(400), weight: 400 as const, style: 'normal' as const },
	{ name: 'Inter', data: inter(600), weight: 600 as const, style: 'normal' as const },
	{ name: 'Inter', data: inter(700), weight: 700 as const, style: 'normal' as const }
];

/**
 * Satori accepts a React-shaped element tree, and plain objects satisfy it. That
 * avoids adding React and a JSX pipeline to the build for one 40-file script.
 */
interface Node {
	type: string;
	props: Record<string, unknown>;
}

type Child = Node | string;

function el(type: string, style: Record<string, string | number>, children?: Child[]): Node {
	return { type, props: { style, children } };
}

function text(
	content: string,
	style: Record<string, string | number>,
	type: 'div' | 'span' = 'div'
): Node {
	return { type, props: { style, children: content } };
}

export interface OgImageInput {
	title: string;
	/** Site name and section, e.g. `Northwind · Writing`. */
	eyebrow: string;
	/** Already localised, e.g. `12. August 2026 · 7 Min. Lesezeit`. */
	byline: string;
	tags: readonly string[];
	/** The post's `coverColor`, which is the only art the dataset provides. */
	coverColor: string;
}

/**
 * A long title has to shrink or it wraps past the canvas. Two steps rather than
 * a continuous scale, so every card lands on one of two sizes and the set looks
 * deliberate instead of arbitrary.
 */
function titleSize(title: string): number {
	if (title.length > 72) {
		return 52;
	}

	return title.length > 44 ? 62 : 72;
}

function card(input: OgImageInput): Node {
	// The post's colour is a seed, not a promise: several covers in the dataset are
	// near-black, and painting an accent in one of those onto an ink card would
	// produce a chip nobody can read.
	const accent = readableAccent(input.coverColor, INK);
	const onAccent = bestForeground(accent, [INK, PAPER]);

	return el(
		'div',
		{
			width: '100%',
			height: '100%',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			backgroundColor: INK,
			color: PAPER,
			fontFamily: 'Inter',
			padding: '64px 72px',
			borderTop: `16px solid ${accent}`
		},
		[
			el('div', { display: 'flex', alignItems: 'center', gap: '16px' }, [
				el('div', {
					width: '20px',
					height: '20px',
					borderRadius: '6px',
					backgroundColor: accent
				}),
				text(input.eyebrow, {
					fontSize: 26,
					fontWeight: 600,
					letterSpacing: '0.04em',
					textTransform: 'uppercase',
					color: MUTED
				})
			]),

			text(input.title, {
				fontSize: titleSize(input.title),
				fontWeight: 700,
				lineHeight: 1.15,
				// Satori has no text-wrap balance, so the measure is set by width.
				maxWidth: '100%'
			}),

			el('div', { display: 'flex', flexDirection: 'column', gap: '20px' }, [
				el(
					'div',
					{ display: 'flex', gap: '10px' },
					input.tags.map((tag) =>
						text(
							tag,
							{
								fontSize: 22,
								fontWeight: 600,
								color: onAccent,
								backgroundColor: accent,
								borderRadius: '999px',
								padding: '6px 18px'
							},
							'span'
						)
					)
				),
				text(input.byline, { fontSize: 26, color: MUTED })
			])
		]
	);
}

export async function renderOgImage(input: OgImageInput): Promise<Uint8Array<ArrayBuffer>> {
	const svg = await satori(card(input), { width: WIDTH, height: HEIGHT, fonts });

	// Rendered at exactly the declared size: the OG tags advertise 1200×630, and a
	// scraper that finds a different one downranks the card.
	const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();

	// resvg hands back a Buffer over an `ArrayBufferLike`, which `BodyInit` does
	// not accept. Copying into a plain Uint8Array keeps the seam typed instead of
	// asserting the difference away; 40 copies of ~40 KB at build time is nothing.
	const png = new Uint8Array(rendered.byteLength);
	png.set(rendered);

	return png;
}
