import * as THREE from 'three';

// Procedural plank/wood-grain texture so the floor doesn't need an external
// image asset. Not photoreal, but reads as "court" at the camera distances
// this scene uses.
export function buildWoodTexture(widthFt, lengthFt) {
  const pxPerFt = 12;
  const w = Math.round(widthFt * pxPerFt);
  const h = Math.round(lengthFt * pxPerFt);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  const base = { r: 24, g: 20, b: 15 };
  ctx.fillStyle = `rgb(${base.r},${base.g},${base.b})`;
  ctx.fillRect(0, 0, w, h);

  const plankHeight = 2.2 * pxPerFt;
  for (let py = 0; py < h; py += plankHeight) {
    const shade = 4 + Math.random() * 6;
    ctx.fillStyle = `rgba(${base.r + shade},${base.g + shade},${base.b + shade},0.5)`;
    ctx.fillRect(0, py, w, plankHeight);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();

    for (let i = 0; i < 60; i++) {
      const gx = Math.random() * w;
      const gy = py + Math.random() * plankHeight;
      const len = 20 + Math.random() * 60;
      ctx.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.lineTo(gx + len, gy + (Math.random() - 0.5) * 4);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
