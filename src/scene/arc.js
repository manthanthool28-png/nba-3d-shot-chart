import * as THREE from 'three';
import { HOOP_HEIGHT, RIM_Z } from './court.js';

const RELEASE_HEIGHT = 8.2;
const MADE_COLOR = 0xf7c948;
const MISS_COLOR = 0xff5470;

// Simple deterministic hash so the same shot always gets the same
// illustrative miss point across re-renders.
function seededUnit(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// The dataset has no ball-tracking, so exact release height, apex, and miss
// location aren't real measurements — this is a stylized illustration of a
// plausible arc, clearly not reconstructed physics. Made shots end at the
// rim center; missed shots end near the rim/backboard/air based on a
// deterministic pseudo-random category so misses don't all look identical.
function missTarget(shot) {
  const r = seededUnit(shot.id);
  const rim = new THREE.Vector3(0, HOOP_HEIGHT, RIM_Z);
  if (r < 0.4) {
    // short/long off the rim
    const angle = seededUnit(shot.id + 1) * Math.PI * 2;
    return rim.clone().add(new THREE.Vector3(Math.cos(angle) * 0.9, seededUnit(shot.id + 2) * 0.6 - 0.2, Math.sin(angle) * 0.9));
  }
  if (r < 0.7) {
    // off the backboard
    return new THREE.Vector3((seededUnit(shot.id + 3) - 0.5) * 3, HOOP_HEIGHT + 1 + seededUnit(shot.id + 4), 4.1);
  }
  // airball, wide of the rim
  const angle = seededUnit(shot.id + 5) * Math.PI * 2;
  return rim.clone().add(new THREE.Vector3(Math.cos(angle) * 2.2, seededUnit(shot.id + 6) * 1.5, Math.sin(angle) * 2.2));
}

export function buildShotArc(shot) {
  const group = new THREE.Group();
  const color = shot.made ? MADE_COLOR : MISS_COLOR;

  const start = new THREE.Vector3(shot.x, RELEASE_HEIGHT, shot.z);
  const end = shot.made ? new THREE.Vector3(0, HOOP_HEIGHT, RIM_Z) : missTarget(shot);

  const peakY = Math.max(start.y, end.y) + 2.5 + Math.min(shot.distanceFt, 30) * 0.06;
  const mid = new THREE.Vector3((start.x + end.x) / 2, peakY, (start.z + end.z) / 2);
  // Quadratic bezier control point placed so the curve's midpoint value is peakY.
  const control = mid.clone().multiplyScalar(2).sub(start.clone().add(end).multiplyScalar(0.5));

  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  const points = curve.getPoints(40);
  const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(lineGeom, new THREE.LineDashedMaterial({ color, dashSize: 0.4, gapSize: 0.2, linewidth: 1 }));
  line.computeLineDistances();
  group.add(line);

  const releaseDot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  releaseDot.position.copy(start);
  group.add(releaseDot);

  let peakPoint = points[0];
  for (const p of points) if (p.y > peakPoint.y) peakPoint = p;
  const peakMarker = new THREE.Mesh(new THREE.RingGeometry(0.14, 0.2, 16), new THREE.MeshBasicMaterial({ color: 0x9fb8ff, side: THREE.DoubleSide }));
  peakMarker.position.copy(peakPoint);
  peakMarker.rotation.x = -Math.PI / 2;
  group.add(peakMarker);

  if (!shot.made) {
    const missDot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshBasicMaterial({ color: MISS_COLOR }));
    missDot.position.copy(end);
    group.add(missDot);
  }

  return group;
}
