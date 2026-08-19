import { UserSchema, type User } from '$lib/data/schemas';
import rawUsers from '$mocks/users.json';

import { assertNoProblems, duplicates, parseOrThrow } from '../parse';

export const users: readonly User[] = Object.freeze(
	parseOrThrow(UserSchema.array(), rawUsers, 'users.json')
);

assertNoProblems(
	duplicates(users.map((user) => user.email)).map(
		// Login looks users up by email, so a duplicate would make which account
		// you get depend on array order.
		(email) => `user email "${email}" is not unique`
	),
	'users.json'
);
