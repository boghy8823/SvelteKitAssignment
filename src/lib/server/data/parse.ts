import type { ZodType } from 'zod';

/** Issues reported before the message is truncated, so one bad row is readable
 * and a systematically wrong file does not print 220 lines. */
const MAX_REPORTED_ISSUES = 5;

/**
 * Parses provided data at module init and throws a message that names the
 * offending path. "items.json is invalid" sends someone hunting through 220
 * rows; "items.json.87.ctr: Too big" does not.
 */
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
