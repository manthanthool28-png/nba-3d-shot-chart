import * as d3 from 'd3';
import { shotColor } from '../scene/colorEncoding.js';
import { COURT_WIDTH, COURT_LENGTH, RIM_Z, RIM_RADIUS } from '../scene/court.js';

export function createSplitView2D(container) {
  const svg = d3.select(container).append('svg').attr('width', '100%').attr('height', '100%');
  const root = svg.append('g');
  let onHover = () => {};

  function resize() {
    const rect = container.getBoundingClientRect();
    const margin = 24;
    const scale = Math.min((rect.width - margin * 2) / COURT_WIDTH, (rect.height - margin * 2) / COURT_LENGTH);
    const offsetX = rect.width / 2;
    const offsetY = (rect.height - COURT_LENGTH * scale) / 2;
    root.attr('transform', `translate(${offsetX},${offsetY}) scale(${scale})`);
    return scale;
  }

  function courtLines() {
    root.selectAll('.court-line').remove();
    const lines = [
      [[-25, 0], [-25, COURT_LENGTH], [25, COURT_LENGTH], [25, 0], [-25, 0]],
      [[-8, 0], [-8, 19], [8, 19], [8, 0]],
    ];
    const lineGen = d3.line().x((d) => d[0]).y((d) => d[1]);
    for (const points of lines) {
      root.append('path').attr('class', 'court-line').attr('d', lineGen(points))
        .attr('fill', 'none').attr('stroke', '#8a8f9c').attr('stroke-width', 0.15);
    }
    root.append('circle').attr('class', 'court-line').attr('cx', 0).attr('cy', 19).attr('r', 6)
      .attr('fill', 'none').attr('stroke', '#8a8f9c').attr('stroke-width', 0.15);
    root.append('circle').attr('class', 'court-line').attr('cx', 0).attr('cy', RIM_Z).attr('r', RIM_RADIUS)
      .attr('fill', 'none').attr('stroke', '#ff6a1a').attr('stroke-width', 0.15);

    const R = 23.75;
    const arc = d3.arc().innerRadius(R).outerRadius(R).startAngle(-Math.PI / 2 - 1.18).endAngle(Math.PI / 2 + 1.18);
    root.append('path').attr('class', 'court-line').attr('d', arc()).attr('transform', `translate(0,${RIM_Z})`)
      .attr('fill', 'none').attr('stroke', '#8a8f9c').attr('stroke-width', 0.15);
  }

  function render(shots, colorOptions) {
    resize();
    root.selectAll('.court-line').remove();
    courtLines();

    const sel = root.selectAll('circle.shot').data(shots, (d) => d.id);
    sel.exit().remove();
    sel.enter()
      .append('circle')
      .attr('class', 'shot')
      .attr('r', 0.45)
      .attr('data-id', (d) => d.id)
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => onHover(d))
      .on('mouseleave', () => onHover(null))
      .merge(sel)
      .attr('cx', (d) => d.x)
      .attr('cy', (d) => d.z)
      .attr('fill', (d) => `#${shotColor(d, colorOptions).getHexString()}`)
      .attr('fill-opacity', 0.85);
  }

  function highlightShot(shot) {
    root.selectAll('circle.shot').attr('stroke', null).attr('stroke-width', null);
    if (shot) {
      root.selectAll(`circle.shot[data-id="${shot.id}"]`).attr('stroke', '#fff').attr('stroke-width', 0.25);
    }
  }

  function setHoverCallback(fn) {
    onHover = fn;
  }

  return { render, highlightShot, setHoverCallback, resize };
}
