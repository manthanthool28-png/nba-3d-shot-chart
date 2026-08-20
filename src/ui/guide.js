// Step-by-step walkthrough shown to first-time visitors and re-openable from
// the settings panel. Each step pairs a short instruction with a small inline
// SVG so the idea reads at a glance instead of as a wall of text.

import { ZONE_COLORS } from '../data/zoneColors.js';

const MADE = '#4df2a3';
const MISSED = '#ff7085';
const INK = '#c2c8d6';

// Small helper: a court outline used as the backdrop of several sketches.
const courtSketch = (extra = '') => `
  <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
  <path d="M100 6 A 62 62 0 0 1 100 114" fill="none" stroke="#3a4150" stroke-width="1.5"/>
  <circle cx="100" cy="60" r="5" fill="none" stroke="#f0a44f" stroke-width="1.5"/>
  ${extra}`;

const STEPS = [
  {
    title: 'Every marker is one real shot',
    body: 'Each spike is a single attempt from that exact spot on the court. Green means it went in, red means it missed.',
    svg: courtSketch(`
      <g>
        <path d="M60 78 l5 -26 l5 26 z" fill="${MADE}"/>
        <circle cx="65" cy="50" r="3.5" fill="${MADE}"/>
        <path d="M120 84 l5 -20 l5 20 z" fill="${MISSED}"/>
        <circle cx="125" cy="62" r="3.5" fill="${MISSED}"/>
        <path d="M150 86 l5 -16 l5 16 z" fill="${MADE}"/>
        <circle cx="155" cy="68" r="3.5" fill="${MADE}"/>
      </g>
      <text x="52" y="104" fill="${MADE}" font-size="10">made</text>
      <text x="112" y="104" fill="${MISSED}" font-size="10">missed</text>`),
  },
  {
    title: 'Taller spikes = better scoring',
    body: 'Spike height shows how efficiently the player scores from that area (eFG%). Thicker spikes mean they shoot from there more often.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <line x1="24" y1="96" x2="176" y2="96" stroke="#3a4150"/>
      <path d="M50 96 l7 -56 l7 56 z" fill="${MADE}"/>
      <path d="M96 96 l5 -30 l5 30 z" fill="${MADE}" opacity="0.8"/>
      <path d="M140 96 l4 -14 l4 14 z" fill="${MISSED}" opacity="0.85"/>
      <text x="34" y="30" fill="${INK}" font-size="10">efficient</text>
      <text x="126" y="72" fill="${INK}" font-size="10">less so</text>`,
  },
  {
    title: 'Move around the court',
    body: 'Drag to spin the court, scroll to zoom. Click any shot to hear it and see its details — the player figure copies that shot type.',
    svg: courtSketch(`
      <path d="M46 96 a 56 30 0 0 0 108 0" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="5 4"/>
      <path d="M150 92 l6 6 l-8 4 z" fill="${INK}"/>
      <circle cx="100" cy="52" r="13" fill="none" stroke="${INK}" stroke-width="2"/>
      <line x1="100" y1="34" x2="100" y2="42" stroke="${INK}" stroke-width="2"/>
      <line x1="100" y1="62" x2="100" y2="70" stroke="${INK}" stroke-width="2"/>
      <text x="70" y="26" fill="${INK}" font-size="10">drag / scroll</text>`),
  },
  {
    title: 'Show only what you want',
    body: 'Use the "Show only" buttons to filter by court zone or by makes and misses. The Player dropdown switches between 11 players.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <rect x="20" y="28" width="46" height="22" rx="11" fill="${ZONE_COLORS.paint}"/>
      <text x="30" y="43" fill="#0a0f14" font-size="11" font-weight="700">Paint</text>
      <rect x="72" y="28" width="70" height="22" rx="11" fill="${ZONE_COLORS.mid}"/>
      <text x="79" y="43" fill="#0a0f14" font-size="11" font-weight="700">Mid-Range</text>
      <rect x="148" y="28" width="34" height="22" rx="11" fill="${ZONE_COLORS.three}"/>
      <text x="156" y="43" fill="#0a0f14" font-size="11" font-weight="700">3PT</text>
      <rect x="20" y="62" width="52" height="22" rx="11" fill="none" stroke="${MADE}"/>
      <text x="32" y="77" fill="${MADE}" font-size="11" font-weight="700">Made</text>
      <rect x="78" y="62" width="64" height="22" rx="11" fill="none" stroke="${MISSED}"/>
      <text x="88" y="77" fill="${MISSED}" font-size="11" font-weight="700">Missed</text>`,
  },
  {
    title: 'Change the camera angle',
    body: 'The "Camera view" panel switches viewpoints. Top-Down looks like a classic paper shot chart; Courtside puts you at floor level.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <rect x="26" y="60" width="64" height="38" rx="4" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <text x="34" y="52" fill="${INK}" font-size="10">Top-Down</text>
      <path d="M110 96 l50 -30 l0 30 z" fill="none" stroke="${INK}" stroke-width="1.5"/>
      <text x="112" y="52" fill="${INK}" font-size="10">Courtside</text>
      <circle cx="58" cy="79" r="4" fill="${ZONE_COLORS.three}"/>
      <circle cx="140" cy="88" r="4" fill="${ZONE_COLORS.three}"/>`,
  },
  {
    title: 'Compare players & 2D charts',
    body: '"Compare players" puts two courts side by side. "2D stat charts" opens 12 classic charts — shot chart, heat map, efficiency by zone — plus a table of every shot.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <rect x="18" y="20" width="76" height="46" rx="4" fill="none" stroke="#3a4150"/>
      <rect x="106" y="20" width="76" height="46" rx="4" fill="none" stroke="#3a4150"/>
      <circle cx="40" cy="46" r="3" fill="${MADE}"/><circle cx="58" cy="38" r="3" fill="${MISSED}"/>
      <circle cx="128" cy="42" r="3" fill="${MADE}"/><circle cx="150" cy="50" r="3" fill="${MADE}"/>
      <rect x="18" y="80" width="26" height="22" fill="${ZONE_COLORS.paint}"/>
      <rect x="52" y="88" width="26" height="14" fill="${ZONE_COLORS.mid}"/>
      <rect x="86" y="74" width="26" height="28" fill="${ZONE_COLORS.three}"/>
      <text x="122" y="96" fill="${INK}" font-size="10">12 charts</text>`,
  },
];

