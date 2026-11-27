import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  ADMIN_EU,
  ADMIN_US,
  APPS,
  DEFAULT_SOURCE,
  LIVE_STATUS,
  adminForRegion,
  isExcludedProduct,
  resolveOption,
} from "./apps.mjs";
import { assertEuAndUsAuth, resolveUsAuthPath } from "./auth-path.mjs";
import { buildChangeSummary } from "./summary.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const STATUS_PATH = path.join(ROOT, "data", "status.json");
const dryRun = process.argv.includes("--dry-run");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function productName(row) {
  return (
    row.live_title ||
    row.pre_title ||
    row.product_name ||
    row.sequence_name ||
    row.title ||
    null
  );
}

function isLoginExpiredText(text) {
  return /login has expired|please log in again|sign in/i.test(text || "");
}

async function apiCall(page, apiBase, apiPath, params = {}, method = "GET") {
  return page.evaluate(
    async ({ apiBase: base, apiPath: pathName, params: query, method: httpMethod }) => {
      const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (!val) continue;
        const lower = key.toLowerCase();
        if (
          (lower.includes("token") || lower.includes("auth")) &&
          val.length < 4000 &&
          !val.trim().startsWith("{")
        ) {
          headers.Authorization = val.startsWith("Bearer ")
            ? val
            : `Bearer ${val}`;
          break;
        }
      }

      const url = new URL(`${base}${pathName}`);
      const init = { method: httpMethod, credentials: "include", headers };
      if (httpMethod === "GET") {
        for (const [key, value] of Object.entries(query || {})) {
          if (value === undefined || value === null || value === "") continue;
          url.searchParams.set(key, String(value));
        }
      } else {
        init.body = JSON.stringify(query || {});
      }

      const response = await fetch(url.toString(), init);
      const text = await response.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      return { ok: response.ok, status: response.status, body };
    },
    { apiBase, apiPath, params, method }
  );
}

