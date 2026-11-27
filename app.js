async function loadStatus() {
  const summaryEl = document.getElementById("change-summary");
  const checkedEl = document.getElementById("last-checked");
  const boardsEl = document.getElementById("boards");

  try {
    const response = await fetch("./data/status.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    render(data, { summaryEl, checkedEl, boardsEl });
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

function render(data, els) {
  els.summaryEl.textContent =
    data.changeSummary || "No change summary available.";
  els.checkedEl.textContent = `Last checked: ${formatChecked(data.lastChecked)}`;

  const apps = Array.isArray(data.apps) ? data.apps : [];
  if (apps.length === 0) {
    els.boardsEl.innerHTML = `<p class="empty">No apps in status data.</p>`;
    return;
  }

  els.boardsEl.innerHTML = apps.map(renderApp).join("");
}

function renderApp(app) {
  const regions = Array.isArray(app.regions) ? app.regions : [];
  const live = app.live && typeof app.live === "object" ? app.live : {};
  const cards = regions.map((region) => renderRegion(region, live[region])).join("");

  return `
    <article class="app-block">
      <h3>${escapeHtml(app.name || app.id || "App")}</h3>
      <div class="region-grid">${cards}</div>
    </article>
  `;
}

function renderRegion(region, products) {
  const list = Array.isArray(products) ? products.filter(Boolean) : [];
  const hasLive = list.length > 0;
  const body = hasLive
    ? `<ul class="products">${list
        .map((name) => `<li>${escapeHtml(name)}</li>`)
        .join("")}</ul>`
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
