import { zoneGroupOf } from './zones.js';
import { actionBucketOf } from './actionTypes.js';

// "Late game" approximates the spec's clutch filter using only data this
// endpoint actually provides (period + game clock). It does NOT check score
// margin — nba_api's shot chart endpoint has no live score, so true clutch
// (period + clock + within 5 pts) isn't derivable without a per-game
// play-by-play merge, which is out of scope here.
function isLateGame(shot) {
  return shot.period >= 4 && shot.minutesRemaining < 5;
}

export function applyFilters(shots, filters) {
  return shots.filter((shot) => {
    if (filters.zoneGroup !== 'all' && zoneGroupOf(shot) !== filters.zoneGroup) return false;
    if (filters.actionBucket !== 'all' && actionBucketOf(shot) !== filters.actionBucket) return false;
    if (filters.outcome === 'made' && !shot.made) return false;
    if (filters.outcome === 'missed' && shot.made) return false;
    if (filters.homeAway === 'home' && !shot.isHome) return false;
    if (filters.homeAway === 'away' && shot.isHome) return false;
    if (filters.quarter !== 'all') {
      const q = Number(filters.quarter);
      if (q === 5 ? shot.period < 5 : shot.period !== q) return false;
    }
    if (filters.lateGame && !isLateGame(shot)) return false;
    if (filters.gameId !== 'all' && shot.gameId !== filters.gameId) return false;
    if (filters.dateRange) {
      const [start, end] = filters.dateRange;
      if (shot.date < start || shot.date > end) return false;
    }
    return true;
  });
}
