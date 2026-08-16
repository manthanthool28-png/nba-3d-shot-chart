// Phase-2 refinement: collapse/expand toggles for the overlay panels, so
// users can free up the 3D court view. Collapsed, a panel shrinks to a small
// labeled edge tab. Default state is expanded (unchanged for first-time
// users); state is per-session, not persisted.

export function makeCollapsible(wrap, contentEl, { label, side = 'left' }) {
  wrap.classList.add('collapsible-wrap');

  const btn = document.createElement('button');
  btn.className = 'collapse-btn';
  // Left-edge panels keep the chevron on their right side; right-edge panels
  // (player card) keep it on their left, so the tab hugs the screen edge.
  if (side === 'right') wrap.insertBefore(btn, wrap.firstChild);
  else wrap.appendChild(btn);

  let collapsed = false;

  function render() {
    contentEl.classList.toggle('hidden', collapsed);
    wrap.classList.toggle('is-collapsed', collapsed);
    btn.setAttribute('aria-expanded', String(!collapsed));
    if (side === 'left') btn.textContent = collapsed ? `${label} ›` : '‹';
    else btn.textContent = collapsed ? `‹ ${label}` : '›';
    btn.title = collapsed ? `Show the ${label.toLowerCase()} panel` : `Hide the ${label.toLowerCase()} panel`;
  }

  btn.addEventListener('click', () => {
    collapsed = !collapsed;
    render();
  });

  render();
  return { isCollapsed: () => collapsed };
}
