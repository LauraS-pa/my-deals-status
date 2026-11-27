import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { ADMIN_EU, ADMIN_US } from "./apps.mjs";
import { getAuthDir, getAuthStatePath } from "./auth-path.mjs";

const MAX_WAIT_MS = 10 * 60 * 1000;
const POLL_MS = 2000;

async function pageLooksLoggedIn(page) {
  const text = await page.locator("body").innerText().catch(() => "");
  if (/login has expired|please log in again/i.test(text)) return false;
  if (/sign in|log in/i.test(text) && text.length < 800) return false;
  return text.length > 200;
}

async function loginOne(browser, admin) {
  const authPath = getAuthStatePath(admin);
  fs.mkdirSync(path.dirname(authPath), { recursive: true });

  console.log(`\n=== ${admin.id.toUpperCase()} admin ===`);
  console.log(`Opening ${admin.uiUrl}`);
  console.log(`Will save to: ${authPath}`);
  console.log(
    "Sign in if asked. When you can see the My Deals page, wait — this saves automatically.\n"
  );

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(admin.uiUrl, { waitUntil: "domcontentloaded" });

  const loginBtn = page.getByRole("button", { name: /^login$/i });
  if ((await loginBtn.count()) > 0) {
    await loginBtn.first().click().catch(() => {});
  }

  const started = Date.now();
  let ready = false;
  while (Date.now() - started < MAX_WAIT_MS) {
    if (await pageLooksLoggedIn(page)) {
      await page.waitForTimeout(2500);
      if (await pageLooksLoggedIn(page)) {
        ready = true;
        break;
      }
    }
    await page.waitForTimeout(POLL_MS);
  }

  if (!ready) {
    await context.close();
    throw new Error(
      `Timed out waiting for ${admin.id.toUpperCase()} login. Run npm run login again.`
    );
  }

  await context.storageState({ path: authPath });
  await context.close();
  console.log(`Saved ${admin.id.toUpperCase()} auth to ${authPath}`);
}

async function main() {
  fs.mkdirSync(getAuthDir(), { recursive: true });
  const browser = await chromium.launch({ headless: false });
  try {
    await loginOne(browser, ADMIN_US);
    await loginOne(browser, ADMIN_EU);
  } finally {
    await browser.close();
  }
  console.log("\nBoth US and EU sessions saved.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
