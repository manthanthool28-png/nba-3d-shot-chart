import * as d3 from 'd3';
import { ZONE_GROUPS, zoneGroupOf } from '../data/zones.js';
import { ACTION_TYPE_LABELS, actionBucketOf } from '../data/actionTypes.js';
import { periodLabel } from '../data/stats.js';
import { legendFor } from '../scene/colorEncoding.js';
import { createSplitView2D } from './splitView2d.js';
import { statChip } from './statGlossary.js';
import { ZONE_COLORS } from '../data/zoneColors.js';

// 2D stat-chart dashboard for readers who think in classic NBA stats.
// Renders against the same filtered shot slice as the 3D view; the ⚙ table
// view remains the accessible raw-data twin of every chart here.

// Chart ink/chrome + validated categorical slots for the dark surface
// (worst adjacent CVD ΔE 41.3, all >= 3:1 contrast on #14141c).
const INK = { primary: '#ffffff', secondary: '#d5d4cb', muted: '#b3b1a8', grid: '#2c2c2a', baseline: '#383835' };
const SERIES = { blue: '#3987e5', aqua: '#199e70', yellow: '#c98500' };

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

function svgLabel(svg, x, y, text, { fill = INK.muted, size = 14, anchor = 'start', weight = 400, tabular = false } = {}) {
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
    const value = document.createElement('div');
    value.className = 'v';
    value.textContent = k.v;
    const label = document.createElement('div');
    label.className = 'l';
    label.appendChild(statChip(k.l)); // glossary keys match the tile labels
    tile.appendChild(value);
    tile.appendChild(label);
    row.appendChild(tile);
  }
  parent.appendChild(row);
}

