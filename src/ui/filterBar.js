import { ZONE_GROUPS } from '../data/zones.js';
import { ACTION_TYPE_LABELS } from '../data/actionTypes.js';

// Collapsed by default; survives re-renders so the bar doesn't snap shut on
// every filter change.
let moreOpen = false;

function fmtDate(yyyymmdd) {
  if (!yyyymmdd) return '';
  return `${yyyymmdd.slice(4, 6)}/${yyyymmdd.slice(6, 8)}`;
}

function pill(label, active, onClick, disabled = false, title = '') {
  const btn = document.createElement('button');
  btn.className = `pill${active ? ' active' : ''}`;
  btn.textContent = label;
  btn.disabled = disabled;
  if (title) btn.title = title;
  btn.setAttribute('aria-pressed', String(active));
  btn.addEventListener('click', onClick);
  return btn;
}

function groupRow(labelText) {
  const row = document.createElement('div');
  row.className = 'filter-group';
  const label = document.createElement('span');
  label.className = 'group-label';
  label.textContent = labelText;
  row.appendChild(label);
  return row;
}

function hasActiveFilters(filters) {
  return filters.zoneGroup !== 'all' || filters.actionBucket !== 'all' || filters.outcome !== 'all'
    || filters.homeAway !== 'all' || filters.quarter !== 'all' || filters.lateGame
    || filters.gameId !== 'all' || !!filters.dateRange;
}

