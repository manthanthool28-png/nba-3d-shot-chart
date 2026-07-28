export function createInitialState() {
  return {
    datasetKey: null,
    compareKey: null,
    compareMode: 'off', // off | overlay | split | diff | ghost
    filters: {
      zoneGroup: 'all', // all | paint | mid | three
      actionBucket: 'all', // all | dunk | layup | hook | floater | fadeaway | jumper
      outcome: 'all', // all | made | missed
      homeAway: 'all', // all | home | away
      quarter: 'all', // all | 1 | 2 | 3 | 4 | 5 (OT+)
      lateGame: false,
      gameId: 'all',
      dateRange: null, // [startDate, endDate] as YYYYMMDD strings
    },
    colorMode: 'outcome', // outcome | type | quarter | team
    palette: 'default', // default | colorblind
    highContrast: false,
    reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    axisLock: 'none', // none | x | y
    autoOrbit: false,
    tableView: false,
    audioOn: false,
    tray: [],
  };
}

const URL_KEYS = ['datasetKey', 'compareKey', 'compareMode', 'colorMode', 'palette'];

export function stateToQuery(state) {
  const params = new URLSearchParams();
  for (const key of URL_KEYS) {
    if (state[key] && state[key] !== 'off') params.set(key, state[key]);
  }
  for (const [key, value] of Object.entries(state.filters)) {
    if (value && value !== 'all' && value !== false) params.set(`f_${key}`, value);
  }
  return params.toString();
}

export function queryToState(search, base) {
  const params = new URLSearchParams(search);
  const state = { ...base, filters: { ...base.filters } };
  for (const key of URL_KEYS) {
    if (params.has(key)) state[key] = params.get(key);
  }
  for (const key of Object.keys(state.filters)) {
    const param = params.get(`f_${key}`);
    if (param == null) continue;
    if (key === 'dateRange') {
      // Serialized as "start,end" — must come back as the [start, end] array
      // applyFilters expects, not a string.
      const parts = param.split(',');
      state.filters.dateRange = parts.length === 2 ? parts : null;
      continue;
    }
    state.filters[key] = param === 'true' ? true : param === 'false' ? false : param;
  }
  return state;
}
