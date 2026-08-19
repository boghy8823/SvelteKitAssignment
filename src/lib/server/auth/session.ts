import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { UserRoleSchema } from '$lib/data/schemas';
import type { Account } from '$lib/data/account';
import type { Cookies } from '@sveltejs/kit';
import { z } from 'zod';

/*
 * Sessions are a signed cookie rather than a server-side store, because there is
 * no database in this app and a stateless token needs neither. HMAC-SHA256 via
 * WebCrypto so the identical code runs on Node and on the edge — `node:crypto`
 * would have pinned auth to one runtime for no benefit.
 *
 * The cookie carries a subject, a role, and an expiry. It is not encrypted, and
 * it does not need to be: nothing in it is a secret, and the signature is what
 * stops it from being edited. A role in a tamper-proof cookie is still checked
 * against the account on every request, so a revoked user cannot ride an old one.
 */

export const SESSION_COOKIE = 'session';

/** Seven days, per the plan. Long enough to be convenient, short enough that a
 * forgotten session on a shared machine expires on its own. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Re-issued once past the halfway mark, so an active session never expires
 * under someone mid-task while an idle one still ages out. */
const REFRESH_AFTER = SESSION_MAX_AGE / 2;

const SessionSchema = z.strictObject({
	sub: z.string().min(1),
	role: UserRoleSchema,
	/** Unix seconds, matching `exp` as every token format spells it. */
	exp: z.int().positive()
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Only used when nothing is configured, and only in dev. A deployment that
 * forgets to set the variable should fail loudly rather than sign sessions with
 * a value that is published in this file.
 */
const DEV_SECRET = 'dev-only-session-secret-not-for-deployment';

function secret(): string {
	if (env.AUTH_SECRET) {
		return env.AUTH_SECRET;
	}

	if (!dev) {
		throw new Error('AUTH_SECRET is not set, so sessions cannot be signed');
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

function encode(bytes: Uint8Array): string {
	let binary = '';

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	// base64url, so the value survives a cookie without being percent-encoded.
	return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** `Uint8Array<ArrayBuffer>` rather than the default `ArrayBufferLike`, which
 * WebCrypto's `BufferSource` does not accept. */
function decode(value: string): Uint8Array<ArrayBuffer> {
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

export function createSession(account: Account, now = Date.now()): Session {
	return {
		sub: account.id,
		role: account.role,
		exp: Math.floor(now / 1000) + SESSION_MAX_AGE
	};
}

export async function signSession(session: Session): Promise<string> {
	const payload = encode(new TextEncoder().encode(JSON.stringify(session)));
	const signature = await crypto.subtle.sign(
		'HMAC',
		await key(),
		new TextEncoder().encode(payload)
	);

	return `${payload}.${encode(new Uint8Array(signature))}`;
}

/**
 * Returns the session only if the signature is ours, the payload still matches
 * the schema, and the expiry is in the future. Every other input — missing,
 * truncated, re-signed, hand-edited, or simply old — is `null`, because a caller
 * that has to distinguish between kinds of invalid will eventually get it wrong.
 */
export async function verifySession(
	token: string | undefined,
	now = Date.now()
): Promise<Session | null> {
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
			decode(signature),
			new TextEncoder().encode(payload)
		);

		if (!authentic) {
			return null;
		}

		// The signature proves we wrote it. The schema proves it is still the shape
		// this version of the code understands, which is what makes changing the
		// payload a safe deploy rather than a runtime surprise.
		const session = SessionSchema.safeParse(JSON.parse(new TextDecoder().decode(decode(payload))));

		if (!session.success || session.data.exp * 1000 <= now) {
			return null;
		}

		return session.data;
	} catch {
		// Malformed base64 or JSON. Indistinguishable from a forgery to a caller,
		// and it should be.
		return null;
	}
}

export function needsRefresh(session: Session, now = Date.now()): boolean {
	return session.exp - Math.floor(now / 1000) < REFRESH_AFTER;
}

/*
 * `secure` is deliberately left to SvelteKit, which sets it for https and omits
 * it for http. Hard-coding it would make the cookie vanish on the http preview
 * server that Playwright and Lighthouse drive.
 */
const options = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax'
} as const;

export async function issueSession(cookies: Cookies, account: Account): Promise<void> {
	cookies.set(SESSION_COOKIE, await signSession(createSession(account)), {
		...options,
		maxAge: SESSION_MAX_AGE
	});
}

export function clearSession(cookies: Cookies): void {
	cookies.delete(SESSION_COOKIE, options);
}
