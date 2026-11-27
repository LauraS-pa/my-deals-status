function productKey(appId, region, name) {
  return `${appId}::${region}::${name}`;
}

function collectProducts(status) {
  const set = new Set();
  for (const app of status.apps || []) {
    for (const [region, products] of Object.entries(app.live || {})) {
      for (const name of products || []) {
        set.add(productKey(app.id, region, name));
      }
    }
  }
  return set;
}

function labelFromKey(key) {
  const [appId, region, ...rest] = key.split("::");
  return `${appId} / ${region}: ${rest.join("::")}`;
}

/** Build a short plain-language change summary. */
export function buildChangeSummary(previous, next, { isBaseline = false } = {}) {
  if (isBaseline || !previous?.lastChecked) {
    const counts = (next.apps || []).map((app) => {
      const liveCount = Object.values(app.live || {}).reduce(
        (sum, list) => sum + (list?.length || 0),
        0
      );
      return `${app.name}: ${liveCount} live`;
    });
    return `Baseline check completed. ${counts.join("; ")}.`;
  }

  const before = collectProducts(previous);
  const after = collectProducts(next);
  const added = [...after].filter((key) => !before.has(key));
  const removed = [...before].filter((key) => !after.has(key));

  if (added.length === 0 && removed.length === 0) {
    return "No changes since the previous check — live product lists are unchanged.";
  }

  const parts = [];
  if (added.length) {
    const sample = added.slice(0, 8).map(labelFromKey);
    parts.push(
      `Added (${added.length}): ${sample.join("; ")}${
        added.length > 8 ? "; …" : ""
      }`
    );
  }
  if (removed.length) {
    const sample = removed.slice(0, 8).map(labelFromKey);
    parts.push(
      `Removed (${removed.length}): ${sample.join("; ")}${
        removed.length > 8 ? "; …" : ""
      }`
    );
  }
  return parts.join(" ");
}
