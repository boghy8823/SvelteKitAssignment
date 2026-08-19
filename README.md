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

## Design tokens

`src/app.css` holds three layers: a primitive palette (`--pal-*`) that components never touch, a
semantic layer (`--surface`, `--fg-muted`, `--accent-fg`, …) that they do, and an `@theme inline`
block exposing the semantic layer to Tailwind so `bg-surface` and `text-fg-muted` are real
utilities. Dark mode re-points the semantic layer under `[data-theme='dark']`, so every component
carries one class list instead of a parallel set of `dark:` variants.

The brief asks for tokens in `tailwind.config`. Tailwind 4 removed that file, and `@theme` with CSS
variables serves the same intent — tokens in one place, themable at runtime — so that is what this
uses.

Contrast is part of the token definition rather than a later audit: `tests/unit/token-contrast.test.ts`
resolves every semantic pair in both themes and fails below WCAG AA (4.5:1 for text, 3:1 for control
boundaries and focus rings).

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
