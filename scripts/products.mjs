import { APPS, normalizeLabel } from "./apps.mjs";

/** Canonical region order across all apps (US → … → CA). */
const REGION_ORDER = [
  ...new Set(APPS.flatMap((app) => app.regions)),
];

const REGION_RANK = new Map(REGION_ORDER.map((code, i) => [code, i]));

const APP_ORDER = new Map(APPS.map((app, i) => [app.id, i]));

function sortRegions(regions) {
  return [...regions].sort((a, b) => {
    const ra = REGION_RANK.has(a) ? REGION_RANK.get(a) : 999;
    const rb = REGION_RANK.has(b) ? REGION_RANK.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

/**
 * Derive a product-first directory from app/region live lists.
 * Same display name across apps becomes one product with placements.
 * @param {Array<{ id: string, name: string, regions?: string[], live?: Record<string, string[]> }>} apps
 */
export function buildProductDirectory(apps) {
  /** @type {Map<string, { name: string, placements: Map<string, { appId: string, appName: string, regions: Set<string> }> }>} */
  const byKey = new Map();

  for (const app of apps || []) {
    const live = app?.live && typeof app.live === "object" ? app.live : {};
    for (const [region, list] of Object.entries(live)) {
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const name = String(raw ?? "").trim();
        if (!name) continue;
        const key = normalizeLabel(name);
        if (!byKey.has(key)) {
          byKey.set(key, { name, placements: new Map() });
        }
        const entry = byKey.get(key);
        if (!entry.placements.has(app.id)) {
          entry.placements.set(app.id, {
            appId: app.id,
            appName: app.name || app.id,
            regions: new Set(),
          });
        }
        entry.placements.get(app.id).regions.add(String(region).toUpperCase());
      }
    }
  }

  const products = [...byKey.values()]
    .map((entry) => {
      const placements = [...entry.placements.values()]
        .map((p) => ({
          appId: p.appId,
          appName: p.appName,
          regions: sortRegions([...p.regions]),
        }))
        .sort((a, b) => {
          const oa = APP_ORDER.has(a.appId) ? APP_ORDER.get(a.appId) : 999;
          const ob = APP_ORDER.has(b.appId) ? APP_ORDER.get(b.appId) : 999;
          if (oa !== ob) return oa - ob;
          return a.appName.localeCompare(b.appName);
        });

      return { name: entry.name, placements };
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return products;
}
