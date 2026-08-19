import { describe, expect, it } from 'vitest';

import type { Account } from '../../src/lib/data/account';
import { constantTimeEquals } from '../../src/lib/server/auth/password';
import {
	createSession,
	needsRefresh,
	SESSION_MAX_AGE,
	signSession,
	verifySession,
	type Session
} from '../../src/lib/server/auth/session';

const account: Account = {
	id: 'demo_editor',
	email: 'editor@demo.test',
	name: 'Demo Editor',
	role: 'editor'
};

const NOW = Date.UTC(2026, 7, 19, 12, 0, 0);

describe('createSession', () => {
	it('carries the subject and role, and nothing else', () => {
		expect(Object.keys(createSession(account, NOW)).sort()).toEqual(['exp', 'role', 'sub']);
	});

	it('never puts a password or an email in the cookie', () => {
		expect(JSON.stringify(createSession(account, NOW))).not.toMatch(/demo1234|@demo\.test/);
	});

	it('expires seven days out, in whole seconds', () => {
		const session = createSession(account, NOW);

		expect(session.exp).toBe(Math.floor(NOW / 1000) + SESSION_MAX_AGE);
		expect(Number.isInteger(session.exp)).toBe(true);
	});
});

describe('signSession and verifySession', () => {
	it('round-trips a session it signed', async () => {
		const session = createSession(account, NOW);

		await expect(verifySession(await signSession(session), NOW)).resolves.toEqual(session);
	});

	it('rejects a payload edited to elevate the role', async () => {
		const token = await signSession(createSession(account, NOW));
		const [, signature] = token.split('.');
		const forged = btoa(JSON.stringify({ ...createSession(account, NOW), role: 'admin' }))
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replace(/=+$/, '');

		await expect(verifySession(`${forged}.${signature}`, NOW)).resolves.toBeNull();
	});

	it('rejects a flipped bit in the signature', async () => {
		const token = await signSession(createSession(account, NOW));
		const [payload, signature] = token.split('.');
		const tampered = `${signature.slice(0, -1)}${signature.at(-1) === 'A' ? 'B' : 'A'}`;

		await expect(verifySession(`${payload}.${tampered}`, NOW)).resolves.toBeNull();
	});

	it('rejects an expired session even though the signature is valid', async () => {
		const token = await signSession(createSession(account, NOW));
		const afterExpiry = NOW + (SESSION_MAX_AGE + 1) * 1000;

		await expect(verifySession(token, afterExpiry)).resolves.toBeNull();
	});

	it('rejects the moment it expires, not a second later', async () => {
		const token = await signSession(createSession(account, NOW));

		await expect(verifySession(token, NOW + SESSION_MAX_AGE * 1000)).resolves.toBeNull();
	});

	it('rejects a payload it signed itself once the shape stops matching', async () => {
		// Genuinely signed, so the signature passes and only the schema can catch it.
		// The cast is the point of the test: this is the payload a future version of
		// the code might have written, arriving at an older reader.
		const alien = { sub: 'demo_editor', role: 'root', exp: 9999999999 } as unknown as Session;

		await expect(verifySession(await signSession(alien), NOW)).resolves.toBeNull();
	});

	it.each([
		['nothing', undefined],
		['an empty string', ''],
		['no separator', 'notatoken'],
		['an empty payload', '.signature'],
		['an empty signature', 'payload.'],
		['three parts', 'a.b.c'],
		['non-base64 garbage', '@@@.###']
	])('returns null for %s', async (_case, token) => {
		await expect(verifySession(token, NOW)).resolves.toBeNull();
	});
});

describe('needsRefresh', () => {
	it('leaves a fresh session alone', () => {
		expect(needsRefresh(createSession(account, NOW), NOW)).toBe(false);
	});

	it('refreshes once past the halfway mark, so an active session never expires under you', () => {
		const session = createSession(account, NOW);
		const halfway = NOW + (SESSION_MAX_AGE / 2 + 1) * 1000;

		expect(needsRefresh(session, halfway)).toBe(true);
	});
});

describe('constantTimeEquals', () => {
	it('matches identical strings', () => {
		expect(constantTimeEquals('demo1234', 'demo1234')).toBe(true);
	});

	it.each([
		['a different character', 'demo1234', 'demo1235'],
		['a shorter guess', 'demo1234', 'demo123'],
		['a longer guess', 'demo1234', 'demo12345'],
		['an empty guess', 'demo1234', ''],
		['a prefix of the real value', 'demo1234', 'd']
	])('rejects %s', (_case, real, guess) => {
		expect(constantTimeEquals(real, guess)).toBe(false);
	});

	it('treats two empty strings as equal, since that is what they are', () => {
		expect(constantTimeEquals('', '')).toBe(true);
	});
});
