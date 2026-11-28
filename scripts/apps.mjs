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

export function adminForRegion(region) {
  return US_CA.has(String(region).toUpperCase()) ? ADMIN_US : ADMIN_EU;
}

/**
 * Preferred language matchers per region (one language only).
 * US/CA → English, BE → French; others use the local default tongue.
 */
export const REGION_LANG_MATCHERS = {
  US: ["en-US", "en", "english"],
  CA: ["en-CA", "en-US", "en", "english"],
  BE: ["fr-BE", "fr-FR", "fr", "french"],
  FR: ["fr-FR", "fr", "french"],
  IT: ["it-IT", "it", "italian"],
  IE: ["en-IE", "en-GB", "en-US", "en", "english"],
  ES: ["es-ES", "es", "spanish"],
  NL: ["nl-NL", "nl", "dutch"],
  DE: ["de-DE", "de", "german"],
  AT: ["de-AT", "de-DE", "de", "german"],
  UK: ["en-GB", "en-UK", "en", "english"],
};

export function pickLang(langList, region, apiDefaultLang) {
  const matchers = REGION_LANG_MATCHERS[String(region).toUpperCase()] || [];
  const matched = resolveOption(langList, matchers);
  if (matched) return matched.value;
  if (apiDefaultLang) return apiDefaultLang;
  return langList?.[0]?.value || "";
}

/** Drop internal codes (fg_gift_monthly) and PC MyDeals promo rows. */
export function shouldIgnoreProductName(name) {
  const n = String(name ?? "").trim();
  if (!n) return true;
  if (/^[a-z][a-z0-9]*(?:_[a-z0-9]+)+$/i.test(n)) return true;
  if (/pc\s*my\s*deals/i.test(n)) return true;
  return false;
}

export const APPS = [
  {
    id: "freeprints",
    name: "FreePrints",
    siteMatchers: ["fp", "freeprints", "free prints"],
    regions: ["US", "CA", "FR", "IT", "IE", "ES", "NL", "DE", "AT", "BE"],
  },
  {
    id: "photobooks",
    name: "Photobooks",
    siteMatchers: ["pb", "photobook", "photobooks", "photo book"],
    regions: ["US", "CA", "FR", "IT", "IE", "ES", "NL", "DE", "AT", "BE"],
  },
  {
    id: "photo-tiles",
    name: "Photo Tiles",
    siteMatchers: ["pt", "tile", "tiles", "photo tiles", "photo tile"],
    regions: ["US", "CA", "FR", "IT", "IE", "ES", "NL", "DE", "AT", "BE"],
  },
  {
    id: "photo-art",
    name: "Photo Art",
    siteMatchers: ["pa", "art", "photo art", "photoart", "artcards", "art cards"],
    regions: ["US", "CA", "FR", "IT", "IE", "ES", "NL", "DE", "AT", "BE"],
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

export function normalizeLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

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
