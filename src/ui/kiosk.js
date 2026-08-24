// Unattended-tablet behaviour: after a spell with nobody touching it, put the
// app back to how a new visitor should find it and reopen the walkthrough.
//
// The reset is deliberately in-place rather than a page reload. A reload drops
// fullscreen, which is exactly what this is meant to preserve on a demo tablet.

const IDLE_KEY = 'shotchart.kiosk.idleReset';
const IDLE_MS = 5 * 60 * 1000;
const WARNING_MS = 15 * 1000; // grace period, counted down on screen

// Anything that counts as somebody being there. Pointer and key events cover
// mouse, touch and stylus; wheel covers trackpad scrolling over the court.
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

export function idleResetEnabled() {
  try {
    return localStorage.getItem(IDLE_KEY) !== '0'; // on unless turned off
  } catch {
    return true;
  }
}

export function initIdleReset({ onReset }) {
  let enabled = idleResetEnabled();
  let warnTimer = null;
  let tickTimer = null;
  let remaining = 0;

  const toast = document.createElement('div');
  toast.id = 'idle-toast';
  toast.className = 'panel hidden';
  toast.setAttribute('role', 'alertdialog');
  toast.setAttribute('aria-live', 'assertive');

  const message = document.createElement('span');
  const stayBtn = document.createElement('button');
  stayBtn.className = 'pill active';
  stayBtn.textContent = 'I’m still here';
  toast.append(message, stayBtn);
  document.body.appendChild(toast);

  function hideToast() {
    toast.classList.add('hidden');
    clearInterval(tickTimer);
    tickTimer = null;
  }

  function paint() {
    message.textContent = `Starting over in ${remaining}s`;
  }

  function fire() {
    hideToast();
    onReset();
    schedule();
  }

  function warn() {
    remaining = WARNING_MS / 1000;
    paint();
    toast.classList.remove('hidden');
    clearInterval(tickTimer);
    tickTimer = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) fire();
      else paint();
    }, 1000);
  }

  function schedule() {
    clearTimeout(warnTimer);
    hideToast();
    if (!enabled) return;
    warnTimer = setTimeout(warn, Math.max(IDLE_MS - WARNING_MS, 1000));
  }

  // Any activity — including the tap on "I'm still here" — restarts the clock.
  const onActivity = () => schedule();
  for (const type of ACTIVITY) {
    window.addEventListener(type, onActivity, { passive: true, capture: true });
  }

  function setEnabled(on) {
    enabled = on;
    try {
      localStorage.setItem(IDLE_KEY, on ? '1' : '0');
    } catch {
      // Private browsing — the setting still holds for this session.
    }
    schedule();
  }

  schedule();
  return { setEnabled, resetTimer: schedule };
}
