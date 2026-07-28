import { periodLabel } from '../data/stats.js';

function shotSummary(shot) {
  const clock = `${shot.minutesRemaining}:${String(shot.secondsRemaining).padStart(2, '0')}`;
  return `${shot.made ? 'Made' : 'Missed'} ${shot.distanceFt}ft ${shot.actionType} · ${periodLabel(shot.period)} ${clock} vs ${shot.opponent}`;
}

export function renderSidebar(container, { selectedShots, tray, onPin, onUnpin, onSelectFromTray, onClose }) {
  const hasContent = selectedShots.length > 0 || tray.length > 0;
  container.classList.toggle('hidden', !hasContent);
  if (!hasContent) return;

  container.innerHTML = '';

  if (selectedShots.length === 1) {
    const shot = selectedShots[0];
    const h3 = document.createElement('h3');
    h3.textContent = shot.made ? 'Made shot' : 'Missed shot';
    container.appendChild(h3);

    const rows = [
      ['Zone', shot.zone],
      ['Action', shot.actionType],
      ['Distance', `${shot.distanceFt} ft`],
      ['Quarter', `${periodLabel(shot.period)} · ${shot.minutesRemaining}:${String(shot.secondsRemaining).padStart(2, '0')}`],
      ['Opponent', `${shot.isHome ? 'vs' : '@'} ${shot.opponent}`],
      ['Date', `${shot.date.slice(0, 4)}-${shot.date.slice(4, 6)}-${shot.date.slice(6, 8)}`],
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.innerHTML = `<strong>${label}:</strong> ${value}`;
      container.appendChild(row);
    }

    const note = document.createElement('div');
    note.className = 'detail-note';
    note.textContent = 'Video clip link and on-court lineup aren’t available from this data source.';
    container.appendChild(note);

    const btnRow = document.createElement('div');
    btnRow.className = 'btn-row';
    const pinBtn = document.createElement('button');
    pinBtn.textContent = tray.some((s) => s.id === shot.id) ? 'Pinned' : 'Pin to tray';
    pinBtn.disabled = tray.some((s) => s.id === shot.id);
    pinBtn.addEventListener('click', () => onPin(shot));
    btnRow.appendChild(pinBtn);
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', onClose);
    btnRow.appendChild(closeBtn);
    container.appendChild(btnRow);
  } else if (selectedShots.length > 1) {
    const h3 = document.createElement('h3');
    h3.textContent = `${selectedShots.length} shots selected`;
    container.appendChild(h3);
    const madeCount = selectedShots.filter((s) => s.made).length;
    const row = document.createElement('div');
    row.className = 'detail-row';
    row.textContent = `${madeCount}/${selectedShots.length} made (${((madeCount / selectedShots.length) * 100).toFixed(0)}%)`;
    container.appendChild(row);
    const pinBtn = document.createElement('button');
    pinBtn.textContent = 'Pin all to tray';
    pinBtn.addEventListener('click', () => selectedShots.forEach(onPin));
    container.appendChild(pinBtn);
  }

  if (tray.length) {
    const h3 = document.createElement('h3');
    h3.textContent = `Comparison tray (${tray.length})`;
    h3.style.marginTop = '16px';
    container.appendChild(h3);
    for (const shot of tray) {
      const item = document.createElement('div');
      item.className = 'tray-item';
      const label = document.createElement('span');
      label.textContent = shotSummary(shot);
      label.style.cursor = 'pointer';
      label.addEventListener('click', () => onSelectFromTray(shot));
      const removeBtn = document.createElement('button');
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => onUnpin(shot));
      item.appendChild(label);
      item.appendChild(removeBtn);
      container.appendChild(item);
    }
  }
}
