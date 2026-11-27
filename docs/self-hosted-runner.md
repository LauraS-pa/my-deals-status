# Self-hosted runner setup (VPN machine)

The weekly check must run on a machine that can reach `fpadminui-us.planetart.com` / `admin-fp.planetart.com` and keep an admin login session.

## 1. Machine requirements

- Windows, macOS, or Linux that’s **on corp network / VPN** when the job runs
- Prefer an always-on box so Monday 11am Pacific doesn’t depend on a laptop lid
- Node.js 20+
- Git

## 2. One-time auth (on that machine)

```bash
git clone https://github.com/LauraS-pa/my-deals-status.git
cd my-deals-status
npm ci
npx playwright install chromium
npm run login
```

A browser window opens. Log into the admin UI, dismiss any expired-session dialogs, confirm you can see My Deals, then press **Enter** in the terminal.

Auth is saved to (Windows runner default):

- `C:\actions-runner\my-deals-auth\storage-us.json`
- `C:\actions-runner\my-deals-auth\storage-eu.json`

`npm run login` signs into **both** the US and EU admin UIs. After login, grant read access if needed:

```powershell
icacls "C:\actions-runner\my-deals-auth" /grant "NT AUTHORITY\NETWORK SERVICE:(OI)(CI)R" /T
```

Re-run `npm run login` whenever the weekly job fails with a session-expired error.

Optional: override with env `MYDEALS_AUTH_DIR`.

## 3. Register the GitHub runner

1. Open https://github.com/LauraS-pa/my-deals-status/settings/actions/runners/new  
2. Follow GitHub’s install steps for your OS  
3. Use the default `self-hosted` label (the workflow expects `runs-on: self-hosted`)  
4. Install the runner as a **service** so it starts on boot  

Keep this machine on VPN (or corp network) at least around Monday 11:00 Pacific.

## 4. Verify

From the Actions tab, run **Weekly My Deals check** → **Run workflow**.

Or locally on the runner machine:

```bash
npm run check:dry   # print result, don’t write
npm run check       # update data/status.json
```

## 5. Keeping access stable

| Do | Don’t |
|----|--------|
| Keep the runner online + VPN connected on schedule | Paste passwords into the workflow YAML |
| Re-login with `npm run login` when sessions expire | Commit `storage.json` to git |
| Use a dedicated always-on VPN machine if possible | Rely on Cursor Cloud for this check |

Session cookies still expire; re-login is expected occasionally. That’s still more stable than cloud agents outside the VPN.
