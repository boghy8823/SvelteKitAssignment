/**
 * Guards redirect targets that arrive from a request. Anything a browser could
 * read as an absolute URL has to be rejected, or the redirect becomes an open
 * redirect: `//evil.com` and `/\evil.com` are both protocol-relative in
 * practice, and control characters are stripped by browsers before parsing,
 * which turns `/\tevil.com` into another way in.
 */
export function isLocalPath(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.startsWith('/') &&
		!value.startsWith('//') &&
		!value.startsWith('/\\') &&
		// eslint-disable-next-line no-control-regex -- the point is to reject control characters
		!/[\u0000-\u001f\u007f\s]/.test(value)
	);
}

export function safeLocalPath(value: unknown, fallback: string): string {
	return isLocalPath(value) ? value : fallback;
}
