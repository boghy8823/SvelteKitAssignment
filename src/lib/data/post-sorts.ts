/**
 * Shared by the search UI and the repository. It lives outside lib/server
 * because the client half of search needs the same list to build its control.
 */
export const postSorts = ['newest', 'oldest', 'title'] as const;

export type PostSort = (typeof postSorts)[number];
