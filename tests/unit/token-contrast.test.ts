import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { contrastRatio } from '../../src/lib/ui/contrast';

const css = readFileSync(fileURLToPath(new URL('../../src/app.css', import.meta.url)), 'utf8');

const themes = ['light', 'dark'] as const;
type Theme = (typeof themes)[number];

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

const tokens = declarations(':root');

/**
 * Follows `var()` indirection and picks the requested branch of any
 * `light-dark()` pair until a literal value is reached.
 */
function resolve(name: string, theme: Theme): string {
	let value = tokens.get(name);

	for (let hops = 0; value !== undefined && hops < 6; hops += 1) {
		const pair = /^light-dark\(([^,]+),(.+)\)$/.exec(value);

		if (pair) {
			value = (theme === 'light' ? pair[1] : pair[2]).trim();
			continue;
		}

		if (!value.startsWith('var(')) {
			return value;
		}

		value = tokens.get(value.slice(4, -1).trim());
	}

	throw new Error(`Token ${name} does not resolve to a literal value`);
}

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

describe.each(themes)('%s theme', (theme) => {
	it.each(textPairs)('renders %s on %s at AA for text', (foreground, background) => {
		expect(
			contrastRatio(resolve(foreground, theme), resolve(background, theme))
		).toBeGreaterThanOrEqual(4.5);
	});

	it.each(uiPairs)('renders %s on %s at AA for controls', (foreground, background) => {
		expect(
			contrastRatio(resolve(foreground, theme), resolve(background, theme))
		).toBeGreaterThanOrEqual(3);
	});
});

describe('token layering', () => {
	it('keeps every semantic token themed for both schemes', () => {
		const semantic = [...tokens.keys()].filter((name) => !name.startsWith('--pal-'));
		const unthemed = semantic.filter((name) => !tokens.get(name)?.startsWith('light-dark('));

		expect(unthemed).toEqual([]);
	});

	it('never exposes a raw --color-* name for components to bypass the semantic layer', () => {
		expect([...tokens.keys()].filter((name) => name.startsWith('--color-'))).toEqual([]);
	});
});
