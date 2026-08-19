# SvelteKit take-home

Senior frontend take-home: a production-shaped marketing site, blog, search, and authenticated dashboard. Built with SvelteKit, TypeScript, and Tailwind.

## Prerequisites

- **Node.js 24.19.x** (Active LTS). Pinned in `.nvmrc` / `.node-version`.
- **pnpm 11.22.x**. Corepack reads the `packageManager` field and installs it.

```sh
corepack enable
pnpm install
pnpm dev
```

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `pnpm dev`          | Vite dev server                     |
| `pnpm build`        | Production build for Vercel         |
| `pnpm build:node`   | Production build for `adapter-node` |
| `pnpm preview`      | Serve the production build via Vite |
| `pnpm preview:node` | Serve the `adapter-node` build      |
| `pnpm check`        | `svelte-check`                      |
| `pnpm typecheck`    | `svelte-check` then `tsc --noEmit`  |
| `pnpm lint`         | Prettier check + ESLint             |
| `pnpm format`       | Prettier write                      |
| `pnpm test:unit`    | Vitest, unit project                |

## Deploy targets

Vercel is the deploy target, because it is the only one that gives a per-route runtime split and
real ISR in a single deployment. `BUILD_ADAPTER=node` switches the build to `adapter-node`, which
is what CI, Lighthouse, and any container host use: a deterministic production build that needs no
Vercel credentials. Unknown values fail the build rather than falling back silently.

On Windows the Vercel build needs symlink privileges, so use `pnpm build:node` locally unless
Developer Mode is on. CI builds both targets on every push.

## Decisions

Non-obvious architectural choices are recorded in [`docs/adr/`](docs/adr/), so the reasoning is
reviewable without reading the diff:

- [0001 — Rendering strategy and runtime split per route](docs/adr/0001-rendering-and-runtime-boundaries.md)
- [0002 — Data layer, validation boundary, and mutation persistence](docs/adr/0002-data-layer-and-mutation-boundary.md)

## Quality gates

Pre-commit (Husky + lint-staged) formats and lints staged files, then runs `pnpm check`.

CI runs `lint`, `typecheck`, `test:unit`, and both adapter builds as parallel jobs on every push and
pull request. End-to-end, accessibility, Lighthouse, and bundle-budget jobs join the same workflow as
those surfaces land.

Demo credentials live in `mocks/README.md`.
