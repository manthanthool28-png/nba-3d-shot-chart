import * as THREE from 'three';
import { buildWoodTexture } from './woodTexture.js';

// All dimensions in feet. x: sideline-to-sideline (-25..25). z: baseline (0) to half-court line (47).
// Matches the coordinate system nba_api shot data is converted into (see scripts/fetch_shots.py).
export const COURT_WIDTH = 50;
export const COURT_LENGTH = 47;
export const HOOP_HEIGHT = 10;
export const RIM_Z = 5.25;
export const RIM_RADIUS = 0.75;

function lineFromPoints(points, color = 0xe8e8f0) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3(p[0], 0.02, p[1])),
  );
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });
  return new THREE.Line(geometry, material);
}

function arcPoints(cx, cz, radius, startAngle, endAngle, segments = 48) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const t = startAngle + ((endAngle - startAngle) * i) / segments;
    points.push([cx + radius * Math.cos(t), cz + radius * Math.sin(t)]);
  }
  return points;
}

function buildFloor() {
  const geometry = new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH);
  const woodMap = buildWoodTexture(COURT_WIDTH, COURT_LENGTH);
  const material = new THREE.MeshStandardMaterial({
    map: woodMap,
    color: 0x555555,
    roughness: 0.85,
    metalness: 0.05,
  });
  const floor = new THREE.Mesh(geometry, material);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, COURT_LENGTH / 2);
  floor.receiveShadow = true;
  return floor;
}

function buildMarkings() {
  const group = new THREE.Group();

  // Court outline: two sidelines, baseline, half-court line.
  group.add(
    lineFromPoints([
      [-25, 0],
      [-25, COURT_LENGTH],
      [25, COURT_LENGTH],
      [25, 0],
      [-25, 0],
    ]),
  );

  // Key / paint (open at the baseline).
  group.add(
    lineFromPoints([
      [-8, 0],
      [-8, 19],
      [8, 19],
      [8, 0],
    ]),
  );

  // Free-throw circle.
  group.add(lineFromPoints(arcPoints(0, 19, 6, 0, Math.PI * 2)));

  // Restricted area arc (opens toward the baseline).
  group.add(lineFromPoints(arcPoints(0, RIM_Z, 4, 0, Math.PI)));

  // Three-point line: corner straights + arc.
  const R = 23.75;
  const cornerX = 22;
  const cornerZ = RIM_Z + Math.sqrt(R * R - cornerX * cornerX);
  const startAngle = Math.atan2(cornerZ - RIM_Z, cornerX);
  const endAngle = Math.PI - startAngle;
  group.add(
    lineFromPoints([
      [cornerX, 0],
      [cornerX, cornerZ],
    ]),
  );
  group.add(
    lineFromPoints([
      [-cornerX, 0],
      [-cornerX, cornerZ],
    ]),
  );
  group.add(lineFromPoints(arcPoints(0, RIM_Z, R, startAngle, endAngle)));

  return group;
}

