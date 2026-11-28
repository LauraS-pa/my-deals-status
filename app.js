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
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function appAnchorId(app) {
  const raw = app.id || app.name || "app";
  return `app-${String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function previewText(text, max = 140) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const breakAt = Math.max(slice.lastIndexOf("; "), slice.lastIndexOf(". "), slice.lastIndexOf(" "));
  const cut = breakAt > 60 ? slice.slice(0, breakAt) : slice;
  return `${cut.trim()}…`;
}

function render(data, els) {
  els.checkedEl.textContent = `Last checked: ${formatChecked(data.lastChecked)}`;

  const apps = Array.isArray(data.apps) ? data.apps : [];
  if (apps.length === 0) {
    els.boardsEl.innerHTML = `<p class="empty">No apps in status data.</p>`;
    if (els.jumpNavEl) {
      els.jumpNavEl.hidden = true;
      els.jumpNavEl.innerHTML = "";
    }
    return;
  }

  if (els.jumpNavEl) {
    els.jumpNavEl.hidden = false;
    els.jumpNavEl.innerHTML = apps
      .map((app) => {
        const id = appAnchorId(app);
        const label = escapeHtml(app.name || app.id || "App");
        return `<a class="jump-link" href="#${id}">${label}</a>`;
      })
      .join("");
  }

  els.boardsEl.innerHTML = apps
    .map((app) => renderApp(app, data.lastChecked))
    .join("");
  setupRegionScrollControls(els.boardsEl);
}

function renderApp(app, lastChecked) {
  const regions = Array.isArray(app.regions) ? app.regions : [];
  const live = app.live && typeof app.live === "object" ? app.live : {};
  const cards = regions.map((region) => renderRegion(region, live[region])).join("");
  const id = appAnchorId(app);
  const summary = app.changeSummary || "No notable changes.";
  const preview = previewText(summary);
  const checkedLabel = formatChecked(lastChecked);
  const needsExpand = preview !== summary.replace(/\s+/g, " ").trim();

  const summaryBody = needsExpand
    ? `
      <details class="app-summary-details">
        <summary>
          <span class="app-summary-preview">${escapeHtml(preview)}</span>
          <span class="app-summary-toggle">Show more</span>
        </summary>
        <p class="app-summary-full">${escapeHtml(summary)}</p>
      </details>
    `
    : `<p class="app-summary-full">${escapeHtml(summary)}</p>`;

  return `
    <article class="app-block" id="${id}">
      <div class="app-block-inner">
        <div class="app-block-head">
          <h3>${escapeHtml(app.name || app.id || "App")}</h3>
          <div class="region-scroll-controls">
            <button type="button" class="region-scroll-btn" data-dir="-1" aria-label="Scroll regions left">‹</button>
            <button type="button" class="region-scroll-btn" data-dir="1" aria-label="Scroll regions right">›</button>
          </div>
        </div>
        <div class="region-scroll" tabindex="0" aria-label="${escapeHtml(app.name || "App")} regions">
          <div class="region-grid">${cards}</div>
        </div>
        <div class="app-summary">
          <div class="app-summary-top">
            <h4>Since last check</h4>
            <p class="app-summary-checked">Last checked: ${escapeHtml(checkedLabel)}</p>
          </div>
          ${summaryBody}
        </div>
      </div>
    </article>
  `;
}

function setupRegionScrollControls(root) {
  root.querySelectorAll(".app-block").forEach((block) => {
    const scroller = block.querySelector(".region-scroll");
    if (!scroller) return;

    const syncButtons = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const atStart = scroller.scrollLeft <= 2;
      const atEnd = scroller.scrollLeft >= max - 2;
      block.querySelectorAll(".region-scroll-btn").forEach((btn) => {
        const dir = Number(btn.dataset.dir);
        btn.disabled = max <= 0 || (dir < 0 ? atStart : atEnd);
      });
    };

    block.querySelectorAll(".region-scroll-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = Number(btn.dataset.dir) || 1;
        const amount = Math.max(scroller.clientWidth * 0.75, 180);
        scroller.scrollBy({ left: dir * amount, behavior: "smooth" });
      });
    });

    const details = block.querySelector(".app-summary-details");
    if (details) {
      const toggle = details.querySelector(".app-summary-toggle");
      details.addEventListener("toggle", () => {
        if (toggle) {
          toggle.textContent = details.open ? "Show less" : "Show more";
        }
      });
    }

    scroller.addEventListener("scroll", syncButtons, { passive: true });
    window.addEventListener("resize", syncButtons);
    syncButtons();
  });
}

function renderRegion(region, products) {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  const hasLive = list.length > 0;
  const body = hasLive
    ? `<ol class="products">${list
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join("")}</ol>`
    : `<p class="empty">None live</p>`;

  return `
    <div class="region-card${hasLive ? " has-live" : ""}">
      <p class="region-code"><span class="dot" aria-hidden="true"></span>${escapeHtml(
        region
      )}</p>
      ${body}
    </div>
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
