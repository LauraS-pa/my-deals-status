import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Auth state must live outside the Actions checkout so it survives clean workspaces.
 * Override with MYDEALS_AUTH_STATE.
 */
export function getAuthStatePath() {
  const override = process.env.MYDEALS_AUTH_STATE?.trim();
  if (override) {
    return path.resolve(override);
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
