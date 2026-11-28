# Status data shape

`data/status.json` is the single source of truth for the status page.

## Fields

- `lastChecked` — ISO 8601 timestamp of the latest agent check, or `null` before the first run.
- `products` — derived A–Z directory of live products. Each entry is one product name with the apps/regions where it is live.
- `apps` — ordered list of apps (scrape source + enable/disable diffs). Prefer `products` for display.

### Each product

- `name` — display title (English).
- `placements` — apps where the product is live, each with:
  - `appId` / `appName`
  - `regions` — region codes in canonical order (US → UK → IE → FR → IT → ES → DE → AT → NL → BE → CA)

### Each app

- `id` — stable kebab-case id (do not rename).
- `name` — display name.
- `regions` — regions that apply to this app (fixed; do not add/remove without an explicit request).
- `live` — object keyed by region code. Each value is an **array of product name strings** that are currently live in My Deals for that app/region. Use `[]` when the region has no live products. Order is not meaningful for the site.
- `changeSummary` — short plain-language summary of **notable** presence changes for this app since the previous check:
  - **enabled** — product newly live
  - **disabled** — product no longer live
  - On the first run: baseline message. If nothing notable: `No notable changes.`
  - Sort order is **not** tracked.

### Example `products` entry

```json
{
  "name": "CUSTOM PHOTO CALENDAR",
  "placements": [
    { "appId": "freeprints", "appName": "FreePrints", "regions": ["US", "UK", "IE"] },
    { "appId": "photobooks", "appName": "Photobooks", "regions": ["US", "UK"] }
  ]
}
```

## Apps and regions (canonical)

| App | Regions (display order) |
|-----|---------|
| FreePrints | US, UK, IE, FR, IT, ES, DE, AT, NL, BE, CA |
| Photobooks | US, UK, IE, FR, IT, ES, DE, AT, NL, BE, CA |
| Photo Tiles | US, UK, IE, FR, IT, ES, DE, AT, NL, BE |
| Photo Art | US, UK, IE, FR, IT, ES, DE, AT, NL, BE |
| FreePrints Cards | UK |
| Ink Cards | US |

## Source of truth for live status

- US / CA: https://fpadminui-us.planetart.com/mydeals/index (`admin-fp`)
- UK / EU regions: https://fpadminui-eu.planetart.com/mydeals/index (`admin-fpeu`)

Products with **failed** or **deactivated** status are omitted.

US/CA use English catalogs. EU countries only expose local language codes in admin; live sets are read locally then titled with IE/UK English equivalents by product id. Internal codes like `fg_gift_monthly`, `PC MyDeals…` rows, and bare app names (e.g. `PHOTO TILES`, `PREMIUM WALL ART`, `PHOTO GREETING CARD`) are omitted. Cross-app promos are omitted (e.g. Hardcover Photo Book outside Photobooks, Photo Tiles outside that app). Poster products are omitted except in CA.
