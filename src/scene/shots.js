import * as THREE from 'three';
import { zoneGroupOf } from '../data/zones.js';
import { shotColor } from './colorEncoding.js';
import { ZONE_FOOTPRINTS } from './court.js';

const MIN_HEIGHT = 0.4;
const MAX_HEIGHT = 3.2;
const EFG_CEILING = 0.68; // eFG% at/above this maps to full spike height
const MIN_RADIUS = 0.07;
const MAX_RADIUS = 0.22;

// Keep the half-court model clean: drop desperation full-court heaves that
// fall outside the plotted floor/arc area.
export function filterOnCourt(shots) {
  return shots.filter((s) => s.z >= -1 && s.z <= 48 && Math.abs(s.x) <= 26);
}

export function computeZoneEfg(shots) {
  const totals = { paint: { fga: 0, fgm: 0, tpm: 0 }, mid: { fga: 0, fgm: 0, tpm: 0 }, three: { fga: 0, fgm: 0, tpm: 0 } };
  for (const shot of shots) {
    const key = zoneGroupOf(shot);
    if (!key) continue;
    const t = totals[key];
    t.fga += 1;
    if (shot.made) {
      t.fgm += 1;
      if (shot.shotType === '3PT Field Goal') t.tpm += 1;
    }
  }
  const efg = {};
  const volume = {};
  for (const [key, t] of Object.entries(totals)) {
    efg[key] = t.fga > 0 ? (t.fgm + 0.5 * t.tpm) / t.fga : 0;
    volume[key] = t.fga;
  }
  return { efg, volume };
}

function heightFor(efg) {
  const t = Math.min(efg / EFG_CEILING, 1);
  return MIN_HEIGHT + (MAX_HEIGHT - MIN_HEIGHT) * t;
}

function radiusFor(volume, maxVolume) {
  const t = maxVolume > 0 ? volume / maxVolume : 0;
  return MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
}

// shots: the (already filtered) set to plot. colorOptions: { colorMode, palette, teamColor }.
// streakIds: Set of shot.id currently in a hot streak, for the glow layer.
// offset/opacity let a second dataset be plotted alongside the primary one
// (comparison overlay/split modes) without duplicating this whole function.
export function buildShotField(shots, colorOptions, streakIds = new Set(), { offsetX = 0, offsetZ = 0, opacity = 1 } = {}) {
  const { efg, volume } = computeZoneEfg(shots);
  const maxVolume = Math.max(...Object.values(volume), 1);

  const geometry = new THREE.ConeGeometry(1, 1, 8);
  geometry.translate(0, 0.5, 0); // base at local y=0, tip at y=1, so per-instance scale.y == spike height
  const material = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.15, transparent: opacity < 1, opacity });
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(shots.length, 1));
  mesh.count = shots.length;
  mesh.castShadow = true;

  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const glowGeometry = new THREE.SphereGeometry(0.28, 10, 10);
  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const glowShots = shots.filter((s) => streakIds.has(s.id));
  const glowMesh = new THREE.InstancedMesh(glowGeometry, glowMaterial, Math.max(glowShots.length, 1));
  glowMesh.count = glowShots.length;

  const baseColors = [];
  const tops = [];
  shots.forEach((shot, i) => {
    const key = zoneGroupOf(shot);
    const h = heightFor(key ? efg[key] : 0.3);
    const r = radiusFor(key ? volume[key] : 0, maxVolume);

    dummy.position.set(shot.x + offsetX, 0, shot.z + offsetZ);
    dummy.scale.set(r, h, r);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    shotColor(shot, colorOptions, color);
    mesh.setColorAt(i, color);
    baseColors.push(color.clone());
    tops.push(new THREE.Vector3(shot.x + offsetX, h, shot.z + offsetZ));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

  glowShots.forEach((shot, i) => {
    const key = zoneGroupOf(shot);
    const h = heightFor(key ? efg[key] : 0.3);
    dummy.position.set(shot.x + offsetX, h + 0.15, shot.z + offsetZ);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    glowMesh.setMatrixAt(i, dummy.matrix);
  });
  glowMesh.instanceMatrix.needsUpdate = true;

  return { mesh, glowMesh, shots, baseColors, tops, efg, volume, heightFor, maxVolume };
}

// Translucent markers at each zone's centroid, sized by league-average eFG%
// — used for the "ghost overlay" comparison mode. Not real shot locations.
export function buildGhostMarkers(leagueEfg, { offsetX = 0, offsetZ = 0 } = {}) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false });
  for (const [key, footprint] of Object.entries(ZONE_FOOTPRINTS)) {
    const h = heightFor(leagueEfg[key] ?? 0);
    const geometry = new THREE.ConeGeometry(0.5, h, 10);
    geometry.translate(0, h / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(footprint.cx + offsetX, 0, footprint.cz + offsetZ);
    group.add(mesh);
  }
  return group;
}
