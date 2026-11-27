import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ADMIN_EU, ADMIN_US } from "./apps.mjs";

/** Shared folder the Windows runner service (NETWORK SERVICE) can read. */
export const DEFAULT_WINDOWS_AUTH_DIR = "C:\\actions-runner\\my-deals-auth";

export function getAuthDir() {
  const override = process.env.MYDEALS_AUTH_DIR?.trim();
  if (override) return path.resolve(override);
  if (process.platform === "win32") return DEFAULT_WINDOWS_AUTH_DIR;
  return path.join(os.homedir(), ".my-deals-status");
}

export function getAuthStatePath(admin = ADMIN_US) {
  const single = process.env.MYDEALS_AUTH_STATE?.trim();
  // Legacy single-file override only applies to US.
  if (single && admin.id === "us") {
    return path.resolve(single);
  }
  const envKey =
    admin.id === "eu" ? "MYDEALS_AUTH_STATE_EU" : "MYDEALS_AUTH_STATE_US";
  const perAdmin = process.env[envKey]?.trim();
  if (perAdmin) return path.resolve(perAdmin);
  return path.join(getAuthDir(), admin.authFile);
}

export function assertAuthStateExists(admin = ADMIN_US) {
  const authPath = getAuthStatePath(admin);
  if (!fs.existsSync(authPath)) {
    throw new Error(
      `Missing auth state at ${authPath} for ${admin.id.toUpperCase()}. On the runner machine, run: npm run login`
    );
  }
  return authPath;
}

export function legacyUsAuthPath() {
  return path.join(getAuthDir(), "storage.json");
}

/** Prefer storage-us.json; fall back to older storage.json if present. */
export function resolveUsAuthPath() {
  const primary = getAuthStatePath(ADMIN_US);
  if (fs.existsSync(primary)) return primary;
  const legacy = legacyUsAuthPath();
  if (fs.existsSync(legacy)) return legacy;
  return primary;
}

export function assertEuAndUsAuth() {
  const usPath = resolveUsAuthPath();
  if (!fs.existsSync(usPath)) {
    throw new Error(
      `Missing US auth at ${usPath}. Run: npm run login`
    );
  }
  const euPath = getAuthStatePath(ADMIN_EU);
  if (!fs.existsSync(euPath)) {
    throw new Error(
      `Missing EU auth at ${euPath}. Run: npm run login (signs into US and EU)`
    );
  }
  return { usPath, euPath };
}
