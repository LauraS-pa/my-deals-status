/** Canonical apps/regions for the status board. */

export const ADMIN_UI_URL = "https://fpadminui-us.planetart.com/mydeals/index";
export const API_BASE = "https://admin-fp.planetart.com/api/v1";

/** Default My Deals drawer source used by the admin UI. */
export const DEFAULT_SOURCE = "md_drawer";

/** Live status value used by the admin UI init request. */
export const LIVE_STATUS = 1;

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
