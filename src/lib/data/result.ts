/*
 * A result type, used in two places that both need failure to be a value rather
 * than an exception.
 *
 * Streamed loads: a promise returned from `load` that rejects tears down the
 * whole response, and there is no component boundary that can catch it. Resolving
 * to a result makes the failure something the template renders, which is also how
 * the partial-failure state stops being an afterthought.
 *
 * Mutations: an action distinguishes "forbidden", "conflict", and "broken", and
 * the caller has to handle each differently. Throwing would collapse them into
 * one catch block that has to re-derive what happened.
 */

export interface Ok<T> {
	ok: true;
	data: T;
}

export interface Err<E> {
	ok: false;
	error: E;
}

export type Result<T, E> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
	return { ok: true, data };
}

export function err<E>(error: E): Err<E> {
	return { ok: false, error };
}
