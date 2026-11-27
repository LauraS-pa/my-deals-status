# My Deals Status

Simple visual reference for which **My Deals** products are live in each app and region.

## View locally

From this folder:

```bash
npx --yes serve .
```

Then open the URL shown in the terminal (usually `http://localhost:3000`).

## Data

- Live status: [`data/status.json`](data/status.json)
- Shape / rules: [`data/schema.md`](data/schema.md)

A weekly Cursor Automation checks [My Deals admin](https://fpadminui-us.planetart.com/mydeals/index), updates `data/status.json` (including a short change summary), and commits the result so this page stays current.

## Apps & regions

| App | Regions |
|-----|---------|
| FreePrints | US, CA, FR, IT, IE, ES, NL, DE, AT, BE |
| Photobooks | same |
| Photo Tiles | same |
| Photo Art | same |
| FreePrints Cards | UK |
| Ink Cards | US |
