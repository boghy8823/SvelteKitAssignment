import type { ZodType } from 'zod';

/** Issues reported before the message is truncated, so one bad row is readable
 * and a systematically wrong file does not print 220 lines. */
const MAX_REPORTED_ISSUES = 5;

/**
 * Parses provided data at module init and throws a message that names the
 * offending path. "items.json is invalid" sends someone hunting through 220
 * rows; "items.json.87.ctr: Too big" does not.
 */
/**
 * Fails boot on constraints that span records, which a per-record schema cannot
 * see: a tag that exists on a post but not in the taxonomy, or a duplicate id.
 */
export function assertNoProblems(problems: readonly string[], context: string): void {
	if (problems.length > 0) {
		throw new Error(
			`${context} is internally inconsistent (${problems.length} problem${problems.length === 1 ? '' : 's'}):\n` +
				problems.slice(0, MAX_REPORTED_ISSUES).join('\n')
		);
	}
}

/** Reports every value that appears more than once, for id and slug checks. */
export function duplicates(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const repeated = new Set<string>();

	for (const value of values) {
		if (seen.has(value)) {
			repeated.add(value);
		}

		seen.add(value);
	}

	return [...repeated];
}

export function parseOrThrow<T>(schema: ZodType<T>, value: unknown, source: string): T {
	const result = schema.safeParse(value);

	if (result.success) {
		return result.data;
	}

	const { issues } = result.error;
	const summary = issues
		.slice(0, MAX_REPORTED_ISSUES)
		.map((issue) => {
			const path = issue.path.length > 0 ? `.${issue.path.join('.')}` : '';

			return `${source}${path}: ${issue.message}`;
		})
		.join('\n');

	const omitted = issues.length - Math.min(issues.length, MAX_REPORTED_ISSUES);

	throw new Error(
		`${source} does not match the schema (${issues.length} issue${issues.length === 1 ? '' : 's'}):\n` +
			summary +
			(omitted > 0 ? `\n…and ${omitted} more` : '')
	);
}
