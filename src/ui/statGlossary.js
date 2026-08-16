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
  const r = anchor.getBoundingClientRect();
  tip.style.left = `${r.left + r.width / 2}px`;
  tip.style.top = `${r.top - 6}px`;
  tip.classList.remove('hidden');
}

function hideDef() {
  tipEl().classList.add('hidden');
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
