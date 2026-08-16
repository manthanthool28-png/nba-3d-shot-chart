// Phase-2 refinement: plain-language definitions for stat abbreviations,
// surfaced as small ⓘ icons. Hover shows the definition (desktop); tap
// toggles it (touch). Labelling only — no statistical logic here.

export const STAT_GLOSSARY = {
  'FG': 'Field Goal: any successful shot from the field',
  'FGA': 'Field Goal Attempts: total shots taken from the field',
  'FG%': 'Field Goal %: the share of shots that went in',
  'eFG%': 'Effective Field Goal %: shooting efficiency, weighted to account for the extra value of 3-point shots',
  '3PT': 'Three-Point: shots taken from beyond the three-point line',
  '3P%': 'Three-Point %: the share of three-point shots that went in',
  'PTS': 'Points: total points scored',
  'AST': 'Assist: a pass that directly leads to a made shot',
  'Points per shot': 'Average points scored per shot attempt, counting both makes and misses',
};

const tipEl = () => document.querySelector('#tooltip');

function showDef(anchor, def) {
  const tip = tipEl();
  tip.textContent = def;
  tip.classList.remove('hidden');
  const r = anchor.getBoundingClientRect();
  // The tooltip is centred on the anchor via translate(-50%). Clamp so a chip
  // near a screen edge doesn't push the definition off-screen.
  const half = tip.offsetWidth / 2;
  const margin = 8;
  const x = Math.min(Math.max(r.left + r.width / 2, half + margin), window.innerWidth - half - margin);
  tip.style.left = `${x}px`;
  tip.style.top = `${Math.max(r.top - 6, tip.offsetHeight + margin)}px`;
}

function hideDef() {
  tipEl().classList.add('hidden');
}

// Colour family per stat, so an abbreviation is recognisable at a glance and
// reads as a pressable button rather than plain text.
const STAT_COLOR = {
  'FG': 'blue', 'FGA': 'blue', 'FG%': 'blue',
  'eFG%': 'green',
  '3PT': 'orange', '3P%': 'orange',
  'PTS': 'violet', 'AST': 'aqua',
  'Points per shot': 'violet',
};

// The abbreviation itself as a coloured button. Hover (desktop) or tap
// (touch) reveals the plain-language definition.
export function statChip(term, labelText = term) {
  const def = STAT_GLOSSARY[term];
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'stat-chip';
  btn.dataset.stat = STAT_COLOR[term] ?? 'blue';
  btn.textContent = labelText;
  if (!def) return btn;

  btn.setAttribute('aria-label', `${labelText}: ${def}`);
  btn.title = def; // native fallback
  btn.addEventListener('mouseenter', () => showDef(btn, def));
  btn.addEventListener('mouseleave', hideDef);
  btn.addEventListener('focus', () => showDef(btn, def));
  btn.addEventListener('blur', hideDef);
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (tipEl().classList.contains('hidden')) showDef(btn, def);
    else hideDef();
  });
  return btn;
}

// Small ⓘ element explaining `term`; append next to the stat label.
export function infoIcon(term) {
  const def = STAT_GLOSSARY[term];
  const span = document.createElement('span');
  span.className = 'stat-info';
  span.textContent = 'i';
  span.setAttribute('role', 'note');
  span.setAttribute('tabindex', '0');
  span.setAttribute('aria-label', def);
  if (!def) return span;

  span.addEventListener('mouseenter', () => showDef(span, def));
  span.addEventListener('mouseleave', hideDef);
  span.addEventListener('focus', () => showDef(span, def));
  span.addEventListener('blur', hideDef);
  span.addEventListener('click', (e) => {
    e.stopPropagation();
    if (tipEl().classList.contains('hidden')) showDef(span, def);
    else hideDef();
  });
  return span;
}
