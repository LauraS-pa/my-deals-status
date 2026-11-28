async function loadStatus() {
  const summaryEl = document.getElementById("change-summary");
  const checkedEl = document.getElementById("last-checked");
  const boardsEl = document.getElementById("boards");
  const jumpNavEl = document.getElementById("jump-nav");

  try {
    const response = await fetch("./data/status.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    render(data, { summaryEl, checkedEl, boardsEl, jumpNavEl });
  } catch (error) {
    summaryEl.textContent = "Could not load status data.";
    summaryEl.classList.add("error");
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

function render(data, els) {
  els.summaryEl.textContent =
    data.changeSummary || "No change summary available.";
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

  els.boardsEl.innerHTML = apps.map(renderApp).join("");
  setupRegionScrollControls(els.boardsEl);
}

function renderApp(app) {
  const regions = Array.isArray(app.regions) ? app.regions : [];
  const live = app.live && typeof app.live === "object" ? app.live : {};
  const cards = regions.map((region) => renderRegion(region, live[region])).join("");
  const id = appAnchorId(app);

  return `
    <article class="app-block" id="${id}">
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
