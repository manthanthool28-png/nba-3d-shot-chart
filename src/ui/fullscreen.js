// Full-screen toggle.
//
// Fullscreen is requested on the document root rather than on #app-root: an
// element in fullscreen hides everything outside its own subtree, and a few
// overlays (the accessible table view) mount directly on <body>. Going
// fullscreen on the root keeps every panel visible.

const ENTER_ICON = '⤢';
const EXIT_ICON = '⤡';

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

export async function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      await (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.());
    } else {
      const root = document.documentElement;
      await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
    }
  } catch {
    // Browsers reject when the call isn't tied to a trusted gesture, and some
    // embedded contexts refuse fullscreen outright. Leave the button as-is.
  }
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
    // Chrome fires `resize` before the new viewport size has settled, which
    // left the renderer one frame short of the screen. Nudge it again after
    // layout so the canvas fills the display exactly.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  button.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', sync);
  document.addEventListener('webkitfullscreenchange', sync);
  sync();
}
