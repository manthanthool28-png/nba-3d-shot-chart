import { legendFor } from '../scene/colorEncoding.js';
import { ZONE_GROUPS } from '../data/zones.js';

export function renderOverlay(container, { name, season, seasonType, shownCount, totalCount, fgPct, colorMode, palette, teamColor, zoneEfg, leagueEfg, compareLabel }) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.innerHTML = `<strong>${name}</strong> — ${season}${seasonType === 'Playoffs' ? ' (Playoffs)' : ''}`;
  container.appendChild(header);

  const stats = document.createElement('div');
  stats.textContent = `${totalCount} shots · ${(fgPct * 100).toFixed(1)}% FG (${shownCount} plotted)`;
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
  hint.textContent = 'Every marker is one real shot. Taller spikes = areas where they score more efficiently (eFG%) · thicker = more attempts';
  container.appendChild(hint);

  if (leagueEfg) {
    for (const [key, group] of Object.entries(ZONE_GROUPS)) {
      const playerVal = zoneEfg[key] ?? 0;
      const leagueVal = leagueEfg[key] ?? 0;
      const row = document.createElement('div');
      row.className = 'percentile-bar';
      const label = document.createElement('span');
      label.textContent = group.label;
      const track = document.createElement('div');
      track.className = 'percentile-track';
      const fill = document.createElement('div');
      fill.className = 'percentile-fill';
      fill.style.width = `${Math.min(playerVal / 0.7, 1) * 100}%`;
      const leagueMark = document.createElement('div');
      leagueMark.className = 'percentile-league';
      leagueMark.style.left = `${Math.min(leagueVal / 0.7, 1) * 100}%`;
      track.appendChild(fill);
      track.appendChild(leagueMark);
      const pct = document.createElement('span');
      pct.textContent = `${(playerVal * 100).toFixed(0)}%`;
      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(pct);
      container.appendChild(row);
    }
  }

  const controlsHint = document.createElement('div');
  controlsHint.className = 'hint';
  controlsHint.textContent = 'Drag to orbit · scroll to zoom · click a shot for detail · ⚙ for settings';
  container.appendChild(controlsHint);
}

export function renderCallouts(container, callouts) {
  container.innerHTML = '';
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
