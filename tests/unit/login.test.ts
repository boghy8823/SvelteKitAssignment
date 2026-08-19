import { describe, expect, it } from 'vitest';

import { loginErrors } from '../../src/lib/data/login';

describe('loginErrors', () => {
	it('accepts a well-formed credential pair', () => {
		expect(loginErrors({ email: 'editor@demo.test', password: 'demo1234' })).toBeNull();
	});

	it('names the field that is wrong, as a message key rather than a sentence', () => {
		// A schema shared by the client and the server cannot know the reader's
		// language, so it returns keys and each half translates them.
		expect(loginErrors({ email: 'not-an-email', password: 'demo1234' })).toEqual({
			email: 'login.error.email'
		});
	});

	it('reports both fields at once, so the form is not a guessing game', () => {
		expect(loginErrors({ email: '', password: '' })).toEqual({
			email: 'login.error.email',
			password: 'login.error.password'
		});
	});

	it('rejects a password shorter than any real one', () => {
		expect(loginErrors({ email: 'editor@demo.test', password: 'short' })).toEqual({
			password: 'login.error.password'
		});
	});

	it.each([
		['nothing at all', undefined],
		['an empty body', {}],
		['a string instead of an object', 'email=x'],
		['null fields, which is what a missing input sends', { email: null, password: null }],
		['numbers', { email: 1, password: 2 }],
		[
			'an extra field a crafted body could add',
			{
				email: 'editor@demo.test',
				password: 'demo1234',
				role: 'admin'
			}
		]
	])('fails closed for %s', (_case, input) => {
		expect(loginErrors(input)).not.toBeNull();
	});

	it('never echoes the submitted password back in the error', () => {
		expect(JSON.stringify(loginErrors({ email: 'x', password: 'hunter2' }))).not.toContain(
			'hunter2'
		);
	});
});
