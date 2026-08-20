// Movable UI panels. The bottom-left menu (filters + compare/2D-stats
// launchers) drags by its header and can auto-hide to just that header; the
// camera-view panel drags by any non-button spot. Positions and the auto-hide
// preference persist across sessions.

const MENU_POS_KEY = 'shotchart.menu.pos';
const CAMERA_POS_KEY = 'shotchart.camerabar.pos';
const AUTOHIDE_KEY = 'shotchart.menu.autohide';
const COLLAPSE_DELAY_MS = 700;

// Every draggable panel registers here so panels can snap to each other.
const draggables = [];

const SNAP = 28;      // how close before a panel latches on (px)
const MARGIN = 16;    // resting gap from the viewport edge
const TOP_MARGIN = 84; // below the title band
const GAP = 10;       // gap when a panel parks beside/under another

// Pick the nearest candidate within SNAP, otherwise keep the raw value.
function snapTo(value, candidates) {
  let best = value;
  let bestDist = SNAP;
  for (const c of candidates) {
    if (!Number.isFinite(c)) continue;
    const d = Math.abs(value - c);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best;
}

// Auto-layout: snap the dragged box to the viewport edges/centre and to the
// edges of the other panels, so things come to rest neatly aligned instead of
// floating at arbitrary offsets.
function snapPosition(element, x, y, w, h) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const xs = [MARGIN, vw - w - MARGIN, (vw - w) / 2];
  const ys = [TOP_MARGIN, MARGIN, vh - h - MARGIN, (vh - h) / 2];

  for (const other of draggables) {
    if (other === element || !other.isConnected) continue;
    const r = other.getBoundingClientRect();
    if (!r.width || getComputedStyle(other).display === 'none') continue;
    xs.push(r.left, r.right - w, r.right + GAP, r.left - w - GAP);
    ys.push(r.top, r.bottom - h, r.bottom + GAP, r.top - h - GAP);
  }
  return { x: snapTo(x, xs), y: snapTo(y, ys) };
}

// Drag-anywhere behavior for a fixed-position panel. `isHandle(e)` decides
// whether a pointerdown starts a drag (lets buttons/selects keep working).
// Window-level move/up listeners make this robust even when pointer capture
// is unavailable or the pointer leaves the handle mid-drag.
const clampers = [];
const positionKeys = new WeakMap();

export function makeDraggable(element, { storageKey, isHandle, handleEl = element }) {
  draggables.push(element);
  positionKeys.set(element, storageKey);
  function clamp(x, y) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.min(Math.max(x, 0), Math.max(window.innerWidth - rect.width, 0)),
      y: Math.min(Math.max(y, 0), Math.max(window.innerHeight - rect.height, 0)),
    };
  }

  function applyPos(x, y) {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
    // The player card is centred with translateY(-50%); once we position it
    // explicitly that transform would offset it again (and compound on every
    // reload), so drop it.
    element.style.transform = 'none';
  }

  const saved = (() => {
    try { return JSON.parse(localStorage.getItem(storageKey)); } catch { return null; }
  })();
  if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
    const { x, y } = clamp(saved.x, saved.y);
    applyPos(x, y);
  }

  let drag = null;

  function onDragMove(e) {
    if (!drag) return;
    const rect = element.getBoundingClientRect();
    const snapped = snapPosition(element, e.clientX - drag.dx, e.clientY - drag.dy, rect.width, rect.height);
    const { x, y } = clamp(snapped.x, snapped.y);
    element.classList.toggle('snapped',
      Math.abs(x - (e.clientX - drag.dx)) > 0.5 || Math.abs(y - (e.clientY - drag.dy)) > 0.5);
    applyPos(x, y);
    e.preventDefault();
  }

  function onDragEnd() {
    if (!drag) return;
    drag = null;
    handleEl.classList.remove('dragging');
    element.classList.remove('snapped');
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    const rect = element.getBoundingClientRect();
    localStorage.setItem(storageKey, JSON.stringify({ x: rect.left, y: rect.top }));
  }

  handleEl.addEventListener('pointerdown', (e) => {
    if (!isHandle(e)) return;
    const rect = element.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    handleEl.classList.add('dragging');
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
    e.preventDefault();
  });

  window.addEventListener('resize', () => {
    if (!element.style.left) return; // still edge-anchored, browser handles it
    const rect = element.getBoundingClientRect();
    const { x, y } = clamp(rect.left, rect.top);
    applyPos(x, y);
  });

  // A panel that grows (e.g. "More views" expanding) can push its own right or
  // bottom edge off-screen once it has an explicit position. Pull it back in.
  function reclamp() {
    if (!element.style.left) return; // still edge-anchored; CSS handles it
    const rect = element.getBoundingClientRect();
    const { x, y } = clamp(rect.left, rect.top);
    if (Math.abs(x - rect.left) > 0.5 || Math.abs(y - rect.top) > 0.5) applyPos(x, y);
  }
  clampers.push(reclamp);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(reclamp).observe(element);
}

