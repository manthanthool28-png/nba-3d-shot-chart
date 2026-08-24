// Full-screen toggle, plus a "keep it" lock for tablet/kiosk use.
//
// Fullscreen is requested on the document root rather than on #app-root: an
// element in fullscreen hides everything outside its own subtree, and a few
// overlays (the accessible table view) mount directly on <body>. Going
// fullscreen on the root keeps every panel visible.

const ENTER_ICON = '⤢';
const EXIT_ICON = '⤡';
const LOCK_KEY = 'shotchart.fullscreen.lock';

function currentElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function isFullscreen() {
  return Boolean(currentElement());
}

export function supportsFullscreen() {
  const root = document.documentElement;
  return Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
}

export function fullscreenLockEnabled() {
  try {
    return localStorage.getItem(LOCK_KEY) !== '0'; // on unless turned off
  } catch {
    return true;
  }
}

let lockOn = fullscreenLockEnabled();
// Set when the visitor asked to leave (the button, F, or Esc), so a deliberate
// exit is never undone by the lock.
let deliberateExit = false;
let rearm = null;

function disarm() {
  if (!rearm) return;
  window.removeEventListener('pointerup', rearm, true);
  window.removeEventListener('keydown', rearm, true);
  rearm = null;
}

// Browsers only grant fullscreen from a trusted gesture, so a lost fullscreen
// cannot be restored on the spot — the next tap or key press does it instead.
// On a tablet that is usually the same tap that knocked it out, so the drop
// lasts a single frame of the visitor's attention rather than needing them to
// hunt for the button again.
function armRestore() {
  disarm();
  rearm = () => {
    disarm();
    if (lockOn && !isFullscreen()) enterFullscreen();
  };
  window.addEventListener('pointerup', rearm, true);
  window.addEventListener('keydown', rearm, true);
}

export function setFullscreenLock(on) {
  lockOn = on;
  try {
    localStorage.setItem(LOCK_KEY, on ? '1' : '0');
  } catch {
    // Private browsing — the lock still works for this session.
  }
  if (!on) disarm();
}

async function enterFullscreen() {
  const root = document.documentElement;
  try {
    await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
  } catch {
    // Rejected when the call isn't tied to a trusted gesture, and some
    // embedded contexts refuse fullscreen outright.
  }
}

export async function toggleFullscreen() {
  if (isFullscreen()) {
    deliberateExit = true;
    try {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    } catch {
      deliberateExit = false;
    }
    return;
  }
  await enterFullscreen();
}

export function initFullscreen(button) {
  if (!button) return;
  if (!supportsFullscreen()) {
    button.classList.add('hidden');
    return;
  }

  function sync() {
    const on = isFullscreen();
    button.textContent = on ? EXIT_ICON : ENTER_ICON;
    button.title = on ? 'Exit full screen (F)' : 'Full screen (F)';
    button.setAttribute('aria-label', button.title);
    button.setAttribute('aria-pressed', String(on));
    document.body.classList.toggle('is-fullscreen', on);

    if (on) disarm();
    else if (lockOn && !deliberateExit) armRestore();
    deliberateExit = false;

    // Chrome fires `resize` before the new viewport size has settled, which
    // left the renderer one frame short of the screen. Nudge it again after
    // layout so the canvas fills the display exactly.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  button.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  // Esc leaves fullscreen without going through us; treat it as deliberate so
  // the lock doesn't immediately drag the visitor back in.
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isFullscreen()) deliberateExit = true;
  }, true);
  sync();
}
