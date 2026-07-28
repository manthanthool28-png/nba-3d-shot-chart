// BASE_URL-aware so the app works both at the dev-server root and hosted
// under a subpath (e.g. GitHub Pages at /repo-name/).
const BASE = import.meta.env.BASE_URL;

export async function loadManifest() {
  const res = await fetch(`${BASE}data/manifest.json`);
  if (!res.ok) throw new Error(`Failed to load manifest (${res.status})`);
  return res.json();
}

export async function loadDataset(entry) {
  const res = await fetch(`${BASE}data/${entry.file}`);
  if (!res.ok) throw new Error(`Failed to load ${entry.file} (${res.status})`);
  const data = await res.json();
  data.shots.forEach((shot, i) => {
    shot.id = i;
  });
  return data;
}