function buildHoop() {
  const group = new THREE.Group();

  // Backboard back face sits at z=4.05; the stanchion stands OUTSIDE the
  // court behind the baseline (negative z) and reaches the board with a
  // horizontal overhang arm across the baseline.
  const BACKBOARD_Z = 4;
  const POLE_Z = -3.5;
  const POLE_TOP = 13;

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333846, roughness: 0.6 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, POLE_TOP, 12), poleMat);
  pole.name = 'pole';
  pole.position.set(0, POLE_TOP / 2, POLE_Z);
  pole.castShadow = true;
  group.add(pole);

  const armMat = poleMat;
  const armLength = BACKBOARD_Z - 0.05 - POLE_Z;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, armLength), armMat);
  arm.name = 'arm';
  arm.position.set(0, POLE_TOP - 1.5, POLE_Z + armLength / 2);
  arm.castShadow = true;
  group.add(arm);

  const backboardMat = new THREE.MeshStandardMaterial({
    color: 0xdfe6f2,
    transparent: true,
    opacity: 0.35,
    roughness: 0.2,
    metalness: 0.1,
  });
  const backboard = new THREE.Mesh(new THREE.BoxGeometry(6, 3.5, 0.1), backboardMat);
  backboard.name = 'backboard';
  backboard.position.set(0, HOOP_HEIGHT + 0.75, 4);
  backboard.castShadow = true;
  group.add(backboard);

  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff6a1a, roughness: 0.4, metalness: 0.5 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(RIM_RADIUS, 0.05, 12, 32), rimMat);
  rim.name = 'rim';
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, HOOP_HEIGHT, RIM_Z);
  rim.castShadow = true;
  group.add(rim);

  const netMat = new THREE.LineBasicMaterial({ color: 0xaeb4c2, transparent: true, opacity: 0.6 });
  const netSegments = 12;
  const netPoints = [];
  for (let i = 0; i < netSegments; i++) {
    const angle = (i / netSegments) * Math.PI * 2;
    const x = RIM_RADIUS * Math.cos(angle);
    const z = RIM_Z + RIM_RADIUS * Math.sin(angle);
    netPoints.push(
      new THREE.Vector3(x, HOOP_HEIGHT, z),
      new THREE.Vector3(x * 0.3, HOOP_HEIGHT - 1.3, RIM_Z + (z - RIM_Z) * 0.3),
    );
  }
  const netGeometry = new THREE.BufferGeometry().setFromPoints(netPoints);
  const net = new THREE.LineSegments(netGeometry, netMat);
  net.name = 'net';
  net.position.set(0, 0, 0);
  group.add(net);

  return { group, net };
}

// Purely decorative overlays for zones performing well (eFG% >= threshold) —
// approximate footprints, not a precise data channel (spike height/color
// already carry the exact numbers).
export const ZONE_FOOTPRINTS = {
  paint: { cx: 0, cz: 9.5, w: 16, d: 19 },
  mid: { cx: 0, cz: 17, w: 32, d: 12 },
  three: { cx: 0, cz: 30, w: 46, d: 30 },
};

function radialGlowTexture(rgb = '255,209,102') {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, `rgba(${rgb},0.55)`);
  gradient.addColorStop(0.6, `rgba(${rgb},0.18)`);
  gradient.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function buildHotZoneGlow(zoneEfg, threshold = 0.55) {
  const group = new THREE.Group();
  const meshes = [];
  const texture = radialGlowTexture('255,209,102');

  for (const [key, efg] of Object.entries(zoneEfg)) {
    if (efg < threshold) continue;
    const footprint = ZONE_FOOTPRINTS[key];
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(footprint.w, footprint.d), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(footprint.cx, 0.015, footprint.cz);
    group.add(mesh);
    meshes.push(material);
  }

  function update(t) {
    const pulse = 0.75 + Math.sin(t * 1.2) * 0.25;
    meshes.forEach((m) => { m.opacity = pulse; });
  }

  return { group, update };
}

// Comparison "diff" mode: since two datasets almost never share exact shot
// coordinates, this compares at zone-group granularity instead of per-shot —
// green tint where the primary dataset has the better eFG% in that zone,
// blue tint where the compared dataset does.
export function buildDiffZoneGlow(primaryEfg, compareEfg) {
  const group = new THREE.Group();
  const greenTexture = radialGlowTexture('53,212,138');
  const blueTexture = radialGlowTexture('77,121,255');

  for (const [key, footprint] of Object.entries(ZONE_FOOTPRINTS)) {
    const diff = (primaryEfg[key] ?? 0) - (compareEfg[key] ?? 0);
    if (Math.abs(diff) < 0.01) continue;
    const material = new THREE.MeshBasicMaterial({
      map: diff > 0 ? greenTexture : blueTexture,
      transparent: true,
      opacity: Math.min(Math.abs(diff) * 3, 1),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(footprint.w, footprint.d), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(footprint.cx, 0.015, footprint.cz);
    group.add(mesh);
  }

  return { group };
}

export function buildCourt() {
  const group = new THREE.Group();
  const { group: hoopGroup, net } = buildHoop();
  group.add(buildFloor());
  group.add(buildMarkings());
  group.add(hoopGroup);

  function updateNetSway(t, reduceMotion) {
    if (!hoopGroup.visible) return;
    if (reduceMotion) {
      net.rotation.z = 0;
      return;
    }
    net.rotation.z = Math.sin(t * 1.6) * 0.03;
  }

  return { group, hoopGroup, updateNetSway };
}
