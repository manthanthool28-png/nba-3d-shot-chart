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

function pillBtn(label, { active = false, title = '', onClick }) {
  const btn = document.createElement('button');
  btn.className = `pill${active ? ' active' : ''}`;
  btn.textContent = label;
  if (title) btn.title = title;
  btn.setAttribute('aria-pressed', String(active));
  btn.addEventListener('click', onClick);
  return btn;
}

export function renderCameraBar(container, { axisLock, autoOrbit, dragMode, onPreset, onReset, onTour, onAxisLock, onAutoOrbit, onDragMode }) {
  container.innerHTML = '';

  // --- Header: drag handle + title + expander, on its own line ---
  const header = document.createElement('div');
  header.className = 'camera-header';

  const title = document.createElement('span');
  title.className = 'camera-title';
  title.innerHTML = '<span class="grip" aria-hidden="true">⠿</span> Camera view';
  title.title = 'Change the angle you watch the court from · drag to move this panel';
  header.appendChild(title);

  const moreBtn = document.createElement('button');
  moreBtn.className = 'more-toggle';
  moreBtn.textContent = moreOpen ? 'Less' : 'More views';
  moreBtn.setAttribute('aria-expanded', String(moreOpen));
  moreBtn.addEventListener('click', () => {
    moreOpen = !moreOpen;
    renderCameraBar(container, { axisLock, autoOrbit, dragMode, onPreset, onReset, onTour, onAxisLock, onAutoOrbit, onDragMode });
  });
  header.appendChild(moreBtn);
  container.appendChild(header);

  // --- Angle presets ---
  const presetRow = document.createElement('div');
  presetRow.className = 'camera-row';
  for (const [key, label] of Object.entries(PRIMARY_PRESETS)) {
    presetRow.appendChild(pillBtn(label, { onClick: () => onPreset(key) }));
  }
  presetRow.appendChild(pillBtn('Reset', { title: 'Reset camera view', onClick: onReset }));
  container.appendChild(presetRow);

  // --- What a plain drag does ---
  const dragRow = document.createElement('div');
  dragRow.className = 'camera-row';
  const dragLabel = document.createElement('span');
  dragLabel.className = 'camera-sublabel';
  dragLabel.textContent = 'Drag to';
  dragRow.appendChild(dragLabel);
  dragRow.appendChild(pillBtn('Rotate', {
    active: dragMode !== 'pan',
    title: 'Drag to spin the court around',
    onClick: () => onDragMode('rotate'),
  }));
  dragRow.appendChild(pillBtn('Move', {
    active: dragMode === 'pan',
    title: 'Drag to slide the court sideways or up/down — useful when comparing two courts',
    onClick: () => onDragMode('pan'),
  }));
  container.appendChild(dragRow);

  if (!moreOpen) return;

  const extraRow = document.createElement('div');
  extraRow.className = 'camera-row';
  for (const [key, label] of Object.entries(EXTRA_PRESETS)) {
    extraRow.appendChild(pillBtn(label, { onClick: () => onPreset(key) }));
  }
  container.appendChild(extraRow);

  const advRow = document.createElement('div');
  advRow.className = 'camera-row';
  advRow.appendChild(pillBtn('Cinematic tour', { onClick: onTour }));

  const axisSelect = document.createElement('select');
  [['none', 'Free orbit'], ['x', 'Lock vertical'], ['y', 'Lock horizontal']].forEach(([value, label]) => {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = label;
    opt.selected = axisLock === value;
    axisSelect.appendChild(opt);
  });
  axisSelect.addEventListener('change', () => onAxisLock(axisSelect.value));
  advRow.appendChild(axisSelect);

  advRow.appendChild(pillBtn('Auto-orbit', { active: autoOrbit, onClick: () => onAutoOrbit(!autoOrbit) }));
  container.appendChild(advRow);
}