// ---- classic 2D shot chart ----
function renderCourtCard(el, shots, colorOpts) {
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
// When the view is filtered to makes or misses, eFG% is fixed by the filter,
// so the league-average comparison is dropped and the card says why.
function renderZoneEfg(el, shots, leagueEfg, outcomeFiltered = false) {
  if (outcomeFiltered) {
    const note = document.createElement('div');
    note.className = 'chart-sub filter-warning';
    note.textContent = 'Filtered to one outcome — these are 100%/0% by definition, not season efficiency.';
    el.appendChild(note);
  }
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
      .attr('rx', 3).attr('fill', ZONE_COLORS[r.key])
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${pct(r.efg)} eFG on ${r.att} attempts${r.league != null ? `<br>League avg ${pct(r.league)}` : ''}`))
      .on('mouseleave', hideTip);
    if (r.league != null && !outcomeFiltered) {
      svg.append('rect')
        .attr('x', x(r.league) - 1).attr('y', y - 3).attr('width', 2).attr('height', 24)
        .attr('fill', INK.primary);
    }
    // Value label sits clear of both the bar end and the league tick.
    const labelX = Math.max(x(r.efg), (r.league != null && !outcomeFiltered) ? x(r.league) : 0) + 7;
    svgLabel(svg, labelX, y + 13, r.att ? pct(r.efg) : 'no attempts', { fill: INK.primary, weight: 600, tabular: true });
  });
}

// ---- attempt share by zone (part-to-whole) ----
function renderZoneShare(el, shots) {
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
function renderQuarters(el, shots) {
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
function renderDistance(el, shots) {
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
    svgLabel(svg, 28, y(gv) + 4, pct(gv, 0), { anchor: 'end', size: 13, tabular: true });
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
    svgLabel(svg, x(tick), plotH + 24, `${tick} ft`, { anchor: 'middle', size: 13, tabular: true });
  }
}

// ---- shot-type mix ----
function renderTypeMix(el, shots) {
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

export function renderStatsView(container, { shots, dataset, colorOpts, filters, onFilterChange, onOpenTable, onClose }) {
  container.innerHTML = '';

  // ---- Toolbar: title, filters and actions all live inside the dashboard,
  // so the floating court controls can stay hidden while it is open. ----
  const header = document.createElement('div');
  header.className = 'stats-header';
  const title = document.createElement('h3');
  title.textContent = `${dataset.name} — ${dataset.season}`;
  const note = document.createElement('span');
  note.className = 'stats-note';
  note.textContent = `${shots.length} shots in the current filter`;

  const actions = document.createElement('div');
  actions.className = 'stats-actions';
  if (onOpenTable) {
    const tableBtn = document.createElement('button');
    tableBtn.textContent = 'Table view';
    tableBtn.title = 'See the raw shot-by-shot data as a sortable table';
    tableBtn.addEventListener('click', onOpenTable);
    actions.appendChild(tableBtn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', onClose);
  actions.appendChild(closeBtn);

  header.appendChild(title);
  header.appendChild(note);
  header.appendChild(actions);
  container.appendChild(header);

  // ---- Filter row (mirrors the court's "Show only" pills) ----
  if (filters && onFilterChange) {
    const bar = document.createElement('div');
    bar.className = 'stats-filterbar';
    const label = document.createElement('span');
    label.className = 'stats-filter-label';
    label.textContent = 'Show only';
    bar.appendChild(label);

    const pill = (text, active, patch, tip) => {
      const b = document.createElement('button');
      b.className = `pill${active ? ' active' : ''}`;
      b.textContent = text;
      if (tip) b.title = tip;
      b.setAttribute('aria-pressed', String(active));
      b.addEventListener('click', () => onFilterChange(patch));
      return b;
    };

    bar.appendChild(pill('All', filters.zoneGroup === 'all' && filters.outcome === 'all',
      { zoneGroup: 'all', outcome: 'all' }, 'Show every shot'));
    for (const [key, group] of Object.entries(ZONE_GROUPS)) {
      bar.appendChild(pill(group.label, filters.zoneGroup === key, { zoneGroup: key }));
    }
    bar.appendChild(pill('Made', filters.outcome === 'made',
      { outcome: filters.outcome === 'made' ? 'all' : 'made' }, 'Only shots that went in'));
    bar.appendChild(pill('Missed', filters.outcome === 'missed',
      { outcome: filters.outcome === 'missed' ? 'all' : 'missed' }, 'Only shots that missed'));
    container.appendChild(bar);
  }

  renderKpis(container, shots);

  const grid = document.createElement('div');
  grid.className = 'stats-grid';
  container.appendChild(grid);

  // Create every card first, then fill them. Measuring inside a half-built
  // grid gave the first card the full row width, which parked its chart
  // off-screen and shrank the rest.
  const panels = [
    ['Shot chart', 'Every attempt — where it was taken from', (el) => renderCourtCard(el, shots, colorOpts)],
    ['Shot density', 'Brighter = more attempts from that spot', (el) => renderDensity(el, shots)],
    ['eFG% by zone', 'White tick = league average', (el) => renderZoneEfg(el, shots, dataset.leagueEfg, filters?.outcome !== 'all' && filters?.outcome != null)],
    ['Made vs missed by zone', 'Counts, not percentages', (el) => renderMadeMissed(el, shots)],
    ['Where the shots come from', 'Share of attempts by zone', (el) => renderZoneShare(el, shots)],
    ['Volume vs efficiency', 'How often vs how well, per zone', (el) => renderVolumeEfficiency(el, shots)],
    ['FG% by quarter', null, (el) => renderQuarters(el, shots)],
    ['FG% by month', 'Months with under 10 attempts hidden', (el) => renderMonthlyTrend(el, shots)],
    ['FG% by distance', '3 ft bins · bins under 5 attempts hidden', (el) => renderDistance(el, shots)],
    ['Attempts by distance', 'How many shots from each range', (el) => renderDistanceHistogram(el, shots)],
    ['Home vs away', null, (el) => renderHomeAway(el, shots)],
    ['Shot types', 'Attempts · FG% at the bar end', (el) => renderTypeMix(el, shots)],
  ];
  const cardEls = panels.map(([title, sub]) => card(grid, title, sub));
  panels.forEach(([, , fill], i) => fill(cardEls[i]));
}

// ============================================================
// Additional 2D views
// ============================================================

const COURT_HALF_W = 25;   // x: -25..25 ft
const COURT_LEN = 47;      // z: 0..47 ft (baseline to half-court)

// ---- Shot-density heatmap (square bins over the half court) ----
function renderDensity(el, shots) {
  const BIN = 2.5; // ft
  const height = 300;
  const { svg, width } = svgIn(el, height);
  if (!shots.length) { svgLabel(svg, 8, 20, 'No shots match the current filters'); return; }

  const pad = 16;
  const scale = Math.min((width - pad * 2) / (COURT_HALF_W * 2), (height - pad * 2) / COURT_LEN);
  const ox = width / 2;
  const oy = pad;
  const g = svg.append('g').attr('transform', `translate(${ox},${oy}) scale(${scale})`);

  const bins = new Map();
  for (const s of shots) {
    const bx = Math.floor(s.x / BIN) * BIN;
    const bz = Math.floor(s.z / BIN) * BIN;
    const k = `${bx}:${bz}`;
    const cur = bins.get(k) ?? { bx, bz, n: 0, made: 0 };
    cur.n += 1;
    if (s.made) cur.made += 1;
    bins.set(k, cur);
  }
  const cells = [...bins.values()];
  const maxN = d3.max(cells, (c) => c.n) || 1;
  const color = d3.scaleSequential(d3.interpolateInferno).domain([0, maxN]);

  for (const c of cells) {
    g.append('rect')
      .attr('x', c.bx).attr('y', c.bz).attr('width', BIN).attr('height', BIN)
      .attr('fill', color(c.n)).attr('stroke', 'none')
      .on('mouseenter', (event) => showTip(event, `<strong>${c.n} attempts</strong> here<br>${pct(c.made / c.n)} made`))
      .on('mouseleave', hideTip);
  }

  // Court outline over the bins for orientation
  const line = (pts) => g.append('path').attr('d', d3.line()(pts))
    .attr('fill', 'none').attr('stroke', INK.muted).attr('stroke-width', 0.3).attr('opacity', 0.9);
  line([[-25, 0], [-25, COURT_LEN], [25, COURT_LEN], [25, 0], [-25, 0]]);
  line([[-8, 0], [-8, 19], [8, 19], [8, 0]]);
  g.append('circle').attr('cx', 0).attr('cy', 5.25).attr('r', 0.75)
    .attr('fill', 'none').attr('stroke', '#f0a44f').attr('stroke-width', 0.35);
  const arc = d3.arc().innerRadius(23.75).outerRadius(23.75).startAngle(-Math.PI / 2 - 1.18).endAngle(Math.PI / 2 + 1.18);
  g.append('path').attr('d', arc()).attr('transform', 'translate(0,5.25)')
    .attr('fill', 'none').attr('stroke', INK.muted).attr('stroke-width', 0.3);

  // Legend: light = few attempts, dark = many
  const lw = 120;
  const lg = svg.append('g').attr('transform', `translate(8,${height - 16})`);
  const gradId = `dens-${Math.random().toString(36).slice(2, 8)}`;
  const grad = svg.append('defs').append('linearGradient').attr('id', gradId);
  grad.append('stop').attr('offset', '0%').attr('stop-color', color(0));
  grad.append('stop').attr('offset', '100%').attr('stop-color', color(maxN));
  lg.append('rect').attr('width', lw).attr('height', 8).attr('rx', 2).attr('fill', `url(#${gradId})`);
  svgLabel(svg, 8, height - 20, 'fewer', { size: 12 });
  svgLabel(svg, 8 + lw, height - 20, `${maxN} attempts`, { size: 12, anchor: 'end' });
}

// ---- Attempts by distance (frequency histogram) ----
function renderDistanceHistogram(el, shots) {
  const BIN = 2;
  const plotH = 130;
  const height = plotH + 34;
  const { svg, width } = svgIn(el, height);
  const bins = d3.groups(shots, (s) => Math.min(Math.floor(s.distanceFt / BIN) * BIN, 34))
    .map(([d, g]) => ({ d, n: g.length }))
    .sort((a, b) => a.d - b.d);
  if (!bins.length) { svgLabel(svg, 8, 20, 'No shots match the current filters'); return; }

  const x = d3.scaleBand().domain(bins.map((b) => b.d)).range([40, width - 10]).padding(0.18);
  const y = d3.scaleLinear().domain([0, d3.max(bins, (b) => b.n)]).nice().range([plotH, 12]);

  y.ticks(4).forEach((t) => {
    svg.append('line').attr('x1', 40).attr('x2', width - 10).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
    svgLabel(svg, 34, y(t) + 4, String(t), { anchor: 'end', size: 12, tabular: true });
  });

  bins.forEach((b) => {
    svg.append('rect')
      .attr('x', x(b.d)).attr('y', y(b.n)).attr('width', x.bandwidth())
      .attr('height', Math.max(y(0) - y(b.n), 1)).attr('rx', 2).attr('fill', SERIES.blue)
      .on('mouseenter', (event) => showTip(event, `<strong>${b.d}–${b.d + BIN} ft</strong>: ${b.n} attempts`))
      .on('mouseleave', hideTip);
  });
  [0, 10, 20, 30].forEach((t) => {
    const b = bins.find((v) => v.d === t);
    if (b) svgLabel(svg, x(t) + x.bandwidth() / 2, plotH + 22, `${t} ft`, { anchor: 'middle', size: 12, tabular: true });
  });
}

// ---- FG% trend by month ----
function renderMonthlyTrend(el, shots) {
  const plotH = 130;
  const height = plotH + 34;
  const { svg, width } = svgIn(el, height);
  const months = d3.groups(shots, (s) => s.date.slice(0, 6))
    .map(([m, g]) => ({ m, n: g.length, fg: fgPct(g) }))
    .filter((r) => r.n >= 10)
    .sort((a, b) => (a.m < b.m ? -1 : 1));
  if (months.length < 2) { svgLabel(svg, 8, 20, 'Not enough months in this filter'); return; }

  const x = d3.scalePoint().domain(months.map((r) => r.m)).range([44, width - 12]).padding(0.5);
  const y = d3.scaleLinear().domain([0, Math.max(0.7, d3.max(months, (r) => r.fg) * 1.15)]).range([plotH, 12]);

  [0.25, 0.5].forEach((t) => {
    svg.append('line').attr('x1', 44).attr('x2', width - 12).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
    svgLabel(svg, 38, y(t) + 4, pct(t, 0), { anchor: 'end', size: 12, tabular: true });
  });

  const line = d3.line().x((r) => x(r.m)).y((r) => y(r.fg));
  svg.append('path').attr('d', line(months)).attr('fill', 'none')
    .attr('stroke', SERIES.blue).attr('stroke-width', 2);

  months.forEach((r) => {
    svg.append('circle').attr('cx', x(r.m)).attr('cy', y(r.fg)).attr('r', 4)
      .attr('fill', SERIES.blue).attr('stroke', '#101016').attr('stroke-width', 2)
      .on('mouseenter', (event) => showTip(event, `<strong>${r.m.slice(4, 6)}/${r.m.slice(0, 4)}</strong>: ${pct(r.fg)} FG on ${r.n} attempts`))
      .on('mouseleave', hideTip);
    svgLabel(svg, x(r.m), plotH + 22, r.m.slice(4, 6), { anchor: 'middle', size: 12, tabular: true });
  });
}

// ---- Volume vs efficiency by zone (scatter) ----
function renderVolumeEfficiency(el, shots) {
  const plotH = 150;
  const height = plotH + 34;
  const { svg, width } = svgIn(el, height);
  const rows = Object.entries(ZONE_GROUPS).map(([key, group]) => {
    const g = shots.filter((s) => zoneGroupOf(s) === key);
    return { key, label: group.label, n: g.length, efg: efgPct(g) };
  }).filter((r) => r.n > 0);
  if (!rows.length) { svgLabel(svg, 8, 20, 'No shots match the current filters'); return; }

  const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.n) * 1.15]).nice().range([50, width - 70]);
  const y = d3.scaleLinear().domain([0, Math.max(0.75, d3.max(rows, (r) => r.efg) * 1.3)]).range([plotH, 20]);

  [0.25, 0.5, 0.75].forEach((t) => {
    svg.append('line').attr('x1', 50).attr('x2', width - 70).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
    svgLabel(svg, 44, y(t) + 4, pct(t, 0), { anchor: 'end', size: 12, tabular: true });
  });

  rows.forEach((r) => {
    svg.append('circle').attr('cx', x(r.n)).attr('cy', y(r.efg)).attr('r', 9)
      .attr('fill', ZONE_COLORS[r.key]).attr('stroke', '#101016').attr('stroke-width', 2)
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${r.n} attempts at ${pct(r.efg)} eFG`))
      .on('mouseleave', hideTip);
    // Label above the dot so neighbouring zones don't overprint each other.
    svgLabel(svg, x(r.n), y(r.efg) - 14, r.label, { anchor: 'middle', fill: INK.secondary, size: 13 });
  });
  svgLabel(svg, (width + 50 - 70) / 2, plotH + 24, 'attempts →', { anchor: 'middle', size: 12 });
}

// ---- Made vs missed per zone (stacked) ----
function renderMadeMissed(el, shots) {
  const rows = Object.entries(ZONE_GROUPS).map(([key, group]) => {
    const g = shots.filter((s) => zoneGroupOf(s) === key);
    return { label: group.label, made: g.filter((s) => s.made).length, missed: g.filter((s) => !s.made).length };
  });
  const rowH = 34;
  const mL = 84;
  const height = rows.length * rowH + 30;
  const { svg, width } = svgIn(el, height);
  const maxTotal = d3.max(rows, (r) => r.made + r.missed) || 1;
  const x = d3.scaleLinear().domain([0, maxTotal]).range([mL, width - 16]);

  rows.forEach((r, i) => {
    const y = i * rowH + 8;
    svgLabel(svg, mL - 8, y + 15, r.label, { anchor: 'end', fill: INK.secondary });
    const wMade = x(r.made) - x(0);
    svg.append('rect').attr('x', x(0)).attr('y', y).attr('width', Math.max(wMade, 0)).attr('height', 20)
      .attr('rx', 3).attr('fill', '#4df2a3')
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${r.made} made`))
      .on('mouseleave', hideTip);
    const wMiss = x(r.missed) - x(0);
    svg.append('rect').attr('x', x(0) + wMade + 2).attr('y', y).attr('width', Math.max(wMiss - 2, 0)).attr('height', 20)
      .attr('rx', 3).attr('fill', '#ff7085')
      .on('mouseenter', (event) => showTip(event, `<strong>${r.label}</strong>: ${r.missed} missed`))
      .on('mouseleave', hideTip);
  });

  const ly = rows.length * rowH + 18;
  svg.append('circle').attr('cx', mL).attr('cy', ly - 4).attr('r', 5).attr('fill', '#4df2a3');
  svgLabel(svg, mL + 10, ly, 'Made', { fill: INK.secondary, size: 13 });
  svg.append('circle').attr('cx', mL + 66).attr('cy', ly - 4).attr('r', 5).attr('fill', '#ff7085');
  svgLabel(svg, mL + 76, ly, 'Missed', { fill: INK.secondary, size: 13 });
}