async function apiGetWithFallback(page, context, apiBase, apiPath, params) {
  const getResult = await apiCall(page, apiBase, apiPath, params, "GET");
  if (getResult.ok) return getResult;

  const postResult = await apiCall(page, apiBase, apiPath, params, "POST");
  if (postResult.ok) return postResult;

  const url = new URL(`${apiBase}${apiPath}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  const response = await context.request.get(url.toString(), {
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    ok: response.ok(),
    status: response.status(),
    body,
    priorStatuses: [getResult.status, postResult.status],
  };
}

function extractList(payload) {
  if (!payload || typeof payload !== "object") return [];
  const data = payload.data?.data ?? payload.data ?? payload;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data)) return data;
  if (Array.isArray(payload.list)) return payload.list;
  return [];
}

function extractFilter(payload) {
  const data = payload?.data?.data ?? payload?.data ?? payload ?? {};
  return {
    siteList: data.siteList || [],
    regionList: data.regionList || [],
    sourceList: data.sourceList || [],
    statusList: data.statusList || [],
    langList: data.langList || [],
  };
}

async function ensureAuthenticated(page, admin) {
  await page.goto(admin.uiUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText().catch(() => "");
  if (isLoginExpiredText(text)) {
    throw new Error(
      `${admin.id.toUpperCase()} admin session expired. On the runner machine run: npm run login`
    );
  }
}

async function loadFilters(page, context, admin) {
  const filterRes = await apiGetWithFallback(
    page,
    context,
    admin.apiBase,
    "/mydeals/filterList",
    {
      source: DEFAULT_SOURCE,
      site: "FP",
      region: admin.id === "eu" ? "UK" : "US",
    }
  );
  if (!filterRes.ok) {
    throw new Error(
      `${admin.id.toUpperCase()} filterList failed (${filterRes.status}). Re-run npm run login if unauthorized.`
    );
  }
  return extractFilter(filterRes.body);
}

/** Keep admin list order; skip failed/deactivated; de-dupe by name. */
function productsFromList(list) {
  const names = [];
  const seen = new Set();
  for (const row of list) {
    if (isExcludedProduct(row)) continue;
    const name = productName(row);
    if (!name) continue;
    const trimmed = String(name).trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    names.push(trimmed);
  }
  return names;
}

async function fetchLiveFor(page, context, admin, searchParam) {
  const res = await apiGetWithFallback(
    page,
    context,
    admin.apiBase,
    "/mydeals/list",
    searchParam
  );
  if (!res.ok) {
    throw new Error(
      `mydeals/list failed for ${JSON.stringify(searchParam)} on ${admin.id} (${res.status})`
    );
  }
  return productsFromList(extractList(res.body));
}

async function openAdminSession(browser, admin, authPath) {
  const context = await browser.newContext({ storageState: authPath });
  const page = await context.newPage();
  await ensureAuthenticated(page, admin);
  const filters = await loadFilters(page, context, admin);
  const liveStatus =
    resolveOption(filters.statusList, ["live", "online", "active"], {
      preferExactValue: LIVE_STATUS,
    })?.value ?? LIVE_STATUS;
  const source =
    resolveOption(filters.sourceList, ["md drawer", "drawer", "my deals"], {
      preferExactValue: DEFAULT_SOURCE,
    })?.value ?? DEFAULT_SOURCE;
  return { context, page, filters, liveStatus, source, admin };
}

async function main() {
  const { usPath, euPath } = assertEuAndUsAuth();
  // Prefer renamed US file, allow legacy storage.json via resolveUsAuthPath.
  const usAuth = resolveUsAuthPath();
  const previous = readJson(STATUS_PATH);

  console.log(`US auth: ${usAuth}`);
  console.log(`EU auth: ${euPath}`);

  const browser = await chromium.launch({ headless: true });
  let usSession;
  let euSession;

  try {
    usSession = await openAdminSession(browser, ADMIN_US, usAuth);
    euSession = await openAdminSession(browser, ADMIN_EU, euPath);

    console.log(
      `US source=${usSession.source}, status=${usSession.liveStatus}; EU source=${euSession.source}, status=${euSession.liveStatus}`
    );

    const nextApps = [];

    for (const app of APPS) {
      const live = {};
      for (const region of app.regions) {
        const admin = adminForRegion(region);
        const session = admin.id === "eu" ? euSession : usSession;

        const siteOpt = resolveOption(session.filters.siteList, [
          ...app.siteMatchers,
          app.name,
          app.id,
        ]);
        if (!siteOpt) {
          throw new Error(
            `Could not map app "${app.name}" on ${admin.id.toUpperCase()}. Available: ${session.filters.siteList
              .map((s) => s.label || s.value)
              .join(", ")}`
          );
        }

        const regionOpt = resolveOption(session.filters.regionList, [region], {
          preferExactValue: region,
        });
        if (!regionOpt) {
          console.warn(
            `Skipping ${app.name}/${region}: region not in ${admin.id} filterList`
          );
          live[region] = [];
          continue;
        }

        const searchParam = {
          source: session.source,
          site: siteOpt.value,
          region: regionOpt.value,
          product: "",
          status: session.liveStatus,
          lang: "",
        };

        process.stdout.write(
          `Checking ${app.name} / ${region} (${admin.id.toUpperCase()})… `
        );
        const products = await fetchLiveFor(
          session.page,
          session.context,
          admin,
          searchParam
        );
        console.log(`${products.length} live`);
        live[region] = products;
      }

      nextApps.push({
        id: app.id,
        name: app.name,
        regions: [...app.regions],
        live,
      });
    }

    const next = {
      lastChecked: new Date().toISOString(),
      changeSummary: "",
      apps: nextApps,
    };
    next.changeSummary = buildChangeSummary(previous, next, {
      isBaseline: !previous.lastChecked,
    });

    console.log(`\nSummary: ${next.changeSummary}`);

    if (dryRun) {
      console.log("Dry run — status.json not written.");
      console.log(JSON.stringify(next, null, 2));
    } else {
      writeJson(STATUS_PATH, next);
      console.log(`Updated ${STATUS_PATH}`);
    }
  } finally {
    await usSession?.context.close().catch(() => {});
    await euSession?.context.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
