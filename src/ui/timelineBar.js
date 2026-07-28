export function renderTimelineBar(container, { index, total, playing, speed, currentLabel, onScrub, onPlayToggle, onStep, onSpeedChange }) {
  container.innerHTML = '';
  if (total === 0) return;

  const playBtn = document.createElement('button');
  playBtn.textContent = playing ? '⏸' : '▶';
  playBtn.addEventListener('click', onPlayToggle);
  container.appendChild(playBtn);

  const stepBackBtn = document.createElement('button');
  stepBackBtn.textContent = '⏮';
  stepBackBtn.addEventListener('click', () => onStep(-1));
  container.appendChild(stepBackBtn);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = String(Math.max(total - 1, 0));
  slider.value = String(index);
  slider.addEventListener('input', () => onScrub(Number(slider.value)));
  container.appendChild(slider);

  const stepFwdBtn = document.createElement('button');
  stepFwdBtn.textContent = '⏭';
  stepFwdBtn.addEventListener('click', () => onStep(1));
  container.appendChild(stepFwdBtn);

  const speedSelect = document.createElement('select');
  [0.5, 1, 2, 4].forEach((s) => {
    const opt = document.createElement('option');
    opt.value = String(s);
    opt.textContent = `${s}x`;
    opt.selected = s === speed;
    speedSelect.appendChild(opt);
  });
  speedSelect.addEventListener('change', () => onSpeedChange(Number(speedSelect.value)));
  container.appendChild(speedSelect);

  const label = document.createElement('span');
  label.className = 'timeline-label';
  label.textContent = currentLabel;
  container.appendChild(label);
}
