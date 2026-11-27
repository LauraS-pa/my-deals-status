import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ADMIN_UI_URL } from "./apps.mjs";
import { getAuthStatePath } from "./auth-path.mjs";

const MAX_WAIT_MS = 10 * 60 * 1000;
const POLL_MS = 2000;

async function pageLooksLoggedIn(page) {
  const text = await page.locator("body").innerText().catch(() => "");
  if (/login has expired|please log in again/i.test(text)) return false;
  if (/sign in|log in/i.test(text) && text.length < 800) return false;
  // After a real login the My Deals UI is much richer than the expired dialog.
  return text.length > 200;
}

/**
 * One-time (or refresh) interactive login on the VPN / corp network machine.
 * Saves Playwright storage state for the weekly headless check.
 */
async function main() {
  const authPath = getAuthStatePath();
  fs.mkdirSync(path.dirname(authPath), { recursive: true });

  console.log("Opening My Deals admin for login…");
  console.log(`Auth state will be saved to: ${authPath}`);
  console.log(
    "In the browser: sign in if asked. When you can see the My Deals page, just wait — this script will save automatically.\n"
  );

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(ADMIN_UI_URL, { waitUntil: "domcontentloaded" });

  // Nudge past the expired-session dialog when present.
  const loginBtn = page.getByRole("button", { name: /^login$/i });
  if ((await loginBtn.count()) > 0) {
    await loginBtn.first().click().catch(() => {});
  }

  const started = Date.now();
  let ready = false;
  while (Date.now() - started < MAX_WAIT_MS) {
    if (await pageLooksLoggedIn(page)) {
      // Require the logged-in look to stay stable briefly.
      await page.waitForTimeout(2500);
      if (await pageLooksLoggedIn(page)) {
        ready = true;
        break;
      }
    }
    await page.waitForTimeout(POLL_MS);
  }

  if (!ready) {
    await browser.close();
    throw new Error(
      "Timed out waiting for a logged-in My Deals session. Run npm run login again and finish signing in."
    );
  }

  await context.storageState({ path: authPath });
  await browser.close();
  console.log(`Saved auth state to ${authPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
