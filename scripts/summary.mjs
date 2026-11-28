function listFor(app, region) {
  const list = app?.live?.[region];
  return Array.isArray(list) ? list.filter(Boolean) : [];
}

function sampleNames(names, limit = 6) {
  if (names.length <= limit) return names.join("; ");
  return `${names.slice(0, limit).join("; ")}; …`;
}

function describeRegionChanges(region, prevList, nextList) {
  const prevSet = new Set(prevList);
  const nextSet = new Set(nextList);
  const enabled = nextList.filter((name) => !prevSet.has(name));
  const disabled = prevList.filter((name) => !nextSet.has(name));

  const parts = [];
  if (enabled.length) {
    parts.push(`enabled ${sampleNames(enabled)}`);
  }
  if (disabled.length) {
    parts.push(`disabled ${sampleNames(disabled)}`);
  }

  if (!parts.length) return null;
  return `${region}: ${parts.join("; ")}`;
}

/** Build a short per-app change summary (enabled / disabled only). */
export function buildAppChangeSummary(prevApp, nextApp, { isBaseline = false } = {}) {
  if (isBaseline || !prevApp) {
    const liveCount = Object.values(nextApp.live || {}).reduce(
      (sum, list) => sum + (list?.length || 0),
      0
    );
    return `Baseline check — ${liveCount} live products across regions.`;
  }

  const regions = [
    ...new Set([...(prevApp.regions || []), ...(nextApp.regions || [])]),
  ];

  const bits = [];
  for (const region of regions) {
    const bit = describeRegionChanges(
      region,
      listFor(prevApp, region),
      listFor(nextApp, region)
    );
    if (bit) bits.push(bit);
  }

  if (!bits.length) return "No notable changes.";
  return bits.join(" ");
}

/** Attach changeSummary onto each app in `next` using `previous` as baseline. */
export function applyAppChangeSummaries(previous, next) {
  const isBaseline = !previous?.lastChecked;
  const prevById = new Map((previous?.apps || []).map((app) => [app.id, app]));

  return {
    ...next,
    apps: (next.apps || []).map((app) => ({
      ...app,
      changeSummary: buildAppChangeSummary(prevById.get(app.id), app, {
        isBaseline,
      }),
    })),
  };
}
