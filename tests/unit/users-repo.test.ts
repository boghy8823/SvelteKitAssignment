import { describe, expect, it } from 'vitest';

import { canEdit } from '../../src/lib/data/account';
import { authenticate, byId } from '../../src/lib/server/data/users.repo';

describe('users.repo.authenticate', () => {
	it('accepts a demo account with its documented password', async () => {
		await expect(authenticate('editor@demo.test', 'demo1234')).resolves.toMatchObject({
			id: 'demo_editor',
			role: 'editor'
		});
	});

	it('never returns the password, so no caller can leak it', async () => {
		const account = await authenticate('admin@demo.test', 'demo1234');

		expect(account).not.toBeNull();
		expect(Object.keys(account ?? {}).sort()).toEqual(['email', 'id', 'name', 'role']);
	});

	it('is case- and whitespace-insensitive about the address', async () => {
		await expect(authenticate('  ADMIN@Demo.test ', 'demo1234')).resolves.toMatchObject({
			id: 'demo_admin'
		});
	});

	it('is exact about the password', async () => {
		await expect(authenticate('admin@demo.test', 'Demo1234')).resolves.toBeNull();
		await expect(authenticate('admin@demo.test', 'demo1234 ')).resolves.toBeNull();
	});

	it('gives the same answer for a wrong password and an unknown address', async () => {
		// Not a timing assertion — that is not something a unit test can hold — but
		// the shape it depends on: one indistinguishable failure, never a hint about
		// which half was wrong.
		await expect(authenticate('nobody@demo.test', 'demo1234')).resolves.toBeNull();
		await expect(authenticate('admin@demo.test', 'wrong')).resolves.toBeNull();
	});
});

describe('users.repo.byId', () => {
	it('resolves the session subject back to an account', async () => {
		await expect(byId('demo_viewer')).resolves.toMatchObject({ role: 'viewer' });
	});

	it('returns null for a subject that no longer exists', async () => {
		await expect(byId('demo_ghost')).resolves.toBeNull();
	});
});

describe('canEdit', () => {
	it.each([
		['admin', true],
		['editor', true],
		['viewer', false]
	] as const)('%s may edit: %s', async (role, expected) => {
		const account = await byId(`demo_${role}`);

		expect(canEdit(account)).toBe(expected);
	});

	it('refuses anonymous, which is the case a hidden button would miss', () => {
		expect(canEdit(null)).toBe(false);
	});
});