// Pull every positioned panel back inside the viewport. Call after a re-render
// changes a panel's size, so nothing is left hanging off an edge.
export function clampAllPanels() {
  clampers.forEach((fn) => fn());
}

// Return one panel to the resting place its stylesheet defines.
export function resetPanelPosition(element) {
  if (!element) return;
  element.style.left = '';
  element.style.top = '';
  element.style.right = '';
  element.style.bottom = '';
  element.style.transform = '';
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('shotchart.') && key.endsWith('.pos')) {
      // Only clear the entry belonging to this element.
      if (positionKeys.get(element) === key) localStorage.removeItem(key);
    }
  }
}

// Forget every saved panel position so the layout returns to its defaults.
export function resetPanelPositions() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('shotchart.') && key.endsWith('.pos')) localStorage.removeItem(key);
  }
}

export function initMenuDock() {
  const stack = document.querySelector('#bottom-left-stack');
  const header = document.querySelector('#menu-header');
  const autohideBtn = document.querySelector('#menu-autohide');

  makeDraggable(stack, {
    storageKey: MENU_POS_KEY,
    handleEl: header,
    isHandle: (e) => !e.target.closest('button'), // the auto-hide toggle is not a handle
  });

  // The camera panel drags by any spot that isn't a control.
  const cameraBar = document.querySelector('#camera-bar');
  makeDraggable(cameraBar, {
    storageKey: CAMERA_POS_KEY,
    isHandle: (e) => !e.target.closest('button, select'),
  });

  // ---- auto-hide: collapse the menu to just the header when the mouse leaves ----
  let autoHide = localStorage.getItem(AUTOHIDE_KEY) === '1';
  let hideTimer = null;

  function renderAutohideBtn() {
    autohideBtn.textContent = `Auto-hide: ${autoHide ? 'on' : 'off'}`;
    autohideBtn.setAttribute('aria-pressed', String(autoHide));
  }

  function scheduleCollapse() {
    if (!autoHide) return;
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      // Don't collapse mid-interaction (e.g. an open <select> dropdown).
      if (stack.contains(document.activeElement) && document.activeElement !== document.body) {
        scheduleCollapse();
        return;
      }
      stack.classList.add('stack-collapsed');
    }, COLLAPSE_DELAY_MS);
  }

  function cancelCollapse() {
    clearTimeout(hideTimer);
    stack.classList.remove('stack-collapsed');
  }

  stack.addEventListener('pointerenter', cancelCollapse);
  stack.addEventListener('pointerleave', scheduleCollapse);

  autohideBtn.addEventListener('click', () => {
    autoHide = !autoHide;
    localStorage.setItem(AUTOHIDE_KEY, autoHide ? '1' : '0');
    renderAutohideBtn();
    // Drop focus so the "don't collapse mid-interaction" guard doesn't see
    // the toggle itself as an active interaction and block the collapse.
    autohideBtn.blur();
    if (autoHide) scheduleCollapse();
    else cancelCollapse();
  });

  renderAutohideBtn();
  if (autoHide) scheduleCollapse();
}
