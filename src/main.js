import './style.css';
import * as THREE from 'three';

import { createScene } from './scene/setup.js';
import { buildCourt, buildHotZoneGlow, buildDiffZoneGlow } from './scene/court.js';
import { loadArena } from './scene/arena.js';
import { loadHoopModel } from './scene/hoopModel.js';
import { buildShotField, buildGhostMarkers, filterOnCourt, computeZoneEfg } from './scene/shots.js';
import { createShotInteraction } from './scene/interaction.js';
import { createCameraDirector, getPreset, PRESET_LIST } from './scene/cameraPresets.js';
import { buildShotArc } from './scene/arc.js';
import { buildHeatmapPlane } from './scene/heatmap.js';
import { createParticleSystem } from './scene/particles.js';

import { createInitialState, queryToState } from './state.js';
import { loadManifest, loadDataset } from './data/loader.js';
import { applyFilters } from './data/filter.js';
import { sortChronological, findHotStreaks, buildCallouts } from './data/stats.js';
import { ZONE_GROUPS } from './data/zones.js';

import { renderFilterBar } from './ui/filterBar.js';
import { renderCameraBar } from './ui/cameraBar.js';
import { renderCompareBar } from './ui/compareBar.js';
import { renderTimelineBar } from './ui/timelineBar.js';
import { renderSidebar } from './ui/sidebar.js';
import { renderOverlay, renderCallouts } from './ui/overlay.js';
import { renderTableView } from './ui/tableView.js';
import { renderStatsView } from './ui/statsView.js';
import { initOnboarding, initHelpModal } from './ui/onboarding.js';
import { createShotLabels } from './ui/labels.js';
import { createSplitView2D } from './ui/splitView2d.js';
import { createPlayerCard } from './ui/playerCard.js';
import { initKeyboardNav } from './ui/keyboard.js';
import { initMenuDock } from './ui/menuDock.js';
import { updateUrl, copyText, screenshotPng, loadBookmarks, saveBookmark, removeBookmark } from './ui/share.js';
import { createCrowdAudio } from './audio.js';

const els = {
  app: document.querySelector('#app'),
  splitApp: document.querySelector('#split-app'),
  appRoot: document.querySelector('#app-root'),
  tooltip: document.querySelector('#tooltip'),
  overlay: document.querySelector('#overlay'),
  callouts: document.querySelector('#callouts'),
  filterBar: document.querySelector('#filter-bar'),
  compareBar: document.querySelector('#compare-bar'),
  cameraBar: document.querySelector('#camera-bar'),
  timelineBar: document.querySelector('#timeline-bar'),
  sidebar: document.querySelector('#sidebar'),
  settingsToggle: document.querySelector('#settings-toggle'),
  settingsPanel: document.querySelector('#settings-panel'),
};

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    }
  });
  group.clear();
}