// ---- Home vs away ----
function renderHomeAway(el, shots) {
  const rows = [
    { label: 'Home', g: shots.filter((s) => s.isHome) },
    { label: 'Away', g: shots.filter((s) => !s.isHome) },
  ].map((r) => ({ label: r.label, n: r.g.length, fg: fgPct(r.g), efg: efgPct(r.g) }));
  const plotH = 130;
  const height = plotH + 34;
  const { svg, width } = svgIn(el, height);
  if (!rows.some((r) => r.n)) { svgLabel(svg, 8, 20, 'No shots match the current filters'); return; }

  const x0 = d3.scaleBand().domain(rows.map((r) => r.label)).range([44, width - 12]).paddingInner(0.35).paddingOuter(0.2);
  const x1 = d3.scaleBand().domain(['FG%', 'eFG%']).range([0, x0.bandwidth()]).padding(0.18);
  const y = d3.scaleLinear().domain([0, Math.max(0.7, d3.max(rows, (r) => r.efg) * 1.2)]).range([plotH, 12]);

  [0.25, 0.5].forEach((t) => {
    svg.append('line').attr('x1', 44).attr('x2', width - 12).attr('y1', y(t)).attr('y2', y(t))
      .attr('stroke', INK.grid).attr('stroke-width', 1);
    svgLabel(svg, 38, y(t) + 4, pct(t, 0), { anchor: 'end', size: 12, tabular: true });
  });

  rows.forEach((r) => {
    [['FG%', r.fg, SERIES.blue], ['eFG%', r.efg, SERIES.aqua]].forEach(([k, v, col]) => {
      svg.append('rect')
        .attr('x', x0(r.label) + x1(k)).attr('y', y(v))
        .attr('width', x1.bandwidth()).attr('height', Math.max(y(0) - y(v), 1))
        .attr('rx', 3).attr('fill', col)
        .on('mouseenter', (event) => showTip(event, `<strong>${r.label} ${k}</strong>: ${pct(v)} on ${r.n} attempts`))
        .on('mouseleave', hideTip);
    });
    svgLabel(svg, x0(r.label) + x0.bandwidth() / 2, plotH + 22, `${r.label} (${r.n})`, { anchor: 'middle', size: 13 });
  });

  const ly = 10;
  svg.append('rect').attr('x', width - 108).attr('y', ly).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', SERIES.blue);
  svgLabel(svg, width - 94, ly + 9, 'FG%', { fill: INK.secondary, size: 12 });
  svg.append('rect').attr('x', width - 54).attr('y', ly).attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', SERIES.aqua);
  svgLabel(svg, width - 40, ly + 9, 'eFG%', { fill: INK.secondary, size: 12 });
}
