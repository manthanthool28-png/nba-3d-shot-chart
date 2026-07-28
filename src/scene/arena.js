import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { COURT_LENGTH } from './court.js';

// Optional arena environment: if public/models/arena.glb exists, load it and
// place it around the court. The app renders fine without it.
//
// Alignment knobs — arena models vary in origin/scale/orientation, so tweak
// these constants to fit the specific model you dropped in. The defaults fit
// "Futuristic Basketball Facility" by R-LAB (CC-BY-4.0), which is modeled in
// meters with its court centered near the origin.
const ARENA_SCALE = 3.28084; // meters -> feet
const ARENA_CENTER = { x: 0, z: COURT_LENGTH }; // full-court center sits at z=47
const ARENA_FLOOR_Y = -0.25; // where the model's origin plane sits (ft); tune for z-fighting
const ARENA_ROTATION_Y = Math.PI / 2; // this model's court runs east-west

const URL = `${import.meta.env.BASE_URL}models/arena.glb`;

export async function loadArena(scene) {
  try {
    // Probe first so a missing file doesn't log loader errors.
    const head = await fetch(URL, { method: 'HEAD' });
    if (!head.ok) return null;
    const type = head.headers.get('content-type') ?? '';
    if (type.includes('text/html')) return null; // dev-server SPA fallback

    const gltf = await new GLTFLoader().loadAsync(URL);
    const arena = gltf.scene;

    arena.scale.setScalar(ARENA_SCALE);
    arena.rotation.y = ARENA_ROTATION_Y;

    const box = new THREE.Box3().setFromObject(arena);
    const center = box.getCenter(new THREE.Vector3());
    arena.position.x += ARENA_CENTER.x - center.x;
    arena.position.z += ARENA_CENTER.z - center.z;
    // Anchor vertically on the model's origin plane (its court floor), not the
    // bbox bottom — models often have basement/terrain geometry below floor level.
    arena.position.y = ARENA_FLOOR_Y;

    scene.add(arena);
    return arena;
  } catch {
    return null; // bad or missing file — the plain court is the fallback
  }
}
