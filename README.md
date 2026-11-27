# My Deals Status

Simple visual reference for which **My Deals** products are live in each app and region.

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

## Weekly refresh (self-hosted)

A GitHub Actions workflow runs **Mondays at 11:00 Pacific** on a **self-hosted runner** (VPN / corp network), checks the [My Deals admin](https://fpadminui-us.planetart.com/mydeals/index) API, updates `data/status.json` (including a short change summary), and pushes the commit.

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
| FreePrints | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| Photobooks | same |
| Photo Tiles | same |
| Photo Art | same |
| FreePrints Cards | UK |
| Ink Cards | US |
