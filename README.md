# My Deals Status

Simple visual reference for which **My Deals** products are live — listed by product, with the apps and regions where each is active.

## Live site

https://lauras-pa.github.io/my-deals-status/

## View locally

```bash
npx --yes serve .
```

Open the URL shown in the terminal (usually `http://localhost:3000`).

## Data

- Live status: [`data/status.json`](data/status.json)
- Shape / rules: [`data/schema.md`](data/schema.md)

The page reads the derived `products` directory (product → app/region placements). The check script still scrapes per app/region into `apps`, then builds `products` from that.

## Weekly refresh (self-hosted)

A GitHub Actions workflow runs **Mondays at 11:00 Pacific** on a **self-hosted runner** (VPN / corp network), checks the [My Deals admin](https://fpadminui-us.planetart.com/mydeals/index) API, updates `data/status.json` (product directory plus enable/disable notes), and pushes the commit.

Setup guide: [`docs/self-hosted-runner.md`](docs/self-hosted-runner.md)

```bash
npm ci
npx playwright install chromium
npm run login    # once, on the runner machine
npm run check    # manual refresh
```

## Apps & regions

| App | Regions |
|-----|---------|
| FreePrints | US, UK, IE, FR, IT, ES, DE, AT, NL, BE, CA |
| Photobooks | US, UK, IE, FR, IT, ES, DE, AT, NL, BE, CA |
| Photo Tiles | US, UK, IE, FR, IT, ES, DE, AT, NL, BE |
| Photo Art | US, UK, IE, FR, IT, ES, DE, AT, NL, BE |
| FreePrints Cards | UK |
| Ink Cards | US |
