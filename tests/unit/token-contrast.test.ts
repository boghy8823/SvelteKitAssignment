import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../../src/app.css', import.meta.url)), 'utf8');

/** Declarations from every block matching the given selector, in source order. */
function declarations(selector: string): Map<string, string> {
	const pattern = new RegExp(`${escapeRegExp(selector)}\\s*\\{([^}]*)\\}`, 'g');
	const found = new Map<string, string>();

	for (const block of css.matchAll(pattern)) {
		for (const [, name, value] of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
			found.set(name, value.trim());
		}
	}

	return found;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Follows `var(--x)` indirection until a literal value is reached. */
function resolve(name: string, scope: Map<string, string>): string {
	let value = scope.get(name);

	for (let hops = 0; value?.startsWith('var(') && hops < 5; hops += 1) {
		const referenced = value.slice(4, -1).trim();
		value = scope.get(referenced);
	}

	if (value === undefined) {
		throw new Error(`Token ${name} does not resolve to a value`);
	}

	return value;
}

function channel(value: number): number {
	const ratio = value / 255;
	return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
	const match = /^#([\da-f]{6})$/i.exec(hex);

	if (!match) {
		throw new Error(`Expected a 6-digit hex colour, received "${hex}"`);
	}

	const value = Number.parseInt(match[1], 16);
	const r = channel((value >> 16) & 0xff);
	const g = channel((value >> 8) & 0xff);
	const b = channel(value & 0xff);

	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
	const a = luminance(foreground);
	const b = luminance(background);
	const [lighter, darker] = a > b ? [a, b] : [b, a];

	return (lighter + 0.05) / (darker + 0.05);
}

const light = declarations(':root');
const dark = new Map([...light, ...declarations("\\[data-theme='dark'\\]")]);
const themes = { light, dark };

/** WCAG 1.4.3: body text and meaningful icons. */
const textPairs = [
	['--fg', '--surface'],
	['--fg', '--surface-raised'],
	['--fg', '--surface-sunken'],
	['--fg-muted', '--surface'],
	['--fg-muted', '--surface-raised'],
	['--accent', '--surface'],
	['--accent-fg', '--accent'],
	['--danger', '--surface'],
	['--danger-fg', '--danger'],
	['--success-fg', '--success']
] as const;

/** WCAG 1.4.11: control boundaries and focus indicators. */
const uiPairs = [
	['--border-strong', '--surface'],
	['--ring', '--surface'],
	['--ring', '--surface-raised']
] as const;

describe.each(Object.entries(themes))('%s theme', (_name, scope) => {
	it.each(textPairs)('renders %s on %s at AA for text', (foreground, background) => {
		const ratio = contrast(resolve(foreground, scope), resolve(background, scope));

		expect(ratio).toBeGreaterThanOrEqual(4.5);
	});

	it.each(uiPairs)('renders %s on %s at AA for controls', (foreground, background) => {
		const ratio = contrast(resolve(foreground, scope), resolve(background, scope));

		expect(ratio).toBeGreaterThanOrEqual(3);
	});

	it('never lets a component reach past the semantic layer', () => {
		const componentFacing = [...scope.keys()].filter((name) => name.startsWith('--color-'));

		expect(componentFacing).toEqual([]);
	});
});
