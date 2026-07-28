// Collapsed to a single "Compare" button until the user opens it (or a
// comparison is already active, e.g. restored from the URL).
let open = false;
let userClosed = false;

export function renderCompareBar(container, { manifest, datasetKey, compareKey, compareMode, ghostAvailable, onCompareKeyChange, onModeChange }) {
  container.innerHTML = '';

  const rerender = () => renderCompareBar(container, { manifest, datasetKey, compareKey, compareMode, ghostAvailable, onCompareKeyChange, onModeChange });

  const active = !!compareKey || compareMode === 'ghost';
  if (active && !userClosed) open = true;

  if (!open) {
    const openBtn = document.createElement('button');
    openBtn.className = 'pill';
    openBtn.title = 'Put two players side by side to see who shoots better from where';
    openBtn.textContent = active ? 'Compare players (on)…' : 'Compare players…';
    openBtn.addEventListener('click', () => { open = true; userClosed = false; rerender(); });
    container.appendChild(openBtn);
    return;
  }

  const label = document.createElement('span');
  label.className = 'group-label';
  label.style.width = 'auto';
  label.textContent = 'Compare to';
  container.appendChild(label);

  const select = document.createElement('select');
  const noneOpt = document.createElement('option');
  noneOpt.value = '';
  noneOpt.textContent = 'None';
  select.appendChild(noneOpt);
  for (const [key, entry] of Object.entries(manifest)) {
    if (key === 'latest' || key === datasetKey) continue;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = `${entry.name} — ${entry.season}${entry.seasonType === 'Playoffs' ? ' (Playoffs)' : ''}`;
    opt.selected = key === compareKey;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => onCompareKeyChange(select.value || null));
  container.appendChild(select);

  const modes = [
    ['overlay', 'Overlay'],
    ['split', 'Split view'],
    ['diff', 'Diff'],
  ];
  for (const [key, modeLabel] of modes) {
    const btn = document.createElement('button');
    btn.className = `pill${compareMode === key ? ' active' : ''}`;
    btn.textContent = modeLabel;
    btn.disabled = !compareKey;
    btn.addEventListener('click', () => onModeChange(compareMode === key ? 'off' : key));
    container.appendChild(btn);
  }

  const ghostBtn = document.createElement('button');
  ghostBtn.className = `pill${compareMode === 'ghost' ? ' active' : ''}`;
  ghostBtn.textContent = 'League avg ghost';
  ghostBtn.disabled = !ghostAvailable;
  ghostBtn.addEventListener('click', () => onModeChange(compareMode === 'ghost' ? 'off' : 'ghost'));
  container.appendChild(ghostBtn);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'more-toggle';
  closeBtn.textContent = 'Hide ▴';
  closeBtn.title = active ? 'Hide these controls (comparison stays on)' : 'Hide compare controls';
  closeBtn.addEventListener('click', () => { open = false; userClosed = true; rerender(); });
  container.appendChild(closeBtn);
}
