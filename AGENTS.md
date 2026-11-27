# My Deals status maintenance

Automated refresh is handled by `.github/workflows/weekly-my-deals-check.yml` on a self-hosted runner. Prefer that path over ad-hoc scraping.

## Manual / recovery

1. On a machine that can reach the admin UI, run `npm run login` if the session expired.
2. Run `npm run check` to refresh `data/status.json`.
3. Commit and push if you are not using the workflow’s commit step.

Follow `data/schema.md`. Do not invent live products when the admin UI is unreachable.
