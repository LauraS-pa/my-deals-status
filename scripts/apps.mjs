/** Canonical apps/regions for the status board. */

export const ADMIN_US = {
  id: "us",
  uiUrl: "https://fpadminui-us.planetart.com/mydeals/index",
  apiBase: "https://admin-fp.planetart.com/api/v1",
  authFile: "storage-us.json",
};

export const ADMIN_EU = {
  id: "eu",
  uiUrl: "https://fpadminui-eu.planetart.com/mydeals/index",
  apiBase: "https://admin-fpeu.planetart.com/api/v1",
  authFile: "storage-eu.json",
};

/** @deprecated use ADMIN_US.uiUrl — kept for older scripts */
export const ADMIN_UI_URL = ADMIN_US.uiUrl;
/** @deprecated use ADMIN_US.apiBase */
export const API_BASE = ADMIN_US.apiBase;

/** Default My Deals drawer source used by the admin UI. */
export const DEFAULT_SOURCE = "md_drawer";

/** Live status value used by the admin UI init request. */
export const LIVE_STATUS = 1;

const US_CA = new Set(["US", "CA"]);

export function normalizeLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function adminForRegion(region) {
  return US_CA.has(String(region).toUpperCase()) ? ADMIN_US : ADMIN_EU;
}

/**
 * Preferred language matchers per region (one language only).
 * US/CA → US/CA English; IE/UK → English; other EU use local API lang.
 */
export const REGION_LANG_MATCHERS = {
  US: ["en-US", "en", "english"],
  CA: ["en-CA", "en-US", "en", "english"],
  BE: ["en-GB", "en-BE", "en-IE", "en-US", "en", "english"],
  FR: ["en-GB", "en-FR", "en-IE", "en-US", "en", "english"],
  IT: ["en-GB", "en-IT", "en-IE", "en-US", "en", "english"],
  IE: ["en-GB", "en-IE", "en-US", "en", "english"],
  ES: ["en-GB", "en-ES", "en-IE", "en-US", "en", "english"],
  NL: ["en-GB", "en-NL", "en-IE", "en-US", "en", "english"],
  DE: ["en-GB", "en-DE", "en-IE", "en-US", "en", "english"],
  AT: ["en-GB", "en-AT", "en-DE", "en-IE", "en-US", "en", "english"],
  UK: ["en-GB", "en-UK", "en-IE", "en-US", "en", "english"],
};

/** Titles that are app/category labels, not real deal products. */
const APP_NAME_TITLES = new Set(
  [
    "freeprints",
    "photobooks",
    "photobook",
    "photo books",
    "photo book",
    "photo tiles",
    "photo tile",
    "photo art",
    "photoart",
    "art cards",
    "artcards",
    "freeprints cards",
    "ink cards",
    "ink",
    "premium wall art",
    "photo greeting card",
    "photo greeting cards",
  ].map(normalizeLabel)
);

/**
 * Language for the list API call.
 * US/CA/IE/UK → English. Other EU → local catalog lang (only option);
 * English display titles are applied via IE/UK mapping.
 */
export function pickLang(langList, region, apiDefaultLang) {
  const code = String(region).toUpperCase();
  const matchers = REGION_LANG_MATCHERS[code] || [];
  if (US_CA.has(code) || code === "UK" || code === "IE") {
    const matched = resolveOption(langList, matchers);
    if (matched) return matched.value;
    if (apiDefaultLang) return apiDefaultLang;
    return langList?.[0]?.value || "";
  }
  if (apiDefaultLang) return apiDefaultLang;
  return langList?.[0]?.value || "";
}

export function needsEnglishTitleMap(region) {
  const code = String(region).toUpperCase();
  return !US_CA.has(code) && code !== "UK" && code !== "IE";
}

/**
 * Drop internal codes, PC MyDeals rows, bare app names, and cross-app promos.
 * @param {string} name
 * @param {{ appId?: string, region?: string }} [ctx]
 */