async function main() {
  const { scene, camera, renderer, controls, setHighContrast } = createScene(els.app);
  const cameraDirector = createCameraDirector(camera, controls, { reduceMotion: () => state.reduceMotion });
  const court = buildCourt();
  scene.add(court.group);
  // Optional models from public/models/ — the arena brings its own hoops, so
  // the procedural hoop hides behind it; the standalone hoop model is only
  // used when there is no arena. Both are no-ops when the files are absent.
  (async () => {
    const arena = await loadArena(scene);
    if (arena) court.hoopGroup.visible = false;
    else await loadHoopModel(court.hoopGroup);
  })();

  const dynamicGroup = new THREE.Group();
  scene.add(dynamicGroup);
  const arcGroup = new THREE.Group();
  scene.add(arcGroup);

  const particles = createParticleSystem(scene);
  const shotLabels = createShotLabels(els.appRoot);
  const audio = createCrowdAudio();
  const interaction = createShotInteraction({ scene, camera, renderer, tooltipEl: els.tooltip });
  const split2d = createSplitView2D(els.splitApp);
  const playerCard = createPlayerCard(els.appRoot);
  split2d.setHoverCallback((shot) => interactionExternalHover(shot));

  const manifest = await loadManifest();
  let state = queryToState(location.search, createInitialState());
  if (!state.datasetKey || !manifest[state.datasetKey]) state.datasetKey = manifest.latest;

  let dataset = null;
  let compareDataset = null;
  let streakIds = new Set();
  let filteredPrimary = [];
  let currentField = null;
  let timeline = { open: false, index: 0, playing: false, speed: 1, source: [] };
  let playAccum = 0;
  let hotZoneGlowUpdate = null;
  let tray = [];
  let split2DOpen = false;

  initOnboarding();
  const helpModal = initHelpModal();
  initMenuDock();

  function colorOptions() {
    return { colorMode: state.colorMode, palette: state.palette === 'colorblind' ? 'colorblind' : 'default', teamColor: dataset?.teamColor };
  }

  async function loadPrimary(key) {
    dataset = await loadDataset(manifest[key]);
    state.datasetKey = key;
    const chrono = sortChronological(dataset.shots);
    streakIds = findHotStreaks(chrono);
    playerCard.setPlayer({ name: dataset.name, teamColor: dataset.teamColor });
  }

  async function loadCompare(key) {
    if (!key) {
      compareDataset = null;
      return;
    }
    compareDataset = await loadDataset(manifest[key]);
  }

  function applyDimForTrail(field, revealCount) {
    const RECENT_WINDOW = 40;
    const dimColor = new THREE.Color();
    field.shots.forEach((shot, i) => {
      if (i >= revealCount) return;
      const age = revealCount - i;
      if (age > RECENT_WINDOW) {
        dimColor.copy(field.baseColors[i]).multiplyScalar(0.35);
        field.mesh.setColorAt(i, dimColor);
      }
    });
    field.mesh.instanceColor.needsUpdate = true;
  }

  function refresh() {
    disposeGroup(dynamicGroup);

    filteredPrimary = filterOnCourt(applyFilters(dataset.shots, state.filters));
    timeline.source = sortChronological(filteredPrimary);
    if (!timeline.open || timeline.index > timeline.source.length - 1) {
      timeline.index = timeline.source.length - 1;
    }

    const shotsToRender = timeline.open ? timeline.source.slice(0, timeline.index + 1) : filteredPrimary;
    const field = buildShotField(shotsToRender, colorOptions(), streakIds);
    currentField = field;
    dynamicGroup.add(field.mesh, field.glowMesh);
    interaction.setField({ mesh: field.mesh, shots: shotsToRender, baseColors: field.baseColors, tops: field.tops });

    if (timeline.open) applyDimForTrail(field, shotsToRender.length);

    dynamicGroup.add(buildHeatmapPlane(shotsToRender));

    const hotGlow = buildHotZoneGlow(field.efg);
    dynamicGroup.add(hotGlow.group);
    hotZoneGlowUpdate = hotGlow.update;

    let compareLabel = null;
    if (state.compareMode !== 'off' && compareDataset) {
      const filteredCompare = filterOnCourt(applyFilters(compareDataset.shots, state.filters));

      if (state.compareMode === 'overlay') {
        const compareField = buildShotField(filteredCompare, { colorMode: 'outcome', palette: 'compare' }, new Set(), { opacity: 0.6 });
        dynamicGroup.add(compareField.mesh);
        compareLabel = `Overlay: ${dataset.name} (outcome colors) vs ${compareDataset.name} (orange/blue)`;
      } else if (state.compareMode === 'split') {
        const OFFSET = 62;
        const secondCourt = buildCourt();
        secondCourt.group.position.x = OFFSET;
        dynamicGroup.add(secondCourt.group);
        const compareField = buildShotField(filteredCompare, { colorMode: state.colorMode, palette: state.palette === 'colorblind' ? 'colorblind' : 'default', teamColor: compareDataset.teamColor }, new Set(), { offsetX: OFFSET });
        dynamicGroup.add(compareField.mesh);
        compareLabel = `Split: ${dataset.name} (left) vs ${compareDataset.name} (right)`;
      } else if (state.compareMode === 'diff') {
        const compareEfg = computeZoneEfg(filteredCompare).efg;
        const diffGlow = buildDiffZoneGlow(field.efg, compareEfg);
        dynamicGroup.add(diffGlow.group);
        compareLabel = `Diff: green = ${dataset.name} zone advantage, blue = ${compareDataset.name} advantage`;
      } else if (state.compareMode === 'ghost') {
        dynamicGroup.add(buildGhostMarkers(dataset.leagueEfg));
        compareLabel = 'Ghost markers show league-average eFG% per zone (not real shot locations)';
      }
    } else if (state.compareMode === 'ghost' && dataset.leagueEfg) {
      dynamicGroup.add(buildGhostMarkers(dataset.leagueEfg));
      compareLabel = 'Ghost markers show league-average eFG% per zone (not real shot locations)';
    }

    renderOverlay(els.overlay, {
      name: dataset.name,
      season: dataset.season,
      seasonType: dataset.seasonType,
      shownCount: shotsToRender.length,
      totalCount: dataset.shotCount,
      fgPct: dataset.fgPct,
      colorMode: state.colorMode,
      palette: state.palette,
      teamColor: dataset.teamColor,
      zoneEfg: field.efg,
      leagueEfg: dataset.leagueEfg,
      compareLabel,
    });
    renderCallouts(els.callouts, buildCallouts(filteredPrimary, dataset.leagueEfg));

    renderControls();

    if (split2DOpen) split2d.render(shotsToRender, colorOptions());
    if (statsViewOpen) renderStatsUI();
    if (state.tableView) renderTableView(document.querySelector('#table-view-wrap'), filteredPrimary, () => toggleTableView(false));
    if (els.labelsSamples) updateShotLabels(field);

    updateUrl(state);
  }

  function updateShotLabels(field) {
    const samples = [];
    for (const [key, group] of Object.entries(ZONE_GROUPS)) {
      const zoneShot = filteredPrimary.find((s) => s.zone === group.zones[0]);
      if (!zoneShot) continue;
      const h = field.heightFor(field.efg[key] ?? 0);
      samples.push({ position: new THREE.Vector3(zoneShot.x, h + 0.3, zoneShot.z), text: `${group.label}: ${((field.efg[key] ?? 0) * 100).toFixed(0)}% eFG (height)` });
    }
    shotLabels.setSamples(samples);
  }

  function renderControls() {
    const seasonOptions = Object.entries(manifest)
      .filter(([key, entry]) => key !== 'latest' && entry.name === dataset.name && entry.subjectType === 'player')
      .map(([key, entry]) => ({ key, season: entry.season, seasonType: entry.seasonType }));

    const subjectOptions = Object.entries(manifest)
      .filter(([key]) => key !== 'latest')
      .map(([key, entry]) => ({
        key,
        label: `${entry.name} — ${entry.season}${entry.seasonType === 'Playoffs' ? ' (Playoffs)' : ''}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const gameDates = timeline.source.length ? [timeline.source[0].date, timeline.source[timeline.source.length - 1].date] : null;

    renderFilterBar(els.filterBar, {
      subjectOptions,
      seasonOptions,
      datasetKey: state.datasetKey,
      filters: state.filters,
      games: dataset.games,
      dateBounds: dataset.games?.length ? [dataset.games[0].date, dataset.games[dataset.games.length - 1].date] : null,
      timelineOpen: timeline.open,
      onFilterChange: (patch) => { Object.assign(state.filters, patch); refresh(); },
      onDatasetChange: (key) => switchPrimary(key),
      onToggleTimeline: () => { timeline.open = !timeline.open; refresh(); renderTimelineUI(); },
    });

    renderCompareBar(els.compareBar, {
      manifest,
      datasetKey: state.datasetKey,
      compareKey: state.compareKey,
      compareMode: state.compareMode,
      ghostAvailable: !!dataset.leagueEfg,
      onCompareKeyChange: async (key) => { state.compareKey = key; if (!key) state.compareMode = 'off'; await loadCompare(key); refresh(); },
      onModeChange: (mode) => {
        state.compareMode = mode;
        if (mode === 'split') cameraDirector.goTo(getPreset('splitOverview'));
        refresh();
      },
    });

    renderCameraBar(els.cameraBar, {
      axisLock: state.axisLock,
      autoOrbit: state.autoOrbit,
      onPreset: (name) => cameraDirector.goTo(getPreset(name, { selectedShot: lastSelected?.[0] })),
      onReset: () => cameraDirector.goTo(getPreset('broadcast')),
      onTour: () => cameraDirector.runTour(['broadcast', 'coach', 'topDown', 'aboveRim', 'courtside']),
      onAxisLock: (mode) => { state.axisLock = mode; cameraDirector.setAxisLock(mode); renderControls(); },
      onAutoOrbit: (enabled) => { state.autoOrbit = enabled; cameraDirector.setAutoOrbit(enabled); renderControls(); },
    });

    renderTimelineUI();
  }

  function renderTimelineUI() {
    els.timelineBar.classList.toggle('hidden', !timeline.open);
    if (!timeline.open) return;
    const current = timeline.source[timeline.index];
    const label = current ? `${current.date.slice(4, 6)}/${current.date.slice(6, 8)} · shot ${timeline.index + 1}/${timeline.source.length}` : '';
    renderTimelineBar(els.timelineBar, {
      index: timeline.index,
      total: timeline.source.length,
      playing: timeline.playing,
      speed: timeline.speed,
      currentLabel: label,
      onScrub: (i) => { timeline.index = i; timeline.playing = false; refresh(); },
      onPlayToggle: () => { timeline.playing = !timeline.playing; renderTimelineUI(); },
      onStep: (delta) => { timeline.index = Math.max(0, Math.min(timeline.source.length - 1, timeline.index + delta)); refresh(); },
      onSpeedChange: (speed) => { timeline.speed = speed; },
    });
  }

  let lastSelected = [];
  interaction.on('select', (shots) => {
    lastSelected = shots;
    renderSidebarUI();
    arcGroup.clear();
    if (shots.length === 1) arcGroup.add(buildShotArc(shots[0]));
  });
  interaction.on('hover', (shot) => {
    if (split2DOpen) split2d.highlightShot(shot);
  });
  interaction.on('burst', (position) => {
    if (!state.reduceMotion) particles.spawnBurst(position);
  });

  function interactionExternalHover() {
    // 2D->3D hover sync is display-only (no raycasting needed back); the
    // tooltip content for 2D hover is handled inside splitView2d itself.
  }

  function renderSidebarUI() {
    renderSidebar(els.sidebar, {
      selectedShots: lastSelected,
      tray,
      onPin: (shot) => { if (!tray.some((s) => s.id === shot.id)) tray.push(shot); renderSidebarUI(); },
      onUnpin: (shot) => { tray = tray.filter((s) => s.id !== shot.id); renderSidebarUI(); },
      onSelectFromTray: (shot) => interaction.selectShotById(findLocalIndex(shot)),
      onClose: () => interaction.clearSelection(),
    });
  }

  function findLocalIndex(shot) {
    return filteredPrimary.findIndex((s) => s.id === shot.id);
  }

  async function switchPrimary(key) {
    // Game and date-range filters reference the previous dataset's games —
    // carrying them over would filter the new player down to zero shots.
    state.filters.gameId = 'all';
    state.filters.dateRange = null;
    await loadPrimary(key);
    refresh();
  }

  let statsViewOpen = false;

  function renderStatsUI() {
    renderStatsView(document.querySelector('#stats-view-wrap'), {
      shots: filteredPrimary,
      dataset,
      colorOpts: colorOptions(),
      onClose: () => toggleStatsView(false),
    });
  }

  function toggleStatsView(force) {
    const next = force ?? !statsViewOpen;
    statsViewOpen = next;
    document.body.classList.toggle('stats-open', next);
    let wrap = document.querySelector('#stats-view-wrap');
    if (next) {
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'stats-view-wrap';
        wrap.className = 'panel';
        // Inside #app-root (a fixed-position stacking context) so the filter
        // bar's higher z-index actually wins and stays clickable on top.
        els.appRoot.appendChild(wrap);
      }
      renderStatsUI();
    } else if (wrap) {
      wrap.remove();
    }
  }

  document.querySelector('#stats-open-btn').addEventListener('click', () => toggleStatsView());

  function toggleTableView(force) {
    const wrap = document.querySelector('#table-view-wrap');
    const next = force ?? !state.tableView;
    state.tableView = next;
    if (next) {
      if (!wrap) {
        const el = document.createElement('div');
        el.id = 'table-view-wrap';
        el.className = 'panel';
        document.body.appendChild(el);
      }
      renderTableView(document.querySelector('#table-view-wrap'), filteredPrimary, () => toggleTableView(false));
    } else if (wrap) {
      wrap.remove();
    }
    document.querySelector('#table-toggle').checked = next;
  }

  // ---- Settings panel wiring ----
  els.settingsToggle.addEventListener('click', () => els.settingsPanel.classList.toggle('hidden'));

  document.querySelector('#color-mode').value = state.colorMode;
  document.querySelector('#color-mode').addEventListener('change', (e) => { state.colorMode = e.target.value; refresh(); });

  document.querySelector('#colorblind-toggle').addEventListener('change', (e) => { state.palette = e.target.checked ? 'colorblind' : 'default'; refresh(); });

  document.querySelector('#contrast-toggle').addEventListener('change', (e) => {
    state.highContrast = e.target.checked;
    document.body.classList.toggle('high-contrast', state.highContrast);
    setHighContrast(state.highContrast);
  });

  const motionToggle = document.querySelector('#motion-toggle');
  motionToggle.checked = state.reduceMotion;
  motionToggle.addEventListener('change', (e) => { state.reduceMotion = e.target.checked; cameraDirector.setAutoOrbit(state.autoOrbit && !state.reduceMotion); });

  document.querySelector('#audio-toggle').addEventListener('change', (e) => { state.audioOn = e.target.checked; audio.setEnabled(state.audioOn); });

  const playerToggle = document.querySelector('#player-toggle');
  playerToggle.checked = true;
  playerToggle.addEventListener('change', (e) => playerCard.setVisible(e.target.checked));

  document.querySelector('#labels-toggle').addEventListener('change', (e) => {
    els.labelsSamples = e.target.checked;
    if (!e.target.checked) shotLabels.clear();
    else if (currentField) updateShotLabels(currentField);
  });

  document.querySelector('#table-toggle').addEventListener('change', () => toggleTableView());

  document.querySelector('#screenshot-btn').addEventListener('click', () => screenshotPng(renderer, `${dataset.name.replace(/\s+/g, '_')}_shotchart.png`));

  document.querySelector('#copy-stat-btn').addEventListener('click', async () => {
    const text = `${dataset.name} — ${dataset.season}: ${dataset.shotCount} shots, ${(dataset.fgPct * 100).toFixed(1)}% FG. Paint ${(currentField.efg.paint * 100).toFixed(1)}% eFG, Mid ${(currentField.efg.mid * 100).toFixed(1)}% eFG, 3PT ${(currentField.efg.three * 100).toFixed(1)}% eFG.`;
    await copyText(text);
  });

  document.querySelector('#copy-link-btn').addEventListener('click', async () => {
    updateUrl(state);
    await copyText(location.href);
  });

  document.querySelector('#bookmark-save-btn').addEventListener('click', () => {
    const name = prompt('Name this look:', `${dataset.name} ${dataset.season}`);
    if (!name) return;
    renderBookmarks(saveBookmark(name, state));
  });

  function renderBookmarks(list) {
    const container = document.querySelector('#bookmark-list');
    container.innerHTML = '';
    list.forEach((bm, i) => {
      const item = document.createElement('div');
      item.className = 'bookmark-item';
      const label = document.createElement('span');
      label.textContent = bm.name;
      label.style.cursor = 'pointer';
      label.addEventListener('click', () => { location.search = bm.query; });
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.addEventListener('click', () => renderBookmarks(removeBookmark(i)));
      item.appendChild(label);
      item.appendChild(removeBtn);
      container.appendChild(item);
    });
  }
  renderBookmarks(loadBookmarks());

  document.querySelector('#help-btn').addEventListener('click', () => helpModal.toggle());
  document.querySelector('#demo-reset-btn').addEventListener('click', () => { location.href = location.pathname; });
  document.querySelector('#tour-btn').addEventListener('click', () => {
    els.settingsPanel.classList.add('hidden');
    cameraDirector.runTour(PRESET_LIST.filter((p) => p !== 'shooterPOV' && p !== 'defenderPOV'), {
      onStep: (name) => renderCallouts(els.callouts, [`Touring: ${name.replace(/([A-Z])/g, ' $1')}`]),
    });
  });

  initKeyboardNav({
    camera,
    controls,
    onReset: () => cameraDirector.goTo(getPreset('broadcast')),
    onEscape: () => { interaction.clearSelection(); els.settingsPanel.classList.add('hidden'); helpModal.hide(); toggleStatsView(false); },
    onToggleHelp: () => helpModal.toggle(),
  });

  // ---- Initial load ----
  await loadPrimary(state.datasetKey);
  if (state.compareKey) await loadCompare(state.compareKey);
  cameraDirector.snap(getPreset('broadcast'));
  refresh();

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    controls.update();
    particles.update(dt);
    playerCard.update(dt, state.reduceMotion);
    court.updateNetSway(t, state.reduceMotion);
    hotZoneGlowUpdate?.(t);
    if (els.labelsSamples) shotLabels.update(camera, renderer);

    if (timeline.open && timeline.playing) {
      playAccum += dt * timeline.speed;
      if (playAccum > 0.15) {
        playAccum = 0;
        if (timeline.index < timeline.source.length - 1) {
          timeline.index += 1;
          refresh();
        } else {
          timeline.playing = false;
          renderTimelineUI();
        }
      }
    }

    renderer.render(scene, camera);
  }
  animate();
}

main().catch((err) => {
  console.error(err);
  document.querySelector('#overlay').innerHTML = `<div class="hint">Failed to load: ${err.message}. Run scripts/fetch_shots.py first.</div>`;
});
