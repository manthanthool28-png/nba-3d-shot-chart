const PRIMARY_PRESETS = {
  broadcast: 'Broadcast',
  topDown: 'Top-Down',
  courtside: 'Courtside',
};

const EXTRA_PRESETS = {
  coach: 'Coach',
  aboveRim: 'Above Rim',
  shooterPOV: 'Shooter POV',
  defenderPOV: 'Defender POV',
};

// Advanced controls stay hidden until asked for; persists across re-renders.
let moreOpen = false;

export function renderCameraBar(container, { axisLock, autoOrbit, onPreset, onReset, onTour, onAxisLock, onAutoOrbit }) {
  container.innerHTML = '';

  const mainRow = document.createElement('div');
  mainRow.className = 'camera-controls';

  const rowLabel = document.createElement('span');
  rowLabel.className = 'group-label camera-drag-label';
  rowLabel.style.width = 'auto';
  rowLabel.innerHTML = '<span class="grip" aria-hidden="true">⠿</span> Camera view';
  rowLabel.title = 'Change the angle you watch the court from · drag to move this panel';
  mainRow.appendChild(rowLabel);

  for (const [key, label] of Object.entries(PRIMARY_PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = label;
    btn.addEventListener('click', () => onPreset(key));
    mainRow.appendChild(btn);
  }

  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.title = 'Reset camera view';
  resetBtn.addEventListener('click', onReset);
  mainRow.appendChild(resetBtn);

  const moreBtn = document.createElement('button');
  moreBtn.className = 'more-toggle';
  moreBtn.textContent = moreOpen ? 'Less ▴' : 'More views ▾';
  moreBtn.setAttribute('aria-expanded', String(moreOpen));
  moreBtn.addEventListener('click', () => {
    moreOpen = !moreOpen;
    renderCameraBar(container, { axisLock, autoOrbit, onPreset, onReset, onTour, onAxisLock, onAutoOrbit });
  });
  mainRow.appendChild(moreBtn);
  container.appendChild(mainRow);

  if (!moreOpen) return;

  const grid = document.createElement('div');
  grid.className = 'preset-grid';
  for (const [key, label] of Object.entries(EXTRA_PRESETS)) {
    const btn = document.createElement('button');
    btn.className = 'pill';
    btn.textContent = label;
    btn.addEventListener('click', () => onPreset(key));
    grid.appendChild(btn);
  }
  container.appendChild(grid);

  const controls = document.createElement('div');
  controls.className = 'camera-controls';

  const tourBtn = document.createElement('button');
  tourBtn.textContent = 'Cinematic tour';
  tourBtn.addEventListener('click', onTour);
  controls.appendChild(tourBtn);

  const axisSelect = document.createElement('select');
  [['none', 'Free orbit'], ['x', 'Lock vertical'], ['y', 'Lock horizontal']].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    opt.selected = axisLock === value;
    axisSelect.appendChild(opt);
  });
  axisSelect.addEventListener('change', () => onAxisLock(axisSelect.value));
  controls.appendChild(axisSelect);

  const autoBtn = document.createElement('button');
  autoBtn.className = `pill${autoOrbit ? ' active' : ''}`;
  autoBtn.textContent = 'Auto-orbit';
  autoBtn.setAttribute('aria-pressed', String(autoOrbit));
  autoBtn.addEventListener('click', () => onAutoOrbit(!autoOrbit));
  controls.appendChild(autoBtn);

  container.appendChild(controls);
}
