import { describe, expect, it } from 'vitest';

import { posts } from '../../src/lib/server/data/dataset/posts';
import {
	bestForeground,
	contrastRatio,
	luminance,
	readableAccent
} from '../../src/lib/ui/contrast';

const INK = '#0b1020';

describe('contrastRatio', () => {
	it('reports the WCAG extremes', () => {
		expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
		expect(contrastRatio('#123456', '#123456')).toBe(1);
	});

	it('is symmetric, because a ratio has no direction', () => {
		expect(contrastRatio('#ff0000', '#ffffff')).toBe(contrastRatio('#ffffff', '#ff0000'));
	});

	it('rejects anything that is not a 6-digit hex colour', () => {
		expect(() => luminance('red')).toThrow(/6-digit hex/);
	});
});

describe('bestForeground', () => {
	it('picks the candidate that reads better', () => {
		expect(bestForeground('#ffffff', [INK, '#f8fafc'])).toBe(INK);
		expect(bestForeground(INK, [INK, '#f8fafc'])).toBe('#f8fafc');
	});
});

describe('readableAccent', () => {
	it('leaves a colour that already reads well alone', () => {
		const bright = '#f97316';

		expect(readableAccent(bright, INK)).toBe(bright);
	});

	it('lifts a near-black colour off a dark background', () => {
		expect(contrastRatio(readableAccent('#0f172a', INK), INK)).toBeGreaterThanOrEqual(3);
	});

	it('darkens rather than lightens when the background is light', () => {
		const accent = readableAccent('#fef3c7', '#ffffff');

		expect(luminance(accent)).toBeLessThan(luminance('#fef3c7'));
		expect(contrastRatio(accent, '#ffffff')).toBeGreaterThanOrEqual(3);
	});

	it('makes every cover colour in the dataset legible on an Open Graph card', () => {
		// The card is the one surface where a colour straight from the data becomes
		// the background of text, so this is the guard for that whole route.
		const failing = posts
			.map((post) => readableAccent(post.coverColor, INK))
			.filter((accent) => contrastRatio(accent, INK) < 3);

		expect(failing).toEqual([]);
	});
});
