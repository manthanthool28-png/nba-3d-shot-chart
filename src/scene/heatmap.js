import * as THREE from 'three';
import { COURT_WIDTH, COURT_LENGTH } from './court.js';

const PX_PER_FT = 8;
const W = COURT_WIDTH * PX_PER_FT;
const H = COURT_LENGTH * PX_PER_FT;

function heatColor(t) {
  // transparent -> blue -> teal -> yellow -> red, roughly a "hot" ramp.
  const stops = [
    [0.0, [0, 0, 0, 0]],
    [0.25, [56, 189, 248, 60]],
    [0.5, [45, 212, 130, 110]],
    [0.75, [250, 204, 21, 160]],
    [1.0, [255, 80, 60, 200]],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1];
      const [t1, c1] = stops[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return c0.map((v, idx) => Math.round(v + (c1[idx] - v) * k));
    }
  }
  return stops[stops.length - 1][1];
}

export function buildHeatmapTexture(shots) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const density = new Float32Array(W * H);
  const radius = 14;
  for (const shot of shots) {
    const px = Math.round(((shot.x + COURT_WIDTH / 2) / COURT_WIDTH) * W);
    const py = Math.round((shot.z / COURT_LENGTH) * H);
    for (let dy = -radius; dy <= radius; dy++) {
      const y = py + dy;
      if (y < 0 || y >= H) continue;
      for (let dx = -radius; dx <= radius; dx++) {
        const x = px + dx;
        if (x < 0 || x >= W) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > radius * radius) continue;
        density[y * W + x] += Math.exp(-d2 / (2 * (radius / 2.2) ** 2));
      }
    }
  }

  let max = 0;
  for (let i = 0; i < density.length; i++) max = Math.max(max, density[i]);

  const imageData = ctx.createImageData(W, H);
  for (let i = 0; i < density.length; i++) {
    const t = max > 0 ? density[i] / max : 0;
    const [r, g, b, a] = heatColor(t);
    imageData.data[i * 4] = r;
    imageData.data[i * 4 + 1] = g;
    imageData.data[i * 4 + 2] = b;
    imageData.data[i * 4 + 3] = a;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function buildHeatmapPlane(shots) {
  const texture = buildHeatmapTexture(shots);
  const geometry = new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.012, COURT_LENGTH / 2);
  return mesh;
}
