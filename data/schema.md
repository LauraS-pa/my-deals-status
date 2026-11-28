# Status data shape

`data/status.json` is the single source of truth for the status page.

## Fields

- `lastChecked` — ISO 8601 timestamp of the latest agent check, or `null` before the first run.
- `apps` — ordered list of apps to display.

### Each app

- `id` — stable kebab-case id (do not rename).
- `name` — display name.
- `regions` — regions that apply to this app (fixed; do not add/remove without an explicit request).
- `live` — object keyed by region code. Each value is an **array of product name strings** that are currently live in My Deals for that app/region (admin sort order). Use `[]` when the region has no live products.
- `changeSummary` — short plain-language summary of **notable** changes for this app since the previous check:
  - **enabled** — product newly live
  - **disabled** — product no longer live
  - **sort order changed** — same products, different order
  - On the first run: baseline message. If nothing notable: `No notable changes.`

### Example `live` entry

```json
"live": {
  "US": ["10 Free Prints", "Buy 1 Get 1 Free Photobooks"],
  "CA": [],
  "FR": ["10 Free Prints"]
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

Products with **failed** or **deactivated** status are omitted. Lists keep admin order (shown numbered on the site).

US/CA use English catalogs. EU countries only expose local language codes in admin; live sets are read locally then titled with IE/UK English equivalents by product id. Internal codes like `fg_gift_monthly`, `PC MyDeals…` rows, and bare app names (e.g. `PHOTO TILES`, `PREMIUM WALL ART`, `PHOTO GREETING CARD`) are omitted. Cross-app promos are omitted (e.g. Hardcover Photo Book outside Photobooks, Photo Tiles outside that app). Poster products are omitted except in CA.
