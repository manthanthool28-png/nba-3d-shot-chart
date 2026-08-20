import { legendFor } from '../scene/colorEncoding.js';
import { ZONE_GROUPS } from '../data/zones.js';
import { statChip } from './statGlossary.js';
import { ZONE_COLORS } from '../data/zoneColors.js';

export function renderOverlay(container, { name, season, seasonType, shownCount, totalCount, fgPct, colorMode, palette, teamColor, zoneEfg, leagueEfg, compareLabel, outcomeFilter = 'all' }) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.innerHTML = `<strong>${name}</strong> — ${season}${seasonType === 'Playoffs' ? ' (Playoffs)' : ''}`;
  container.appendChild(header);

  const stats = document.createElement('div');
  stats.appendChild(document.createTextNode(`${totalCount} shots · ${(fgPct * 100).toFixed(1)}% `));
  stats.appendChild(statChip('FG%', 'FG%'));
  stats.appendChild(document.createTextNode(` (${shownCount} plotted)`));
  container.appendChild(stats);

  if (compareLabel) {
    const cmp = document.createElement('div');
    cmp.className = 'hint';
    cmp.textContent = compareLabel;
    container.appendChild(cmp);
  }

  const legend = document.createElement('div');
  legend.className = 'legend';
  for (const entry of legendFor(colorMode, palette, teamColor)) {
    const span = document.createElement('span');
    span.className = 'dot';
    span.style.background = `#${entry.color.toString(16).padStart(6, '0')}`;
    legend.appendChild(span);
    legend.appendChild(document.createTextNode(`${entry.label} `));
  }
  container.appendChild(legend);

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.appendChild(document.createTextNode('Every marker is one real shot. Taller spikes = areas where they score more efficiently '));
  hint.appendChild(statChip('eFG%'));
  hint.appendChild(document.createTextNode(' · thicker = more attempts'));
  container.appendChild(hint);

  const outcomeFiltered = outcomeFilter !== 'all';
  if (outcomeFiltered) {
    const note = document.createElement('div');
    note.className = 'hint filter-warning';
    note.textContent = outcomeFilter === 'made'
      ? 'Showing made shots only — the zone figures below are 100% by definition, not season efficiency.'
      : 'Showing missed shots only — the zone figures below are 0% by definition, not season efficiency.';
    container.appendChild(note);
  }

  if (leagueEfg) {
    for (const [key, group] of Object.entries(ZONE_GROUPS)) {
      const playerVal = zoneEfg[key] ?? 0;
      const leagueVal = leagueEfg[key] ?? 0;
      const row = document.createElement('div');
      row.className = 'percentile-bar';
      // Every zone gets its own colour chip, so Paint / Mid-Range / 3PT are
      // recognisable by colour alone and match their filter buttons.
      const label = document.createElement('span');
      label.appendChild(statChip(group.label));
      const track = document.createElement('div');
      track.className = 'percentile-track';
      const fill = document.createElement('div');
      fill.className = 'percentile-fill';
      fill.style.width = `${Math.min(playerVal / 0.7, 1) * 100}%`;
      fill.style.background = ZONE_COLORS[key]; // same colour as this zone's filter
      track.appendChild(fill);
      if (!outcomeFiltered) {
        const leagueMark = document.createElement('div');
        leagueMark.className = 'percentile-league';
        leagueMark.style.left = `${Math.min(leagueVal / 0.7, 1) * 100}%`;
        track.appendChild(leagueMark);
      }
      const pct = document.createElement('span');
      pct.textContent = `${(playerVal * 100).toFixed(0)}%`;
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(pct);
      container.appendChild(row);
    }
  }

}

export function renderCallouts(container, callouts) {
  container.innerHTML = '';
  // Hide the whole collapsible wrap (tab included) when there is nothing to show.
  container.closest('.collapsible-wrap')?.classList.toggle('hidden', !callouts?.length);
  if (!callouts?.length) return;
  const list = document.createElement('ul');
  list.style.margin = '0';
  list.style.paddingLeft = '16px';
  for (const text of callouts.slice(0, 3)) {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  }
  container.appendChild(list);
}
