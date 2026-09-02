# 1. Rendering strategy and runtime split per route

Status: Accepted

## Context

Every route has to pick between prerendering, SSR, ISR, streamed SSR, and CSR, and then pick a
runtime. The choices interact: a route cannot be both prerendered and revalidated on demand, and a
route cannot be both prerendered and streamed. Picking per route only pays off if the reasoning is
uniform, so the split needs a rule rather than a list of preferences.

The rule used here: **edge takes work that is latency-sensitive, stateless, and data-light. Node
takes anything that does session cryptography, parses the dataset, or owns mutable state**, pinned
to one region so reads and writes stay consistent.

## Decision

Deploy to Vercel, which is the only target that offers a per-route runtime split and real ISR
inside a single deployment. Cloudflare would run everything on workerd, which would make "one route
on Node" a fiction rather than a boundary.

| Route                         | Rendering             | Runtime | Why                                                                                         |
| ----------------------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `/`                           | Redirect              | Edge    | Reads one header to negotiate locale, touches no data, sits on the first hop of every visit |
| `/[locale]`                   | Prerender             | Static  | Marketing copy changes on deploy, and LCP is graded here                                    |
| `/[locale]/blog`              | ISR, 60s              | Node    | Treated as CMS-backed, so new posts appear without a redeploy                               |
| `/[locale]/blog/[slug]`       | Prerender             | Static  | Fixed content set; the post body is the LCP element, so it must be static                   |
| `/[locale]/search`            | SSR, uncached         | Edge    | URL-driven, per-request, no session; `noindex, follow`                                      |
| `/[locale]/login`             | SSR + form action     | Node    | Signs the session cookie                                                                    |
| `/[locale]/dashboard`         | SSR, guarded          | Node    | Reads the session, redirects anonymous traffic                                              |
| `/[locale]/dashboard/items`   | SSR + streamed rows   | Node    | Owns mutable state; heading is LCP, so the 220-row table is not in the first HTML           |
| `/og/[locale]/[slug].png`     | Prerendered endpoint  | Static  | 40 fixed images; generating them per request would be a cold-start tax for nothing          |
| `/sitemap.xml`, `/robots.txt` | Prerendered endpoints | Static  | Generated from the same route table as `hreflang`, so the two cannot drift                  |
| `/api/beacon`                 | POST                  | Edge    | Fire-and-forget telemetry that should not compete with app compute                          |

Streaming is used only where the deferred payload is _not_ the LCP element. Dashboard rows qualify:
the heading is first paint, and empty skeleton cells cannot be LCP. Awaiting those rows into the
first HTML was tried and raised Slow 4G LCP from ~2.17s to ~2.34s — TTFB waited on 25 `BudgetCell`s,
and the names in that fat document became the element being measured. `?stream=off` still awaits, for
readers without JavaScript. Post bodies do not qualify for streaming at all, because the body is what
LCP measures.

The app stylesheet is inlined (`inlineStyleThreshold`) so a Slow 4G first visit does not spend an
extra RTT on render-blocking CSS before LCP. Repeat navigations lose a cached `.css` file; Lighthouse
and a cold load never had one.

`adapter-node` stays selectable through `BUILD_ADAPTER=node`. CI, Lighthouse, and local production
checks need a build that is deterministic and free of platform credentials, and `vite preview`
cannot reproduce Vercel's runtime split. Keeping both targets building also stops the adapter seam
from rotting unnoticed.

## Consequences

- Two locale-prefixed URLs exist for every page, so canonicals, `hreflang`, and sitemap entries are
  generated mechanically instead of conditionally.
- A param matcher on `[locale]` is mandatory. Without it `/blog` resolves as `locale=blog`.
- Lighthouse gates the Node build, which approximates rather than reproduces the deployed split.
  Auditing the real Vercel deployment belongs in a separate, non-blocking job.
- Prerendered OG images mean a new post needs a deploy to get an image. Acceptable while the content
  set is fixed and titles are not user-generated.

## Vercel's edge runtime is deprecated

Worth stating plainly, because it dates this record: Vercel has deprecated Edge Functions in favour
of Node on Fluid compute, `adapter-vercel` marks its `runtime` option deprecated, and SvelteKit 3
removes `runtime: 'edge'` altogether. The requirement to run a route on an edge runtime is therefore
met on a surface the platform is winding down.

The split above is kept because the reasoning is what matters and it transfers: on Fluid compute the
same routes would keep the same shape, with `regions` and warm-instance behaviour replacing the
edge/Node distinction. Were this a real deployment being built today, `/` and `/api/beacon` would run
on Node in every region rather than on Edge Functions, and nothing else about the table would change.

## Alternatives rejected

- **Cloudflare Workers.** One runtime everywhere. Cheaper cold starts, but the Node boundary becomes
  a label rather than a decision, and ISR would have to be hand-rolled on KV.
- **Everything SSR on Node.** Simpler to explain, but it gives up guaranteed-static LCP on the two
  routes where LCP is measured.
- **Putting a data route on the edge.** Would demonstrate edge deployment while making it worse:
  the dataset would be parsed in every region with no cache to show for it.
- **Infinite scroll or cursor pagination on the blog and dashboard.** Page-based paging stays
  crawlable, deep-linkable, and correct under the back button; cursors solve a scale problem that
  220 rows do not have.
