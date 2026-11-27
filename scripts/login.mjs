import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ADMIN_UI_URL } from "./apps.mjs";
import { getAuthStatePath } from "./auth-path.mjs";

/**
 * One-time (or refresh) interactive login on the VPN / corp network machine.
 * Saves Playwright storage state for the weekly headless check.
 */
async function main() {
  const authPath = getAuthStatePath();
  fs.mkdirSync(path.dirname(authPath), { recursive: true });

  console.log("Opening My Deals admin for login…");
  console.log(`Auth state will be saved to: ${authPath}`);
  console.log("Log in in the browser window, then return here and press Enter.\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(ADMIN_UI_URL, { waitUntil: "domcontentloaded" });

  await new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  const expired = await page
    .getByText(/login has expired|please log in/i)
    .count()
    .catch(() => 0);
  if (expired > 0) {
    console.warn(
      "Warning: login-expired message is still visible. Save anyway only if you finished logging in."
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
