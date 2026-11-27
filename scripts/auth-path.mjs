import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Shared path the Windows runner service (NETWORK SERVICE) can read. */
export const DEFAULT_WINDOWS_AUTH_PATH =
  "C:\\actions-runner\\my-deals-auth\\storage.json";

/**
 * Auth state must live outside the Actions checkout so it survives clean workspaces.
 * Override with MYDEALS_AUTH_STATE.
 */
export function getAuthStatePath() {
  const override = process.env.MYDEALS_AUTH_STATE?.trim();
  if (override) {
    return path.resolve(override);
  }
  if (process.platform === "win32") {
    return DEFAULT_WINDOWS_AUTH_PATH;
  }
  return path.join(os.homedir(), ".my-deals-status", "storage.json");
}

export function assertAuthStateExists() {
  const authPath = getAuthStatePath();
  if (!fs.existsSync(authPath)) {
    throw new Error(
      `Missing auth state at ${authPath}. On the runner machine, run: npm run login`
    );
  }
  return authPath;
}
