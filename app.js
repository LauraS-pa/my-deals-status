async function loadStatus() {
  const checkedEl = document.getElementById("last-checked");
  const boardsEl = document.getElementById("boards");
  const jumpNavEl = document.getElementById("jump-nav");

  try {
    const response = await fetch("./data/status.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    render(data, { checkedEl, boardsEl, jumpNavEl });
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

function productLetter(name) {
  const ch = String(name || "")
    .trim()
    .charAt(0)
    .toUpperCase();
  return /[A-Z]/.test(ch) ? ch : "#";
}

/** Prefer derived products; fall back to building from apps if needed. */
function productsFromData(data) {
  if (Array.isArray(data.products) && data.products.length) {
    return data.products;
  }
  return buildProductsClientSide(data.apps || []);
}

function buildProductsClientSide(apps) {
  const byKey = new Map();
  for (const app of apps) {
    const live = app?.live && typeof app.live === "object" ? app.live : {};
    for (const [region, list] of Object.entries(live)) {
      if (!Array.isArray(list)) continue;
      for (const raw of list) {
        const name = String(raw ?? "").trim();
        if (!name) continue;
        const key = name.toLowerCase().replace(/\s+/g, " ");
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
  return [...byKey.values()]
    .map((entry) => ({
      name: entry.name,
      placements: [...entry.placements.values()].map((p) => ({
        appId: p.appId,
        appName: p.appName,
        regions: [...p.regions].sort(),
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}

function render(data, els) {
  els.checkedEl.textContent = `Last checked: ${formatChecked(data.lastChecked)}`;

  const products = productsFromData(data);
  if (products.length === 0) {
    els.boardsEl.innerHTML = `<p class="empty">No live products in status data.</p>`;
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