export function createGuide() {
  const backdrop = document.querySelector('#onboarding');
  const card = backdrop.querySelector('.modal');
  let index = 0;

  function render() {
    const step = STEPS[index];
    card.innerHTML = '';
    card.classList.add('guide-modal');

    const fig = document.createElement('div');
    fig.className = 'guide-figure';
    fig.innerHTML = `<svg viewBox="0 0 200 120" role="img" aria-label="${step.title}">${step.svg}</svg>`;
    card.appendChild(fig);

    const counter = document.createElement('div');
    counter.className = 'guide-counter';
    counter.textContent = `Step ${index + 1} of ${STEPS.length}`;
    card.appendChild(counter);

    const h = document.createElement('h2');
    h.textContent = step.title;
    card.appendChild(h);

    const p = document.createElement('p');
    p.className = 'guide-body';
    p.textContent = step.body;
    card.appendChild(p);

    const dots = document.createElement('div');
    dots.className = 'guide-dots';
    STEPS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `guide-dot${i === index ? ' current' : ''}`;
      dot.setAttribute('aria-label', `Go to step ${i + 1}`);
      dot.addEventListener('click', () => { index = i; render(); });
      dots.appendChild(dot);
    });
    card.appendChild(dots);

    const row = document.createElement('div');
    row.className = 'guide-actions';

    const back = document.createElement('button');
    back.textContent = 'Back';
    back.disabled = index === 0;
    back.addEventListener('click', () => { if (index > 0) { index -= 1; render(); } });
    row.appendChild(back);

    const skip = document.createElement('button');
    skip.className = 'more-toggle';
    skip.textContent = 'Skip';
    skip.addEventListener('click', hide);
    row.appendChild(skip);

    const next = document.createElement('button');
    next.className = 'pill active';
    next.textContent = index === STEPS.length - 1 ? 'Start exploring' : 'Next';
    next.addEventListener('click', () => {
      if (index === STEPS.length - 1) hide();
      else { index += 1; render(); }
    });
    row.appendChild(next);

    card.appendChild(row);
    next.focus();
  }

  function show(fromStart = true) {
    if (fromStart) index = 0;
    render();
    backdrop.classList.remove('hidden');
  }

  function hide() {
    backdrop.classList.add('hidden');
    localStorage.setItem('shotchart.onboarding.seen', '1');
  }

  // Arrow keys page through the walkthrough while it is open.
  window.addEventListener('keydown', (e) => {
    if (backdrop.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight' && index < STEPS.length - 1) { index += 1; render(); }
    else if (e.key === 'ArrowLeft' && index > 0) { index -= 1; render(); }
    else if (e.key === 'Escape') hide();
  });

  return { show, hide, isOpen: () => !backdrop.classList.contains('hidden') };
}
