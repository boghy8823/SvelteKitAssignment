import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';

/*
 * Signing for anything this app puts in a cookie. Two things live in one:
 * the session, and the budget-edit overlay. Both need a payload the browser
 * cannot alter and neither needs one it cannot read, so both are signed rather
 * than encrypted — the signature is what makes the contents trustworthy.
 *
 * HMAC-SHA256 through WebCrypto, so the identical code runs on Node and on the
 * edge. `node:crypto` would have pinned every consumer to one runtime for no
 * benefit.
 */

/**
 * Only used when nothing is configured, and only in dev. A deployment that
 * forgets the variable should fail loudly rather than sign with a value that is
 * published in this file.
 */
const DEV_SECRET = 'dev-only-session-secret-not-for-deployment';

function secret(): string {
	if (env.AUTH_SECRET) {
		return env.AUTH_SECRET;
	}

	if (!dev) {
		throw new Error('AUTH_SECRET is not set, so cookies cannot be signed');
	}

	return DEV_SECRET;
}

/*
 * The imported key is cached because deriving it is pure work over configuration
 * that cannot change between requests. This is the same argument that makes the
 * Intl formatter cache safe and a data cache unsafe: nothing here is per-request.
 */
let imported: Promise<CryptoKey> | undefined;

function key(): Promise<CryptoKey> {
	imported ??= crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret()),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign', 'verify']
	);

	return imported;
}

export function encodeBase64Url(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	// base64url, so the value survives a cookie without being percent-encoded.
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** `Uint8Array<ArrayBuffer>` rather than the default `ArrayBufferLike`, which
 * WebCrypto's `BufferSource` does not accept. */
export function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const padded = value
		.replaceAll('-', '+')
		.replaceAll('_', '/')
		.padEnd(Math.ceil(value.length / 4) * 4, '=');

	const binary = atob(padded);
	const bytes = new Uint8Array(binary.length);

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

/** `<base64url payload>.<base64url signature>`. */
export async function sign(payload: string): Promise<string> {
	const encoded = encodeBase64Url(new TextEncoder().encode(payload));
	const signature = await crypto.subtle.sign(
		'HMAC',
		await key(),
		new TextEncoder().encode(encoded)
	);

	return `${encoded}.${encodeBase64Url(new Uint8Array(signature))}`;
}

/**
 * The payload if the signature is ours, and `null` for everything else —
 * missing, truncated, re-signed, or hand-edited. A caller that has to
 * distinguish between kinds of invalid will eventually get it wrong.
 */
export async function verify(token: string | undefined): Promise<string | null> {
	if (!token) {
		return null;
	}

	const parts = token.split('.');

	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		return null;
	}

	const [payload, signature] = parts;

	try {
		// `subtle.verify` compares in constant time, which is the reason to verify
		// rather than to re-sign and compare the strings ourselves.
		const authentic = await crypto.subtle.verify(
			'HMAC',
			await key(),
			decodeBase64Url(signature),
			new TextEncoder().encode(payload)
		);

		return authentic ? new TextDecoder().decode(decodeBase64Url(payload)) : null;
	} catch {
		// Malformed base64. Indistinguishable from a forgery to a caller, and it
		// should be.
		return null;
	}
}
