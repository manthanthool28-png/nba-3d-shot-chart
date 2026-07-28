import * as d3 from 'd3';
import { ZONE_GROUPS, zoneGroupOf } from '../data/zones.js';
import { ACTION_TYPE_LABELS, actionBucketOf } from '../data/actionTypes.js';
import { periodLabel } from '../data/stats.js';
import { legendFor } from '../scene/colorEncoding.js';
import { createSplitView2D } from './splitView2d.js';

// 2D stat-chart dashboard for readers who think in classic NBA stats.
// Renders against the same filtered shot slice as the 3D view; the ⚙ table
// view remains the accessible raw-data twin of every chart here.

// Chart ink/chrome + validated categorical slots for the dark surface
// (worst adjacent CVD ΔE 41.3, all >= 3:1 contrast on #14141c).
const INK = { primary: '#ffffff', secondary: '#c3c2b7', muted: '#898781', grid: '#2c2c2a', baseline: '#383835' };
const SERIES = { blue: '#3987e5', aqua: '#199e70', yellow: '#c98500' };
const ZONE_COLORS = { paint: SERIES.blue, mid: SERIES.aqua, three: SERIES.yellow };

const FONT = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;';

function fgPct(shots) {
  return shots.length ? shots.filter((s) => s.made).length / shots.length : 0;
}

function efgPct(shots) {
  if (!shots.length) return 0;
  const made = shots.filter((s) => s.made).length;
  const made3 = shots.filter((s) => s.made && s.shotType === '3PT Field Goal').length;
  return (made + 0.5 * made3) / shots.length;
}

function pct(v, digits = 1) {
  return `${(v * 100).toFixed(digits)}%`;
}

// ---- shared tooltip (reuses the app's #tooltip element) ----
const tipEl = () => document.querySelector('#tooltip');
function showTip(event, html) {
  const tip = tipEl();
  tip.innerHTML = html;
  tip.style.left = `${event.clientX}px`;
  tip.style.top = `${event.clientY - 8}px`;
  tip.classList.remove('hidden');
}
function hideTip() {
  tipEl().classList.add('hidden');
}

function card(parent, title, subtitle) {
  const el = document.createElement('div');
  el.className = 'chart-card';
  const h = document.createElement('h4');
  h.textContent = title;
  el.appendChild(h);
  if (subtitle) {
    const sub = document.createElement('div');
    sub.className = 'chart-sub';
    sub.textContent = subtitle;
    el.appendChild(sub);
  }
  parent.appendChild(el);
  return el;
}

function svgIn(el, height) {
  const width = Math.max(el.clientWidth - 24, 280);
  const svg = d3.select(el).append('svg')
    .attr('width', '100%')
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  return { svg, width };
}

function svgLabel(svg, x, y, text, { fill = INK.muted, size = 13, anchor = 'start', weight = 400, tabular = false } = {}) {
  return svg.append('text')
    .attr('x', x).attr('y', y)
    .attr('fill', fill)
    .attr('text-anchor', anchor)
    .attr('style', `${FONT} font-size:${size}px; font-weight:${weight};${tabular ? ' font-variant-numeric: tabular-nums;' : ''}`)
    .text(text);
}

// ---- KPI row ----
function renderKpis(parent, shots) {
  const att = shots.length;
  const made2 = shots.filter((s) => s.made && s.shotType !== '3PT Field Goal').length;
  const made3 = shots.filter((s) => s.made && s.shotType === '3PT Field Goal').length;
  const att3 = shots.filter((s) => s.shotType === '3PT Field Goal').length;
  const kpis = [
    { v: String(att), l: 'FGA' },
    { v: att ? pct(fgPct(shots)) : '—', l: 'FG%' },
    { v: att ? pct(efgPct(shots)) : '—', l: 'eFG%' },
    { v: att3 ? pct(made3 / att3) : '—', l: '3P%' },
    { v: att ? ((2 * made2 + 3 * made3) / att).toFixed(2) : '—', l: 'Points per shot' },
  ];
  const row = document.createElement('div');
  row.className = 'kpi-row';
  for (const k of kpis) {
    const tile = document.createElement('div');
    tile.className = 'kpi';
    tile.innerHTML = `<div class="v">${k.v}</div><div class="l">${k.l}</div>`;
    row.appendChild(tile);
  }
  parent.appendChild(row);
}