export function renderFilterBar(container, { subjectOptions, seasonOptions, datasetKey, filters, games, dateBounds, timelineOpen, onFilterChange, onDatasetChange, onToggleTimeline }) {
  container.innerHTML = '';

  // ---- Always visible: player switcher. ----
  if (subjectOptions?.length > 1) {
    const playerRow = groupRow('Player');
    const select = document.createElement('select');
    select.title = "Choose whose shots to look at";
    for (const opt of subjectOptions) {
      const el = document.createElement('option');
      el.value = opt.key;
      el.textContent = opt.label;
      el.selected = opt.key === datasetKey;
      select.appendChild(el);
    }
    select.addEventListener('change', () => onDatasetChange(select.value));
    playerRow.appendChild(select);
    container.appendChild(playerRow);
  }

  // ---- Always visible: Zone + Made/Missed, the two filters people reach
  // for most, plus Clear and the More toggle. ----
  const ZONE_HINTS = {
    paint: 'Only shots taken close to the basket (the painted area)',
    mid: 'Only shots inside the three-point line but away from the basket',
    three: 'Only three-point shots',
  };
  const mainRow = groupRow('Show only');
  mainRow.appendChild(pill('All', filters.zoneGroup === 'all', () => onFilterChange({ zoneGroup: 'all' }), false, 'Show shots from everywhere on the court'));
  for (const [key, group] of Object.entries(ZONE_GROUPS)) {
    mainRow.appendChild(pill(group.label, filters.zoneGroup === key, () => onFilterChange({ zoneGroup: key }), false, ZONE_HINTS[key]));
  }
  mainRow.appendChild(pill('Made', filters.outcome === 'made', () => onFilterChange({ outcome: filters.outcome === 'made' ? 'all' : 'made' }), false, 'Only shots that went in'));
  mainRow.appendChild(pill('Missed', filters.outcome === 'missed', () => onFilterChange({ outcome: filters.outcome === 'missed' ? 'all' : 'missed' }), false, 'Only shots that missed'));

  if (hasActiveFilters(filters)) {
    mainRow.appendChild(pill('Clear', false, () => onFilterChange({
      zoneGroup: 'all', actionBucket: 'all', outcome: 'all', homeAway: 'all',
      quarter: 'all', lateGame: false, gameId: 'all', dateRange: null,
    }), false, 'Remove every filter and show all shots again'));
  }

  const moreBtn = document.createElement('button');
  moreBtn.className = 'more-toggle';
  moreBtn.textContent = moreOpen ? 'Less ▴' : 'More filters ▾';
  moreBtn.setAttribute('aria-expanded', String(moreOpen));
  moreBtn.addEventListener('click', () => {
    moreOpen = !moreOpen;
    renderFilterBar(container, { seasonOptions, datasetKey, filters, games, dateBounds, timelineOpen, onFilterChange, onDatasetChange, onToggleTimeline });
  });
  mainRow.appendChild(moreBtn);
  container.appendChild(mainRow);

  if (!moreOpen) return;

  // ---- Everything below only renders when "More filters" is open. ----

  // Season / season-type switch.
  if (seasonOptions.length > 1) {
    const row = groupRow('Season');
    const select = document.createElement('select');
    for (const opt of seasonOptions) {
      const el = document.createElement('option');
      el.value = opt.key;
      el.textContent = `${opt.season} ${opt.seasonType === 'Playoffs' ? '(Playoffs)' : ''}`.trim();
      el.selected = opt.key === datasetKey;
      select.appendChild(el);
    }
    select.addEventListener('change', () => onDatasetChange(select.value));
    row.appendChild(select);
    container.appendChild(row);
  }

  // Shot type (action bucket).
  const typeRow = groupRow('Type');
  typeRow.appendChild(pill('All', filters.actionBucket === 'all', () => onFilterChange({ actionBucket: 'all' })));
  for (const [key, label] of Object.entries(ACTION_TYPE_LABELS)) {
    typeRow.appendChild(pill(label, filters.actionBucket === key, () => onFilterChange({ actionBucket: key })));
  }
  container.appendChild(typeRow);

  // Home/away.
  const sideRow = groupRow('Side');
  sideRow.appendChild(pill('Home', filters.homeAway === 'home', () => onFilterChange({ homeAway: filters.homeAway === 'home' ? 'all' : 'home' })));
  sideRow.appendChild(pill('Away', filters.homeAway === 'away', () => onFilterChange({ homeAway: filters.homeAway === 'away' ? 'all' : 'away' })));
  container.appendChild(sideRow);

  // Time: quarter, late-game, timeline toggle.
  const timeRow = groupRow('Time');
  const quarterSelect = document.createElement('select');
  [['all', 'All quarters'], ['1', 'Q1'], ['2', 'Q2'], ['3', 'Q3'], ['4', 'Q4'], ['5', 'OT']].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    opt.selected = filters.quarter === value;
    quarterSelect.appendChild(opt);
  });
  quarterSelect.addEventListener('change', () => onFilterChange({ quarter: quarterSelect.value }));
  timeRow.appendChild(quarterSelect);
  timeRow.appendChild(
    pill('Late game (Q4/OT, <5m)', filters.lateGame, () => onFilterChange({ lateGame: !filters.lateGame }), false,
      'Approximate: period + game clock only. This data source has no live score margin, so this is not true clutch (±5 pts).'),
  );
  timeRow.appendChild(pill(timelineOpen ? 'Hide timeline' : 'Show timeline', timelineOpen, onToggleTimeline));
  container.appendChild(timeRow);

  // Game + date range.
  if (games?.length) {
    const gameRow = groupRow('Game');
    const gameSelect = document.createElement('select');
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = 'All games';
    allOpt.selected = filters.gameId === 'all';
    gameSelect.appendChild(allOpt);
    for (const g of games) {
      const opt = document.createElement('option');
      opt.value = g.gameId;
      opt.textContent = `${fmtDate(g.date)} ${g.isHome ? 'vs' : '@'} ${g.opponent}`;
      opt.selected = filters.gameId === g.gameId;
      gameSelect.appendChild(opt);
    }
    gameSelect.addEventListener('change', () => onFilterChange({ gameId: gameSelect.value }));
    gameRow.appendChild(gameSelect);
    container.appendChild(gameRow);

    if (dateBounds) {
      const [minDate, maxDate] = dateBounds;
      const dateRow = groupRow('Date range');
      const startInput = document.createElement('input');
      const endInput = document.createElement('input');
      [startInput, endInput].forEach((input) => {
        input.type = 'range';
        input.min = '0';
        input.max = String(games.length - 1);
      });
      const currentRange = filters.dateRange;
      const startIdx = currentRange ? games.findIndex((g) => g.date >= currentRange[0]) : 0;
      const endIdx = currentRange ? games.findIndex((g) => g.date >= currentRange[1]) : games.length - 1;
      startInput.value = String(Math.max(startIdx, 0));
      endInput.value = String(endIdx < 0 ? games.length - 1 : endIdx);

      const label = document.createElement('span');
      label.className = 'group-label';
      label.style.width = 'auto';
      function updateLabel() {
        label.textContent = `${fmtDate(games[+startInput.value].date)} – ${fmtDate(games[+endInput.value].date)}`;
      }
      updateLabel();

      function commit() {
        if (+startInput.value > +endInput.value) endInput.value = startInput.value;
        updateLabel();
        const start = games[+startInput.value].date;
        const end = games[+endInput.value].date;
        const isFull = start === minDate && end === maxDate;
        onFilterChange({ dateRange: isFull ? null : [start, end] });
      }
      startInput.addEventListener('input', commit);
      endInput.addEventListener('input', commit);

      dateRow.appendChild(startInput);
      dateRow.appendChild(endInput);
      dateRow.appendChild(label);
      container.appendChild(dateRow);
    }
  }
}
