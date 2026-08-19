# 2. Data layer, validation boundary, and mutation persistence

Status: Accepted

## Context

The dataset ships as JSON in `mocks/`: 20 posts with `en`/`de` translations, 220 dashboard rows, 3
accounts, a tag taxonomy, two dictionaries, and an informal `schemas.json`. The instructions are to
treat `items.json` as if it were a paginated, filterable, sortable API and to implement those
operations on the server.

The interesting question is not how to read a JSON file. It is where the boundary sits, because that
boundary is the only place that can hold input validation, injected latency, deterministic failures,
and authorization — and it has to survive being swapped for a database without anything above it
changing.

## Decision

**Zod schemas are the single source of truth.** `mocks/schemas.json` is translated into Zod and every
type is derived with `z.infer`. No response shape is written by hand, and the login schema is imported
by both the form component and the form action so client and server cannot disagree.

**The mocks stay byte-identical.** They are reachable only from `src/lib/server/` through a `$mocks`
alias, enforced by an ESLint `no-restricted-imports` rule. "I did not modify your data" is then
provable from the diff rather than asserted in a README. The same rule set stops features importing
each other and stops `lib/ui` importing `lib/features`.

**Each file is parsed once at module init, not per request.** Re-validating 220 rows on every request
is CPU spent to learn something already known. Parsing at init means malformed data fails the build
instead of a user's request, with the Zod issue path in the error.

**An in-process repository sits between routes and data**, one module per entity, exposing an async
API-shaped surface: `list`, `get`, `updateBudget`, `facets`. Filtering, sorting, and pagination are
implemented as they would be against SQL — stable sort with `id` as the tiebreaker, case-insensitive
substring match on names, `IN` semantics within a facet group, `AND` across groups. Facet counts are
computed against the query _minus_ the facet being counted, which is what faceted search actually
does and what stops the filter panel from lying about what a click will return.

**Mutations persist in a signed session-cookie overlay.** Serverless filesystems are read-only and
per-instance memory diverges between instances, so an in-memory write would make the live demo behave
differently on each request. The overlay holds `{ [itemId]: { budget, updatedAt } }`, capped at 20
entries with oldest-first eviction to stay under the 4 KB cookie limit, and is applied after filtering
but before sorting so an edited budget sorts where the user expects.

**`updatedAt` doubles as an ETag** for optimistic concurrency, which produces a real 409 that is
distinct from 403 and 422 without changing the shape of the provided data.

**Failure is injectable and deterministic.** A signed test-cookie directive, honoured only when
`ENABLE_TEST_HOOKS` is set, adds latency and forces per-operation failures, so the streaming skeleton
and the partial-failure state can be demonstrated rather than described. End-to-end rollback is driven
by Playwright request interception instead, keeping the mechanism out of production paths.

Errors are distinguished at the boundary, because they recover differently:

| Condition                    | Status         | Rendering                                                    |
| ---------------------------- | -------------- | ------------------------------------------------------------ |
| Input fails validation       | 422            | Inline field error, value retained, focus moved to the field |
| Not signed in                | 401 → redirect | Redirect to login with a validated local `redirectTo`        |
| Signed in without permission | 403            | Row stays read-only with an explanation, no rollback flicker |
| `updatedAt` is stale         | 409            | Both values shown, with reload or overwrite offered          |
| Repository failure           | 500            | Optimistic value rolled back, toast with retry               |
| Facets fail but rows succeed | 200 partial    | Table renders, filter panel degrades visibly                 |

## Consequences

- Edits are scoped to one reviewer's session and capped at 20 rows. This is stated in the README as a
  limitation rather than hidden: swapping the repository's write path for a database is a one-file
  change, and nothing above that seam moves.
- Every server module must avoid module-level mutable state, since it would be shared across
  concurrent requests and leak one user's data into another's response. Per-request singletons go
  through context instead.
- Parsing at boot means a malformed mock breaks deploys. That is the intent.
- Streamed promises must resolve to `{ ok: true, data } | { ok: false, error }` rather than reject. An
  unhandled rejection in a streamed response kills the response, and a result type is also what makes
  the partial-failure state designable instead of accidental.

## Alternatives rejected

- **Importing JSON directly in load functions.** Fewer files, but then there is nowhere to put
  validation, authorization, latency, or failure injection, and every route owns its own filtering.
- **Validating per request.** Costs CPU on every request to discover a fact that is fixed at build
  time, and turns a deploy-time failure into a runtime one.
- **Writing to disk or to module memory.** Both look fine locally and misbehave in production: the
  filesystem is read-only and memory is per-instance.
- **A real database.** Correct for production and wrong for a reviewable take-home, where a second
  service is setup cost for the reader and proves nothing the repository seam does not already show.
- **OpenAPI with codegen.** Justifiable when a separate backend owns the contract. Here the contract
  is `schemas.json`, and Zod validates at runtime as well as typing at compile time.