export function shouldIgnoreProductName(name, ctx = {}) {
  const n = String(name ?? "").trim();
  if (!n) return true;
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(n)) return true;
  if (/pc\s*my\s*deals/i.test(n)) return true;

  const label = normalizeLabel(n);
  if (APP_NAME_TITLES.has(label)) return true;

  const appId = ctx.appId || "";
  const region = String(ctx.region || "").toUpperCase();

  // Photo Tiles products only belong in the Photo Tiles app.
  if (appId !== "photo-tiles" && /\bphoto\s*tiles?\b/.test(label)) {
    return true;
  }

  // Photobooks products (e.g. Hardcover Photo Book) outside Photobooks.
  if (
    appId !== "photobooks" &&
    (/\bhardcover\s*photo\s*book\b/.test(label) ||
      /\bsoftcover\s*photo\s*book\b/.test(label) ||
      /\bphoto\s*books?\b/.test(label) ||
      label === "photobooks" ||
      label === "photobook")
  ) {
    return true;
  }

  // Photo Poster / poster SKUs — keep only in CA.
  if (region && region !== "CA" && /\bposter\b/.test(label)) {
    return true;
  }

  return false;
}

/** Display order for multi-country apps. CA only on FreePrints + Photobooks. */
const REGIONS_WITH_CA = [
  "US",
  "UK",
  "IE",
  "FR",
  "IT",
  "ES",
  "DE",
  "AT",
  "NL",
  "BE",
  "CA",
];
const REGIONS_NO_CA = [
  "US",
  "UK",
  "IE",
  "FR",
  "IT",
  "ES",
  "DE",
  "AT",
  "NL",
  "BE",
];

export const APPS = [
  {
    id: "freeprints",
    name: "FreePrints",
    siteMatchers: ["fp", "freeprints", "free prints"],
    regions: [...REGIONS_WITH_CA],
  },
  {
    id: "photobooks",
    name: "Photobooks",
    siteMatchers: ["pb", "photobook", "photobooks", "photo book"],
    regions: [...REGIONS_WITH_CA],
  },
  {
    id: "photo-tiles",
    name: "Photo Tiles",
    siteMatchers: ["pt", "tile", "tiles", "photo tiles", "photo tile"],
    regions: [...REGIONS_NO_CA],
  },
  {
    id: "photo-art",
    name: "Photo Art",
    siteMatchers: ["pa", "art", "photo art", "photoart", "artcards", "art cards"],
    regions: [...REGIONS_NO_CA],
  },
  {
    id: "freeprints-cards",
    name: "FreePrints Cards",
    siteMatchers: ["fpc", "freeprints cards", "fp cards", "cards"],
    regions: ["UK"],
  },
  {
    id: "ink-cards",
    name: "Ink Cards",
    siteMatchers: ["ink", "ink cards", "inkcards"],
    regions: ["US"],
  },
];

/**
 * Resolve an admin filter option (site/region/status) against preferred matchers.
 * Options look like `{ value, label }` from filterList.
 */
export function resolveOption(options, matchers, { preferExactValue } = {}) {
  const list = Array.isArray(options) ? options : [];
  const normalizedMatchers = matchers.map(normalizeLabel);

  if (preferExactValue != null) {
    const byValue = list.find(
      (opt) => String(opt.value) === String(preferExactValue)
    );
    if (byValue) return byValue;
  }

  for (const matcher of normalizedMatchers) {
    const exact = list.find((opt) => {
      const label = normalizeLabel(opt.label ?? opt.name);
      const value = normalizeLabel(opt.value);
      return label === matcher || value === matcher;
    });
    if (exact) return exact;
  }

  for (const matcher of normalizedMatchers) {
    const partial = list.find((opt) => {
      const label = normalizeLabel(opt.label ?? opt.name);
      const value = normalizeLabel(opt.value);
      return (
        label.includes(matcher) ||
        matcher.includes(label) ||
        value.includes(matcher)
      );
    });
    if (partial) return partial;
  }

  return null;
}

/** True when a list row should be omitted (failed / deactivated). */
export function isExcludedProduct(row) {
  if (!row || typeof row !== "object") return true;

  const chunks = [];
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue;
    const keyNorm = normalizeLabel(key);
    if (
      keyNorm.includes("status") ||
      keyNorm.includes("state") ||
      keyNorm === "live" ||
      keyNorm.includes("deactiv")
    ) {
      if (typeof value === "object") {
        chunks.push(JSON.stringify(value));
      } else {
        chunks.push(String(value));
      }
    }
  }

  const text = normalizeLabel(chunks.join(" "));
  return (
    text.includes("failed") ||
    text.includes("deactivated") ||
    text.includes("deactivate") ||
    /\bfail\b/.test(text)
  );
}
