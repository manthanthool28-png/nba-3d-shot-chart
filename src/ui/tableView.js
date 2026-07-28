import { periodLabel } from '../data/stats.js';

const COLUMNS = [
  ['date', 'Date', (s) => `${s.date.slice(0, 4)}-${s.date.slice(4, 6)}-${s.date.slice(6, 8)}`],
  ['opponent', 'Opponent', (s) => `${s.isHome ? 'vs' : '@'} ${s.opponent}`],
  ['period', 'Qtr', (s) => periodLabel(s.period)],
  ['zone', 'Zone', (s) => s.zone],
  ['actionType', 'Action', (s) => s.actionType],
  ['distanceFt', 'Distance (ft)', (s) => s.distanceFt],
  ['made', 'Result', (s) => (s.made ? 'Made' : 'Missed')],
];

let sortKey = 'date';
let sortDir = 1;

export function renderTableView(container, shots, onClose) {
  container.innerHTML = '';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Shot data table');

  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close table view';
  closeBtn.addEventListener('click', onClose);
  container.appendChild(closeBtn);

  const caption = document.createElement('p');
  caption.textContent = `${shots.length} shots — click a column header to sort. This table is the accessible, screen-reader-friendly equivalent of the 3D view.`;
  container.appendChild(caption);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const [key, label] of COLUMNS) {
    const th = document.createElement('th');
    th.textContent = label + (sortKey === key ? (sortDir === 1 ? ' ▲' : ' ▼') : '');
    th.tabIndex = 0;
    th.addEventListener('click', () => {
      sortDir = sortKey === key ? -sortDir : 1;
      sortKey = key;
      renderTableView(container, shots, onClose);
    });
    th.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') th.click();
    });
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const sorted = [...shots].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return av < bv ? -sortDir : av > bv ? sortDir : 0;
  });
  for (const shot of sorted) {
    const row = document.createElement('tr');
    for (const [, , accessor] of COLUMNS) {
      const td = document.createElement('td');
      td.textContent = accessor(shot);
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