// ---- classic 2D shot chart ----
function renderCourtCard(parent, shots, colorOpts) {
  const el = card(parent, 'Shot chart', 'Every attempt in the current filter');
  const wrap = document.createElement('div');
  wrap.className = 'court2d';
  el.appendChild(wrap);

  const legend = document.createElement('div');
  legend.className = 'stats-legend';
  for (const entry of legendFor(colorOpts.colorMode, colorOpts.palette, colorOpts.teamColor)) {
    const item = document.createElement('span');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = `#${entry.color.toString(16).padStart(6, '0')}`;
    item.appendChild(dot);
    item.appendChild(document.createTextNode(entry.label));
    legend.appendChild(item);
  }
  el.appendChild(legend);

  const view = createSplitView2D(wrap);
  view.setHoverCallback((shot) => {
    if (!shot) { hideTip(); return; }
    const clock = `${shot.minutesRemaining}:${String(shot.secondsRemaining).padStart(2, '0')}`;
    showTip(window.event ?? { clientX: 0, clientY: 0 },
      `<strong>${shot.made ? 'Made' : 'Missed'}</strong> ${shot.distanceFt}ft ${shot.actionType}<br>${periodLabel(shot.period)} ${clock} · ${shot.isHome ? 'vs' : '@'} ${shot.opponent}`);
  });
  view.render(shots, colorOpts);
}

// ---- eFG% by zone vs league average ----
function renderZoneEfg(parent, shots, leagueEfg) {
  const el = card(parent, 'eFG% by zone', 'White tick = league average');
  const rows = Object.entries(ZONE_GROUPS).map(([key, group]) => {
    const zoneShots = shots.filter((s) => zoneGroupOf(s) === key);
    return { key, label: group.label, att: zoneShots.length, efg: efgPct(zoneShots), league: leagueEfg?.[key] };
  });

  const rowH = 30;
  const mL = 78;
  const mR = 56;
  const height = rows.length * rowH + 8;
  const { svg, width } = svgIn(el, height);
  const x = d3.scaleLinear()
    .domain([0, Math.max(0.65, d3.max(rows, (r) => Math.max(r.efg, r.league ?? 0)) * 1.1)])
    .range([mL, width - mR]);

  rows.forEach((r, i) => {
    const y = i * rowH + 6;
    svgLabel(svg, mL - 8, y + 13, r.label, { anchor: 'end', fill: INK.secondary });
    svg.append('rect')
      .attr('x', x(0)).attr('y', y).attr('width', Math.max(x(r.efg) - x(0), 1)).attr('height', 18)
      .attr('rx', 3).attr('fill', SERIES.blue)
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${pct(r.efg)} eFG on ${r.att} attempts${r.league != null ? `<br>League avg ${pct(r.league)}` : ''}`))
      .on('mouseleave', hideTip);
    if (r.league != null) {
      svg.append('rect')
        .attr('x', x(r.league) - 1).attr('y', y - 3).attr('width', 2).attr('height', 24)
        .attr('fill', INK.primary);
    }
    // Value label sits clear of both the bar end and the league tick.
    const labelX = Math.max(x(r.efg), r.league != null ? x(r.league) : 0) + 7;
    svgLabel(svg, labelX, y + 13, r.att ? pct(r.efg) : 'no attempts', { fill: INK.primary, weight: 600, tabular: true });
  });
}

// ---- attempt share by zone (part-to-whole) ----
function renderZoneShare(parent, shots) {
  const el = card(parent, 'Where the shots come from', 'Share of attempts by zone');
  const total = shots.length || 1;
  const rows = Object.entries(ZONE_GROUPS).map(([key, group]) => ({
    key, label: group.label, share: shots.filter((s) => zoneGroupOf(s) === key).length / total,
  }));

  const height = 66;
  const { svg, width } = svgIn(el, height);
  let cursor = 0;
  const gap = 2;
  rows.forEach((r) => {
    const w = Math.max(r.share * (width - gap * (rows.length - 1)), 0);
    svg.append('rect')
      .attr('x', cursor).attr('y', 8).attr('width', w).attr('height', 26).attr('rx', 3)
      .attr('fill', ZONE_COLORS[r.key])
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${pct(r.share)} of attempts`))
      .on('mouseleave', hideTip);
    // Label inside only when it fits; otherwise leave it to the legend row.
    if (w > 78) {
      svgLabel(svg, cursor + w / 2, 25, `${r.label} ${pct(r.share, 0)}`, { anchor: 'middle', fill: INK.primary, weight: 600 });
    }
    cursor += w + gap;
  });

  rows.forEach((r, i) => {
    const lx = i * 110 + 2;
    svg.append('circle').attr('cx', lx + 4).attr('cy', 52).attr('r', 4).attr('fill', ZONE_COLORS[r.key]);
    svgLabel(svg, lx + 12, 56, `${r.label} ${pct(r.share, 0)}`, { fill: INK.secondary });
  });
}

