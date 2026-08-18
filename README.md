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

| Command | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server |
| `pnpm build` | Production build |
| `pnpm preview` | Serve the production build |
| `pnpm check` | `svelte-check` + TypeScript |

Lint, tests, adapters, and CI land in later commits. Demo credentials live in `mocks/README.md`.
