/**
 * The provided mocks store plaintext passwords, and the brief says to compare
 * them as-is. Production would hash with argon2id and compare the digests; the
 * only thing that would change here is what goes into this function, because the
 * comparison already happens server-side and never branches on the first
 * mismatching character.
 *
 * Written by hand rather than with `crypto.timingSafeEqual`, which is Node-only:
 * this runs on whichever runtime the login route ends up on.
 */
export function constantTimeEquals(a: string, b: string): boolean {
	const length = Math.max(a.length, b.length);

	// Length difference is folded into the accumulator instead of returning
	// early, so a wrong-length guess costs the same as a wrong-character one.
	let difference = a.length ^ b.length;

	for (let index = 0; index < length; index += 1) {
		// Out of range gives NaN, which `|| 0` turns into a value that still
		// participates in the comparison.
		difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
	}

	return difference === 0;
}
