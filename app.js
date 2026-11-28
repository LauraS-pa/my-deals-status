/** @type {{ lastChecked?: string, products?: any[], apps?: any[] } | null} */
let statusData = null;

async function loadStatus() {
  const checkedEl = document.getElementById("last-checked");
  const boardsEl = document.getElementById("boards");
  const jumpNavEl = document.getElementById("jump-nav");
  const filtersEl = document.getElementById("filters");
  const countEl = document.getElementById("board-count");

  try {
    const response = await fetch("./data/status.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    statusData = await response.json();
    setupFilters(statusData);
    renderBoard({
      checkedEl,
      boardsEl,
      jumpNavEl,
      filtersEl,
      countEl,
    });
  } catch (error) {
    checkedEl.textContent = "Last checked: unavailable";
    boardsEl.innerHTML = `<p class="error">Failed to load data/status.json (${error.message}).</p>`;
  }
}

function formatChecked(iso) {
  if (!iso) return "never";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function letterAnchor(letter) {
  return `letter-${letter.toLowerCase()}`;
}

/** Letter for A–Z jump links — mirrors server sort (ignore photo/custom/etc.). */
function productSortKey(name) {
  const core = String(name || "").split(",")[0];
  return core
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\bcolour\b/g, "color")
    .replace(/\bcolouring\b/g, "coloring")
    .replace(/\bpersonalised\b/g, "personalized")
    .replace(/\bkeyring\b/g, "keychain")
    .replace(/\bfotodeken\b/g, "photo blanket")
    .replace(/\bchristmas photo cards\b/g, "holiday photo cards")
    .replace(/\bchristmas cards\b/g, "holiday cards")
    .replace(/\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?\b/g, " ")
    .replace(/\b\d+(?:\.\d+)?\s*["″]/g, " ")
    .replace(/\b(?:photos?|personalized|personalised|custom)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productLetter(name) {
  const key = productSortKey(name);
  const ch = (key || String(name || "").trim()).charAt(0).toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

function productsFromData(data) {
  if (Array.isArray(data?.products) && data.products.length) {
    return data.products;
  }
  return [];
}

const REGION_ORDER = [
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

function collectFilterOptions(products) {
  const apps = new Map();
  const regions = new Set();
  for (const product of products) {
    for (const placement of product.placements || []) {
      if (placement.appId) {
        apps.set(placement.appId, placement.appName || placement.appId);
      }
      for (const code of placement.regions || []) {
        regions.add(String(code).toUpperCase());
      }
    }
  }

  const appOptions = [...apps.entries()].sort((a, b) =>
    a[1].localeCompare(b[1], undefined, { sensitivity: "base" })
  );
  const regionOptions = [...regions].sort((a, b) => {
    const ia = REGION_ORDER.indexOf(a);
    const ib = REGION_ORDER.indexOf(b);
    const ra = ia === -1 ? 999 : ia;
    const rb = ib === -1 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b);
  });
  return { appOptions, regionOptions };
}

function setupFilters(data) {
  const filtersEl = document.getElementById("filters");
  const appSelect = document.getElementById("filter-app");
  const regionSelect = document.getElementById("filter-region");
  const clearBtn = document.getElementById("filter-clear");
  if (!filtersEl || !appSelect || !regionSelect) return;

  const products = productsFromData(data);
  const { appOptions, regionOptions } = collectFilterOptions(products);

  appSelect.innerHTML =
    `<option value="">All apps</option>` +
    appOptions
      .map(
        ([id, name]) =>
          `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`
      )
      .join("");

  regionSelect.innerHTML =
    `<option value="">All regions</option>` +
    regionOptions
      .map((code) => `<option value="${escapeHtml(code)}">${escapeHtml(code)}</option>`)
      .join("");

  filtersEl.hidden = products.length === 0;

  const rerender = () => {
    if (clearBtn) {
      clearBtn.hidden = !appSelect.value && !regionSelect.value;
    }
    renderBoard({
      checkedEl: document.getElementById("last-checked"),
      boardsEl: document.getElementById("boards"),
      jumpNavEl: document.getElementById("jump-nav"),
      filtersEl,
      countEl: document.getElementById("board-count"),
    });
  };

  appSelect.addEventListener("change", rerender);
  regionSelect.addEventListener("change", rerender);
  clearBtn?.addEventListener("click", () => {
    appSelect.value = "";
    regionSelect.value = "";
    rerender();
  });
}

function currentFilters() {
  const appSelect = document.getElementById("filter-app");
  const regionSelect = document.getElementById("filter-region");
  return {
    appId: appSelect?.value || "",
    region: regionSelect?.value || "",
  };
}

function filterProduct(product, { appId, region }) {
  const placements = Array.isArray(product.placements) ? product.placements : [];
  const filtered = placements
    .map((placement) => {
      if (appId && placement.appId !== appId) return null;
      const regions = Array.isArray(placement.regions) ? placement.regions : [];
      const nextRegions = region
        ? regions.filter((code) => String(code).toUpperCase() === region)
        : regions;
      if (region && nextRegions.length === 0) return null;
      return { ...placement, regions: nextRegions };
    })
    .filter(Boolean);

  if (!filtered.length) return null;
  return { ...product, placements: filtered };
}

function renderBoard(els) {
  if (!statusData) return;

  els.checkedEl.textContent = `Last checked: ${formatChecked(statusData.lastChecked)}`;

  const allProducts = productsFromData(statusData);
  const filters = currentFilters();
  const products = allProducts
    .map((product) => filterProduct(product, filters))
    .filter(Boolean);

  if (els.countEl) {
    const filtering = Boolean(filters.appId || filters.region);
    els.countEl.hidden = !filtering;
    if (filtering) {
      els.countEl.textContent = `${products.length} of ${allProducts.length} products`;
    }
  }

  if (allProducts.length === 0) {
    els.boardsEl.innerHTML = `<p class="empty">No live products in status data.</p>`;
    if (els.jumpNavEl) {
      els.jumpNavEl.hidden = true;
      els.jumpNavEl.innerHTML = "";
    }
    return;
  }

  if (products.length === 0) {
    els.boardsEl.innerHTML = `<p class="empty">No products match the selected app/region filters.</p>`;
    if (els.jumpNavEl) {
      els.jumpNavEl.hidden = true;
      els.jumpNavEl.innerHTML = "";
    }
    return;
  }

  const letters = [];
  const seen = new Set();
  for (const product of products) {
    const letter = productLetter(product.name);
    if (!seen.has(letter)) {
      seen.add(letter);
      letters.push(letter);
    }
  }

  if (els.jumpNavEl) {
    els.jumpNavEl.hidden = false;
    els.jumpNavEl.innerHTML = letters
      .map(
        (letter) =>
          `<a class="jump-link" href="#${letterAnchor(letter)}">${escapeHtml(letter)}</a>`
      )
      .join("");
  }

  let currentLetter = null;
  const chunks = [];
  for (const product of products) {
    const letter = productLetter(product.name);
    if (letter !== currentLetter) {
      currentLetter = letter;
      chunks.push(
        `<h3 class="letter-heading" id="${letterAnchor(letter)}">${escapeHtml(letter)}</h3>`
      );
    }
    chunks.push(renderProduct(product));
  }

  els.boardsEl.innerHTML = `<div class="product-list">${chunks.join("")}</div>`;
}

function renderProduct(product) {
  const placements = Array.isArray(product.placements) ? product.placements : [];
  const rows = placements
    .map((placement) => {
      const regions = Array.isArray(placement.regions) ? placement.regions : [];
      const chips = regions
        .map((code) => `<span class="region-chip">${escapeHtml(code)}</span>`)
        .join("");
      return `
        <div class="placement-row">
          <span class="placement-app">${escapeHtml(placement.appName || placement.appId || "App")}</span>
          <span class="placement-regions">${chips || `<span class="empty">None</span>`}</span>
        </div>
      `;
    })
    .join("");

  return `
    <article class="product-block">
      <h4 class="product-name">${escapeHtml(product.name || "Untitled")}</h4>
      <div class="placement-list">${rows}</div>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

loadStatus();
