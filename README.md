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

| Command               | What it does                         |
| --------------------- | ------------------------------------ |
| `pnpm dev`            | Vite dev server                      |
| `pnpm build`          | Production build for Vercel          |
| `pnpm build:node`     | Production build for `adapter-node`  |
| `pnpm preview`        | Serve the production build via Vite  |
| `pnpm preview:node`   | Serve the `adapter-node` build       |
| `pnpm check`          | `svelte-check`                       |
| `pnpm typecheck`      | `svelte-check` then `tsc --noEmit`   |
| `pnpm lint`           | Prettier check + ESLint              |
| `pnpm format`         | Prettier write                       |
| `pnpm test`           | Vitest, both projects                |
| `pnpm test:unit`      | Vitest node project, pure logic      |
| `pnpm test:component` | Vitest browser mode, Chromium        |
| `pnpm test:e2e`       | Playwright against `adapter-node`    |
| `pnpm lighthouse`     | Lighthouse CI against `adapter-node` |

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

### Theme resolution

`hooks.server.ts` reads the theme cookie and writes `data-theme` into the document during SSR, so the
first paint is already correct: no flash, no blocking inline script, and therefore no CSP concession.

Each token declares both themes in one `light-dark()` value, switched by `color-scheme`. A visitor
with no cookie gets `color-scheme: light dark` and lands on their OS preference; choosing a theme
pins it. Toggling works without JavaScript through a form POST to `/api/theme` that redirects back to
a validated local path, and with JavaScript it repaints immediately and persists in the background.

## Decisions

Non-obvious architectural choices are recorded in [`docs/adr/`](docs/adr/), so the reasoning is
reviewable without reading the diff:

- [0001 — Rendering strategy and runtime split per route](docs/adr/0001-rendering-and-runtime-boundaries.md)
- [0002 — Data layer, validation boundary, and mutation persistence](docs/adr/0002-data-layer-and-mutation-boundary.md)

## Quality gates

Pre-commit (Husky + lint-staged) formats and lints staged files, then runs `pnpm check`.

CI runs `lint`, `typecheck`, `test:unit`, `test:component`, both adapter builds, Playwright, and
Lighthouse CI on every push and pull request. Bundle-budget jobs join the same workflow when that
surface lands.

`pnpm test:e2e` and `pnpm lighthouse` serve the Node production build (`pnpm build:node`). Playwright
builds it on the first local run; Lighthouse expects `build/` to already exist. Set `AUTH_SECRET` for
a production preview — `.env.example` documents it. CI supplies its own.

Lighthouse uses the default mobile profile (Moto G Power, simulated Slow 4G) on `/en`,
`/en/blog/sub-second-lcp-on-a-content-site`, and `/en/dashboard/items`. Category scores must stay at
or above 95, with LCP under 2s and CLS under 0.1. INP is a field metric — a navigation-only gather
never produces it — so CI does not assert it; the 200ms budget is the interaction target the dashboard
edit is built around. The dashboard ships `noindex, follow`, so that URL waives the crawlable SEO
category and still asserts title, description, lang, hreflang, and canonical.

Visual snapshots for the login page are recorded on Linux CI, where font rasterisation matches the
runner. A missing snapshot fails the Playwright job; copy it from the `playwright-report` artifact
into `tests/e2e/` and commit it. Local Lighthouse needs a Chrome that is not already listening on a
remote-debugging port — CI installs its own.

Component tests run in real Chromium rather than jsdom. The behaviour worth testing on a dialog is
focus order, Escape, and whether the background is genuinely inert — precisely what jsdom only
approximates, so testing it there would pass without proving anything.

Demo credentials live in `mocks/README.md`.
