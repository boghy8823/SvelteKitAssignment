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

| Command          | What it does                       |
| ---------------- | ---------------------------------- |
| `pnpm dev`       | Vite dev server                    |
| `pnpm build`     | Production build                   |
| `pnpm preview`   | Serve the production build         |
| `pnpm check`     | `svelte-check`                     |
| `pnpm typecheck` | `svelte-check` then `tsc --noEmit` |
| `pnpm lint`      | Prettier check + ESLint            |
| `pnpm format`    | Prettier write                     |
| `pnpm test:unit` | Vitest, unit project               |

## Quality gates

Pre-commit (Husky + lint-staged) formats and lints staged files, then runs `pnpm check`.

CI runs `lint`, `typecheck`, and `test:unit` as parallel jobs on every push and pull request.
Build, end-to-end, accessibility, Lighthouse, and bundle-budget jobs join the same workflow as
those surfaces land.

Demo credentials live in `mocks/README.md`.
