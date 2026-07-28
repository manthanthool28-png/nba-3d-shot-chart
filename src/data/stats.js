import { zoneGroupOf, ZONE_GROUPS } from './zones.js';

// Chronological order within a season: by date, then period, then game
// clock counting down (higher minutes/seconds = earlier in the period).
export function sortChronological(shots) {
  return [...shots].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.gameId !== b.gameId) return a.gameId < b.gameId ? -1 : 1;
    if (a.period !== b.period) return a.period - b.period;
    const aClock = a.minutesRemaining * 60 + a.secondsRemaining;
    const bClock = b.minutesRemaining * 60 + b.secondsRemaining;
    return bClock - aClock;
  });
}

export function periodLabel(period) {
  if (period <= 4) return `Q${period}`;
  return period === 5 ? 'OT' : `${period - 4}OT`;
}

// Marks shots that are part of a streak of >=3 consecutive makes, in
// chronological order, so the renderer can add a glow to that cluster.
export function findHotStreaks(chronologicalShots, minLength = 3) {
  const streakIds = new Set();
  let run = [];
  for (const shot of chronologicalShots) {
    if (shot.made) {
      run.push(shot);
    } else {
      if (run.length >= minLength) run.forEach((s) => streakIds.add(s.id));
      run = [];
    }
  }
  if (run.length >= minLength) run.forEach((s) => streakIds.add(s.id));
  return streakIds;
}

export function buildCallouts(shots, leagueEfg) {
  const callouts = [];
  const byGroup = { paint: [], mid: [], three: [] };
  for (const shot of shots) {
    const key = zoneGroupOf(shot);
    if (key) byGroup[key].push(shot);
  }

  const cornerThrees = shots.filter((s) => s.zone === 'Left Corner 3' || s.zone === 'Right Corner 3');
  if (cornerThrees.length >= 5) {
    const pct = (cornerThrees.filter((s) => s.made).length / cornerThrees.length) * 100;
    callouts.push(`${pct.toFixed(0)}% on corner threes (${cornerThrees.length} attempts)`);
  }

  for (const [key, group] of Object.entries(byGroup)) {
    if (group.length < 10) continue;
    const made = group.filter((s) => s.made).length;
    const threePM = group.filter((s) => s.made && s.shotType === '3PT Field Goal').length;
    const efg = (made + 0.5 * threePM) / group.length;
    const label = ZONE_GROUPS[key].label;
    const vsLeague = efg - (leagueEfg?.[key] ?? efg);
    const diffText = vsLeague >= 0 ? `${(vsLeague * 100).toFixed(1)} pts above league avg` : `${(Math.abs(vsLeague) * 100).toFixed(1)} pts below league avg`;
    callouts.push(`${(efg * 100).toFixed(1)}% eFG in the ${label} — ${diffText}`);
  }

  const busiest = Object.entries(byGroup).sort((a, b) => b[1].length - a[1].length)[0];
  if (busiest && busiest[1].length) {
    const pct = (busiest[1].length / shots.length) * 100;
    callouts.push(`${ZONE_GROUPS[busiest[0]].label} is the most-used zone — ${pct.toFixed(0)}% of attempts`);
  }

  return callouts;
}
