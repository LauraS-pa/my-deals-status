import { APPS, normalizeLabel } from "./apps.mjs";

/** Canonical region order across all apps (US → … → CA). */
const REGION_ORDER = [...new Set(APPS.flatMap((app) => app.regions))];

const REGION_RANK = new Map(REGION_ORDER.map((code, i) => [code, i]));

const APP_ORDER = new Map(APPS.map((app, i) => [app.id, i]));

/** Words ignored when alphabetizing the product directory. */
const SORT_IGNORE =
  /\b(?:photos?|personalised|personalized|custom)\b/gi;

function sortRegions(regions) {
  return [...regions].sort((a, b) => {
    const ra = REGION_RANK.has(a) ? REGION_RANK.get(a) : 999;
    const rb = REGION_RANK.has(b) ? REGION_RANK.get(b) : 999;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
}

/** Strip zero-width / odd whitespace so near-duplicates collapse. */
function cleanRawName(name) {
  return String(name ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * US-facing spelling + synonym folds used for grouping.
 * Applied after normalizeLabel (lowercase, collapsed spaces).
 */
function foldSpelling(label) {
  return label
    .replace(/\bcolour\b/g, "color")
    .replace(/\bcolouring\b/g, "coloring")
    .replace(/\bpersonalised\b/g, "personalized")
    .replace(/\bkeyring\b/g, "keychain")
    .replace(/\bchristmas photo cards\b/g, "holiday photo cards")
    .replace(/\bchristmas cards\b/g, "holiday cards")
    .replace(/\bmouse mat\b/g, "mouse pad")
    .replace(/\bcushion\b/g, "pillow");
}

/** Collapse known product families into one group key. */
function foldFamilies(label) {
  return label
    .replace(/\bfotodeken\b/g, "photo blanket")
    .replace(/\bbaseball hat\b/g, "hat")
    .replace(/\bcutout stickers\b/g, "stickers")
    .replace(/\bphoto mug\b/g, "mug")
    .replace(/\bphoto notebook\b/g, "notebook");
}

/** Drop size tokens so 11x14 / 14x11 / 10" variants share a group. */
function stripMeasurements(label) {
  return label
    .replace(
      /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*(?:cm|mm|in|inch|inches))?\b/gi,
      " "
    )
    .replace(/\b\d+(?:\.\d+)?\s*(?:cm|mm|in|inch|inches)\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*["″]\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*oz\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable group key for combining variant product titles.
 * @param {string} name
 */
export function productGroupKey(name) {
  const cleaned = cleanRawName(name);
  let label = foldSpelling(normalizeLabel(cleaned));
  label = foldFamilies(label);
  label = stripMeasurements(label);
  return label || normalizeLabel(cleaned);
}

/**
 * Sort key: ignore photo / personalized / custom (and UK spellings),
 * and ignore measurement tokens so size variants sort with their family.
 * @param {string} name
 */
export function productSortKey(name) {
  // Sort on the core before any ", Custom" / ", Personalized" suffix.
  const core = String(name || "").split(",")[0];
  let label = foldSpelling(normalizeLabel(cleanRawName(core)));
  label = foldFamilies(label);
  label = stripMeasurements(label);
  label = label.replace(SORT_IGNORE, " ").replace(/\s+/g, " ").trim();
  return label || foldSpelling(normalizeLabel(cleanRawName(core)));
}

function toTitleCase(value) {
  return String(value)
    .toLowerCase()
    .replace(/(^|[^a-z0-9à-ÿ’'])([a-zà-ÿ])/g, (_, sep, ch) => sep + ch.toUpperCase())
    .replace(/\bTm\b/g, "™")
    .replace(/\bOz\b/g, "oz");
}

/**
 * Visible US-facing title: drop measurements, fold UK/synonym variants,
 * and move Custom / Personalized behind the core name
 * (e.g. CUSTOM PHOTO APRON → "Photo Apron, Custom").
 * Photo stays with the product name; it is only ignored for sorting.
 * @param {string} name
 * @param {{ preferPhoto?: boolean }} [opts]
 */
export function toCanonicalDisplayName(name, opts = {}) {
  let s = cleanRawName(name);
  s = s.replace(
    /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*(?:cm|mm|in|inch|inches))?\b/gi,
    " "
  );
  s = s.replace(/\b\d+(?:\.\d+)?\s*["″]/gi, " ");
  s = s.replace(/\bCOLOURING\b/gi, "COLORING");
  s = s.replace(/\bCOLOUR\b/gi, "COLOR");
  s = s.replace(/\bPERSONALISED\b/gi, "PERSONALIZED");
  s = s.replace(/\bKEYRING\b/gi, "KEYCHAIN");
  s = s.replace(/\bCHRISTMAS PHOTO CARDS\b/gi, "HOLIDAY PHOTO CARDS");
  s = s.replace(/\bCHRISTMAS CARDS\b/gi, "HOLIDAY CARDS");
  s = s.replace(/\bMOUSE MAT\b/gi, "MOUSE PAD");
  s = s.replace(/\bCUSHION\b/gi, "PILLOW");
  s = s.replace(/\bFOTODEKEN\b/gi, "PHOTO BLANKET");
  s = s.replace(/\bBASEBALL HAT\b/gi, "HAT");
  s = s.replace(/\bCUTOUT STICKERS\b/gi, "STICKERS");
  // Prefer "Photo Mug" / "Photo Notebook" when a plain custom variant won scoring.
  if (opts.preferPhoto) {
    s = s.replace(/\bCUSTOM MUG\b/gi, "CUSTOM PHOTO MUG");
    s = s.replace(/\bCUSTOM NOTEBOOK\b/gi, "CUSTOM PHOTO NOTEBOOK");
    if (!/\bphoto\b/i.test(s) && /\bblanket\b/i.test(s)) {
      s = s.replace(/\bBLANKET\b/gi, "PHOTO BLANKET");
    }
  }
  s = s.replace(/\s+/g, " ").trim() || cleanRawName(name);

  const lower = s.toLowerCase();
  const hasCustom = /\bcustom\b/.test(lower);
  const hasPersonalized = /\bpersonalized\b/.test(lower);

  let core = s
    .replace(/\bCUSTOM\b/gi, " ")
    .replace(/\bPERSONALIZED\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  core = toTitleCase(core);

  const trail = [];
  if (hasCustom) trail.push("Custom");
  if (hasPersonalized) trail.push("Personalized");

  if (!core) {
    return trail.length ? trail.join(" ") : toTitleCase(cleanRawName(name));
  }
  return trail.length ? `${core}, ${trail.join(" ")}` : core;
}

/**
 * Prefer a clean US-facing display title from the variants in a group.
 * @param {string[]} names
 */
export function pickDisplayName(names) {
  const cleaned = [...new Set(names.map(cleanRawName).filter(Boolean))];
  if (!cleaned.length) return "Untitled";

  const preferPhoto = cleaned.some((n) =>
    /\bphoto\b|\bfotodeken\b/i.test(n)
  );

  const scored = cleaned.map((name) => {
    const lower = name.toLowerCase();
    let score = 0;
    if (!/\d+\s*[x×]\s*\d+/i.test(name) && !/\d+\s*["″]/i.test(name)) {
      score += 8;
    }
    if (
      !/\bcolour|\bpersonalised|\bkeyring|\bmouse mat|\bcushion|\bfotodeken\b/i.test(
        lower
      ) &&
      !/\bchristmas (?:photo )?cards\b/i.test(lower)
    ) {
      score += 4;
    }
    if (/\bholiday (?:photo )?cards\b/i.test(lower)) score += 1;
    if (/\bkeychain\b/i.test(lower)) score += 1;
    if (/\bphoto blanket\b/i.test(lower)) score += 2;
    if (name === name.toUpperCase()) score += 0.5;
    score += Math.min(name.length, 40) / 100;
    return { name, score };
  });

  scored.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return toCanonicalDisplayName(scored[0].name, { preferPhoto });
}

/**
 * Derive a product-first directory from app/region live lists.
 * Same display name (and folded variants) become one product with placements.
 * @param {Array<{ id: string, name: string, regions?: string[], live?: Record<string, string[]> }>} apps
 */
export function buildProductDirectory(apps) {
  /** @type {Map<string, { names: Set<string>, placements: Map<string, { appId: string, appName: string, regions: Set<string> }> }>} */
  const byKey = new Map();

  for (const app of apps || []) {
    const live = app?.live && typeof app.live === "object" ? app.live : {};
    for (const [region, list] of Object.entries(live)) {
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const name = cleanRawName(raw);
        if (!name) continue;
        const key = productGroupKey(name);
        if (!byKey.has(key)) {
          byKey.set(key, { names: new Set(), placements: new Map() });
        }
        const entry = byKey.get(key);
        entry.names.add(name);
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

      return {
        name: pickDisplayName([...entry.names]),
        placements,
      };
    })
    .sort((a, b) => {
      const ka = productSortKey(a.name);
      const kb = productSortKey(b.name);
      const cmp = ka.localeCompare(kb, undefined, { sensitivity: "base" });
      if (cmp !== 0) return cmp;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });

  return products;
}
