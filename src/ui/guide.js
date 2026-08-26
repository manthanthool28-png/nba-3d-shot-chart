// Step-by-step walkthrough shown to first-time visitors and re-openable from
// the settings panel. Each step pairs a short instruction with a small inline
// SVG so the idea reads at a glance instead of as a wall of text.
//
// The first three steps are an argument rather than instructions. A visitor
// arrives already knowing what a shot chart looks like — every match report
// prints one — so the walkthrough starts from that familiar flat chart, shows
// the question it cannot answer, and only then stands the same shots up. By
// the time the how-to steps begin, the third dimension has a reason to exist.

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

const DIM = '#7d8595';

const STEPS = [
  {
    title: 'You have seen this chart before',
    body: 'Every sports site and match report shows shooting like this — a flat court with one dot per attempt. It tells you where a player shoots from, and almost nothing else.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <rect x="18" y="15" width="78" height="6" rx="3" fill="#3a4150"/>
      <rect x="18" y="26" width="118" height="3" rx="1.5" fill="#242a35"/>
      <rect x="18" y="33" width="96" height="3" rx="1.5" fill="#242a35"/>
      <rect x="18" y="44" width="164" height="60" rx="4" fill="#0b0e14" stroke="#2f3542"/>
      <rect x="86" y="52" width="28" height="26" fill="none" stroke="#39404e"/>
      <circle cx="100" cy="54" r="2.5" fill="none" stroke="#5b6373"/>
      <path d="M58 52 Q100 104 142 52" fill="none" stroke="#39404e" stroke-width="1.2"/>
      <g>
        <circle cx="99" cy="62" r="2.6" fill="${MADE}"/><circle cx="92" cy="70" r="2.6" fill="${MADE}"/>
        <circle cx="108" cy="66" r="2.6" fill="${MISSED}"/><circle cx="103" cy="74" r="2.6" fill="${MADE}"/>
        <circle cx="70" cy="66" r="2.6" fill="${MISSED}"/><circle cx="130" cy="70" r="2.6" fill="${MADE}"/>
        <circle cx="62" cy="80" r="2.6" fill="${MISSED}"/><circle cx="140" cy="82" r="2.6" fill="${MISSED}"/>
        <circle cx="80" cy="88" r="2.6" fill="${MADE}"/><circle cx="120" cy="90" r="2.6" fill="${MISSED}"/>
        <circle cx="100" cy="94" r="2.6" fill="${MISSED}"/><circle cx="46" cy="90" r="2.6" fill="${MISSED}"/>
      </g>
      <text x="174" y="100" text-anchor="end" fill="${DIM}" font-size="8" letter-spacing="1">SHOT CHART</text>`,
  },
  {
    title: 'But a flat chart hides the answer',
    body: 'On paper a shot at the rim and a long mid-range jumper are the same dot. Nothing on the page tells you which spots are actually worth shooting from, or how often this player goes there.',
    svg: `
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <text x="100" y="26" text-anchor="middle" fill="${INK}" font-size="10">same dot on the page</text>
      <circle cx="62" cy="50" r="5" fill="${MADE}"/>
      <circle cx="138" cy="50" r="5" fill="${MADE}"/>
      <text x="100" y="55" text-anchor="middle" fill="#4a5262" font-size="15">=</text>
      <text x="62" y="68" text-anchor="middle" fill="${DIM}" font-size="8.5">at the rim</text>
      <text x="138" y="68" text-anchor="middle" fill="${DIM}" font-size="8.5">mid-range</text>
      <text x="100" y="99" text-anchor="middle" fill="#4a5262" font-size="30" font-weight="700">?</text>
      <text x="100" y="110" text-anchor="middle" fill="${DIM}" font-size="8.5">which one is worth more</text>`,
  },
  {
    title: 'So we stood the numbers up',
    body: 'Same shots, same spots — given a third dimension. Height is how efficiently the player scores from that area, and thickness is how often they shoot there. Those are the two things the flat chart could never show.',
    svg: `
      <style>
        @keyframes cvGrow { from { transform: scaleY(0.04); } to { transform: scaleY(1); } }
        @keyframes cvLift { from { transform: translateY(var(--drop)); } to { transform: translateY(0); } }
        .cv-bar { transform-box: fill-box; transform-origin: bottom; animation: cvGrow 900ms cubic-bezier(.2,.85,.25,1) both; }
        .cv-dot { animation: cvLift 900ms cubic-bezier(.2,.85,.25,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .cv-bar, .cv-dot { animation-duration: 1ms; }
        }
      </style>
      <rect x="6" y="6" width="188" height="108" rx="6" fill="#0f1219" stroke="#2f3542"/>
      <line x1="20" y1="92" x2="180" y2="92" stroke="#2f3542"/>
      <g opacity="0.45">
        <rect class="cv-bar" style="animation-delay:60ms"  x="36"  y="74" width="4" height="18" rx="2" fill="${MISSED}"/>
        <circle class="cv-dot" style="animation-delay:60ms;--drop:18px"  cx="38"  cy="74" r="2.6" fill="${MISSED}"/>
        <rect class="cv-bar" style="animation-delay:180ms" x="88"  y="60" width="4" height="32" rx="2" fill="${MADE}"/>
        <circle class="cv-dot" style="animation-delay:180ms;--drop:32px" cx="90"  cy="60" r="2.6" fill="${MADE}"/>
        <rect class="cv-bar" style="animation-delay:300ms" x="164" y="66" width="4" height="26" rx="2" fill="${MADE}"/>
        <circle class="cv-dot" style="animation-delay:300ms;--drop:26px" cx="166" cy="66" r="2.6" fill="${MADE}"/>
      </g>
      <rect class="cv-bar" style="animation-delay:120ms" x="57"  y="42" width="9" height="50" rx="3" fill="${MADE}"/>
      <circle class="cv-dot" style="animation-delay:120ms;--drop:50px" cx="61.5" cy="42" r="5" fill="${MADE}"/>
      <rect class="cv-bar" style="animation-delay:240ms" x="135" y="74" width="6" height="18" rx="3" fill="${MISSED}"/>
      <circle class="cv-dot" style="animation-delay:240ms;--drop:18px" cx="138" cy="74" r="5" fill="${MISSED}"/>
      <text x="61" y="104" text-anchor="middle" fill="${DIM}" font-size="8.5">at the rim</text>
      <text x="138" y="104" text-anchor="middle" fill="${DIM}" font-size="8.5">mid-range</text>`,
  },
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
    title: 'Move around the court',
    body: 'Drag to spin the court, scroll to zoom. Click any shot to see its details — the player figure copies that shot type.',
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
