/*
 * WCAG contrast maths, in one place. The token test asserts the palette with it,
 * and the Open Graph renderer uses it to keep data-driven colours legible —
 * both need the same definition of "readable", so they share one.
 */

interface Rgb {
	r: number;
	g: number;
	b: number;
}

function parse(hex: string): Rgb {
	const match = /^#([\da-f]{6})$/i.exec(hex);

	if (!match) {
		throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
	}

	const value = Number.parseInt(match[1], 16);

	return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

function format({ r, g, b }: Rgb): string {
	return `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function linear(value: number): number {
	const ratio = value / 255;

	return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 for black and 1 for white. */
export function luminance(hex: string): number {
	const { r, g, b } = parse(hex);

	return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio, from 1 (identical) to 21 (black on white). */
export function contrastRatio(foreground: string, background: string): number {
	const a = luminance(foreground);
	const b = luminance(background);
	const [lighter, darker] = a > b ? [a, b] : [b, a];

	return (lighter + 0.05) / (darker + 0.05);
}

/** Whichever candidate reads better on the given background. */
export function bestForeground(background: string, candidates: readonly string[]): string {
	return candidates.reduce((best, candidate) =>
		contrastRatio(candidate, background) > contrastRatio(best, background) ? candidate : best
	);
}

/**
 * Mixes a colour toward the background's opposite end until it clears `minimum`
 * against it, so a data-driven colour cannot disappear into the surface it sits
 * on. Several posts in the dataset carry a near-black `coverColor`, which would
 * otherwise render as an invisible accent on a dark card.
 *
 * Hue is preserved as far as a linear mix allows, so the result still reads as
 * the post's colour rather than as a generic highlight.
 */
export function readableAccent(colour: string, background: string, minimum = 3): string {
	const target = luminance(background) > 0.5 ? { r: 0, g: 0, b: 0 } : { r: 255, g: 255, b: 255 };
	const from = parse(colour);

	for (let step = 0; step <= 10; step += 1) {
		const ratio = step / 10;
		const mixed = format({
			r: from.r + (target.r - from.r) * ratio,
			g: from.g + (target.g - from.g) * ratio,
			b: from.b + (target.b - from.b) * ratio
		});

		if (contrastRatio(mixed, background) >= minimum) {
			return mixed;
		}
	}

	return format(target);
}
