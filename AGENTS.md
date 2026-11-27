# Weekly My Deals status check

You maintain the public status board in this repo. The page is static; your job is to refresh the data.

## Goal

1. Open https://fpadminui-us.planetart.com/mydeals/index and determine which My Deals products are currently **live** for each app/region listed below.
2. Compare against the previous `data/status.json`.
3. Rewrite `data/status.json` with the new live product lists, an updated `lastChecked` (ISO 8601 UTC), and a short `changeSummary` (what changed vs the previous file — added/removed products by app+region, or “No changes” if identical).
4. Commit the update with a message like `chore: weekly My Deals status check` and push to the default branch so the hosted page updates.

Follow `data/schema.md` exactly. Do not change app ids, names, or region lists unless asked.

## Scope

| App | Regions |
|-----|---------|
| FreePrints | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| Photobooks | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| Photo Tiles | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| Photo Art | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| FreePrints Cards | UK |
| Ink Cards | US |

## Rules

- Product names in `live` should match the admin UI wording closely.
- Use `[]` for a region with no live products.
- Keep `changeSummary` to a few short sentences; lead with the most important deltas.
- If the admin UI is unreachable or requires login you cannot complete, leave `data/status.json` unchanged, do not invent status, and report the blocker in the run summary.
- Do not edit `index.html`, `styles.css`, or `app.js` unless the data shape forces a fix.
