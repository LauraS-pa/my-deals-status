import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  ADMIN_UI_URL,
  API_BASE,
  APPS,
  DEFAULT_SOURCE,
  LIVE_STATUS,
  resolveOption,
} from "./apps.mjs";
import { assertAuthStateExists } from "./auth-path.mjs";
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

async function apiCall(page, apiPath, params = {}, method = "GET") {
  return page.evaluate(
    async ({ apiBase, apiPath: pathName, params: query, method: httpMethod }) => {
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

      const url = new URL(`${apiBase}${pathName}`);
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
    { apiBase: API_BASE, apiPath, params, method }
  );
}

async function apiGetWithFallback(page, context, apiPath, params) {
  const getResult = await apiCall(page, apiPath, params, "GET");
  if (getResult.ok) return getResult;

  const postResult = await apiCall(page, apiPath, params, "POST");
  if (postResult.ok) return postResult;

  const url = new URL(`${API_BASE}${apiPath}`);
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

async function ensureAuthenticated(page) {
  await page.goto(ADMIN_UI_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText().catch(() => "");
  if (isLoginExpiredText(text)) {
    throw new Error(
      "Admin session expired. On the runner machine run: npm run login"
    );
  }
}

async function loadFilters(page, context) {
  const filterRes = await apiGetWithFallback(page, context, "/mydeals/filterList", {
    source: DEFAULT_SOURCE,
    site: "FP",
    region: "US",
  });
  if (!filterRes.ok) {
    throw new Error(
      `filterList failed (${filterRes.status}). Re-run npm run login if unauthorized.`
    );
  }
  return extractFilter(filterRes.body);
}

async function fetchLiveFor(page, context, searchParam) {
  const res = await apiGetWithFallback(page, context, "/mydeals/list", searchParam);
  if (!res.ok) {
    throw new Error(
      `mydeals/list failed for ${JSON.stringify(searchParam)} (${res.status})`
    );
  }
  const list = extractList(res.body);
  const names = [
    ...new Set(
      list
        .map(productName)
        .filter(Boolean)
        .map((name) => String(name).trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));
  return names;
}

async function main() {
  const authPath = assertAuthStateExists();
  const previous = readJson(STATUS_PATH);

  console.log(`Using auth state: ${authPath}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: authPath });
  const page = await context.newPage();

  try {
    await ensureAuthenticated(page);
    const filters = await loadFilters(page, context);

    const liveStatus =
      resolveOption(filters.statusList, ["live", "online", "active"], {
        preferExactValue: LIVE_STATUS,
      })?.value ?? LIVE_STATUS;

    const source =
      resolveOption(filters.sourceList, ["md drawer", "drawer", "my deals"], {
        preferExactValue: DEFAULT_SOURCE,
      })?.value ?? DEFAULT_SOURCE;

    console.log(`Using source=${source}, status=${liveStatus}`);

    const nextApps = [];

    for (const app of APPS) {
      const siteOpt = resolveOption(filters.siteList, [
        ...app.siteMatchers,
        app.name,
        app.id,
      ]);
      if (!siteOpt) {
        throw new Error(
          `Could not map app "${app.name}" to a site in filterList. Available: ${filters.siteList
            .map((s) => s.label || s.value)
            .join(", ")}`
        );
      }

      const live = {};
      for (const region of app.regions) {
        const regionOpt = resolveOption(filters.regionList, [region], {
          preferExactValue: region,
        });
        if (!regionOpt) {
          console.warn(`Skipping ${app.name}/${region}: region not in filterList`);
          live[region] = [];
          continue;
        }

        const searchParam = {
          source,
          site: siteOpt.value,
          region: regionOpt.value,
          product: "",
          status: liveStatus,
          lang: "",
        };

        process.stdout.write(`Checking ${app.name} / ${region}… `);
        const products = await fetchLiveFor(page, context, searchParam);
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
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