// ---- FG% by quarter ----
function renderQuarters(parent, shots) {
  const el = card(parent, 'FG% by quarter');
  const groups = d3.groups(shots, (s) => Math.min(s.period, 5)).sort((a, b) => a[0] - b[0]);
  const rows = groups.map(([p, g]) => ({ label: p === 5 ? 'OT' : periodLabel(p), att: g.length, fg: fgPct(g) }));
  if (!rows.length) { svgLabel(svgIn(el, 30).svg, 0, 18, 'No shots match the current filters'); return; }

  const plotH = 110;
  const height = plotH + 30;
  const { svg, width } = svgIn(el, height);
  const x = d3.scaleBand().domain(rows.map((r) => r.label)).range([8, width - 8]).paddingInner(0.35).paddingOuter(0.15);
  const y = d3.scaleLinear().domain([0, Math.max(0.65, d3.max(rows, (r) => r.fg) * 1.15)]).range([plotH + 8, 14]);

  for (const gv of [0.25, 0.5]) {
    svg.append('line').attr('x1', 8).attr('x2', width - 8).attr('y1', y(gv)).attr('y2', y(gv))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
  }
  svg.append('line').attr('x1', 8).attr('x2', width - 8).attr('y1', y(0)).attr('y2', y(0))
    .attr('stroke', INK.baseline).attr('stroke-width', 1);

  rows.forEach((r) => {
    svg.append('rect')
      .attr('x', x(r.label)).attr('y', y(r.fg))
      .attr('width', x.bandwidth()).attr('height', Math.max(y(0) - y(r.fg), 1))
      .attr('rx', 3).attr('fill', SERIES.blue)
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${pct(r.fg)} FG on ${r.att} attempts`))
      .on('mouseleave', hideTip);
    svgLabel(svg, x(r.label) + x.bandwidth() / 2, y(r.fg) - 5, pct(r.fg, 0), { anchor: 'middle', fill: INK.primary, weight: 600, tabular: true });
    svgLabel(svg, x(r.label) + x.bandwidth() / 2, plotH + 24, r.label, { anchor: 'middle' });
  });
}

// ---- FG% by distance ----
function renderDistance(parent, shots) {
  const el = card(parent, 'FG% by distance', '3 ft bins · bins under 5 attempts hidden');
  const BIN = 3;
  const byBin = d3.groups(shots, (s) => Math.min(Math.floor(s.distanceFt / BIN) * BIN, 33))
    .map(([d, g]) => ({ d, att: g.length, fg: fgPct(g) }))
    .filter((b) => b.att >= 5)
    .sort((a, b) => a.d - b.d);
  if (byBin.length < 2) { svgLabel(svgIn(el, 30).svg, 0, 18, 'Not enough shots for a distance curve'); return; }

  const plotH = 110;
  const height = plotH + 32;
  const { svg, width } = svgIn(el, height);
  const x = d3.scaleLinear().domain([0, d3.max(byBin, (b) => b.d) + BIN]).range([34, width - 12]);
  const y = d3.scaleLinear().domain([0, Math.max(0.75, d3.max(byBin, (b) => b.fg) * 1.1)]).range([plotH + 6, 12]);

  for (const gv of [0.25, 0.5, 0.75]) {
    svg.append('line').attr('x1', 34).attr('x2', width - 12).attr('y1', y(gv)).attr('y2', y(gv))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
    svgLabel(svg, 28, y(gv) + 4, pct(gv, 0), { anchor: 'end', size: 12, tabular: true });
  }
  svg.append('line').attr('x1', 34).attr('x2', width - 12).attr('y1', y(0)).attr('y2', y(0))
    .attr('stroke', INK.baseline).attr('stroke-width', 1);

  const line = d3.line().x((b) => x(b.d + BIN / 2)).y((b) => y(b.fg)).curve(d3.curveMonotoneX);
  svg.append('path').attr('d', line(byBin)).attr('fill', 'none').attr('stroke', SERIES.blue).attr('stroke-width', 2);

  const marker = svg.append('circle').attr('r', 4).attr('fill', SERIES.blue)
    .attr('stroke', '#14141c').attr('stroke-width', 2).style('opacity', 0);

  byBin.forEach((b) => {
    svg.append('rect')
      .attr('x', x(b.d)).attr('y', 0).attr('width', x(b.d + BIN) - x(b.d)).attr('height', plotH + 6)
      .attr('fill', 'transparent')
      .on('mouseenter', (event) => {
        marker.attr('cx', x(b.d + BIN / 2)).attr('cy', y(b.fg)).style('opacity', 1);
        showTip(event, `<strong>${b.d}–${b.d + BIN} ft</strong>: ${pct(b.fg)} FG on ${b.att} attempts`);
      })
      .on('mouseleave', () => { marker.style('opacity', 0); hideTip(); });
  });

  for (const tick of [0, 10, 20, 30]) {
    svgLabel(svg, x(tick), plotH + 24, `${tick} ft`, { anchor: 'middle', size: 12, tabular: true });
  }
}

// ---- shot-type mix ----
function renderTypeMix(parent, shots) {
  const el = card(parent, 'Shot types', 'Attempts · FG% at the bar end');
  const rows = Object.entries(ACTION_TYPE_LABELS)
    .map(([key, label]) => {
      const g = shots.filter((s) => actionBucketOf(s) === key);
      return { label, att: g.length, fg: fgPct(g) };
    })
    .filter((r) => r.att > 0)
    .sort((a, b) => b.att - a.att);
  if (!rows.length) { svgLabel(svgIn(el, 30).svg, 0, 18, 'No shots match the current filters'); return; }

  const rowH = 26;
  const mL = 78;
  const mR = 92;
  const height = rows.length * rowH + 6;
  const { svg, width } = svgIn(el, height);
  const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.att)]).range([mL, width - mR]);

  rows.forEach((r, i) => {
    const y = i * rowH + 4;
    svgLabel(svg, mL - 8, y + 12, r.label, { anchor: 'end', fill: INK.secondary });
    svg.append('rect')
      .attr('x', x(0)).attr('y', y).attr('width', Math.max(x(r.att) - x(0), 1)).attr('height', 16)
      .attr('rx', 3).attr('fill', SERIES.blue)
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${r.att} attempts · ${pct(r.fg)} FG`))
      .on('mouseleave', hideTip);
    svgLabel(svg, x(r.att) + 6, y + 12, `${r.att} · ${pct(r.fg, 0)}`, { fill: INK.primary, weight: 600, tabular: true });
  });
}

export function renderStatsView(container, { shots, dataset, colorOpts, onClose }) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'stats-header';
  const title = document.createElement('h3');
  title.textContent = `${dataset.name} — ${dataset.season} · 2D stat charts`;
  const note = document.createElement('span');
  note.className = 'stats-note';
  note.textContent = `${shots.length} shots in the current filter · raw data in ⚙ → Table view`;
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', onClose);
  header.appendChild(title);
  header.appendChild(note);
  header.appendChild(closeBtn);
  container.appendChild(header);

  renderKpis(container, shots);

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  container.appendChild(grid);

  renderCourtCard(grid, shots, colorOpts);
  renderZoneEfg(grid, shots, dataset.leagueEfg);
  renderZoneShare(grid, shots);
  renderQuarters(grid, shots);
  renderDistance(grid, shots);
  renderTypeMix(grid, shots);
}
