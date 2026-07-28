// Groups nba_api's SHOT_ZONE_BASIC values into the coarse buckets the UI
// filters and height encoding operate on. Free throws aren't included here:
// they carry no court location (shotchartdetail is fetched with FGA only),
// so there's nothing spatial to plot or filter for them.
export const ZONE_GROUPS = {
  paint: { label: 'Paint', zones: ['Restricted Area', 'In The Paint (Non-RA)'] },
  mid: { label: 'Mid-Range', zones: ['Mid-Range'] },
  three: { label: '3PT', zones: ['Above the Break 3', 'Left Corner 3', 'Right Corner 3'] },
};

export function zoneGroupOf(shot) {
  for (const [key, group] of Object.entries(ZONE_GROUPS)) {
    if (group.zones.includes(shot.zone)) return key;
  }
  return null;
}

// eFG% = (FGM + 0.5 * 3PM) / FGA, computed per zone group so every shot in
// the same group shares one height value.
export function computeZoneEfg(shots) {
  const stats = {};
  for (const key of Object.keys(ZONE_GROUPS)) {
    stats[key] = { fga: 0, fgm: 0, tpm: 0 };
  }

  for (const shot of shots) {
    const key = zoneGroupOf(shot);
    if (!key) continue;
    const s = stats[key];
    s.fga += 1;
    if (shot.made) {
      s.fgm += 1;
      if (shot.shotType === '3PT Field Goal') s.tpm += 1;
    }
  }

  const efg = {};
  for (const [key, s] of Object.entries(stats)) {
    efg[key] = s.fga > 0 ? (s.fgm + 0.5 * s.tpm) / s.fga : 0;
  }
  return efg;
}
