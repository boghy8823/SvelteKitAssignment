# Mock data

These JSON files are provided so you can focus on the frontend instead of sourcing or generating data. Use them as a static import, drop them behind a tiny in-process mock API, or load them at build time — your call.

Everything is deterministic (seeded). Re-running `python3 _generate.py` produces the same output.

## Files

| File | What it is | Rows |
| --- | --- | --- |
| `posts.json` | Blog posts with `translations.{en,de}` | 20 |
| `items.json` | Dashboard rows (campaigns) | 220 |
| `users.json` | Demo login accounts | 3 |
| `tags.json` | Tag taxonomy with localized labels | 8 |
| `i18n.en.json` / `i18n.de.json` | UI string dictionaries | — |
| `schemas.json` | Informal shape reference for each entity | — |
| `_generate.py` | The generator. Edit + re-run if you want more rows. | — |

## Demo credentials

All three accounts use the password `demo1234`:

- `admin@demo.test` — full access
- `editor@demo.test` — can edit dashboard rows
- `viewer@demo.test` — read-only (use this to test authorization boundaries)

## How we expect you to use them

- Define **Zod schemas** that match `schemas.json` and parse the JSON on load. The data is yours to validate; we want to see the validation layer.
- Treat `items.json` as if it were a paginated, filterable, sortable API — implement those operations server-side in your `load` functions even though the source is a flat file. We will read that code.
- The `password` field in `users.json` is plaintext for demo convenience only. Your auth flow should still verify it server-side and set a real cookie/session — no client-side "if password === ..." checks.
- i18n keys use dot-notation. Strings with `{placeholders}` are interpolation slots, not literal text.

## What you may change

- Add fields if your design needs them — note it in the README.
- Translate additional strings if you pick a different second locale.
- Regenerate with more rows if you want to stress-test pagination.

## What you may not change

- The shape of `users.json` (we use it to test login).
- The `id` and `slug` fields on `posts.json` (we link to specific posts during review).
