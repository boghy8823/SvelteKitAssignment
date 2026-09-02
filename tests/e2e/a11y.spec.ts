import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { openCampaigns, signIn } from './helpers';

test('dashboard items has no serious or critical axe violations', async ({ page }) => {
	await signIn(page);
	await openCampaigns(page);

	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
		.analyze();

	const blocking = results.violations.filter(
		(violation) => violation.impact === 'serious' || violation.impact === 'critical'
	);

	expect(blocking, formatViolations(blocking)).toEqual([]);
});

function formatViolations(
	violations: { id: string; impact?: string | null; help: string; nodes: { html: string }[] }[]
): string {
	if (violations.length === 0) {
		return '';
	}

	return violations
		.map((violation) => {
			const nodes = violation.nodes.map((node) => `    ${node.html}`).join('\n');

			return `${violation.id} (${violation.impact}): ${violation.help}\n${nodes}`;
		})
		.join('\n\n');
}
